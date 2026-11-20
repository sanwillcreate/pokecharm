# Repository Guidelines

## Project Direction

Pokecharm is an embeddable virtual pet for websites. Its two planned experiences are a polished marketing and configuration website, and a virtual pet widget that can run on third-party sites. Companions greet visitors and react to interaction; visitor-count-based growth and evolution are not product behavior. Do not describe planned behavior as already implemented.

Build the frontend foundation first. Keep the initial stack lightweight: Vite, TypeScript, vanilla JavaScript, browser DOM APIs, CSS, and pnpm. Do not add React, Next.js, a backend, database, authentication, payments, production visitor tracking, or analytics unless explicitly requested. Work in small milestones, inspect relevant files before changing them, and explain significant architectural decisions.

## Project Structure

`index.html` is the app entry document. Frontend code lives in `src/`, with `src/main.ts` bootstrapping the page, `src/counter.ts` containing the current starter interaction, and `src/style.css` defining global styles. Put imported assets in `src/assets/`; files in `public/` are served as-is from the site root. Keep UI, creature data, behavior, and widget functionality in clear modules. There is no test directory or test framework yet.

## Build and Development Commands

Use pnpm, matching the checked-in `pnpm-lock.yaml`:

- `pnpm install` installs locked dependencies.
- `pnpm dev` starts the Vite development server with hot reload.
- `pnpm build` runs the TypeScript check and creates the production bundle in `dist/`.
- `pnpm preview` serves the built bundle locally.

Run `pnpm build` to validate changes. There are currently no test or lint scripts in `package.json`.

## Design and Content

Use the supplied Masko Studio screenshots as visual inspiration for oversized editorial typography, tight headline spacing, clear hierarchy, selective accent highlights, rounded framed panels, character-focused layouts, playful annotations, interactive demonstrations, whitespace, and responsive polish. Do not copy Masko branding, artwork, or proprietary assets.

Sky blue is the primary accent, not orange. Starting tokens are primary `#54B8E8`, light blue `#8BD5F5`, pale blue `#DFF5FF`, white or near-white backgrounds, and near-black text. Treat these as adjustable starting points. Create original creatures, names, silhouettes, and artwork. Familiar creature archetypes can inform the work, but never copy Pokémon characters, names, logos, or assets.

## Coding Conventions and Engineering

Follow existing style: two-space indentation, single-quoted TypeScript strings, and omitted semicolons. Use `camelCase` for variables and functions, `PascalCase` for types, and descriptive kebab-case CSS class names. The TypeScript configuration checks unused locals and parameters; remove dead declarations rather than suppressing checks. Prefer semantic accessible HTML, responsive layouts, modular code, and minimal dependencies. Keep future widget styles isolated from host pages, using Shadow DOM when widget implementation begins.

## Testing and Contributions

No test framework or coverage threshold is configured. Manually exercise changed UI with `pnpm dev` and run `pnpm build`. If tests are introduced, add the framework and scripts to `package.json` and name tests for the behavior they cover.

Git history is unavailable in this checkout, so existing commit conventions cannot be confirmed. Use short imperative commit subjects (for example, `Add responsive navigation`). Pull requests should describe user-visible changes, note verification, include screenshots for visual changes, and link a related issue when available.

## Security and Configuration

Do not commit credentials, private environment files, or generated output. Update `pnpm-lock.yaml` when dependencies in `package.json` change. Keep out-of-scope infrastructure and product systems out of the frontend foundation until explicitly requested.
