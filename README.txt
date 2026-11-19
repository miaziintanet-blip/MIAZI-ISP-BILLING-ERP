# Miazi ISP Billing & ERP — Starter MVP

## Included
- Responsive bilingual (Bangla/English) admin UI
- Supabase email/password login
- Dashboard summary
- Customer create/list/search
- Package create/list
- Payment entry and recent payments
- SQL schema and authenticated-user RLS policies

## Setup
1. Create a new Supabase project.
2. Open SQL Editor > New query, paste `supabase-schema.sql`, and Run.
3. In Supabase Authentication > Users, create your first admin user.
4. Open Project Settings > API. Copy the Project URL and anon/publishable key.
5. Edit `app.js`:
   - `SUPABASE_URL = "https://....supabase.co"`
   - `SUPABASE_ANON_KEY = "sb_publishable_..."` (or legacy anon key)
6. Deploy `index.html` and `app.js` to GitHub Pages or another static host.

## Security
- Never put the Supabase `service_role` or secret key in browser JavaScript.
- This is an MVP starter, not a finished production ISP platform.
- Before real customer data is entered, implement role-based access, audit logs,
  backup policy, invoice numbering, billing cycles, and secure MikroTik integration.
- SMS and MikroTik connectivity are not included yet and require provider/router details.
