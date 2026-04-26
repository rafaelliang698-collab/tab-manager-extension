import type { LayoutItem } from 'react-grid-layout'

export type ThemeValue = 'light' | 'dark' | 'system'

const VALID_THEMES = new Set<ThemeValue>(['light', 'dark', 'system'])

function isValidTheme(v: unknown): v is ThemeValue {
  return typeof v === 'string' && VALID_THEMES.has(v as ThemeValue)
}

export function getLayout(): Promise<LayoutItem[]> {
  return new Promise(resolve => {
    chrome.storage.local.get(['layout'], result => {
      if (chrome.runtime.lastError) { resolve([]); return }
      const stored = result['layout']
      resolve(Array.isArray(stored) ? (stored as LayoutItem[]) : [])
    })
  })
}

export function setLayout(layout: LayoutItem[]): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.set({ layout }, () => {
      if (chrome.runtime.lastError) console.warn('TabFlow: failed to save layout')
      resolve()
    })
  })
}

export function getTheme(): Promise<ThemeValue> {
  return new Promise(resolve => {
    chrome.storage.sync.get(['theme'], result => {
      if (chrome.runtime.lastError) { resolve('system'); return }
      const stored = result['theme']
      resolve(isValidTheme(stored) ? stored : 'system')
    })
  })
}

export function setTheme(theme: ThemeValue): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.sync.set({ theme }, () => {
      if (chrome.runtime.lastError) console.warn('TabFlow: failed to save theme')
      resolve()
    })
  })
}
