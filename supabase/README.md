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

- **Auth → Email templates**: include `{{ .Token }}` in the body of **both**
  "Magic Link" *and* "Confirm signup". `signInWithOtp` sends the Magic Link
  template to an existing user but the Confirm signup template to a brand new
  one — so covering only the first means your very first sign-in receives an
  email with no code in it and cannot complete.

  The default templates contain only `{{ .ConfirmationURL }}`, so this edit is
  required, not optional. Something like:

  ```html
  <h2>Your Todoro code</h2>
  <p>Enter this code in Todoro:</p>
  <p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
  ```

  A ready-made template lives at `supabase/templates/otp-email.html` — paste it
  into both.

  The app signs in with an emailed code rather than a clickable link because
  PKCE binds the link to the browser that requested it (request on a laptop,
  open on a phone, and it fails), and because on iOS an installed PWA has
  storage separate from Safari, so a tapped link signs in a browser the PWA
  cannot see.

- **Auth → Providers → Email → Email OTP Expiration**: set to `120` (seconds).
  The sheet counts down from two minutes and the email says two minutes, so a
  mismatch here makes one of them lie. `CODE_TTL_SECONDS` in
  `components/AccountSheet.tsx` is the other half of the pair.

- **Auth → Providers → Email → Email OTP Length**: whatever you like, 6–10. The
  input accepts the full range rather than assuming the default.
- **Auth → Providers → Email**: turn *off* "Allow new users to sign up" once
  your own account exists. RLS means a stranger could only ever see their own
  empty account, but there is no reason to let anyone create one.

## Verifying RLS

The anon key is public — it ships inside the JS bundle. Authorization is the
only thing protecting the data, so check it directly rather than assuming.

Fetch the keys (never paste the `service_role` or `sb_secret_` ones anywhere):

```bash
npx supabase projects api-keys --project-ref <ref>
```

Then probe every table anonymously:

```bash
ANON="<anon or sb_publishable_ key>"
URL="https://<ref>.supabase.co/rest/v1"
for t in tasks projects sessions point_ops settings user_assets; do
  curl -s -o /dev/null -w "$t -> %{http_code}\n" \
    "$URL/$t?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
done
```

**Expected: `401` on all six**, with body code `42501`. Rows coming back means
authorization is broken — stop and fix it before shipping any client code.

Two things make that 401 meaningful rather than incidental:

- Confirm an unknown table returns **404**, not 401. If everything 401s the API
  might simply be unreachable and the check proves nothing.
- Try a write too (`-X POST .../tasks -d '{"id":"probe","title":"x"}'`). It must
  also be 401.

There are two independent layers here, and `42501` is the outer one: the
`revoke all ... from anon` in `0001_init.sql` denies the grant before any policy
is evaluated. The RLS policies are the inner layer — they are scoped
`to authenticated`, so they take over once a real user signs in and confine each
one to `auth.uid() = user_id`. Verifying the inner layer needs two signed-in
accounts and is worth doing once sync is live.

Also confirm no table carries the dashboard's "Unrestricted" badge.
