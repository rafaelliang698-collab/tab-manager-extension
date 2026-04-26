import { useState, useEffect, useRef } from 'react'
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout'
import type { LayoutItem, Layout, ResponsiveLayouts } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { DomainGroup } from './DomainGroup'
import { getLayout, setLayout } from '../lib/storage'

function buildLayout(domains: string[], saved: LayoutItem[]): LayoutItem[] {
  const savedMap = new Map(saved.map(l => [l.i, l]))
  let col = 0, row = 0
  return domains.map(domain => {
    if (savedMap.has(domain)) return savedMap.get(domain)!
    const item: LayoutItem = { i: domain, x: col % 3, y: row, w: 1, h: 4 }
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
  const [layout, setLayoutState] = useState<LayoutItem[]>([])
  const savedRef = useRef<LayoutItem[]>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const { width, containerRef } = useContainerWidth()

  useEffect(() => {
    getLayout().then(saved => {
      savedRef.current = saved
      setLayoutState(buildLayout(Array.from(groups.keys()), saved))
    })
    return () => clearTimeout(saveTimer.current)
  }, [])

  useEffect(() => {
    setLayoutState(buildLayout(Array.from(groups.keys()), savedRef.current))
  }, [groups])

  const handleLayoutChange = (_current: Layout, _layouts: ResponsiveLayouts) => {
    const mutable = Array.from(_current)
    savedRef.current = mutable
    setLayoutState(mutable)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setLayout(mutable), 500)
  }

  return (
    <div ref={containerRef}>
      <ResponsiveGridLayout
        className="tab-grid"
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1200, md: 768, sm: 480 }}
        cols={{ lg: 3, md: 2, sm: 1 }}
        width={width}
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
    </div>
  )
}
