# Pattaya Rent A Car - Marketing Site

This is a high-performance, multi-page static website built for **Pattaya Rent A Car**. It is designed for maximum SEO impact and AI agent readability.

## Architecture
- **Static HTML**: Not a single-page app. Generated from EJS templates.
- **Multilingual**: Supports EN, TH, RU, ZH, DE, FR with distinct URL structures.
- **Tailwind CSS**: Modern utility-first styling.
- **Micro-interactivity**: Vanilla JS for date picking and UI elements.

## Prerequisites
- Node.js (v18+)
- Firebase CLI (for deployment)

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Local Development**:
   This will build the site and start a local preview server on port 3000.
   ```bash
   npm run dev
   ```

3. **Production Build**:
   Generates a production-ready `dist/` folder.
   ```bash
   npm run build
   ```

4. **Deployment**:
   Deploy to Firebase Hosting.
   ```bash
   firebase deploy --only hosting
   ```

## Adding Content

### Adding a New Car
1. Open `src/data/cars.json`.
2. Add a new object with the car details.
3. Run `npm run build`. A new page will be generated at `/cars/[slug]/`.

### Adding a New Location
1. Open `src/data/locations.json`.
2. Add the area name and description.
3. Run `npm run build`. A new SEO landing page will be generated at `/locations/[slug]/`.

### Updating Translations
- The core structure handles the paths automatically.
- To provide localized strings, update the templates in `src/templates/pages` or extend the data files to include language-specific fields.

## SEO & AI Agents
- **llms.txt**: Located at root for AI discovery.
- **sitemap.xml**: Auto-generated listing all pages.
- **JSON-LD**: Embedded in every page for schema.org rich results.
