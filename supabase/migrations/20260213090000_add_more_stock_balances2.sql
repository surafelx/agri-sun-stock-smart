-- =============================================================================
-- Add Initial Stock Balance for Items 01-01-005 to 01-01-010
-- =============================================================================

-- Disable the cost_price trigger temporarily
DROP TRIGGER IF EXISTS update_cost_price_on_purchase_trigger ON public.transaction_items;

-- =============================================================================
-- Item 1: Stock Code 01-01-005 (4DSC7.5-100-200-1500-AD)
-- =============================================================================

UPDATE public.items
SET 
  sku = '01-01-005',
  description = 'AC Submersible Solar Pump, 7.5m³/h @ 100m head, 1500W with A/D',
  cost_price = 31799.41::decimal,
  parameters = '{"power": "1500W", "flow_rate": "7.5m³/h", "head": "100m", "type": "AC Submersible", "stock_code": "01-01-005"}'::jsonb
WHERE name = 'Solar Pump 4DSC7.5-100-200-1500-AD';

-- Create purchase transaction
INSERT INTO public.transactions (transaction_type, transaction_date, reference_number, customer_supplier_name, notes, total_amount, created_by)
SELECT 'purchase'::transaction_type, '2024-07-23'::timestamptz, '4-017599-1', 'Initial Stock Import', 'Initial stock balance import', 63598.82::decimal, (SELECT id FROM auth.users LIMIT 1);

DO $$
DECLARE v_transaction_id UUID; v_item_id UUID;
BEGIN
  SELECT id INTO v_transaction_id FROM public.transactions WHERE reference_number = '4-017599-1' ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_item_id FROM public.items WHERE sku = '01-01-005';
  IF v_transaction_id IS NOT NULL AND v_item_id IS NOT NULL THEN
    INSERT INTO public.transaction_items (transaction_id, item_id, quantity, unit_price, total_price, profit)
    VALUES (v_transaction_id, v_item_id, 2::decimal, 31799.41::decimal, 63598.82::decimal, 0::decimal);
  END IF;
END $$;

-- =============================================================================
-- Item 2: Stock Code 01-01-006 (4DSC7.5-100-150-2200-AD)
-- =============================================================================

UPDATE public.items
SET 
  sku = '01-01-006',
  description = 'AC Submersible Solar Pump, 7.5m³/h @ 100m head, 2200W with A/D',
  cost_price = 35332.68::decimal,
  parameters = '{"power": "2200W", "flow_rate": "7.5m³/h", "head": "100m", "type": "AC Submersible", "stock_code": "01-01-006"}'::jsonb
WHERE name = 'Solar Pump 4DSC7.5-100-150-2200-AD';

-- Create purchase transaction
INSERT INTO public.transactions (transaction_type, transaction_date, reference_number, customer_supplier_name, notes, total_amount, created_by)
SELECT 'purchase'::transaction_type, '2024-07-23'::timestamptz, '4-017599-1', 'Initial Stock Import', 'Initial stock balance import', 70665.36::decimal, (SELECT id FROM auth.users LIMIT 1);

DO $$
DECLARE v_transaction_id UUID; v_item_id UUID;
BEGIN
  SELECT id INTO v_transaction_id FROM public.transactions WHERE reference_number = '4-017599-1' ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_item_id FROM public.items WHERE sku = '01-01-006';
  IF v_transaction_id IS NOT NULL AND v_item_id IS NOT NULL THEN
    INSERT INTO public.transaction_items (transaction_id, item_id, quantity, unit_price, total_price, profit)
    VALUES (v_transaction_id, v_item_id, 2::decimal, 35332.68::decimal, 70665.36::decimal, 0::decimal);
  END IF;
END $$;

-- =============================================================================
-- Item 3: Stock Code 01-01-007 (4/6DSC36-56-380/550-3300-AD)
-- =============================================================================

UPDATE public.items
SET 
  sku = '01-01-007',
  description = 'AC Submersible Solar Pump, 36m³/h @ 56m head, 3300W with A/D',
  cost_price = 46258.73::decimal,
  parameters = '{"power": "3300W", "flow_rate": "36m³/h", "head": "56m", "type": "AC Submersible", "stock_code": "01-01-007"}'::jsonb
