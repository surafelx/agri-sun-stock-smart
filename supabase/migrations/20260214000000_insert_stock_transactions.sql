-- Insert Stock Transactions from Balance Data
-- Run this in Supabase SQL Editor

-- Step 0: Get your user ID
SELECT 'Getting user ID...' as status;
-- Find the admin user (replace with your email)
SELECT id, email FROM auth.users WHERE email LIKE '%admin%' OR email LIKE '%agri%' LIMIT 1;

-- Note: Replace 'YOUR-USER-ID-HERE' with your actual user ID from above

-- Step 1: Disable the trigger and RLS for bulk insert
ALTER TABLE transaction_items DISABLE TRIGGER update_cost_price_on_purchase_trigger;

-- Step 2: Create temp table with transactions
CREATE TEMP TABLE temp_new_transactions AS
SELECT 
  sku, item_name, tx_date::date as tx_date, reference, in_qty, out_qty, unit_cost
FROM (
  SELECT '3DSC4.8-112-110-1100' as sku, '3DSC4.8-112-110-1100' as item_name, '2026-02-13' as tx_date, '4-017599-1' as reference, 2 as in_qty, 0 as out_qty, 27441.72 as unit_cost
  UNION ALL SELECT '3DSC4.8-112-150-1100-A/D', '3DSC4.8-112-150-1100-A/D', '2026-02-13', '4-017599-1', 1, 0, 33801.6
  UNION ALL SELECT '3DSC4.8-130-200-1500-A/D', '3DSC4.8-130-200-1500-A/D', '2026-02-13', '4-017599-1', 1, 0, 32623.84
  UNION ALL SELECT '4DSC5.2-67-110-750-A/D', '4DSC5.2-67-110-750-A/D', '2026-02-13', '4-017599-1', 2, 0, 30386.11
  UNION ALL SELECT '4DSC5.2-67-110-750-A/D', '4DSC5.2-67-110-750-A/D', '2026-02-13', 'CRV-8/17', 0, 1, 30386.11
  UNION ALL SELECT '4DSC7.5-100-200-1500-A/D', '4DSC7.5-100-200-1500-A/D', '2026-02-13', '4-017599-1', 2, 0, 31799.41
  UNION ALL SELECT '4DSC7.5-100-150-2200-A/D', '4DSC7.5-100-150-2200-A/D', '2026-02-13', '4-017599-1', 2, 0, 35332.68
  UNION ALL SELECT '4/6DSC36-56-380/550-3300-A/D', '4/6DSC36-56-380/550-3300-A/D', '2026-02-13', '4-017599-1', 1, 0, 46258.73
  UNION ALL SELECT '4/6DSC36-75-380/550-4000-A/D', '4/6DSC36-75-380/550-4000-A/D', '2026-02-13', '4-017599-1', 1, 0, 52410.15
  UNION ALL SELECT '6DSC36-98- 380/550-5500-A/D', '6DSC36-98- 380/550-5500-A/D', '2026-02-13', '4-017599-1', 1, 0, 83626.57
  UNION ALL SELECT '6DSC36-98- 380/550-5500-A/D', '6DSC36-98- 380/550-5500-A/D', '2026-02-13', '4-022460-1', 9, 0, 121860.52
  UNION ALL SELECT '6DSC36-98- 380/550-5500-A/D', '6DSC36-98- 380/550-5500-A/D', '2026-02-13', 'CRV-10/17', 0, 9, 121860.52
  UNION ALL SELECT '6DSC36-98- 380/550-5500-A/D', '6DSC36-98- 380/550-5500-A/D', '2026-02-13', '4-022468-1', 7, 0, 188221.14
  UNION ALL SELECT '6DSC36-98- 380/550-5500-A/D', '6DSC36-98- 380/550-5500-A/D', '2026-02-13', 'CRV-10/17', 0, 7, 188221.14
  UNION ALL SELECT '4SPW8.5-60-450-2200- A/D', '4SPW8.5-60-450-2200- A/D', '2025-03-06', '4-011947-1', 6, 0, 107414.73
  UNION ALL SELECT '4SPW8.5-60-450-2200- A/D', '4SPW8.5-60-450-2200- A/D', '2025-03-06', 'CRV-13 & 14/17', 0, 3, 107414.73
) as t;

-- Step 3: Find a valid user ID from auth.users
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Try to get any user from auth.users
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in auth.users table';
  END IF;
  
  RAISE NOTICE 'Using user ID: %', v_user_id;
  
  -- Insert transactions
  INSERT INTO public.transactions (transaction_type, reference_number, transaction_date, created_by, notes)
  SELECT 
    CASE WHEN in_qty > 0 THEN 'purchase'::transaction_type ELSE 'sale'::transaction_type END,
    reference,
    tx_date,
    v_user_id,
    'Initial Stock: ' || item_name
  FROM temp_new_transactions t
  WHERE NOT EXISTS (
    SELECT 1 FROM transactions tx 
    WHERE tx.reference_number = t.reference AND tx.transaction_date::date = t.tx_date
  );
  
  -- Insert transaction items
  INSERT INTO public.transaction_items (transaction_id, item_id, quantity, unit_price, total_price)
  SELECT 
    tx.id,
    i.id,
    CASE WHEN nt.in_qty > 0 THEN nt.in_qty ELSE nt.out_qty END,
    nt.unit_cost,
    CASE WHEN nt.in_qty > 0 THEN nt.in_qty * nt.unit_cost ELSE nt.out_qty * nt.unit_cost END
  FROM temp_new_transactions nt
  JOIN public.items i ON i.sku = nt.sku
  JOIN public.transactions tx ON tx.reference_number = nt.reference AND tx.transaction_date::date = nt.tx_date
  WHERE tx.created_by = v_user_id;
  
END $$;

-- Step 4: Re-enable the trigger
ALTER TABLE transaction_items ENABLE TRIGGER update_cost_price_on_purchase_trigger;

-- Step 5: Show results
SELECT 'Final stock balances:' as status;
SELECT 
  i.sku,
  i.name,
  SUM(CASE WHEN t.transaction_type = 'purchase' THEN ti.quantity ELSE -ti.quantity END) as balance
FROM transaction_items ti
JOIN items i ON ti.item_id = i.id
JOIN transactions t ON ti.transaction_id = t.id
GROUP BY i.sku, i.name
ORDER BY i.sku;

-- Cleanup
DROP TABLE temp_new_transactions;
