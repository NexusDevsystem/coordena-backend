// backend/src/index.js

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/adminRoutes.js';
import { authenticateToken } from './middleware/authMiddleware.js'; // ← nome exato exportado
import authorize from './middleware/authorize.js';
import User from './models/User.js'; // ← Modelo de usuário (Mongoose)

dotenv.config();

const app = express();
const PORT        = process.env.PORT || 10000;
const MONGO_URI   = process.env.MONGO_URI;
const FRONTEND_URL = (process.env.FRONTEND_URL || '').trim();


// ----------------------------------------
// Função seedAdmin(): cria um admin padrão
// ----------------------------------------
async function seedAdmin() {
  const DEFAULT_ADMIN = {
    name: 'Administrador Coordena',
    email: 'admin@admin.estacio.br',
    rawPassword: 'admin', // Senha “hard-coded”
    role: 'admin'
  };

  try {
    // 1) Verifica se já existe um usuário com esse e-mail
    const existing = await User.findOne({ email: DEFAULT_ADMIN.email });
    if (existing) {
      console.log('ℹ️  Usuário admin já existe, não será recriado.');
      return;
    }

    // 2) Se não existe, hash na senha e cria o registro
    const hashed = await bcrypt.hash(DEFAULT_ADMIN.rawPassword, 10);

    await User.create({
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      password: hashed,
      role: DEFAULT_ADMIN.role,
      approved: true // Admin já vem aprovado por padrão
    });

    console.log('✅ Usuário admin padrão criado:');
    console.log(`   → E-mail: ${DEFAULT_ADMIN.email}`);
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  })
);
app.options('*', cors()); // Pre-flight
app.use(express.json());


// ----------------------------------------
// Rotas de autenticação (login, register)
// ----------------------------------------
app.use('/api/auth', authRoutes);


// ----------------------------------------
// Rotas do painel ADM (ex.: aprovar/rejeitar usuários)
// ----------------------------------------
app.use('/api/admin', adminRoutes);


// ----------------------------------------
// Esquema de reserva (Mongoose)
// ----------------------------------------
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


// ----------------------------------------
// GET → retorna todas as reservas (usuário autenticado)
// ----------------------------------------
app.get('/api/reservas', authenticateToken, async (_req, res) => {
  try {
    const all = await Reserva.find().sort({ date: 1, start: 1 });
    return res.json(all);
  } catch {
    return res.status(500).json({ error: 'Erro ao buscar reservas' });
  }
});


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
// CRUD de reservas (somente para “professor” ou “admin”)
// ----------------------------------------
app.post(
  '/api/reservas',
  authenticateToken,
  authorize('professor', 'admin'),
  async (req, res) => {
    try {
      const saved = await new Reserva(req.body).save();
      return res.status(201).json(saved);
    } catch (err) {
      return res.status(400).json({ error: 'Erro ao criar reserva', details: err.message });
    }
  }
);

app.put(
  '/api/reservas/:id',
  authenticateToken,
  authorize('professor', 'admin'),
  async (req, res) => {
    try {
      const updated = await Reserva.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!updated) return res.status(404).json({ error: 'Reserva não encontrada' });
      return res.json(updated);
    } catch (err) {
      return res.status(400).json({ error: 'Erro ao atualizar reserva', details: err.message });
    }
  }
);

app.delete(
  '/api/reservas/:id',
  authenticateToken,
  authorize('professor', 'admin'),
  async (req, res) => {
    try {
      const deleted = await Reserva.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Reserva não encontrada' });
      return res.json({ message: 'Reserva removida com sucesso' });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao deletar reserva', details: err.message });
    }
  }
);

// ----------------------------------------
// Healthcheck
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
