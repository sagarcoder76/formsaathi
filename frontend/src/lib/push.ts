import { savePushSubscription, removePushSubscription } from './cloud'
import type { PushSubscriptionRow } from '../types'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
const SW_PATH = '/sw.js'

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined' &&
    Boolean(VAPID_PUBLIC_KEY)
  )
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(normalized)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((b) => { binary += String.fromCharCode(b) })
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_PATH)
  if (existing) return existing
  return navigator.serviceWorker.register(SW_PATH)
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported()) return false
  const reg = await getRegistration()
  const sub = await reg.pushManager.getSubscription()
  return Boolean(sub)
}

export async function enablePush(uid: string): Promise<PushSubscriptionRow> {
  if (!pushSupported()) throw new Error('Push notifications are not supported in this browser.')
  if (Notification.permission === 'denied') {
    throw new Error('Browser notifications are blocked. Allow them in site settings to continue.')
  }
  const reg = await getRegistration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') throw new Error('Notification permission was not granted.')
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string),
    })
  }
  const p256dh = bufferToBase64Url(sub.getKey('p256dh') as ArrayBuffer)
  const auth = bufferToBase64Url(sub.getKey('auth') as ArrayBuffer)
  const row: PushSubscriptionRow = { endpoint: sub.endpoint, p256dh, auth }
  await savePushSubscription(uid, row)
  return row
}

export async function disablePush(uid: string): Promise<void> {
  if (!pushSupported()) return
  const reg = await getRegistration()
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await removePushSubscription(uid, sub.endpoint)
    await sub.unsubscribe()
  }
}
