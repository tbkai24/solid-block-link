# Solid Block Link

Main website for Solid Block Link, a donation and marketing platform focused on helping promote SB19 worldwide.

## Goals

- Highlight the current campaign
- Show live donation progress
- Publish curated updates
- Archive past campaigns
- Provide an admin-ready content model

## Commands

```bash
npm install
npm run dev
npm run build
```

## Notes

- `SBL Donation Lookup` remains a separate project.
- Homepage CTAs include `Donate Now` and `SBL Lookup`.
- Admin-managed values should later replace mock content.
- Supabase is the planned database for campaigns, updates, embeds, and admin-managed settings.
- CTA URLs should come from `site_settings`, not from `.env`.
