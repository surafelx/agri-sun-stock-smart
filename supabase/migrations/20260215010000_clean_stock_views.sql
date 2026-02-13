-- Clean migration: Create stock views and functions
-- Run this to set up stock overview functionality

-- Drop existing views first (if they exist)
DROP VIEW IF EXISTS stock_overview;
DROP VIEW IF EXISTS stock_status;
DROP VIEW IF EXISTS items_with_balance;

-- Create a simpler stock_overview view that doesn't require quantity column on items
CREATE VIEW stock_overview AS
SELECT 
    i.id AS item_id,
    i.sku AS "Stock_Code",
    i.name AS "Item_Name",
    c.name AS "Category",
    s.name AS "Subcategory",
    COALESCE(totals.total_quantity, 0) AS "Current_Balance",
    COALESCE(totals.avg_cost, 0) AS "Unit_Cost",
    COALESCE(totals.total_value, 0) AS "Total_Value",
    CASE 
        WHEN COALESCE(totals.total_quantity, 0) <= 0 THEN 'Out of Stock'
        WHEN COALESCE(totals.total_quantity, 0) <= COALESCE(i.low_stock_threshold, 10) THEN 'Low Stock'
        ELSE 'In Stock'
    END AS "Stock_Status",
    i.uom AS "UOM"
FROM items i
LEFT JOIN categories c ON c.id = i.category_id
LEFT JOIN subcategories s ON s.id = i.subcategory_id
LEFT JOIN LATERAL (
    SELECT 
        SUM(ti.quantity) AS total_quantity,
        CASE 
            WHEN SUM(ti.quantity) > 0 THEN SUM(ti.quantity * ti.unit_price) / SUM(ti.quantity)
            ELSE 0 
        END AS avg_cost,
        SUM(ti.quantity * ti.unit_price) AS total_value
    FROM transaction_items ti
    WHERE ti.item_id = i.id
) totals ON true;

-- Create stock status view (alternative simpler view)
CREATE VIEW stock_status AS
SELECT 
    i.id,
    i.sku,
    i.name,
    c.name AS category,
    s.name AS subcategory,
    i.uom,
    i.parameters,
    i.low_stock_threshold,
    COALESCE(totals.total_quantity, 0) AS current_balance,
    COALESCE(totals.avg_cost, 0) AS cost_price,
    COALESCE(totals.total_value, 0) AS total_value,
    CASE 
        WHEN COALESCE(totals.total_quantity, 0) <= 0 THEN 'Out of Stock'
        WHEN COALESCE(totals.total_quantity, 0) <= COALESCE(i.low_stock_threshold, 10) THEN 'Low Stock'
        ELSE 'In Stock'
    END AS stock_status,
    i.updated_at
FROM items i
LEFT JOIN categories c ON c.id = i.category_id
LEFT JOIN subcategories s ON s.id = i.subcategory_id
LEFT JOIN LATERAL (
    SELECT 
        SUM(ti.quantity) AS total_quantity,
        CASE 
            WHEN SUM(ti.quantity) > 0 THEN SUM(ti.quantity * ti.unit_price) / SUM(ti.quantity)
            ELSE 0 
        END AS avg_cost,
        SUM(ti.quantity * ti.unit_price) AS total_value
    FROM transaction_items ti
    WHERE ti.item_id = i.id
) totals ON true;

-- Grant access
GRANT SELECT ON stock_overview TO authenticated;
GRANT SELECT ON stock_status TO authenticated;

-- Create items_balances CTE for use in other queries
CREATE VIEW items_with_balance AS
SELECT 
    i.*,
    c.name AS category_name,
    s.name AS subcategory_name,
    COALESCE(totals.total_quantity, 0) AS current_balance,
    COALESCE(totals.avg_cost, 0) AS avg_cost_price,
    COALESCE(totals.total_value, 0) AS total_value
FROM items i
LEFT JOIN categories c ON c.id = i.category_id
LEFT JOIN subcategories s ON s.id = i.subcategory_id
LEFT JOIN LATERAL (
    SELECT 
        SUM(ti.quantity) AS total_quantity,
        CASE 
            WHEN SUM(ti.quantity) > 0 THEN SUM(ti.quantity * ti.unit_price) / SUM(ti.quantity)
            ELSE 0 
        END AS avg_cost,
        SUM(ti.quantity * ti.unit_price) AS total_value
    FROM transaction_items ti
    WHERE ti.item_id = i.id
) totals ON true;

GRANT SELECT ON items_with_balance TO authenticated;

COMMENT ON VIEW stock_overview IS 'View showing current stock balance, unit cost, and status for all items';
COMMENT ON VIEW stock_status IS 'View showing detailed stock status including category and parameters';
COMMENT ON VIEW items_with_balance IS 'View joining items with their calculated balances';
