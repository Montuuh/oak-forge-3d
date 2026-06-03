# Imagenes AI via Vertex AI (experimental)

Ruta **paralela** a AI Studio (`lib/google-ai-images.ts`). Usa **billing GCP** (creditos promocionales $10 AI Pro, trial, etc.) en lugar del monedero Prepay de AI Studio.

## Cuando usar Vertex

| AI Studio (`GEMINI_API_KEY`) | Vertex (`GOOGLE_CLOUD_PROJECT`) |
|------------------------------|----------------------------------|
| Prepay en aistudio.google.com | Creditos en console.cloud.google.com |
| API key simple | ADC o service account |
| Problemas con $10 GDP no aplicados | Los $10/mes de AI Pro **si** consumen aqui |

## Setup GCP

1. [Crear proyecto](https://console.cloud.google.com/projectcreate) o reutilizar uno existente.
2. [Activar billing](https://console.cloud.google.com/billing) en esa cuenta.
3. Activar **Vertex AI API**: `aiplatform.googleapis.com`
4. Aplicar $10/mes en [My Benefits](https://developers.google.com/profile/benefits) → misma billing account.
5. Autenticacion local (elige una):
   ```bash
   gcloud auth application-default login
   ```
   o service account JSON → `GOOGLE_APPLICATION_CREDENTIALS=ruta/al/sa.json`

## Variables (.env.local)

```env
GOOGLE_CLOUD_PROJECT=tu-proyecto-gcp
GOOGLE_CLOUD_LOCATION=europe-west1
VERTEX_IMAGE_BACKEND=gemini
VERTEX_IMAGE_MODEL=gemini-2.5-flash-image
# VERTEX_IMAGEN_MODEL=imagen-3.0-generate-002
# Resolucion / aspecto (v7 estudio ancho → 16:9 por defecto)
GEMINI_IMAGE_SIZE=2K
# GEMINI_IMAGE_ASPECT_RATIO=16:9
```

### Modelos de imagen

| Modelo | Vertex + europe-west1 | Notas |
|--------|----------------------|--------|
| `gemini-2.5-flash-image` | Si (recomendado) | Default del proyecto |
| `gemini-3.1-flash-image` | A menudo **no** | Usar endpoint `global` o preview |
| `gemini-3.1-flash-image-preview` | Con `location=global` | Nano Banana 2 |

Si ves `Publisher Model ... gemini-3.1-flash-image was not found`:

1. Quita `VERTEX_GEMINI_IMAGE_MODEL` (vuelve a 2.5), **o**
2. Prueba:

```env
VERTEX_GEMINI_IMAGE_MODEL=gemini-3.1-flash-image-preview
VERTEX_IMAGE_USE_GLOBAL_LOCATION=true
GOOGLE_CLOUD_LOCATION=global
```

Reinicia `npm run dev` tras cambiar `.env.local`.

No toques `GEMINI_API_KEY` / `GOOGLE_IMAGE_*` — siguen siendo la ruta AI Studio en admin.

## Integracion admin

El boton **Generar candidato AI** usa `lib/lifestyle-image-generation.ts`:

```env
IMAGE_PROVIDER=vertex   # admin → Vertex AI (GCP)
# IMAGE_PROVIDER=aistudio   # admin → AI Studio (GEMINI_API_KEY)
```

Tras cambiar `.env.local`, reinicia el dev server (`npm run dev:clean`).

Prueba desde **Admin → ficha de producto → Generar candidato AI** (MCP browser en localhost).

## Errores frecuentes

| Error | Accion |
|-------|--------|
| `Could not load the default credentials` | `gcloud auth application-default login` |
| `PERMISSION_DENIED` | Rol **Vertex AI User** + API habilitada |
| `billing` | Billing activo en el proyecto |
| Modelo 404 | Cambiar `VERTEX_IMAGE_MODEL` en `.env.local` |
