-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, category_id)
);

-- Add new columns to items
ALTER TABLE public.items
ADD COLUMN category_id UUID REFERENCES public.categories(id),
ADD COLUMN subcategory_id UUID REFERENCES public.subcategories(id),
ADD COLUMN cost_price DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Drop the old category column since we now use category_id
ALTER TABLE public.items DROP COLUMN category;

-- Add profit column to transaction_items
ALTER TABLE public.transaction_items
ADD COLUMN profit DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Enable RLS for new tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Authenticated users can view categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for subcategories
CREATE POLICY "Authenticated users can view subcategories"
  ON public.subcategories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage subcategories"
  ON public.subcategories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at on categories and subcategories
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subcategories_updated_at
  BEFORE UPDATE ON public.subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update cost_price on purchase
CREATE OR REPLACE FUNCTION public.update_cost_price_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_type transaction_type;
  v_old_quantity DECIMAL(10,2);
  v_old_cost DECIMAL(10,2);
BEGIN
  SELECT transaction_type INTO v_transaction_type
  FROM transactions
  WHERE id = NEW.transaction_id;

  IF v_transaction_type = 'purchase' THEN
    SELECT quantity, cost_price INTO v_old_quantity, v_old_cost
    FROM items
    WHERE id = NEW.item_id;

    UPDATE items
    SET cost_price = ((v_old_quantity * v_old_cost) + (NEW.quantity * NEW.unit_price)) / (v_old_quantity + NEW.quantity)
    WHERE id = NEW.item_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to calculate profit on sale
CREATE OR REPLACE FUNCTION public.calculate_profit_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_type transaction_type;
  v_cost_price DECIMAL(10,2);
BEGIN
  SELECT transaction_type INTO v_transaction_type
  FROM transactions
  WHERE id = NEW.transaction_id;

  IF v_transaction_type = 'sale' THEN
    SELECT cost_price INTO v_cost_price
    FROM items
    WHERE id = NEW.item_id;

    NEW.profit := NEW.unit_price - v_cost_price;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER update_cost_price_on_purchase_trigger
  BEFORE INSERT ON public.transaction_items
  FOR EACH ROW EXECUTE FUNCTION public.update_cost_price_on_purchase();

CREATE TRIGGER calculate_profit_on_sale_trigger
  BEFORE INSERT ON public.transaction_items
  FOR EACH ROW EXECUTE FUNCTION public.calculate_profit_on_sale();