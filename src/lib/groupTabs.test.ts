import { describe, it, expect } from 'vitest'
import { groupTabsByDomain } from './groupTabs'

const makeTab = (id: number, url: string): chrome.tabs.Tab => ({
  id, url, title: `Tab ${id}`, favIconUrl: '',
  windowId: 1, active: false, pinned: false, index: id,
  highlighted: false, incognito: false, selected: false,
  discarded: false, autoDiscardable: true, groupId: -1, frozen: false,
})

describe('groupTabsByDomain', () => {
  it('groups tabs with the same root domain', () => {
    const tabs = [
      makeTab(1, 'https://mail.google.com'),
      makeTab(2, 'https://maps.google.com'),
      makeTab(3, 'https://github.com/explore'),
    ]
    const groups = groupTabsByDomain(tabs)
    expect(groups.get('google.com')).toHaveLength(2)
    expect(groups.get('github.com')).toHaveLength(1)
  })

  it('excludes tabs with invalid URLs', () => {
    const tabs = [
      makeTab(1, 'chrome://newtab/'),
      makeTab(2, 'https://example.com'),
    ]
    const groups = groupTabsByDomain(tabs)
    expect(groups.size).toBe(1)
    expect(groups.has('example.com')).toBe(true)
  })

  it('returns empty map for empty input', () => {
    expect(groupTabsByDomain([])).toEqual(new Map())
  })

  it('preserves tab order within a group', () => {
    const tabs = [makeTab(1, 'https://github.com/a'), makeTab(2, 'https://github.com/b')]
    const group = groupTabsByDomain(tabs).get('github.com')!
    expect(group[0].id).toBe(1)
    expect(group[1].id).toBe(2)
  })
})
