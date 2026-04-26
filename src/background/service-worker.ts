const MANAGER_PATH = 'src/pages/manager/index.html'

function broadcastTabsUpdated(): void {
  chrome.runtime.sendMessage({ type: 'TABS_UPDATED' }).catch(() => {
    // Manager page may not be open — ignore connection errors
  })
}

chrome.action.onClicked.addListener(() => {
  const managerUrl = chrome.runtime.getURL(MANAGER_PATH)
  chrome.tabs.query({ url: managerUrl }, tabs => {
    if (tabs.length > 0 && tabs[0].id != null) {
      chrome.tabs.update(tabs[0].id, { active: true })
      if (tabs[0].windowId != null) {
        chrome.windows.update(tabs[0].windowId, { focused: true })
      }
    } else {
      chrome.tabs.create({ url: managerUrl })
    }
  })
})

chrome.tabs.onCreated.addListener(broadcastTabsUpdated)
chrome.tabs.onRemoved.addListener(broadcastTabsUpdated)
chrome.tabs.onUpdated.addListener((_id, changeInfo) => {
  if (changeInfo.status === 'complete' || changeInfo.title != null) {
    broadcastTabsUpdated()
  }
})
chrome.tabs.onActivated.addListener(broadcastTabsUpdated)
