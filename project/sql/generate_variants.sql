-- ==========================================================
-- generate_variants(product_id)
-- ==========================================================
-- Sincroniza la tabla `variants` de UN producto según lo permitido
-- por las tablas de reglas (product_materials, product_colors,
-- product_prints, product_sizes, product_heels).
--
-- Comportamiento:
--   - AGREGA combinaciones nuevas que las reglas ahora permiten y que
--     todavía no existen (no duplica, gracias a variants_unique_combo).
--   - NO TOCA combinaciones existentes que siguen siendo válidas:
--     conservan su id, su quantity (inventario real) y sus imágenes.
--   - BORRA únicamente lo que ya no cumple ninguna regla vigente
--     (ej. quitaste un material de product_materials para ese producto),
--     y limpia sus imágenes asociadas para no dejar huérfanas.
--
-- Requisito previo (una sola vez):
--   INSERT INTO colors (color_name) VALUES ('Ninguno');
--   INSERT INTO prints (name_print) VALUES ('Ninguno');
--
-- Uso:
--   SELECT generate_variants(5);   -- regenera solo el producto 5
-- ==========================================================

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

  -- SEGURO: si product_materials está vacío para este producto, aborta
  -- en vez de continuar. Sin este chequeo, la fase de limpieza de más
  -- abajo interpretaría "cero reglas" como "ninguna variante existente
  -- es válida" y borraría TODO el inventario e imágenes del producto,
  -- incluso si el vacío fue un error de carga de datos.
  IF NOT EXISTS (SELECT 1 FROM product_materials WHERE product_id = p_product_id) THEN
    RAISE EXCEPTION 'product_materials está vacío para product_id = %. Abortando para no borrar variantes existentes por accidente.', p_product_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM product_sizes WHERE product_id = p_product_id) THEN
    RAISE EXCEPTION 'product_sizes está vacío para product_id = %. Abortando para no borrar variantes existentes por accidente.', p_product_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM product_heels WHERE product_id = p_product_id) THEN
    RAISE EXCEPTION 'product_heels está vacío para product_id = %. Abortando para no borrar variantes existentes por accidente.', p_product_id;
  END IF;

  -- 1a. INSERTAR combinaciones nuevas para materiales NO-print
  --     (usan color real, print = "Ninguno")
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

  -- 1b. INSERTAR combinaciones nuevas para el material print
  --     (usan print real, color = "Ninguno")
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

  -- 2. LIMPIEZA: borrar solo lo que ya no cumple ninguna regla vigente.
  --    Se valida material, y color/print según corresponda, contra las
  --    tablas de reglas actuales de este producto.
  DELETE FROM images
  WHERE variant_id IN (
    SELECT v.id FROM variants v
    WHERE v.product_id = p_product_id
    AND (
      NOT EXISTS (
        SELECT 1 FROM product_materials pm
        WHERE pm.product_id = v.product_id AND pm.material_id = v.material_id
      )
      OR (v.color_id <> none_color_id AND NOT EXISTS (
        SELECT 1 FROM product_colors pc
        WHERE pc.product_id = v.product_id AND pc.color_id = v.color_id
      ))
      OR (v.print_id <> none_print_id AND NOT EXISTS (
        SELECT 1 FROM product_prints pp
        WHERE pp.product_id = v.product_id AND pp.print_id = v.print_id
      ))
      OR NOT EXISTS (
        SELECT 1 FROM product_sizes ps
        WHERE ps.product_id = v.product_id AND ps.size_id = v.size_id
      )
      OR NOT EXISTS (
        SELECT 1 FROM product_heels ph
        WHERE ph.product_id = v.product_id AND ph.heel_id = v.heel_id
      )
    )
  );

  DELETE FROM variants v
  WHERE v.product_id = p_product_id
  AND (
    NOT EXISTS (
      SELECT 1 FROM product_materials pm
      WHERE pm.product_id = v.product_id AND pm.material_id = v.material_id
    )
    OR (v.color_id <> none_color_id AND NOT EXISTS (
      SELECT 1 FROM product_colors pc
      WHERE pc.product_id = v.product_id AND pc.color_id = v.color_id
    ))
    OR (v.print_id <> none_print_id AND NOT EXISTS (
      SELECT 1 FROM product_prints pp
      WHERE pp.product_id = v.product_id AND pp.print_id = v.print_id
    ))
    OR NOT EXISTS (
      SELECT 1 FROM product_sizes ps
      WHERE ps.product_id = v.product_id AND ps.size_id = v.size_id
    )
    OR NOT EXISTS (
      SELECT 1 FROM product_heels ph
      WHERE ph.product_id = v.product_id AND ph.heel_id = v.heel_id
    )
  );

END;
$$ LANGUAGE plpgsql;
