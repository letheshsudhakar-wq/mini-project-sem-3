# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## CivicFix setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set the Supabase project URL and anon key. Google sign-in also requires the Google provider and redirect URLs to be configured in Supabase.
3. Apply `supabase/schema.sql` to a new Supabase project. For an existing deployment, apply the migrations in `supabase/migrations/`, including `20261115_categories_and_language.sql` and `20261115_multilingual_language_support.sql`.
4. Run `npm run dev` for local development and `npm run build` to type-check and create a production build.

### Google sign-in configuration

The root `.env` must contain the project URL and a browser-safe Supabase anon JWT or publishable key. The checked-in `.env.example` contains placeholders only; do not use a service-role or secret key in the browser. Restart Vite after changing `.env`.

In Supabase Dashboard:

1. Under **Authentication → Providers → Google**, enable Google and enter the Google OAuth client ID and secret.
2. Under **Authentication → URL Configuration**, set the Site URL and allow the app callback URL (`http://localhost:5173/auth/callback` for local development; add the actual `127.0.0.1` origin if you use it, plus the production callback URL).
3. In Google Cloud Console, add the Supabase project's `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI for the OAuth client.

The application returns OAuth users through `/auth/callback` and routes them to the citizen or government dashboard based on their loaded profile role.

English, Hindi, Kannada, and Tamil are available in the language selector. User-authored complaint text is preserved and displayed in its submitted language. Translation coverage is tracked in `TRANSLATION_COVERAGE.md`; some dashboard, detail, and modal UI still requires localization.

Language selection is stored in browser local storage and, after the database migration is applied, synchronized to the authenticated user's `profiles.preferred_language` field. Logged-out visitors keep their selection in the browser.
