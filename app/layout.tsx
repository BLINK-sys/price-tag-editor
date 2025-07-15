import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Создание ценников',
  description: 'Для товаров PosPro',
  generator: '',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
