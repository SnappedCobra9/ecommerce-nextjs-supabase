# — Documentación completa del proyecto

## 1. Qué es esto

Proyecto de portafolio: e-commerce de calzado con catálogo dinámico,
detalle de producto con configurador de variantes (material, color o
estampado, talla, altura de tacón), carrito simulado, y una sección de
exploración de materiales/colores. Pensado para mostrar arquitectura
completa (frontend + base de datos relacional + lógica de generación
automática de inventario), no para operar como tienda real todavía
(no hay checkout ni pagos).

## 2. Stack técnico

- **Next.js 14 (Pages Router)** + React 18
- **Supabase** (PostgreSQL gestionado) como backend de datos, vía `@supabase/supabase-js`
- **CSS Modules** (sin librería de UI externa)
- Despliegue objetivo: **Vercel**
- Carrito: estado en React + `localStorage` (sin backend de checkout)

## 3. Estructura de carpetas

```
/pages
  _app.js              -> layout raíz: envuelve todo en CartProvider + Header + CartDrawer
  index.js              -> home / catálogo (getServerSideProps)
  personalizacion.js    -> explorador de materiales/colores (getServerSideProps)
  esencia.js             -> página de ejemplo/vitrina (estática)
  comunidad.js            -> página de ejemplo/vitrina (estática)
  tallas.js                -> página de ejemplo/vitrina (estática)
  /products/[id].js      -> detalle de producto + configurador (getServerSideProps)
/components
  Header.js              -> nav superior, TIENDA apunta a "/"
  CartDrawer.js           -> panel lateral del carrito
/context
  CartContext.js          -> estado global del carrito (localStorage)
/lib
  supabaseClient.js       -> cliente único de Supabase (usa variables de entorno)
/styles
  globals.css, home.module.css, product.module.css, header.module.css,
  cartDrawer.module.css, personalizacion.module.css, examplePage.module.css
/sql
  schema.sql                     -> CREATE TABLE completo (solo para proyecto Supabase VACÍO)
  migration_existing_db.sql      -> migración para una base YA EXISTENTE (con estructura original)
  seed_test_data.sql             -> reset total + 4 productos de prueba con variantes generadas
  more_variants_and_hero_images.sql -> agrega más combinaciones + imágenes reales + banner hero
  rls_public_read.sql            -> políticas de Row Level Security (lectura pública)
  generate_variants.sql          -> la función sola, documentada aparte
.env.example / .env.local (no versionado)
package.json / .gitignore
```

## 4. Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

Van en `.env.local` (no se sube a git, está en `.gitignore`). En Vercel se
configuran en Settings → Environment Variables, mismos nombres.

La `ANON_KEY` es pública por diseño (Supabase espera que viaje al
navegador); la seguridad real la dan las políticas de RLS, no el
secreto de esa key.

## 5. Base de datos: esquema completo

### 5.1 Tablas CORE (consultadas directo por el frontend)

| Tabla | Propósito |
|---|---|
| `producttypes` | Categorías (ej. Sandalias, Botines) |
| `products` | Catálogo base: nombre, precio, tipo, imagen general |
| `materials` | Materiales disponibles (piel, gamuza, print, etc.) |
| `color_types` | Agrupación de colores (ej. Neutros, Vivos) |
| `colors` | Colores disponibles — **debe existir una fila `'Ninguno'`** |
| `prints` | Estampados disponibles — **debe existir una fila `'Ninguno'`** |
| `sizes` | Tallas disponibles |
| `heels` | Alturas de tacón disponibles |
| `variants` | Cada combinación real vendible de un producto (ver §6) |
| `images` | Fotos por variante, con `is_main` y `position` (ver §7) |
| `asset_types` | Categoriza banners (`home-hero`, `color-del-mes`) |
| `media_assets` | Banners del hero y destacado de "Color del Mes" |

### 5.2 Tablas de REGLAS DE NEGOCIO (no las consulta el frontend directo)

Definen qué combinaciones son válidas por producto. Las llena el
administrador de datos, y alimentan la función `generate_variants()`:

`product_materials`, `product_colors`, `product_prints`,
`product_sizes`, `product_heels` — cada una es una tabla puente
`product_id` + `xxx_id`.

### 5.3 Tablas reservadas para futuro (documentadas, sin uso actual)

`users`, `carts`, `cart_items`, `orders`, `order_items` — pensadas
para un checkout real con autenticación. El carrito actual es 100%
client-side (`localStorage`), no las toca. Se conservan en el schema
como documentación del diseño completo del sistema.

### 5.4 Tablas eliminadas del diseño original (sin uso en ningún flujo)

`straps`, `strap_colors`, `soles`, `product_straps`,
`product_strap_colors`, `product_soles`, `reviews`, `review_images`.

También se quitaron de `variants` las columnas `strap_id`,
`strap_color_id`, `sole_id`, `variant_number` (dependían de las
tablas eliminadas).

## 6. Generación automática de variantes

`variants` tiene un `UNIQUE (product_id, material_id, color_id,
print_id, size_id, heel_id)`. La función `generate_variants(product_id)`:

