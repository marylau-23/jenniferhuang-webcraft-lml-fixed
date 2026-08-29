# Setup & Deployment Instructions

<!-- Fill in each section so a reviewer can run your site locally in under 5 minutes. -->

## Walkthrough Videos

Screen-capture walkthroughs hosted on Pixelcloud (key routes, scrolling, animations, hover states, responsive behavior):

| Recording | Device | Link |
|-----------|--------|------|
| **Replica (primary)** | Desktop | https://pxl.cl/b1WK7 |
| **Replica (primary)** | Mobile | https://pxl.cl/b1WH4 |
| Original (reference) | Desktop | https://pxl.cl/b1WXk |
| Original (reference) | Mobile | https://pxl.cl/b1WGC |

## Prerequisites

<!-- What needs to be installed before setup? -->

- Node.js >= 18
- npm / pnpm / yarn

## Environment Variables

<!-- List every required env var. Copy .env.example to .env and fill in values. -->

```bash
cp .env.example .env
```

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `EXAMPLE_API_KEY` | API key for ... | Sign up at ... |

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The site will be available at `http://localhost:3000`.

## Production Build

```bash
npm run build
npm start
```

## Deployment

<!-- How to deploy to your hosting provider. -->

Example for Vercel:

```bash
npx vercel --prod
```

## External Services

<!-- List any APIs, databases, or third-party services the site depends on. -->

- None (or list them here)
