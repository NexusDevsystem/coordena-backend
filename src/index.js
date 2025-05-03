// backend/src/index.js
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000
const MONGO_URI = process.env.MONGO_URI

// Conecta no MongoDB, usando o database "Coordena+"
mongoose
  .connect(MONGO_URI, { dbName: 'Coordena+' })
  .then(() => console.log('✅ Conectado ao MongoDB (Coordena+)'))
  .catch(err => console.error('❌ Falha na conexão com MongoDB:', err))

// Define esquema e modelo de Reserva
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

// Middlewares
app.use(cors())
app.use(express.json()) // Parse JSON bodies

// Rotas CRUD

// Listar todas as reservas (GET /api/reservas)
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

// Criar nova reserva (POST /api/reservas)
app.post('/api/reservas', async (req, res) => {
  console.log('▶️  POST /api/reservas body =', req.body)
  try {
    const nova = new Reserva(req.body)
    const saved = await nova.save()
    console.log('✅ SALVO NO MONGO:', saved)
    res.status(201).json(saved)
  } catch (err) {
    console.error('❌ ERRO AO CRIAR RESERVA:', err)
    res.status(400).json({ error: 'Erro ao criar reserva', details: err.message })
  }
})

// Atualizar reserva existente (PUT /api/reservas/:id)
app.put('/api/reservas/:id', async (req, res) => {
  console.log('▶️  PUT /api/reservas/:id', req.params.id, 'body =', req.body)
  try {
    const updated = await Reserva.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    if (!updated) {
      console.warn('⚠️  Reserva não encontrada para update:', req.params.id)
      return res.status(404).json({ error: 'Reserva não encontrada' })
    }
    console.log('✅ ATUALIZADO NO MONGO:', updated)
    res.json(updated)
  } catch (err) {
    console.error('❌ ERRO AO ATUALIZAR RESERVA:', err)
    res.status(400).json({ error: 'Erro ao atualizar reserva', details: err.message })
  }
})

// Deletar uma reserva (DELETE /api/reservas/:id)
app.delete('/api/reservas/:id', async (req, res) => {
  console.log('▶️  DELETE /api/reservas/:id', req.params.id)
  try {
    const deleted = await Reserva.findByIdAndDelete(req.params.id)
    if (!deleted) {
      console.warn('⚠️  Reserva não encontrada para delete:', req.params.id)
      return res.status(404).json({ error: 'Reserva não encontrada' })
    }
    console.log('✅ REMOVIDA DO MONGO:', req.params.id)
    res.json({ message: 'Reserva removida com sucesso' })
  } catch (err) {
    console.error('❌ ERRO AO DELETAR RESERVA:', err)
    res.status(500).json({ error: 'Erro ao deletar reserva', details: err.message })
  }
})

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ouvindo na porta ${PORT}`)
})
