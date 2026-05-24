"use client"

import { useCallback } from "react"

export function useNotifications(enabled: boolean) {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) return false
    if (Notification.permission === "granted") return true
    if (Notification.permission === "denied") return false
    const result = await Notification.requestPermission()
    return result === "granted"
  }, [])

  const notify = useCallback(async (title: string, body: string) => {
    if (!enabled) return
    if (!("Notification" in window)) return
    if (Notification.permission !== "granted") return

    // Use service worker if available for better mobile support
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        reg.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "todoro-timer",
          renotify: true,
          silent: false,
        } as NotificationOptions)
        return
      }
    }

    // Fallback to basic Notification API
    new Notification(title, { body, icon: "/icon-192.png" })
  }, [enabled])

  return { notify, requestPermission }
}