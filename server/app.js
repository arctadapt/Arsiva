import 'dotenv/config'
import express from 'express'
import { errorHandler } from './lib/http.js'
import auth from './routes/auth.js'
import users from './routes/users.js'
import catalog from './routes/catalog.js'
import loans from './routes/loans.js'
import notifications from './routes/notifications.js'
import stats from './routes/stats.js'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '100kb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'arsiva' }))
app.use('/api/auth', auth)
app.use('/api/users', users)
app.use('/api/catalog', catalog)
app.use('/api/loans', loans)
app.use('/api/notifications', notifications)
app.use('/api/stats', stats)

app.use('/api', (_req, res) => res.status(404).json({ message: 'Endpoint tidak ditemukan.' }))
app.use(errorHandler)

export default app
