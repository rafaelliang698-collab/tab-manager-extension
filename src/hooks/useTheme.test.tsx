import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  it('loads stored theme on mount', async () => {
    vi.mocked(chrome.storage.sync.get).mockImplementation((_k, cb) => cb({ theme: 'dark' }))
    const { result } = renderHook(() => useTheme())
    await act(async () => {})
    expect(result.current.theme).toBe('dark')
  })

  it('defaults to system when nothing stored', async () => {
    vi.mocked(chrome.storage.sync.get).mockImplementation((_k, cb) => cb({}))
    const { result } = renderHook(() => useTheme())
    await act(async () => {})
    expect(result.current.theme).toBe('system')
  })

  it('sets data-theme on documentElement', async () => {
    vi.mocked(chrome.storage.sync.get).mockImplementation((_k, cb) => cb({ theme: 'dark' }))
    renderHook(() => useTheme())
    await act(async () => {})
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('setTheme updates storage and DOM', async () => {
    vi.mocked(chrome.storage.sync.get).mockImplementation((_k, cb) => cb({}))
    vi.mocked(chrome.storage.sync.set).mockImplementation((_o, cb) => cb?.())
    const { result } = renderHook(() => useTheme())
    await act(async () => {})
    await act(async () => {
      result.current.setTheme('light')
    })
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ theme: 'light' }, expect.any(Function))
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
