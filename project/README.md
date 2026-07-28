# — Catálogo y configurador de producto

Tienda de calzado construida con Next.js (Pages Router) y Supabase
(PostgreSQL). Incluye un catálogo filtrable por categoría, un
configurador de producto que resuelve variantes reales de inventario
(material, color/estampado, talla, altura de tacón), y un carrito de
compra funcional. El esquema de base de datos separa datos de
catálogo, reglas de negocio y una función SQL que genera
automáticamente las combinaciones válidas de cada producto sin
duplicar inventario existente.

## Stack

- Next.js (Pages Router) + React
- Supabase / PostgreSQL como backend de datos
- CSS Modules (sin librerías de UI externas)
- Despliegue objetivo: Vercel

## Alcance funcional

- **`/`** — Catálogo: productos filtrados por categoría.
- **`/products/[id]`** — Detalle de producto: selector guiado de
  material → color/estampado → talla → altura de tacón, que resuelve
  la variante exacta disponible en inventario y arma la galería de
  imágenes correspondiente.
- **`/personalizacion`** — Explorador de materiales y colores/estampados
  disponibles por material (usa las mismas reglas de negocio del
  configurador de producto).
- **Carrito** — Estado en React + persistencia en `localStorage`
  (`context/CartContext.js`). No hay backend de checkout: es una
  simulación de carrito, no una pasarela de pago real.
- **`/esencia`, `/comunidad`, `/tallas`** — Páginas de ejemplo/vitrina.
  Muestran cómo se vería la arquitectura completa del sitio, pero su
  contenido es estático y no está conectado a datos reales. Cada una
  explica en pantalla qué reemplazaría ese contenido en producción.

## Fuera de alcance (a propósito)

Estas piezas existen en el esquema de base de datos como documentación
del diseño completo del sistema, pero **no están implementadas** en
esta demo:

- **Checkout real, autenticación de usuarios y persistencia de pedidos**
  (`users`, `carts`, `cart_items`, `orders`, `order_items`). El carrito
  actual es 100% client-side; conectar estas tablas requeriría rutas de
  API, validación de sesión y un flujo de pago, lo cual es una siguiente
  fase de proyecto.
- **Reseñas de comunidad** (`reviews`, `review_images`) y **guía de
  tallas interactiva**: representadas como páginas de ejemplo, sin
  fetch real a la base de datos.

## Estructura de la base de datos

El esquema completo está en [`sql/schema.sql`](./sql/schema.sql), agrupado en:

1. **Core** — `producttypes`, `products`, `materials`, `colors`,
   `color_types`, `prints`, `sizes`, `heels`, `variants`, `images`,
   `asset_types`, `media_assets`. Estas son las tablas que consulta
   directamente el frontend.
2. **Reglas de negocio** — `product_materials`, `product_colors`,
   `product_prints`, `product_sizes`, `product_heels`. Definen qué
   combinaciones son válidas *por producto*. No las consulta el
   frontend directamente: alimentan la función de generación de
   variantes (ver abajo).
3. **Futuro (documentadas, no implementadas)** — `users`, `carts`,
   `cart_items`, `orders`, `order_items`.

### Generación automática de variantes

En vez de crear manualmente cada fila de `variants`, el flujo de
trabajo es:

1. Llenar las tablas de reglas de negocio para un producto
   (qué materiales, colores, tallas y alturas de tacón aplican).
2. Ejecutar `SELECT generate_variants(product_id);` — ver
   [`sql/generate_variants.sql`](./sql/generate_variants.sql).

La función:
- Agrega solo las combinaciones nuevas permitidas (no duplica,
  gracias a una restricción `UNIQUE` sobre la combinación de atributos).
- No toca variantes existentes que siguen siendo válidas: conservan su
  `id`, su inventario (`quantity`) e imágenes asociadas.
- Elimina únicamente las variantes que dejaron de cumplir alguna regla
  vigente (por ejemplo, si quitas un color de `product_colors`),
  limpiando también sus imágenes para no dejar registros huérfanos.
- **Seguro de borrado accidental**: si `product_materials`,
  `product_sizes` o `product_heels` están vacías para el producto, la
  función aborta con un error en vez de continuar. Sin este chequeo,
  un vaciado accidental de esas tablas (una prueba, un `DELETE` mal
  filtrado) haría que la función interprete que ninguna variante
  existente es válida y borre todo el inventario e imágenes del
  producto.

Además, `images` tiene un índice único parcial que impide marcar dos
fotos como `is_main = true` en la misma variante.

## Imágenes de variante

Cada variante puede tener varias fotos en la tabla `images`. Se usa un
único criterio en todo el proyecto:

- `is_main` (booleano): decide cuál es la foto de portada de la variante.
- `position` (entero): decide el orden del resto de fotos en la galería.

## Setup

1. Clona el repositorio e instala dependencias:
   ```bash
   npm install
   ```
2. Copia `.env.example` a `.env.local` y coloca tus credenciales de Supabase:
   ```bash
   cp .env.example .env.local
   ```
3. Crea el esquema en tu proyecto de Supabase ejecutando, en este orden:
   - `sql/schema.sql` (proyecto nuevo) o `sql/migration_existing_db.sql` (base ya existente)
   - `sql/rls_public_read.sql` (políticas de lectura pública, requeridas para que el frontend vea datos)
   - Opcional, solo para pruebas: `sql/seed_test_data.sql` seguido de `sql/more_variants_and_hero_images.sql`
4. Corre el proyecto localmente:
   ```bash
   npm run dev
   ```
5. Despliega en Vercel conectando el repositorio y configurando las
   mismas variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) en el panel del proyecto.

## Estructura de carpetas

```
/pages
  _app.js
  index.js
  personalizacion.js
  esencia.js
  comunidad.js
  tallas.js
  /products/[id].js
/components
  Header.js
  CartDrawer.js
/context
  CartContext.js
/lib
  supabaseClient.js
/styles
  (CSS Modules por página/componente)
/sql
  schema.sql
  migration_existing_db.sql
  rls_public_read.sql
  generate_variants.sql
  seed_test_data.sql
  more_variants_and_hero_images.sql
PROJECT_OVERVIEW.md
```
