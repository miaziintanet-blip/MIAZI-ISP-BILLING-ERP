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


## MaXim-style upgrade (November 2026)
The additive migration `miazi-maxim-upgrade.sql` adds customer classifications
(Home / SOHO / Corporate), POP / Area / Box records, invoices, support tickets,
expenses and SMS log storage without deleting existing customer or payment rows.

The web app now includes:
- Customer classification and POP / Area / Box assignment fields
- POP, Area and Fiber Box / Splitter management
- Monthly invoice generation (duplicate month/customer invoices are ignored)
- Payment allocation against oldest unpaid invoices
- Support ticket creation and status updates
- Expense entry and a basic collection / due / expense summary

SMS sending, MikroTik/OLT provisioning, staff roles, and full customer edit/delete
workflows are not yet connected. SMS and network automation need provider/device
credentials and secure server-side integration; do not place secret keys in app.js.
