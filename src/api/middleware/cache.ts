import { Request, Response, NextFunction } from 'express'
import { cacheService } from '../../lib/cache.js'

interface CacheOptions {
  ttl?: number
  keyGenerator?: (req: Request) => string
}

const defaultKeyGenerator = (req: Request): string => {
  const queryString = Object.keys(req.query)
    .sort()
    .map(key => `${key}=${req.query[key]}`)
    .join('&')
  return `${req.baseUrl}${req.path}${queryString ? '?' + queryString : ''}`
}

export function withCache(options: CacheOptions = {}) {
  const { ttl, keyGenerator = defaultKeyGenerator } = options

  return (req: Request, res: Response, next: NextFunction): void => {
    const cacheKey = keyGenerator(req)
    const cached = cacheService.get<{ body: unknown; statusCode: number }>(cacheKey)

    if (cached) {
      res.set('X-Cache', 'HIT')
      res.set('X-Cache-Key', cacheKey)
      res.status(cached.statusCode).json(cached.body)
      return
    }

    res.set('X-Cache', 'MISS')
    res.set('X-Cache-Key', cacheKey)

    const originalJson = res.json.bind(res)
    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.set(cacheKey, { body, statusCode: res.statusCode }, ttl)
      }
      return originalJson(body)
    }

    next()
  }
}

export function invalidateCache(patterns: string[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res)
    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach(pattern => cacheService.invalidate(pattern))
      }
      return originalJson(body)
    }
    next()
  }
}
