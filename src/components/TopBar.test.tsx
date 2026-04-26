import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TopBar } from './TopBar'
import '../i18n'

describe('TopBar', () => {
  it('renders tab count', () => {
    render(<TopBar tabCount={12} siteCount={4} searchQuery="" onSearchChange={vi.fn()} />)
    expect(screen.getByText(/12/)).toBeTruthy()
  })

  it('calls onSearchChange when user types', () => {
    const onSearchChange = vi.fn()
    render(<TopBar tabCount={5} siteCount={2} searchQuery="" onSearchChange={onSearchChange} />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'github' } })
    expect(onSearchChange).toHaveBeenCalledWith('github')
  })

  it('shows current search value in input', () => {
    render(<TopBar tabCount={5} siteCount={2} searchQuery="notion" onSearchChange={vi.fn()} />)
    const input = screen.getByRole('searchbox') as HTMLInputElement
    expect(input.value).toBe('notion')
  })
})
