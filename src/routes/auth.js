// BACKEND/src/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// POST /api/auth/login
// Somente por e-mail institucional (admin usa admin@admin.estacio.br).
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Informe e-mail e senha.' });
    }

    email = String(email).trim().toLowerCase();

    // Busca o usuário e garante trazer o hash da senha
    const user = await User.findOne({ email })
      .select('+password +approved +status +role +name +email +username');

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Admin identificado tanto pelo role quanto pelo e-mail padrão
    const isAdmin = user.role === 'admin' || user.email === 'admin@admin.estacio.br';

    // Exigir aprovação apenas para não-admin
    const isApproved =
      typeof user.approved === 'boolean'
        ? user.approved
        : (user.status ? String(user.status).toLowerCase() === 'approved' : true);

    if (!isAdmin && !isApproved) {
      return res.status(403).json({ error: 'Conta pendente de aprovação.' });
    }

    // Valida senha
    const ok = await bcrypt.compare(String(password), user.password || '');
    if (!ok) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Gera token
    const payload = { sub: user._id.toString(), role: user.role, name: user.name };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        username: user.username
      },
      token,
      tokenType: 'Bearer',
      expiresIn: 7 * 24 * 60 * 60 // 7 dias em segundos
    });
  } catch (err) {
    console.error('Erro no /login:', err);
    return res.status(500).json({ error: 'Erro no login.' });
  }
});

export default router;
