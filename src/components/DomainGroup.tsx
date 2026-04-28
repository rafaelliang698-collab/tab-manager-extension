import { useTranslation } from 'react-i18next'
import { TabRow } from './TabRow'

interface DomainGroupProps {
  domain: string
  tabs: chrome.tabs.Tab[]
  searchQuery: string
}

export function DomainGroup({ domain, tabs, searchQuery }: DomainGroupProps) {
  const { t } = useTranslation()

  const handleCloseAll = () => {
    const ids = tabs.map(tab => tab.id).filter((id): id is number => id != null)
    chrome.tabs.remove(ids, () => {})
  }

  const faviconUrl = `chrome://favicon2/?size=16&pageUrl=${encodeURIComponent(
    tabs[0]?.url ?? `https://${domain}`
  )}`

  return (
    <div className="domain-group">
      <div className="group-header">
        <img
          className="group-favicon"
          src={faviconUrl}
          alt=""
          width={16}
          height={16}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <span className="group-domain">{domain}</span>
        <span className="group-count">{tabs.length}</span>
        <button
          className="close-all-btn"
          title="Close all"
          aria-label={t('close_all')}
          onClick={handleCloseAll}
        >
          {t('close_all')}
        </button>
      </div>
      <div className="tab-list">
        {tabs.map(tab => (
          <TabRow key={tab.id} tab={tab} searchQuery={searchQuery} />
        ))}
      </div>
    </div>
  )
}
