import { chromium, Browser, Page } from 'playwright'
import type { ScraperResult } from '../types/index.js'

export abstract class BaseScraper<T> {
  protected browser: Browser | null = null
  protected page: Page | null = null
  
  abstract name: string
  abstract slug: string
  abstract baseUrl: string

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    this.page = await this.browser.newPage()
    
    // User agent realista
    await this.page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }
  }

  abstract scrape(): Promise<ScraperResult<T>>

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  protected async safeGoto(url: string, timeout = 30000): Promise<boolean> {
    try {
      await this.page!.goto(url, { waitUntil: 'networkidle', timeout })
      return true
    } catch (error) {
      console.error(`Error navigating to ${url}:`, error)
      return false
    }
  }

  // Helper para extraer texto de forma segura
  protected async safeText(selector: string): Promise<string | null> {
    try {
      const element = await this.page!.$(selector)
      if (!element) return null
      return (await element.textContent())?.trim() || null
    } catch {
      return null
    }
  }

  // Helper para extraer número de precio
  protected parsePrice(text: string | null): number | null {
    if (!text) return null
    // Remover puntos de miles y comas decimales
    const cleaned = text.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }
}