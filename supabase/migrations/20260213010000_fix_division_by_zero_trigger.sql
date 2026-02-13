-- Fix division by zero in update_cost_price_on_purchase trigger
-- This prevents errors when current_stock is 0 or negative

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
  v_new_quantity DECIMAL(10,2);
  v_new_unit_price DECIMAL(10,2);
  v_total_quantity DECIMAL(10,2);
BEGIN
  -- Get transaction type
  SELECT transaction_type INTO v_transaction_type
  FROM transactions
  WHERE id = NEW.transaction_id;

  -- Get current cost from items table
  SELECT COALESCE(cost_price, 0) INTO v_current_cost
  FROM items
  WHERE id = NEW.item_id;

  -- Use NEW values with defaults
  v_new_quantity := COALESCE(NEW.quantity, 0);
  v_new_unit_price := COALESCE(NEW.unit_price, 0);

  IF v_transaction_type = 'purchase' THEN
    -- Calculate current stock using the function
    SELECT COALESCE(get_current_stock(NEW.item_id), 0) INTO v_current_stock;
    
    -- Calculate total quantity
    v_total_quantity := v_current_stock + v_new_quantity;
    
    -- Calculate new weighted average cost
    -- Handle edge cases
    IF v_total_quantity > 0 AND v_new_quantity > 0 THEN
      UPDATE items
      SET cost_price = ((v_current_stock * v_current_cost) + (v_new_quantity * v_new_unit_price)) / v_total_quantity
      WHERE id = NEW.item_id;
    ELSIF v_new_quantity > 0 THEN
      -- If no current stock, just use the new unit_price
      UPDATE items
      SET cost_price = v_new_unit_price
      WHERE id = NEW.item_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_cost_price_on_purchase_trigger ON public.transaction_items;
CREATE TRIGGER update_cost_price_on_purchase_trigger
  BEFORE INSERT ON public.transaction_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cost_price_on_purchase();
