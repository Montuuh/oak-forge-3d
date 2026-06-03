# Supabase Storage — bucket de imagenes de producto

El plan gratuito incluye **1 GB** de almacenamiento, suficiente para cientos de imagenes (~1–2 MB cada una).

## 1. Crear bucket publico

En el [panel de Supabase](https://supabase.com/dashboard) → **Storage** → **New bucket**:

- Name: `product-images`
- Public bucket: **on**

O ejecuta en SQL Editor:

```sql
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;
```

## 2. Claves en `.env.local`

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret
SUPABASE_STORAGE_BUCKET=product-images
```

La **service role** solo se usa en el servidor (rutas `/api/admin/images/*`). No la expongas en el cliente.

## 3. Bucket privado (error habitual)

Si en admin la tarjeta aparece vacia pero en BD hay URL de Supabase, el bucket suele estar **privado**. El codigo intenta hacerlo publico al subir.

En el panel: Storage → `product-images` → **Make public**.

## 4. Verificar

Tras generar un candidato en `/admin/products/{slug}`, deberias ver la miniatura. En Storage:  
`product-images/{slug}/{imageId}.png` (Imagen devuelve PNG). El admin usa `/api/admin/images/serve?id=...` para previsualizar con sesion admin.

## 5. Catalogo publico

`next.config.mjs` permite imagenes desde `*.supabase.co`. Las URLs viven en `ProductImage.imagePath` en Postgres y el sitio las usa al renderizar.
