import type { Metadata, Viewport } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

// Runs before first paint: resolves the saved theme (with legacy migration) and
// the OS preference, then sets the .dark class on <html> so there's no flash and
// portals/scrim inherit the right tokens.
const themeScript = `(function(){try{
var t=localStorage.getItem('todoro:theme');
if(t==null){var d=localStorage.getItem('todoro:dark');t=(d==null)?'system':(JSON.parse(d)?'dark':'light');}
var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark',dark);
}catch(e){}})();`

export const metadata: Metadata = {
  title: "Todoro",
  description: "A Pomodoro timer and task manager for deep focus sessions.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    shortcut: "/icon-512.png",
    apple: "/icon-512.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Todoro",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F6F8" },
    { media: "(prefers-color-scheme: dark)",  color: "#0F1115" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${poppins.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}