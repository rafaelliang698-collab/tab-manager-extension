import { describe, it, expect, vi } from 'vitest'
import { getLayout, setLayout, getTheme, setTheme } from './storage'
import type { Layout } from 'react-grid-layout'

describe('getLayout', () => {
  it('returns stored layout', async () => {
    vi.mocked(chrome.storage.local.get).mockImplementation((_k, cb) => {
      cb({ layout: [{ i: 'github.com', x: 0, y: 0, w: 1, h: 3 }] })
    })
    const result = await getLayout()
    expect(result).toEqual([{ i: 'github.com', x: 0, y: 0, w: 1, h: 3 }])
  })

  it('returns empty array when nothing stored', async () => {
    vi.mocked(chrome.storage.local.get).mockImplementation((_k, cb) => cb({}))
    expect(await getLayout()).toEqual([])
  })
})

describe('setLayout', () => {
  it('calls chrome.storage.local.set with layout key', async () => {
    vi.mocked(chrome.storage.local.set).mockImplementation((_o, cb) => cb?.())
    const layout: Layout[] = [{ i: 'github.com', x: 0, y: 0, w: 1, h: 3 }]
    await setLayout(layout)
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ layout }, expect.any(Function))
  })
})

describe('getTheme', () => {
  it('returns stored theme', async () => {
    vi.mocked(chrome.storage.sync.get).mockImplementation((_k, cb) => cb({ theme: 'dark' }))
    expect(await getTheme()).toBe('dark')
  })

  it('returns system as default', async () => {
    vi.mocked(chrome.storage.sync.get).mockImplementation((_k, cb) => cb({}))
    expect(await getTheme()).toBe('system')
  })
})

describe('setTheme', () => {
  it('calls chrome.storage.sync.set with theme key', async () => {
    vi.mocked(chrome.storage.sync.set).mockImplementation((_o, cb) => cb?.())
    await setTheme('light')
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ theme: 'light' }, expect.any(Function))
  })
})
