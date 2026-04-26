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
