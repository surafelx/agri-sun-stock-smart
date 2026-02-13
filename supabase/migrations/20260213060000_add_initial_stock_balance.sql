-- =============================================================================
-- Add Initial Stock Balance for 3DSC4.8-112-110-1100
-- Stock Code: 01-01-001
-- =============================================================================

-- First, update the item with the SKU and set the initial cost_price
UPDATE public.items
SET 
  sku = '01-01-001',
  description = 'AC Submersible Solar Pump, 4.8m³/h @ 110m head, 1100W',
  cost_price = 27441.72::decimal,
  parameters = '{"power": "1100W", "flow_rate": "4.8m³/h", "head": "110m", "type": "AC Submersible", "stock_code": "01-01-001"}'::jsonb
WHERE name = 'Solar Pump 3DSC4.8-112-110-1100';

-- Disable the cost_price trigger temporarily
DROP TRIGGER IF EXISTS update_cost_price_on_purchase_trigger ON public.transaction_items;

-- Create a purchase transaction for the initial stock
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
  54883.44::decimal,
  (SELECT id FROM auth.users LIMIT 1)
FROM public.items
WHERE EXISTS (SELECT 1 FROM public.items WHERE name = 'Solar Pump 3DSC4.8-112-110-1100')
LIMIT 1;

-- Get the transaction ID that was just created
DO $$
DECLARE
  v_transaction_id UUID;
  v_item_id UUID;
BEGIN
  -- Get the transaction ID
  SELECT id INTO v_transaction_id 
  FROM public.transactions 
  WHERE reference_number = '4-017599-1' 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Get the item ID
  SELECT id INTO v_item_id 
  FROM public.items 
  WHERE sku = '01-01-001';
  
  -- Insert the transaction item line (without cost_price column)
  IF v_transaction_id IS NOT NULL AND v_item_id IS NOT NULL THEN
    INSERT INTO public.transaction_items (
      transaction_id,
      item_id,
      quantity,
      unit_price,
      total_price,
      profit
    )
    VALUES (
      v_transaction_id,
      v_item_id,
      2::decimal,
      27441.72::decimal,
      54883.44::decimal,
      0::decimal
    );
  END IF;
END $$;

-- Recreate the trigger
CREATE TRIGGER update_cost_price_on_purchase_trigger
  BEFORE INSERT ON public.transaction_items
  FOR EACH ROW EXECUTE FUNCTION public.update_cost_price_on_purchase();

-- Verify the stock balance
SELECT 
  i.name,
  i.sku,
  i.uom,
  public.get_current_stock(i.id) as current_balance,
  i.cost_price,
  (public.get_current_stock(i.id) * i.cost_price) as total_value
FROM public.items i
WHERE i.sku = '01-01-001';
