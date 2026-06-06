import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import { themeScript } from '@/components/theme/theme-switcher'

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
    <html lang="es" data-theme="dark">
      <head>
        {/* Inject before first paint to avoid theme flash */}
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-void text-ink-primary font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
