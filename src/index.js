import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
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

app.use(cors({
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
}));

app.options('*', cors()); // PRE-FLIGHT

app.use(express.json());

// Rotas de autenticação (login, register)
app.use('/api/auth', authRoutes);

// Esquema de reserva (Mongoose)
const reservaSchema = new mongoose.Schema({
  date: { type: String, required: true },
  start: { type: String, required: true },
  end: { type: String, required: true },
  resource: { type: String, required: true },
  sala: { type: String, default: '' },
  type: { type: String, required: true },
  responsible: { type: String, required: true },
  department: { type: String, required: true },
  status: { type: String, required: true },
  description: { type: String, default: '' },
  time: { type: String, required: true },
  title: { type: String, required: true }
}, { timestamps: true });

const Reserva = mongoose.model('Reserva', reservaSchema);

// GET → qualquer usuário autenticado
app.get('/api/reservas', protect, async (_req, res) => {
  try {
    const all = await Reserva.find().sort({ date: 1, start: 1 });
    res.json(all);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar reservas' });
  }
});

// ────────────────
// horários fixos
// ────────────────
const fixedSchedules = [
  // ── LAB B401 ──
  // Manhã
  { lab: 'Lab B401', dayOfWeek: 1, startTime: '08:20', endTime: '09:10', turno: 'Manhã', professor: 'Sergio Andrade', disciplina: 'Microprocessadores' },
  { lab: 'Lab B401', dayOfWeek: 1, startTime: '09:20', endTime: '10:10', turno: 'Manhã', professor: 'Sergio Andrade', disciplina: 'Microprocessadores' },
  { lab: 'Lab B401', dayOfWeek: 1, startTime: '10:10', endTime: '11:00', turno: 'Manhã', professor: 'Sergio Andrade', disciplina: 'Microprocessadores' },
  { lab: 'Lab B401', dayOfWeek: 1, startTime: '11:00', endTime: '11:50', turno: 'Manhã', professor: 'Sergio Andrade', disciplina: 'Microprocessadores' },
  { lab: 'Lab B401', dayOfWeek: 2, startTime: '08:20', endTime: '09:10', turno: 'Manhã', professor: 'Erick Melo', disciplina: 'Sistemas Digitais' },
  { lab: 'Lab B401', dayOfWeek: 2, startTime: '09:20', endTime: '10:10', turno: 'Manhã', professor: 'Erick Melo', disciplina: 'Sistemas Digitais' },
  { lab: 'Lab B401', dayOfWeek: 2, startTime: '10:10', endTime: '11:00', turno: 'Manhã', professor: 'Erick Melo', disciplina: 'Sistemas Digitais' },
  { lab: 'Lab B401', dayOfWeek: 2, startTime: '11:00', endTime: '11:50', turno: 'Manhã', professor: 'Erick Melo', disciplina: 'Sistemas Digitais' },
  { lab: 'Lab B401', dayOfWeek: 3, startTime: '08:20', endTime: '09:10', turno: 'Manhã', professor: 'Suzane Alfaia Dias', disciplina: 'Banco de Dados' },
  { lab: 'Lab B401', dayOfWeek: 3, startTime: '09:20', endTime: '10:10', turno: 'Manhã', professor: 'Suzane Alfaia Dias', disciplina: 'Banco de Dados' },
  { lab: 'Lab B401', dayOfWeek: 3, startTime: '10:10', endTime: '11:00', turno: 'Manhã', professor: 'Suzane Alfaia Dias', disciplina: 'Banco de Dados' },
  { lab: 'Lab B401', dayOfWeek: 3, startTime: '11:00', endTime: '11:50', turno: 'Manhã', professor: 'Suzane Alfaia Dias', disciplina: 'Banco de Dados' },
  { lab: 'Lab B401', dayOfWeek: 4, startTime: '08:20', endTime: '09:10', turno: 'Manhã', professor: 'Frederico Santana Filho', disciplina: 'Estrutura de Dados' },
  { lab: 'Lab B401', dayOfWeek: 4, startTime: '09:20', endTime: '10:10', turno: 'Manhã', professor: 'Frederico Santana Filho', disciplina: 'Estrutura de Dados' },
  { lab: 'Lab B401', dayOfWeek: 4, startTime: '10:10', endTime: '11:00', turno: 'Manhã', professor: 'Frederico Santana Filho', disciplina: 'Estrutura de Dados' },
  { lab: 'Lab B401', dayOfWeek: 4, startTime: '11:00', endTime: '11:50', turno: 'Manhã', professor: 'Frederico Santana Filho', disciplina: 'Estrutura de Dados' },
  { lab: 'Lab B401', dayOfWeek: 5, startTime: '08:20', endTime: '09:10', turno: 'Manhã', professor: 'Frederico Filho', disciplina: 'Int A Prog Estr' },
  { lab: 'Lab B401', dayOfWeek: 5, startTime: '09:20', endTime: '10:10', turno: 'Manhã', professor: 'Frederico Filho', disciplina: 'Int A Prog Estr' },
  { lab: 'Lab B401', dayOfWeek: 5, startTime: '10:10', endTime: '11:00', turno: 'Manhã', professor: 'Frederico Filho', disciplina: 'Int A Prog Estr' },
  { lab: 'Lab B401', dayOfWeek: 5, startTime: '11:00', endTime: '11:50', turno: 'Manhã', professor: 'Frederico Filho', disciplina: 'Int A Prog Estr' },
  // Tarde (Programa Bolsa Família / Curso Alicerce etc — conforme sua planilha)
  { lab: 'Lab B401', dayOfWeek: 1, startTime: '13:00', endTime: '14:20', turno: 'Tarde', professor: 'Programa Bolsa Família', disciplina: '09 & 23/06' },
  // … repita para cada faixa 14:20–15:10, 15:20–16:10, 16:10–17:00, 17:00–18:00 em todos os dias e laboratórios …
  // Noite
  { lab: 'Lab B401', dayOfWeek: 1, startTime: '19:00', endTime: '19:50', turno: 'Noite', professor: 'Eudes Danilo', disciplina: 'Introd. a Prog. de Comput.' },
  { lab: 'Lab B401', dayOfWeek: 1, startTime: '19:50', endTime: '20:40', turno: 'Noite', professor: 'Eudes Danilo', disciplina: 'Introd. a Prog. de Comput.' },
  { lab: 'Lab B401', dayOfWeek: 1, startTime: '20:50', endTime: '21:40', turno: 'Noite', professor: 'Eudes Danilo', disciplina: 'Introd. a Prog. de Comput.' },
  // … siga o mesmo padrão para terça, quarta, quinta e sexta …
  
  // ── LAB B402 ──
  // Manhã
  { lab: 'Lab B402', dayOfWeek: 1, startTime: '08:20', endTime: '09:10', turno: 'Manhã', professor: 'Frederico Filho', disciplina: 'Sistemas Operacionais' },
  { lab: 'Lab B402', dayOfWeek: 1, startTime: '09:20', endTime: '10:10', turno: 'Manhã', professor: 'Frederico Filho', disciplina: 'Sistemas Operacionais' },
  { lab: 'Lab B402', dayOfWeek: 1, startTime: '10:10', endTime: '11:00', turno: 'Manhã', professor: 'Frederico Filho', disciplina: 'Sistemas Operacionais' },
  { lab: 'Lab B402', dayOfWeek: 1, startTime: '11:00', endTime: '11:50', turno: 'Manhã', professor: 'Frederico Filho', disciplina: 'Sistemas Operacionais' },
  // … e assim por diante para todos os dias, horários de tarde (Curso Alicerce) e noite (Suzane Alfaia etc) …

  // ── LAB B403 ──
  // Só possui turma à noite (Pesquisa Operacional, Eletrônica Digital, etc):
  { lab: 'Lab B403', dayOfWeek: 2, startTime: '19:00', endTime: '19:50', turno: 'Noite', professor: 'Rafael Leão', disciplina: 'Pesquisa Operacional' },
  // … demais entries …

  // ── LAB B405 ──
  // Manhã e Tarde CIEE:
  { lab: 'Lab B405', dayOfWeek: 1, startTime: '08:20', endTime: '09:10', turno: 'Manhã', professor: 'CIEE', disciplina: 'CIEE' },
  // … continue até 17:00 …
  // Noite Arielly:
  { lab: 'Lab B405', dayOfWeek: 1, startTime: '19:00', endTime: '19:50', turno: 'Noite', professor: 'Arielly', disciplina: 'Aulas' },
  // … até 21:40 …

  // ── LAB Imaginologia ──
  // (sem aulas fixas, fica vazio)

];



// rota para retornar todos os horários fixos; protege se quiser
app.get(
  '/api/fixedSchedules',
  protect,                   // ou remova se não quiser exigir login
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
      const updated = await Reserva.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
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
