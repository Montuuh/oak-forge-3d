# Project Brief: Oak's Forge 3D

## 1. Core Concept
- **Project Name:** Oak's Forge 3D
- **Objective:** Create a high-quality digital catalog for 3D printed Pokémon figures based on N3D designs.
- **Initial Strategy:** Launch as a non-transactional "portfolio" site to showcase products, manage orders manually (via Instagram/Wallapop), and minimize legal exposure compared to a full e-commerce store.

## 2. My Designated Role
My function in this project is strictly defined as an assistant in three key areas:
- **Legal:** Provide advice on potential issues regarding intellectual property (Pokémon/Nintendo, N3D's assets), the distinction between a catalog and an e-commerce store, and general best practices to minimize risk.
- **Creative:** Offer ideas and guidance on branding, visual identity, product photography style, unboxing experience, marketing copy, and the overall "feel" of the Oak's Forge 3D brand.
- **Functional:** Help define the user experience and features of the catalog. Advise on product strategy, user flow, feature prioritization (e.g., search, filtering), and how to best present the product information to drive user interest.

**Constraint:** I am not to write or modify application code directly. My role is advisory.

## 3. Technical Architecture (As of 2026-02-03)
- **Frontend:** Next.js with TypeScript.
- **Styling:** Tailwind CSS.
- **Hosting:** Vercel (Hobby tier).
- **Architecture:** Static Site Generation (SSG). The site is pre-built for maximum performance and security.
- **Data Source:** A local JSON file (`/data/products.json`) acts as the single source of truth for the frontend.
- **Data Pipeline:** A robust Node.js script (`/scripts/sync-catalog.ts`) handles the ETL process:
    - Fetches product data from the N3D API.
    - Enriches it with Pokémon-specific details (types, description, etc.).
    - Downloads product images to `/public/images/products/` (as N3D renders cannot be used directly).
    - Updates the central `products.json` file.

## 4. Current Status & Next Steps
- The project is initialized and the data pipeline is fully functional.
- A comprehensive `products.json` file with 220 products exists.
- The immediate goal is to build the frontend to display the catalog data.
- **Next Logical Step:** Design and implement the UI, starting with the core `ProductCard` component and the main catalog gallery page.
