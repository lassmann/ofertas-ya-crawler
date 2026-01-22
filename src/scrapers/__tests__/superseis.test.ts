import { describe, it, expect } from 'vitest'
import { superseisConfig } from '../config/superseis.js'
import * as cheerio from 'cheerio'

const sampleHtml = `
<div class="product-thumb" data-product-id="2410">
  <div class="image">
    <a href="https://www.superseis.com.py/product/269818-plato">
      <img src="https://cdn.sd.com.py/image.jpg" alt="Plato"/>
    </a>
    <div class="discount-onprice-s6">
      <span class="savings-tooltip">Te ahorras ₲ 4.000</span>
      <span class="discount-percent-s6">-28%</span>
    </div>
  </div>
  <div class="content">
    <div class="description">
      <h4>
        <a href="https://www.superseis.com.py/product/269818-plato" 
           data-product-name="Plato de cerámica azul claro 26 cm">
          Plato de cerámica azul claro 26 cm
        </a>
      </h4>
      <div class="product-variant">
        <div class="price">
          <span class="price-new">₲ 9.900</span>
          <span class="price-old">₲ 13.900</span>
        </div>
        <span class="sale-type-badge">unidad</span>
      </div>
    </div>
  </div>
</div>
`

const paginationHtml = `
<li class="page-item">
  <a href="https://www.superseis.com.py/ofertas/es-es?page=63" class="page-link">
    <i class="fas fa-angle-double-right"></i>
  </a>
</li>
`

describe('Superseis Config', () => {
  describe('parsePrice', () => {
    it('should parse guaranies correctly', () => {
      expect(superseisConfig.parsePrice('₲ 9.900')).toBe(9900)
      expect(superseisConfig.parsePrice('₲ 13.900')).toBe(13900)
      expect(superseisConfig.parsePrice('₲ 1.234.567')).toBe(1234567)
    })

    it('should return null for invalid input', () => {
      expect(superseisConfig.parsePrice(null)).toBe(null)
      expect(superseisConfig.parsePrice('')).toBe(null)
    })
  })

  describe('parseDiscount', () => {
    it('should extract discount percentage', () => {
      expect(superseisConfig.parseDiscount('-28%')).toBe(28)
      expect(superseisConfig.parseDiscount('- 35%')).toBe(35)
    })

    it('should return null for invalid input', () => {
      expect(superseisConfig.parseDiscount(null)).toBe(null)
    })
  })

  describe('extractPageNumber', () => {
    it('should extract page number from URL', () => {
      expect(superseisConfig.extractPageNumber('https://superseis.com.py/ofertas?page=63')).toBe(63)
      expect(superseisConfig.extractPageNumber('https://superseis.com.py/ofertas?page=2')).toBe(2)
    })
  })
})

describe('Superseis HTML Parsing', () => {
  it('should extract product data from HTML', () => {
    const $ = cheerio.load(sampleHtml)
    const { selectors, parsePrice, parseDiscount } = superseisConfig

    const $product = $(selectors.productContainer).first()

    const name = $product.find(selectors.name).attr(selectors.nameAttr)
    const priceNew = parsePrice($product.find(selectors.priceNew).text())
    const priceOld = parsePrice($product.find(selectors.priceOld).text())
    const discount = parseDiscount($product.find(selectors.discountPercent).text())
    const unit = $product.find(selectors.saleType).text().trim()
    const imageUrl = $product.find(selectors.image).attr('src')
    const productUrl = $product.find(selectors.url).attr('href')

    expect(name).toBe('Plato de cerámica azul claro 26 cm')
    expect(priceNew).toBe(9900)
    expect(priceOld).toBe(13900)
    expect(discount).toBe(28)
    expect(unit).toBe('unidad')
    expect(imageUrl).toBe('https://cdn.sd.com.py/image.jpg')
    expect(productUrl).toBe('https://www.superseis.com.py/product/269818-plato')
  })

  it('should extract total pages from pagination', () => {
    const $ = cheerio.load(paginationHtml)
    const lastPageLink = $(superseisConfig.selectors.lastPage).attr('href')
    const totalPages = superseisConfig.extractPageNumber(lastPageLink || '')

    expect(totalPages).toBe(63)
  })
})