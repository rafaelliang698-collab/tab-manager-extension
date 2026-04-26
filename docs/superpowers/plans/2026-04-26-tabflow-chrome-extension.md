# TabFlow Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build TabFlow, a Chrome MV3 extension that displays all open tabs grouped by root domain in a multi-column resizable grid with glassmorphism dual-theme UI, real-time sync, and bilingual (zh/en) support.

**Architecture:** A dedicated `chrome-extension://` page opened from the toolbar icon serves as the main UI — a `react-grid-layout` grid of domain group cards each showing favicon + tab rows. A MV3 service worker listens to tab events and broadcasts `TABS_UPDATED` messages for real-time sync. Theme and layout positions persist via `chrome.storage`.

**Tech Stack:** React 18, TypeScript 5, Vite 5, @crxjs/vite-plugin@beta, react-grid-layout 1.x, react-i18next 14.x, i18next, tldts 6.x, vitest, @testing-library/react, jsdom

---

## File Map

```
/Volumes/alex-agent/projects/002_chrome_plug-in_program/
├── manifest.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── package.json
├── public/icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── _locales/
│   ├── en/messages.json
│   └── zh_CN/messages.json
├── src/
│   ├── background/
│   │   └── service-worker.ts        ← tab events + action click handler
│   ├── pages/
│   │   ├── manager/
│   │   │   ├── index.html
│   │   │   └── main.tsx             ← React root, wires all components
│   │   └── settings/
│   │       ├── index.html
│   │       └── main.tsx
│   ├── components/
│   │   ├── TopBar.tsx               ← logo + search + tab count + settings link
│   │   ├── TabGrid.tsx              ← react-grid-layout wrapper, layout persistence
│   │   ├── DomainGroup.tsx          ← single domain card: header + tab list
│   │   ├── TabRow.tsx               ← single tab row: favicon + title + close btn
│   │   └── SettingsPanel.tsx        ← theme radio: light/dark/system
│   ├── hooks/
│   │   ├── useTabs.ts               ← chrome.tabs.query + TABS_UPDATED listener
│   │   └── useTheme.ts              ← storage.sync theme read/write + DOM sync
│   ├── lib/
│   │   ├── domain.ts                ← URL → eTLD+1 root domain
│   │   ├── groupTabs.ts             ← Tab[] → Map<domain, Tab[]>
│   │   └── storage.ts               ← typed chrome.storage.local/sync wrappers
│   ├── i18n/
│   │   ├── index.ts                 ← i18next init
│   │   ├── en.json
│   │   └── zh.json
│   ├── styles/
│   │   └── tokens.css               ← CSS custom properties for both themes
│   │   └── global.css               ← base styles + component CSS
│   └── test/
│       └── setup.ts                 ← global chrome API mock
└── docs/superpowers/plans/
    └── 2026-04-26-tabflow-chrome-extension.md
```

---

## Task 1: Bootstrap Project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `manifest.json`, `src/test/setup.ts`

- [ ] **Step 1: Scaffold with Vite react-ts template**

```bash
cd /Volumes/alex-agent/projects/002_chrome_plug-in_program
pnpm create vite@latest . -- --template react-ts
```

When prompted about existing files, keep existing `CLAUDE.md`.

- [ ] **Step 2: Install runtime dependencies**

```bash
pnpm add react-grid-layout react-i18next i18next tldts
```

- [ ] **Step 3: Install dev dependencies**

```bash
pnpm add -D @crxjs/vite-plugin@beta @types/react-grid-layout vitest @testing-library/react @testing-library/user-event @vitest/coverage-v8 jsdom
```

- [ ] **Step 4: Write `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "__MSG_extName__",
  "description": "__MSG_extDescription__",
  "version": "1.0.0",
  "default_locale": "en",
  "permissions": ["tabs", "storage"],
  "action": {
    "default_icon": {
      "16": "public/icons/icon16.png",
      "48": "public/icons/icon48.png",
      "128": "public/icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "icons": {
    "16": "public/icons/icon16.png",
    "48": "public/icons/icon48.png",
    "128": "public/icons/icon128.png"
  }
}
```

- [ ] **Step 5: Write `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      input: {
        manager: 'src/pages/manager/index.html',
        settings: 'src/pages/settings/index.html',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
})
```

- [ ] **Step 6: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 7: Write Chrome API mock `src/test/setup.ts`**

```typescript
import { vi } from 'vitest'

const mockListeners = new Map<string, Set<(...args: unknown[]) => void>>()

function makeEvent(name: string) {
  return {
    addListener: vi.fn((cb: (...args: unknown[]) => void) => {
      if (!mockListeners.has(name)) mockListeners.set(name, new Set())
      mockListeners.get(name)!.add(cb)
    }),
    removeListener: vi.fn((cb: (...args: unknown[]) => void) => {
      mockListeners.get(name)?.delete(cb)
    }),
    dispatch: (...args: unknown[]) => {
      mockListeners.get(name)?.forEach(cb => cb(...args))
    },
  }
}

export const chromeMock = {
  tabs: {
    query: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    create: vi.fn(),
    onCreated: makeEvent('tabs.onCreated'),
    onRemoved: makeEvent('tabs.onRemoved'),
    onUpdated: makeEvent('tabs.onUpdated'),
    onActivated: makeEvent('tabs.onActivated'),
  },
  windows: { update: vi.fn() },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      onChanged: makeEvent('storage.local.onChanged'),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      onChanged: makeEvent('storage.sync.onChanged'),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    getURL: vi.fn((path: string) => `chrome-extension://fake-ext-id/${path}`),
    onMessage: makeEvent('runtime.onMessage'),
  },
  action: { onClicked: makeEvent('action.onClicked') },
}

Object.defineProperty(global, 'chrome', { value: chromeMock, writable: true })

