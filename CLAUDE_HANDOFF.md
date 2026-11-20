# Pokecharm handoff

## Product

Pokecharm is an embeddable virtual companion for websites. The vision is a small, personality-led mascot that greets and reacts to visitors. The current checkout is an early frontend release: marketing/configuration site, interactive companion widget, four companions, and ZIP installation are represented in source. No backend or database is included.

## Stack and structure

- Vite 8 + TypeScript 7, vanilla DOM/CSS; dependencies are Vite and TypeScript only (`package.json`). pnpm lockfile is checked in.
- `pnpm dev` serves the site; `pnpm build` runs `tsc`, builds the site and standalone IIFE widget; `pnpm preview` serves `dist`.
- `index.html` and `src/main.ts` are the marketing/configurator entry. `src/style.css` and `src/installer.css` style the site. `src/widget-entry.ts` and `vite.widget.config.ts` build `dist/widget.js`.
- `src/companion-widget.ts` is the embedded runtime; `src/embed-widget.css` is injected into Shadow DOM to isolate host styles. `src/creature-registry.ts` maps companions to atlases/sheets; `src/creature-animation.ts` drives atlas-based sprite animation; `src/dialogue.ts` contains per-companion lines; `src/cursor-chase.ts` handles movement; `src/pokeball-controller.ts` handles the Pokéball.
- Traffic-count and evolution behavior was removed from the runtime. Creature atlases may still contain an unused evolution animation row; it is not exposed as a widget interaction.

## Companions and extending the registry

`src/creature-registry.ts` connects `spark` → Pikachu/Bright, `ember` → Charmender/Warm, `tide` → Squirtle/Calm, and `moss` → Bulbasaur/Steady. Companion selection labels/defaults are in `src/companions.ts`; dialogue is in `src/dialogue.ts`.

- Pikachu: `public/assets/creatures/pikachu/pokecharm_sprite_sheet.png`, `pokecharm_atlas.json` (plus demo/CSS/preview in that directory).
- Charmender: `public/assets/creatures/charmender/pokecharm-fire-sheet.png`, `pokecharm-fire-atlas.json`.
- Squirtle: `public/assets/creatures/squirtle/pokecharm-water-sheet.png`, `pokecharm-water-atlas.json`.
- Bulbasaur: `public/assets/creatures/bulbasaur/pokecharm-grass-sheet.png`, `pokecharm-grass-atlas.json`.

To add one, add its public sprite sheet and matching atlas (correct image filename, dimensions/grid, anchors, animation rows/rectangles), then add a `CompanionId`/companion definition and dialogue, registry entry with theme/personality/behavior, and connect its assets. Check UI selectors and package asset paths, too. The installer packages only the selected companion and shared Pokéball assets.

## Installation

The installer UI is mounted by `src/companion-installer.ts`; ZIP creation is in `src/zip-archive.ts`. Downloading requires the built `/widget.js` plus the selected creature atlas/sheet and two files under `public/assets/pokeball/`. The ZIP contains `pokecharm-install/widget.js`, `assets/creatures/<id>/...`, `assets/pokeball/pokecharm-orb-{idle,sheet}.png`, `config.json`, and `README.md`. Extract and upload the entire `pokecharm-install` folder to a publicly accessible location; use its public URL as `src` and `data-assets-base` (with trailing slash). Example, based on the checked-in ZIP test fixture:

```html
<script src="https://your-site.example/pokecharm-install/widget.js" data-assets-base="https://your-site.example/pokecharm-install/" data-companion="bulbasaur" data-name="Bulbasaur" data-size="120,120" async></script>
```

That is a placeholder-domain example, not a live customer URL. Hosted embed code is generated from `VITE_POKECHARM_WIDGET_URL` (`src/widget-installer-config.ts`); it must be an HTTPS public widget URL. The generated tag uses `data-companion`, `data-name`, `data-size`, and `async`, and assets resolve from the widget script's origin. Hosted URL currently configured in deployment: UNKNOWN. ZIP test instructions live in `public/zip-install-test/README.md`; this fixture is not evidence a ZIP test was run.

## Deployment

- Git: `main`, tracking `origin/main`; latest commit `d93284cd4230d35b5683da9f069c2e22a99e9666` (“Initial Pokecharm release”, 2026-11-17). Remote: `https://github.com/sanwillcreate/pokecharm.git`.
- Vercel project/linkage, build settings, production deployment URLs, and configured environment values are UNKNOWN in this checkout; no Vercel config/link file was found. Build script is `pnpm build`; output is `dist/`.
- `VITE_POKECHARM_WIDGET_URL` is retained for preview script selection; hosted embed installation is not offered in the current UI. Never commit secret values.

## Current state and verification

Source implements the landing page sections, companion selection/live previews, name and size controls, ZIP generation, animation/dialogue, cursor/click movement, and Pokéball capture/release. `public/widget-test.html` describes throw/miss/capture behavior; `public/zip-install-test/` provides a manual package fixture. These interactions have not been browser-verified in this handoff. No build or tests were run.

Known limitations / manual checks:

- Sound is disabled for all registry companions and the playground says sound preview is silent (`src/creature-registry.ts`, `src/widget.ts`).
- “Charmender” is the spelling used across current UI, registry, and asset paths; confirm intended naming before changing it.
- Manually test each companion/animation, dialogue timing, click/drag movement, Pokéball capture/miss/release and persistence, responsive behavior, and ZIP contents/self-hosting on a separate origin. Actual bugs are UNKNOWN until exercised.

## Next milestone: UI/UX before public promotion

Refresh the website presentation while preserving the structure and working interactions in `src/main.ts`: header/navigation; hero and character showcase; companion selector plus live playground; installer (companion, name, size, preview, ZIP and hosted embed); “How it works”; experience/personality explanation; closing CTA and footer. Keep responsive layouts, accessible controls/status messaging, live preview updates, generated snippets, copy, and ZIP download. Do not imply planned visitor evolution is already live.

## Launch checklist

- Install on an external website/origin and verify assets, Shadow DOM isolation, placement, and interactions.
- Generate ZIPs for all companions; inspect contents/config/README and test extracted packages on a separate origin.
- Configure and test the hosted embed URL and generated code on an external site.
- Check mobile and desktop layouts, controls, sizing, and overflow.
- Prepare a launch demo covering selection, name/size customization, companion reactions, Pokéball interaction, and both install paths; confirm all demo steps in a browser.

## Instructions for Claude

1. Read `CLAUDE_HANDOFF.md` and `AGENTS.md` first.
2. Inspect source code before changing anything.
3. Preserve existing functionality and architecture.
4. Work milestone by milestone.
5. Avoid unnecessary rewrites.
