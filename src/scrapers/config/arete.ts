import { Category } from './categories'

export const areteConfig = {
    name: 'Areté',
    slug: 'arete',
    baseUrl: 'https://www.arete.com.py',

    routes: {
        // Catálogo principal
        almacen: { path: '/catalogo/almacen-c273', category: Category.ALMACEN },
        bebidasConAlcohol: { path: '/catalogo/bebidas-con-alcohol-c266', category: Category.BEBIDAS_CON_ALCOHOL },
        bebidasSinAlcohol: { path: '/catalogo/bebidas-sin-alcohol-c297', category: Category.BEBIDAS_SIN_ALCOHOL },
        carnes: { path: '/catalogo/carnes-y-pescados-c261', category: Category.CARNES },
        chocolatesGolosinas: { path: '/catalogo/chocolate-y-golosinas-c398', category: Category.GOLOSINAS },
        confiteria: { path: '/catalogo/confiteria-c420', category: Category.GOLOSINAS },
        congelados: { path: '/catalogo/congelados-c274', category: Category.CONGELADOS },
        cuidadoHogar: { path: '/catalogo/cuidado-del-hogar-c309', category: Category.LIMPIEZA },
        cuidadoPersonal: { path: '/catalogo/cuidado-personal-c322', category: Category.PERFUMERIA },
        desayuno: { path: '/catalogo/desayuno-c287', category: Category.DESAYUNO },
        fiambres: { path: '/catalogo/fiambres-c298', category: Category.FIAMBRERIA },
        frutasVerduras: { path: '/catalogo/frutas-y-verduras-c367', category: Category.FRESCOS },
        electrodomesticos: { path: '/catalogo/electrodomesticos-c407', category: Category.ELECTRODOMESTICOS },
        lacteos: { path: '/catalogo/lacteos-c364', category: Category.LACTEOS },
        mascotas: { path: '/catalogo/mascotas-c399', category: Category.MASCOTAS },
        panaderia: { path: '/catalogo/panaderia-c395', category: Category.PANADERIA },
        pastasFrescas: { path: '/catalogo/pastas-frescas-c385', category: Category.PASTAS },
        quesos: { path: '/catalogo/quesos-c366', category: Category.LACTEOS },
        rotiseria: { path: '/catalogo/rotiseria-c464', category: Category.FIAMBRERIA },
        tienda: { path: '/catalogo/tienda-c402', category: Category.HOGAR_Y_BAZAR },
        ferreteriaJardin: { path: '/catalogo/ferreteria-y-jardin-c520', category: Category.FERRETERIA },
        cotillon: { path: '/catalogo/cotillon-c521', category: Category.HOGAR_Y_BAZAR },
    },

    selectors: {
        // Product container wraps the entire product card
        productContainer: 'div.product',
        // Link inside the product container
        productLink: 'a.ecommercepro-LoopProduct-link',
        name: 'h2.ecommercepro-loop-product__title',
        image: '.product-list-image img',
        imageAttr: 'src',
        priceContainer: 'span.price',
        // For products on sale: price inside <ins>
        offerPrice: 'ins span.amount',
        // For products on sale: old price inside <del>
        oldPrice: 'del span.amount',
        // For regular products: span.amount (but not inside ins/del)
        regularPrice: 'span.amount',
        // Sale badge indicator
        isOnSale: 'span.onsale',
        // Pagination
        nextPage: 'a.next.page-numbers',
    },

    // Parse price: "₲. 14.950" or "₲. 2.500" -> 14950 or 2500
    parsePrice: (text: string | null): number | null => {
        if (!text) return null
        const cleaned = text.replace(/[₲.\s]/g, '')
        const num = parseInt(cleaned, 10)
        return isNaN(num) ? null : num
    },

    // Extract page number from URL: "catalogo/almacen-c273.3" -> 3
    extractPageNumber: (url: string): number | null => {
        const match = url.match(/\.(\d+)$/)
        return match ? parseInt(match[1], 10) : null
    },

    // Build paginated URL: "/catalogo/almacen-c273" + page 2 -> "/catalogo/almacen-c273.2"
    buildPageUrl: (basePath: string, page: number): string => {
        return page === 1 ? basePath : `${basePath}.${page}`
    },

    // Extract product ID from URL: "producto-nombre-p12173" -> "12173"
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

export type AreteConfig = typeof areteConfig

const routes = areteConfig.routes
export type AreteRouteKey = keyof typeof routes
