import { useTranslation } from 'react-i18next'
import type { ThemeValue } from '../lib/storage'
import './settingsPanel.css'

interface SettingsPanelProps {
  theme: ThemeValue
  onThemeChange: (t: ThemeValue) => void
}

export function SettingsPanel({ theme, onThemeChange }: SettingsPanelProps) {
  const { t } = useTranslation()
  const options: { value: ThemeValue; label: string }[] = [
    { value: 'light', label: t('theme_light') },
    { value: 'dark', label: t('theme_dark') },
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
