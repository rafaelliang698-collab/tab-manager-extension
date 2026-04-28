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
