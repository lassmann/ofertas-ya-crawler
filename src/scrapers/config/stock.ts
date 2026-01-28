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
        aceitunasChampi: { path: '/category/870-aceitunaschampignon.aspx', category: Category.ALMACEN },
        bocaditos: { path: '/category/26-almacen-alimentos-secos-bocaditos.aspx', category: Category.ALMACEN },
        mani: { path: '/category/71-almacen-alimentos-secos-mani.aspx', category: Category.ALMACEN },
        nachos: { path: '/category/76-almacen-alimentos-secos-nachos.aspx', category: Category.ALMACEN },
        otrosEncurtidos: { path: '/category/97-almacen-encurtido-otros-encurtidos.aspx', category: Category.ALMACEN },
        papasFritas: { path: '/category/81-almacen-alimentos-secos-papas-fritas.aspx', category: Category.ALMACEN },
        pepinos: { path: '/category/98-almacen-encurtido-pepinos.aspx', category: Category.ALMACEN },
        frutasEnlatadas: { path: '/category/880-frutas-enlatadas.aspx', category: Category.ALMACEN },
        legumbresEnlatadas: { path: '/category/881-legumbres-enlatadas.aspx', category: Category.ALMACEN },
        patePicadillo: { path: '/category/874-patepicadilloconservas.aspx', category: Category.ALMACEN },
        atunMariscos: { path: '/category/882-atunmariscossardinas.aspx', category: Category.ALMACEN },

        // Sweets
        galletitasPostres: { path: '/category/963-galletitaspostres.aspx', category: Category.GOLOSINAS },
        alfajores: { path: '/category/967-alfajores.aspx', category: Category.GOLOSINAS },
        caramelosChicles: { path: '/category/972-carameloschicles.aspx', category: Category.GOLOSINAS },
        chocolates: { path: '/category/968-chocolates.aspx', category: Category.GOLOSINAS },
        turrones: { path: '/category/971-turrones.aspx', category: Category.GOLOSINAS },

        // Breakfast
        cafe: { path: '/category/888-cafe.aspx', category: Category.DESAYUNO },
        te: { path: '/category/889-te.aspx', category: Category.DESAYUNO },
        yerba: { path: '/category/890-yerba.aspx', category: Category.DESAYUNO },

        // Baby
        desechablesBebe: { path: '/category/226-bebes-perfumeria-desechables.aspx', category: Category.BEBES },
        toallitasHumedas: { path: '/category/230-bebes-perfumeria-toallitas-humedas.aspx', category: Category.BEBES },
        aceitesBebe: { path: '/category/222-bebes-perfumeria-aceites.aspx', category: Category.BEBES },
        capilaresBebe: { path: '/category/223-bebes-perfumeria-capilares.aspx', category: Category.BEBES },
        jabonesBebe: { path: '/category/227-bebes-perfumeria-jabones.aspx', category: Category.BEBES },

        // Alcoholic beverages
        cervezaEstandar: { path: '/category/254-bebidas-alcoholicas-estandar.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        cervezaTerceraLinea: { path: '/category/265-bebidas-alcoholicas-tercera-linea.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        cervezaPremium: { path: '/category/260-bebidas-alcoholicas-premiun.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        aperitivos: { path: '/category/245-bebidas-alcoholicas-aperitivos-con-alcohol.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        cervezaNormales: { path: '/category/258-bebidas-alcoholicas-normales.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        aguardiente: { path: '/category/244-bebidas-alcoholicas-aguardiente.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        cana: { path: '/category/249-bebidas-alcoholicas-cana.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        tequila: { path: '/category/264-bebidas-alcoholicas-tequila.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        vodka: { path: '/category/274-bebidas-alcoholicas-vodka.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        cervezaBlancas: { path: '/category/247-bebidas-alcoholicas-blancas.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        vinosDulces: { path: '/category/267-bebidas-alcoholicas-vinos-dulces.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        vinosBlancos: { path: '/category/269-bebidas-alcoholicas-vinos-finos-blancos.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        vinosRosados: { path: '/category/270-bebidas-alcoholicas-vinos-finos-rosados.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        vinosTintos: { path: '/category/271-bebidas-alcoholicas-vinos-finos-tintos.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        vinosGasificados: { path: '/category/272-bebidas-alcoholicas-vinos-gasificados.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        vinosTetra: { path: '/category/273-bebidas-alcoholicas-vinos-tetra.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        champagne: { path: '/category/250-bebidas-alcoholicas-champagne.aspx', category: Category.BEBIDAS_CON_ALCOHOL },
        sidras: { path: '/category/262-bebidas-alcoholicas-sidras.aspx', category: Category.BEBIDAS_CON_ALCOHOL },

        // Non-alcoholic beverages
        aguasMineralizadas: { path: '/category/276-bebidas-no-alcoholicas-aguas-mineralizadas.aspx', category: Category.BEBIDAS_SIN_ALCOHOL },
        aperitivosSinAlcohol: { path: '/category/246-bebidas-alcoholicas-aperitivos-sin-alcohol.aspx', category: Category.BEBIDAS_SIN_ALCOHOL },
        energizantes: { path: '/category/278-bebidas-no-alcoholicas-energizantes.aspx', category: Category.BEBIDAS_SIN_ALCOHOL },
        isotonicos: { path: '/category/280-bebidas-no-alcoholicas-isotonicos.aspx', category: Category.BEBIDAS_SIN_ALCOHOL },
        gaseosasLight: { path: '/category/282-bebidas-no-alcoholicas-light.aspx', category: Category.BEBIDAS_SIN_ALCOHOL },
        gaseosasNormal: { path: '/category/284-bebidas-no-alcoholicas-normal.aspx', category: Category.BEBIDAS_SIN_ALCOHOL },
        concentrados: { path: '/category/277-bebidas-no-alcoholicas-concentrados.aspx', category: Category.BEBIDAS_SIN_ALCOHOL },
        jugosEnPolvo: { path: '/category/281-bebidas-no-alcoholicas-jugos-en-polvos.aspx', category: Category.BEBIDAS_SIN_ALCOHOL },
        jugosLiquidos: { path: '/category/283-bebidas-no-alcoholicas-liquido.aspx', category: Category.BEBIDAS_SIN_ALCOHOL },
        bebidasSoja: { path: '/category/285-bebidas-no-alcoholicas-soja.aspx', category: Category.BEBIDAS_SIN_ALCOHOL },

        // Meats
        pollos: { path: '/category/618-perecedero-carnes-pollos.aspx', category: Category.CARNES },
        cerdoGranel: { path: '/category/608-perecedero-carnes-cerdo-granel.aspx', category: Category.CARNES },
        carnesGranel: { path: '/category/605-carnes-carnes-a-granel-lomito-tapa-rabadilla-todos-los-cortes-a-domicilio.aspx', category: Category.CARNES },
        carnesAlVacio: { path: '/category/606-perecedero-carnes-carnes-al-vacio.aspx', category: Category.CARNES },
        carnesEnBandeja: { path: '/category/607-perecedero-carnes-carnes-en-bandeja.aspx', category: Category.CARNES },
        menudenciaVacuna: { path: '/category/611-perecedero-carnes-menudencia-vacuna.aspx', category: Category.CARNES },

        // Frozen
        carneBlancaCongelada: { path: '/category/635-perecedero-congelados-a-base-de-carne-blanca.aspx', category: Category.CONGELADOS },
        comidasPreparadas: { path: '/category/646-perecedero-congelados-otras-comidas-preparadas.aspx', category: Category.CONGELADOS },
        pizzasCongeladas: { path: '/category/649-perecedero-congelados-pizzas-congeladas.aspx', category: Category.CONGELADOS },
        frutasCongeladas: { path: '/category/638-perecedero-congelados-frutas-congeladas.aspx', category: Category.CONGELADOS },
        papasCongeladas: { path: '/category/647-perecedero-congelados-papas-congeladas.aspx', category: Category.CONGELADOS },
        verdurasCongeladas: { path: '/category/652-perecedero-congelados-verduras-congeladas.aspx', category: Category.CONGELADOS },
        hamburguesaAves: { path: '/category/639-perecedero-congelados-hamburguesa-de-aves.aspx', category: Category.CONGELADOS },
        hamburguesaVacuna: { path: '/category/640-perecedero-congelados-hamburguesa-vacuna.aspx', category: Category.CONGELADOS },
        pescadosCongelados: { path: '/category/648-perecedero-congelados-pescados-congelados.aspx', category: Category.CONGELADOS },

        // Deli
        embutidosDespacho: { path: '/category/655-perecedero-fiambreria-embutidos-al-despacho.aspx', category: Category.FIAMBRERIA },
        embutidosEnvasados: { path: '/category/656-perecedero-fiambreria-embutidos-envasadosautoservic.aspx', category: Category.FIAMBRERIA },
        pates: { path: '/category/661-perecedero-fiambreria-pates.aspx', category: Category.FIAMBRERIA },
        fiambresDespacho: { path: '/category/658-perecedero-fiambreria-fiambres-al-despachofrescos.aspx', category: Category.FIAMBRERIA },
        fiambresEnvasados: { path: '/category/659-perecedero-fiambreria-fiambres-envasadosautoservici.aspx', category: Category.FIAMBRERIA },
        encurtidosDespacho: { path: '/category/657-perecedero-fiambreria-encurtidos-al-despacho.aspx', category: Category.FIAMBRERIA },

        // Dairy - Cheese
        quesoParaguayRicota: { path: '/category/945-paraguayricota.aspx', category: Category.LACTEOS },
        quesoCremosoCuartirolo: { path: '/category/946-cremososcuartirolo.aspx', category: Category.LACTEOS },
        quesoReggianitoParmesano: { path: '/category/947-regianitoparmesano.aspx', category: Category.LACTEOS },
        quesosRallados: { path: '/category/728-perecedero-queseria-quesos-rallados.aspx', category: Category.LACTEOS },
        quesosSemiBlandos: { path: '/category/730-perecedero-queseria-quesos-semi-blandos-env.aspx', category: Category.LACTEOS },
        quesosUntables: { path: '/category/731-perecedero-queseria-quesos-untables-env.aspx', category: Category.LACTEOS },

        // Fresh - Fruits and Vegetables
        citricos: { path: '/category/663-perecedero-frutas-y-verduras-citricos.aspx', category: Category.FRESCOS },
        frutasConCarozo: { path: '/category/664-perecedero-frutas-y-verduras-con-carozo-pulpa.aspx', category: Category.FRESCOS },
        frutasExoticas: { path: '/category/666-perecedero-frutas-y-verduras-exotico-tropical.aspx', category: Category.FRESCOS },
        frutasPepitas: { path: '/category/670-perecedero-frutas-y-verduras-pepitas.aspx', category: Category.FRESCOS },
        verdurasDeFrutos: { path: '/category/665-perecedero-frutas-y-verduras-de-frutos.aspx', category: Category.FRESCOS },
        legumbresFrescas: { path: '/category/667-perecedero-frutas-y-verduras-legumbres.aspx', category: Category.FRESCOS },
        tuberculosRaices: { path: '/category/671-perecedero-frutas-y-verduras-tuberculos-raices.aspx', category: Category.FRESCOS },
        verdurasDeHoja: { path: '/category/673-perecedero-frutas-y-verduras-verduras-de-hoja.aspx', category: Category.FRESCOS },
        huevos: { path: '/category/676-perecedero-huevos-huevos-de-gallinas.aspx', category: Category.FRESCOS },
    },

    selectors: {
        // Product container
        productContainer: '.product-item',

        // Product data
        name: 'h2.product-title a',
        url: 'h2.product-title a',
        image: '.picture img',

        // Prices - Stock uses span structure
        price: '.productPrice .price-label',

        // Out of stock
        outOfStock: '.producto-sin-existencia',

        // Product ID - found in container class (product236926)
        productId: '', // Extracted from class

        // Pagination
        pagination: '.pager a',
        nextPage: '.next-page a, .pager a[rel="next"]',
    },

    // Parse price: " 11.050" -> 11050
    parsePrice: (text: string | null): number | null => {
        if (!text) return null
        const cleaned = text.replace(/[Gs\s.]/g, '')
        const num = parseInt(cleaned, 10)
        return isNaN(num) ? null : num
    },

    // Extract product ID from class: "product-item product236926" -> "236926"
    extractProductId: (className: string | null): string | null => {
        if (!className) return null
        const match = className.match(/product(\d+)/)
        return match ? match[1] : null
    },

    // Extract page number from URL - Stock uses ?pageindex=X
    extractPageNumber: (url: string): number | null => {
        const match = url.match(/pageindex=(\d+)/i)
        return match ? parseInt(match[1], 10) : null
    },
}

export type StockConfig = typeof stockConfig

const routes = stockConfig.routes
export type StockRouteKey = keyof typeof routes