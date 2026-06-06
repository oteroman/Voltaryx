import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Voltaryx',
    template: '%s · Voltaryx',
  },
  description: 'Field service excellence platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Voltaryx',
  },
}

export const viewport: Viewport = {
  themeColor: '#080A0D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-void text-ink-primary font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
