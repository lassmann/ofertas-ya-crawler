/**
 * Standardized categories for all supermarkets.
 * Using these categories allows comparing products across different supermarkets.
 */
export enum Category {
    // Basic foods
    ALMACEN = 'almacen',
    LACTEOS = 'lacteos',
    CARNES = 'carnes',
    CONGELADOS = 'congelados',
    FRESCOS = 'frescos',
    FIAMBRERIA = 'fiambreria',
    PASTAS = 'pastas',
    PANADERIA = 'panaderia',
    REPOSTERIA = 'reposteria',
    DESAYUNO = 'desayuno',
    GOLOSINAS = 'golosinas',
    SALUDABLES = 'saludables',

    // Beverages
    BEBIDAS_CON_ALCOHOL = 'bebidas-con-alcohol',
    BEBIDAS_SIN_ALCOHOL = 'bebidas-sin-alcohol',

    // Home and cleaning
    HOGAR_Y_BAZAR = 'hogar-y-bazar',
    LIMPIEZA = 'limpieza',
    FERRETERIA = 'ferreteria',

    // Personal care and health
    PERFUMERIA = 'perfumeria',
    BEBES = 'bebes',
    MASCOTAS = 'mascotas',

    // Others
    ELECTRODOMESTICOS = 'electrodomesticos',
    JUGUETES_Y_LIBRERIA = 'juguetes-y-libreria',

    // Special offers
    OFERTAS = 'ofertas',
}

export type CategoryValue = `${Category}`
