// BACKEND/src/index.js (versão ajustada)
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// → NOVO: importe o router de Push Subscriptions
import pushSubscriptionsRouter from './routes/pushSubscriptions.js';

import Reservation from './models/reservation.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/adminRoutes.js';
import { authenticateToken } from './middleware/authMiddleware.js';
import authorize from './middleware/authorize.js';     // middleware de roles
import User from './models/User.js';                    // Modelo de usuário (Mongoose)

dotenv.config();

const app          = express();
const PORT         = process.env.PORT || 10000;
const MONGO_URI    = process.env.MONGO_URI;
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
    // 1) Verifica se já existe um usuário com esse e‐mail
    const existing = await User.findOne({ email: DEFAULT_ADMIN.email });
    if (existing) {
      console.log('ℹ️  Usuário admin já existe, não será recriado.');
      return;
    }

    // 2) Se não existe, faz hash na senha e cria o registro
    const hashed = await bcrypt.hash(DEFAULT_ADMIN.rawPassword, 10);

    await User.create({
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      password: hashed,
      role: DEFAULT_ADMIN.role,
      approved: true // Admin já vem aprovado por padrão
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
    // Após conectar, garante que o admin exista
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
      // sem origin (curl, postman, etc.) OU localhost → liberado
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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
  })
);
app.options('*', cors()); // Pre-flight
app.use(express.json());

// ----------------------------------------
// Rotas de autenticação (login, register, etc.)
// ----------------------------------------
app.use('/api/auth', authRoutes);

// ----------------------------------------
// Rotas do painel ADM (ex.: listar pendentes, aprovar, rejeitar)
// ----------------------------------------
app.use('/api/admin', adminRoutes);
app.use('/api/push', pushSubscriptionsRouter);

// ----------------------------------------
// CRUD de RESERVATIONS (agora unificado no mesmo model “Reservation”)
// ----------------------------------------

// GET → retorna todas as reservas aprovadas
app.get('/api/reservations', authenticateToken, async (req, res) => {
  try {
    // Busca TODAS as reservas deste usuário, independentemente do status.
    // Aqui assumimos que 'r.responsible' foi gravado como 'user.name' na criação.
    const todasDoUsuario = await Reservation
      .find({ responsible: req.user.name })
      .sort({ date: 1, start: 1 });
    return res.json(todasDoUsuario);
  } catch (err) {
    console.error('Erro ao buscar reservas do usuário:', err);
    return res.status(500).json({ error: 'Erro ao buscar reservas' });
  }
});

// → NOVA ROTA: GET → retorna todos os agendamentos (independentemente de status) do usuário logado
app.get('/api/reservations/me', authenticateToken, async (req, res) => {
  try {
    // Filtra pelo campo “responsible” igual ao nome armazenado em req.user.name
    const myReservations = await Reservation.find({ responsible: req.user.name }).sort({ date: 1, start: 1 });
    return res.json(myReservations);
  } catch (err) {
    console.error('Erro ao buscar meus agendamentos:', err);
    return res.status(500).json({ error: 'Erro ao buscar meus agendamentos' });
  }
});

// POST → cria uma nova reserva (sempre com status: 'pending')
app.post(
  '/api/reservations',
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
        // remover “responsible” vindo do body
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
        responsible: req.user.name,   // ← sempre “responsible” do token
        department,
        status: 'pending',             // ← sempre “pending”
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

// PUT → atualiza (apenas professor/admin pode mudar qualquer campo, inclusive status)
app.put(
  '/api/reservations/:id',
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

// DELETE → exclui reserva (professor/admin)
app.delete(
  '/api/reservations/:id',
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
