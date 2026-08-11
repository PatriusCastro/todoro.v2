import type { Metadata, Viewport } from "next"
import { SerwistProvider } from "@serwist/turbopack/react"
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
var tr=localStorage.getItem('todoro:theme');
var t=tr&&tr.charAt(0)==='"'?JSON.parse(tr):tr;
if(t!=='system'&&t!=='light'&&t!=='dark'){var d=localStorage.getItem('todoro:dark');t=(d==null)?'system':(JSON.parse(d)?'dark':'light');}
var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark',dark);
var a=JSON.parse(localStorage.getItem('todoro:accentTheme')||'"blue"');
if(a==='custom'){
var c=JSON.parse(localStorage.getItem('todoro:accentCustom')||'null');
if(c){var v=dark?c.dark:c.light,s=document.documentElement.style;
s.setProperty('--accent',v.accent);s.setProperty('--accent-hover',v.hover);
s.setProperty('--accent-dim',v.dim);s.setProperty('--accent-glow',v.glow);}
}else if(a&&a!=='blue')document.documentElement.setAttribute('data-theme',a);
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
  // No maximumScale / userScalable:false — blocking pinch-zoom locks out anyone
  // who needs to magnify. The layout is responsive enough not to need it.
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
        {/* Nothing registered a worker before this: next-pwa's `register: true`
            never ran, so the committed public/sw.js was served but inert. The
            worker lives at /serwist/sw.js and the route serving it sends
            Service-Worker-Allowed, so it still claims scope "/".
            reloadOnOnline is off deliberately: it defaults to true, and
            reloading the page the moment a phone regains signal would drop
            `running` and stop a focus session mid-flight.

            Disabled in dev, as next-pwa was and as the README documents.
            Serwist skips the precache manifest in development, so a registered
            worker there precaches nothing — including /offline.html — leaving
            an offline navigation with no fallback and a hard ERR_FAILED. Test
            offline against `npm run build && npm start`. */}
        <SerwistProvider
          swUrl="/serwist/sw.js"
          reloadOnOnline={false}
          disable={process.env.NODE_ENV === "development"}>
          {children}
        </SerwistProvider>
      </body>
    </html>
  )
}