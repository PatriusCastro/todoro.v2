import type { Metadata, Viewport } from "next"
import "./globals.css"

// Archivo is self-hosted from /public/fonts (see the @font-face block in
// globals.css) rather than pulled through next/font/google. next/font fetches
// from fonts.googleapis.com at *build* time, which makes the build fail on any
// machine or CI runner without access to it — the repo carried that dependency
// silently until a cache miss exposed it. Vendoring the three woff2 subsets
// (~81 KB for the whole 100–900 variable range) removes it and matches the
// offline-first promise the app already makes.

// Runs before first paint: resolves the saved theme (with legacy migration) and
// the OS preference, then sets the .dark class on <html> so there's no flash and
// portals/scrim inherit the right tokens.
const themeScript = `(function(){try{
var t=localStorage.getItem('todoro:theme');
if(t==null){var d=localStorage.getItem('todoro:dark');t=(d==null)?'system':(JSON.parse(d)?'dark':'light');}
var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark',dark);
var a=JSON.parse(localStorage.getItem('todoro:accentTheme')||'"blue"');
if(a&&a!=='blue')document.documentElement.setAttribute('data-theme',a);
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
    { media: "(prefers-color-scheme: light)", color: "#F4F4F6" },
    { media: "(prefers-color-scheme: dark)",  color: "#0C0C0F" },
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
        <link
          rel="preload"
          href="/fonts/archivo-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}