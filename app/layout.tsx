import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import "./globals.css"

// Google Fonts disabled for build compatibility
// const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
// const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "uncgpt",
  description: "A clean AI workspace with chat, projects, and memory.",
  icons: {
    icon: "/uncgpt.png",
    shortcut: "/uncgpt.png",
    apple: "/uncgpt.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark bg-background">
      <body className="font-sans antialiased">
        {children}
        <Toaster position="bottom-center" theme="dark" />
        {process.env.NODE_ENV === "production" && <Analytics />}
        <script src="https://js.puter.com/v2/"></script>
      </body>
    </html>
  )
}
