// backend/src/index.js

import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import protect from './middleware/authMiddleware.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 10000
const MONGO_URI = process.env.MONGO_URI
const FRONTEND_URL = (process.env.FRONTEND_URL || '').trim()

// conecta ao MongoDB
mongoose
  .connect(MONGO_URI, { dbName: 'Coordena+' })
  .then(() => console.log('✅ Conectado ao MongoDB (Coordena+)'))
  .catch(err => console.error('❌ Erro no MongoDB:', err))

// CORS dinâmico: só aceita o FRONTEND_URL ou localhost (para dev)
/*
  No .env defina:
    FRONTEND_URL=https://coordena-frontend.vercel.app
*/
app.use(cors({
  origin: (origin, callback) => {
    // sem origin (curl/postman) ou matches FRONTEND_URL ou localhost entra
    if (!origin
     || origin === FRONTEND_URL
     || origin.includes('localhost')
    ) {
      console.log('✔️  CORS allow:', origin || 'no-origin')
      return callback(null, true)
    }
    console.warn('⛔  CORS blocked:', origin)
    callback(new Error(`Bloqueado por CORS: ${origin}`))
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  credentials: true
}))
app.options('*', cors())  // preflight

// parse JSON bodies
app.use(express.json())

// rotas de autenticação (login, register)
app.use('/api/auth', authRoutes)

// rotas protegidas de reservas via JWT
app.use('/api/reservas', protect)

// healthcheck
app.get('/', (_req, res) => {
  res.send(`🟢 API Coordena+ rodando na porta ${PORT}`)
})

// --- Modelo Reserva + CRUD inline ---
const reservaSchema = new mongoose.Schema({
  date:        { type: String, required: true },
  start:       { type: String, required: true },
  end:         { type: String, required: true },
  resource:    { type: String, required: true },
  sala:        { type: String, default: '' },
  type:        { type: String, required: true },
  responsible: { type: String, required: true },
  department:  { type: String, required: true },
  status:      { type: String, required: true },
  description: { type: String, default: '' },
  time:        { type: String, required: true },
  title:       { type: String, required: true }
}, { timestamps: true })

const Reserva = mongoose.model('Reserva', reservaSchema)

app.get('/api/reservas', async (_req, res) => {
  try {
    const all = await Reserva.find().sort({ date: 1, start: 1 })
    res.json(all)
  } catch {
    res.status(500).json({ error: 'Erro ao buscar reservas' })
  }
})

app.post('/api/reservas', async (req, res) => {
  try {
    const saved = await new Reserva(req.body).save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ error: 'Erro ao criar reserva', details: err.message })
  }
})

app.put('/api/reservas/:id', async (req, res) => {
  try {
    const updated = await Reserva.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!updated) return res.status(404).json({ error: 'Reserva não encontrada' })
    res.json(updated)
  } catch (err) {
    res.status(400).json({ error: 'Erro ao atualizar reserva', details: err.message })
  }
})

app.delete('/api/reservas/:id', async (req, res) => {
  try {
    const deleted = await Reserva.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Reserva não encontrada' })
    res.json({ message: 'Reserva removida com sucesso' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar reserva', details: err.message })
  }
})

// inicia servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ouvindo na porta ${PORT}`)
})
