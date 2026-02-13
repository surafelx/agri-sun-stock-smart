-- =============================================================================
-- Fix RLS Policies for transaction_items and related tables
-- This script fixes issues with 406 errors when accessing transaction data
-- =============================================================================

-- Fix RLS policies for transaction_items to allow proper access
DROP POLICY IF EXISTS "Authenticated users can view transaction items" ON public.transaction_items;
DROP POLICY IF EXISTS "Authenticated users can create transaction items" ON public.transaction_items;
DROP POLICY IF EXISTS "Admins can update transaction items" ON public.transaction_items;
DROP POLICY IF EXISTS "Admins can delete transaction items" ON public.transaction_items;

-- Recreate policies with proper settings
CREATE POLICY "Anyone can view transaction items" ON public.transaction_items
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert transaction items" ON public.transaction_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update transaction items" ON public.transaction_items
  FOR UPDATE USING (has_role(auth.uid()::text, 'admin'::app_role));

CREATE POLICY "Admins can delete transaction items" ON public.transaction_items
  FOR DELETE USING (has_role(auth.uid()::text, 'admin'::app_role));

-- Also fix transactions table policies
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can delete transactions" ON public.transactions;

CREATE POLICY "Anyone can view transactions" ON public.transactions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update transactions" ON public.transactions
  FOR UPDATE USING (has_role(auth.uid()::text, 'admin'::app_role));

CREATE POLICY "Admins can delete transactions" ON public.transactions
  FOR DELETE USING (has_role(auth.uid()::text, 'admin'::app_role));

-- Ensure the get_current_stock function has proper security settings
CREATE OR REPLACE FUNCTION public.get_current_stock(item_id_param UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
STABLE
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

-- Also fix items table policies
DROP POLICY IF EXISTS "Authenticated users can view items" ON public.items;
DROP POLICY IF EXISTS "Admin and inventory_clerk can insert items" ON public.items;
DROP POLICY IF EXISTS "Admin and inventory_clerk can update items" ON public.items;
DROP POLICY IF EXISTS "Admins can delete items" ON public.items;

CREATE POLICY "Anyone can view items" ON public.items
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert items" ON public.items
  FOR INSERT WITH CHECK (has_role(auth.uid()::text, 'admin'::app_role) OR has_role(auth.uid()::text, 'inventory_clerk'::app_role));

CREATE POLICY "Admins can update items" ON public.items
  FOR UPDATE USING (has_role(auth.uid()::text, 'admin'::app_role) OR has_role(auth.uid()::text, 'inventory_clerk'::app_role));

CREATE POLICY "Admins can delete items" ON public.items
  FOR DELETE USING (has_role(auth.uid()::text, 'admin'::app_role));
