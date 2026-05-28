# Supabase Auth — "Confirm signup" email template

This replaces the default Supabase Auth confirmation email. It keeps email
verification as the primary action and adds a soft install nudge as a
postscript so new users land on `onduler.app/welcome` after confirming.

## Where to paste this

Supabase Dashboard → **Authentication** → **Emails** → **Templates** →
**Confirm signup**.

Set the **Subject** field, then paste the HTML block into the **Message
body** field. Save. Send yourself a test signup to verify rendering.

## Subject

```
Confirm your Onduler account
```

## Message body (HTML)

```html
<p>Welcome to Onduler.</p>

<p>
  Confirm your email to finish setting up your account:
</p>

<p>
  <a href="{{ .ConfirmationURL }}">Confirm your email</a>
</p>

<p>
  Once you're in, you'll set up your first swells (the life areas you want
  to keep showing up for) and the daily motions that feed them.
</p>

<p style="color:#888; font-size:13px; margin-top:32px;">
  P.S. Onduler works best as a home-screen app. After confirming, open
  <a href="https://onduler.app/welcome">onduler.app/welcome</a> on your
  phone for the two-tap install steps (Safari on iPhone, Chrome on Android).
</p>

<p style="color:#888; font-size:12px; margin-top:24px;">
  If you didn't sign up for Onduler, you can ignore this email.
</p>
```

## Notes

- `{{ .ConfirmationURL }}` is the Supabase template variable that resolves
  to the verification link. Do not change the casing or spacing.
- Supabase strips most CSS classes from auth emails; inline styles are the
  safe path for any visual treatment.
- If we later turn email confirmation off (auto-login after signup), this
  template stops firing. The install nudge should move into the
  post-signup screen at that point instead of staying buried here.
