export const superseisConfig = {
  name: 'Superseis',
  slug: 'superseis',
  baseUrl: 'https://www.superseis.com.py',
  
  routes: {
    ofertas: { path: '/ofertas/es-es', category: 'ofertas' },
    almacen: { path: '/catalog/almacen', category: 'almacen' },
    bebidasConAlcohol: { path: '/catalog/bebidas-con-alcohol', category: 'bebidas-con-alcohol' },
    carnes: { path: '/catalog/carnes', category: 'carnes' },
    congelados: { path: '/catalog/Congelados', category: 'congelados' },
    bebes: { path: '/catalog/bebes', category: 'bebes' },
    bebidasSinAlcohol: { path: '/catalog/bebidas-sin-alcohol', category: 'bebidas-sin-alcohol' },
    electrodomesticos: { path: '/catalog/electrodomesticos', category: 'electrodomesticos' },
    ferreteria: { path: '/catalog/ferreteria', category: 'ferreteria' },
    fiambreria: { path: '/catalog/fiambreria', category: 'fiambreria' },
    frescos: { path: '/catalog/frescos', category: 'frescos' },
    hogarYBazar: { path: '/catalog/hogar-y-bazar', category: 'hogar-y-bazar' },
    juguetesYLibreria: { path: '/catalog/juguetes-y-libreria', category: 'juguetes-y-libreria' },
    lacteos: { path: '/catalog/lacteos', category: 'lacteos' },
    limpieza: { path: '/catalog/limpieza', category: 'limpieza' },
    mascotas: { path: '/catalog/mascotas', category: 'mascotas' },
    panaderia: { path: '/catalog/panaderia', category: 'panaderia' },
    pastas: { path: '/catalog/pastas', category: 'pastas' },
    perfumeria: { path: '/catalog/perfumeria', category: 'perfumeria' },
    reposteria: { path: '/catalog/reposteria', category: 'reposteria' },
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