beforeEach(() => {
  vi.clearAllMocks()
  mockListeners.clear()
})
```

- [ ] **Step 8: Add scripts to `package.json`** (add to existing `"scripts"`)

```json
"dev": "vite",
"build": "tsc && vite build",
"test": "vitest run",
"test:watch": "vitest",
"coverage": "vitest run --coverage"
```

- [ ] **Step 9: Verify test infrastructure**

```bash
pnpm test
```

Expected: vitest runs with 0 test files, exits 0.

- [ ] **Step 10: Commit**

```bash
git init
git add -A
git commit -m "feat: bootstrap TabFlow Chrome extension project"
```

---

## Task 2: CSS Token System

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`

- [ ] **Step 1: Write `src/styles/tokens.css`**

```css
:root,
[data-theme="light"] {
  --bg-page: linear-gradient(135deg, #eef2ff 0%, #f5f7ff 40%, #eff4ff 100%);
  --glass-bg: rgba(255, 255, 255, 0.62);
  --glass-border: rgba(180, 180, 220, 0.28);
  --glass-border-inner: rgba(180, 180, 220, 0.18);
  --card-shadow: 0 2px 16px rgba(100, 100, 180, 0.10), inset 0 1px 0 rgba(255,255,255,0.9);
  --topbar-bg: rgba(255, 255, 255, 0.70);
  --text: #2d2d4e;
  --text-strong: #1a1a2e;
  --text-muted: #9090b0;
  --accent: #6366f1;
  --accent-bg: rgba(99, 102, 241, 0.10);
  --row-hover: rgba(99, 102, 241, 0.07);
  --close-hover-bg: rgba(239, 68, 68, 0.10);
  --close-hover-color: #ef4444;
  --search-bg: rgba(255, 255, 255, 0.80);
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}

[data-theme="dark"] {
  --bg-page: linear-gradient(135deg, #0a0a1a 0%, #111128 40%, #0f1525 100%);
  --glass-bg: rgba(255, 255, 255, 0.06);
  --glass-border: rgba(255, 255, 255, 0.11);
  --glass-border-inner: rgba(255, 255, 255, 0.07);
  --card-shadow: 0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08);
  --topbar-bg: rgba(10, 10, 26, 0.80);
  --text: rgba(220, 220, 240, 0.85);
  --text-strong: rgba(230, 230, 250, 0.95);
  --text-muted: rgba(180, 180, 210, 0.45);
  --accent: #818cf8;
  --accent-bg: rgba(129, 140, 248, 0.15);
  --row-hover: rgba(255, 255, 255, 0.06);
  --close-hover-bg: rgba(239, 68, 68, 0.20);
  --close-hover-color: #f87171;
  --search-bg: rgba(255, 255, 255, 0.06);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg-page: linear-gradient(135deg, #0a0a1a 0%, #111128 40%, #0f1525 100%);
    --glass-bg: rgba(255, 255, 255, 0.06);
    --glass-border: rgba(255, 255, 255, 0.11);
    --glass-border-inner: rgba(255, 255, 255, 0.07);
    --card-shadow: 0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08);
    --topbar-bg: rgba(10, 10, 26, 0.80);
    --text: rgba(220, 220, 240, 0.85);
    --text-strong: rgba(230, 230, 250, 0.95);
    --text-muted: rgba(180, 180, 210, 0.45);
    --accent: #818cf8;
    --accent-bg: rgba(129, 140, 248, 0.15);
    --row-hover: rgba(255, 255, 255, 0.06);
    --close-hover-bg: rgba(239, 68, 68, 0.20);
    --close-hover-color: #f87171;
    --search-bg: rgba(255, 255, 255, 0.06);
  }
}
```

- [ ] **Step 2: Write `src/styles/global.css`**

```css
@import './tokens.css';

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
body {
  font-family: -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  background: var(--bg-page);
  color: var(--text);
  min-height: 100vh;
}

/* react-grid-layout */
.react-grid-item.react-grid-placeholder {
  background: var(--accent-bg);
  border: 2px dashed var(--accent);
  border-radius: 12px;
  opacity: 0.6;
}
.react-resizable-handle { opacity: 0; transition: opacity var(--duration-fast); }
.react-grid-item:hover .react-resizable-handle { opacity: 1; }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 3px; }

/* App layout */
.app-layout { display: flex; flex-direction: column; min-height: 100vh; }
.empty-state {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); font-size: 14px;
}

/* TopBar */
.topbar {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 20px;
  background: var(--topbar-bg);
  border-bottom: 1px solid var(--glass-border);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  position: sticky; top: 0; z-index: 10;
}
.topbar-logo { font-size: 15px; font-weight: 700; letter-spacing: -0.3px; color: var(--text-strong); flex-shrink: 0; }
.topbar-logo-accent { color: var(--accent); }
.search-box {
  flex: 1; display: flex; align-items: center; gap: 8px;
  background: var(--search-bg); border: 1px solid var(--glass-border);
  border-radius: 8px; padding: 6px 12px;
}
.search-icon { font-size: 12px; color: var(--text-muted); }
.search-input { background: none; border: none; outline: none; font-size: 12px; color: var(--text); width: 100%; }
.search-input::placeholder { color: var(--text-muted); }
.search-input::-webkit-search-cancel-button { display: none; }
.tab-count-badge { font-size: 11px; color: var(--text-muted); flex-shrink: 0; white-space: nowrap; }
.icon-btn {
  width: 32px; height: 32px; border-radius: 8px;
  border: 1px solid var(--glass-border); background: var(--glass-bg);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; font-size: 14px;
  transition: background var(--duration-fast);
}
.icon-btn:hover { background: var(--row-hover); }

/* DomainGroup */
.domain-group {
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  border-radius: 12px; overflow: hidden;
  backdrop-filter: blur(12px) saturate(140%); -webkit-backdrop-filter: blur(12px) saturate(140%);
  box-shadow: var(--card-shadow); height: 100%;
  display: flex; flex-direction: column;
}
.group-header {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px 8px; border-bottom: 1px solid var(--glass-border-inner);
  flex-shrink: 0; cursor: grab;
}
.group-header:active { cursor: grabbing; }
.group-favicon { width: 16px; height: 16px; border-radius: 3px; object-fit: contain; flex-shrink: 0; }
.group-domain { font-size: 12px; font-weight: 600; color: var(--text-strong); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.group-count { font-size: 10px; font-weight: 600; color: var(--accent); background: var(--accent-bg); border-radius: 10px; padding: 1px 7px; flex-shrink: 0; }
.close-all-btn {
  font-size: 10px; color: var(--text-muted); background: none; border: none;
  cursor: pointer; padding: 2px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0;
  transition: background var(--duration-fast), color var(--duration-fast);
}
.close-all-btn:hover { background: var(--close-hover-bg); color: var(--close-hover-color); }
.tab-list { padding: 6px 8px 8px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; flex: 1; }

/* TabRow */
.tab-row {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 8px; border-radius: 7px; cursor: pointer;
  transition: background var(--duration-fast); user-select: none;
}
.tab-row:hover { background: var(--row-hover); }
.tab-favicon { width: 14px; height: 14px; border-radius: 2px; flex-shrink: 0; object-fit: contain; }
.tab-title { font-size: 11.5px; color: var(--text); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tab-close {
  width: 18px; height: 18px; border-radius: 4px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: var(--text-muted); background: none; border: none;
  cursor: pointer; opacity: 0; transition: opacity var(--duration-fast), background var(--duration-fast);
}
.tab-row:hover .tab-close { opacity: 1; }
.tab-close:hover { background: var(--close-hover-bg); color: var(--close-hover-color); }

/* TabGrid */
.tab-grid { padding: 16px 20px; }

/* SettingsPanel */
.settings-panel { display: flex; flex-direction: column; gap: 24px; }
.settings-section { display: flex; flex-direction: column; gap: 12px; }
.settings-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); }
.theme-options { display: flex; gap: 12px; flex-wrap: wrap; }
.theme-option {
  display: flex; align-items: center; gap: 6px; cursor: pointer;
  font-size: 13px; color: var(--text);
  padding: 8px 14px; border-radius: 8px;
  border: 1px solid var(--glass-border); background: var(--glass-bg);
  transition: background var(--duration-fast), border-color var(--duration-fast);
}
.theme-option:has(input:checked) { border-color: var(--accent); background: var(--accent-bg); }
.theme-option input { accent-color: var(--accent); }
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/
git commit -m "feat: add CSS token system for dual glassmorphism theme"
```

