-- SQL Import Script for Inventory Data
-- Run this after you've exported your Excel data to JSON

-- Step 1: Create a temporary table to hold the import data
CREATE TEMP TABLE temp_import_data (
  sku TEXT,
  item_name TEXT,
  uom TEXT,
  category_name TEXT,
  tx_date DATE,
  tx_reference TEXT,
  tx_in DECIMAL(10,2),
  tx_out DECIMAL(10,2),
  tx_unit_cost DECIMAL(10,2)
);

-- Step 2: Copy data from JSON (example format - paste your JSON here)
-- You can use \copy command in psql or insert manually

-- Example insert for one product:
-- INSERT INTO temp_import_data VALUES 
-- ('SKU001', 'Solar Panel 415W', 'Pcs', 'Solar & Power Systems', '2024-01-15', 'PO-001', 10, 0, 150.00);

-- Step 3: Insert categories (skip if exists)
INSERT INTO public.categories (name)
SELECT DISTINCT category_name FROM temp_import_data
ON CONFLICT (name) DO NOTHING;

-- Step 4: Insert items (skip if exists, update if exists)
INSERT INTO public.items (sku, name, uom, category_id, cost_price)
SELECT 
  t.sku,
  t.item_name,
  t.uom,
  c.id,
  COALESCE(
    (SELECT unit_price FROM public.transaction_items ti 
     JOIN public.transactions tx ON ti.transaction_id = tx.id 
     WHERE ti.item_id = i.id AND tx.transaction_type = 'purchase'
     ORDER BY tx.transaction_date DESC LIMIT 1),
    0
  )
FROM temp_import_data t
JOIN public.categories c ON t.category_name = c.name
LEFT JOIN public.items i ON t.sku = i.sku
ON CONFLICT (sku) DO UPDATE SET 
  name = EXCLUDED.name,
  uom = EXCLUDED.uom;

-- Step 5: Insert transactions
INSERT INTO public.transactions (transaction_type, reference_number, transaction_date, created_by)
SELECT 
  CASE WHEN tx_in > 0 THEN 'purchase'::transaction_type ELSE 'sale'::transaction_type END,
  tx_reference,
  tx_date,
  '00000000-0000-0000-0000-000000000000'::uuid
FROM temp_import_data
WHERE tx_in > 0 OR tx_out > 0;

-- Step 6: Insert transaction items
INSERT INTO public.transaction_items (transaction_id, item_id, quantity, unit_price, total_price)
SELECT 
  tx.id,
  i.id,
  COALESCE(ti.tx_in, ti.tx_out),
  ti.tx_unit_cost,
  COALESCE(ti.tx_in, ti.tx_out) * ti.tx_unit_cost
FROM temp_import_data ti
JOIN public.items i ON ti.sku = i.sku
JOIN public.transactions tx ON tx.reference_number = ti.tx_reference AND tx.transaction_date = ti.tx_date
WHERE ti.tx_in > 0 OR ti.tx_out > 0;
