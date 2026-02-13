-- =============================================================================
-- Search and Stock Overview Views
-- =============================================================================

-- View: Stock Overview - All items with current balance and total value
CREATE OR REPLACE VIEW public.stock_overview AS
SELECT 
  i.id as item_id,
  i.sku as "Stock Code",
  i.name as "Item Name",
  c.name as "Category",
  s.name as "Subcategory",
  i.uom as "UOM",
  COALESCE(public.get_current_stock(i.id), 0) as "Current Balance",
  i.cost_price as "Unit Cost",
  ROUND(COALESCE(public.get_current_stock(i.id), 0) * i.cost_price, 2) as "Total Value",
  i.low_stock_threshold as "Low Stock Threshold",
  CASE 
    WHEN COALESCE(public.get_current_stock(i.id), 0) <= i.low_stock_threshold THEN 'Low Stock'
    WHEN COALESCE(public.get_current_stock(i.id), 0) = 0 THEN 'Out of Stock'
    ELSE 'In Stock'
  END as "Stock Status",
  i.parameters->>'stock_code' as "Stock Code Ref"
FROM public.items i
LEFT JOIN public.categories c ON i.category_id = c.id
LEFT JOIN public.subcategories s ON i.subcategory_id = s.id
ORDER BY c.name, s.name, i.sku;

-- View: Transaction History for all items
CREATE OR REPLACE VIEW public.transaction_history AS
SELECT 
  t.id as transaction_id,
  t.reference_number as "Reference",
  t.transaction_type as "Type",
  t.transaction_date as "Date",
  t.customer_supplier_name as "Customer/Supplier",
  t.notes as "Notes",
  ti.quantity as "Quantity",
  ti.unit_price as "Unit Price",
  ti.total_price as "Total Price",
  i.sku as "Item SKU",
  i.name as "Item Name",
  c.name as "Category",
  s.name as "Subcategory"
FROM public.transactions t
JOIN public.transaction_items ti ON t.id = ti.transaction_id
JOIN public.items i ON ti.item_id = i.id
LEFT JOIN public.categories c ON i.category_id = c.id
LEFT JOIN public.subcategories s ON i.subcategory_id = s.id
ORDER BY t.transaction_date DESC, t.created_at DESC;

-- Function: Search items by any field
CREATE OR REPLACE FUNCTION public.search_items(search_term TEXT)
RETURNS TABLE (
  item_id UUID,
  sku TEXT,
  name TEXT,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  current_balance DECIMAL,
  unit_cost DECIMAL,
  total_value DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.sku,
    i.name,
    i.description,
    c.name,
    s.name,
    COALESCE(public.get_current_stock(i.id), 0),
    i.cost_price,
    ROUND(COALESCE(public.get_current_stock(i.id), 0) * i.cost_price, 2)
  FROM public.items i
  LEFT JOIN public.categories c ON i.category_id = c.id
  LEFT JOIN public.subcategories s ON i.subcategory_id = s.id
  WHERE 
    LOWER(i.sku) LIKE LOWER('%' || search_term || '%') OR
    LOWER(i.name) LIKE LOWER('%' || search_term || '%') OR
    LOWER(i.description) LIKE LOWER('%' || search_term || '%') OR
    LOWER(c.name) LIKE LOWER('%' || search_term || '%') OR
    LOWER(s.name) LIKE LOWER('%' || search_term || '%') OR
    LOWER(i.parameters->>'stock_code') LIKE LOWER('%' || search_term || '%')
  ORDER BY i.name;
END;
$$;

-- Function: Search transactions
CREATE OR REPLACE FUNCTION public.search_transactions(search_term TEXT)
RETURNS TABLE (
  transaction_id UUID,
  reference TEXT,
  type TEXT,
  date TIMESTAMPTZ,
  customer_supplier TEXT,
  notes TEXT,
  item_sku TEXT,
  item_name TEXT,
  quantity DECIMAL,
  unit_price DECIMAL,
  total_price DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.reference_number,
    t.transaction_type::TEXT,
    t.transaction_date,
    t.customer_supplier_name,
    t.notes,
    i.sku,
    i.name,
    ti.quantity,
    ti.unit_price,
    ti.total_price
  FROM public.transactions t
  JOIN public.transaction_items ti ON t.id = ti.transaction_id
  JOIN public.items i ON ti.item_id = i.id
  WHERE 
    LOWER(t.reference_number) LIKE LOWER('%' || search_term || '%') OR
    LOWER(t.customer_supplier_name) LIKE LOWER('%' || search_term || '%') OR
    LOWER(i.sku) LIKE LOWER('%' || search_term || '%') OR
    LOWER(i.name) LIKE LOWER('%' || search_term || '%')
  ORDER BY t.transaction_date DESC, t.created_at DESC;
END;
$$;

-- Function: Get stock by category
CREATE OR REPLACE FUNCTION public.get_stock_by_category(category_name TEXT)
RETURNS TABLE (
  item_id UUID,
  sku TEXT,
  name TEXT,
  subcategory TEXT,
  current_balance DECIMAL,
  unit_cost DECIMAL,
  total_value DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.sku,
    i.name,
    s.name,
    COALESCE(public.get_current_stock(i.id), 0),
    i.cost_price,
    ROUND(COALESCE(public.get_current_stock(i.id), 0) * i.cost_price, 2)
  FROM public.items i
  LEFT JOIN public.categories c ON i.category_id = c.id
  LEFT JOIN public.subcategories s ON i.subcategory_id = s.id
  WHERE LOWER(c.name) = LOWER(category_name)
  ORDER BY s.name, i.name;
END;
$$;

-- Grant SELECT permissions to authenticated users
GRANT SELECT ON public.stock_overview TO authenticated;
GRANT SELECT ON public.transaction_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_items(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_transactions(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stock_by_category(TEXT) TO authenticated;