---

## Task 3: i18n Setup

**Files:**
- Create: `src/i18n/en.json`, `src/i18n/zh.json`, `src/i18n/index.ts`
- Create: `src/i18n/i18n.test.ts`

- [ ] **Step 1: Write `src/i18n/en.json`**

```json
{
  "search_placeholder": "Search tabs…",
  "tab_count": "{{count}} tabs · {{sites}} sites",
  "settings": "Settings",
  "close_all": "Close all",
  "close_tab": "Close tab",
  "theme_label": "Theme",
  "theme_light": "Light",
  "theme_dark": "Dark",
  "theme_system": "Follow system",
  "no_tabs": "No open tabs",
  "no_results": "No tabs match \"{{query}}\""
}
```

- [ ] **Step 2: Write `src/i18n/zh.json`**

```json
{
  "search_placeholder": "搜索标签页…",
  "tab_count": "{{count}} 个标签 · {{sites}} 个网站",
  "settings": "设置",
  "close_all": "关闭全部",
  "close_tab": "关闭标签",
  "theme_label": "主题",
  "theme_light": "浅色",
  "theme_dark": "深色",
  "theme_system": "跟随系统",
  "no_tabs": "暂无打开的标签页",
  "no_results": "没有匹配 \"{{query}}\" 的标签页"
}
```

- [ ] **Step 3: Write `src/i18n/index.ts`**

```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import zh from './zh.json'

const systemLang = navigator.language.startsWith('zh') ? 'zh' : 'en'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
    lng: systemLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

export default i18n
```

- [ ] **Step 4: Write `src/i18n/i18n.test.ts`**

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import i18n from './index'

describe('i18n', () => {
  beforeAll(async () => { await i18n.changeLanguage('en') })

  it('translates search placeholder in English', () => {
    expect(i18n.t('search_placeholder')).toBe('Search tabs…')
  })

  it('interpolates tab_count', () => {
    expect(i18n.t('tab_count', { count: 5, sites: 3 })).toBe('5 tabs · 3 sites')
  })

  it('translates to Chinese', async () => {
    await i18n.changeLanguage('zh')
    expect(i18n.t('search_placeholder')).toBe('搜索标签页…')
    await i18n.changeLanguage('en')
  })
})
```

- [ ] **Step 5: Run tests**

```bash
pnpm test src/i18n/i18n.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/
git commit -m "feat: add bilingual i18n (zh/en) with react-i18next"
```

---

## Task 4: lib/domain.ts

**Files:**
- Create: `src/lib/domain.ts`
- Create: `src/lib/domain.test.ts`

- [ ] **Step 1: Write failing tests `src/lib/domain.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { getRootDomain } from './domain'

