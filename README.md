# Todoro v2

A **Pomodoro timer + task manager** built as a Progressive Web App (PWA). Stay focused, track your tasks, and use it anywhere — even without internet.

> 🌐 **Live App**: [todo-ro.vercel.app](https://todo-ro.vercel.app)

---

## ✨ What You Can Do

- **Pomodoro Timer** — Start focused work sessions with customizable work and break intervals
- **Task Manager** — Add, complete, and organize your tasks alongside your timer
- **Install as an App** — Add Todoro to your home screen or desktop for a native app feel
- **Use Offline** — Once loaded, the app works without internet (see guide below)
- **Dark Theme** — Easy on the eyes during long focus sessions
- **Local First** — Everything is saved on your device and works with no account. Sign in with an emailed code only if you want your tasks on more than one device

---

## 📱 Installing Todoro on Your Device

Installing Todoro gives you a full-screen, app-like experience and enables offline use.

### Desktop (Chrome or Edge)
1. Visit the app URL in Chrome or Edge
2. Look for the **install icon** (➕) in the address bar — click it
3. Click **Install** in the prompt

### Android (Chrome)
1. Open the app URL in Chrome
2. Tap the **⋮ menu** (top right)
3. Tap **"Add to Home Screen"** or **"Install app"**
4. Tap **Add**

### iOS (Safari)
1. Open the app URL in **Safari** (must be Safari, not Chrome)
2. Tap the **Share button** (the box with an arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **Add**

---

## 📶 Using Todoro Offline

Todoro is a PWA, which means it caches itself after your first visit so you can use it without internet. Here's how to make sure it works offline:

### Step 1 — Load the app while online first
Open the app in your browser or via the installed icon **while connected to the internet**. Wait for it to fully load. This lets the service worker cache everything it needs.

### Step 2 — Don't refresh while offline
Once you're offline, **do not refresh the page or tab**. Refreshing forces the browser to re-fetch the app from the network, which will fail without internet. Simply keep the tab or app open.

### Step 3 — Use it normally
After the initial load, you can:
- ✅ Start and use the **Pomodoro timer**
- ✅ **Add, complete, and manage tasks**
- ✅ Change **settings** (timer intervals, preferences)
- ✅ View your **task history and progress**

> **Note:** Notifications may not work on all devices while offline, depending on your browser and OS.

### Tips
- If you close the app while offline and reopen it, it should still load from cache — but opening it while connected is always safer
- If you see a blank page or error offline, you likely need to reconnect and reload the app once to re-cache it
- Installed PWA users (home screen / desktop) have more reliable offline access than browser tab users

---

## 🔐 Accounts & Sync (optional)

Todoro works completely without an account — that hasn't changed. Nothing leaves
your device unless you sign in.

If you want the same tasks on your phone and your laptop, **Settings → Account**
signs you in with a 6-digit code sent to your email. There's no password. After
that:

- **Your device stays the source of truth.** Todoro reads and writes local
  storage first, so it stays instant and keeps working with no signal. The cloud
  is a copy that catches up in the background.
- **Signing out never deletes anything on your device.**
- **The first time you sign in on a device that already has tasks**, Todoro asks
  which set to keep and downloads the other as a backup file first. Your focus
  history and streak are always kept from both sides, whichever you choose.
- **Points can't be edited.** Your balance is recomputed from your session
  history rather than stored, so it reflects work you actually did.

**Not syncing?** Sync runs while the app is open and online. Open
**Settings → Account** and tap **Sync now** on both devices. If a device has
been offline a long time, give it a moment after reconnecting.

---

## 🛠️ Developer Setup

### Prerequisites
- Node.js 20+ and npm

```bash
git clone https://github.com/PatriusCastro/todoro.v2.git
cd todoro.v2/todoro.v2
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Note:** The service worker (offline support) is disabled in development mode. To test offline behavior, run a production build:
> ```bash
> npm run build && npm start
> ```

### Tech Stack
- **Next.js 16** + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Serwist** for the service worker & offline caching

### Deploying to Vercel
1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Set the **Root Directory** to `todoro.v2`
4. Deploy

---

## 🐛 Troubleshooting

**App not loading offline?**
Reconnect to the internet, open the app, let it fully load, then go offline again without refreshing.

**Blank screen after coming back to the app?**
Don't refresh — go back online first, reload once, then you can use it offline again.

**Icons or UI look broken after an update?**
Clear your browser cache (`Ctrl+Shift+Delete`) and reload while connected.

**Service worker not updating?**
Close and reopen the app, or clear app data and re-add it to your home screen.

---

**Built for focused productivity and for my girlfriend 🍅**
