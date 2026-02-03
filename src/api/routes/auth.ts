import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { db } from '../../lib/db.js'

export const authRouter = Router()

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' })
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Credenciales inválidas' })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas' })
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )

  res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
})
