'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function signUp(state: unknown, formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Acquisition source: the postcard QR carries utm_source=postcard; a direct
  // arrival carries nothing. Store the raw value (so a future flyer/instagram
  // channel needs no schema change); blank maps to 'direct'. See
  // docs/specs/signup-explainer-qr-2026-06-13.md.
  const signupSource = ((formData.get('utm_source') as string) || '').trim() || 'direct'

  // Email confirmation is ON. Route the confirmation link through /auth/callback
  // (which exchanges the code for a session) and on to /protect, where the user
  // sets up their encryption keys before any content flow. Don't depend on the
  // Supabase Site URL config for this.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/protect` },
  })

  if (error) {
    return { error: error.message }
  }

  // Write signup_source once, at account creation. There's no session yet
  // (email confirmation is pending), so RLS would block the normal client —
  // use the service-role client keyed by the new user's id. ON CONFLICT DO
  // NOTHING (ignoreDuplicates) makes this write-once: a re-signup with an
  // existing email never overwrites the original attribution. Best-effort:
  // never let an attribution write failure block the signup.
  if (data.user) {
    try {
      const admin = createAdminClient()
      await admin
        .from('user_settings')
        .upsert(
          { user_id: data.user.id, signup_source: signupSource },
          { onConflict: 'user_id', ignoreDuplicates: true },
        )
    } catch {
      // swallow — attribution is not worth failing a signup over
    }
  }

  // Email confirmation is required — user needs to verify before logging in.
  // Return the address so the page can show a clear "check your email" state
  // instead of leaving the form live.
  if (!data.session) {
    return { emailSent: true as const, email }
  }

  // No-confirmation fallback (if confirmation is ever turned off again): the
  // session exists now, so send the user to set up encryption before onboarding.
  redirect('/protect')
}

export async function signIn(state: unknown, formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function resetPassword(state: unknown, formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  // Code-based reset (no magic link). The recovery email template surfaces the
  // 6–8 digit OTP via `{{ .Token }}`; the client verifies it with verifyOtp
  // (type:'recovery') and continues to /reset-password. Link-based PKCE resets
  // break across browsers/in-app webviews on phones — the OTP has no such
  // binding. No redirectTo needed.
  const { error } = await supabase.auth.resetPasswordForEmail(email)

  if (error) {
    return { error: error.message }
  }

  return { message: 'Check your email for a code.' }
}

export async function changePassword(prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const newPassword = (formData.get('new_password') as string)?.trim()
  const confirmPassword = (formData.get('confirm_password') as string)?.trim()

  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters' }
  }
  if (newPassword !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) return { error: error.message }
  return { success: true }
}
