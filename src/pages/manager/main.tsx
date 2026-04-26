import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useTabs } from '../../hooks/useTabs'
import { useTheme } from '../../hooks/useTheme'
import { groupTabsByDomain } from '../../lib/groupTabs'
import { TopBar } from '../../components/TopBar'
import { TabGrid } from '../../components/TabGrid'
import '../../i18n/index'
import '../../styles/global.css'

function App() {
  const { tabs } = useTabs()
  useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const groups = groupTabsByDomain(tabs)

  return (
    <div className="app-layout">
      <TopBar
        tabCount={tabs.length}
        siteCount={groups.size}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      {tabs.length === 0
        ? <div className="empty-state">No open tabs</div>
        : <TabGrid groups={groups} searchQuery={searchQuery} />
      }
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
)
