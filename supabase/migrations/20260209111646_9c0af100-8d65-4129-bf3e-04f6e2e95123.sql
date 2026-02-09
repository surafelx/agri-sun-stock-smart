
-- Fix items table policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can view items" ON public.items;
DROP POLICY IF EXISTS "Admin and inventory_clerk can insert items" ON public.items;
DROP POLICY IF EXISTS "Admin and inventory_clerk can update items" ON public.items;
DROP POLICY IF EXISTS "Admins can delete items" ON public.items;

CREATE POLICY "Authenticated users can view items" ON public.items FOR SELECT USING (true);
CREATE POLICY "Admin and inventory_clerk can insert items" ON public.items FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'inventory_clerk'::app_role));
CREATE POLICY "Admin and inventory_clerk can update items" ON public.items FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'inventory_clerk'::app_role));
CREATE POLICY "Admins can delete items" ON public.items FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix transactions table policies
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can delete transactions" ON public.transactions;

CREATE POLICY "Authenticated users can view transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can update transactions" ON public.transactions FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete transactions" ON public.transactions FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix transaction_items table policies
DROP POLICY IF EXISTS "Authenticated users can view transaction items" ON public.transaction_items;
DROP POLICY IF EXISTS "Authenticated users can create transaction items" ON public.transaction_items;
DROP POLICY IF EXISTS "Admins can update transaction items" ON public.transaction_items;
DROP POLICY IF EXISTS "Admins can delete transaction items" ON public.transaction_items;

CREATE POLICY "Authenticated users can view transaction items" ON public.transaction_items FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create transaction items" ON public.transaction_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update transaction items" ON public.transaction_items FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete transaction items" ON public.transaction_items FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix other tables too
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can insert activity" ON public.activity_log;
DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_log;

CREATE POLICY "Authenticated users can insert activity" ON public.activity_log FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own activity" ON public.activity_log FOR SELECT USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
