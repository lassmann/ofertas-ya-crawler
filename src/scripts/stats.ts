import { db } from '../lib/db'
import { logger } from '../lib/logger'

async function main() {
  const products = await db.product.count()
  const prices = await db.price.count()
  const stores = await db.store.count()

  logger.box([
    '📊 Database Statistics',
    '',
    `   Stores:    ${stores}`,
    `   Products:  ${products}`,
    `   Prices:    ${prices}`,
  ].join('\n'))

  // Products by store
  const byStore = await db.product.groupBy({
    by: ['storeId'],
    _count: true,
  })

  if (byStore.length > 0) {
    logger.info('📦 Products by store:')
    for (const group of byStore) {
      const store = await db.store.findUnique({ where: { id: group.storeId } })
      logger.log(`  - ${store?.name}: ${group._count}`)
    }
  }

  // Products by category (top 10)
  const byCategory = await db.product.groupBy({
    by: ['category'],
    _count: true,
    orderBy: { _count: { category: 'desc' } },
    take: 10,
  })

  if (byCategory.length > 0) {
    logger.info('🏷️  Top 10 categories:')
    byCategory.forEach(c => {
      logger.log(`  - ${c.category || 'no category'}: ${c._count}`)
    })
  }

  await db.$disconnect()
}

main().catch(logger.error)