import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Villa Paris Gestionale',
  description: 'Sistema di gestione eventi Villa Paris',
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
