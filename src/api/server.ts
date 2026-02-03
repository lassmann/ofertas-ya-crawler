import express from 'express'
import cors from 'cors'
import { productsRouter } from './routes/products.js'
import { storesRouter } from './routes/stores.js'
import { compareRouter } from './routes/compare.js'
import { matchesRouter } from './routes/matches.js'
import { statsRouter } from './routes/stats.js'
import { featuredRouter } from './routes/featured.js'
import { canonicalRouter } from './routes/canonical.js'
import { authRouter } from './routes/auth.js'

const app = express()
const PORT = process.env.API_PORT || 3001

app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', authRouter)
app.use('/api/products', productsRouter)
app.use('/api/stores', storesRouter)
app.use('/api/compare', compareRouter)
app.use('/api/matches', matchesRouter)
app.use('/api/stats', statsRouter)
app.use('/api/featured', featuredRouter)
app.use('/api/canonical', canonicalRouter)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
