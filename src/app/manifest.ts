import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Villa Paris Gestionale',
    short_name: 'Villa Paris',
    description: 'Gestione operativa di Villa Paris, ottimizzata per iPad.',
    start_url: '/dashboard?source=app',
    display: 'standalone',
    background_color: '#f4f2ed',
    theme_color: '#173c37',
    orientation: 'any',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/app-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/app-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      { name: 'Calendario', short_name: 'Calendario', url: '/calendario', icons: [{ src: '/app-icon.svg', sizes: 'any' }] },
      { name: 'Nuovo evento', short_name: 'Nuovo', url: '/nuovo-evento', icons: [{ src: '/app-icon.svg', sizes: 'any' }] },
    ],
  }
}
