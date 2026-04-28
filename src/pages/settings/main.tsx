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
