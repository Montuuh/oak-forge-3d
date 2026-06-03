# Imagenes AI con Google (Gemini / Imagen)

## API key

```env
GEMINI_API_KEY=tu_clave_aqui
GOOGLE_IMAGE_BACKEND=imagen
GOOGLE_IMAGE_MODEL=imagen-4.0-fast-generate-001
```

Con `imagen` (default) la generacion usa **solo el prompt de texto**; las referencias marcadas siguen siendo obligatorias en admin para validar el flujo, pero no se envian a la API.

Para enviar fotos N3D a la API (multimodal), usa `GOOGLE_IMAGE_BACKEND=gemini` y `GOOGLE_IMAGE_MODEL=gemini-2.5-flash-image` (requiere creditos prepago en AI Studio).

## Facturacion (error 429 / "No available credits")

**Google AI Pro** (suscripcion consumer) **no recarga sola** la API. Los **$10/mes** van a una **cuenta de facturacion GCP** (Postpay), no al monedero **Prepay** de AI Studio.

Desde **marzo 2026**, Google separa dos carteras en la misma billing account:

| Cartera | Donde se ve | Para que sirve |
|---------|-------------|----------------|
| **Prepay** (AI Studio Billing) | [aistudio.google.com](https://aistudio.google.com) → Billing → Available credits | **Gemini API** con API keys de AI Studio (Imagen, gemini-*-image) |
| **Creditos promocionales GCP** | [console.cloud.google.com/billing](https://console.cloud.google.com/billing) | Vertex AI, Cloud Run, etc. **No** alimentan Prepay automaticamente |

Los **$300 de trial** (cuentas nuevas desde 2 mar 2026) **tampoco** pagan Gemini API en AI Studio.

### Checklist para que funcione la API key

1. **Misma cuenta Google** en Google One AI Pro, [My Benefits](https://developers.google.com/profile/benefits) y AI Studio.
2. **Activar $10/mes**: My Benefits → *monthly Gen AI & Cloud credits* → elegir la **misma billing account** que usaras en AI Studio.
3. **Proyecto AI Studio**: [Projects](https://aistudio.google.com/projects) → tu proyecto → **Set up billing** → vincular esa billing account.
4. **Prepay obligatorio** (Tier 1): en AI Studio → **Billing** → **Buy credits** (minimo ~$10). Sin saldo Prepay > 0 la API responde 429 aunque en GCP veas $10 promocionales.
5. **API key del proyecto pagado**: crear la key en el proyecto que muestra Tier 1 / Paid, no en uno Free.
6. Si la columna Billing dice **Setup pending**, puede tardar horas o dias; hay casos en el [foro de Google](https://discuss.ai.google.dev/t/manual-sync-request-my-ai-studio-is-stuck-on-setup-pending-cloud-billing-is-active/132291).

### Si no quieres comprar Prepay aparte

Usar **Vertex AI** (misma billing account): los $10 GDP si consumen ahi (Imagen/Gemini). Requiere proyecto GCP + credenciales distintas a la API key de AI Studio (no implementado en este repo aun).

### Errores frecuentes

| Error | Causa probable |
|-------|----------------|
| `prepayment credits are depleted` | Prepay en $0 → Buy credits en AI Studio |
| `No available credits` (proyecto Tier 1) | Billing vinculada pero Prepay sin comprar |
| `paid plans` / `free_tier limit: 0` | Proyecto/API key aun en Free Tier |
| Creditos visibles en GCP pero API falla | Normal: carteras Prepay vs promocionales separadas |

Con AI Pro puedes activar **$10/mes en creditos GCP** en [Google Developer Program → My Benefits](https://developers.google.com/profile/benefits) y vincularlos al proyecto de la API key.

## Referencias en admin

En cada imagen **local o N3D** hay el checkbox **Usar como referencia**:

- Por defecto **activado** al sincronizar N3D o subir una foto manual.
- Solo las marcadas se envian al generador.
- El render N3D (`/images/products/{slug}.webp`) es la referencia **primaria** (color + geometria).
- Otras referencias marcadas son **secundarias** (pistas de forma, sin copiar color).

Antes de **Generar candidato AI** debe haber al menos una referencia marcada y el archivo en disco.

## Prompt

Version `v3-clean-product-shot`: mesa roble, pared gotelé, **sin props** (foto limpia tipo e-commerce), f/2.8.

## Archivos

| Tipo | Ruta |
|------|------|
| Render N3D (protegido) | `public/images/products/{slug}.webp` |
| Subida manual | `public/images/uploads/{slug}-{id}.ext` |

## Catalogo publico

Tras aprobar una imagen y marcar visibilidad, el sitio lee desde Postgres; no hace falta exportar JSON.
