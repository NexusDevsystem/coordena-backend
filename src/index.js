// backend/src/index.js

import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import protect from './middleware/authMiddleware.js'

dotenv.config()

const app = express()
// Usa a porta 10000 por padrão se PORT não for definida
const PORT = process.env.PORT || 10000
const MONGO_URI = process.env.MONGO_URI
// FRONTEND_URL deve estar em .env sem aspas
// Exemplo .env:
//   FRONTEND_URL=https://coordena-frontend.vercel.app
//   (para testes locais, pode usar http://localhost:10000)
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:10000').trim()

// Conecta ao MongoDB, usando o database "Coordena+"
mongoose
  .connect(MONGO_URI, { dbName: 'Coordena+' })
  .then(() => console.log('✅ Conectado ao MongoDB (Coordena+)'))
  .catch(err => console.error('❌ Falha na conexão com MongoDB:', err))

// Middlewares
// Habilita CORS apenas para o front-end configurado
app.use(cors({
  origin: (origin, callback) => {
    // permite também requisições sem origin (curl, Postman)
    if (!origin || origin === FRONTEND_URL) {
      return callback(null, true)
    }
    callback(new Error(`Bloqueado por CORS: ${origin}`))
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  credentials: true
}))
// Suporta requisições preflight
app.options('*', cors())

app.use(express.json()) // Parse JSON bodies

// Rotas de autenticação (register, login...)
app.use('/api/auth', authRoutes)

// Rotas protegidas de reservas via JWT middleware
app.use('/api/reservas', protect)

// Healthcheck endpoint
app.get('/', (_req, res) => {
  res.send(`🟢 API Coordena+ rodando na porta ${PORT}`)
})

// --- Modelo Reserva ---
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

// CRUD Reservas
app.get('/api/reservas', async (_req, res) => {
  try {
    const all = await Reserva.find().sort({ date: 1, start: 1 })
    console.log('✅ GET /api/reservas →', all.length, 'reservas')
    res.json(all)
  } catch (err) {
    console.error('❌ Erro ao buscar reservas:', err)
    res.status(500).json({ error: 'Erro ao buscar reservas' })
  }
})

app.post('/api/reservas', async (req, res) => {
  console.log('▶️  POST /api/reservas body =', req.body)
  try {
    const saved = await new Reserva(req.body).save()
    console.log('✅ SALVO NO MONGO:', saved)
    res.status(201).json(saved)
  } catch (err) {
    console.error('❌ ERRO AO CRIAR RESERVA:', err)
    res.status(400).json({ error: 'Erro ao criar reserva', details: err.message })
  }
})

app.put('/api/reservas/:id', async (req, res) => {
  console.log('▶️  PUT /api/reservas/:id', req.params.id, 'body =', req.body)
  try {
    const updated = await Reserva.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!updated) {
      return res.status(404).json({ error: 'Reserva não encontrada' })
    }
    console.log('✅ ATUALIZADO NO MONGO:', updated)
    res.json(updated)
  } catch (err) {
    console.error('❌ ERRO AO ATUALIZAR RESERVA:', err)
    res.status(400).json({ error: 'Erro ao atualizar reserva', details: err.message })
  }
})

app.delete('/api/reservas/:id', async (req, res) => {
  console.log('▶️  DELETE /api/reservas/:id', req.params.id)
  try {
    const deleted = await Reserva.findByIdAndDelete(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Reserva não encontrada' })
    }
    console.log('✅ REMOVIDA DO MONGO:', req.params.id)
    res.json({ message: 'Reserva removida com sucesso' })
  } catch (err) {
    console.error('❌ ERRO AO DELETAR RESERVA:', err)
    res.status(500).json({ error: 'Erro ao deletar reserva', details: err.message })
  }
})

// Inicia o servidor na porta configurada
app.listen(PORT, () => {
  console.log(`🚀 Servidor ouvindo na porta ${PORT}`)
})
