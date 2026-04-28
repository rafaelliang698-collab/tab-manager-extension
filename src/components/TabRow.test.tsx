import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TabRow } from './TabRow'
import '../i18n/index'

const mockTab: chrome.tabs.Tab = {
  id: 42, url: 'https://github.com/explore', title: 'Explore · GitHub',
  favIconUrl: 'https://github.com/favicon.ico',
  windowId: 1, active: false, pinned: false, index: 0,
  highlighted: false, incognito: false, selected: false,
  discarded: false, autoDiscardable: true, groupId: -1, frozen: false,
}

describe('TabRow', () => {
  it('renders tab title', () => {
    render(<TabRow tab={mockTab} searchQuery="" />)
    expect(screen.getByText('Explore · GitHub')).toBeTruthy()
  })

  it('switches to tab on row click', () => {
    vi.mocked(chrome.tabs.update).mockImplementation((_id, _p, cb) => { cb?.(mockTab); return Promise.resolve(mockTab) })
    vi.mocked(chrome.windows.update).mockImplementation((_id, _p, cb) => { cb?.({} as chrome.windows.Window); return Promise.resolve({} as chrome.windows.Window) })
    render(<TabRow tab={mockTab} searchQuery="" />)
    fireEvent.click(screen.getByRole('button', { name: /Explore/i }))
    expect(chrome.tabs.update).toHaveBeenCalledWith(42, { active: true }, expect.any(Function))
    expect(chrome.windows.update).toHaveBeenCalledWith(1, { focused: true }, expect.any(Function))
  })

  it('closes tab when X is clicked', () => {
    vi.mocked(chrome.tabs.remove).mockImplementation((_id, cb) => { cb?.(); return Promise.resolve() })
    render(<TabRow tab={mockTab} searchQuery="" />)
    fireEvent.click(screen.getByTitle(/close tab/i))
    expect(chrome.tabs.remove).toHaveBeenCalledWith(42, expect.any(Function))
  })

  it('is hidden when title does not match searchQuery', () => {
    const { container } = render(<TabRow tab={mockTab} searchQuery="notion" />)
    expect((container.firstChild as HTMLElement).style.display).toBe('none')
  })

  it('is visible when title matches searchQuery', () => {
    const { container } = render(<TabRow tab={mockTab} searchQuery="GitHub" />)
    expect((container.firstChild as HTMLElement).style.display).not.toBe('none')
  })
})
