import type { Layout } from 'react-grid-layout'

export type ThemeValue = 'light' | 'dark' | 'system'

export function getLayout(): Promise<Layout[]> {
  return new Promise(resolve => {
    chrome.storage.local.get(['layout'], result => {
      resolve((result.layout as Layout[]) ?? [])
    })
  })
}

export function setLayout(layout: Layout[]): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.set({ layout }, () => resolve())
  })
}

export function getTheme(): Promise<ThemeValue> {
  return new Promise(resolve => {
    chrome.storage.sync.get(['theme'], result => {
      resolve((result.theme as ThemeValue) ?? 'system')
    })
  })
}

export function setTheme(theme: ThemeValue): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.sync.set({ theme }, () => resolve())
  })
}
