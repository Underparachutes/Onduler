-- Content encryption (operator-blind E2EE) — Phase 1 schema.
--
-- Spec: docs/specs/private-content-encryption.md
--
-- Additive and idempotent. NO behavior change: these columns and table are
-- written by later phases; nothing reads or requires them yet. Safe to run now.
-- Run once in the Supabase SQL Editor.
--
-- Stores the multi-slot envelope: a per-user DEK (data key) wrapped separately
-- by each unlock method. The server holds only the wrapped blobs and the public
-- salts — never a key or password.

BEGIN;

-- Recovery-code slot + password slot + the "this user's data is encrypted" flag,
-- on the existing single per-user settings row.
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS enc_enabled        boolean NOT NULL DEFAULT false,  -- flips true once rows are ciphertext
  ADD COLUMN IF NOT EXISTS enc_dek_recovery   text,   -- DEK wrapped by the recovery-code KEK (Slot 2)
  ADD COLUMN IF NOT EXISTS enc_recovery_salt  text,   -- PBKDF2 salt for the recovery-code KEK
  ADD COLUMN IF NOT EXISTS enc_dek_password   text,   -- DEK wrapped by the password KEK (Slot 3)
  ADD COLUMN IF NOT EXISTS enc_kdf_salt       text;   -- PBKDF2 salt for the password KEK

-- Passkey slot (Slot 1): one row per registered passkey, since each passkey's
-- PRF output is distinct and wraps the DEK separately.
CREATE TABLE IF NOT EXISTS user_key_passkeys (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id   text        NOT NULL,   -- WebAuthn credential id (base64url)
  enc_dek_passkey text        NOT NULL,   -- DEK wrapped by this passkey's PRF-derived KEK
  prf_salt        text        NOT NULL,   -- salt fed to the PRF eval
  label           text,                   -- optional, e.g. "iPhone"
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_key_passkeys ENABLE ROW LEVEL SECURITY;

-- Owner-only access, matching every other user-data table (auth.uid() wrapped
-- in a subselect per the DB-hardening pass).
DROP POLICY IF EXISTS "own user_key_passkeys" ON user_key_passkeys;
CREATE POLICY "own user_key_passkeys" ON user_key_passkeys
  FOR ALL USING ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS user_key_passkeys_user_id_idx ON user_key_passkeys (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_key_passkeys_credential_id_key ON user_key_passkeys (credential_id);

COMMIT;
