import { Category } from './categories'

export const biggieConfig = {
    name: 'Biggie',
    slug: 'biggie',
    baseUrl: 'https://biggie.com.py',
    apiUrl: 'https://api.app.biggie.com.py/api/articles',
    pageSize: 50,

    routes: {
        alimentosEspeciales: { path: 'alimentos-especiales', category: Category.SALUDABLES },
        almacen: { path: 'almacen', category: Category.ALMACEN },
        asado: { path: 'asado', category: Category.CARNES },
        bebes: { path: 'bebes', category: Category.BEBES },
        bebidasSinAlcohol: { path: 'bebidas-sin-alcohol', category: Category.BEBIDAS_SIN_ALCOHOL },
        carniceria: { path: 'carniceria', category: Category.CARNES },
        chocolatesGolosinas: { path: 'chocolates-y-golosinas', category: Category.GOLOSINAS },
        congelados: { path: 'congelados', category: Category.CONGELADOS },
        fiambreria: { path: 'fiambreria', category: Category.FIAMBRERIA },
        fruteriaVerduleria: { path: 'fruteria-y-verduleria', category: Category.FRESCOS },
        heladeriaConfiteria: { path: 'heladeria-y-confiteria', category: Category.REPOSTERIA },
        higienePersonal: { path: 'higiene-personal', category: Category.PERFUMERIA },
        lacteos: { path: 'lacteos', category: Category.LACTEOS },
        libreria: { path: 'libreria', category: Category.JUGUETES_Y_LIBRERIA },
        limpieza: { path: 'limpieza', category: Category.LIMPIEZA },
        mascotas: { path: 'mascotas', category: Category.MASCOTAS },
        panaderia: { path: 'panaderia', category: Category.PANADERIA },
        snacks: { path: 'snacks', category: Category.GOLOSINAS },
        varios: { path: 'varios', category: Category.HOGAR_Y_BAZAR },
    },
}

export type BiggieConfig = typeof biggieConfig

const routes = biggieConfig.routes
export type BiggieRouteKey = keyof typeof routes
