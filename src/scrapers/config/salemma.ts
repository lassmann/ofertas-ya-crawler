import { Category } from './categories'

export const salemmaConfig = {
    name: 'Salemma',
    slug: 'salemma',
    baseUrl: 'https://www.salemmaonline.com.py',

    routes: {
        // OFERTAS
        ofertasAlmacen: { path: '/ofertas/almacen', category: Category.OFERTAS },
        ofertasBebidasConAlcohol: { path: '/ofertas/bebidas-c-alcohol', category: Category.OFERTAS },
        ofertasBebidasSinAlcohol: { path: '/ofertas/bebidas-s-alcohol', category: Category.OFERTAS },
        ofertasCongelados: { path: '/ofertas/congelados', category: Category.OFERTAS },
        ofertasDieteticos: { path: '/ofertas/dieteticos', category: Category.OFERTAS },
        ofertasEmbutidos: { path: '/ofertas/embutidos', category: Category.OFERTAS },
        ofertasHigienePersonal: { path: '/ofertas/higiene-personal', category: Category.OFERTAS },
        ofertasLacteos: { path: '/ofertas/lacteos', category: Category.OFERTAS },
        ofertasLimpieza: { path: '/ofertas/limpieza', category: Category.OFERTAS },
        ofertasMascotas: { path: '/ofertas/mascotas', category: Category.OFERTAS },
        ofertasPanaderia: { path: '/ofertas/panaderia', category: Category.OFERTAS },
        ofertasPerfumeria: { path: '/ofertas/perfumeria', category: Category.OFERTAS },
        ofertasQueseria: { path: '/ofertas/queseria', category: Category.OFERTAS },
        ofertasSnacks: { path: '/ofertas/snacks', category: Category.OFERTAS },

        // ALMACEN - Aceites
        aceitesOliva: { path: '/almacen/aceites/aceites-de-oliva', category: Category.ALMACEN },
        aceitesGirasol: { path: '/almacen/aceites/aceites-de-girasol', category: Category.ALMACEN },
        aceitesMaiz: { path: '/almacen/aceites/aceites-de-maiz', category: Category.ALMACEN },
        aceitesCanola: { path: '/almacen/aceites/aceites-de-canola', category: Category.ALMACEN },
        aceitesMezcla: { path: '/almacen/aceites/aceites-en-mezcla', category: Category.ALMACEN },
        aceitesCoco: { path: '/almacen/aceites/aceite-de-coco', category: Category.ALMACEN },
        aceitesOtros: { path: '/almacen/aceites/otros-aceites', category: Category.ALMACEN },

        // ALMACEN - Aderezos
        aderezosKetchup: { path: '/almacen/aderezos-y-condimentos/ketchup', category: Category.ALMACEN },
        aderezosMayonesa: { path: '/almacen/aderezos-y-condimentos/mayonesa', category: Category.ALMACEN },
        aderezosMostaza: { path: '/almacen/aderezos-y-condimentos/mostaza', category: Category.ALMACEN },
        aderezosEnsalada: { path: '/almacen/aderezos-y-condimentos/para-ensalada', category: Category.ALMACEN },
        aderezosVinagre: { path: '/almacen/aderezos-y-condimentos/vinagres', category: Category.ALMACEN },
        aderezosCondimentos: { path: '/almacen/aderezos-y-condimentos/condimentos', category: Category.ALMACEN },
        aderezosSalsasVarias: { path: '/almacen/aderezos-y-condimentos/salsas-varias', category: Category.ALMACEN },
        aderezosSalsaTomate: { path: '/almacen/aderezos-y-condimentos/salsas-de-tomate', category: Category.ALMACEN },
        aderezosComidaOriental: { path: '/almacen/aderezos-y-condimentos/comidas-orientales', category: Category.ALMACEN },
        aderezosSal: { path: '/almacen/aderezos-y-condimentos/sal', category: Category.ALMACEN },
        aderezosAjies: { path: '/almacen/aderezos-y-condimentos/ajies-y-picantes', category: Category.ALMACEN },

        // ALMACEN - Alimentos Enlatados
        enlatadosAtun: { path: '/almacen/alimentos-enlatados/atun-en-lata', category: Category.ALMACEN },
        enlatadosSardinas: { path: '/almacen/alimentos-enlatados/sardinas-en-lata', category: Category.ALMACEN },
        enlatadosLegumbres: { path: '/almacen/alimentos-enlatados/legumbres-en-lata', category: Category.ALMACEN },
        enlatadosVegetales: { path: '/almacen/alimentos-enlatados/vegetales-en-lata', category: Category.ALMACEN },
        enlatadosFrutas: { path: '/almacen/alimentos-enlatados/frutas-en-lata', category: Category.ALMACEN },
        enlatadosOtros: { path: '/almacen/alimentos-enlatados/otros-enlatados', category: Category.ALMACEN },
        enlatadosSopasCaldos: { path: '/almacen/alimentos-enlatados/caldos-y-sopas', category: Category.ALMACEN },
        enlatadosAceitunas: { path: '/almacen/alimentos-enlatados/aceitunas-y-encurtidos', category: Category.ALMACEN },

        // ALMACEN - Cafe, te e infusiones
        cafeGrano: { path: '/almacen/cafe-te-infusiones/cafe-en-grano', category: Category.DESAYUNO },
        cafeMolido: { path: '/almacen/cafe-te-infusiones/cafe-molido', category: Category.DESAYUNO },
        cafeInstantaneo: { path: '/almacen/cafe-te-infusiones/cafe-instantaneo', category: Category.DESAYUNO },
        cafeCremas: { path: '/almacen/cafe-te-infusiones/cremas-para-cafe', category: Category.DESAYUNO },
        cafeCapsulas: { path: '/almacen/cafe-te-infusiones/capsulas-de-cafe', category: Category.DESAYUNO },
        teTereYerba: { path: '/almacen/cafe-te-infusiones/te-tere-yerba', category: Category.DESAYUNO },
        infusiones: { path: '/almacen/cafe-te-infusiones/infusiones', category: Category.DESAYUNO },
        chocolate: { path: '/almacen/cafe-te-infusiones/cacao-y-chocolate', category: Category.DESAYUNO },

        // ALMACEN - Delicatessen
        delicatessen: { path: '/almacen/delicatessen', category: Category.ALMACEN },

        // ALMACEN - Golosinas y Galletitas
        galletasDulces: { path: '/almacen/golosinas-galletitas/galletitas-dulces', category: Category.GOLOSINAS },
        galletasSaladas: { path: '/almacen/golosinas-galletitas/galletitas-saladas', category: Category.GOLOSINAS },
        alfajores: { path: '/almacen/golosinas-galletitas/alfajores', category: Category.GOLOSINAS },
        caramelos: { path: '/almacen/golosinas-galletitas/caramelos', category: Category.GOLOSINAS },
        chocolates: { path: '/almacen/golosinas-galletitas/chocolates', category: Category.GOLOSINAS },
        chicles: { path: '/almacen/golosinas-galletitas/chicles', category: Category.GOLOSINAS },
        turrones: { path: '/almacen/golosinas-galletitas/turrones-barras', category: Category.GOLOSINAS },
        golosinasVarias: { path: '/almacen/golosinas-galletitas/golosinas-varias', category: Category.GOLOSINAS },
        cerealesBarra: { path: '/almacen/golosinas-galletitas/cereales-en-barra', category: Category.GOLOSINAS },

        // ALMACEN - Mermeladas y dulces
        mermeladas: { path: '/almacen/mermeladas-dulces-y-miel/mermeladas', category: Category.ALMACEN },
        dulceDeLeche: { path: '/almacen/mermeladas-dulces-y-miel/dulce-de-leche', category: Category.ALMACEN },
        miel: { path: '/almacen/mermeladas-dulces-y-miel/miel', category: Category.ALMACEN },
        dulcesUntables: { path: '/almacen/mermeladas-dulces-y-miel/dulces-untables', category: Category.ALMACEN },

        // ALMACEN - Productos basicos
        arroces: { path: '/almacen/productos-basicos/arroces', category: Category.ALMACEN },
        fideos: { path: '/almacen/productos-basicos/fideos', category: Category.ALMACEN },
        harinas: { path: '/almacen/productos-basicos/harinas', category: Category.ALMACEN },
        azucar: { path: '/almacen/productos-basicos/azucar', category: Category.ALMACEN },
        legumbres: { path: '/almacen/productos-basicos/legumbres', category: Category.ALMACEN },
        cereales: { path: '/almacen/productos-basicos/cereales', category: Category.ALMACEN },
        avena: { path: '/almacen/productos-basicos/avena', category: Category.ALMACEN },
        polenta: { path: '/almacen/productos-basicos/polenta-fecula-almidon', category: Category.ALMACEN },
        productosBasicosOtros: { path: '/almacen/productos-basicos/otros', category: Category.ALMACEN },

        // ALMACEN - Reposteria
        reposteriaChocolate: { path: '/almacen/reposteria/chocolate-para-reposteria', category: Category.REPOSTERIA },
        reposteriaEsencias: { path: '/almacen/reposteria/esencias', category: Category.REPOSTERIA },
        reposteriaCremasRellenos: { path: '/almacen/reposteria/cremas-y-rellenos', category: Category.REPOSTERIA },
        reposteriaLevadurasPolvo: { path: '/almacen/reposteria/levaduras-polvos', category: Category.REPOSTERIA },
        reposteriaPremezclas: { path: '/almacen/reposteria/premezclas', category: Category.REPOSTERIA },
        reposteriaGelatinas: { path: '/almacen/reposteria/gelatinas-flanes-postres', category: Category.REPOSTERIA },
        reposteriaDecorar: { path: '/almacen/reposteria/para-decorar', category: Category.REPOSTERIA },
        reposteriaOtros: { path: '/almacen/reposteria/otros', category: Category.REPOSTERIA },

        // BEBE
        bebeAlimentos: { path: '/bebe/alimentacion', category: Category.BEBES },
        bebePanales: { path: '/bebe/panales', category: Category.BEBES },
        bebeHigiene: { path: '/bebe/higiene-bebe', category: Category.BEBES },
        bebeAccesorios: { path: '/bebe/accesorios', category: Category.BEBES },

        // BEBIDAS CON ALCOHOL
        vinos: { path: '/bebidas-c-alcohol/vinos', category: Category.BEBIDAS_CON_ALCOHOL },
        cervezas: { path: '/bebidas-c-alcohol/cervezas', category: Category.BEBIDAS_CON_ALCOHOL },
        whiskies: { path: '/bebidas-c-alcohol/whiskies', category: Category.BEBIDAS_CON_ALCOHOL },
        vodkas: { path: '/bebidas-c-alcohol/vodka', category: Category.BEBIDAS_CON_ALCOHOL },
        rones: { path: '/bebidas-c-alcohol/ron', category: Category.BEBIDAS_CON_ALCOHOL },
        licores: { path: '/bebidas-c-alcohol/licores', category: Category.BEBIDAS_CON_ALCOHOL },
        espumantes: { path: '/bebidas-c-alcohol/espumantes', category: Category.BEBIDAS_CON_ALCOHOL },
        fernet: { path: '/bebidas-c-alcohol/fernet', category: Category.BEBIDAS_CON_ALCOHOL },
        piscoGinTequila: { path: '/bebidas-c-alcohol/pisco-gin-tequila', category: Category.BEBIDAS_CON_ALCOHOL },
        aperitivos: { path: '/bebidas-c-alcohol/aperitivos', category: Category.BEBIDAS_CON_ALCOHOL },
        cognacBrandy: { path: '/bebidas-c-alcohol/cognac-brandy', category: Category.BEBIDAS_CON_ALCOHOL },
        cana: { path: '/bebidas-c-alcohol/cana', category: Category.BEBIDAS_CON_ALCOHOL },

        // BEBIDAS SIN ALCOHOL
        aguasMineral: { path: '/bebidas-s-alcohol/aguas', category: Category.BEBIDAS_SIN_ALCOHOL },
        gaseosas: { path: '/bebidas-s-alcohol/gaseosas', category: Category.BEBIDAS_SIN_ALCOHOL },
        jugosListos: { path: '/bebidas-s-alcohol/jugos-listos-para-beber', category: Category.BEBIDAS_SIN_ALCOHOL },
        jugosConcentrados: { path: '/bebidas-s-alcohol/jugos-concentrados', category: Category.BEBIDAS_SIN_ALCOHOL },
        jugosPolvo: { path: '/bebidas-s-alcohol/jugos-en-polvo', category: Category.BEBIDAS_SIN_ALCOHOL },
        energizantes: { path: '/bebidas-s-alcohol/energizantes', category: Category.BEBIDAS_SIN_ALCOHOL },
        bebidasIsotonicas: { path: '/bebidas-s-alcohol/isotonicas-deportivas', category: Category.BEBIDAS_SIN_ALCOHOL },

        // CARNICERIA
        carneVacuna: { path: '/carniceria/vacuna', category: Category.CARNES },
        carneCerdo: { path: '/carniceria/cerdo', category: Category.CARNES },
        carnePollo: { path: '/carniceria/pollo', category: Category.CARNES },

        // CONFITERIA
        tortas: { path: '/confiteria/tortas', category: Category.PANADERIA },
        tartasEmpanadas: { path: '/confiteria/tartas-y-empanadas', category: Category.PANADERIA },
        facturas: { path: '/confiteria/facturas', category: Category.PANADERIA },
        budinesMuffins: { path: '/confiteria/budines-y-muffins', category: Category.PANADERIA },

        // CONGELADOS
        congeladosPollos: { path: '/congelados/pollos-y-aves', category: Category.CONGELADOS },
        congeladosPescados: { path: '/congelados/pescados', category: Category.CONGELADOS },
        congeladosMariscos: { path: '/congelados/mariscos', category: Category.CONGELADOS },
        congeladosVegetales: { path: '/congelados/vegetales', category: Category.CONGELADOS },
        congeladosPapas: { path: '/congelados/papas', category: Category.CONGELADOS },
        congeladosHamburguesas: { path: '/congelados/hamburguesas', category: Category.CONGELADOS },
        congeladosPizzas: { path: '/congelados/pizzas', category: Category.CONGELADOS },
        congeladosEmpanadas: { path: '/congelados/empanadas', category: Category.CONGELADOS },
        congeladosHelados: { path: '/congelados/helados', category: Category.CONGELADOS },
        congeladosPostres: { path: '/congelados/postres', category: Category.CONGELADOS },
        congeladosPanes: { path: '/congelados/panes', category: Category.CONGELADOS },
        congeladosPlatosPreparados: { path: '/congelados/platos-preparados', category: Category.CONGELADOS },
        congeladosCroquetasNuggets: { path: '/congelados/croquetas-y-nuggets', category: Category.CONGELADOS },
        congeladosOtros: { path: '/congelados/otros', category: Category.CONGELADOS },

        // DIETETICOS
        dieteticosEndulzantes: { path: '/dieteticos/endulzantes', category: Category.SALUDABLES },
        dieteticosProductos: { path: '/dieteticos/productos-dieteticos', category: Category.SALUDABLES },
        dieteticosSuplementos: { path: '/dieteticos/suplementos', category: Category.SALUDABLES },
        dieteticosProteinas: { path: '/dieteticos/proteinas', category: Category.SALUDABLES },

        // EMBUTIDOS
        embutidosJamon: { path: '/embutidos/jamon', category: Category.FIAMBRERIA },
        embutidosSalchichas: { path: '/embutidos/salchichas', category: Category.FIAMBRERIA },
        embutidosSalame: { path: '/embutidos/salame', category: Category.FIAMBRERIA },
        embutidosChorizo: { path: '/embutidos/chorizo', category: Category.FIAMBRERIA },
        embutidosMorcilla: { path: '/embutidos/morcilla', category: Category.FIAMBRERIA },
        embutidosPechuga: { path: '/embutidos/pechuga', category: Category.FIAMBRERIA },
        embutidosOtros: { path: '/embutidos/otros', category: Category.FIAMBRERIA },
        embutidosPate: { path: '/embutidos/pate', category: Category.FIAMBRERIA },
        embutidosPanceta: { path: '/embutidos/panceta', category: Category.FIAMBRERIA },

        // FRUTAS Y VERDURAS
        verduras: { path: '/frutas-y-verduras/verduras', category: Category.FRESCOS },
        frutas: { path: '/frutas-y-verduras/frutas', category: Category.FRESCOS },
        frutosSecos: { path: '/frutas-y-verduras/frutos-secos', category: Category.FRESCOS },
        hongos: { path: '/frutas-y-verduras/hongos', category: Category.FRESCOS },

        // HIGIENE PERSONAL
        higieneCapilar: { path: '/higiene-personal/capilar', category: Category.PERFUMERIA },
        higieneBucal: { path: '/higiene-personal/bucal', category: Category.PERFUMERIA },
        higieneCorporal: { path: '/higiene-personal/corporal', category: Category.PERFUMERIA },
        higieneIntima: { path: '/higiene-personal/higiene-intima', category: Category.PERFUMERIA },
        higieneDesodorantes: { path: '/higiene-personal/desodorantes', category: Category.PERFUMERIA },
        higieneAfeitado: { path: '/higiene-personal/afeitado', category: Category.PERFUMERIA },
        higieneProteccionSolar: { path: '/higiene-personal/proteccion-solar', category: Category.PERFUMERIA },
        higienePanuelosToallitas: { path: '/higiene-personal/panuelos-y-toallitas', category: Category.PERFUMERIA },
        higieneAlgodon: { path: '/higiene-personal/algodon', category: Category.PERFUMERIA },
        higienePapelHigienico: { path: '/higiene-personal/papel-higienico', category: Category.PERFUMERIA },
        higieneFemenina: { path: '/higiene-personal/higiene-femenina', category: Category.PERFUMERIA },
        higieneIncontinencia: { path: '/higiene-personal/incontinencia', category: Category.PERFUMERIA },
        higieneMaquillaje: { path: '/higiene-personal/maquillaje', category: Category.PERFUMERIA },

        // JUGUETES
        juguetes: { path: '/juguetes/todos-los-juguetes', category: Category.JUGUETES_Y_LIBRERIA },

        // LACTEOS
        lacteosLeches: { path: '/lacteos/leches', category: Category.LACTEOS },
        lacteosYogures: { path: '/lacteos/yogures', category: Category.LACTEOS },
        lacteosManteca: { path: '/lacteos/manteca', category: Category.LACTEOS },
        lacteosCremas: { path: '/lacteos/cremas', category: Category.LACTEOS },
        lacteosPostres: { path: '/lacteos/postres', category: Category.LACTEOS },
        lacteosHuevos: { path: '/lacteos/huevos', category: Category.LACTEOS },
        lacteosMargarina: { path: '/lacteos/margarina', category: Category.LACTEOS },

        // LIMPIEZA
        limpiezaLavandina: { path: '/limpieza/lavandina', category: Category.LIMPIEZA },
        limpiezaDesinfectantes: { path: '/limpieza/desinfectantes', category: Category.LIMPIEZA },
        limpiezaPisos: { path: '/limpieza/pisos', category: Category.LIMPIEZA },
        limpiezaCocina: { path: '/limpieza/cocina', category: Category.LIMPIEZA },
        limpiezaBano: { path: '/limpieza/bano', category: Category.LIMPIEZA },
        limpiezaMultiuso: { path: '/limpieza/multiuso', category: Category.LIMPIEZA },
        limpiezaVidrios: { path: '/limpieza/vidrios', category: Category.LIMPIEZA },
        limpiezaRopa: { path: '/limpieza/ropa', category: Category.LIMPIEZA },
        limpiezaInsecticidas: { path: '/limpieza/insecticidas', category: Category.LIMPIEZA },
        limpiezaAccesorios: { path: '/limpieza/accesorios', category: Category.LIMPIEZA },
        limpiezaVelas: { path: '/limpieza/velas-aromatizantes', category: Category.LIMPIEZA },
        limpiezaBolsasResiduos: { path: '/limpieza/bolsas-de-residuos', category: Category.LIMPIEZA },
        limpiezaPapelAbsorbente: { path: '/limpieza/papel-absorbente', category: Category.LIMPIEZA },
        limpiezaServilletas: { path: '/limpieza/servilletas', category: Category.LIMPIEZA },
        limpiezaFilms: { path: '/limpieza/films-aluminio', category: Category.LIMPIEZA },
        limpiezaBolsasVarias: { path: '/limpieza/bolsas-varias', category: Category.LIMPIEZA },
        limpiezaDescartables: { path: '/limpieza/descartables', category: Category.LIMPIEZA },

        // MASCOTAS
        mascotasPerroAlimento: { path: '/mascotas/perro/alimento', category: Category.MASCOTAS },
        mascotasPerroSnacks: { path: '/mascotas/perro/snacks', category: Category.MASCOTAS },
        mascotasPerroHigiene: { path: '/mascotas/perro/higiene', category: Category.MASCOTAS },
        mascotasPerroAccesorios: { path: '/mascotas/perro/accesorios', category: Category.MASCOTAS },
        mascotasGatoAlimento: { path: '/mascotas/gato/alimento', category: Category.MASCOTAS },
        mascotasGatoSnacks: { path: '/mascotas/gato/snacks', category: Category.MASCOTAS },
        mascotasGatoHigiene: { path: '/mascotas/gato/higiene', category: Category.MASCOTAS },
        mascotasGatoAccesorios: { path: '/mascotas/gato/accesorios', category: Category.MASCOTAS },

        // PANADERIA
        panaderiaLactal: { path: '/panaderia/pan-lactal', category: Category.PANADERIA },
        panaderiaPanFrances: { path: '/panaderia/pan-frances', category: Category.PANADERIA },
        panaderiaChipa: { path: '/panaderia/chipa', category: Category.PANADERIA },
        panaderiaTapas: { path: '/panaderia/tapas', category: Category.PANADERIA },
        panaderiaTostadas: { path: '/panaderia/tostadas-grisines', category: Category.PANADERIA },
        panaderiaPanDulce: { path: '/panaderia/pan-dulce', category: Category.PANADERIA },
        panaderiaOtros: { path: '/panaderia/otros', category: Category.PANADERIA },

        // PASTAS FRESCAS
        pastasFrescasSimples: { path: '/pastas-frescas/simples', category: Category.PASTAS },
        pastasFrescasRellenas: { path: '/pastas-frescas/rellenas', category: Category.PASTAS },
        pastasFrescasNoquis: { path: '/pastas-frescas/noquis', category: Category.PASTAS },
        pastasFrescasOtras: { path: '/pastas-frescas/otras', category: Category.PASTAS },

        // PERFUMERIA
        perfumeriaColonias: { path: '/perfumeria/colonias', category: Category.PERFUMERIA },
        perfumeriaPerfumes: { path: '/perfumeria/perfumes', category: Category.PERFUMERIA },
        perfumeriaCremas: { path: '/perfumeria/cremas', category: Category.PERFUMERIA },

        // PESCADERIA Y FRUTOS DEL MAR
        pescaderiaFrescos: { path: '/pescaderiayfrutosdemar/frescos', category: Category.CARNES },

        // PRODUCTOS A GRANEL
        productosGranel: { path: '/productos-a-granel/todos', category: Category.ALMACEN },

        // PRODUCTOS SIN LACTOSA
        sinLactosa: { path: '/productos-sin-lactosa/todos', category: Category.SALUDABLES },

        // QUESERIA
        queseriaDuros: { path: '/queseria/duros', category: Category.LACTEOS },
        queseriaSemiduros: { path: '/queseria/semiduros', category: Category.LACTEOS },
        queseriaBlandos: { path: '/queseria/blandos', category: Category.LACTEOS },
        queseriaRallados: { path: '/queseria/rallados', category: Category.LACTEOS },
        queseriaFundidos: { path: '/queseria/fundidos', category: Category.LACTEOS },
        queseriaCremosos: { path: '/queseria/cremosos', category: Category.LACTEOS },
        queseriaUntar: { path: '/queseria/para-untar', category: Category.LACTEOS },

        // SNACKS
        snacksPapas: { path: '/snacks/papas', category: Category.GOLOSINAS },
        snacksMani: { path: '/snacks/mani', category: Category.GOLOSINAS },
        snacksNachos: { path: '/snacks/nachos', category: Category.GOLOSINAS },
        snacksPalitos: { path: '/snacks/palitos-chizitos', category: Category.GOLOSINAS },
        snacksOtros: { path: '/snacks/otros', category: Category.GOLOSINAS },
    },

    selectors: {
        // Product container
        productContainer: 'div.div-product-list',

        // Product data
        brand: 'h6.ptitle',
        name: 'h6.psubtitle a.apsubtitle',
        url: 'a.apsubtitle',
        image: 'picture.imgprodts source',
        imageAttr: 'srcset',

        // Prices
        price: 'h6.pprice',

        // Discount
        discountPercent: '.limit-desc-t',

        // IDs
        externalId: 'input.productsListId',

        // Pagination
        nextPage: 'li.page-item a[rel="next"]',
    },

    // Parse price: "Gs. 110.000" -> 110000
    // Handles cases where multiple prices might be in the text
    parsePrice: (text: string | null): number | null => {
        if (!text) return null
        // Match first price pattern: digits with dots as thousands separator
        const match = text.match(/(\d{1,3}(?:\.\d{3})+|\d+)/)
        if (!match) return null
        const cleaned = match[1].replace(/\./g, '')
        const num = parseInt(cleaned, 10)
        // Sanity check: prices shouldn't exceed 100 million Gs
        return isNaN(num) || num > 100000000 ? null : num
    },

    // Parse discount: "28% OFF" -> 28
    parseDiscount: (text: string | null): number | null => {
        if (!text) return null
        const match = text.match(/(\d+)/)
        return match ? parseInt(match[1], 10) : null
    },

    // Extract barcode from image URL: ".../7840833000562.webp" -> "7840833000562"
    extractBarcode: (imageUrl: string | undefined): string | null => {
        if (!imageUrl) return null
        const match = imageUrl.match(/\/(\d{8,14})\.(jpg|png|webp)/i)
        return match ? match[1] : null
    },

    // Build full URL
    buildFullUrl: (baseUrl: string, path: string | undefined): string => {
        if (!path) return ''
        return path.startsWith('http') ? path : `${baseUrl}${path}`
    },
}

export type SalemmaConfig = typeof salemmaConfig

const routes = salemmaConfig.routes
export type SalemmaRouteKey = keyof typeof routes
