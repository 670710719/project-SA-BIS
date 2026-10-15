# React + Vite

## Deploy to Vercel

When importing this repository into Vercel, set **Root Directory** to
`frontend`. Vercel will then use the following settings:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci`

The included [`vercel.json`](./vercel.json) keeps client-side React Router
routes working after a page refresh.

The Go API in `backend/` must be deployed separately. The Vite development
proxy only forwards `/api` requests to `http://localhost:8080` locally.

The backend uses Supabase PostgreSQL when the Vercel backend project has a
`DATABASE_URL` environment variable. On first startup it creates the
`employees`, `accounts`, and `assessments` tables and seeds the sample
employees and accounts. Keep `DATABASE_URL` in Vercel Environment Variables;
never commit it to the repository.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
