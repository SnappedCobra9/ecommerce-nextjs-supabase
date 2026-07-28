-- ==========================================================
-- LINA HEELS · Schema de base de datos (PostgreSQL / Supabase)
-- ==========================================================
-- Este archivo documenta el esquema final tras la limpieza del proyecto.
-- Las tablas se agrupan en 3 categorías:
--   1. CORE      -> catálogo, variantes e imágenes (usadas por la app)
--   2. REGLAS    -> definen qué combinaciones son válidas por producto,
--                   y alimentan la función sql/generate_variants.sql
--   3. FUTURO    -> reservadas para un checkout real (no implementado
--                   en esta demo; el carrito actual vive en localStorage)
-- ==========================================================


-- ====================== 1. CORE ==============================

CREATE TABLE public.producttypes (
  id integer GENERATED ALWAYS AS IDENTITY,
  type_name character varying NOT NULL,
  CONSTRAINT producttypes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.products (
  id integer GENERATED ALWAYS AS IDENTITY,
  name character varying NOT NULL,
  price numeric NOT NULL,
  type_id integer NOT NULL,
  active boolean DEFAULT true,
  description text,
  main_img text,
  hover_img text,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT product_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.producttypes(id)
);

CREATE TABLE public.materials (
  id integer GENERATED ALWAYS AS IDENTITY,
  name_m character varying NOT NULL,
  img_m text,
  description text,
  CONSTRAINT materials_pkey PRIMARY KEY (id)
);

CREATE TABLE public.color_types (
  id integer GENERATED ALWAYS AS IDENTITY,
  type_color character varying NOT NULL,
  CONSTRAINT color_types_pkey PRIMARY KEY (id)
);

CREATE TABLE public.colors (
  id integer GENERATED ALWAYS AS IDENTITY,
  color_name character varying NOT NULL,
  img_c character varying,
  color_type integer,
  CONSTRAINT colors_pkey PRIMARY KEY (id),
  CONSTRAINT colors_color_type_fkey FOREIGN KEY (color_type) REFERENCES public.color_types(id)
);
-- NOTA: debe existir una fila con color_name = 'Ninguno'.
-- La usa generate_variants() como placeholder cuando el material es
-- de tipo "print" (esas variantes no usan color, usan print).

CREATE TABLE public.prints (
  id integer GENERATED ALWAYS AS IDENTITY,
  name_print character varying NOT NULL,
  img_p character varying,
  CONSTRAINT prints_pkey PRIMARY KEY (id)
);
-- NOTA: debe existir una fila con name_print = 'Ninguno', usada como
-- placeholder en variantes de materiales que sí usan color (no print).

CREATE TABLE public.sizes (
  id integer GENERATED ALWAYS AS IDENTITY,
  size_value character varying NOT NULL,
  CONSTRAINT sizes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.heels (
  id integer GENERATED ALWAYS AS IDENTITY,
  height_value character varying,
  img_h text,
  CONSTRAINT heels_pkey PRIMARY KEY (id)
);

CREATE TABLE public.variants (
  id integer GENERATED ALWAYS AS IDENTITY,
  product_id integer NOT NULL,
  color_id integer NOT NULL,
  size_id integer NOT NULL,
  material_id integer NOT NULL,
  print_id integer NOT NULL,
  heel_id integer,
  quantity integer NOT NULL DEFAULT 0,
  CONSTRAINT variants_pkey PRIMARY KEY (id),
  CONSTRAINT variant_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT variant_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id),
  CONSTRAINT variant_size_id_fkey FOREIGN KEY (size_id) REFERENCES public.sizes(id),
  CONSTRAINT variant_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id),
  CONSTRAINT variant_print_id_fkey FOREIGN KEY (print_id) REFERENCES public.prints(id),
  CONSTRAINT variants_heel_id_fkey FOREIGN KEY (heel_id) REFERENCES public.heels(id),
  -- Constraint clave: permite que generate_variants() use ON CONFLICT
  -- para insertar solo combinaciones nuevas, sin duplicar ni resetear
  -- el inventario (quantity) de variantes que ya existían.
  CONSTRAINT variants_unique_combo UNIQUE (product_id, material_id, color_id, print_id, size_id, heel_id)
);

CREATE TABLE public.images (
  id integer GENERATED ALWAYS AS IDENTITY,
  variant_id integer NOT NULL,
  img_url text NOT NULL,
  position integer DEFAULT 0,   -- controla el ORDEN de las fotos en la galería
  is_main boolean DEFAULT false, -- único criterio para la foto "de portada" de la variante
  CONSTRAINT images_pkey PRIMARY KEY (id),
  CONSTRAINT image_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id)
);

