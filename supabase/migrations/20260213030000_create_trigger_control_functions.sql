-- Create RPC functions to disable/enable triggers for bulk imports
-- Run this migration to add the functions

CREATE OR REPLACE FUNCTION public.disable_trigger(trigger_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('ALTER TABLE transaction_items DISABLE TRIGGER %I', trigger_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.enable_trigger(trigger_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('ALTER TABLE transaction_items ENABLE TRIGGER %I', trigger_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
