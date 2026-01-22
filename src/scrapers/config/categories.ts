/**
 * Categorías estandarizadas para todos los supermercados.
 * Usar estas categorías permite comparar productos entre diferentes supermercados.
 */
export enum Category {
    // Alimentos básicos
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

    // Bebidas
    BEBIDAS_CON_ALCOHOL = 'bebidas-con-alcohol',
    BEBIDAS_SIN_ALCOHOL = 'bebidas-sin-alcohol',

    // Hogar y limpieza
    HOGAR_Y_BAZAR = 'hogar-y-bazar',
    LIMPIEZA = 'limpieza',
    FERRETERIA = 'ferreteria',

    // Cuidado personal y salud
    PERFUMERIA = 'perfumeria',
    BEBES = 'bebes',
    MASCOTAS = 'mascotas',

    // Otros
    ELECTRODOMESTICOS = 'electrodomesticos',
    JUGUETES_Y_LIBRERIA = 'juguetes-y-libreria',

    // Ofertas especiales
    OFERTAS = 'ofertas',
}

export type CategoryValue = `${Category}`
