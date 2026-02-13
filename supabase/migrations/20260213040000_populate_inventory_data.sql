-- =============================================================================
-- Inventory Data Population Script for Agri Sun Stock Smart
-- =============================================================================
-- This script inserts all categories, subcategories, and items based on the
-- inventory data provided for the solar & power systems, plumbing materials,
-- structural steel, tools, and other inventory items.
-- =============================================================================

-- =============================================================================
-- SECTION 1: CATEGORIES
-- =============================================================================

INSERT INTO public.categories (name) VALUES
('Solar & Power Systems'),
('Pipes & Plumbing Materials'),
('Pipe Fittings & Valves'),
('Structural Steel & Metal'),
('Tools & Hardware'),
('Electrical Materials'),
('Construction & Civil Materials'),
('Well & Borehole Materials'),
('Safety & PPE'),
('Enclosures & Control')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- SECTION 2: SOLAR & POWER SYSTEMS - SUBCATEGORIES
-- =============================================================================

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Solar Pumps - AC Submersible Pumps', id FROM public.categories WHERE name = 'Solar & Power Systems'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Solar Surface Pumps', id FROM public.categories WHERE name = 'Solar & Power Systems'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'DC Solar Pumps', id FROM public.categories WHERE name = 'Solar & Power Systems'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Solar Controllers', id FROM public.categories WHERE name = 'Solar & Power Systems'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Solar Inverters', id FROM public.categories WHERE name = 'Solar & Power Systems'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Batteries', id FROM public.categories WHERE name = 'Solar & Power Systems'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Solar Panels', id FROM public.categories WHERE name = 'Solar & Power Systems'
ON CONFLICT (name, category_id) DO NOTHING;

-- =============================================================================
-- SECTION 3: SOLAR & POWER SYSTEMS - ITEMS
-- =============================================================================

