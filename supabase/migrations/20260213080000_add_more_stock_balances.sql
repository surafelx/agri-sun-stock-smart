-- =============================================================================
-- Add Initial Stock Balance for Additional Items
-- =============================================================================

-- =============================================================================
-- Item 1: Stock Code 01-01-003
-- Item Name: 3DSC4.8-130-200-1500-A/D
-- =============================================================================

-- First, update the item with the SKU and additional info
UPDATE public.items
SET 
  sku = '01-01-003',
  description = 'AC Submersible Solar Pump, 4.8m³/h @ 130m head, 1500W with A/D',
  parameters = '{"power": "1500W", "flow_rate": "4.8m³/h", "head": "130m", "type": "AC Submersible", "stock_code": "01-01-003"}'::jsonb
WHERE name = 'Solar Pump 4DSC7.5-100-200-1500-AD';

-- Disable the cost_price trigger temporarily
DROP TRIGGER IF EXISTS update_cost_price_on_purchase_trigger ON public.transaction_items;

-- Set initial cost_price
UPDATE public.items
SET cost_price = 32623.84::decimal
WHERE sku = '01-01-003';

-- Create purchase transaction for initial stock
INSERT INTO public.transactions (
  transaction_type,
  transaction_date,
  reference_number,
  customer_supplier_name,
  notes,
  total_amount,
  created_by
)
SELECT 
  'purchase'::transaction_type,
  '2024-07-23'::timestamptz,
  '4-017599-1',
  'Initial Stock Import',
  'Initial stock balance import from old system',
  32623.84::decimal,
  (SELECT id FROM auth.users LIMIT 1);

-- Get the transaction ID and insert line item
DO $$
DECLARE
  v_transaction_id UUID;
  v_item_id UUID;
BEGIN
  SELECT id INTO v_transaction_id 
  FROM public.transactions 
  WHERE reference_number = '4-017599-1' 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  SELECT id INTO v_item_id 
  FROM public.items 
  WHERE sku = '01-01-003';
  
  IF v_transaction_id IS NOT NULL AND v_item_id IS NOT NULL THEN
    INSERT INTO public.transaction_items (
      transaction_id, item_id, quantity, unit_price, total_price, profit
    )
    VALUES (
      v_transaction_id, v_item_id, 1::decimal, 32623.84::decimal, 32623.84::decimal, 0::decimal
    );
  END IF;
END $$;

-- =============================================================================
-- Item 2: Stock Code 01-01-004
-- Item Name: 4DSC5.2-67-110-750-A/D
-- =============================================================================

-- Update the item with the SKU and additional info
UPDATE public.items
SET 
  sku = '01-01-004',
  description = 'AC Submersible Solar Pump, 5.2m³/h @ 67m head, 750W with A/D',
  parameters = '{"power": "750W", "flow_rate": "5.2m³/h", "head": "67m", "type": "AC Submersible", "stock_code": "01-01-004"}'::jsonb
WHERE name = 'Solar Pump 4DSC5.2-67-110-750-AD';

-- Set initial cost_price
UPDATE public.items
SET cost_price = 30386.11::decimal
WHERE sku = '01-01-004';

-- Create first purchase transaction (IN: 2)
INSERT INTO public.transactions (
  transaction_type, transaction_date, reference_number, customer_supplier_name, notes, total_amount, created_by
)
SELECT 
  'purchase'::transaction_type, '2024-07-23'::timestamptz, '4-017599-1',
  'Initial Stock Import', 'Initial stock balance import from old system',
  60772.22::decimal, (SELECT id FROM auth.users LIMIT 1);

-- Get the transaction ID and insert line item for first transaction
DO $$
DECLARE
  v_transaction_id UUID;
  v_item_id UUID;
BEGIN
  SELECT id INTO v_transaction_id 
  FROM public.transactions 
  WHERE reference_number = '4-017599-1' 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  SELECT id INTO v_item_id 
  FROM public.items 
  WHERE sku = '01-01-004';
  
  IF v_transaction_id IS NOT NULL AND v_item_id IS NOT NULL THEN
    INSERT INTO public.transaction_items (
      transaction_id, item_id, quantity, unit_price, total_price, profit
    )
    VALUES (
      v_transaction_id, v_item_id, 2::decimal, 30386.11::decimal, 60772.22::decimal, 0::decimal
    );
  END IF;
END $$;

-- Create second transaction (OUT: 1) - Sale/Reference CRV-8/17
INSERT INTO public.transactions (
  transaction_type, transaction_date, reference_number, customer_supplier_name, notes, total_amount, created_by
)
SELECT 
  'sale'::transaction_type, '2024-07-23'::timestamptz, 'CRV-8/17',
  'Stock Adjustment', 'Stock adjustment from old system',
  30386.11::decimal, (SELECT id FROM auth.users LIMIT 1);

-- Get the transaction ID and insert line item for sale
DO $$
DECLARE
  v_transaction_id UUID;
  v_item_id UUID;
BEGIN
  SELECT id INTO v_transaction_id 
  FROM public.transactions 
  WHERE reference_number = 'CRV-8/17' 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  SELECT id INTO v_item_id 
  FROM public.items 
  WHERE sku = '01-01-004';
  
  IF v_transaction_id IS NOT NULL AND v_item_id IS NOT NULL THEN
    INSERT INTO public.transaction_items (
      transaction_id, item_id, quantity, unit_price, total_price, profit
    )
    VALUES (
      v_transaction_id, v_item_id, 1::decimal, 30386.11::decimal, 30386.11::decimal, 0::decimal
    );
  END IF;
END $$;

-- Recreate the trigger
CREATE TRIGGER update_cost_price_on_purchase_trigger
  BEFORE INSERT ON public.transaction_items
  FOR EACH ROW EXECUTE FUNCTION public.update_cost_price_on_purchase();

-- Verify the stock balances
SELECT 
  i.name,
  i.sku,
  public.get_current_stock(i.id) as current_balance,
  i.cost_price,
  ROUND((public.get_current_stock(i.id) * i.cost_price), 2) as total_value
FROM public.items i
WHERE i.sku IN ('01-01-003', '01-01-004');
