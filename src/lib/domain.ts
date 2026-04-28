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
