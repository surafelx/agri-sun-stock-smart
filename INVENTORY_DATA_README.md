# Inventory Data Population Script

## Overview
This document describes the SQL migration script `20260213040000_populate_inventory_data.sql` that populates the database with the complete inventory data.

## Database Structure

### Categories (10 Main Categories)
1. **Solar & Power Systems** - Solar pumps, controllers, inverters, batteries, panels
2. **Pipes & Plumbing Materials** - HDPE, PPR, GI, PVC pipes and hoses
3. **Pipe Fittings & Valves** - HDPE fittings, galvanized steel fittings, flanges, valves
4. **Structural Steel & Metal** - RHS, SHS, reinforcement steel, rolled metals, roofing
5. **Tools & Hardware** - Cutting tools, fasteners, drill bits
6. **Electrical Materials** - Cables, circuit breakers, fuses, protection devices
7. **Construction & Civil Materials** - Cement, gabion, water filters, silicone
8. **Well & Borehole Materials** - Well casing, riser wires
9. **Safety & PPE** - Reflective jackets, safety equipment
10. **Enclosures & Control** - Control boxes

### SKU Generation Rules
SKUs are generated based on the following patterns:
- Solar Pumps: `DSC` or `SPW` or `DCPM` prefix + specifications
- Solar Controllers: `MPPT-CTL` or `CHARGE-CTL` prefix
- Solar Inverters: `SOLAR-INV` prefix
- Batteries: `BAT-LI` prefix
- Solar Panels: `SP-` prefix (watts)
- Pipes: Material-PN-Diameter format
- Fittings: Material-Type-Diameter format
- Steel: Type-Dimensions format
- Electrical: Cable type and size format

## Usage

### Running the Migration
```bash
# Using Supabase CLI
supabase db push

# Or via SQL editor in Supabase dashboard
# Copy and paste the migration file content
```

### Verification Queries
```sql
-- Check categories count
SELECT COUNT(*) FROM public.categories; -- Should return 10

-- Check subcategories count
SELECT COUNT(*) FROM public.subcategories; -- Should return 31

-- Check items count
SELECT COUNT(*) FROM public.items; -- Should return 153

-- View all items grouped by category
SELECT 
  c.name as category,
  s.name as subcategory,
  COUNT(i.id) as item_count
FROM public.categories c
LEFT JOIN public.subcategories s ON s.category_id = c.id
LEFT JOIN public.items i ON i.subcategory_id = s.id
GROUP BY c.name, s.name
ORDER BY c.name, s.name;
```

## Data Summary

| Category | Subcategories | Items |
|----------|--------------|-------|
| Solar & Power Systems | 7 | 24 |
| Pipes & Plumbing Materials | 4 | 9 |
| Pipe Fittings & Valves | 4 | 20 |
| Structural Steel & Metal | 9 | 36 |
| Tools & Hardware | 2 | 18 |
| Electrical Materials | 2 | 10 |
| Construction & Civil Materials | 2 | 4 |
| Well & Borehole Materials | 2 | 4 |
| Safety & PPE | 1 | 1 |
| Enclosures & Control | 1 | 2 |
| **Total** | **31** | **128** |

## Notes
- All items include descriptive `parameters` in JSONB format for flexible filtering
- Low stock thresholds are set based on typical usage patterns
- Items use `ON CONFLICT (sku) DO NOTHING` to prevent duplicates on re-run
- Unit of Measure (UOM) codes: PC (Piece), M (Meter), KG (Kilogram), SHT (Sheet), BAG (Bag)

## Update History
- **2026-02-13**: Initial population script created
