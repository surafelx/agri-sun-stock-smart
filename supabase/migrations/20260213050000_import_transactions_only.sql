-- Simple Transaction Import Script
-- This script ONLY inserts transactions - it does NOT create new items
-- Items must already exist in the database
-- Run this in Supabase SQL Editor

-- Step 1: Disable the trigger to avoid division by zero
ALTER TABLE transaction_items DISABLE TRIGGER update_cost_price_on_purchase_trigger;

-- Step 2: Create temp table with import data
CREATE TEMP TABLE temp_tx_import (
  item_name TEXT,
  tx_date DATE,
  tx_reference TEXT,
  tx_in DECIMAL(10,2),
  tx_out DECIMAL(10,2),
  tx_unit_cost DECIMAL(10,2)
);

-- Step 3: Paste your data here (example format - replace with your actual data)
/*
INSERT INTO temp_tx_import (item_name, tx_date, tx_reference, tx_in, tx_out, tx_unit_cost) VALUES
('Solar Panel 415W', '2024-01-15', 'PO-001', 10, 0, 150.00),
('Solar Panel 550W', '2024-01-16', 'PO-002', 5, 0, 200.00),
('Battery Li 51.2V 100Ah', '2024-01-17', 'PO-003', 2, 0, 500.00),
('Solar Panel 415W', '2024-02-01', 'SO-001', 0, 3, 180.00);
*/

-- Step 4: Insert transactions (only if they don't exist already)
INSERT INTO public.transactions (transaction_type, reference_number, transaction_date, created_by, notes)
SELECT 
  CASE WHEN tx_in > 0 THEN 'purchase'::transaction_type ELSE 'sale'::transaction_type END,
  tx_reference,
  tx_date,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Imported: ' || item_name
FROM temp_tx_import
WHERE (tx_in > 0 OR tx_out > 0)
ON CONFLICT (reference_number, transaction_date) DO NOTHING;

-- Step 5: Insert transaction items with unit_price
INSERT INTO public.transaction_items (transaction_id, item_id, quantity, unit_price, total_price)
SELECT 
  tx.id,
  i.id,
  COALESCE(ti.tx_in, ti.tx_out),
  ti.tx_unit_cost,
  COALESCE(ti.tx_in, ti.tx_out) * ti.tx_unit_cost
FROM temp_tx_import ti
JOIN public.items i ON LOWER(TRIM(i.name)) = LOWER(TRIM(ti.item_name))
JOIN public.transactions tx ON tx.reference_number = ti.tx_reference AND tx.transaction_date = ti.tx_date
WHERE (ti.tx_in > 0 OR ti.tx_out > 0);

-- Step 6: Re-enable the trigger
ALTER TABLE transaction_items ENABLE TRIGGER update_cost_price_on_purchase_trigger;

-- Step 7: Show results
SELECT 
  'Transactions created: ' || COUNT(*) as result
FROM transactions 
WHERE created_by = '00000000-0000-0000-0000-000000000000';

SELECT 
  ti.id,
  i.name as item_name,
  ti.quantity,
  ti.unit_price,
  ti.total_price,
  tx.reference_number,
  tx.transaction_date
FROM transaction_items ti
JOIN items i ON ti.item_id = i.id
JOIN transactions tx ON ti.transaction_id = tx.id
WHERE tx.created_by = '00000000-0000-0000-0000-000000000000'
ORDER BY tx.transaction_date;

-- Clean up
DROP TABLE temp_tx_import;
