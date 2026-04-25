# Weather Web App (React + TypeScript + Webpack)

## Setup

1) Install dependencies:

```bash
yarn
```

2) Create `.env` in the project root:

```bash
OPENWEATHER_API_KEY=YOUR_KEY_HERE
```

Example file: `config/env.example`

3) Start dev server:

```bash
yarn dev
```

Build:

```bash
yarn build
```

## Notes

- OpenWeather key is read from `process.env.OPENWEATHER_API_KEY` via `dotenv-webpack` (dev and prod builds).
- Search history persists in localStorage.
- Light/dark theme toggle is available top-right.
- Static assets:
  - Put images in `public/assets/`
  - They are served at `/assets/*` in dev and are copied into `dist/assets/` during `yarn build` for deployment.

