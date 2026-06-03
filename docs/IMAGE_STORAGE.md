# Almacenamiento de imagenes de producto

Todas las fotos de producto (N3D, subidas, AI) viven en **Supabase Storage**, bucket `product-images` (publico).

Solo assets estaticos del sitio quedan en `public/` (p. ej. `public/images/studio/default.jpg`).

## Estructura del bucket

```text
product-images/
  {slug}/n3d/render.webp      ← render N3D (una por slug, protegida)
  {slug}/uploads/{imageId}.*  ← busqueda web / subida manual
  {slug}/ai/{imageId}.*       ← candidatos generados por IA
```

En base de datos, `ProductImage.imagePath` es siempre la **URL publica** de Supabase.

## Codigo

- `lib/product-image-storage.ts` — `putN3dRender`, `putUploadImage`, `putAiImage`, `deleteStoredProductImage`, clasificacion de rutas.
- `lib/static-public-assets.ts` — `publicPathExists` solo para `/images/studio/` etc.

## Sync N3D (parcial)

Por producto, sube el render a Storage:

```bash
npm run sync:n3d-image -- 0001-bulbasaur
```

El sync masivo N3D → Postgres se reimplementara sin ficheros JSON en `data/`.
