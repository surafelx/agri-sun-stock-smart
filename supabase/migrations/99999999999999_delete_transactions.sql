-- Migration: Delete all transaction-related data
-- WARNING: This will permanently delete all transactions and transaction items
-- Run this in Supabase SQL Editor

-- Step 1: Delete transaction items (child records first)
DELETE FROM transaction_items;

-- Step 2: Delete transactions (parent records)
DELETE FROM transactions;

-- Step 3: Reset item quantities to 0 (optional)
-- UPDATE items SET quantity = 0;

-- Step 4: Verify deletion
SELECT 
    'transaction_items' as table_name,
    COUNT(*) as remaining_rows
FROM transaction_items
UNION ALL
SELECT 
    'transactions' as table_name,
    COUNT(*) as remaining_rows
FROM transactions;

-- Note: The views stock_overview and stock_status will now show 0 balances
-- since there are no transactions to calculate from
