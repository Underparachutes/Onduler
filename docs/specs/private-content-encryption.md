# Spec: Operator-blind content encryption (E2EE)

*Status: draft, pre-build. Authored 2026-06-17. For: Claude Code + Josh. Goal: make a user's written content unreadable by the operator (Josh), so "sign up, Mom — I genuinely can't read your journal" is a true statement, not a promise.*

## Headline

Encrypt a small, specific set of **content fields** in the browser, with a key only the user holds, so the database stores ciphertext the operator cannot decrypt. Everything operational — email, billing, points, hours, dates, settings — stays in plaintext, because Josh explicitly wants to keep it.

This is the single biggest architectural change in the app: it touches auth, every read/write of those fields, account recovery, and a one-time data migration. But the field set is tiny and most of the app (reports, radar, ceremonies, emails) is **unaffected**. Do it now, pre-launch, while there are ~19 anchors and a handful of testers — it is the cheapest it will ever be, same logic as the DB-hardening spec.

## The one thing to understand first

RLS protects users *from each other*. It does **nothing** against the operator. Josh holds the `service_role` key and the Supabase dashboard login, which sit above RLS and can read every row. So "private even from me" cannot come from policies, toggles, or RLS. It can only come from **the server never having the decryption key**. That means the key lives in the browser, derived from the user's password, and the server only ever sees ciphertext. This document is about building exactly that.

## Threat model — be honest about it

What this **hides** from the operator (and from anyone who steals the database or a backup):

- Every motion / swell / group / milestone **label** (e.g. "therapy", "drinking less", "job hunt").
- Every **anchor (journal) entry**: ceremony reflections and free-form entries.

What this does **NOT** hide, by design (Josh wants this kept):

- **Email address** — lives in `auth.users`, always visible. So "I can see Mom has an account" stays true; "I can read what's in it" becomes false.
- **All numbers, dates, and structure** — points, hours, intensity, energy/alignment, targets, timestamps, row counts, how many swells, how often she logs in, subscription status. You won't see "drinking less," but you *will* see a swell whose points trend down. Content-blind is not activity-blind. Tell your parents that plainly.

The honest caveat you must not hide from yourself:

- The key is derived from the **login password**, and during login that password briefly passes through Supabase Auth (over TLS, to check against a hash). A *malicious* operator who modified the auth server could grab the password at that instant and derive the key. This design defends against **casual/accidental snooping by an honest operator running standard Supabase** — which is exactly your threat model ("I don't want to be able to just open the dashboard and read Mom's journal"). It does **not** defend against an operator who actively backdoors their own auth server. The only way to close that gap is a **separate encryption passphrase** the user types in addition to their password and that never goes to any server — which means another secret for non-technical parents to remember and lose. **Recommendation: reuse the login password, document this caveat.** Revisit a separate passphrase only if the trust bar ever rises (e.g. real strangers, sensitive populations).

## Scope — exactly which fields

**Encrypt (content):**

| Table | Columns |
|---|---|
| `motions` | `name` |
| `swells` | `name` |
| `groups` | `name` |
| `milestones` | `name` |
| `reflections` | `expectation_text`, `observation_text`, `intention_text`, `body_text`, `prompt_text` |

**Leave as plaintext (operational — keep all of it):** email; everything in `user_settings` except the new key columns below; all of `logs`, `wave_checkins`, `milestone_hits`, `chapters`, `motion_swells`; every numeric/date/flag/color/sort column on the tables above; `subscription_*`, `stripe_customer_id`, `signup_source`, theme, onboarding flags.

Colors, sort orders, and the relational graph stay readable — that's fine; they reveal nothing personal.

## Architecture: envelope encryption

Do **not** encrypt every field directly with a password-derived key. Use the standard **envelope** pattern — it lets the *same* data key be unlocked by several independent "slots," so we can lead with a passkey, keep a recovery code as backup, and keep a password fallback, all without re-encrypting data.

1. **DEK (Data Encryption Key)** — one random 256-bit AES-GCM key per user, generated in the browser at signup. This is what actually encrypts the content fields. It is *never* stored in plaintext anywhere.
2. **KEK (Key-Encryption-Key)** — a key that only ever **wraps/unwraps the DEK**; it never touches content directly. There can be **several KEKs**, one per unlock method (see slots below). Each is derived in the browser; the server never sees any of them.
3. **Wrapped DEK (one per slot)** — the DEK encrypted with a KEK, stored in the database. The server holds these blobs but cannot unwrap any of them.

