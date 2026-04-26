import { useTranslation } from 'react-i18next'
import './topbar.css'

interface TopBarProps {
  tabCount: number
  siteCount: number
  searchQuery: string
  onSearchChange: (q: string) => void
}

export function TopBar({ tabCount, siteCount, searchQuery, onSearchChange }: TopBarProps) {
  const { t } = useTranslation()

  const openSettings = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/settings/index.html') })
  }

  return (
    <header className="topbar">
      <div className="topbar-logo">
        Tab<span className="topbar-logo-accent">Flow</span>
      </div>
      <div className="search-box">
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          type="search"
          role="searchbox"
          className="search-input"
          placeholder={t('search_placeholder')}
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          aria-label={t('search_placeholder')}
        />
      </div>
      <span className="tab-count-badge">
        {t('tab_count', { count: tabCount, sites: siteCount })}
      </span>
      <button
        className="icon-btn"
        title={t('settings')}
        aria-label={t('settings')}
        onClick={openSettings}
      >
        ⚙️
      </button>
    </header>
  )
}
