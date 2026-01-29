import { Category } from './categories'

export const casaricaConfig = {
    name: 'Casa Rica',
    slug: 'casarica',
    baseUrl: 'https://www.casarica.com.py',

    routes: {
        almacen: { path: '/catalogo/almacen-c1', category: Category.ALMACEN },
        bebidasConAlcohol: { path: '/bebidas-con-alcohol-c20', category: Category.BEBIDAS_CON_ALCOHOL },
        bebidasSinAlcohol: { path: '/bebidas-sin-alcohol-c46', category: Category.BEBIDAS_SIN_ALCOHOL },
        carniceria: { path: '/catalogo/carniceria-c56', category: Category.CARNES },
        lacteos: { path: '/catalogo/lacteos-c209', category: Category.LACTEOS },
        cuidadoPersonal: { path: '/catalogo/cuidado-personal-c144', category: Category.PERFUMERIA },
        cuidadoHogar: { path: '/catalogo/cuidado-del-hogar-c123', category: Category.LIMPIEZA },
        rotiseria: { path: '/catalogo/rotiseria-c323', category: Category.FIAMBRERIA },
        confiteria: { path: '/catalogo/confiteria-c92', category: Category.GOLOSINAS },
        panaderia: { path: '/catalogo/panaderia-c225', category: Category.PANADERIA },
        mascotas: { path: '/catalogo/mascotas-c314', category: Category.MASCOTAS },
        frescos: { path: '/catalogo/verduleria-fruteria-c280', category: Category.FRESCOS },
        congelados: { path: '/catalogo/congelados-c103', category: Category.CONGELADOS },
        snacks: { path: '/catalogo/snacks-c271', category: Category.ALMACEN },
        saludables: { path: '/catalogo/saludables-c178', category: Category.SALUDABLES },
        queseria: { path: '/catalogo/queseria-c247', category: Category.LACTEOS },
        pastasFrescas: { path: '/catalogo/pastas-frescas-c237', category: Category.PASTAS },
        helados: { path: '/catalogo/helados-c339', category: Category.CONGELADOS },
        fiambreria: { path: '/catalogo/fiambreria-c193', category: Category.FIAMBRERIA },
        desayuno: { path: '/catalogo/desayuno-c165', category: Category.DESAYUNO },
        conservados: { path: '/catalogo/conservados-c116', category: Category.ALMACEN },
        condimentosSalsas: { path: '/catalogo/condimentos-salsas-c79', category: Category.ALMACEN },
        chocolatesGolosinas: { path: '/catalogo/chocolates-y-golosinas-c65', category: Category.GOLOSINAS },
        bebes: { path: '/catalogo/bebes-c288', category: Category.BEBES },
    },

    selectors: {
        // Product container IS the link itself (not a div.product wrapper)
        productContainer: 'a.ecommercepro-LoopProduct-link',
        name: 'h2.ecommercepro-loop-product__title',
        image: '.product-list-image img',
        imageAttr: 'src',  // Uses src directly, not data-src
        priceContainer: 'span.price',
        regularPrice: 'span.amount',  // Get price from non-empty span.amount
        // Pagination
        nextPage: 'a.next.page-numbers',
    },

    // Parse price: "₲. 14.950" -> 14950
    parsePrice: (text: string | null): number | null => {
        if (!text) return null
        const cleaned = text.replace(/[₲.\s]/g, '')
        const num = parseInt(cleaned, 10)
        return isNaN(num) ? null : num
    },

    // Extract page number from URL: "catalogo/almacen-c1.3" -> 3
    extractPageNumber: (url: string): number | null => {
        const match = url.match(/\.(\d+)$/)
        return match ? parseInt(match[1], 10) : null
    },

    // Build paginated URL: "/catalogo/almacen-c1" + page 2 -> "/catalogo/almacen-c1.2"
    buildPageUrl: (basePath: string, page: number): string => {
        return page === 1 ? basePath : `${basePath}.${page}`
    },

    // Extract product ID from URL: "bebida-alpro-de-almendra-1lt-p12173" -> "12173"
    extractExternalId: (url: string | undefined): string | null => {
        if (!url) return null
        const match = url.match(/-p(\d+)(?:$|\?)/)
        return match ? match[1] : null
    },

    // Extract barcode from image URL: ".../5411188110835.jpg" -> "5411188110835"
    extractBarcode: (imageUrl: string | undefined): string | null => {
        if (!imageUrl) return null
        const match = imageUrl.match(/\/(\d{8,14})\.(jpg|png|webp)/i)
        return match ? match[1] : null
    },
}

export type CasaRicaConfig = typeof casaricaConfig

const routes = casaricaConfig.routes
export type CasaRicaRouteKey = keyof typeof routes
