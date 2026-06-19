import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Opt into the experimental passkey auth API (sign in / register with a
    // passkey). The same passkey also carries the content-encryption PRF secret.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- experimental option not in types yet
    { auth: { experimental: { passkey: true } } } as any,
  )
}
