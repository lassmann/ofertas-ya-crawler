export interface ScrapedProduct {
  name: string
  price: number
  oldPrice?: number
  discountPercent?: number
  category?: string
  brand?: string
  imageUrl?: string
  sourceUrl: string
  unit?: string
  quantity?: number
  productId?: string
  externalId?: string  // Store's internal product ID
  barcode?: string     // EAN/UPC barcode
}

export interface ScrapedPromotion {
  title: string
  description?: string
  discountPercent?: number
  discountAmount?: number
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'CUOTAS_SIN_INTERES' | 'CASHBACK' | 'OTRO'
  cardTypes?: string[]
  minPurchase?: number
  maxDiscount?: number
  daysOfWeek?: number[]
  validFrom: Date
  validTo: Date
  sourceUrl: string
  imageUrl?: string
  termsUrl?: string
}

export interface ScraperResult<T> {
  success: boolean
  data: T[]
  errors: string[]
  scrapedAt: Date
  duration: number
}