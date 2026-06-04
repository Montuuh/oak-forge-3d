# N3D Designs API Documentation

Official API for accessing N3D Melbourne's 3D printable Pokeball design catalog.

## Overview

Query our design library programmatically to get:
- Design metadata (title, category, print time)
- Filament requirements (colors, weights, series)
- Localized product links for Bambu Lab filaments
- Design and filament swatch images

## Authentication

All requests require an API key passed in the Authorization header:

```
Authorization: Bearer n3d_sk_your_key_here
```

**Get your API key:** Log in at n3dmelbourne.com → Dashboard → Tools → Design API

### Subscription Requirement

API access requires an active N3D Patreon subscription. If your membership expires:
- Day 1: Warning email sent
- Day 15: Reminder email sent
- Day 31: API key is revoked

## Base URL

```
https://n3dmelbourne.com/api/v1
```

## Rate Limits

- Depende del tier Patreon (p. ej. **casual: 5/min**, tiers superiores pueden permitir más)
- En Oak Forge 3D: `N3D_API_REQUESTS_PER_MIN` en `.env.local` (por defecto `5`)
- Rate limit info included in response headers:
  - `X-RateLimit-Limit` — Maximum requests per window
  - `X-RateLimit-Remaining` — Requests remaining
  - `X-RateLimit-Reset` — Unix timestamp when limit resets

---

## Endpoints

### Check API Version

```
GET /version
```

No authentication required.

**Response:**
```json
{
  "version": "1.0.9",
  "released": "2025-11-30"
}
```

---

### List Designs

```
GET /designs
```

Returns a paginated list of designs with summary information.

**Parameters:**

| Parameter | Type   | Default | Description                        |
|-----------|--------|---------|-------------------------------------|
| page      | number | 1       | Page number                         |
| limit     | number | 50      | Items per page (max 50)             |
| category  | string | —       | Filter: `character`, `standard`     |
| query     | string | —       | Search by title or slug             |
| profile   | string | ams     | Print profile: `ams`, `split`, `mc` |

**Example:**
```bash
curl "https://n3dmelbourne.com/api/v1/designs?category=character" \
  -H "Authorization: Bearer n3d_sk_abc123..."
```

**Response:**
```json
{
  "data": [
    {
      "slug": "pikachu-v3",
      "title": "Pikachu V3",
      "category": "character",
      "image_url": "https://cdn.n3dmelbourne.com/designs/pikachu-v3/thumb.png",
      "print_time": "3:32:04",
      "total_weight_grams": 55.7
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 222,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```

---

### Get Single Design

```
GET /designs/{slug}
```

Returns full detail for a single design, including filament requirements and Pokemon data.

**Parameters:**

| Parameter | Type   | Default | Description              |
|-----------|--------|---------|--------------------------|
| locale    | string | US      | Region for product links |

**Example:**
```bash
curl "https://n3dmelbourne.com/api/v1/designs/pikachu-v3?locale=AU" \
  -H "Authorization: Bearer n3d_sk_abc123..."
```

**Response:**
```json
{
  "slug": "pikachu-v3",
  "title": "Pikachu V3",
  "category": "character",
  "image_url": "https://cdn.n3dmelbourne.com/designs/pikachu-v3/thumb.png",
  "print_time": "3:32:04",
  "print_time_seconds": 12724,
  "total_weight_grams": 55.7,
  "pokemon": {
    "name": "Pikachu",
    "pokedex_number": 25,
    "types": ["electric"],
    "description": "When several of these Pokémon gather..."
  },
  "filaments": [
    {
      "filament_id": 5,
      "color": "Sakura Pink",
      "series": "PLA Matte",
      "img_swatch": "https://cdn.n3dmelbourne.com/swatches/sakura-pink.webp",
      "weight_grams": 25.5,
      "product_url": "https://au.store.bambulab.com/products/pla-matte?id=...",
      "affiliate_url": "https://au.store.bambulab.com/products/pla-matte?sv1=affiliate&..."
    }
  ],
  "profiles": [
    {
      "name": "Pikachu - AMS Profile - V3",
      "type": "ams",
      "print_time": "3:32:04",
      "print_time_seconds": 12724,
      "plate_count": 3
    }
  ]
}
```

---

### Batch Get Designs

```
POST /designs/batch
```

Returns full detail for multiple designs in a single request.

**Body:**
```json
{
  "slugs": ["pikachu-v3", "eevee-v2", "charizard-v1"],
  "locale": "AU"
}
```

**Parameters:**

| Parameter | Type   | Default | Description                       |
|-----------|--------|---------|-----------------------------------|
| slugs     | array  | —       | Required. Array of slugs (max 20) |
| locale    | string | US      | Region for product links          |

---

## Supported Locales

| Locale | Region              |
|--------|---------------------|
| US     | United States       |
| UK     | United Kingdom      |
| EU     | European Union      |
| AU     | Australia           |
| JP     | Japan               |
| KR     | South Korea         |
| GLOBAL | Global/fallback     |

---

## Error Codes

| Status | Description                   |
|--------|-------------------------------|
| 400    | Bad request (invalid params)  |
| 401    | Missing or invalid API key    |
| 404    | Design not found              |
| 429    | Rate limit exceeded           |
| 500    | Server error                  |

**Error Response:**
```json
{
  "error": "Invalid API key"
}
```

---

## Field Reference

### Design Object (List)

| Field             | Type   | Description                      |
|-------------------|--------|----------------------------------|
| slug              | string | URL-friendly identifier          |
| title             | string | Display name                     |
| category          | string | `character` or `standard`        |
| image_url         | string | URL to thumbnail (webp, 400px)   |
| print_time        | string | Duration (e.g., "3:32:04")       |
| total_weight_grams| number | Combined filament weight         |

### Pokemon Object

| Field          | Type          | Description                    |
|----------------|---------------|--------------------------------|
| name           | string        | Pokemon name                   |
| pokedex_number | number        | National Pokedex number        |
| types          | array         | List of types                  |
| description    | string\|null  | Flavor text from Pokedex       |

### Filament Object

| Field         | Type          | Description                    |
|---------------|---------------|--------------------------------|
| filament_id   | number\|null  | Stable ID for caching          |
| color         | string        | Filament color name            |
| series        | string        | Product line (e.g., "PLA Matte")|
| img_swatch    | string\|null  | URL to color swatch            |
| weight_grams  | number        | Amount needed in grams         |
| product_url   | string        | Filament link (Bambu Lab)      |
| affiliate_url | string        | Affiliate link                 |

### Profile Object

| Field             | Type   | Description                        |
|-------------------|--------|-----------------------------------|
| name              | string | Full profile name                 |
| type              | string | `ams`, `split`, or `mc`           |
| print_time        | string | Duration for this profile         |
| print_time_seconds| number | Duration in seconds               |
| plate_count       | number | Number of build plates required   |