WHERE name = 'Solar Pump 46DSC36-56-380550-3300AD';

-- Create purchase transaction
INSERT INTO public.transactions (transaction_type, transaction_date, reference_number, customer_supplier_name, notes, total_amount, created_by)
SELECT 'purchase'::transaction_type, '2024-07-23'::timestamptz, '4-017599-1', 'Initial Stock Import', 'Initial stock balance import', 46258.73::decimal, (SELECT id FROM auth.users LIMIT 1);

DO $$
DECLARE v_transaction_id UUID; v_item_id UUID;
BEGIN
  SELECT id INTO v_transaction_id FROM public.transactions WHERE reference_number = '4-017599-1' ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_item_id FROM public.items WHERE sku = '01-01-007';
  IF v_transaction_id IS NOT NULL AND v_item_id IS NOT NULL THEN
    INSERT INTO public.transaction_items (transaction_id, item_id, quantity, unit_price, total_price, profit)
    VALUES (v_transaction_id, v_item_id, 1::decimal, 46258.73::decimal, 46258.73::decimal, 0::decimal);
  END IF;
END $$;

-- =============================================================================
-- Item 4: Stock Code 01-01-008 (4/6DSC36-75-380/550-4000-AD)
-- =============================================================================

UPDATE public.items
SET 
  sku = '01-01-008',
  description = 'AC Submersible Solar Pump, 36m³/h @ 75m head, 4000W with A/D',
  cost_price = 52410.15::decimal,
  parameters = '{"power": "4000W", "flow_rate": "36m³/h", "head": "75m", "type": "AC Submersible", "stock_code": "01-01-008"}'::jsonb
WHERE name = 'Solar Pump 46DSC36-75-380500-4000AD';

-- Create purchase transaction
INSERT INTO public.transactions (transaction_type, transaction_date, reference_number, customer_supplier_name, notes, total_amount, created_by)
SELECT 'purchase'::transaction_type, '2024-07-23'::timestamptz, '4-017599-1', 'Initial Stock Import', 'Initial stock balance import', 52410.15::decimal, (SELECT id FROM auth.users LIMIT 1);

DO $$
DECLARE v_transaction_id UUID; v_item_id UUID;
BEGIN
  SELECT id INTO v_transaction_id FROM public.transactions WHERE reference_number = '4-017599-1' ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_item_id FROM public.items WHERE sku = '01-01-008';
  IF v_transaction_id IS NOT NULL AND v_item_id IS NOT NULL THEN
    INSERT INTO public.transaction_items (transaction_id, item_id, quantity, unit_price, total_price, profit)
    VALUES (v_transaction_id, v_item_id, 1::decimal, 52410.15::decimal, 52410.15::decimal, 0::decimal);
  END IF;
END $$;

-- =============================================================================
-- Item 5: Stock Code 01-01-009 (6DSC36-98-380/550-5500-AD)
-- =============================================================================

UPDATE public.items
SET 
  sku = '01-01-009',
  description = 'AC Submersible Solar Pump, 36m³/h @ 98m head, 5500W with A/D',
  cost_price = 188227.14::decimal,
  parameters = '{"power": "5500W", "flow_rate": "36m³/h", "head": "98m", "type": "AC Submersible", "stock_code": "01-01-009"}'::jsonb
WHERE name = 'Solar Pump 6DSC36-90-380550-5000AD';

-- Transaction 1: 1 unit @ 83,626.57
INSERT INTO public.transactions (transaction_type, transaction_date, reference_number, customer_supplier_name, notes, total_amount, created_by)
SELECT 'purchase'::transaction_type, '2024-07-23'::timestamptz, '4-017599-1', 'Initial Stock Import', 'Initial stock balance import', 83626.57::decimal, (SELECT id FROM auth.users LIMIT 1);

DO $$
DECLARE v_transaction_id UUID; v_item_id UUID;
BEGIN
  SELECT id INTO v_transaction_id FROM public.transactions WHERE reference_number = '4-017599-1' ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_item_id FROM public.items WHERE sku = '01-01-009';
  IF v_transaction_id IS NOT NULL AND v_item_id IS NOT NULL THEN
    INSERT INTO public.transaction_items (transaction_id, item_id, quantity, unit_price, total_price, profit)
    VALUES (v_transaction_id, v_item_id, 1::decimal, 83626.57::decimal, 83626.57::decimal, 0::decimal);
  END IF;
