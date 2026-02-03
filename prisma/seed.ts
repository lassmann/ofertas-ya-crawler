import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, StoreType } from '../generated/prisma/client.js'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const db = new PrismaClient({ adapter })

const stores = [
  {
    name: 'Superseis',
    slug: 'superseis',
    type: StoreType.SUPERMERCADO,
    websiteUrl: 'https://www.superseis.com.py',
  },
  {
    name: 'Fortis',
    slug: 'fortis',
    type: StoreType.SUPERMERCADO,
    websiteUrl: 'https://www.fortis.com.py',
  },
  {
    name: 'Stock',
    slug: 'stock',
    type: StoreType.SUPERMERCADO,
    websiteUrl: 'https://www.stock.com.py',
  },
  {
    name: 'Casa Rica',
    slug: 'casarica',
    type: StoreType.SUPERMERCADO,
    websiteUrl: 'https://www.casarica.com.py',
  },
  {
    name: 'Biggie',
    slug: 'biggie',
    type: StoreType.SUPERMERCADO,
    websiteUrl: 'https://biggie.com.py',
  },
  {
    name: 'Salemma',
    slug: 'salemma',
    type: StoreType.SUPERMERCADO,
    websiteUrl: 'https://www.salemmaonline.com.py',
  },
  {
    name: 'Arete',
    slug: 'arete',
    type: StoreType.SUPERMERCADO,
    websiteUrl: 'https://www.arete.com.py',
  },
]

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n')

  let created = 0
  let updated = 0

  for (const store of stores) {
    const result = await db.store.upsert({
      where: { slug: store.slug },
      update: {
        name: store.name,
        type: store.type,
        websiteUrl: store.websiteUrl,
      },
      create: store,
    })

    // Check if it was created or updated by comparing timestamps
    const isNew = result.createdAt.getTime() === result.updatedAt.getTime()
    if (isNew) {
      created++
      console.log(`  ✅ Creado: ${store.name}`)
    } else {
      updated++
      console.log(`  🔄 Actualizado: ${store.name}`)
    }
  }

  console.log('\n📊 Resumen:')
  console.log(`  - Tiendas creadas: ${created}`)
  console.log(`  - Tiendas actualizadas: ${updated}`)
  console.log(`  - Total: ${stores.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
