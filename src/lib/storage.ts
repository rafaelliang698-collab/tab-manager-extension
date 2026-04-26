import type { LayoutItem } from 'react-grid-layout'

export type ThemeValue = 'light' | 'dark' | 'system'

export function getLayout(): Promise<LayoutItem[]> {
  return new Promise(resolve => {
    chrome.storage.local.get(['layout'], result => {
      resolve((result['layout'] as LayoutItem[]) ?? [])
    })
  })
}

export function setLayout(layout: LayoutItem[]): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.set({ layout }, () => resolve())
  })
}

export function getTheme(): Promise<ThemeValue> {
  return new Promise(resolve => {
    chrome.storage.sync.get(['theme'], result => {
      resolve((result['theme'] as ThemeValue) ?? 'system')
    })
  })
}

export function setTheme(theme: ThemeValue): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.sync.set({ theme }, () => resolve())
  })
}
