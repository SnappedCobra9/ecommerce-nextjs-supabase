-- Requiere respaldo previo: incluye DROP TABLE sobre datos existentes.

INSERT INTO colors (color_name)
SELECT 'Ninguno'
WHERE NOT EXISTS (SELECT 1 FROM colors WHERE color_name = 'Ninguno');

INSERT INTO prints (name_print)
SELECT 'Ninguno'
WHERE NOT EXISTS (SELECT 1 FROM prints WHERE name_print = 'Ninguno');

ALTER TABLE public.variants DROP CONSTRAINT IF EXISTS variants_strap_id_fkey;
ALTER TABLE public.variants DROP CONSTRAINT IF EXISTS variants_strap_color_id_fkey;
ALTER TABLE public.variants DROP CONSTRAINT IF EXISTS variants_sole_id_fkey;

ALTER TABLE public.variants DROP COLUMN IF EXISTS strap_id;
ALTER TABLE public.variants DROP COLUMN IF EXISTS strap_color_id;
ALTER TABLE public.variants DROP COLUMN IF EXISTS sole_id;
ALTER TABLE public.variants DROP COLUMN IF EXISTS variant_number;

-- Permite ON CONFLICT en generate_variants() para no duplicar variantes
-- ni resetear inventario existente.
ALTER TABLE public.variants
  ADD CONSTRAINT variants_unique_combo
  UNIQUE (product_id, material_id, color_id, print_id, size_id, heel_id);

-- Evita dos fotos is_main = true en la misma variante.
CREATE UNIQUE INDEX IF NOT EXISTS images_one_main_per_variant
  ON public.images (variant_id)
  WHERE is_main = true;

DROP TABLE IF EXISTS public.product_straps;
DROP TABLE IF EXISTS public.product_strap_colors;
DROP TABLE IF EXISTS public.product_soles;
DROP TABLE IF EXISTS public.straps;
DROP TABLE IF EXISTS public.strap_colors;
DROP TABLE IF EXISTS public.soles;

DROP TABLE IF EXISTS public.review_images;
DROP TABLE IF EXISTS public.reviews;

-- users, carts, cart_items, orders, order_items se conservan:
-- reservadas para un futuro checkout, sin uso en la app actual.

CREATE OR REPLACE FUNCTION generate_variants(p_product_id integer)
RETURNS void AS $$
DECLARE
  none_color_id integer;
  none_print_id integer;
BEGIN
  SELECT id INTO none_color_id FROM colors WHERE color_name = 'Ninguno';
  SELECT id INTO none_print_id FROM prints WHERE name_print = 'Ninguno';

  IF none_color_id IS NULL OR none_print_id IS NULL THEN
    RAISE EXCEPTION 'Faltan las filas placeholder "Ninguno" en colors/prints';
  END IF;

  -- Evita que reglas vacías por error borren variantes existentes:
  -- sin esto, la fase de limpieza interpretaría "cero reglas" como
  -- "ninguna variante es válida" y eliminaría todo el inventario.
  IF NOT EXISTS (SELECT 1 FROM product_materials WHERE product_id = p_product_id) THEN
    RAISE EXCEPTION 'product_materials está vacío para product_id = %', p_product_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM product_sizes WHERE product_id = p_product_id) THEN
    RAISE EXCEPTION 'product_sizes está vacío para product_id = %', p_product_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM product_heels WHERE product_id = p_product_id) THEN
    RAISE EXCEPTION 'product_heels está vacío para product_id = %', p_product_id;
  END IF;

  INSERT INTO variants (product_id, material_id, color_id, print_id, size_id, heel_id, quantity)
  SELECT p_product_id, pm.material_id, pc.color_id, none_print_id, ps.size_id, ph.heel_id, 0
  FROM product_materials pm
  JOIN materials m
    ON m.id = pm.material_id
   AND m.name_m NOT ILIKE '%print%' AND m.name_m NOT ILIKE '%estampado%'
  JOIN product_colors pc ON pc.product_id = p_product_id
  JOIN product_sizes  ps ON ps.product_id = p_product_id
  JOIN product_heels  ph ON ph.product_id = p_product_id
  WHERE pm.product_id = p_product_id
  ON CONFLICT ON CONSTRAINT variants_unique_combo DO NOTHING;

  INSERT INTO variants (product_id, material_id, color_id, print_id, size_id, heel_id, quantity)
  SELECT p_product_id, pm.material_id, none_color_id, pp.print_id, ps.size_id, ph.heel_id, 0
  FROM product_materials pm
  JOIN materials m
    ON m.id = pm.material_id
   AND (m.name_m ILIKE '%print%' OR m.name_m ILIKE '%estampado%')
  JOIN product_prints pp ON pp.product_id = p_product_id
  JOIN product_sizes  ps ON ps.product_id = p_product_id
  JOIN product_heels  ph ON ph.product_id = p_product_id
  WHERE pm.product_id = p_product_id
  ON CONFLICT ON CONSTRAINT variants_unique_combo DO NOTHING;

  DELETE FROM images
  WHERE variant_id IN (
    SELECT v.id FROM variants v
    WHERE v.product_id = p_product_id
    AND (
      NOT EXISTS (SELECT 1 FROM product_materials pm WHERE pm.product_id = v.product_id AND pm.material_id = v.material_id)
      OR (v.color_id <> none_color_id AND NOT EXISTS (SELECT 1 FROM product_colors pc WHERE pc.product_id = v.product_id AND pc.color_id = v.color_id))
      OR (v.print_id <> none_print_id AND NOT EXISTS (SELECT 1 FROM product_prints pp WHERE pp.product_id = v.product_id AND pp.print_id = v.print_id))
      OR NOT EXISTS (SELECT 1 FROM product_sizes ps WHERE ps.product_id = v.product_id AND ps.size_id = v.size_id)
      OR NOT EXISTS (SELECT 1 FROM product_heels ph WHERE ph.product_id = v.product_id AND ph.heel_id = v.heel_id)
    )
  );

  DELETE FROM variants v
  WHERE v.product_id = p_product_id
  AND (
    NOT EXISTS (SELECT 1 FROM product_materials pm WHERE pm.product_id = v.product_id AND pm.material_id = v.material_id)
    OR (v.color_id <> none_color_id AND NOT EXISTS (SELECT 1 FROM product_colors pc WHERE pc.product_id = v.product_id AND pc.color_id = v.color_id))
    OR (v.print_id <> none_print_id AND NOT EXISTS (SELECT 1 FROM product_prints pp WHERE pp.product_id = v.product_id AND pp.print_id = v.print_id))
    OR NOT EXISTS (SELECT 1 FROM product_sizes ps WHERE ps.product_id = v.product_id AND ps.size_id = v.size_id)
    OR NOT EXISTS (SELECT 1 FROM product_heels ph WHERE ph.product_id = v.product_id AND ph.heel_id = v.heel_id)
  );

END;
$$ LANGUAGE plpgsql;
