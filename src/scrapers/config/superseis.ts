import { Category } from './categories'

export const superseisConfig = {
  name: 'Superseis',
  slug: 'superseis',
  baseUrl: 'https://www.superseis.com.py',

  routes: {
    ofertas: { path: '/ofertas/es-es', category: Category.OFERTAS },
    almacen: { path: '/catalog/almacen', category: Category.ALMACEN },
    bebidasConAlcohol: { path: '/catalog/bebidas-con-alcohol', category: Category.BEBIDAS_CON_ALCOHOL },
    carnes: { path: '/catalog/carnes', category: Category.CARNES },
    congelados: { path: '/catalog/Congelados', category: Category.CONGELADOS },
    bebes: { path: '/catalog/bebes', category: Category.BEBES },
    bebidasSinAlcohol: { path: '/catalog/bebidas-sin-alcohol', category: Category.BEBIDAS_SIN_ALCOHOL },
    electrodomesticos: { path: '/catalog/electrodomesticos', category: Category.ELECTRODOMESTICOS },
    ferreteria: { path: '/catalog/ferreteria', category: Category.FERRETERIA },
    fiambreria: { path: '/catalog/fiambreria', category: Category.FIAMBRERIA },
    frescos: { path: '/catalog/frescos', category: Category.FRESCOS },
    hogarYBazar: { path: '/catalog/hogar-y-bazar', category: Category.HOGAR_Y_BAZAR },
    juguetesYLibreria: { path: '/catalog/juguetes-y-libreria', category: Category.JUGUETES_Y_LIBRERIA },
    lacteos: { path: '/catalog/lacteos', category: Category.LACTEOS },
    limpieza: { path: '/catalog/limpieza', category: Category.LIMPIEZA },
    mascotas: { path: '/catalog/mascotas', category: Category.MASCOTAS },
    panaderia: { path: '/catalog/panaderia', category: Category.PANADERIA },
    pastas: { path: '/catalog/pastas', category: Category.PASTAS },
    perfumeria: { path: '/catalog/perfumeria', category: Category.PERFUMERIA },
    reposteria: { path: '/catalog/reposteria', category: Category.REPOSTERIA },
  },

  selectors: {
    // Contenedor de productos
    productContainer: '.product-thumb',

    // Datos del producto
    name: 'h4 a[data-product-name]',
    nameAttr: 'data-product-name',
    url: 'h4 a',
    image: '.image img',

    // Precios
    priceNew: '.price-new',
    priceOld: '.price-old',

    // Descuento
    discountPercent: '.discount-percent-s6',
    savingsAmount: '.savings-tooltip',

    // Metadata
    saleType: '.sale-type-badge',
    productId: '[data-product-id]',

    // Paginación
    lastPage: '.page-item:last-child a',
    nextPage: '.nav-btn:not(.disabled)[href*="page="]',
  },

  // Parsear precio en guaraníes: "₲ 13.900" -> 13900
  parsePrice: (text: string | null): number | null => {
    if (!text) return null
    const cleaned = text.replace(/[₲\s.]/g, '')
    const num = parseInt(cleaned, 10)
    return isNaN(num) ? null : num
  },

  // Parsear descuento: "- 35%" -> 35
  parseDiscount: (text: string | null): number | null => {
    if (!text) return null
    const match = text.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : null
  },

  // Extraer número de página de URL
  extractPageNumber: (url: string): number | null => {
    const match = url.match(/page=(\d+)/)
    return match ? parseInt(match[1], 10) : null
  },
}

export type SuperseisConfig = typeof superseisConfig

const routes = superseisConfig.routes
export type RouteKey = keyof typeof routes