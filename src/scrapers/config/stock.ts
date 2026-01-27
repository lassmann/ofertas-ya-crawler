import { Category } from './categories'

export const stockConfig = {
    name: 'Stock',
    slug: 'stock',
    baseUrl: 'https://www.stock.com.py',

    routes: {
        aceites: { path: '/category/3-almacen-aderezoscondimentos-aceites.aspx', category: Category.ALMACEN },
        aderezos: { path: '/category/4-almacen-aderezoscondimentos-aderezos.aspx', category: Category.ALMACEN },
        especias: { path: '/category/5-almacen-aderezoscondimentos-especias.aspx', category: Category.ALMACEN },
        ketchup: { path: '/category/6-almacen-aderezoscondimentos-ketchup.aspx', category: Category.ALMACEN },
        almacen: { path: '/category/7-almacen-aderezoscondimentos-mayonesa.aspx', category: Category.ALMACEN },
        mayonesa: { path: '/category/8-almacen-aderezoscondimentos-mostaza.aspx', category: Category.ALMACEN },
        sal: { path: '/category/10-almacen-aderezoscondimentos-sal.aspx', category: Category.ALMACEN },
        salsas: { path: '/category/12-almacen-aderezoscondimentos-salsas.aspx', category: Category.ALMACEN },
        tempero: { path: '/category/14-almacen-aderezoscondimentos-tempero.aspx', category: Category.ALMACEN },
        vinagres: { path: '/category/15-almacen-aderezoscondimentos-vinagres.aspx', category: Category.ALMACEN },
        tomatados: { path: '/category/884-tomatados.aspx', category: Category.ALMACEN },

        arroz: { path: '/category/19-almacen-alimentos-secos-arroz.aspx', category: Category.ALMACEN },
        azucar: { path: '/category/852-azucarendulzantes.aspx', category: Category.ALMACEN },
        chocolatadas: { path: '/category/133-chocolatadasbatidos.aspx', category: Category.ALMACEN },
        caldos: { path: '/category/27-almacen-alimentos-secos-caldos.aspx', category: Category.ALMACEN },
        cereales: { path: '/category/849-cerealessemillas.aspx', category: Category.ALMACEN },
        delicatessen: { path: '/category/850-delicatessen.aspx', category: Category.ALMACEN },
        dulcesSolidos: { path: '/category/860-dulces-solidos.aspx', category: Category.ALMACEN },
        dulcesMermeladasMiel: { path: '/category/863-dulcesmermeladasmiel.aspx', category: Category.ALMACEN },
        fideosYPasta: { path: '/category/856-fideolasanapasta.aspx', category: Category.ALMACEN },
        galletitas: { path: '/category/851-galletitas.aspx', category: Category.ALMACEN },
        harinasYAlmidon: { path: '/category/960-harinas-almidon.aspx', category: Category.ALMACEN },
        legumbresSecas: { path: '/category/853-legumbres-secas.aspx', category: Category.ALMACEN },
        lecheEnPolvo: { path: '/category/854-leche-en-polvovarios.aspx', category: Category.ALMACEN },
        postresEnPolvo: { path: '/category/864-postres-en-polvo.aspx', category: Category.ALMACEN },
        reposteria: { path: '/category/857-reposteria-pasteleria.aspx', category: Category.ALMACEN },
    },

    selectors: {
        // Contenedor de productos
        productContainer: '.product-item',

        // Datos del producto
        name: 'h2.product-title a',
        url: 'h2.product-title a',
        image: '.picture img',

        // Precios - Stock usa estructura con spans
        price: '.productPrice .price-label',

        // Sin stock
        outOfStock: '.producto-sin-existencia',

        // Product ID - está en la clase del contenedor (product236926)
        productId: '', // Se extrae del class

        // Paginación - necesitamos ver el HTML de paginación
        pagination: '.pager a',
        nextPage: '.next-page a, .pager a[rel="next"]',
    },

    // Parsear precio: " 11.050" -> 11050
    parsePrice: (text: string | null): number | null => {
        if (!text) return null
        const cleaned = text.replace(/[Gs\s.]/g, '')
        const num = parseInt(cleaned, 10)
        return isNaN(num) ? null : num
    },

    // Extraer product ID de la clase: "product-item product236926" -> "236926"
    extractProductId: (className: string | null): string | null => {
        if (!className) return null
        const match = className.match(/product(\d+)/)
        return match ? match[1] : null
    },

    // Extraer número de página de URL - Stock usa ?pageindex=X
    extractPageNumber: (url: string): number | null => {
        const match = url.match(/pageindex=(\d+)/i)
        return match ? parseInt(match[1], 10) : null
    },
}

export type StockConfig = typeof stockConfig

const routes = stockConfig.routes
export type StockRouteKey = keyof typeof routes