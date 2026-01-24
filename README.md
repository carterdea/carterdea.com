# carterdea.com

[![Test](https://github.com/carterdea/carterdea.com/actions/workflows/test.yml/badge.svg)](https://github.com/carterdea/carterdea.com/actions/workflows/test.yml)

Agency site for product design and engineering services, focused on applied AI and ecommerce systems.

## Tech Stack

- **Framework:** Astro 5 with React integration
- **Styling:** Tailwind CSS 4
- **3D Graphics:** Three.js, React Three Fiber
- **Email:** Resend API
- **Deployment:** Vercel (static output)
- **Testing:** Vitest (unit), Playwright (e2e)
- **Package Manager:** Bun

## Setup

1. Install dependencies:

```bash
bun install
```

1. Configure environment variables:

```bash
# .env.local
RESEND_API_KEY=your_resend_api_key
```

1. Run development server:

```bash
bun run dev
```

## Commands

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `bun run dev`      | Start dev server at localhost:4321 |
| `bun run build`    | Build for production to `dist/`    |
| `bun run preview`  | Preview production build           |
| `bun run test`     | Run unit tests (Vitest)            |
| `bun run test:e2e` | Run e2e tests (Playwright)         |
| `bun run test:all` | Run all tests                      |
| `bun run lint`     | Lint code (Biome)                  |
| `bun run lint:fix` | Fix linting issues                 |
| `bun run format`   | Format code (Biome)                |

## Project Structure

```text
src/
├── components/       # Astro and React components
├── data/            # Content configuration (site.json)
├── layouts/         # Page layouts
├── pages/           # File-based routes
│   └── api/         # API endpoints
└── scripts/         # Build and utility scripts
```

## Content Management

Site content is managed through `src/data/site.json` and loaded via Astro's content collections. Update hero text, services, clients, testimonials, and CTAs in this file.

## Contact Form

Contact form submissions use the Resend API. Requires `RESEND_API_KEY` environment variable.
