// backend/src/index.js

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// → Importa o router de Push Subscriptions
import pushSubscriptionsRouter from './routes/pushSubscriptions.js';

// → Importa o modelo Reservation que criamos em src/models/Reservation.js
import Reservation from './models/Reservation.js';

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/adminRoutes.js';

import { authenticateToken } from './middleware/authMiddleware.js'; // nome exato exportado
import authorize from './middleware/authorize.js';                // middleware de roles para reservas
import User from './models/User.js';                              // Modelo de usuário (Mongoose)

dotenv.config();

const app       = express();
const PORT      = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;
const FRONTEND_URL = (process.env.FRONTEND_URL || '').trim();

// ----------------------------------------
// Função seedAdmin(): cria um admin padrão
// ----------------------------------------
async function seedAdmin() {
  const DEFAULT_ADMIN = {
    name: 'Administrador Coordena',
    email: 'admin@admin.estacio.br',
    rawPassword: 'admin', // Senha “hard‐coded”
    role: 'admin'
  };

  try {
    const existing = await User.findOne({ email: DEFAULT_ADMIN.email });
    if (existing) {
      console.log('ℹ️  Usuário admin já existe, não será recriado.');
      return;
    }

    const hashed = await bcrypt.hash(DEFAULT_ADMIN.rawPassword, 10);
    await User.create({
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      password: hashed,
      role: DEFAULT_ADMIN.role,
      approved: true
    });

    console.log('✅ Usuário admin padrão criado:');
    console.log(`   → E‐mail: ${DEFAULT_ADMIN.email}`);
    console.log(`   → Senha:  ${DEFAULT_ADMIN.rawPassword}`);
  } catch (err) {
    console.error('❌ Erro ao tentar criar usuário admin padrão:', err);
  }
}

// ----------------------------------------
// Conexão com MongoDB (Coordena+)
// ----------------------------------------
mongoose
  .connect(MONGO_URI, { dbName: 'Coordena+' })
  .then(async () => {
    console.log('✅ Conectado ao MongoDB (Coordena+)');
    await seedAdmin();
  })
  .catch(err => console.error('❌ Erro no MongoDB:', err));

// ----------------------------------------
// CORS dinâmico
// - aceita FRONTEND_URLS (separadas por vírgula) ou localhost sem origem
// ----------------------------------------
const FRONTEND_URLS = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(u => u.trim())
  .filter(u => u);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.includes('localhost')) {
        console.log('✔️  CORS allow (no-origin or localhost):', origin || 'no-origin');
        return callback(null, true);
      }
      if (FRONTEND_URLS.includes(origin)) {
        console.log('✔️  CORS allow:', origin);
        return callback(null, true);
      }
      console.warn('⛔  CORS blocked:', origin);
      callback(new Error(`Bloqueado por CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
  })
);
app.options('*', cors());
app.use(express.json());

// ----------------------------------------
// Rotas de autenticação (login, register, etc.)
// ----------------------------------------
app.use('/api/auth', authRoutes);

// ----------------------------------------
// Rotas do painel ADM (usuários e reservas pendentes)
// ----------------------------------------
app.use('/api/admin', adminRoutes);
app.use('/api/push', pushSubscriptionsRouter);

// ----------------------------------------
// Rotas de reservas (professor/admin)
// ----------------------------------------

// GET /api/reservas → retorna todas as reservas
app.get('/api/reservas', authenticateToken, async (_req, res) => {
  try {
    const all = await Reservation.find().sort({ date: 1, start: 1 });
    return res.json(all);
  } catch (err) {
    console.error('Erro ao buscar reservas:', err);
    return res.status(500).json({ error: 'Erro ao buscar reservas' });
  }
});

// POST /api/reservas → cria nova reserva com status "pending"
app.post(
  '/api/reservas',
  authenticateToken,
  authorize('professor', 'admin'),
  async (req, res) => {
    try {
      const {
        date,
        start,
        end,
        resource,
        sala = '',
        type,
        responsible,
        department,
        description = '',
        time,
        title
      } = req.body;

      const newReservation = new Reservation({
        date,
        start,
        end,
        resource,
        sala,
        type,
        responsible,
        department,
        status: 'pending',
        description,
        time,
        title
      });

      const saved = await newReservation.save();
      return res.status(201).json(saved);
    } catch (err) {
      console.error('Erro ao criar reserva:', err);
      return res.status(400).json({ error: 'Erro ao criar reserva', details: err.message });
    }
  }
);

// PUT /api/reservas/:id → atualiza reserva
app.put(
  '/api/reservas/:id',
  authenticateToken,
  authorize('professor', 'admin'),
  async (req, res) => {
    try {
      const updated = await Reservation.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!updated) return res.status(404).json({ error: 'Reserva não encontrada' });
      return res.json(updated);
    } catch (err) {
      console.error('Erro ao atualizar reserva:', err);
      return res.status(400).json({ error: 'Erro ao atualizar reserva', details: err.message });
    }
  }
);

// DELETE /api/reservas/:id → exclui reserva
app.delete(
  '/api/reservas/:id',
  authenticateToken,
  authorize('professor', 'admin'),
  async (req, res) => {
    try {
      const deleted = await Reservation.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Reserva não encontrada' });
      return res.json({ message: 'Reserva removida com sucesso' });
    } catch (err) {
      console.error('Erro ao deletar reserva:', err);
      return res.status(500).json({ error: 'Erro ao deletar reserva', details: err.message });
    }
  }
);

// ----------------------------------------
// Horários fixos (rota protegida opcionalmente)
// ----------------------------------------
const fixedSchedules = [
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

  { lab: 'Lab B403', dayOfWeek: 2, startTime: '08:20', endTime: '11:00', turno: 'Manhã' },
  { lab: 'Lab B403', dayOfWeek: 2, startTime: '19:00', endTime: '21:40', turno: 'Noite' },
  { lab: 'Lab B403', dayOfWeek: 4, startTime: '08:20', endTime: '11:00', turno: 'Manhã' },

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

  { lab: 'Lab B405', dayOfWeek: 1, startTime: '19:00', endTime: '22:30', turno: 'Noite' },
  { lab: 'Lab B405', dayOfWeek: 5, startTime: '19:00', endTime: '22:30', turno: 'Noite' }
];

app.get(
  '/api/fixedSchedules',
  authenticateToken,
  async (_req, res) => {
    return res.json(fixedSchedules);
  }
);

// ----------------------------------------
// Healthcheck (rota raiz)
// ----------------------------------------
app.get('/', (_req, res) => {
  res.send(`🟢 API Coordena+ rodando na porta ${PORT}`);
});

// ----------------------------------------
// Inicia servidor
// ----------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor ouvindo na porta ${PORT}`);
});
