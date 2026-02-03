import 'dotenv/config'
import * as bcrypt from 'bcrypt'
import { db } from '../src/lib/db.js'

const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.log('Uso: npm run db:create-user <email> <password>')
  process.exit(1)
}

const hash = await bcrypt.hash(password, 10)
const user = await db.user.create({
  data: { email, password: hash }
})
console.log('Usuario creado:', user.email)

process.exit(0)
