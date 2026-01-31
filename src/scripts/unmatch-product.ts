import 'dotenv/config'
import { db } from '../lib/db.js'
import { logger } from '../lib/logger.js'

function printUsage() {
  console.log(`
Uso:
  npm run unmatch -- --product-id=<id>
  npm run unmatch -- --canonical-id=<id> --store=<nombre>

Opciones:
  --product-id    ID del producto a remover de su match
  --canonical-id  ID del CanonicalProduct
  --store         Nombre de la tienda (usado con --canonical-id)
  --hide          También marcar el producto como oculto (isHidden=true)
  --dry-run       Mostrar qué se eliminaría sin hacerlo

Ejemplos:
  npm run unmatch -- --product-id=abc-123
  npm run unmatch -- --product-id=abc-123 --hide
  npm run unmatch -- --canonical-id=xyz-789 --store=Biggie
  npm run unmatch -- --canonical-id=xyz-789 --store=Biggie --dry-run
`)
}

async function unmatchByProductId(productId: string, dryRun: boolean, hide: boolean) {
  // Find the product match
  const match = await db.productMatch.findUnique({
    where: { productId },
    include: {
      product: {
        include: { store: true },
      },
      canonicalProduct: true,
    },
  })

  if (!match) {
    logger.error(`No se encontró match para el producto ${productId}`)
    return false
  }

  logger.info(`Producto: ${match.product.name}`)
  logger.info(`Tienda: ${match.product.store.name}`)
  logger.info(`Match con: ${match.canonicalProduct.name} (${match.canonicalProduct.id})`)
  logger.info(`Tipo de match: ${match.matchType} (confianza: ${(match.confidence * 100).toFixed(0)}%)`)

  if (dryRun) {
    logger.warn('[DRY RUN] Se eliminaría este match')
    if (hide) {
      logger.warn('[DRY RUN] El producto sería marcado como oculto')
    }
    return true
  }

  await db.productMatch.delete({
    where: { id: match.id },
  })

  if (hide) {
    await db.product.update({
      where: { id: productId },
      data: { isHidden: true },
    })
    logger.success(`✓ Match eliminado y producto marcado como oculto.`)
  } else {
    logger.success(`✓ Match eliminado. El producto ahora está sin match.`)
  }
  return true
}

async function unmatchByCanonicalAndStore(canonicalId: string, storeName: string, dryRun: boolean, hide: boolean) {
  // Find the store
  const store = await db.store.findFirst({
    where: {
      name: {
        equals: storeName,
        mode: 'insensitive',
      },
    },
  })

  if (!store) {
    logger.error(`No se encontró la tienda: ${storeName}`)
    const stores = await db.store.findMany({ select: { name: true } })
    logger.info(`Tiendas disponibles: ${stores.map(s => s.name).join(', ')}`)
    return false
  }

  // Find matches for this canonical product from this store
  const matches = await db.productMatch.findMany({
    where: {
      canonicalProductId: canonicalId,
      product: {
        storeId: store.id,
      },
    },
    include: {
      product: {
        include: { store: true },
      },
      canonicalProduct: true,
    },
  })

  if (matches.length === 0) {
    logger.error(`No se encontró match del canonical ${canonicalId} en la tienda ${storeName}`)
    return false
  }

  logger.info(`Se encontraron ${matches.length} producto(s) de ${storeName} en este match:`)

  for (const match of matches) {
    logger.info(`  - ${match.product.name} (${match.product.id})`)
    logger.info(`    Match tipo: ${match.matchType} (confianza: ${(match.confidence * 100).toFixed(0)}%)`)
  }

  if (dryRun) {
    logger.warn(`[DRY RUN] Se eliminarían ${matches.length} match(es)`)
    if (hide) {
      logger.warn(`[DRY RUN] Los productos serían marcados como ocultos`)
    }
    return true
  }

  const productIds = matches.map(m => m.product.id)

  const deleted = await db.productMatch.deleteMany({
    where: {
      id: { in: matches.map(m => m.id) },
    },
  })

  if (hide) {
    await db.product.updateMany({
      where: { id: { in: productIds } },
      data: { isHidden: true },
    })
    logger.success(`✓ ${deleted.count} match(es) eliminado(s) y productos marcados como ocultos.`)
  } else {
    logger.success(`✓ ${deleted.count} match(es) eliminado(s). Los productos ahora están sin match.`)
  }
  return true
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage()
    process.exit(0)
  }

  const productId = args.find(a => a.startsWith('--product-id='))?.split('=')[1]
  const canonicalId = args.find(a => a.startsWith('--canonical-id='))?.split('=')[1]
  const store = args.find(a => a.startsWith('--store='))?.split('=')[1]
  const dryRun = args.includes('--dry-run')
  const hide = args.includes('--hide')

  if (dryRun) {
    logger.warn('Modo DRY RUN activado - no se realizarán cambios')
  }
  if (hide) {
    logger.info('Modo HIDE activado - los productos serán marcados como ocultos')
  }

  let success = false

  if (productId) {
    success = await unmatchByProductId(productId, dryRun, hide)
  } else if (canonicalId && store) {
    success = await unmatchByCanonicalAndStore(canonicalId, store, dryRun, hide)
  } else if (canonicalId && !store) {
    logger.error('Debes especificar --store cuando uses --canonical-id')
    printUsage()
  } else {
    logger.error('Debes especificar --product-id o --canonical-id + --store')
    printUsage()
  }

  await db.$disconnect()
  process.exit(success ? 0 : 1)
}

main().catch(err => {
  logger.error(err)
  process.exit(1)
})
