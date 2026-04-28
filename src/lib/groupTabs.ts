import { getRootDomain } from './domain'

export function groupTabsByDomain(
  tabs: chrome.tabs.Tab[]
): Map<string, chrome.tabs.Tab[]> {
  const groups = new Map<string, chrome.tabs.Tab[]>()
  for (const tab of tabs) {
    const domain = getRootDomain(tab.url)
    if (!domain) continue
    if (!groups.has(domain)) groups.set(domain, [])
    groups.get(domain)!.push(tab)
  }
  return groups
}
