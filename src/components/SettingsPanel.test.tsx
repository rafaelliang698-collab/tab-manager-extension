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
