import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useTabs } from './useTabs'

const makeTab = (id: number, url: string): chrome.tabs.Tab => ({
  id,
  url,
  title: `Tab ${id}`,
  favIconUrl: '',
  windowId: 1,
  active: false,
  pinned: false,
  index: id,
  highlighted: false,
  incognito: false,
  selected: false,
  discarded: false,
  autoDiscardable: true,
  groupId: -1,
  frozen: false,
})

describe('useTabs', () => {
  it('loads all tabs on mount', async () => {
    const tabs = [
      makeTab(1, 'https://github.com'),
      makeTab(2, 'https://google.com'),
    ]
    vi.mocked(chrome.tabs.query).mockImplementation((_q, cb) => {
      cb(tabs)
      return Promise.resolve(tabs)
    })
    vi.mocked(chrome.runtime.getURL).mockReturnValue(
      'chrome-extension://x/manager.html'
    )

    const { result } = renderHook(() => useTabs())
    await act(async () => {})
    expect(result.current.tabs).toHaveLength(2)
  })

  it('filters out the manager page tab', async () => {
    const managerUrl = 'chrome-extension://fake-ext-id/src/pages/manager/index.html'
    vi.mocked(chrome.runtime.getURL).mockReturnValue(managerUrl)
    vi.mocked(chrome.tabs.query).mockImplementation((_q, cb) => {
      cb([makeTab(1, 'https://github.com'), makeTab(2, managerUrl)])
      return Promise.resolve([])
    })

    const { result } = renderHook(() => useTabs())
    await act(async () => {})
    expect(result.current.tabs).toHaveLength(1)
  })

  it('re-queries on TABS_UPDATED message', async () => {
    vi.mocked(chrome.runtime.getURL).mockReturnValue(
      'chrome-extension://x/manager.html'
    )
    let callCount = 0
    vi.mocked(chrome.tabs.query).mockImplementation((_q, cb) => {
      cb(
        callCount === 0
          ? [makeTab(1, 'https://github.com')]
          : [
              makeTab(1, 'https://github.com'),
              makeTab(2, 'https://notion.so'),
            ]
      )
      callCount++
      return Promise.resolve([])
    })

    const { result } = renderHook(() => useTabs())
    await act(async () => {})
    expect(result.current.tabs).toHaveLength(1)

    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock
      .calls[0]?.[0]
    await act(async () => {
      listener?.({ type: 'TABS_UPDATED' }, {}, () => {})
    })
    expect(result.current.tabs).toHaveLength(2)
  })
})
