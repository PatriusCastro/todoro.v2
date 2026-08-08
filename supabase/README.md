# Supabase

Schema for Todoro's optional cross-device sync. The app is local-first: signing
in is optional, and signed out nothing here is touched.

Migrations are committed rather than applied by hand in the dashboard, because
`0001_init.sql` contains the row-level security policies. A security control
that exists only as something someone once clicked in a browser is not
reviewable and cannot be recreated.

## Applying a migration

There is no CI, so this is manual:

```bash
npx supabase login                      # interactive, once per machine
npx supabase link --project-ref <ref>   # prompts for the database password
npx supabase db push
```

**Order matters: `db push` before `git push`.** Vercel auto-deploys from `main`,
so shipping code that queries a table before the table exists means users hit
`PGRST205 Could not find the table`.

`supabase start` is deliberately not used — a local Docker Postgres is not worth
it for this schema. Point at the hosted project.

## Dashboard settings this schema assumes

- **Auth → Email templates → Magic Link**: include `{{ .Token }}` in the body.
  The app signs in with a 6-digit code rather than a clickable link, because
  PKCE binds the link to the browser that requested it (request on a laptop,
  open on a phone, and it fails) and because on iOS an installed PWA has storage
  separate from Safari, so a tapped link signs in the wrong browser.
- **Auth → Providers → Email**: turn *off* "Allow new users to sign up" once
  your own account exists. RLS means a stranger could only ever see their own
  empty account, but there is no reason to let anyone create one.

## Verifying RLS

The anon key is public — it ships inside the JS bundle. RLS is the only thing
protecting the data, so check it directly rather than assuming:

```bash
curl "https://<ref>.supabase.co/rest/v1/tasks?select=*" \
  -H "apikey: <anon-key>"
```

An empty array or a 401 is correct. Rows coming back means a policy is missing.
Also confirm no table carries the dashboard's "Unrestricted" badge.
