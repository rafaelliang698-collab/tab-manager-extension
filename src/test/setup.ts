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
  windows: {
    update: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(),
    onFocusChanged: makeEvent('windows.onFocusChanged'),
  },
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
  Object.defineProperty(global, 'chrome', { value: chromeMock, writable: true })
})
