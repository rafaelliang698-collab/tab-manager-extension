import { useState, useEffect, useCallback } from 'react'

interface UseTabsResult {
  tabs: chrome.tabs.Tab[]
}

export function useTabs(): UseTabsResult {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([])

  const refresh = useCallback(() => {
    const managerUrl = chrome.runtime.getURL('src/pages/manager/index.html')
    chrome.tabs.query({}, (allTabs) => {
      setTabs(allTabs.filter((t) => t.url !== managerUrl))
    })
  }, [])

  useEffect(() => {
    refresh()
    const listener = (msg: unknown) => {
      if (
        typeof msg === 'object' &&
        msg !== null &&
        (msg as { type: string }).type === 'TABS_UPDATED'
      ) {
        refresh()
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [refresh])

  return { tabs }
}
