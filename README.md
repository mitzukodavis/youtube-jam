# YouTube Jam

Aplicación Next.js con salas compartidas, cola de reproducción y carga masiva de enlaces de YouTube.

## 1. Supabase
1. Crea un proyecto gratuito en https://supabase.com.
2. Abre **SQL Editor**, pega `supabase/setup.sql` y ejecuta el script.
3. Ve a **Project Settings > API** (o **Connect**) y copia la URL del proyecto y la clave pública `anon` / `publishable`.

## 2. Vercel
1. Sube esta carpeta a un repositorio de GitHub.
2. En https://vercel.com selecciona **Add New > Project**, importa el repositorio y selecciona Next.js.
3. En **Environment Variables** añade:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave pública de Supabase
4. Pulsa **Deploy**.

## 3. Local
`npm install` y `npm run dev` (con `.env.local` creado a partir de `.env.example`).

## Notas
- Este proyecto es una **demo abierta**: cualquier usuario que conozca una sala puede cambiar su lista. Las políticas SQL permiten lectura/escritura públicas. Para producción, añade autenticación, permisos por sala, límites de inserción y rate limiting.
- La sincronización es aproximada (eventos en tiempo real + sondeo cada 3 segundos), no de precisión milimétrica.
- El navegador puede bloquear el autoplay con sonido hasta que el usuario interactúe.
- YouTube puede bloquear videos incrustados, mostrar anuncios o limitar su reproducción.
- Para simplificar, el campo de título usa el ID del video. Se puede ampliar con YouTube Data API/oEmbed.
- La carga masiva acepta enlaces individuales, no expande automáticamente una URL de playlist de YouTube; eso requeriría integrar YouTube Data API con una clave protegida en el servidor.
- El orden concurrente puede necesitar resolución de conflictos si muchas personas editan simultáneamente.