describe('getRootDomain', () => {
  it('extracts root domain from simple URL', () => {
    expect(getRootDomain('https://github.com/explore')).toBe('github.com')
  })

  it('strips subdomain from multi-level host', () => {
    expect(getRootDomain('https://mail.google.com/mail/u/0/')).toBe('google.com')
  })

  it('handles eTLD+2 like co.uk', () => {
    expect(getRootDomain('https://bbc.co.uk/news')).toBe('bbc.co.uk')
  })

  it('handles bare domain', () => {
    expect(getRootDomain('https://notion.so/my-page')).toBe('notion.so')
  })

  it('returns empty string for chrome:// URL', () => {
    expect(getRootDomain('chrome://newtab/')).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(getRootDomain(undefined)).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/lib/domain.test.ts
```

Expected: FAIL — "Cannot find module './domain'"

- [ ] **Step 3: Implement `src/lib/domain.ts`**

```typescript
import { parse } from 'tldts'

export function getRootDomain(url: string | undefined): string {
  if (!url) return ''
  try {
    const { domain } = parse(url)
    return domain ?? ''
  } catch {
    return ''
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/lib/domain.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain.ts src/lib/domain.test.ts
git commit -m "feat: add root domain extractor using tldts"
```

---

## Task 5: lib/groupTabs.ts

**Files:**
- Create: `src/lib/groupTabs.ts`
- Create: `src/lib/groupTabs.test.ts`

- [ ] **Step 1: Write failing tests `src/lib/groupTabs.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { groupTabsByDomain } from './groupTabs'

const makeTab = (id: number, url: string): chrome.tabs.Tab => ({
  id, url, title: `Tab ${id}`, favIconUrl: '',
  windowId: 1, active: false, pinned: false, index: id,
  highlighted: false, incognito: false, selected: false,
  discarded: false, autoDiscardable: true, groupId: -1,
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/lib/groupTabs.test.ts
```

Expected: FAIL — "Cannot find module './groupTabs'"

- [ ] **Step 3: Implement `src/lib/groupTabs.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/lib/groupTabs.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/groupTabs.ts src/lib/groupTabs.test.ts
git commit -m "feat: add tab grouping by root domain"
```

---

## Task 6: lib/storage.ts

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/lib/storage.test.ts`

- [ ] **Step 1: Write failing tests `src/lib/storage.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { getLayout, setLayout, getTheme, setTheme } from './storage'
import type { Layout } from 'react-grid-layout'

describe('getLayout', () => {
  it('returns stored layout', async () => {
    vi.mocked(chrome.storage.local.get).mockImplementation((_k, cb) => {
      cb({ layout: [{ i: 'github.com', x: 0, y: 0, w: 1, h: 3 }] })
    })
    const result = await getLayout()
    expect(result).toEqual([{ i: 'github.com', x: 0, y: 0, w: 1, h: 3 }])
  })

  it('returns empty array when nothing stored', async () => {
    vi.mocked(chrome.storage.local.get).mockImplementation((_k, cb) => cb({}))
    expect(await getLayout()).toEqual([])
  })
})

describe('setLayout', () => {
  it('calls chrome.storage.local.set with layout key', async () => {
    vi.mocked(chrome.storage.local.set).mockImplementation((_o, cb) => cb?.())
    const layout: Layout[] = [{ i: 'github.com', x: 0, y: 0, w: 1, h: 3 }]
    await setLayout(layout)
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ layout }, expect.any(Function))
  })
})

describe('getTheme', () => {
  it('returns stored theme', async () => {
    vi.mocked(chrome.storage.sync.get).mockImplementation((_k, cb) => cb({ theme: 'dark' }))
    expect(await getTheme()).toBe('dark')
  })

  it('returns system as default', async () => {
    vi.mocked(chrome.storage.sync.get).mockImplementation((_k, cb) => cb({}))
    expect(await getTheme()).toBe('system')
  })
})

describe('setTheme', () => {
  it('calls chrome.storage.sync.set with theme key', async () => {
    vi.mocked(chrome.storage.sync.set).mockImplementation((_o, cb) => cb?.())
    await setTheme('light')
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ theme: 'light' }, expect.any(Function))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/lib/storage.test.ts
```

Expected: FAIL — "Cannot find module './storage'"

- [ ] **Step 3: Implement `src/lib/storage.ts`**

```typescript
import type { Layout } from 'react-grid-layout'

export type ThemeValue = 'light' | 'dark' | 'system'

export function getLayout(): Promise<Layout[]> {
  return new Promise(resolve => {
    chrome.storage.local.get(['layout'], result => {
      resolve((result.layout as Layout[]) ?? [])
    })
  })
}

export function setLayout(layout: Layout[]): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.local.set({ layout }, () => resolve())
  })
}

export function getTheme(): Promise<ThemeValue> {
  return new Promise(resolve => {
    chrome.storage.sync.get(['theme'], result => {
      resolve((result.theme as ThemeValue) ?? 'system')
    })
  })
}

export function setTheme(theme: ThemeValue): Promise<void> {
  return new Promise(resolve => {
    chrome.storage.sync.set({ theme }, () => resolve())
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/lib/storage.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: add typed chrome.storage wrappers for layout and theme"
```

---

## Task 7: background/service-worker.ts

**Files:**
- Create: `src/background/service-worker.ts`

- [ ] **Step 1: Write `src/background/service-worker.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/background/service-worker.ts
git commit -m "feat: add MV3 service worker for tab events and action click"
```

---

## Task 8: hooks/useTabs.ts

**Files:**
- Create: `src/hooks/useTabs.ts`
- Create: `src/hooks/useTabs.test.tsx`

- [ ] **Step 1: Write failing test `src/hooks/useTabs.test.tsx`**

```typescript
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useTabs } from './useTabs'

const makeTab = (id: number, url: string): chrome.tabs.Tab => ({
  id, url, title: `Tab ${id}`, favIconUrl: '',
  windowId: 1, active: false, pinned: false, index: id,
  highlighted: false, incognito: false, selected: false,
  discarded: false, autoDiscardable: true, groupId: -1,
})

describe('useTabs', () => {
  it('loads all tabs on mount', async () => {
    const tabs = [makeTab(1, 'https://github.com'), makeTab(2, 'https://google.com')]
    vi.mocked(chrome.tabs.query).mockImplementation((_q, cb) => { cb(tabs); return Promise.resolve(tabs) })
    vi.mocked(chrome.runtime.getURL).mockReturnValue('chrome-extension://x/manager.html')

    const { result } = renderHook(() => useTabs())
    await act(async () => {})
    expect(result.current.tabs).toHaveLength(2)
  })

  it('filters out the manager page tab', async () => {
    const managerUrl = 'chrome-extension://fake-ext-id/src/pages/manager/index.html'
    vi.mocked(chrome.runtime.getURL).mockReturnValue(managerUrl)
    vi.mocked(chrome.tabs.query).mockImplementation((_q, cb) => {
      cb([makeTab(1, 'https://github.com'), makeTab(2, managerUrl)])
      return Promise.resolve([])
    })

    const { result } = renderHook(() => useTabs())
    await act(async () => {})
    expect(result.current.tabs).toHaveLength(1)
  })

  it('re-queries on TABS_UPDATED message', async () => {
    vi.mocked(chrome.runtime.getURL).mockReturnValue('chrome-extension://x/manager.html')
    let callCount = 0
    vi.mocked(chrome.tabs.query).mockImplementation((_q, cb) => {
      cb(callCount === 0 ? [makeTab(1, 'https://github.com')] : [makeTab(1, 'https://github.com'), makeTab(2, 'https://notion.so')])
      callCount++
      return Promise.resolve([])
    })

    const { result } = renderHook(() => useTabs())
    await act(async () => {})
    expect(result.current.tabs).toHaveLength(1)

    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0]?.[0]
    await act(async () => { listener?.({ type: 'TABS_UPDATED' }, {}, () => {}) })
    expect(result.current.tabs).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/hooks/useTabs.test.tsx
```

Expected: FAIL — "Cannot find module './useTabs'"

- [ ] **Step 3: Implement `src/hooks/useTabs.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react'

export function useTabs() {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([])

  const refresh = useCallback(() => {
    const managerUrl = chrome.runtime.getURL('src/pages/manager/index.html')
    chrome.tabs.query({}, allTabs => {
      setTabs(allTabs.filter(t => t.url !== managerUrl))
    })
  }, [])

  useEffect(() => {
    refresh()
    const listener = (msg: unknown) => {
      if (typeof msg === 'object' && msg !== null && (msg as { type: string }).type === 'TABS_UPDATED') {
        refresh()
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [refresh])

  return { tabs }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/hooks/useTabs.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTabs.ts src/hooks/useTabs.test.tsx
git commit -m "feat: add useTabs hook with real-time sync via runtime messages"
```

---

## Task 9: hooks/useTheme.ts

**Files:**
- Create: `src/hooks/useTheme.ts`
- Create: `src/hooks/useTheme.test.tsx`

- [ ] **Step 1: Write failing test `src/hooks/useTheme.test.tsx`**

```typescript
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  it('loads stored theme on mount', async () => {
    vi.mocked(chrome.storage.sync.get).mockImplementation((_k, cb) => cb({ theme: 'dark' }))
    const { result } = renderHook(() => useTheme())
    await act(async () => {})
    expect(result.current.theme).toBe('dark')
  })

  it('defaults to system when nothing stored', async () => {
    vi.mocked(chrome.storage.sync.get).mockImplementation((_k, cb) => cb({}))
    const { result } = renderHook(() => useTheme())
    await act(async () => {})
    expect(result.current.theme).toBe('system')
  })

  it('sets data-theme on documentElement', async () => {
    vi.mocked(chrome.storage.sync.get).mockImplementation((_k, cb) => cb({ theme: 'dark' }))
    renderHook(() => useTheme())
    await act(async () => {})
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('setTheme updates storage and DOM', async () => {
    vi.mocked(chrome.storage.sync.get).mockImplementation((_k, cb) => cb({}))
    vi.mocked(chrome.storage.sync.set).mockImplementation((_o, cb) => cb?.())
    const { result } = renderHook(() => useTheme())
    await act(async () => {})
    await act(async () => { result.current.setTheme('light') })
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ theme: 'light' }, expect.any(Function))
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/hooks/useTheme.test.tsx
```

Expected: FAIL — "Cannot find module './useTheme'"

- [ ] **Step 3: Implement `src/hooks/useTheme.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { getTheme, setTheme as storeTheme, type ThemeValue } from '../lib/storage'

function applyTheme(theme: ThemeValue): void {
  if (theme === 'system') {
    delete document.documentElement.dataset.theme
  } else {
    document.documentElement.dataset.theme = theme
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeValue>('system')

  useEffect(() => {
    getTheme().then(stored => {
      setThemeState(stored)
      applyTheme(stored)
    })
  }, [])

  const setTheme = useCallback((next: ThemeValue) => {
    setThemeState(next)
    applyTheme(next)
    storeTheme(next)
  }, [])

  return { theme, setTheme }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/hooks/useTheme.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTheme.ts src/hooks/useTheme.test.tsx
git commit -m "feat: add useTheme hook with storage.sync persistence and DOM sync"
```

---

## Task 10: components/TabRow.tsx

**Files:**
- Create: `src/components/TabRow.tsx`
- Create: `src/components/TabRow.test.tsx`

- [ ] **Step 1: Write failing test `src/components/TabRow.test.tsx`**

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TabRow } from './TabRow'
import '../../src/i18n/index'

const mockTab: chrome.tabs.Tab = {
  id: 42, url: 'https://github.com/explore', title: 'Explore · GitHub',
  favIconUrl: 'https://github.com/favicon.ico',
  windowId: 1, active: false, pinned: false, index: 0,
  highlighted: false, incognito: false, selected: false,
  discarded: false, autoDiscardable: true, groupId: -1,
}

describe('TabRow', () => {
  it('renders tab title', () => {
    render(<TabRow tab={mockTab} searchQuery="" />)
    expect(screen.getByText('Explore · GitHub')).toBeTruthy()
  })

  it('switches to tab on row click', () => {
    vi.mocked(chrome.tabs.update).mockImplementation((_id, _p, cb) => { cb?.(mockTab); return Promise.resolve(mockTab) })
    vi.mocked(chrome.windows.update).mockImplementation((_id, _p, cb) => { cb?.({}); return Promise.resolve({}) })
    render(<TabRow tab={mockTab} searchQuery="" />)
    fireEvent.click(screen.getByRole('button', { name: /Explore/i }))
    expect(chrome.tabs.update).toHaveBeenCalledWith(42, { active: true }, expect.any(Function))
    expect(chrome.windows.update).toHaveBeenCalledWith(1, { focused: true }, expect.any(Function))
  })

  it('closes tab when X is clicked', () => {
    vi.mocked(chrome.tabs.remove).mockImplementation((_id, cb) => { cb?.(); return Promise.resolve() })
    render(<TabRow tab={mockTab} searchQuery="" />)
    fireEvent.click(screen.getByTitle(/close tab/i))
    expect(chrome.tabs.remove).toHaveBeenCalledWith(42, expect.any(Function))
  })

  it('is hidden when title does not match searchQuery', () => {
    const { container } = render(<TabRow tab={mockTab} searchQuery="notion" />)
    expect((container.firstChild as HTMLElement).style.display).toBe('none')
  })

  it('is visible when title matches searchQuery', () => {
    const { container } = render(<TabRow tab={mockTab} searchQuery="GitHub" />)
    expect((container.firstChild as HTMLElement).style.display).not.toBe('none')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/components/TabRow.test.tsx
```

Expected: FAIL — "Cannot find module './TabRow'"

- [ ] **Step 3: Implement `src/components/TabRow.tsx`**

```typescript
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
      if (tab.windowId != null) chrome.windows.update(tab.windowId, { focused: true })
    })
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (tab.id != null) chrome.tabs.remove(tab.id)
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/components/TabRow.test.tsx
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/TabRow.tsx src/components/TabRow.test.tsx
git commit -m "feat: add TabRow with tab switch, close, search filter, and tooltip"
```

---

## Task 11: components/DomainGroup.tsx

**Files:**
- Create: `src/components/DomainGroup.tsx`
- Create: `src/components/DomainGroup.test.tsx`

- [ ] **Step 1: Write failing test `src/components/DomainGroup.test.tsx`**

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DomainGroup } from './DomainGroup'

const makeTabs = (count: number): chrome.tabs.Tab[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1, url: `https://github.com/page-${i}`, title: `GitHub Page ${i}`,
    favIconUrl: '', windowId: 1, active: false, pinned: false, index: i,
    highlighted: false, incognito: false, selected: false,
    discarded: false, autoDiscardable: true, groupId: -1,
  }))

describe('DomainGroup', () => {
  it('renders domain name', () => {
    render(<DomainGroup domain="github.com" tabs={makeTabs(2)} searchQuery="" />)
    expect(screen.getByText('github.com')).toBeTruthy()
  })

  it('renders tab count badge', () => {
    render(<DomainGroup domain="github.com" tabs={makeTabs(3)} searchQuery="" />)
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('renders a TabRow for each tab', () => {
    render(<DomainGroup domain="github.com" tabs={makeTabs(2)} searchQuery="" />)
    expect(screen.getAllByRole('button', { name: /GitHub Page/ })).toHaveLength(2)
  })

  it('closes all tabs on close-all click', () => {
    vi.mocked(chrome.tabs.remove).mockImplementation((_ids, cb) => { cb?.(); return Promise.resolve() })
    render(<DomainGroup domain="github.com" tabs={makeTabs(2)} searchQuery="" />)
    fireEvent.click(screen.getByTitle('Close all'))
    expect(chrome.tabs.remove).toHaveBeenCalledWith([1, 2], expect.any(Function))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/components/DomainGroup.test.tsx
```

Expected: FAIL — "Cannot find module './DomainGroup'"

- [ ] **Step 3: Implement `src/components/DomainGroup.tsx`**

```typescript
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
    const ids = tabs.map(t => t.id).filter((id): id is number => id != null)
    chrome.tabs.remove(ids)
  }

  const faviconUrl = `chrome://favicon2/?size=16&pageUrl=${encodeURIComponent(
    tabs[0]?.url ?? `https://${domain}`
  )}`

  return (
    <div className="domain-group">
      <div className="group-header">
        <img className="group-favicon" src={faviconUrl} alt="" width={16} height={16}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <span className="group-domain">{domain}</span>
        <span className="group-count">{tabs.length}</span>
        <button className="close-all-btn" title="Close all" aria-label={t('close_all')} onClick={handleCloseAll}>
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/components/DomainGroup.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/DomainGroup.tsx src/components/DomainGroup.test.tsx
git commit -m "feat: add DomainGroup card with favicon, count badge, close-all"
```

---

## Task 12: components/TabGrid.tsx

**Files:**
- Create: `src/components/TabGrid.tsx`
- Create: `src/components/TabGrid.test.tsx`

- [ ] **Step 1: Write failing test `src/components/TabGrid.test.tsx`**

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TabGrid } from './TabGrid'

const makeTab = (id: number, url: string): chrome.tabs.Tab => ({
  id, url, title: `Tab ${id}`, favIconUrl: '',
  windowId: 1, active: false, pinned: false, index: id,
  highlighted: false, incognito: false, selected: false,
  discarded: false, autoDiscardable: true, groupId: -1,
})

const groups = new Map([
  ['github.com', [makeTab(1, 'https://github.com/a')]],
  ['notion.so', [makeTab(2, 'https://notion.so/b')]],
])

describe('TabGrid', () => {
  beforeEach(() => {
    vi.mocked(chrome.storage.local.get).mockImplementation((_k, cb) => cb({}))
    vi.mocked(chrome.storage.local.set).mockImplementation((_o, cb) => cb?.())
  })

  it('renders a card for each domain group', () => {
    render(<TabGrid groups={groups} searchQuery="" />)
    expect(screen.getByText('github.com')).toBeTruthy()
    expect(screen.getByText('notion.so')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/components/TabGrid.test.tsx
```

Expected: FAIL — "Cannot find module './TabGrid'"

- [ ] **Step 3: Implement `src/components/TabGrid.tsx`**

```typescript
import { useState, useEffect, useRef } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import type { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { DomainGroup } from './DomainGroup'
import { getLayout, setLayout } from '../lib/storage'

const ResponsiveGrid = WidthProvider(Responsive)

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

  const handleLayoutChange = (current: Layout[]) => {
    setLayoutState(current)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setLayout(current), 500)
  }

  return (
    <ResponsiveGrid
      className="tab-grid"
      layouts={{ lg: layout }}
      breakpoints={{ lg: 1200, md: 768, sm: 480 }}
      cols={{ lg: 3, md: 2, sm: 1 }}
      rowHeight={60}
      isDraggable
      isResizable
      onLayoutChange={handleLayoutChange}
      draggableHandle=".group-header"
    >
      {Array.from(groups.entries()).map(([domain, tabs]) => (
        <div key={domain}>
          <DomainGroup domain={domain} tabs={tabs} searchQuery={searchQuery} />
        </div>
      ))}
    </ResponsiveGrid>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/components/TabGrid.test.tsx
```

Expected: 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/TabGrid.tsx src/components/TabGrid.test.tsx
git commit -m "feat: add TabGrid with drag+resize and layout persistence"
```

---

## Task 13: components/TopBar.tsx

**Files:**
- Create: `src/components/TopBar.tsx`
- Create: `src/components/TopBar.test.tsx`

- [ ] **Step 1: Write failing test `src/components/TopBar.test.tsx`**

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TopBar } from './TopBar'

describe('TopBar', () => {
  it('renders tab count', () => {
    render(<TopBar tabCount={12} siteCount={4} searchQuery="" onSearchChange={vi.fn()} />)
    expect(screen.getByText(/12/)).toBeTruthy()
  })

  it('calls onSearchChange when user types', () => {
    const onSearchChange = vi.fn()
    render(<TopBar tabCount={5} siteCount={2} searchQuery="" onSearchChange={onSearchChange} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'github' } })
    expect(onSearchChange).toHaveBeenCalledWith('github')
  })

  it('shows current search value in input', () => {
    render(<TopBar tabCount={5} siteCount={2} searchQuery="notion" onSearchChange={vi.fn()} />)
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('notion')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/components/TopBar.test.tsx
```

Expected: FAIL — "Cannot find module './TopBar'"

- [ ] **Step 3: Implement `src/components/TopBar.tsx`**

```typescript
import { useTranslation } from 'react-i18next'

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
      <div className="topbar-logo">Tab<span className="topbar-logo-accent">Flow</span></div>
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
      <button className="icon-btn" title={t('settings')} aria-label={t('settings')} onClick={openSettings}>
        ⚙️
      </button>
    </header>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/components/TopBar.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/TopBar.tsx src/components/TopBar.test.tsx
git commit -m "feat: add TopBar with real-time search and settings button"
```

---

## Task 14: Manager Page

**Files:**
- Create: `src/pages/manager/index.html`
- Create: `src/pages/manager/main.tsx`

- [ ] **Step 1: Write `src/pages/manager/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TabFlow</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

- [ ] **Step 2: Write `src/pages/manager/main.tsx`**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/manager/
git commit -m "feat: wire up manager page with tabs, search, theme, grid"
```

---

## Task 15: Settings Panel + Settings Page

**Files:**
- Create: `src/components/SettingsPanel.tsx`
- Create: `src/components/SettingsPanel.test.tsx`
- Create: `src/pages/settings/index.html`
- Create: `src/pages/settings/main.tsx`

- [ ] **Step 1: Write failing test `src/components/SettingsPanel.test.tsx`**

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsPanel } from './SettingsPanel'

describe('SettingsPanel', () => {
  it('renders three theme options', () => {
    render(<SettingsPanel theme="system" onThemeChange={vi.fn()} />)
    expect(screen.getByLabelText(/Light|浅色/i)).toBeTruthy()
    expect(screen.getByLabelText(/Dark|深色/i)).toBeTruthy()
    expect(screen.getByLabelText(/system|系统/i)).toBeTruthy()
  })

  it('marks the active theme as checked', () => {
    render(<SettingsPanel theme="dark" onThemeChange={vi.fn()} />)
    expect((screen.getByLabelText(/Dark|深色/i) as HTMLInputElement).checked).toBe(true)
  })

  it('calls onThemeChange on selection', () => {
    const onThemeChange = vi.fn()
    render(<SettingsPanel theme="system" onThemeChange={onThemeChange} />)
    fireEvent.click(screen.getByLabelText(/Light|浅色/i))
    expect(onThemeChange).toHaveBeenCalledWith('light')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/components/SettingsPanel.test.tsx
```

Expected: FAIL — "Cannot find module './SettingsPanel'"

- [ ] **Step 3: Implement `src/components/SettingsPanel.tsx`**

```typescript
import { useTranslation } from 'react-i18next'
import type { ThemeValue } from '../lib/storage'

interface SettingsPanelProps {
  theme: ThemeValue
  onThemeChange: (t: ThemeValue) => void
}

export function SettingsPanel({ theme, onThemeChange }: SettingsPanelProps) {
  const { t } = useTranslation()
  const options: { value: ThemeValue; label: string }[] = [
    { value: 'light', label: t('theme_light') },
    { value: 'dark',  label: t('theme_dark') },
    { value: 'system', label: t('theme_system') },
  ]
  return (
    <div className="settings-panel">
      <section className="settings-section">
        <h2 className="settings-label">{t('theme_label')}</h2>
        <div className="theme-options">
          {options.map(opt => (
            <label key={opt.value} className="theme-option">
              <input
                type="radio"
                name="theme"
                value={opt.value}
                checked={theme === opt.value}
                onChange={() => onThemeChange(opt.value)}
                aria-label={opt.label}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/pages/settings/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TabFlow — Settings</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

- [ ] **Step 5: Write `src/pages/settings/main.tsx`**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useTheme } from '../../hooks/useTheme'
import { SettingsPanel } from '../../components/SettingsPanel'
import '../../i18n/index'
import '../../styles/global.css'

function SettingsApp() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="app-layout" style={{ padding: '32px 40px', maxWidth: 480 }}>
      <h1 className="topbar-logo" style={{ marginBottom: 24, fontSize: 20 }}>
        Tab<span className="topbar-logo-accent">Flow</span> — Settings
      </h1>
      <SettingsPanel theme={theme} onThemeChange={setTheme} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><SettingsApp /></StrictMode>
)
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm test src/components/SettingsPanel.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/SettingsPanel.tsx src/components/SettingsPanel.test.tsx src/pages/settings/
git commit -m "feat: add SettingsPanel and settings page with theme selector"
```

---

## Task 16: Icons

**Files:**
- Create: `public/icons/icon16.png`, `icon48.png`, `icon128.png`

- [ ] **Step 1: Generate icons with ImageMagick (if available)**

```bash
mkdir -p public/icons

which convert && (
  for size in 16 48 128; do
    convert -size ${size}x${size} \
      gradient:'#6366f1-#818cf8' \
      -gravity Center -font Arial \
      -pointsize $((size / 2)) \
      -fill white -annotate 0 "T" \
      public/icons/icon${size}.png
  done
  echo "Icons created with ImageMagick"
) || echo "ImageMagick not found — place PNG icons manually in public/icons/"
```

If ImageMagick is unavailable, create a 128×128 PNG manually with any image editor and resize. The icon should be a "T" or tab-stack symbol on a #6366f1 indigo background.

- [ ] **Step 2: Verify icons exist**

```bash
ls -la public/icons/
```

Expected: `icon16.png`, `icon48.png`, `icon128.png` all present.

- [ ] **Step 3: Commit**

```bash
git add public/icons/
git commit -m "chore: add placeholder extension icons (replace before store submission)"
```

---

## Task 17: Chrome i18n Locale Strings

**Files:**
- Create: `_locales/en/messages.json`
- Create: `_locales/zh_CN/messages.json`

- [ ] **Step 1: Write `_locales/en/messages.json`**

```json
{
  "extName": {
    "message": "TabFlow — Tab Manager",
    "description": "Extension name shown in Chrome toolbar and Web Store"
  },
  "extDescription": {
    "message": "View all open tabs grouped by domain in a resizable multi-column grid. Supports light/dark themes.",
    "description": "Extension description in Chrome Web Store"
  }
}
```

- [ ] **Step 2: Write `_locales/zh_CN/messages.json`**

```json
{
  "extName": {
    "message": "TabFlow — 标签管理器",
    "description": "扩展名称，显示在 Chrome 工具栏和网上应用店"
  },
  "extDescription": {
    "message": "在可调整大小的多列网格中，按域名分组查看所有打开的标签页。支持浅色/深色主题。",
    "description": "Chrome 网上应用店的扩展描述"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add _locales/
git commit -m "feat: add Chrome i18n locale strings for en and zh_CN"
```

---

## Task 18: Full Test Run + Build + Manual Verification

- [ ] **Step 1: Run complete test suite**

```bash
pnpm test
```

Expected: All tests pass (30+ tests across lib, hooks, components).

- [ ] **Step 2: Check coverage**

```bash
pnpm coverage
```

Expected: `src/lib/`, `src/hooks/`, `src/components/` all above 80%.

- [ ] **Step 3: TypeScript check**

```bash
pnpm tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Production build**

```bash
pnpm build
```

Expected: `dist/` created with no errors.

- [ ] **Step 5: Load in Chrome and run manual checklist**

1. Open `chrome://extensions/` → enable Developer mode → Load unpacked → select `dist/`
2. Run through this checklist:

```
Core:
[ ] Click toolbar icon → manager page opens
[ ] Click icon again → focuses existing manager tab (no duplicate)
[ ] Open 10+ tabs across 3+ domains → correct domain grouping
[ ] Click tab row → switches to that tab without opening a new tab
[ ] Click ✕ → tab closes, list updates immediately
[ ] Click "Close all" → all tabs for that domain close

UX Enhancements:
[ ] Type in search → only matching rows visible; clear → all restored
[ ] Open/close a tab elsewhere → manager auto-updates within 1s
[ ] Drag a domain card to new position → position saved
[ ] Refresh manager page → grid positions restored
[ ] Resize a card by dragging corner → size saved and restored
[ ] Hover long tab title → full title visible as tooltip

Theme & Settings:
[ ] ⚙️ button → settings page opens in new tab
[ ] Select Dark → dark glassmorphism theme applied immediately
[ ] Select Light → light glassmorphism theme applied immediately
[ ] Select Follow system → respects OS dark/light preference
[ ] Reload page → theme persists

i18n:
[ ] System language Chinese → UI in Chinese
[ ] System language English → UI in English
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: TabFlow Chrome extension v1.0.0 — all features verified"
```

---

## Task 19: Chrome Web Store Submission Prep

**Files:**
- Create: `privacy-policy.html`

- [ ] **Step 1: Create privacy policy**

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>TabFlow Privacy Policy</title></head>
<body style="font-family:sans-serif;max-width:640px;margin:40px auto;line-height:1.7">
  <h1>TabFlow Privacy Policy</h1>
  <p><strong>Last updated: 2026-04-26</strong></p>
  <p>TabFlow does not collect, transmit, or share any personal data.
     All data (theme preference, grid layout) is stored locally in your
     browser using <code>chrome.storage</code> and never leaves your device.</p>
  <p>TabFlow reads your open browser tabs solely to display them in the
     manager interface. This data is never sent to any external server.</p>
  <p>Questions: <a href="mailto:rafaelliang698@gmail.com">rafaelliang698@gmail.com</a></p>
</body>
</html>
```

- [ ] **Step 2: Pre-submission checklist**

```
[ ] manifest_version = 3
[ ] permissions: only "tabs" and "storage"
[ ] _locales/en and _locales/zh_CN present
[ ] 128×128 store icon ready (professional quality)
[ ] At least 1 screenshot (1280×800 recommended)
[ ] Privacy policy hosted at a public URL
[ ] pnpm build succeeds with no warnings
[ ] Tested on Chrome stable channel
[ ] No eval(), no remote scripts, no inline scripts
```

- [ ] **Step 3: Create submission ZIP**

```bash
pnpm build
cd dist && zip -r ../tabflow-v1.0.0.zip . && cd ..
ls -lh tabflow-v1.0.0.zip
```

Expected: ZIP file under 2MB.

- [ ] **Step 4: Commit**

```bash
git add privacy-policy.html
git commit -m "chore: add privacy policy for Chrome Web Store submission"
```

---

*End of plan — 19 tasks, ~95 steps.*
