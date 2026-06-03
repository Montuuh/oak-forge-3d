# SOP — Revision de imagenes AI (Oak's Forge 3D)

## Objetivo

Publicar en el catalogo solo fotos lifestyle **generadas por IA** que parezcan impresiones 3D reales. No usar renders de N3D ni fotos descargadas del API en el sitio publico.

## Alcance piloto

Los productos del piloto estan definidos en `data/ai-image-queue.json` (generar con `npm run ai:queue:pilot`). Filtra por *Solo piloto* en `/admin/products` o abre la ficha `/admin/products/[slug]`.

## Flujo

1. **Generar** — En la ficha del producto (`/admin/products/[slug]`), seccion *Imagenes AI*, pulsa *Generar candidato AI* (maximo 5 candidatos activos por producto: candidato + aprobada).
2. **Revisar** — Comprueba que la pieza parece impresion PLA real, sin logos, texto ni copia de fotos existentes.
3. **Aprobar** — Una sola imagen aprobada por producto. Al aprobar otra, la anterior pasa a *rechazada* automaticamente.
4. **Rechazar** — El candidato queda archivado; puedes volver a aprobarlo mas tarde.
5. **Visibilidad** — En la ficha de producto, activa *Visible en catalogo* (unico criterio en BD para el catalogo publico).
6. **Exportar** — `npm run catalog:export` y desplegar. Sin imagen principal: el sitio muestra **PND**.

## Sincronizacion (dual write)

Cada aprobacion o rechazo relevante actualiza:

- Postgres: `ProductImage`, `Product.primaryImageId`
- `data/products.json` (campo `ai_asset`, `image_path`)
- `data/ai-image-queue.json` (estado y candidatos)

El sitio publico **no** lee la base de datos; solo `data/catalog-public.json` tras export.

## Almacenamiento

Las imagenes aprobadas viven en Supabase Storage (bucket `product-images`). La URL publica se guarda en `ProductImage.imagePath`.

## Criterios de rechazo (guia)

- Parece render CAD o imagen de catalogo de terceros
- Texto, marca o watermark visible
- Objeto irreconocible respecto al nombre del producto
- Iluminacion o escena poco creible para una foto de estanteria

## Variables de entorno

Ver `.env.local.example`: `ADMIN_REVIEWER_NAME`, `SUPABASE_*`, `GEMINI_API_KEY` (Google AI Studio).