**The unlock slots** (each is an independent wrapping of the *same* DEK):
- **Slot 1 — passkey (primary).** KEK derived from a passkey via the WebAuthn `prf` extension — the device's secure chip emits a stable, high-entropy secret the server never sees. Everyday unlock is Face ID / fingerprint; nothing to remember. This is the lead experience in v1. **Onduler is a web app / PWA, not native** — so we get OS-level key backup *through the passkey itself*: passkeys sync via iCloud Keychain / Google Password Manager automatically, carrying the `prf` secret with them. (Native key-backup APIs like iCloud Key-Value Store or Android Auto Backup do **not** apply to a web app — don't reach for them; the passkey is the web equivalent.)
- **Slot 2 — recovery code (backup).** KEK derived from a system-generated, high-entropy code. Cold storage / break-glass; carries the careless-user forcing functions (see Recovery).
- **Slot 3 — password (fallback, KEEP for v1).** KEK derived from the Supabase login password (PBKDF2, per-user salt), **wrapped silently at signup** — zero extra friction, because the user already creates that password to sign up. Two jobs: (a) universal access on devices/browsers where passkeys or `prf` aren't supported, and (b) it makes the journal recoverable from entry #1, which is what lets us **defer the scary recovery-code step** (see Onboarding flow) without risking data loss. Cost: the honest-operator password caveat applies on this path. Drop it only if we accept gating on passkey support for a stronger guarantee.

Why envelope and not direct: changing or adding any unlock method only re-wraps the DEK (one tiny write), instead of re-encrypting every row. Each slot is just another wrapping of the same DEK.

**Crypto choices (all Web Crypto, no new deps):**
- Field encryption: **AES-GCM, 256-bit**, a fresh random 96-bit IV per field.
- KEK derivation: **PBKDF2-SHA-256**, per-user random salt, high iteration count (tune to ~250ms on a mid phone). *Optional future upgrade:* Argon2id via a WASM lib if we want memory-hard derivation; PBKDF2 is fine to ship.

**On-disk field format** — store IV + ciphertext together in the same `text` column, with a version tag so we can tell encrypted from legacy plaintext during migration:

```
enc:v1:<base64url-iv>:<base64url-ciphertext+tag>
```

A value without the `enc:` prefix is legacy plaintext (see Migration). The decrypt helper checks the prefix: encrypted → decrypt; otherwise → return as-is.

**New columns** (one migration). Per-user single-row state lives on `user_settings`; the passkey slot is its own table because a user can register more than one passkey (each has a different `prf` secret → its own wrapping).

On `user_settings`:
- `enc_dek_recovery` text NULL — DEK wrapped by the recovery-code KEK (Slot 2).
- `enc_recovery_salt` text NULL — salt for the recovery-code KEK.
- `enc_dek_password` text NULL — DEK wrapped by the password KEK (Slot 3, if kept).
- `enc_kdf_salt` text NULL — per-user PBKDF2 salt for the password KEK.
- `enc_enabled` boolean NOT NULL DEFAULT false — flips true once the user's data is migrated to ciphertext.

