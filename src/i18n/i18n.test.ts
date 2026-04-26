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
