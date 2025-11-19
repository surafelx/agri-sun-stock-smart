-- Add uom column to items table
ALTER TABLE public.items
ADD COLUMN uom TEXT;

-- Remove quantity and unit_price columns from items table
ALTER TABLE public.items
DROP COLUMN quantity,
DROP COLUMN unit_price;

-- Drop the old trigger that updates item quantity
DROP TRIGGER IF EXISTS update_item_quantity_on_transaction ON public.transaction_items;

-- Drop the old function that updates item quantity
DROP FUNCTION IF EXISTS public.update_item_quantity();

-- Create a function to calculate current stock for an item
CREATE OR REPLACE FUNCTION public.get_current_stock(item_id_param UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock DECIMAL(10,2) := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN t.transaction_type = 'purchase' THEN ti.quantity
      WHEN t.transaction_type = 'sale' THEN -ti.quantity
      WHEN t.transaction_type = 'adjustment' THEN ti.quantity
      ELSE 0
    END
  ), 0) INTO current_stock
  FROM transaction_items ti
  JOIN transactions t ON ti.transaction_id = t.id
  WHERE ti.item_id = item_id_param;

  RETURN current_stock;
END;
$$;

-- Update the cost_price calculation function to not depend on stored quantity
CREATE OR REPLACE FUNCTION public.update_cost_price_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_type transaction_type;
  v_current_stock DECIMAL(10,2);
  v_current_cost DECIMAL(10,2);
BEGIN
  SELECT transaction_type INTO v_transaction_type
  FROM transactions
  WHERE id = NEW.transaction_id;

  IF v_transaction_type = 'purchase' THEN
    -- Get current stock and cost_price
    SELECT get_current_stock(NEW.item_id) - NEW.quantity, cost_price INTO v_current_stock, v_current_cost
    FROM items
    WHERE id = NEW.item_id;

    -- Update cost_price using weighted average
    UPDATE items
    SET cost_price = ((v_current_stock * v_current_cost) + (NEW.quantity * NEW.unit_price)) / (v_current_stock + NEW.quantity)
    WHERE id = NEW.item_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger for cost_price updates
DROP TRIGGER IF EXISTS update_cost_price_on_purchase_trigger ON public.transaction_items;
CREATE TRIGGER update_cost_price_on_purchase_trigger
  BEFORE INSERT ON public.transaction_items
  FOR EACH ROW EXECUTE FUNCTION public.update_cost_price_on_purchase();