-- AC Submersible Pumps
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Solar Pump 3DSC4.8-112-110-1100', '3DSC4.8-112-110-1100',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Pumps - AC Submersible Pumps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'AC Submersible Solar Pump, 4.8m³/h @ 110m head, 1100W', 'PC', 5::decimal,
  '{"power": "1100W", "flow_rate": "4.8m³/h", "head": "110m", "type": "AC Submersible"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Solar Pump 3DSC4.8-112-150-1100AD', '3DSC4.8-112-150-1100AD',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Pumps - AC Submersible Pumps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'AC Submersible Solar Pump, 4.8m³/h @ 112m head, 1100W with AD', 'PC', 5::decimal,
  '{"power": "1100W", "flow_rate": "4.8m³/h", "head": "112m", "type": "AC Submersible"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Solar Pump 4DSC5.2-67-110-750-AD', '4DSC5.2-67-110-750-AD',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Pumps - AC Submersible Pumps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'AC Submersible Solar Pump, 5.2m³/h @ 67m head, 750W with AD', 'PC', 5::decimal,
  '{"power": "750W", "flow_rate": "5.2m³/h", "head": "67m", "type": "AC Submersible"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Solar Pump 4DSC7.5-100-200-1500-AD', '4DSC7.5-100-200-1500-AD',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Pumps - AC Submersible Pumps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'AC Submersible Solar Pump, 7.5m³/h @ 100m head, 1500W with AD', 'PC', 3::decimal,
  '{"power": "1500W", "flow_rate": "7.5m³/h", "head": "100m", "type": "AC Submersible"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Solar Pump 4DSC7.5-100-150-2200-AD', '4DSC7.5-100-150-2200-AD',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Pumps - AC Submersible Pumps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'AC Submersible Solar Pump, 7.5m³/h @ 100m head, 2200W with AD', 'PC', 3::decimal,
  '{"power": "2200W", "flow_rate": "7.5m³/h", "head": "100m", "type": "AC Submersible"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Solar Pump 46DSC36-56-380550-3300AD', '46DSC36-56-380550-3300AD',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Pumps - AC Submersible Pumps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'AC Submersible Solar Pump, 36m³/h @ 56m head, 3300W with AD', 'PC', 2::decimal,
  '{"power": "3300W", "flow_rate": "36m³/h", "head": "56m", "type": "AC Submersible"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Solar Pump 46DSC36-75-380500-4000AD', '46DSC36-75-380500-4000AD',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Pumps - AC Submersible Pumps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'AC Submersible Solar Pump, 36m³/h @ 75m head, 4000W with AD', 'PC', 2::decimal,
  '{"power": "4000W", "flow_rate": "36m³/h", "head": "75m", "type": "AC Submersible"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Solar Pump 6DSC36-90-380550-5000AD', '6DSC36-90-380550-5000AD',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Pumps - AC Submersible Pumps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'AC Submersible Solar Pump, 36m³/h @ 90m head, 5000W with AD', 'PC', 2::decimal,
  '{"power": "5000W", "flow_rate": "36m³/h", "head": "90m", "type": "AC Submersible"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- Solar Surface Pumps
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Solar Surface Pump 4SPW8.5-60-450-2200AD', '4SPW8.5-60-450-2200AD',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Surface Pumps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'Solar Surface Pump, 8.5m³/h @ 60m head, 2200W with AD', 'PC', 5::decimal,
  '{"power": "2200W", "flow_rate": "8.5m³/h", "head": "60m", "type": "Surface Pump"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Solar Surface Pump 4SPW14.3-34-450-2500AD', '4SPW14.3-34-450-2500AD',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Surface Pumps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'Solar Surface Pump, 14.3m³/h @ 34m head, 2500W with AD', 'PC', 3::decimal,
  '{"power": "2500W", "flow_rate": "14.3m³/h", "head": "34m", "type": "Surface Pump"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- DC Solar Pumps
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'DC Solar Pump DCPM21-14-72-750-AD', 'DCPM21-14-72-750-AD',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'DC Solar Pumps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'DC Solar Pump, 21m³/h @ 14m head, 750W with AD', 'PC', 5::decimal,
  '{"power": "750W", "voltage": "72V", "flow_rate": "21m³/h", "head": "14m", "type": "DC"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'DC Solar Pump DCPM26-15-72-1100-AD', 'DCPM26-15-72-1100-AD',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'DC Solar Pumps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'DC Solar Pump, 26m³/h @ 15m head, 1100W with AD', 'PC', 5::decimal,
  '{"power": "1100W", "voltage": "72V", "flow_rate": "26m³/h", "head": "15m", "type": "DC"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'DC Solar Pump DCMPM50-17-110-1500AD', 'DCMPM50-17-110-1500AD',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'DC Solar Pumps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'DC Solar Pump, 50m³/h @ 17m head, 1500W with AD', 'PC', 3::decimal,
  '{"power": "1500W", "voltage": "110V", "flow_rate": "50m³/h", "head": "17m", "type": "DC"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'DC Solar Pump DCMPM60-20-200-2200AD', 'DCMPM60-20-200-2200AD',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'DC Solar Pumps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'DC Solar Pump, 60m³/h @ 20m head, 2200W with AD', 'PC', 3::decimal,
  '{"power": "2200W", "voltage": "200V", "flow_rate": "60m³/h", "head": "20m", "type": "DC"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'DC Solar Pump DCMP15-14-48-550', 'DCMP15-14-48-550',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'DC Solar Pumps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'DC Solar Pump, 15m³/h @ 14m head, 550W', 'PC', 5::decimal,
  '{"power": "550W", "voltage": "48V", "flow_rate": "15m³/h", "head": "14m", "type": "DC"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'DC Solar Pump DCMP21-14-72-750', 'DCMP21-14-72-750',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'DC Solar Pumps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'DC Solar Pump, 21m³/h @ 14m head, 750W', 'PC', 5::decimal,
  '{"power": "750W", "voltage": "72V", "flow_rate": "21m³/h", "head": "14m", "type": "DC"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- Solar Controllers
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'MPPT Controller 5.5-520', 'MPPT-CTL-5.5-520',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Controllers' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'MPPT Solar Controller, 5.5kW, 520V', 'PC', 10::decimal,
  '{"type": "MPPT", "power": "5.5kW", "voltage": "520V"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Charge Controller 60A', 'CHARGE-CTL-60A',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Controllers' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'Solar Charge Controller, 60A', 'PC', 15::decimal,
  '{"type": "PWM/MPPT", "current": "60A"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Charge Controller 80A', 'CHARGE-CTL-80A',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Controllers' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'Solar Charge Controller, 80A', 'PC', 10::decimal,
  '{"type": "PWM/MPPT", "current": "80A"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- Solar Inverters
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Solar Inverter X AVIER 3', 'SOLAR-INV-XAVIER-3',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Inverters' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'Solar Inverter Xavier, 3kW', 'PC', 10::decimal,
  '{"type": "Hybrid", "power": "3kW"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Solar Inverter ARECUS 5.8', 'SOLAR-INV-ARECUS-5.8',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Inverters' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'Solar Inverter Arecus, 5.8kW', 'PC', 5::decimal,
  '{"type": "Hybrid", "power": "5.8kW"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- Batteries
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Lithium Battery 51.2V 100Ah', 'BAT-LI-51.2V-100AH',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Batteries' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'Lithium Battery, 51.2V, 100Ah capacity', 'PC', 5::decimal,
  '{"type": "LiFePO4", "voltage": "51.2V", "capacity": "100Ah"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- Solar Panels
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Solar Panel 415W', 'SP-415W',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Panels' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'Monocrystalline Solar Panel, 415W', 'PC', 20::decimal,
  '{"type": "Monocrystalline", "power": "415W"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Solar Panel 550W', 'SP-550W',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Panels' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'Monocrystalline Solar Panel, 550W', 'PC', 15::decimal,
  '{"type": "Monocrystalline", "power": "550W"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Solar Panel 585W', 'SP-585W',
  (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems'),
  (SELECT id FROM public.subcategories WHERE name = 'Solar Panels' AND category_id = (SELECT id FROM public.categories WHERE name = 'Solar & Power Systems')),
  'Monocrystalline Solar Panel, 585W', 'PC', 10::decimal,
  '{"type": "Monocrystalline", "power": "585W"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- =============================================================================
-- SECTION 4: PIPES & PLUMBING MATERIALS - SUBCATEGORIES
-- =============================================================================

INSERT INTO public.subcategories (name, category_id) 
SELECT 'HDPE Pipes', id FROM public.categories WHERE name = 'Pipes & Plumbing Materials'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'PPR Pipes', id FROM public.categories WHERE name = 'Pipes & Plumbing Materials'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'GI Pipes', id FROM public.categories WHERE name = 'Pipes & Plumbing Materials'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'PVC Hoses', id FROM public.categories WHERE name = 'Pipes & Plumbing Materials'
ON CONFLICT (name, category_id) DO NOTHING;

-- Pipes Items
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'HDPE Pipe PN16 1/2"', 'HDPE-PN16-0.5IN',
  (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'HDPE Pipes' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials')),
  'HDPE Pipe PN16, 1/2 inch diameter', 'M', 100::decimal,
  '{"material": "HDPE", "pressure": "PN16", "diameter": "1/2 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'HDPE Pipe 2"', 'HDPE-PN16-2IN',
  (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'HDPE Pipes' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials')),
  'HDPE Pipe PN16, 2 inch diameter', 'M', 100::decimal,
  '{"material": "HDPE", "pressure": "PN16", "diameter": "2 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'HDPE Pipe PN16 3"', 'HDPE-PN16-3IN',
  (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'HDPE Pipes' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials')),
  'HDPE Pipe PN16, 3 inch diameter', 'M', 50::decimal,
  '{"material": "HDPE", "pressure": "PN16", "diameter": "3 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'HDPE Pipe PN16 4"', 'HDPE-PN16-4IN',
  (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'HDPE Pipes' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials')),
  'HDPE Pipe PN16, 4 inch diameter', 'M', 50::decimal,
  '{"material": "HDPE", "pressure": "PN16", "diameter": "4 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'PPR Pipe 1"', 'PPR-1IN',
  (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'PPR Pipes' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials')),
  'PPR Pipe, 1 inch diameter', 'M', 100::decimal,
  '{"material": "PPR", "diameter": "1 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'GI Pipe 1.5"', 'GI-1.5IN',
  (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'GI Pipes' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials')),
  'Galvanized Iron Pipe, 1.5 inch diameter', 'M', 50::decimal,
  '{"material": "Galvanized Iron", "diameter": "1.5 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'GI Pipe 2"', 'GI-2IN',
  (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'GI Pipes' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials')),
  'Galvanized Iron Pipe, 2 inch diameter', 'M', 50::decimal,
  '{"material": "Galvanized Iron", "diameter": "2 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'PVC Spiral Hose 2"', 'PVC-SPIRAL-2IN',
  (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'PVC Hoses' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials')),
  'PVC Spiral Hose, 2 inch diameter', 'M', 50::decimal,
  '{"material": "PVC", "type": "Spiral", "diameter": "2 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'PVC Spiral Hose 3"', 'PVC-SPIRAL-3IN',
  (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'PVC Hoses' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipes & Plumbing Materials')),
  'PVC Spiral Hose, 3 inch diameter', 'M', 50::decimal,
  '{"material": "PVC", "type": "Spiral", "diameter": "3 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- =============================================================================
-- SECTION 5: PIPE FITTINGS & VALVES - SUBCATEGORIES
-- =============================================================================

INSERT INTO public.subcategories (name, category_id) 
SELECT 'HDPE Fittings', id FROM public.categories WHERE name = 'Pipe Fittings & Valves'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'GS Fittings', id FROM public.categories WHERE name = 'Pipe Fittings & Valves'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Flanges & Accessories', id FROM public.categories WHERE name = 'Pipe Fittings & Valves'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Valves', id FROM public.categories WHERE name = 'Pipe Fittings & Valves'
ON CONFLICT (name, category_id) DO NOTHING;

-- HDPE Fittings
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'HDPE Socket 0.75"', 'HDPE-SOCKET-0.75IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'HDPE Fittings' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'HDPE Socket Fitting, 0.75 inch', 'PC', 50::decimal,
  '{"type": "Socket", "material": "HDPE", "diameter": "0.75 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'HDPE Male Adaptor 2"', 'HDPE-MALE-ADAPTOR-2IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'HDPE Fittings' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'HDPE Male Adaptor, 2 inch', 'PC', 30::decimal,
  '{"type": "Male Adaptor", "material": "HDPE", "diameter": "2 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'HDPE Male Adaptor 3"', 'HDPE-MALE-ADAPTOR-3IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'HDPE Fittings' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'HDPE Male Adaptor, 3 inch', 'PC', 30::decimal,
  '{"type": "Male Adaptor", "material": "HDPE", "diameter": "3 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'HDPE Female Adaptor 1.5"', 'HDPE-FEMALE-ADAPTOR-1.5IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'HDPE Fittings' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'HDPE Female Adaptor, 1.5 inch', 'PC', 30::decimal,
  '{"type": "Female Adaptor", "material": "HDPE", "diameter": "1.5 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'HDPE Female Adaptor 3"', 'HDPE-FEMALE-ADAPTOR-3IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'HDPE Fittings' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'HDPE Female Adaptor, 3 inch', 'PC', 30::decimal,
  '{"type": "Female Adaptor", "material": "HDPE", "diameter": "3 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'HDPE Tee 2"', 'HDPE-TEE-2IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'HDPE Fittings' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'HDPE Tee Fitting, 2 inch', 'PC', 30::decimal,
  '{"type": "Tee", "material": "HDPE", "diameter": "2 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'HDPE Elbow 3"', 'HDPE-ELBOW-3IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'HDPE Fittings' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'HDPE Elbow Fitting, 3 inch', 'PC', 30::decimal,
  '{"type": "Elbow", "material": "HDPE", "diameter": "3 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'HDPE Ball Valve 2"', 'HDPE-BALL-VALVE-2IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'HDPE Fittings' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'HDPE Ball Valve, 2 inch', 'PC', 20::decimal,
  '{"type": "Ball Valve", "material": "HDPE", "diameter": "2 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'HDPE Ball Valve 3"', 'HDPE-BALL-VALVE-3IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'HDPE Fittings' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'HDPE Ball Valve, 3 inch', 'PC', 20::decimal,
  '{"type": "Ball Valve", "material": "HDPE", "diameter": "3 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- GS Fittings
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'GS Elbow 1"', 'GS-ELBOW-1IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'GS Fittings' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'Galvanized Steel Elbow, 1 inch', 'PC', 30::decimal,
  '{"type": "Elbow", "material": "Galvanized Steel", "diameter": "1 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'GS Elbow 1/2"', 'GS-ELBOW-0.5IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'GS Fittings' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'Galvanized Steel Elbow, 1/2 inch', 'PC', 50::decimal,
  '{"type": "Elbow", "material": "Galvanized Steel", "diameter": "1/2 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'GS Union 1"', 'GS-UNION-1IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'GS Fittings' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'Galvanized Steel Union, 1 inch', 'PC', 30::decimal,
  '{"type": "Union", "material": "Galvanized Steel", "diameter": "1 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'GS Nipple 2"', 'GS-NIPPLE-2IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'GS Fittings' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'Galvanized Steel Nipple, 2 inch', 'PC', 30::decimal,
  '{"type": "Nipple", "material": "Galvanized Steel", "diameter": "2 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'GS Reducer', 'GS-REDUCER',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'GS Fittings' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'Galvanized Steel Reducer', 'PC', 20::decimal,
  '{"type": "Reducer", "material": "Galvanized Steel"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- Flanges & Accessories
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Flange 2"', 'FLANGE-2IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'Flanges & Accessories' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'Flange, 2 inch', 'PC', 20::decimal,
  '{"type": "Flange", "diameter": "2 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Flange 2.5"', 'FLANGE-2.5IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'Flanges & Accessories' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'Flange, 2.5 inch', 'PC', 20::decimal,
  '{"type": "Flange", "diameter": "2.5 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Flange 3"', 'FLANGE-3IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'Flanges & Accessories' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'Flange, 3 inch', 'PC', 20::decimal,
  '{"type": "Flange", "diameter": "3 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Flange Gate Valve 6"', 'FLANGE-GATE-6IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'Flanges & Accessories' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'Flange Gate Valve, 6 inch', 'PC', 10::decimal,
  '{"type": "Gate Valve", "diameter": "6 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Flange Gasket 2"', 'FLANGE-GASKET-2IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'Flanges & Accessories' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'Flange Gasket, 2 inch', 'PC', 50::decimal,
  '{"type": "Gasket", "diameter": "2 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- Valves
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Foot Valve 3"', 'FOOT-VALVE-3IN',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'Valves' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'Foot Valve, 3 inch', 'PC', 15::decimal,
  '{"type": "Foot Valve", "diameter": "3 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'HDPE Ball Valve', 'HDPE-BALL-VALVE',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'Valves' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'HDPE Ball Valve', 'PC', 20::decimal,
  '{"type": "Ball Valve", "material": "HDPE"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Flange Gate Valve', 'FLANGE-GATE-VALVE',
  (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves'),
  (SELECT id FROM public.subcategories WHERE name = 'Valves' AND category_id = (SELECT id FROM public.categories WHERE name = 'Pipe Fittings & Valves')),
  'Flange Gate Valve', 'PC', 10::decimal,
  '{"type": "Gate Valve"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- =============================================================================
-- SECTION 6: STRUCTURAL STEEL & METAL - SUBCATEGORIES
-- =============================================================================

INSERT INTO public.subcategories (name, category_id) 
SELECT 'RHS', id FROM public.categories WHERE name = 'Structural Steel & Metal'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'GI RHS', id FROM public.categories WHERE name = 'Structural Steel & Metal'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'SHS', id FROM public.categories WHERE name = 'Structural Steel & Metal'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'GI SHS', id FROM public.categories WHERE name = 'Structural Steel & Metal'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Reinforcement Steel', id FROM public.categories WHERE name = 'Structural Steel & Metal'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Steel Bars & Channels', id FROM public.categories WHERE name = 'Structural Steel & Metal'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Aluminum Sheet', id FROM public.categories WHERE name = 'Structural Steel & Metal'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Rolled Metals', id FROM public.categories WHERE name = 'Structural Steel & Metal'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Roofing & Metal Sheets', id FROM public.categories WHERE name = 'Structural Steel & Metal'
ON CONFLICT (name, category_id) DO NOTHING;

-- Structural Steel Items
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'RHS 40x20', 'RHS-40X20',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'RHS' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Rectangular Hollow Section, 40x20mm', 'M', 50::decimal,
  '{"type": "RHS", "dimensions": "40x20mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'RHS 60x40', 'RHS-60X40',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'RHS' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Rectangular Hollow Section, 60x40mm', 'M', 50::decimal,
  '{"type": "RHS", "dimensions": "60x40mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'GI RHS 40x40', 'GI-RHS-40X40',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'GI RHS' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Galvanized Rectangular Hollow Section, 40x40mm', 'M', 50::decimal,
  '{"type": "GI RHS", "dimensions": "40x40mm", "coating": "Galvanized"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'GI RHS 30x30', 'GI-RHS-30X30',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'GI RHS' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Galvanized Rectangular Hollow Section, 30x30mm', 'M', 50::decimal,
  '{"type": "GI RHS", "dimensions": "30x30mm", "coating": "Galvanized"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'SHS 20x20', 'SHS-20X20',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'SHS' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Square Hollow Section, 20x20mm', 'M', 100::decimal,
  '{"type": "SHS", "dimensions": "20x20mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'SHS 25x25', 'SHS-25X25',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'SHS' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Square Hollow Section, 25x25mm', 'M', 100::decimal,
  '{"type": "SHS", "dimensions": "25x25mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'SHS 30x30', 'SHS-30X30',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'SHS' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Square Hollow Section, 30x30mm', 'M', 100::decimal,
  '{"type": "SHS", "dimensions": "30x30mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'SHS 40x40', 'SHS-40X40',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'SHS' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Square Hollow Section, 40x40mm', 'M', 50::decimal,
  '{"type": "SHS", "dimensions": "40x40mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'SHS 60x60', 'SHS-60X60',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'SHS' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Square Hollow Section, 60x60mm', 'M', 50::decimal,
  '{"type": "SHS", "dimensions": "60x60mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'GI SHS 40x40', 'GI-SHS-40X40',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'GI SHS' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Galvanized Square Hollow Section, 40x40mm', 'M', 50::decimal,
  '{"type": "GI SHS", "dimensions": "40x40mm", "coating": "Galvanized"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Rebar 8mm', 'REBAR-8MM',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Reinforcement Steel' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Reinforcement Bar, 8mm diameter', 'M', 500::decimal,
  '{"type": "Rebar", "diameter": "8mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Rebar 10mm', 'REBAR-10MM',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Reinforcement Steel' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Reinforcement Bar, 10mm diameter', 'M', 500::decimal,
  '{"type": "Rebar", "diameter": "10mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Rebar 12mm', 'REBAR-12MM',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Reinforcement Steel' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Reinforcement Bar, 12mm diameter', 'M', 500::decimal,
  '{"type": "Rebar", "diameter": "12mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Rebar 14mm', 'REBAR-14MM',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Reinforcement Steel' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Reinforcement Bar, 14mm diameter', 'M', 300::decimal,
  '{"type": "Rebar", "diameter": "14mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Rebar 16mm', 'REBAR-16MM',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Reinforcement Steel' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Reinforcement Bar, 16mm diameter', 'M', 300::decimal,
  '{"type": "Rebar", "diameter": "16mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'U Channel 80x45', 'U-CHANNEL-80X45',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Steel Bars & Channels' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'U Channel, 80x45mm', 'M', 50::decimal,
  '{"type": "U Channel", "dimensions": "80x45mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Flat Bar 30x4mm', 'FLAT-BAR-30X4',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Steel Bars & Channels' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Flat Bar, 30x4mm', 'M', 100::decimal,
  '{"type": "Flat Bar", "dimensions": "30x4mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Aluminum Sheet 2mm', 'ALU-SHEET-2MM',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Aluminum Sheet' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Aluminum Sheet, 2mm thickness', 'SHT', 30::decimal,
  '{"material": "Aluminum", "thickness": "2mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Aluminum Sheet 3mm', 'ALU-SHEET-3MM',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Aluminum Sheet' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Aluminum Sheet, 3mm thickness', 'SHT', 30::decimal,
  '{"material": "Aluminum", "thickness": "3mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Aluminum Sheet 4mm', 'ALU-SHEET-4MM',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Aluminum Sheet' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Aluminum Sheet, 4mm thickness', 'SHT', 30::decimal,
  '{"material": "Aluminum", "thickness": "4mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Cold Rolled Metal 0.45mm', 'CRM-0.45MM',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Rolled Metals' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Cold Rolled Metal Sheet, 0.45mm', 'SHT', 50::decimal,
  '{"type": "Cold Rolled", "thickness": "0.45mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Cold Rolled Metal 0.6mm', 'CRM-0.6MM',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Rolled Metals' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Cold Rolled Metal Sheet, 0.6mm', 'SHT', 50::decimal,
  '{"type": "Cold Rolled", "thickness": "0.6mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Cold Rolled Metal 0.7mm', 'CRM-0.7MM',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Rolled Metals' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Cold Rolled Metal Sheet, 0.7mm', 'SHT', 50::decimal,
  '{"type": "Cold Rolled", "thickness": "0.7mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Hot Rolled Metal 0.85mm', 'HRM-0.85MM',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Rolled Metals' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Hot Rolled Metal Sheet, 0.85mm', 'SHT', 50::decimal,
  '{"type": "Hot Rolled", "thickness": "0.85mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Hot Rolled Metal 0.95mm', 'HRM-0.95MM',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Rolled Metals' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Hot Rolled Metal Sheet, 0.95mm', 'SHT', 50::decimal,
  '{"type": "Hot Rolled", "thickness": "0.95mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Hot Rolled Metal 1.4mm', 'HRM-1.4MM',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Rolled Metals' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Hot Rolled Metal Sheet, 1.4mm', 'SHT', 30::decimal,
  '{"type": "Hot Rolled", "thickness": "1.4mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Hot Rolled Metal 1.8mm', 'HRM-1.8MM',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Rolled Metals' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Hot Rolled Metal Sheet, 1.8mm', 'SHT', 30::decimal,
  '{"type": "Hot Rolled", "thickness": "1.8mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Korkor 35 Gauge', 'KORKOR-35G',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Roofing & Metal Sheets' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Korkor Roofing Sheet, 35 Gauge', 'SHT', 100::decimal,
  '{"type": "Korkor", "gauge": "35"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Gutter', 'GUTTER',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Roofing & Metal Sheets' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Gutter System', 'M', 50::decimal,
  '{"type": "Gutter"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Flashing', 'FLASHING',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Roofing & Metal Sheets' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'Roofing Flashing', 'M', 50::decimal,
  '{"type": "Flashing"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'EGA 500 0.32', 'EGA-500-0.32',
  (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal'),
  (SELECT id FROM public.subcategories WHERE name = 'Roofing & Metal Sheets' AND category_id = (SELECT id FROM public.categories WHERE name = 'Structural Steel & Metal')),
  'EGA 500 Metal Sheet, 0.32mm', 'SHT', 50::decimal,
  '{"type": "EGA 500", "thickness": "0.32mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- =============================================================================
-- SECTION 7: TOOLS & HARDWARE - SUBCATEGORIES
-- =============================================================================

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Cutting & Installation Tools', id FROM public.categories WHERE name = 'Tools & Hardware'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Fasteners & Clamps', id FROM public.categories WHERE name = 'Tools & Hardware'
ON CONFLICT (name, category_id) DO NOTHING;

-- Tools Items
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Cutting Disk', 'CUTTING-DISK',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Cutting & Installation Tools' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Metal Cutting Disk', 'PC', 100::decimal,
  '{"type": "Cutting Disk"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Pipe Cutter', 'PIPE-CUTTER',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Cutting & Installation Tools' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Pipe Cutting Tool', 'PC', 10::decimal,
  '{"type": "Pipe Cutter"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Soldering Iron', 'SOLDERING-IRON',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Cutting & Installation Tools' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Soldering Iron Tool', 'PC', 10::decimal,
  '{"type": "Soldering Iron"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Sand Paper', 'SAND-PAPER',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Cutting & Installation Tools' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Sand Paper Sheet', 'PC', 100::decimal,
  '{"type": "Sand Paper"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Paint Brush', 'PAINT-BRUSH',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Cutting & Installation Tools' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Paint Brush', 'PC', 30::decimal,
  '{"type": "Paint Brush"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Three Wing Bit 5"', 'THREE-WING-BIT-5IN',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Cutting & Installation Tools' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Three Wing Drill Bit, 5 inch', 'PC', 20::decimal,
  '{"type": "Drill Bit", "size": "5 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Three Wing Bit 6.5"', 'THREE-WING-BIT-6.5IN',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Cutting & Installation Tools' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Three Wing Drill Bit, 6.5 inch', 'PC', 20::decimal,
  '{"type": "Drill Bit", "size": "6.5 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Three Cone Bit 6.5"', 'THREE-CONE-BIT-6.5IN',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Cutting & Installation Tools' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Tri-Cone Drill Bit, 6.5 inch', 'PC', 15::decimal,
  '{"type": "Drill Bit", "size": "6.5 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Tri-Cone Bit 8"', 'TRI-CONE-BIT-8IN',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Cutting & Installation Tools' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Tri-Cone Drill Bit, 8 inch', 'PC', 10::decimal,
  '{"type": "Drill Bit", "size": "8 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Drag Bit 10"', 'DRAG-BIT-10IN',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Cutting & Installation Tools' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Drag Drill Bit, 10 inch', 'PC', 10::decimal,
  '{"type": "Drill Bit", "size": "10 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Tangustun 10"', 'TANGUSTUN-10IN',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Cutting & Installation Tools' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Tangustun Tool, 10 inch', 'PC', 10::decimal,
  '{"type": "Tangustun"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Steel Clamp', 'STEEL-CLAMP',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Fasteners & Clamps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Steel Clamp', 'PC', 100::decimal,
  '{"type": "Clamp", "material": "Steel"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Steel Fasheta', 'STEEL-FASHETA',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Fasteners & Clamps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Steel Fasheta Fastener', 'PC', 100::decimal,
  '{"type": "Fastener", "material": "Steel"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Cable Tie', 'CABLE-TIE',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Fasteners & Clamps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Cable Tie', 'PC', 500::decimal,
  '{"type": "Cable Tie"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Mismar (Nails)', 'MISMAR',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Fasteners & Clamps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Mismar Nails', 'KG', 50::decimal,
  '{"type": "Nails"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Stainless Steel Connector L', 'SS-CONNECTOR-L',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Fasteners & Clamps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Stainless Steel L-Connector', 'PC', 50::decimal,
  '{"type": "Connector", "shape": "L", "material": "Stainless Steel"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Stainless Steel Connector T', 'SS-CONNECTOR-T',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Fasteners & Clamps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Stainless Steel T-Connector', 'PC', 50::decimal,
  '{"type": "Connector", "shape": "T", "material": "Stainless Steel"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Stainless Steel Connector Z', 'SS-CONNECTOR-Z',
  (SELECT id FROM public.categories WHERE name = 'Tools & Hardware'),
  (SELECT id FROM public.subcategories WHERE name = 'Fasteners & Clamps' AND category_id = (SELECT id FROM public.categories WHERE name = 'Tools & Hardware')),
  'Stainless Steel Z-Connector', 'PC', 50::decimal,
  '{"type": "Connector", "shape": "Z", "material": "Stainless Steel"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- =============================================================================
-- SECTION 8: ELECTRICAL MATERIALS - SUBCATEGORIES
-- =============================================================================

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Cables', id FROM public.categories WHERE name = 'Electrical Materials'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Electrical Protection', id FROM public.categories WHERE name = 'Electrical Materials'
ON CONFLICT (name, category_id) DO NOTHING;

-- Electrical Items
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Electric Cable 1x2.5', 'CABLE-1X2.5',
  (SELECT id FROM public.categories WHERE name = 'Electrical Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Cables' AND category_id = (SELECT id FROM public.categories WHERE name = 'Electrical Materials')),
  'Electric Cable, 1x2.5mm²', 'M', 500::decimal,
  '{"type": "Electric Cable", "size": "1x2.5mm²"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Electric Cable 1x16', 'CABLE-1X16',
  (SELECT id FROM public.categories WHERE name = 'Electrical Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Cables' AND category_id = (SELECT id FROM public.categories WHERE name = 'Electrical Materials')),
  'Electric Cable, 1x16mm²', 'M', 300::decimal,
  '{"type": "Electric Cable", "size": "1x16mm²"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Electric Cable 2x4', 'CABLE-2X4',
  (SELECT id FROM public.categories WHERE name = 'Electrical Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Cables' AND category_id = (SELECT id FROM public.categories WHERE name = 'Electrical Materials')),
  'Electric Cable, 2x4mm²', 'M', 400::decimal,
  '{"type": "Electric Cable", "size": "2x4mm²"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Electric Cable 2x6', 'CABLE-2X6',
  (SELECT id FROM public.categories WHERE name = 'Electrical Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Cables' AND category_id = (SELECT id FROM public.categories WHERE name = 'Electrical Materials')),
  'Electric Cable, 2x6mm²', 'M', 300::decimal,
  '{"type": "Electric Cable", "size": "2x6mm²"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Pump Cable 3x4mm', 'CABLE-PUMP-3X4',
  (SELECT id FROM public.categories WHERE name = 'Electrical Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Cables' AND category_id = (SELECT id FROM public.categories WHERE name = 'Electrical Materials')),
  'Pump Cable, 3x4mm²', 'M', 300::decimal,
  '{"type": "Pump Cable", "size": "3x4mm²"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Sensor Cable', 'CABLE-SENSOR',
  (SELECT id FROM public.categories WHERE name = 'Electrical Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Cables' AND category_id = (SELECT id FROM public.categories WHERE name = 'Electrical Materials')),
  'Sensor Cable', 'M', 200::decimal,
  '{"type": "Sensor Cable"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'AC Breaker 2P 32A', 'BREAKER-AC-2P-32A',
  (SELECT id FROM public.categories WHERE name = 'Electrical Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Electrical Protection' AND category_id = (SELECT id FROM public.categories WHERE name = 'Electrical Materials')),
  'AC Circuit Breaker, 2 Pole, 32A', 'PC', 30::decimal,
  '{"type": "Circuit Breaker", "poles": "2P", "current": "32A"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Fuse 32A', 'FUSE-32A',
  (SELECT id FROM public.categories WHERE name = 'Electrical Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Electrical Protection' AND category_id = (SELECT id FROM public.categories WHERE name = 'Electrical Materials')),
  'Electrical Fuse, 32A', 'PC', 50::decimal,
  '{"type": "Fuse", "current": "32A"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Fuse Holder 32A', 'FUSE-HOLDER-32A',
  (SELECT id FROM public.categories WHERE name = 'Electrical Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Electrical Protection' AND category_id = (SELECT id FROM public.categories WHERE name = 'Electrical Materials')),
  'Fuse Holder, 32A', 'PC', 30::decimal,
  '{"type": "Fuse Holder", "current": "32A"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Cable Gland 13.5', 'CABLE-GLAND-13.5',
  (SELECT id FROM public.categories WHERE name = 'Electrical Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Electrical Protection' AND category_id = (SELECT id FROM public.categories WHERE name = 'Electrical Materials')),
  'Cable Gland, 13.5mm', 'PC', 50::decimal,
  '{"type": "Cable Gland", "size": "13.5mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- =============================================================================
-- SECTION 9: CONSTRUCTION & CIVIL MATERIALS - SUBCATEGORIES
-- =============================================================================

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Construction Materials', id FROM public.categories WHERE name = 'Construction & Civil Materials'
ON CONFLICT (name, category_id) DO NOTHING;

-- Construction Items
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Cement', 'CEMENT',
  (SELECT id FROM public.categories WHERE name = 'Construction & Civil Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Construction Materials' AND category_id = (SELECT id FROM public.categories WHERE name = 'Construction & Civil Materials')),
  'Ordinary Portland Cement', 'BAG', 100::decimal,
  '{"type": "Cement"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Gabion 2.5mm', 'GABION-2.5MM',
  (SELECT id FROM public.categories WHERE name = 'Construction & Civil Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Construction Materials' AND category_id = (SELECT id FROM public.categories WHERE name = 'Construction & Civil Materials')),
  'Gabion Mesh, 2.5mm wire', 'SHT', 30::decimal,
  '{"type": "Gabion", "wire_thickness": "2.5mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Water Filter', 'WATER-FILTER',
  (SELECT id FROM public.categories WHERE name = 'Construction & Civil Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Construction Materials' AND category_id = (SELECT id FROM public.categories WHERE name = 'Construction & Civil Materials')),
  'Water Filter', 'PC', 20::decimal,
  '{"type": "Water Filter"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Silicone', 'SILICONE',
  (SELECT id FROM public.categories WHERE name = 'Construction & Civil Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Construction Materials' AND category_id = (SELECT id FROM public.categories WHERE name = 'Construction & Civil Materials')),
  'Silicone Sealant', 'PC', 30::decimal,
  '{"type": "Silicone"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- =============================================================================
-- SECTION 10: WELL & BOREHOLE MATERIALS - SUBCATEGORIES
-- =============================================================================

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Well Casing', id FROM public.categories WHERE name = 'Well & Borehole Materials'
ON CONFLICT (name, category_id) DO NOTHING;

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Well Accessories', id FROM public.categories WHERE name = 'Well & Borehole Materials'
ON CONFLICT (name, category_id) DO NOTHING;

-- Well Items
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Well Casing Blind 6"', 'WELL-CASING-BLIND-6IN',
  (SELECT id FROM public.categories WHERE name = 'Well & Borehole Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Well Casing' AND category_id = (SELECT id FROM public.categories WHERE name = 'Well & Borehole Materials')),
  'Well Casing Blind Pipe, 6 inch', 'M', 50::decimal,
  '{"type": "Blind Casing", "diameter": "6 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Well Casing 6m', 'WELL-CASING-6M',
  (SELECT id FROM public.categories WHERE name = 'Well & Borehole Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Well Casing' AND category_id = (SELECT id FROM public.categories WHERE name = 'Well & Borehole Materials')),
  'Well Casing Pipe, 6 meter length', 'PC', 30::decimal,
  '{"type": "Well Casing", "length": "6m"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Well Casing 3"', 'WELL-CASING-3IN',
  (SELECT id FROM public.categories WHERE name = 'Well & Borehole Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Well Casing' AND category_id = (SELECT id FROM public.categories WHERE name = 'Well & Borehole Materials')),
  'Well Casing Pipe, 3 inch', 'M', 50::decimal,
  '{"type": "Well Casing", "diameter": "3 inch"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Riser Steel Wire 8mm', 'RISER-WIRE-8MM',
  (SELECT id FROM public.categories WHERE name = 'Well & Borehole Materials'),
  (SELECT id FROM public.subcategories WHERE name = 'Well Accessories' AND category_id = (SELECT id FROM public.categories WHERE name = 'Well & Borehole Materials')),
  'Riser Steel Wire, 8mm', 'M', 100::decimal,
  '{"type": "Riser Wire", "diameter": "8mm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- =============================================================================
-- SECTION 11: SAFETY & PPE - SUBCATEGORIES
-- =============================================================================

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Personal Protective Equipment', id FROM public.categories WHERE name = 'Safety & PPE'
ON CONFLICT (name, category_id) DO NOTHING;

-- Safety Items
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Reflective Jacket', 'REFLECTIVE-JACKET',
  (SELECT id FROM public.categories WHERE name = 'Safety & PPE'),
  (SELECT id FROM public.subcategories WHERE name = 'Personal Protective Equipment' AND category_id = (SELECT id FROM public.categories WHERE name = 'Safety & PPE')),
  'High-Visibility Reflective Jacket', 'PC', 30::decimal,
  '{"type": "Safety Vest", "feature": "Reflective"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- =============================================================================
-- SECTION 12: ENCLOSURES & CONTROL - SUBCATEGORIES
-- =============================================================================

INSERT INTO public.subcategories (name, category_id) 
SELECT 'Control Boxes', id FROM public.categories WHERE name = 'Enclosures & Control'
ON CONFLICT (name, category_id) DO NOTHING;

-- Enclosure Items
INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Control Box 50x40x20', 'CONTROL-BOX-50X40X20',
  (SELECT id FROM public.categories WHERE name = 'Enclosures & Control'),
  (SELECT id FROM public.subcategories WHERE name = 'Control Boxes' AND category_id = (SELECT id FROM public.categories WHERE name = 'Enclosures & Control')),
  'Control Box Enclosure, 50x40x20cm', 'PC', 15::decimal,
  '{"type": "Control Box", "dimensions": "50x40x20cm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

INSERT INTO public.items (name, sku, category_id, subcategory_id, description, uom, low_stock_threshold, parameters)
SELECT 'Control Box 60x40x20', 'CONTROL-BOX-60X40X20',
  (SELECT id FROM public.categories WHERE name = 'Enclosures & Control'),
  (SELECT id FROM public.subcategories WHERE name = 'Control Boxes' AND category_id = (SELECT id FROM public.categories WHERE name = 'Enclosures & Control')),
  'Control Box Enclosure, 60x40x20cm', 'PC', 10::decimal,
  '{"type": "Control Box", "dimensions": "60x40x20cm"}'::jsonb
ON CONFLICT (sku) DO NOTHING;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- SELECT 'Categories' as table_name, COUNT(*) as count FROM public.categories
-- UNION ALL
-- SELECT 'Subcategories', COUNT(*) FROM public.subcategories
-- UNION ALL
-- SELECT 'Items', COUNT(*) FROM public.items;
