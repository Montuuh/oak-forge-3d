# Datos del proyecto

El catalogo y las imagenes viven en **Postgres** (Supabase) y **Supabase Storage**.

Los ficheros JSON que habia aqui (`products.json`, `catalog-public.json`, `blocklist.json`) se eliminaron.

## Scripts relacionados

| Script | Estado |
|--------|--------|
| `npm run sync:n3d-image -- <slug>` | Sube el render N3D de un producto a `{slug}/n3d/` en Storage |
| Sync completo N3D → BD | Pendiente (antes escribia `products.json`) |
