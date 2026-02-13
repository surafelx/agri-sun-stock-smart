-- Migration: Create recalculate_stock_balances function
-- Run this after importing data
-- NOTE: This migration assumes items table has 'quantity' column

-- First, add quantity column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'items' 
        AND column_name = 'quantity'
    ) THEN
        ALTER TABLE items ADD COLUMN quantity numeric DEFAULT 0;
        ALTER TABLE items ALTER COLUMN quantity SET DEFAULT 0;
    END IF;
END $$;

-- Drop existing function if exists
DROP FUNCTION IF EXISTS recalculate_stock_balances();

-- Create function to recalculate all item balances from transactions
CREATE OR REPLACE FUNCTION recalculate_stock_balances()
RETURNS void AS $$
BEGIN
    -- Update items table with calculated current_balance from transactions
    UPDATE items i
    SET 
        quantity = COALESCE(t.total_quantity, 0),
        cost_price = CASE 
            WHEN COALESCE(t.total_quantity, 0) > 0 
            THEN COALESCE(t.total_value, 0) / t.total_quantity 
            ELSE COALESCE(i.cost_price, 0)
        END
    FROM (
        SELECT 
            ti.item_id,
            SUM(ti.quantity) AS total_quantity,
            SUM(ti.quantity * ti.unit_price) AS total_value
        FROM transaction_items ti
        INNER JOIN transactions t ON t.id = ti.transaction_id
        GROUP BY ti.item_id
    ) t
    WHERE i.id = t.item_id;
    
    -- Log the update
    RAISE NOTICE 'Stock balances recalculated';
END;
$$ LANGUAGE plpgsql;

-- Create function to recalculate a single item's balance
DROP FUNCTION IF EXISTS recalculate_item_balance(uuid);

CREATE OR REPLACE FUNCTION recalculate_item_balance(item_id_param uuid)
RETURNS void AS $$
DECLARE
    new_quantity numeric;
    new_cost_price numeric;
BEGIN
    SELECT 
        COALESCE(SUM(ti.quantity), 0) AS total_quantity,
        CASE 
            WHEN SUM(ti.quantity) > 0 
            THEN SUM(ti.quantity * ti.unit_price) / SUM(ti.quantity)
            ELSE 0 
        END AS avg_cost
    INTO new_quantity, new_cost_price
    FROM transaction_items ti
    INNER JOIN transactions t ON t.id = ti.transaction_id
    WHERE ti.item_id = item_id_param;
    
    UPDATE items
    SET 
        quantity = new_quantity,
        cost_price = COALESCE(new_cost_price, cost_price)
    WHERE id = item_id_param;
    
    RAISE NOTICE 'Item balance updated: ID=%', item_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create view for stock status using calculated balance
DROP VIEW IF EXISTS stock_status;

CREATE VIEW stock_status AS
SELECT 
    i.id,
    i.sku,
    i.name,
    COALESCE(SUM(ti.quantity), 0) AS current_balance,
    COALESCE(i.low_stock_threshold, 10) AS low_stock_threshold,
    CASE 
        WHEN COALESCE(SUM(ti.quantity), 0) <= 0 THEN 'Out of Stock'
        WHEN COALESCE(SUM(ti.quantity), 0) <= COALESCE(i.low_stock_threshold, 10) THEN 'Low Stock'
        ELSE 'In Stock'
    END AS stock_status,
    i.cost_price AS unit_cost,
    COALESCE(SUM(ti.quantity), 0) * COALESCE(i.cost_price, 0) AS total_value,
    c.name AS category,
    s.name AS subcategory,
    i.uom,
    i.parameters,
    i.updated_at
FROM items i
LEFT JOIN categories c ON c.id = i.category_id
LEFT JOIN subcategories s ON s.id = i.subcategory_id
LEFT JOIN transaction_items ti ON ti.item_id = i.id
LEFT JOIN transactions t ON t.id = ti.transaction_id
GROUP BY i.id, c.name, s.name;

-- Create stock_overview view (alternative version without joins)
DROP VIEW IF EXISTS stock_overview;

CREATE VIEW stock_overview AS
WITH item_balances AS (
    SELECT 
        ti.item_id,
        SUM(ti.quantity) AS total_quantity,
        CASE 
            WHEN SUM(ti.quantity) > 0 THEN SUM(ti.quantity * ti.unit_price) / SUM(ti.quantity)
            ELSE i.cost_price 
        END AS avg_cost,
        SUM(ti.quantity * ti.unit_price) AS total_value
    FROM transaction_items ti
    INNER JOIN transactions t ON t.id = ti.transaction_id
    INNER JOIN items i ON i.id = ti.item_id
    GROUP BY ti.item_id, i.cost_price
)
SELECT 
    i.id AS item_id,
    i.sku AS "Stock_Code",
    i.name AS "Item_Name",
    c.name AS "Category",
    s.name AS "Subcategory",
    COALESCE(ib.total_quantity, 0) AS "Current_Balance",
    COALESCE(ib.avg_cost, i.cost_price, 0) AS "Unit_Cost",
    COALESCE(ib.total_value, 0) AS "Total_Value",
    CASE 
        WHEN COALESCE(ib.total_quantity, 0) <= 0 THEN 'Out of Stock'
        WHEN COALESCE(ib.total_quantity, 0) <= COALESCE(i.low_stock_threshold, 10) THEN 'Low Stock'
        ELSE 'In Stock'
    END AS "Stock_Status",
    i.uom AS "UOM"
FROM items i
LEFT JOIN categories c ON c.id = i.category_id
LEFT JOIN subcategories s ON s.id = i.subcategory_id
LEFT JOIN item_balances ib ON ib.item_id = i.id;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION recalculate_stock_balances() TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_item_balance(uuid) TO authenticated;
GRANT SELECT ON stock_status TO authenticated;
GRANT SELECT ON stock_overview TO authenticated;
