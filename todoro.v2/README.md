# Todoro v2

A modern **Progressive Web App (PWA)** that combines a **Pomodoro timer** with a **task manager** for deep focus sessions. Works offline and installs like a native app on any device.

![Todoro](./public/icons/todoro-light.png)

## 🚀 Features

- ⏱️ **Pomodoro Timer** - Customizable work/break intervals for focused productivity
- ✅ **Task Manager** - Create, organize, and track your tasks
- 📱 **Progressive Web App (PWA)** - Install on home screen, works offline
- 🎨 **Beautiful UI** - Modern design with Tailwind CSS & smooth animations
- ⚡ **Fast & Responsive** - Built with Next.js for optimal performance
- 🌙 **Dark Theme** - Eye-friendly interface with custom color scheme
- 💾 **Local Storage** - All data stored locally on your device
- 🔔 **Notifications** - Get reminders for timer completions

## 📋 Tech Stack

- **Framework**: Next.js 16.1.6 with React 19.2.3
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 & PostCSS
- **PWA**: next-pwa for service workers
- **Icons**: React Icons
- **Font**: DM Sans (Google Fonts)

## 🛠️ Installation

### Prerequisites
- Node.js 20+ and npm

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/todoro-v2.git
cd todoro-v2/todoro.v2

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
todoro.v2/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with metadata & PWA config
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── AppShell.tsx       # Main app container
│   ├── HomePage.tsx       # Home view
│   ├── CalendarPage.tsx   # Calendar view
│   ├── TasksPage.tsx      # Tasks view
│   ├── TimerPage.tsx      # Timer view
│   ├── SettingsPage.tsx   # Settings view
│   ├── shared/            # Shared components
│   ├── tasks/             # Task-related components
│   └── timer/             # Timer-related components
├── hooks/                 # Custom React hooks
│   ├── useTimer*          # Timer-related hooks
│   ├── useTask*           # Task-related hooks
│   └── ...
├── lib/                   # Utilities & helpers
│   └── theme.ts           # Theme configuration
├── public/                # Static assets
│   ├── manifest.json      # PWA manifest
│   ├── icon-192.png       # App icon (192x192)
│   ├── icon-512.png       # App icon (512x512)
│   ├── sw.js              # Service worker
│   └── ...
├── next.config.ts         # Next.js configuration with PWA
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── package.json           # Project metadata & dependencies
```

## 🏗️ Building

```bash
# Build for production
npm run build

# Run production build locally
npm start

# Lint code
npm run lint
```

## 🚀 Deployment to Vercel

### Option 1: Automatic via GitHub (Recommended)

1. **Push code to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Select your GitHub repository
   - **Important**: Set "Root Directory" to `todoro.v2`
   - Click "Deploy"

3. **Verify PWA**:
   - Open your deployment URL
   - Open DevTools → Application → Manifest
   - Verify the manifest loads with correct icons and metadata

### Option 2: CLI Deployment

```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy from project directory
cd todoro.v2
vercel
```

### After Deployment

- **Share your URL**: Users can visit your app in any browser
- **Install as App**: Users can click the install button or use "Install app" menu
- **Auto-Deployment**: Future pushes to `main` branch auto-deploy automatically

## 📱 Installing as PWA

### On Desktop (Chrome/Edge)
1. Visit the deployed URL
2. Click the **Install** button in the address bar (or menu icon)
3. Follow the prompts

### On Mobile (Android Chrome)
1. Visit the deployed URL
2. Tap the **menu** (⋮) button
3. Select **"Install app"** or **"Add to home screen"**

### On iOS (Apple devices)
1. Open in Safari browser
2. Tap the **Share** button
3. Select **"Add to Home Screen"**

## 🔧 Configuration

### PWA Settings (`next.config.ts`)
```typescript
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})
```

### App Metadata (`app/layout.tsx`)
- Title, description, and icons configured in Next.js metadata
- Theme color set to `#2940D3` (Todoro blue)
- Status bar style optimized for mobile

### Manifest (`public/manifest.json`)
- App name: "Todoro"
- Display mode: "standalone" (full screen app)
- Categories: productivity, utilities
- Icons in maskable format for modern devices

## 💡 Development Tips

### Hot Reload
The dev server supports fast refresh. Edit files and changes appear instantly without full page reload.

### Service Worker
- Automatically generated during build
- Disables in development for easier debugging
- Enables in production for offline support
- Use `skipWaiting: true` for instant updates

### TypeScript
- Strict mode enabled for type safety
- Auto-completion and type checking throughout

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `next` | React framework with built-in optimizations |
| `next-pwa` | PWA service worker & caching |
| `react` / `react-dom` | UI library |
| `react-icons` | Icon library (5.6.0+) |
| `tailwindcss` | Utility-first CSS framework |
| `typescript` | Static type checking |

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m "feat: description"`
3. Push: `git push origin feature/your-feature`
4. Open a pull request

## 📄 License

This project is private and proprietary.

## 🐛 Troubleshooting

### Icons not showing after deploy?
- Clear browser cache: `Ctrl+Shift+Delete`
- Hard refresh: `Ctrl+F5` or `Cmd+Shift+R`
- Check DevTools → Application → Cache Storage and clear old caches

### Service worker not updating?
- Users need to close and reopen the app
- Or clear app data and reinstall from home screen

### Build fails?
- Delete `.next/` folder: `rm -r .next`
- Clear npm cache: `npm cache clean --force`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Dev server won't start?
- Make sure port 3000 is available
- Try: `npm run dev -- -p 3001` for different port

## 🔗 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Tailwind CSS](https://tailwindcss.com)

---

**Built with ❤️ for focused productivity**
