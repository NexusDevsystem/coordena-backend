// backend/src/index.js

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/adminRoutes.js';      // ← Importa as rotas do ADM
import { protect } from './middleware/authMiddleware.js';
import authorize from './middleware/authorize.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;
const FRONTEND_URL = (process.env.FRONTEND_URL || '').trim();

// Conexão com MongoDB (Coordena+)
mongoose
  .connect(MONGO_URI, { dbName: 'Coordena+' })
  .then(() => console.log('✅ Conectado ao MongoDB (Coordena+)'))
  .catch(err => console.error('❌ Erro no MongoDB:', err));

// CORS dinâmico: só aceita FRONTEND_URLS (separadas por vírgula) ou localhost em dev
const FRONTEND_URLS = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(u => u.trim())
  .filter(u => u);

app.use(
  cors({
    origin: (origin, callback) => {
      // sem origin (curl, mobile) ou localhost → liberado
      if (!origin || origin.includes('localhost')) {
        console.log('✔️  CORS allow (no-origin or localhost):', origin || 'no-origin');
        return callback(null, true);
      }
      // origem está na lista?
      if (FRONTEND_URLS.includes(origin)) {
        console.log('✔️  CORS allow:', origin);
        return callback(null, true);
      }
      // bloqueia
      console.warn('⛔  CORS blocked:', origin);
      callback(new Error(`Bloqueado por CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  })
);

app.options('*', cors()); // PRE-FLIGHT
app.use(express.json());

// ----------------------
// Rotas de autenticação
// ----------------------
app.use('/api/auth', authRoutes);

// ------------------------------------------
// Rotas do painel ADM (aprovar/rejeitar usuários)
// ------------------------------------------
app.use('/api/admin', adminRoutes);

// ------------------------------------------
// Esquema de reserva (Mongoose)
// ------------------------------------------
const reservaSchema = new mongoose.Schema(
  {
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
  },
  { timestamps: true }
);

const Reserva = mongoose.model('Reserva', reservaSchema);

// ------------------------------------------
// GET → retorna todas as reservas (usuário autenticado)
// ------------------------------------------
app.get('/api/reservas', protect, async (_req, res) => {
  try {
    const all = await Reserva.find().sort({ date: 1, start: 1 });
    res.json(all);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar reservas' });
  }
});

// ------------------------------------------
// Horários fixos
// ------------------------------------------
const fixedSchedules = [
  // ── Lab B401 ──
  { lab: 'Lab B401', dayOfWeek: 1, startTime: '08:20', endTime: '11:50', turno: 'Manhã' },
  { lab: 'Lab B401', dayOfWeek: 1, startTime: '13:00', endTime: '17:00', turno: 'Tarde' },
  { lab: 'Lab B401', dayOfWeek: 1, startTime: '19:00', endTime: '21:40', turno: 'Noite' },
  { lab: 'Lab B401', dayOfWeek: 2, startTime: '08:20', endTime: '11:00', turno: 'Manhã' },
  { lab: 'Lab B401', dayOfWeek: 2, startTime: '13:00', endTime: '17:00', turno: 'Tarde' },
  { lab: 'Lab B401', dayOfWeek: 3, startTime: '08:20', endTime: '11:00', turno: 'Manhã' },
  { lab: 'Lab B401', dayOfWeek: 3, startTime: '13:00', endTime: '17:00', turno: 'Tarde' },
  { lab: 'Lab B401', dayOfWeek: 3, startTime: '19:00', endTime: '22:30', turno: 'Noite' },
  { lab: 'Lab B401', dayOfWeek: 4, startTime: '08:20', endTime: '11:00', turno: 'Manhã' },
  { lab: 'Lab B401', dayOfWeek: 5, startTime: '08:20', endTime: '11:00', turno: 'Manhã' },
  { lab: 'Lab B401', dayOfWeek: 5, startTime: '19:00', endTime: '22:30', turno: 'Noite' },

  // ── Lab B402 ──
  { lab: 'Lab B402', dayOfWeek: 1, startTime: '08:20', endTime: '11:00', turno: 'Manhã' },
  { lab: 'Lab B402', dayOfWeek: 1, startTime: '13:00', endTime: '18:00', turno: 'Tarde' },
  { lab: 'Lab B402', dayOfWeek: 1, startTime: '19:00', endTime: '21:40', turno: 'Noite' },
  { lab: 'Lab B402', dayOfWeek: 2, startTime: '13:00', endTime: '18:00', turno: 'Tarde' },
  { lab: 'Lab B402', dayOfWeek: 3, startTime: '13:00', endTime: '18:00', turno: 'Tarde' },
  { lab: 'Lab B402', dayOfWeek: 3, startTime: '19:00', endTime: '21:40', turno: 'Noite' },
  { lab: 'Lab B402', dayOfWeek: 4, startTime: '08:20', endTime: '10:10', turno: 'Manhã' },
  { lab: 'Lab B402', dayOfWeek: 4, startTime: '13:00', endTime: '18:00', turno: 'Tarde' },
  { lab: 'Lab B402', dayOfWeek: 4, startTime: '19:00', endTime: '21:40', turno: 'Noite' },
  { lab: 'Lab B402', dayOfWeek: 5, startTime: '13:00', endTime: '18:00', turno: 'Tarde' },
  { lab: 'Lab B402', dayOfWeek: 5, startTime: '19:00', endTime: '21:40', turno: 'Noite' },

  // ── Lab B403 ──
  { lab: 'Lab B403', dayOfWeek: 2, startTime: '08:20', endTime: '11:00', turno: 'Manhã' },
  { lab: 'Lab B403', dayOfWeek: 2, startTime: '19:00', endTime: '21:40', turno: 'Noite' },
  { lab: 'Lab B403', dayOfWeek: 4, startTime: '08:20', endTime: '11:00', turno: 'Manhã' },

  // ── Lab B404 ──
  { lab: 'Lab B404', dayOfWeek: 1, startTime: '08:20', endTime: '11:00', turno: 'Manhã' },
  { lab: 'Lab B404', dayOfWeek: 1, startTime: '13:00', endTime: '18:00', turno: 'Tarde' },
  { lab: 'Lab B404', dayOfWeek: 1, startTime: '19:00', endTime: '21:40', turno: 'Noite' },
  { lab: 'Lab B404', dayOfWeek: 2, startTime: '13:00', endTime: '18:00', turno: 'Tarde' },
  { lab: 'Lab B404', dayOfWeek: 3, startTime: '13:00', endTime: '18:00', turno: 'Tarde' },
  { lab: 'Lab B404', dayOfWeek: 3, startTime: '19:00', endTime: '21:40', turno: 'Noite' },
  { lab: 'Lab B404', dayOfWeek: 4, startTime: '08:20', endTime: '10:10', turno: 'Manhã' },
  { lab: 'Lab B404', dayOfWeek: 4, startTime: '13:00', endTime: '18:00', turno: 'Tarde' },
  { lab: 'Lab B404', dayOfWeek: 4, startTime: '19:00', endTime: '21:40', turno: 'Noite' },
  { lab: 'Lab B404', dayOfWeek: 5, startTime: '13:00', endTime: '18:00', turno: 'Tarde' },
  { lab: 'Lab B404', dayOfWeek: 5, startTime: '19:00', endTime: '21:40', turno: 'Noite' },

  // ── Lab B405 ──
  { lab: 'Lab B405', dayOfWeek: 1, startTime: '19:00', endTime: '22:30', turno: 'Noite' },
  { lab: 'Lab B405', dayOfWeek: 5, startTime: '19:00', endTime: '22:30', turno: 'Noite' }
];

// rota para retornar todos os horários fixos; protege se quiser
app.get(
  '/api/fixedSchedules',
  protect, // ou remova se não quiser exigir login
  async (_req, res) => {
    res.json(fixedSchedules);
  }
);

// POST → apenas professor e admin
app.post(
  '/api/reservas',
  protect,
  authorize('professor', 'admin'),
  async (req, res) => {
    try {
      const saved = await new Reserva(req.body).save();
      res.status(201).json(saved);
    } catch (err) {
      res.status(400).json({ error: 'Erro ao criar reserva', details: err.message });
    }
  }
);

// PUT → apenas professor e admin
app.put(
  '/api/reservas/:id',
  protect,
  authorize('professor', 'admin'),
  async (req, res) => {
    try {
      const updated = await Reserva.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!updated) return res.status(404).json({ error: 'Reserva não encontrada' });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: 'Erro ao atualizar reserva', details: err.message });
    }
  }
);

// DELETE → apenas professor e admin
app.delete(
  '/api/reservas/:id',
  protect,
  authorize('professor', 'admin'),
  async (req, res) => {
    try {
      const deleted = await Reserva.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Reserva não encontrada' });
      res.json({ message: 'Reserva removida com sucesso' });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao deletar reserva', details: err.message });
    }
  }
);

// Healthcheck
app.get('/', (_req, res) => {
  res.send(`🟢 API Coordena+ rodando na porta ${PORT}`);
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ouvindo na porta ${PORT}`);
});