END $$;

-- Update cost to new weighted average after second purchase
UPDATE public.items SET cost_price = 188227.14::decimal WHERE sku = '01-01-009';

-- Transaction 2: 9 units @ 121,860.52 (ref: 4-022460-1, date: 30/09/2024)
INSERT INTO public.transactions (transaction_type, transaction_date, reference_number, customer_supplier_name, notes, total_amount, created_by)
SELECT 'purchase'::transaction_type, '2024-09-30'::timestamptz, '4-022460-1', 'Purchase', 'Stock purchase', 1096744.68::decimal, (SELECT id FROM auth.users LIMIT 1);

DO $$
DECLARE v_transaction_id UUID; v_item_id UUID;
BEGIN
  SELECT id INTO v_transaction_id FROM public.transactions WHERE reference_number = '4-022460-1' ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_item_id FROM public.items WHERE sku = '01-01-009';
  IF v_transaction_id IS NOT NULL AND v_item_id IS NOT NULL THEN
    INSERT INTO public.transaction_items (transaction_id, item_id, quantity, unit_price, total_price, profit)
    VALUES (v_transaction_id, v_item_id, 9::decimal, 121860.52::decimal, 1096744.68::decimal, 0::decimal);
  END IF;
END $$;

-- Transaction 3: OUT 9 (CRV-10/17, date: 30/09/2024)
INSERT INTO public.transactions (transaction_type, transaction_date, reference_number, customer_supplier_name, notes, total_amount, created_by)
SELECT 'sale'::transaction_type, '2024-09-30'::timestamptz, 'CRV-10/17', 'Stock Adjustment', 'Stock adjustment', 1096744.68::decimal, (SELECT id FROM auth.users LIMIT 1);

DO $$
DECLARE v_transaction_id UUID; v_item_id UUID;
BEGIN
  SELECT id INTO v_transaction_id FROM public.transactions WHERE reference_number = 'CRV-10/17' ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_item_id FROM public.items WHERE sku = '01-01-009';
  IF v_transaction_id IS NOT NULL AND v_item_id IS NOT NULL THEN
    INSERT INTO public.transaction_items (transaction_id, item_id, quantity, unit_price, total_price, profit)
    VALUES (v_transaction_id, v_item_id, 9::decimal, 121860.52::decimal, 1096744.68::decimal, 0::decimal);
  END IF;
END $$;

-- Update cost after third purchase
UPDATE public.items SET cost_price = 188227.14::decimal WHERE sku = '01-01-009';

-- Transaction 4: 7 units @ 188,221.14 (ref: 4-022468-1, date: 30/09/2024)
INSERT INTO public.transactions (transaction_type, transaction_date, reference_number, customer_supplier_name, notes, total_amount, created_by)
SELECT 'purchase'::transaction_type, '2024-09-30'::timestamptz, '4-022468-1', 'Purchase', 'Stock purchase', 1317547.98::decimal, (SELECT id FROM auth.users LIMIT 1);

DO $$
DECLARE v_transaction_id UUID; v_item_id UUID;
BEGIN
  SELECT id INTO v_transaction_id FROM public.transactions WHERE reference_number = '4-022468-1' ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_item_id FROM public.items WHERE sku = '01-01-009';
  IF v_transaction_id IS NOT NULL AND v_item_id IS NOT NULL THEN
    INSERT INTO public.transaction_items (transaction_id, item_id, quantity, unit_price, total_price, profit)
    VALUES (v_transaction_id, v_item_id, 7::decimal, 188221.14::decimal, 1317547.98::decimal, 0::decimal);
  END IF;
END $$;

-- Transaction 5: OUT 7 (CRV-10/17, date: 30/09/2024)
INSERT INTO public.transactions (transaction_type, transaction_date, reference_number, customer_supplier_name, notes, total_amount, created_by)
SELECT 'sale'::transaction_type, '2024-09-30'::timestamptz, 'CRV-10/17-2', 'Stock Adjustment', 'Stock adjustment', 1317547.98::decimal, (SELECT id FROM auth.users LIMIT 1);