1. Lee las 4 tablas de reglas (`product_materials`, `product_colors` o
   `product_prints`, `product_sizes`, `product_heels`) para ese producto.
2. Distingue materiales "print" de materiales normales buscando
   `%print%` / `%estampado%` en `materials.name_m` (frágil: si nombras
   un material print de otra forma, no lo va a detectar — es un punto
   a mejorar si escala el catálogo real, cambiando a una columna
   booleana explícita `is_print`).
3. Inserta combinaciones nuevas con `ON CONFLICT DO NOTHING` — no
   duplica, y las variantes existentes conservan su `id`, `quantity`
   e imágenes.
4. Borra las variantes que dejaron de cumplir alguna regla vigente,
   limpiando sus imágenes asociadas.
5. **Seguro**: si `product_materials`, `product_sizes` o
   `product_heels` están vacías para ese producto, la función aborta
   con error en vez de continuar — evita que un vaciado accidental de
   esas tablas borre todo el inventario existente.

Uso: `SELECT generate_variants(id);` por producto, cada vez que
cambian sus reglas.

`variants.color_id` y `variants.print_id` son ambos `NOT NULL`
aunque un producto solo use uno de los dos atributos. Por eso existen
las filas placeholder `'Ninguno'` en `colors` y `prints`: se usan
como valor cuando ese atributo no aplica (ej. un material de piel usa
`print_id` = id de "Ninguno").

## 7. Criterio de imágenes (único en todo el proyecto)

- `images.is_main` (booleano) → decide cuál es la foto de portada de
  una variante. Hay un índice único parcial que impide dos `true` en
  la misma variante.
- `images.position` (entero) → decide el orden del resto de fotos en
  la galería.
- En el detalle de producto, la galería se ordena: `is_main` primero,
  luego `position` ascendente.
- `products.main_img` / `products.hover_img` son independientes: solo
  para la tarjeta del catálogo, no dependen de variante.

## 8. Row Level Security (RLS)

Supabase activa RLS por defecto; sin políticas, todas las consultas
devuelven vacío sin error visible. `sql/rls_public_read.sql` agrega
políticas de **solo lectura pública** (`SELECT USING (true)`) en las
12 tablas core — ninguna política de escritura, así que la
`anon key` nunca puede insertar/modificar/borrar nada.

## 9. Lógica de frontend relevante

- **`pages/index.js`**: categorías + productos activos + banners de
  `media_assets` (secciones `Banner1`/`Banner2` para el hero,
  `Color del Mes` para el destacado). El filtro "Color del Mes" busca
  variantes cuyo color coincida con `media_assets.button_label`.
- **`pages/products/[id].js`**: flujo guiado Material → Color/Print →
  Talla → Tacón. Resuelve la variante exacta en cada paso; si no
  existe esa combinación en inventario, deshabilita "Añadir al
  Carrito" con el mensaje "Combinación No Disponible".
- **`context/CartContext.js`**: `addItem` distingue por
  `variant_id` + `product_id` juntos (evita fusionar variantes de
  productos distintos que compartan `variant_id` por error de datos).
  Persiste en `localStorage`.
- **`components/CartDrawer.js`**: usa `item.name` (no
  `item.variant.product.name` — bug corregido) y
  `item.variant.images.find(is_main)` para la foto del carrito.

## 10. Fuera de alcance (a propósito)

- Checkout real, autenticación de usuarios, pasarela de pago.
- Persistencia de pedidos en base de datos.
- Reseñas de comunidad reales.
- Guía de tallas interactiva real (página estática de ejemplo).


## 11. Datos de prueba actuales

Cargados vía `sql/seed_test_data.sql` +
`sql/more_variants_and_hero_images.sql`:
- 4 productos ("Stiletto Aurora", "Botín Eclipse", "Sandalia Luna",
  "Zapatilla Nova" — este último usa material print).
- Reglas ampliadas por producto → decenas de variantes por producto
  (combinatoria de color/talla/tacón).
- Imágenes reales aleatorias vía `picsum.photos` con seed fijo por
  `variant_id`/`product_id` (mismo seed = misma foto siempre).
- Banners del hero y "Color del Mes" ya cargados en `media_assets`.

## 12. Cómo levantar el proyecto en cualquier entorno nuevo

```bash
npm install
cp .env.example .env.local   # completar con credenciales reales de Supabase
npm run dev
```

En Supabase (proyecto nuevo): correr en orden
`sql/schema.sql` → `sql/rls_public_read.sql` → cargar datos reales o
`sql/seed_test_data.sql` para pruebas.

En una base ya existente con la estructura original: usar
`sql/migration_existing_db.sql` en vez de `schema.sql`.

## 13. Pendientes / mejoras futuras conocidas

- Detección de material "print" por nombre de texto — cambiar a
  columna booleana `is_print` si el catálogo crece.
- No hay validación de `quantity` real al añadir al carrito (no
  bloquea agregar más unidades de las que hay en stock).
- Bucket de Supabase Storage para fotos reales de producto (hoy son
  placeholders de `picsum.photos`) — configurar como público.
- Si se implementa el checkout real, activar las tablas ya
  documentadas (`users`, `carts`, `orders`) y agregar políticas RLS
  de escritura con autenticación.
