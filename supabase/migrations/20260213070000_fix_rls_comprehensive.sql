-- =============================================================================
-- Comprehensive RLS Fix for transaction_items and related tables
-- This script fixes 406 errors by properly configuring RLS policies
-- =============================================================================

-- First, disable RLS on all affected tables temporarily
ALTER TABLE public.transaction_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated users can view transaction items" ON public.transaction_items;
DROP POLICY IF EXISTS "Anyone can view transaction items" ON public.transaction_items;
DROP POLICY IF EXISTS "Anyone can insert transaction items" ON public.transaction_items;
DROP POLICY IF EXISTS "Admins can update transaction items" ON public.transaction_items;
DROP POLICY IF EXISTS "Admins can delete transaction items" ON public.transaction_items;
DROP POLICY IF EXISTS "Authenticated users can create transaction items" ON public.transaction_items;

DROP POLICY IF EXISTS "Authenticated users can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Anyone can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Anyone can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can delete transactions" ON public.transactions;

DROP POLICY IF EXISTS "Authenticated users can view items" ON public.items;
DROP POLICY IF EXISTS "Anyone can view items" ON public.items;
DROP POLICY IF EXISTS "Admin and inventory_clerk can insert items" ON public.items;
DROP POLICY IF EXISTS "Admins can insert items" ON public.items;
DROP POLICY IF EXISTS "Admin and inventory_clerk can update items" ON public.items;
DROP POLICY IF EXISTS "Admins can update items" ON public.items;
DROP POLICY IF EXISTS "Admins can delete items" ON public.items;

DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

DROP POLICY IF EXISTS "Authenticated users can view subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Users can view subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Admins can manage subcategories" ON public.subcategories;

-- Recreate policies with permissive settings for authenticated users
-- transaction_items policies
CREATE POLICY "View transaction items" ON public.transaction_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert transaction items" ON public.transaction_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Update transaction items" ON public.transaction_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Delete transaction items" ON public.transaction_items
  FOR DELETE TO authenticated USING (true);

-- transactions policies
CREATE POLICY "View transactions" ON public.transactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert transactions" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Update transactions" ON public.transactions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Delete transactions" ON public.transactions
  FOR DELETE TO authenticated USING (true);

-- items policies
CREATE POLICY "View items" ON public.items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert items" ON public.items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Update items" ON public.items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Delete items" ON public.items
  FOR DELETE TO authenticated USING (true);

-- categories policies
CREATE POLICY "View categories" ON public.categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert categories" ON public.categories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Update categories" ON public.categories
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Delete categories" ON public.categories
  FOR DELETE TO authenticated USING (true);

-- subcategories policies
CREATE POLICY "View subcategories" ON public.subcategories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert subcategories" ON public.subcategories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Update subcategories" ON public.subcategories
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Delete subcategories" ON public.subcategories
  FOR DELETE TO authenticated USING (true);

-- Re-enable RLS
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
