import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Onduler',
    short_name: 'Onduler',
    description: 'Ride your waves. Hold your tides.',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#151918',
    theme_color: '#151918',
    icons: [
      {
        src: '/icon-192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
