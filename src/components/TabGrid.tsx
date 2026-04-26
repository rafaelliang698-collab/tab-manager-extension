import { useState, useEffect, useRef } from 'react'
import { ResponsiveGridLayout } from 'react-grid-layout'
import type { Layout, ResponsiveLayouts } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { DomainGroup } from './DomainGroup'
import { getLayout, setLayout } from '../lib/storage'

function buildLayout(domains: string[], saved: Layout[]): Layout[] {
  const savedMap = new Map(saved.map(l => [l.i, l]))
  let col = 0, row = 0
  return domains.map(domain => {
    if (savedMap.has(domain)) return savedMap.get(domain)!
    const item: Layout = { i: domain, x: col % 3, y: row, w: 1, h: 4 }
    col++
    if (col % 3 === 0) row += 4
    return item
  })
}

interface TabGridProps {
  groups: Map<string, chrome.tabs.Tab[]>
  searchQuery: string
}

export function TabGrid({ groups, searchQuery }: TabGridProps) {
  const [layout, setLayoutState] = useState<Layout[]>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    getLayout().then(saved => {
      setLayoutState(buildLayout(Array.from(groups.keys()), saved))
    })
  }, [])

  useEffect(() => {
    setLayoutState(prev => buildLayout(Array.from(groups.keys()), prev))
  }, [groups])

  const handleLayoutChange = (current: Layout, _layouts: ResponsiveLayouts) => {
    setLayoutState(current)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setLayout(current), 500)
  }

  return (
    <ResponsiveGridLayout
      className="tab-grid"
      layouts={{ lg: layout }}
      breakpoints={{ lg: 1200, md: 768, sm: 480 }}
      cols={{ lg: 3, md: 2, sm: 1 }}
      rowHeight={60}
      dragConfig={{ handle: '.group-header' }}
      onLayoutChange={handleLayoutChange}
    >
      {Array.from(groups.entries()).map(([domain, tabs]) => (
        <div key={domain}>
          <DomainGroup domain={domain} tabs={tabs} searchQuery={searchQuery} />
        </div>
      ))}
    </ResponsiveGridLayout>
  )
}