DO $$
DECLARE v_transaction_id UUID; v_item_id UUID;
BEGIN
  SELECT id INTO v_transaction_id FROM public.transactions WHERE reference_number = 'CRV-10/17-2' ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_item_id FROM public.items WHERE sku = '01-01-009';
  IF v_transaction_id IS NOT NULL AND v_item_id IS NOT NULL THEN
    INSERT INTO public.transaction_items (transaction_id, item_id, quantity, unit_price, total_price, profit)
    VALUES (v_transaction_id, v_item_id, 7::decimal, 188221.14::decimal, 1317547.98::decimal, 0::decimal);
  END IF;
END $$;

-- =============================================================================
-- Item 6: Stock Code 01-01-010 (4SPW8.5-60-450-2200-AD)
-- =============================================================================

UPDATE public.items
SET 
  sku = '01-01-010',
  description = 'Solar Surface Pump, 8.5m³/h @ 60m head, 2200W with A/D',
  cost_price = 107414.73::decimal,
  parameters = '{"power": "2200W", "flow_rate": "8.5m³/h", "head": "60m", "type": "Surface Pump", "stock_code": "01-01-010"}'::jsonb
WHERE name = 'Solar Surface Pump 4SPW8.5-60-450-2200AD';

-- Transaction 1: 6 units @ 107,414.73 (ref: 4-011947-1, date: 07/08/2025)
INSERT INTO public.transactions (transaction_type, transaction_date, reference_number, customer_supplier_name, notes, total_amount, created_by)
SELECT 'purchase'::transaction_type, '2025-07-08'::timestamptz, '4-011947-1', 'Purchase', 'Stock purchase', 644488.38::decimal, (SELECT id FROM auth.users LIMIT 1);

DO $$
DECLARE v_transaction_id UUID; v_item_id UUID;
BEGIN
  SELECT id INTO v_transaction_id FROM public.transactions WHERE reference_number = '4-011947-1' ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_item_id FROM public.items WHERE sku = '01-01-010';
  IF v_transaction_id IS NOT NULL AND v_item_id IS NOT NULL THEN
    INSERT INTO public.transaction_items (transaction_id, item_id, quantity, unit_price, total_price, profit)
    VALUES (v_transaction_id, v_item_id, 6::decimal, 107414.73::decimal, 644488.38::decimal, 0::decimal);
  END IF;
END $$;

-- Transaction 2: OUT 3 (CRV-13 & 14/17, date: 07/08/2025)
INSERT INTO public.transactions (transaction_type, transaction_date, reference_number, customer_supplier_name, notes, total_amount, created_by)
SELECT 'sale'::transaction_type, '2025-07-08'::timestamptz, 'CRV-13-14-17', 'Stock Adjustment', 'Stock adjustment', 322244.19::decimal, (SELECT id FROM auth.users LIMIT 1);

DO $$
DECLARE v_transaction_id UUID; v_item_id UUID;
BEGIN
  SELECT id INTO v_transaction_id FROM public.transactions WHERE reference_number = 'CRV-13-14-17' ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_item_id FROM public.items WHERE sku = '01-01-010';
  IF v_transaction_id IS NOT NULL AND v_item_id IS NOT NULL THEN
    INSERT INTO public.transaction_items (transaction_id, item_id, quantity, unit_price, total_price, profit)
    VALUES (v_transaction_id, v_item_id, 3::decimal, 107414.73::decimal, 322244.19::decimal, 0::decimal);
  END IF;
END $$;

-- Recreate the trigger
CREATE TRIGGER update_cost_price_on_purchase_trigger
  BEFORE INSERT ON public.transaction_items
  FOR EACH ROW EXECUTE FUNCTION public.update_cost_price_on_purchase();

-- Verify all stock balances
SELECT 
  i.name,
  i.sku,
  public.get_current_stock(i.id) as current_balance,
  i.cost_price,
  ROUND((public.get_current_stock(i.id) * i.cost_price), 2) as total_value
FROM public.items i
WHERE i.sku BETWEEN '01-01-005' AND '01-01-010'
ORDER BY i.sku;
