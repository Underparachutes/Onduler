'use server'

import { createClient } from '@/lib/supabase/server'

type ContactState = { ok: true } | { ok: false; error: string } | undefined

export async function submitContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = formData.get('name')?.toString().trim()
  const email = formData.get('email')?.toString().trim()
  const subject = formData.get('subject')?.toString().trim()
  const message = formData.get('message')?.toString().trim()

  if (!name || !email || !subject || !message) {
    return { ok: false, error: 'All fields are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('contact_submissions').insert({
    name,
    email,
    subject,
    message,
  })

  if (error) {
    return { ok: false, error: 'Something went wrong. Please try again or email us directly.' }
  }

  return { ok: true }
}
