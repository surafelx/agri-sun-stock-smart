-- Simple Import Script - Run this in Supabase SQL Editor
-- This will disable the problematic trigger, insert data, then re-enable it

-- Step 0: Disable the trigger that causes division by zero
ALTER TABLE transaction_items DISABLE TRIGGER update_cost_price_on_purchase_trigger;

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

-- Step 2: Insert your data here - copy from Excel and paste below
-- Example format (replace with your actual data):
/*
INSERT INTO temp_import_data VALUES 
('SKU001', 'Solar Panel 415W', 'Pcs', 'Solar & Power Systems', '2024-01-15', 'PO-001', 10, 0, 150.00),
('SKU002', 'Solar Panel 550W', 'Pcs', 'Solar & Power Systems', '2024-01-16', 'PO-002', 5, 0, 200.00),
('SKU003', 'Battery Li 51.2V 100Ah', 'Pcs', 'Solar & Power Systems', '2024-01-17', 'PO-003', 2, 0, 500.00);
*/

-- Step 3: Insert categories (skip if exists)
INSERT INTO public.categories (name)
SELECT DISTINCT category_name FROM temp_import_data
ON CONFLICT (name) DO NOTHING;

-- Step 4: Insert or update items
INSERT INTO public.items (sku, name, uom, category_id, cost_price)
SELECT 
  t.sku,
  t.item_name,
  t.uom,
  c.id,
  COALESCE(t.tx_unit_cost, 0)
FROM temp_import_data t
JOIN public.categories c ON t.category_name = c.name
ON CONFLICT (sku) DO UPDATE SET 
  name = EXCLUDED.name,
  uom = EXCLUDED.uom,
  cost_price = EXCLUDED.cost_price;

-- Step 5: Insert transactions with proper enum type cast
INSERT INTO public.transactions (transaction_type, reference_number, transaction_date, created_by)
SELECT 
  CASE WHEN tx_in > 0 THEN 'purchase'::transaction_type ELSE 'sale'::transaction_type END,
  tx_reference,
  tx_date,
  '00000000-0000-0000-0000-000000000000'::uuid
FROM temp_import_data
WHERE tx_in > 0 OR tx_out > 0;

-- Step 6: Insert transaction items with unit_price and quantity
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

-- Step 7: Re-enable the trigger
ALTER TABLE transaction_items ENABLE TRIGGER update_cost_price_on_purchase_trigger;

-- Step 8: Show what was inserted
SELECT 
  'Transactions inserted: ' || COUNT(*) as message
FROM transactions 
WHERE created_by = '00000000-0000-0000-0000-000000000000';

SELECT 
  'Transaction items inserted: ' || COUNT(*) as message
FROM transaction_items 
WHERE created_at > NOW() - INTERVAL '1 minute';

-- Clean up temp table
DROP TABLE temp_import_data;
