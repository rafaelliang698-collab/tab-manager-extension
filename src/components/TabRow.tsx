import { useTranslation } from 'react-i18next'

interface TabRowProps {
  tab: chrome.tabs.Tab
  searchQuery: string
}

export function TabRow({ tab, searchQuery }: TabRowProps) {
  const { t } = useTranslation()

  const isHidden =
    searchQuery.length > 0 &&
    !tab.title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !tab.url?.toLowerCase().includes(searchQuery.toLowerCase())

  const handleClick = () => {
    if (tab.id == null) return
    chrome.tabs.update(tab.id, { active: true }, () => {
      if (tab.windowId != null) chrome.windows.update(tab.windowId, { focused: true }, () => {})
    })
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (tab.id != null) chrome.tabs.remove(tab.id, () => {})
  }

  const faviconUrl = tab.favIconUrl ||
    `chrome://favicon2/?size=16&pageUrl=${encodeURIComponent(tab.url ?? '')}`

  return (
    <div
      style={{ display: isHidden ? 'none' : undefined }}
      className="tab-row"
      role="button"
      aria-label={tab.title}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => { if (e.key === 'Enter') handleClick() }}
    >
      <img
        className="tab-favicon"
        src={faviconUrl}
        alt=""
        width={14}
        height={14}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      <span className="tab-title" title={tab.title}>{tab.title}</span>
      <button
        className="tab-close"
        title={t('close_tab')}
        aria-label={t('close_tab')}
        onClick={handleClose}
      >
        ✕
      </button>
    </div>
  )
}
