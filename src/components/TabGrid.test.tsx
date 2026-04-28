import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TabGrid } from './TabGrid'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
global.ResizeObserver = vi.fn().mockImplementation(function () {
  return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }
}) as unknown as typeof ResizeObserver

const makeTab = (id: number, url: string): chrome.tabs.Tab => ({
  id, url, title: `Tab ${id}`, favIconUrl: '',
  windowId: 1, active: false, pinned: false, index: id,
  highlighted: false, incognito: false, selected: false,
  discarded: false, autoDiscardable: true, groupId: -1, frozen: false,
})

const groups = new Map([
  ['github.com', [makeTab(1, 'https://github.com/a')]],
  ['notion.so', [makeTab(2, 'https://notion.so/b')]],
])

describe('TabGrid', () => {
  beforeEach(() => {
    vi.mocked(chrome.storage.local.get).mockImplementation((_k, cb) => cb({}))
    vi.mocked(chrome.storage.local.set).mockImplementation((_o, cb) => cb?.())
  })

  it('renders a card for each domain group', () => {
    render(<TabGrid groups={groups} searchQuery="" />)
    expect(screen.getByText('github.com')).toBeTruthy()
    expect(screen.getByText('notion.so')).toBeTruthy()
  })
})
