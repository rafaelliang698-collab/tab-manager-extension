import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DomainGroup } from './DomainGroup'

const makeTabs = (count: number): chrome.tabs.Tab[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1, url: `https://github.com/page-${i}`, title: `GitHub Page ${i}`,
    favIconUrl: '', windowId: 1, active: false, pinned: false, index: i,
    highlighted: false, incognito: false, selected: false,
    discarded: false, autoDiscardable: true, groupId: -1,
  }))

describe('DomainGroup', () => {
  it('renders domain name', () => {
    render(<DomainGroup domain="github.com" tabs={makeTabs(2)} searchQuery="" />)
    expect(screen.getByText('github.com')).toBeTruthy()
  })

  it('renders tab count badge', () => {
    render(<DomainGroup domain="github.com" tabs={makeTabs(3)} searchQuery="" />)
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('renders a TabRow for each tab', () => {
    render(<DomainGroup domain="github.com" tabs={makeTabs(2)} searchQuery="" />)
    expect(screen.getAllByRole('button', { name: /GitHub Page/ })).toHaveLength(2)
  })

  it('closes all tabs on close-all click', () => {
    vi.mocked(chrome.tabs.remove).mockImplementation((_ids, cb) => { cb?.(); return Promise.resolve() })
    render(<DomainGroup domain="github.com" tabs={makeTabs(2)} searchQuery="" />)
    fireEvent.click(screen.getByTitle('Close all'))
    expect(chrome.tabs.remove).toHaveBeenCalledWith([1, 2], expect.any(Function))
  })
})
