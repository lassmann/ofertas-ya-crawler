import { Category } from './categories'

export const fortisConfig = {
    name: 'Fortis',
    slug: 'fortis',
    baseUrl: 'https://www.fortis.com.py',

    // Location cookie (Asunción = subsidiary_id 1)
    cookies: {
        subsidiaryId: 'fortis_subsidiary_id=eyJfcmFpbHMiOnsibWVzc2FnZSI6Ik1RPT0iLCJleHAiOm51bGwsInB1ciI6ImNvb2tpZS5mb3J0aXNfc3Vic2lkaWFyeV9pZCJ9fQ%3D%3D--69f0d671913e37393fd4c2512bc405b395990885',
    },

    routes: {
        almacen: { path: '/categoria/almacen', category: Category.ALMACEN },
        bebidasConAlcohol: { path: '/categoria/bebidas-alcoholicas', category: Category.BEBIDAS_CON_ALCOHOL },
        bebidasSinAlcohol: { path: '/categoria/bebidas-no-alcoholicas', category: Category.BEBIDAS_SIN_ALCOHOL },
        hogarYBazar: { path: '/categoria/casa-and-jardin', category: Category.HOGAR_Y_BAZAR },
        saludables: { path: '/categoria/saludables', category: Category.SALUDABLES },
        desayuno: { path: '/categoria/desayuno-and-merienda', category: Category.DESAYUNO },
        lacteos: { path: '/categoria/lacteos-and-huevos', category: Category.LACTEOS },
        panaderia: { path: '/categoria/panaderia-and-confiteria', category: Category.PANADERIA },
        reposteria: { path: '/categoria/reposteria', category: Category.REPOSTERIA },
        golosinas: { path: '/categoria/golosinas-and-chocolates', category: Category.GOLOSINAS },
        mascotas: { path: '/categoria/mascotas', category: Category.MASCOTAS },
        perfumeria: { path: '/categoria/higiene-and-cuidado-personal', category: Category.PERFUMERIA },
        bebes: { path: '/categoria/bebes', category: Category.BEBES },
        limpieza: { path: '/categoria/lavanderia', category: Category.LIMPIEZA },
        bazar: { path: '/categoria/bazar-and-descartables', category: Category.HOGAR_Y_BAZAR },
        ferreteria: { path: '/categoria/ferreteria-deporte-and-camping', category: Category.FERRETERIA },
    },

    selectors: {
        productContainer: '.card[data-product-id]',
        name: '.card-title a',
        nameAttr: '',
        url: '.card-title a',
        image: '.bg-product-card img',
        priceUnitario: '.text-dark.fw-medium',
        priceMayorista: '.fw-medium.text-secondary',
        priceNew: '.fw-medium.text-secondary',
        priceOld: '',
        cantidadMayorista: '.fs-5.text-secondary strong',
        discountPercent: '.discount-badge',
        saleType: '',
        productId: '[data-product-id]',
        lastPage: '.pagination .page-item:not(.active):last-of-type a.page-link',
        nextPage: 'a.page-link[rel="next"]',
    },

    // Parse price in guaraníes: "₲ 13.900" or "Unitario ₲ 71.950" -> 71950
    parsePrice: (text: string | null): number | null => {
        if (!text) return null
        // Remove text like "Unitario" and keep only numbers
        const cleaned = text.replace(/[₲\s.a-zA-Z]/g, '')
        const num = parseInt(cleaned, 10)
        return isNaN(num) ? null : num
    },

    // Parse discount: "- 35%" -> 35
    parseDiscount: (text: string | null): number | null => {
        if (!text) return null
        const match = text.match(/(\d+)/)
        return match ? parseInt(match[1], 10) : null
    },

    // Extract page number from URL
    extractPageNumber: (url: string): number | null => {
        const match = url.match(/page=(\d+)/)
        return match ? parseInt(match[1], 10) : null
    },

    // Parse minimum quantity for wholesale: "3" -> 3
    parseCantidadMayorista: (text: string | null): number | null => {
        if (!text) return null
        const num = parseInt(text.trim(), 10)
        return isNaN(num) ? null : num
    },

    // Extract barcode from URL: "/producto/crema-de-leche-7896434920723" -> "7896434920723"
    extractBarcode: (url: string | undefined): string | undefined => {
        if (!url) return undefined
        const match = url.match(/-(\d{8,14})(?:$|\?)/)
        return match ? match[1] : undefined
    },
}

export type FortisConfig = typeof fortisConfig

const routes = fortisConfig.routes
export type FortisRouteKey = keyof typeof routes
