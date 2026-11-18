import { useSyncExternalStore } from 'react'

export const THEME_STORAGE_KEY = 'fs-dark'
const THEME_EVENT = 'fs-theme-change'

export function readDarkPreference(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw !== null) return JSON.parse(raw) === true
  } catch {
    // Ignore storage read errors
  }
  return false
}

export function applyThemeToDom(isDark: boolean): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
}

export function initTheme(): void {
  applyThemeToDom(readDarkPreference())
}

export function setDarkPreference(next: boolean): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore storage quota errors
  }
  applyThemeToDom(next)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(THEME_EVENT))
  }
}

function subscribeTheme(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => {
    applyThemeToDom(readDarkPreference())
    callback()
  }
  window.addEventListener(THEME_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(THEME_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export function useTheme() {
  const dark = useSyncExternalStore(subscribeTheme, readDarkPreference, () => false)
  return {
    dark,
    setDark: setDarkPreference,
    toggleTheme: () => setDarkPreference(!dark),
  }
}
