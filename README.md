# Solid Block Link

Solid Block Link is a fan-driven donation and marketing platform built to support SB19 campaign pushes with a more polished public site and a lightweight admin workspace.

## What It Includes

- public homepage with live donation progress
- campaign and updates pages
- admin panel for site settings, milestone, internal donations, and social updates
- Supabase-backed content and settings
- Apps Script summary support for public donation totals

## Tech Stack

- React
- TypeScript
- Vite
- React Router
- Supabase

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Copy the environment template

```bash
cp .env.example .env
```

3. Fill in your real values in `.env`

```env
VITE_APPS_SCRIPT_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

4. Start the dev server

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Environment Notes

- `.env` is ignored by Git
- use `.env.example` as the shared template
- `SBL Donation Lookup` is a separate deployed app and should be linked through site settings CTA URLs

## Supabase Notes

- campaign content and admin-managed text come from Supabase
- logo upload uses the `sbl-assets` storage bucket
- public donation totals are merged from the Apps Script summary endpoint

## Project Notes

- homepage CTAs should be managed in `site_settings`
- featured social updates are homepage-only highlights
- latest updates and past campaigns are separated on the updates page
