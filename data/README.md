# Datos del proyecto

El catálogo, el backlog y las imágenes viven en **Postgres** (Supabase) y **Supabase Storage**.

Los JSON de catálogo (`products.json`, `backlog.json`, etc.) se eliminaron.

## Scripts relacionados

| Script | Estado |
|--------|--------|
| `npm run sync:n3d-image -- <slug>` | Sube el render N3D de un producto a `{slug}/n3d/` en Storage |
| Sync completo N3D → BD | Pendiente (antes escribía `products.json`) |