-- Evita que dos fotos de la MISMA variante queden marcadas como is_main
-- a la vez (el índice solo aplica a filas donde is_main = true, así que
-- puede haber muchas filas con is_main = false sin problema).
CREATE UNIQUE INDEX images_one_main_per_variant
  ON public.images (variant_id)
  WHERE is_main = true;

CREATE TABLE public.asset_types (
  id integer GENERATED ALWAYS AS IDENTITY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  CONSTRAINT asset_types_pkey PRIMARY KEY (id)
);

CREATE TABLE public.media_assets (
  id integer GENERATED ALWAYS AS IDENTITY,
  type_id integer,
  seccion text,          -- ej. 'Banner1', 'Banner2', 'Color del Mes'
  button_label text,     -- para 'Color del Mes' contiene el color_name a resaltar
  image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  CONSTRAINT media_assets_pkey PRIMARY KEY (id),
  CONSTRAINT media_assets_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.asset_types(id)
);


-- ====================== 2. REGLAS DE NEGOCIO ==============================
-- Definen qué materiales/colores/prints/tallas/tacones están permitidos
-- para CADA producto. Se llenan a mano y luego alimentan
-- sql/generate_variants.sql, que sincroniza la tabla `variants`.

CREATE TABLE public.product_materials (
  id integer GENERATED ALWAYS AS IDENTITY,
  product_id integer,
  material_id integer,
  CONSTRAINT product_materials_pkey PRIMARY KEY (id),
  CONSTRAINT product_materials_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_materials_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id)
);

CREATE TABLE public.product_colors (
  id integer GENERATED ALWAYS AS IDENTITY,
  product_id integer,
  color_id integer,
  CONSTRAINT product_colors_pkey PRIMARY KEY (id),
  CONSTRAINT product_colors_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_colors_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id)
);

CREATE TABLE public.product_prints (
  id integer GENERATED ALWAYS AS IDENTITY,
  product_id integer,
  print_id integer,
  CONSTRAINT product_prints_pkey PRIMARY KEY (id),
  CONSTRAINT product_prints_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_prints_print_id_fkey FOREIGN KEY (print_id) REFERENCES public.prints(id)
);

CREATE TABLE public.product_sizes (
  id integer GENERATED ALWAYS AS IDENTITY,
  product_id integer,
  size_id integer,
  CONSTRAINT product_sizes_pkey PRIMARY KEY (id),
  CONSTRAINT product_sizes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_sizes_size_id_fkey FOREIGN KEY (size_id) REFERENCES public.sizes(id)
);

CREATE TABLE public.product_heels (
  id integer GENERATED ALWAYS AS IDENTITY,
  product_id integer,
  heel_id integer,
  CONSTRAINT product_heels_pkey PRIMARY KEY (id),
  CONSTRAINT product_heels_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_heels_heel_id_fkey FOREIGN KEY (heel_id) REFERENCES public.heels(id)
);


-- ====================== 3. FUERA DE ALCANCE (FUTURO) ======================
-- Estas tablas existen para documentar el roadmap de un checkout real,
-- pero NO se usan en el código de esta demo: el carrito actual es
-- puramente client-side (localStorage, ver context/CartContext.js).
-- Se dejan aquí para mostrar el diseño completo del sistema, no para
-- que se implementen en esta fase del proyecto.

CREATE TABLE public.users (
  id integer GENERATED ALWAYS AS IDENTITY,
  email character varying NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name character varying,
  role character varying DEFAULT 'customer',
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.carts (
  id integer GENERATED ALWAYS AS IDENTITY,
  user_id integer,
  status character varying DEFAULT 'active',
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT carts_pkey PRIMARY KEY (id),
  CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.cart_items (
  id integer GENERATED ALWAYS AS IDENTITY,
  cart_id integer,
  variant_id integer,
  quantity integer NOT NULL,
  price_snapshot numeric NOT NULL,
  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id),
  CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id)
);

CREATE TABLE public.orders (
  id integer GENERATED ALWAYS AS IDENTITY,
  user_id integer,
  cart_id integer,
  status character varying DEFAULT 'pending',
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT orders_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id)
);

CREATE TABLE public.order_items (
  id integer GENERATED ALWAYS AS IDENTITY,
  order_id integer,
  variant_id integer,
  quantity integer NOT NULL,
  price_snapshot numeric NOT NULL,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id)
);

-- ==========================================================
-- Tablas eliminadas respecto al schema original (sin uso en ningún
-- flujo de la app ni en el roadmap documentado): straps, strap_colors,
-- soles, product_straps, product_strap_colors, product_soles,
-- reviews, review_images.
-- ==========================================================
