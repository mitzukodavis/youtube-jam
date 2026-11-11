# YouTube Jam — Render

App Next.js para salas compartidas de videos YouTube. Puedes pegar varios enlaces (uno por línea). No importa automáticamente playlists mediante un solo enlace.

## 1. Base de datos
Crea un proyecto en https://supabase.com, abre SQL Editor y ejecuta `supabase/setup.sql`. Copia la URL y la clave pública anon/publishable. **No uses la service_role key**.

## 2. Subir a GitHub
Sube el **contenido de esta carpeta** a la raíz de un repositorio GitHub. Debes ver `package.json` y `render.yaml` directamente en la raíz. No subas el ZIP cerrado.

## 3. Render
En https://dashboard.render.com selecciona New > Web Service y conecta tu repositorio GitHub. Si Render detecta `render.yaml`, también puedes elegir New > Blueprint.

Configuración manual:
- Runtime: Node
- Build Command: `npm install && npm run build`
- Start Command: `npm run start -- -H 0.0.0.0 -p $PORT`
- Instance: Free (si está disponible)
- Environment Variables: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los valores de Supabase. **Configúralas antes de compilar**, pues Next.js las integra en el frontend durante el build.

Haz Deploy Web Service. Render asignará una URL `*.onrender.com`. En plan Free puede haber demoras de arranque tras inactividad.

## Limitaciones
- Demo pública: cualquier persona con el código de sala puede editarla; las políticas SQL son abiertas. No guardar información privada.
- La sincronización es aproximada, con polling de 3 segundos.
- YouTube puede bloquear videos incrustados y el navegador puede exigir interacción antes del autoplay con sonido.
- Puedes pegar múltiples enlaces de videos, pero una URL de playlist no se expande automáticamente.