New table `user_key_passkeys` (Slot 1, one row per registered passkey):
- `id`, `user_id` (FK, RLS `own` policy like every other table), `credential_id` text, `enc_dek_passkey` text (DEK wrapped by that passkey's `prf`-derived KEK), `prf_salt` text, `created_at`. The server stores the wrapped blob; it never sees the `prf` secret.

## Where encryption/decryption live

This is the load-bearing change. Today: server actions read plaintext from Postgres and pass it to client components. After: the server only ever handles ciphertext.

- **Write path:** the client component encrypts the content fields *before* calling the server action. The server action receives ciphertext strings and writes them blindly. Server-action signatures don't change shape — they just now receive `enc:v1:...` strings where they used to receive plaintext names/text.
- **Read path:** the server action selects the (ciphertext) rows and returns them to the client exactly as today. The **client component** decrypts the content fields before rendering. Server-side "reads" that merely pass data through to the client need *no server change* — only a client-side decrypt step is added at the render boundary.

**Key lifecycle in the browser:**
- At login/signup, take the password (already in-browser via `supabase-js`), derive the KEK, unwrap the DEK, hold the **DEK in memory** for the session (e.g. a module-level `CryptoKey`, non-extractable). Optionally cache the unwrapped DEK in IndexedDB to survive reloads; if so, mark `extractable: false` and clear on logout.
- On logout, drop the in-memory DEK and clear any IndexedDB copy.
- Build a small `lib/crypto/content.ts` module: `deriveKEK(password, salt)`, `unwrapDEK`, `wrapDEK`, `encryptField(plaintext)`, `decryptField(value)` (pass-through if not `enc:`-prefixed), plus `encryptRow`/`decryptRow` helpers keyed by a per-table field list so callsites stay one-liners.

## What breaks, and the fix for each (grounded in the code)

A focused sweep of the repo found the affected server-side touchpoints. Most of the app is untouched.

**Unaffected — confirmed, no work:**
- **Cycle-close email** (`app/api/cron/cycle-close-email/route.ts`, `lib/email-templates.ts`) — generic copy, references no names or text. Encryption does not break it.
- **Reports / radar / proficiency** — aggregate only counts/weights/hours, never names or text. No change.
- **Ceremony unlock logic** — checks log counts and dates only. No change.

**Needs work:**

1. **JSON export** — `app/api/export/route.ts` builds the export server-side and includes `swells.name`, `groups.name`, `motions.name`, the joined `motion_name` on logs, and `milestones.name`. The server can't decrypt these. **Fix:** move export generation to the **client** — fetch the (ciphertext) data, decrypt in the browser, build and download the JSON there. This also means the exported file is plaintext *for the user only*, which is correct. (The route can stay as a ciphertext fetch, or be retired in favor of client-side assembly.)

2. **LLM-assisted import** — the parser (`lib/import-parser.ts`) already runs client-side, so parsing is fine. But `confirmImport()` (`app/actions/import.ts`) does **server-side dedup**, comparing existing names case-insensitively before bulk-inserting. The server can no longer read existing names. **Fix:** move the dedup into the browser — the client fetches+decrypts existing names, dedupes against the parsed import, then sends **already-encrypted** new rows to `confirmImport()`, which inserts them blindly. The paid feature still works; only the dedup moves.

3. **Your admin user view** — `app/admin/users/[id]/page.tsx` reads `motions(name)` for an individual user. After encryption this is ciphertext. **That is the feature working as intended** — your own admin panel goes blind to content. Update it to not attempt to show names (show "🔒 encrypted" or just drop the column), so it doesn't render `enc:v1:...` garbage.

4. **Journal & archived-chapter reads** — `app/actions/reflections.ts` (`getAnchorJournal`, `getAnchorsForPeriod`, `getJournalData`) and `app/actions/chapters.ts` (`getArchivedChapterDetail`) fetch the text fields and **pass them through** to client components; none of them *inspect* the text server-side. **Fix:** no server change — add a **client-side decrypt** at each render boundary (the `JournalClient`, archived-chapter view, etc.). Lowest-effort category, but the highest number of callsites, so do it carefully.

5. **All create/update write paths** — `app/actions/motions.ts`, `swells.ts`, `groups.ts`, `milestones.ts`, `reflections.ts` (and the import insert). **Fix:** encrypt the content fields in the client component before the action call. One subtlety: `duplicateMotion` builds `"{name} (copy)"` server-side — that string-building must move client-side (decrypt → append "(copy)" → re-encrypt) since the server can't read the name.

## Recovery — the real decision (recommendation included)

Once content is encrypted with a key derived from the password, **a forgotten password can mean the journal is gone forever** — and you genuinely cannot help, which is the whole point. This matters most for exactly the non-technical users you're inviting (parents). The envelope pattern gives us options.

First, separate two cases:
- **Password *change* while logged in** — always safe and easy. The user has the DEK in memory; we just re-wrap it with the new password's KEK. One write. Never destructive. Build this regardless.
- **Password *reset* when locked out** (Supabase "forgot password" email) — this is the dangerous one. Supabase's reset lets a user set a *new* password without knowing the old one. After it, they're logged in but the wrapped DEK is sealed with the **old** KEK they no longer have. Without a second way in, the data is unrecoverable.

Options for the locked-out case:

- **A. Recovery code at signup (envelope's second wrapping).** At signup, generate a random recovery code (e.g. 5 words / a 20-char base32 string), derive a recovery-KEK from it, and store a *second* wrapped DEK (`enc_dek_recovery`). Show the code once. On reset: after the Supabase password reset, prompt for the recovery code → unwrap DEK → re-wrap with the new password. Data preserved. **Risk:** non-technical users misplace the code.

  **How to help them keep it — and the trap to avoid.** Make the code findable, but the secret must NEVER pass through Onduler's own email (Resend): Resend retains sent-email bodies in a dashboard the operator can read, so emailing the code would put a key to every user's data one click away from the operator — worse than the honest-operator caveat, because it needs no malice. Safe ways to back it up:
  - **Copy button + "download as `.txt`"** (a small recovery sheet) shown on the one-time screen.
  - **"Email it to myself" via a `mailto:` link** — opens the user's *own* mail client with the code pre-filled; they send it. The code travels browser → their mail client → their inbox; Onduler's servers and Resend never touch it. This delivers the "find the email titled X" experience safely. (Caveat: `mailto:` is inconsistent on some webmail/mobile — pair it with the copy/download options.)
  - **Do NOT send a code-free "reminder" email.** An email with no actual secret is just noise; it doesn't help anyone recover. Skip it.

  **The careless-user problem (this is the real risk).** The operator is the archetype: someone who breezes past the code screen because they don't realize it matters, then loses everything on a forgotten password. There is no way around the iron triangle — *operator-can't-see-it* + *nothing-to-save* + *recoverable-if-forgotten*, pick two — so for any code-based design we can only make losing the code hard, not make recovery possible without it. Mitigations for the password-v1 design:
  - **Auto-download a "Recovery Sheet" (`.txt`)** at setup so a copy exists by default, without the user deciding to save anything.
  - **Make them prove they have it** — require re-entering a couple of words from the code before continuing. Friction, but the single most effective defense against "didn't know it was important."
  - **Defer the ask** until the user has written something worth protecting, with blunt copy: *"Your journal is private — even we can't read it. The flip side: if you forget your password, only this code can bring it back. There is no reset."*
  - **Structural fix is the passkey route (option D)** — it removes the conscious-save burden entirely by riding recovery on the user's iCloud/Google account. See the recommendation below: pull it forward to a fast-follow, since it's the only thing that solves this for users like the operator.
- **B. Forgot = fresh start.** Simplest, most brutal. Reset works but old encrypted data stays sealed forever; offer to archive-and-start-fresh. Honest, but harsh for a journaling app parents rely on.
- **C. Operator escrow.** Wrap the DEK with an operator key too, so Josh can recover it. **Rejected — it defeats the entire goal.** Don't build it.
- **D. Passkey as the key source (WebAuthn `prf` extension) — PRIMARY for v1.** Use a passkey not just to log in, but to *derive the key*. The `prf` (a.k.a. hmac-secret) extension makes the device's secure chip emit a stable, high-entropy secret tied to the passkey — same value every time, and **the server never sees it**. Wrap the DEK with a KEK derived from that secret. **Big advantage:** this closes the honest-operator caveat above — the secret never transits Supabase Auth, so even a backdoored auth server can't derive the key. It's also password-free for the user (Face ID / fingerprint). **Catches:** `prf` support is uneven across browser/authenticator combos (recent iCloud Keychain and some hardware keys, not universal); a lost/un-synced passkey = lost data, so it **still needs a recovery code (A) as backup and a password fallback (Slot 3) for unsupported devices**; and it's meaningfully more code to get right. **Decision: primary unlock for v1**, paired with the recovery-code backup and password fallback — not a standalone solution.
- **E. TOTP / authenticator-app code — rejected as a key source.** A standard "code generator" (Google Authenticator / Authy, the rotating 6-digit codes) **cannot** seed an operator-blind key: the codes rotate every 30s (not a stable secret), and the seed behind them is generated on and known to the **server** (that's how it verifies the code). A server-known secret means the server can derive the key — which defeats the point. TOTP is fine as an *extra login factor*; it is useless as an encryption-key source. (If "code generator" instead means a one-time random *recovery code* the user stores and the server never keeps — that is option A.)

**Why the recovery secret must be system-generated, not user-chosen (don't re-propose this).** A tempting idea is to let users pick their own recovery code "like an Apple lock-screen passcode" — more personal, more memorable. It breaks the guarantee. The recovery secret wraps the DEK, and that wrapped blob (`enc_dek_recovery`) is stored in a database the operator can read. Security therefore depends entirely on the secret's *entropy*: a system-generated ~100-bit code is un-guessable, so the blob is useless to the operator; a user-chosen code is low-entropy by design (it has to be memorable), so the operator can copy the blob and **brute-force it offline** — a 4-digit PIN is 10,000 tries (milliseconds), a 6-digit is a million (seconds), and human "memorable passphrases" fall fast even with a memory-hard KDF. That hands the operator a path to decrypt everyone's data — exactly what this spec exists to prevent. Apple's passcode is safe *only* because the Secure Enclave hardware rate-limits guesses; we have no such hardware around a Postgres blob. **The correct way to get the personal, memorable, lock-screen feel is to borrow that hardware — i.e. a passkey (option D).** If a chosen secret is wanted in v1 anyway, the only safe form is a *long passphrase* (not a short code) with an enforced strength meter and Argon2id — still strictly weaker than a generated code.

**Decision for v1: passkey-led (D) as the primary unlock, recovery code (A) as backup, password (Slot 3) as fallback, B as last resort.** Rationale: the passkey is the only design that removes the conscious-save burden users like the operator trip over — recovery rides on their iCloud/Google account, which they won't lose. But a passkey can't stand alone: `prf` support isn't universal (older devices / Firefox), and a lost Apple/Google account would strand them. So:
- **Primary:** register a passkey at signup; everyday unlock is Face ID / fingerprint (Slot 1).
- **Backup:** still generate a recovery code (Slot 2) with the careless-user forcing functions above — auto-download the sheet, require partial re-entry to prove they kept it, offer copy + `mailto:`-to-self. This is the break-glass for a lost device / lost platform account.
- **Fallback:** the password slot (Slot 3) for devices/browsers without passkey support, so no one is ever locked out by their hardware. (Drop this only if we accept gating on passkey support for stronger privacy.)
- **Last resort:** if all unlock methods are lost, B — fresh start, old data archived-but-sealed, with a blunt, kind explanation.

Make the reset UI explain, before a password reset, that **resetting the login password alone does not unlock old data** — the passkey or recovery code does.

## Onboarding flow (low-friction sequencing)

The friction that drives signup drop-off is NOT the biometric unlock — users like that, it reads as modern and high-quality. The drop-off comes from a scary "save this or lose everything forever" step shoved into onboarding (the seed-phrase moment). Industry rule of thumb: each extra setup step costs ~10–15% of conversions. So sequence the three slots to push all the scary stuff *past* the moment of value:

1. **At signup — invisible.** User signs up with email + password as normal. Behind the scenes, generate the DEK and wrap it with the **password slot (Slot 3)**. Journal is encrypted and recoverable from entry #1. No warning, no code, no extra screen.
2. **Immediately after — an incentive, not a warning.** Offer "Unlock with Face ID?" → register the **passkey (Slot 1)**. Framed as a perk (faster, nicer), skippable. Becomes the daily unlock and the invisible iCloud/Google backup. (Skippable because Slot 3 already protects them.)
3. **After 3–4 entries, once value is felt — one gentle prompt.** "Your journal is private — even I can't read it. Let's make sure you never lose access." → set the **recovery code (Slot 2)** with the careless-user forcing functions. This is the only mildly-scary step, and it lands after the user cares.

The password slot at step 1 is the load-bearing trick: because they're recoverable from the first entry, deferring the recovery-code step (step 3) never risks "lost it all before they understood." Don't reorder these.

## Migrating existing data

There are already plaintext rows (≈ logs 1280, motions 49, swells 34, reflections 19, etc.). The server can't encrypt them (no key). So migrate **lazily, client-side, per user**:

1. Ship the new columns and the `enc:`-aware decrypt helper (pass-through on un-prefixed values), so the app reads mixed plaintext/ciphertext safely.
2. On a user's next login after the feature lands, if `enc_enabled = false`: in the browser, generate their DEK + salts, write the wrapped DEK(s), then read their content rows, encrypt each field, write them back, and set `enc_enabled = true`. Show a one-time "securing your data" step.
3. After every active user has migrated, the pass-through branch can stay (harmless) or be removed.

Given the tiny dataset and that these are testers/family, an acceptable simpler alternative is a clean wipe + restart — but lazy migration preserves their data and is not much more code. **Recommend lazy migration.**

## Suggested build order (incremental, each step shippable)

1. **Crypto module + schema.** `lib/crypto/content.ts` (Web Crypto: DEK generation, slot wrap/unwrap, field encrypt/decrypt, version-tagged format, pass-through) + the new columns and the `user_key_passkeys` table (with its `own` RLS policy). No behavior change yet. Unit-test round-trips and the pass-through branch.
2. **Key lifecycle + slots at auth.** Generate the DEK at signup, then wrap it into the slots: passkey (Slot 1, primary), recovery code (Slot 2, backup), password (Slot 3, fallback). At login, unlock via whichever slot the device supports — passkey first, else password — and hold the DEK in memory; clear on logout. Recovery-code forcing functions (auto-download, prove-you-saved) live here.
3. **Write paths.** Encrypt content fields in the create/update client flows for motions, swells, groups, milestones, reflections, and the import insert. Move `duplicateMotion`'s name-building client-side.
4. **Read paths.** Decrypt at every render boundary (journal, archived chapters, dashboards, settings). This is the bulk of the callsites.
5. **Feature fixes.** Client-side export; client-side import dedup; blind the admin user view.
6. **Migration.** Lazy per-user migration on next login; flip `enc_enabled`.
7. **Recovery + slot management.** Re-wrap on password change; add/remove passkeys (re-wrap a new slot); locked-out reset (unlock via passkey or recovery code → re-wrap, else fresh start). UI copy that explains the reset/data relationship.

Passkey (Slot 1) carries the most unknowns — `prf` browser support and the WebAuthn ceremonies. De-risk it with a tiny throwaway spike (register a passkey, read a stable `prf` secret on your own devices) **before** committing to the step-2 build, so you confirm it works on the devices your testers actually use.

## Open decisions / risks to watch

- **Keep or drop the password fallback (Slot 3)?** Defaulted to *keep* for universal access (and it's what enables the deferred onboarding); dropping it strengthens privacy (no password path to grab) but gates access on passkey support. Decide before step 2.
- **Validate the friction with testers (the "Mom factor").** During the test phase, ask each tester two questions: (1) *"Did setup feel too long or confusing?"* and (2) *"Do you feel safe knowing I can't read your entries — or are you more worried about losing your data?"* The answers tell you whether this audience leans convenience or maximum-security, and whether step 3's deferred prompt lands at the right moment. Cheap signal, gather it early.
- **`prf` support on your testers' real devices** — the load-bearing unknown for the passkey-primary decision. Spike it first (see build order). If it's too patchy, fall back to password-primary + passkey-as-enhancement.
- **DEK caching** — in-memory only (re-derive each reload, ~250ms) vs IndexedDB cache (smoother, slightly larger attack surface on a shared device). Recommend IndexedDB with `extractable: false`, cleared on logout.
- **PBKDF2 vs Argon2id** — ship PBKDF2 for the password/recovery KEKs; note Argon2id as a future hardening.
- **The honest-operator caveat** (password transits Supabase Auth at login) — applies only to the password fallback path now; the passkey path closes it. Accepted for this threat model.
- **Don't lose the DEK to a half-finished migration** — the per-user migration must be idempotent and atomic enough that an interrupted run never strands a user between plaintext and ciphertext with no readable key.

## Explicitly out of scope (v1)

- Encrypting numbers, dates, structure, colors, or any operational field. Josh wants these visible.
- Hiding metadata (account existence, email, activity volume, timing). Not achievable without far more work; not requested.
- Operator key escrow (option C) and TOTP-as-key-source (option E) — both rejected outright.
- **Passkey as key source (option D) is the primary v1 unlock** — it's the structural fix for users who won't save a recovery code (the operator included). Paired with a recovery-code backup and a password fallback for unsupported devices.
- A separate, never-transmitted encryption passphrase. Reconsider only if defending against a malicious operator becomes a requirement — though passkey `prf` (option D) is the better way to close that gap.
