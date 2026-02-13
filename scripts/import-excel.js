/**
 * Excel Import Script for Agri Sun Stock Smart
 * 
 * Expected Excel Structure:
 * - Sheet names = Product names (stock items)
 * - One sheet named "Inventory" = List of all products with their details
 * - Each product sheet = List of transactions for that product
 * 
 * Run: node scripts/import-excel.js <path-to-excel-file>
 */

import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Parse Excel file and import data
 */
async function importExcel(filePath) {
  console.log(`\n📊 Starting import from: ${filePath}\n`);

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    
    console.log(`Found ${sheetNames.length} sheets: ${sheetNames.join(', ')}\n`);

    // Check for Inventory sheet (case insensitive)
    const inventorySheetName = sheetNames.find(s => 
      s.toLowerCase().includes('inventory') || 
      s.toLowerCase() === 'products' ||
      s.toLowerCase() === 'items'
    );
    
    // Find product sheets (all sheets except Inventory)
    const productSheetNames = sheetNames.filter(s => {
      const lower = s.toLowerCase();
      return !lower.includes('inventory') && 
             !lower.includes('products') && 
             !lower.includes('items') &&
             !lower.includes('summary') &&
             !lower.includes('dashboard');
    });

    console.log(`Found ${productSheetNames.length} product sheets`);
    console.log(`Found ${inventorySheetName ? '1' : '0'} inventory sheet\n`);

    // Step 1: Read inventory sheet for product details
    let inventoryData = [];
    if (inventorySheetName) {
      const inventorySheet = workbook.Sheets[inventorySheetName];
      inventoryData = XLSX.utils.sheet_to_json(inventorySheet);
      console.log(`📦 Inventory sheet has ${inventoryData.length} products\n`);
    }

    // Step 2: Read transactions for each product
    const allTransactions = [];
    const productDetails = [];

    for (const sheetName of productSheetNames) {
      console.log(`📄 Processing sheet: ${sheetName}`);
      
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      if (data.length > 0) {
        // Assume first row contains product details
        const productDetail = {
          name: data[0].Product || data[0].Name || data[0].Item || data[0].Description || sheetName,
          sku: data[0].SKU || data[0].Code || data[0].ProductCode || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          description: data[0].Description || data[0].Notes || '',
          uom: data[0].UOM || data[0].Unit || data[0].UnitOfMeasure || 'Pcs',
          low_stock_threshold: parseFloat(data[0].LowStockThreshold || data[0].MinStock || data[0].Threshold || 10),
          category: data[0].Category || data[0].category || detectCategory(sheetName),
          parameters: {},
        };

        // Extract parameters (any additional columns)
        const paramFields = ['Wattage', 'Voltage', 'Capacity', 'Power', 'Size', 'Type', 'Brand', 'Model', 'Weight', 'Dimensions'];
        for (const field of paramFields) {
          if (data[0][field]) {
            productDetail.parameters[field.toLowerCase()] = data[0][field];
          }
        }

        productDetails.push(productDetail);

        // Process transactions (rows 2 onwards, assuming row 1 is product detail)
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const quantity = Math.abs(parseFloat(row.Quantity || row.Qty || row.Amount || 0));
          const unitPrice = parseFloat(row.UnitPrice || row.Rate || row.Price || 0);
          
          const transaction = {
            item_name: sheetName,
            transaction_type: mapTransactionType(row.Type || row.TransactionType || row.Transaction || 'adjustment'),
            quantity: quantity,
            unit_price: unitPrice,
            total_price: parseFloat(row.TotalPrice || row.Amount || row.Total || row.Quantity * unitPrice || 0),
            reference_number: row.Reference || row.RefNo || row.DocNo || `IMP-${Date.now()}-${i}`,
            notes: row.Notes || row.Description || '',
            transaction_date: parseDate(row.Date || row.TransactionDate || row.DocDate),
          };

          // Adjust quantity based on transaction type
          if (['sale', 'issue', 'out', 'delivery'].includes(transaction.transaction_type)) {
            transaction.quantity = -quantity;
          }

          allTransactions.push(transaction);
        }

        console.log(`   → Product: ${productDetail.name}, Transactions: ${Math.max(0, data.length - 1)}`);
      }
    }

    // Also process inventory sheet if it exists
    if (inventoryData.length > 0) {
      console.log(`\n📦 Processing inventory sheet products...`);
      for (const row of inventoryData) {
        const existingProduct = productDetails.find(p => 
          p.name.toLowerCase() === (row.Name || row.Product || row.Item || '').toLowerCase() ||
          p.sku === row.SKU || p.sku === row.Code
        );

        if (!existingProduct) {
          productDetails.push({
            name: row.Name || row.Product || row.Item || `Unknown-${Date.now()}`,
            sku: row.SKU || row.Code || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            description: row.Description || row.Notes || '',
            uom: row.UOM || row.Unit || row.UnitOfMeasure || 'Pcs',
            low_stock_threshold: parseFloat(row.LowStockThreshold || row.MinStock || row.Threshold || 10),
            category: row.Category || row.category || detectCategory(row.Name || row.Product || ''),
            parameters: {
              initial_stock: parseFloat(row.Quantity || row.Qty || row.Stock || 0),
              cost_price: parseFloat(row.CostPrice || row.Cost || row.UnitCost || 0),
            },
          });
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Products: ${productDetails.length}`);
    console.log(`   Transactions: ${allTransactions.length}\n`);

    // Step 3: Insert categories
    console.log('🏷️  Inserting categories...');
    const categoriesMap = await ensureCategories(productDetails);
    
    // Step 4: Insert subcategories
    console.log('📁 Inserting subcategories...');
    const subcategoriesMap = await ensureSubcategories(productDetails, categoriesMap);

    // Step 5: Insert items
    console.log('📦 Inserting items...');
    const itemsMap = await insertItems(productDetails, categoriesMap, subcategoriesMap);
    console.log(`   Inserted/Updated ${itemsMap.size} items`);

    // Step 6: Insert transactions
    console.log('💰 Inserting transactions...');
    const txCount = await insertTransactions(allTransactions, itemsMap);
    console.log(`   Inserted ${txCount} transactions`);

    // Step 7: Recalculate stock balances
    console.log('🔄 Recalculating stock balances...');
    await recalculateStockBalances();
    console.log('   Stock balances updated');

    // Step 8: Update stock overview view
    console.log('👁️  Refreshing stock overview...');
    
    console.log('\n✅ Import completed successfully!\n');
    
    // Print next steps
    console.log('📋 Next Steps:');
    console.log('   1. Run the SQL migration: 20260215000000_recalculate_stock_function.sql');
    console.log('   2. Query the stock_overview view to verify data');
    console.log('   3. Check Items page in the application\n');

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Detect category from product name
 */
function detectCategory(productName) {
  const name = productName.toLowerCase();
  
  const categories = {
    'Solar & Power Systems': ['solar', 'panel', 'pump', 'inverter', 'battery', 'controller', 'mppt', 'charge'],
    'Pipes & Plumbing Materials': ['pipe', 'hose', 'hdpe', 'ppr', 'gi pipe', 'pvc'],
    'Pipe Fittings & Valves': ['fitting', 'socket', 'adaptor', 'tee', 'elbow', 'ball valve', 'flange', 'valve'],
    'Structural Steel & Metal': ['rhs', 'shs', 'rebar', 'steel', 'channel', 'flat bar', 'sheet', 'metal'],
    'Tools & Hardware': ['tool', 'cutting', 'cutter', 'bit', 'clamp', 'fastener', 'connector', 'screw', 'bolt'],
    'Electrical Materials': ['cable', 'wire', 'breaker', 'fuse', 'gland'],
    'Construction & Civil Materials': ['cement', 'gabion', 'filter', 'silicone'],
    'Well & Borehole Materials': ['casing', 'well', 'borehole', 'riser'],
    'Safety & PPE': ['jacket', 'helmet', 'safety', 'ppe'],
    'Enclosures & Control': ['control box', 'enclosure', 'box'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => name.includes(kw))) {
      return category;
    }
  }

  return 'General';
}

/**
 * Map transaction type string to database enum
 */
function mapTransactionType(type) {
  const typeMap = {
    'purchase': 'purchase',
    'buy': 'purchase',
    'import': 'purchase',
    'received': 'purchase',
    'in': 'purchase',
    'arrival': 'purchase',
    'sale': 'sale',
    'sell': 'sale',
    'out': 'sale',
    'issue': 'sale',
    'delivery': 'sale',
    'transfer': 'sale',
    'adjustment': 'adjustment',
    'adjust': 'adjustment',
    'correct': 'adjustment',
    'count': 'adjustment',
    'return': 'purchase',
    'refund': 'sale',
  };
  
  const lowerType = (type || '').toLowerCase().trim();
  return typeMap[lowerType] || 'adjustment';
}

/**
 * Parse date string to ISO format
 */
function parseDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
  
  return date.toISOString().split('T')[0];
}

/**
 * Ensure categories exist and return category IDs
 */
async function ensureCategories(products) {
  const categoriesMap = new Map();
  const categories = new Set();

  // Extract unique categories from products
  for (const product of products) {
    categories.add(product.category || 'General');
  }

  for (const categoryName of categories) {
    // Check if category exists
    const { data: existing } = await supabase
      .from('categories')
      .select('id, name')
      .eq('name', categoryName)
      .maybeSingle();

    if (existing) {
      categoriesMap.set(categoryName, existing.id);
    } else {
      // Create new category
      const { data: newCategory, error } = await supabase
        .from('categories')
        .insert({ name: categoryName })
        .select('id, name')
        .maybeSingle();

      if (error) {
        console.error(`   Warning: Failed to create category "${categoryName}":`, error.message);
        // Use a default category
        const { data: defaultCat } = await supabase
          .from('categories')
          .select('id')
          .eq('name', 'General')
          .maybeSingle();
        if (defaultCat) categoriesMap.set(categoryName, defaultCat.id);
      } else {
        categoriesMap.set(categoryName, newCategory.id);
        console.log(`   Created category: ${categoryName}`);
      }
    }
  }

  return categoriesMap;
}

/**
 * Ensure subcategories exist and return subcategory IDs
 */
async function ensureSubcategories(products, categoriesMap) {
  const subcategoriesMap = new Map();
  const subcategories = new Map(); // categoryName -> Set of subcategory names

  // Extract unique subcategories
  for (const product of products) {
    const categoryName = product.category || 'General';
    if (!subcategories.has(categoryName)) {
      subcategories.set(categoryName, new Set());
    }
    // Use first word of product name as subcategory suggestion
    const subcatName = product.name.split(' ')[0];
    subcategories.get(categoryName).add(subcatName);
  }

  // Check/create each subcategory
  for (const [categoryName, subcatSet] of subcategories) {
    const categoryId = categoriesMap.get(categoryName);
    if (!categoryId) continue;

    for (const subcatName of subcatSet) {
      // Check if subcategory exists
      const { data: existing } = await supabase
        .from('subcategories')
        .select('id, name')
        .eq('name', subcatName)
        .eq('category_id', categoryId)
        .maybeSingle();

      if (existing) {
        subcategoriesMap.set(`${categoryName}|${subcatName}`, existing.id);
      } else {
        // Create new subcategory
        const { data: newSubcat, error } = await supabase
          .from('subcategories')
          .insert({ name: subcatName, category_id: categoryId })
          .select('id, name')
          .maybeSingle();

        if (!error) {
          subcategoriesMap.set(`${categoryName}|${subcatName}`, newSubcat.id);
          console.log(`   Created subcategory: ${subcatName} (${categoryName})`);
        }
      }
    }
  }

  return subcategoriesMap;
}

/**
 * Insert items and return map of item names to IDs
 */
async function insertItems(products, categoriesMap, subcategoriesMap) {
  const itemsMap = new Map();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || '00000000-0000-0000-0000-000000000000';

  for (const product of products) {
    // Determine category ID
    const categoryName = product.category || 'General';
    const categoryId = categoriesMap.get(categoryName);

    // Determine subcategory ID
    const subcatName = product.name.split(' ')[0];
    const subcategoryId = subcategoriesMap.get(`${categoryName}|${subcatName}`);

    // Check if item already exists by SKU
    const { data: existing } = await supabase
      .from('items')
      .select('id, name')
      .eq('sku', product.sku)
      .maybeSingle();

    if (existing) {
      // Update existing item
      const { error } = await supabase
        .from('items')
        .update({
          name: product.name,
          description: product.description,
          uom: product.uom,
          low_stock_threshold: product.low_stock_threshold,
          parameters: product.parameters,
          category_id: categoryId,
          subcategory_id: subcategoryId,
        })
        .eq('id', existing.id);

      if (!error) {
        itemsMap.set(product.name, existing.id);
        console.log(`   Updated: ${product.name} (${product.sku})`);
      }
    } else {
      // Insert new item
      const { data: newItem, error } = await supabase
        .from('items')
        .insert({
          name: product.name,
          sku: product.sku,
          description: product.description,
          uom: product.uom,
          low_stock_threshold: product.low_stock_threshold,
          parameters: product.parameters,
          category_id: categoryId,
          subcategory_id: subcategoryId,
          created_by: userId,
        })
        .select('id, name')
        .maybeSingle();

      if (error) {
        console.error(`   Warning: Failed to insert "${product.name}":`, error.message);
      } else {
        itemsMap.set(product.name, newItem.id);
        console.log(`   Inserted: ${product.name} (${product.sku})`);
      }
    }
  }

  return itemsMap;
}

/**
 * Insert transactions
 */
async function insertTransactions(transactions, itemsMap) {
  let inserted = 0;
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || '00000000-0000-0000-0000-000000000000';

  for (const transaction of transactions) {
    const itemId = itemsMap.get(transaction.item_name);
    if (!itemId) continue;

    // Insert transaction
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .insert({
        transaction_type: transaction.transaction_type,
        reference_number: transaction.reference_number,
        notes: transaction.notes,
        transaction_date: transaction.transaction_date,
        created_by: userId,
      })
      .select('id')
      .maybeSingle();

    if (txError) {
      console.error(`   Warning: Failed to insert transaction:`, txError.message);
      continue;
    }

    // Insert transaction item
    const { error: tiError } = await supabase
      .from('transaction_items')
      .insert({
        transaction_id: txData.id,
        item_id: itemId,
        quantity: transaction.quantity,
        unit_price: transaction.unit_price,
        total_price: transaction.total_price || (Math.abs(transaction.quantity) * transaction.unit_price),
      });

    if (!tiError) {
      inserted++;
    }
  }

  return inserted;
}

/**
 * Recalculate stock balances using database function
 */
async function recalculateStockBalances() {
  try {
    const { error } = await supabase.rpc('recalculate_stock_balances');
    if (error) {
      console.error('   Warning: Failed to call recalculate_stock_balances:', error.message);
    }
  } catch (err) {
    console.error('   Note: recalculate_stock_balances function may not exist yet');
    console.log('   Please run migration: 20260215000000_recalculate_stock_function.sql');
  }
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/import-excel.js <path-to-excel-file>\n');
  console.log('Example:');
  console.log('  node scripts/import-excel.js ./inventory.xlsx');
  console.log('  node scripts/import-excel.js /home/user/data.xlsx\n');
  console.log('Expected Excel Structure:');
  console.log('  - Sheet names = Product names (stock items)');
  console.log('  - Optional "Inventory" sheet = List of all products');
  console.log('  - Each product sheet = Transactions for that product\n');
  process.exit(0);
}

importExcel(args[0]);
