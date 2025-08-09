// BACKEND/src/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// POST /api/auth/login
// Aceita { email, password } OU { username, password }.
// Normaliza o identificador (trim/lowercase) e procura por email OU username.
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body || {};

    if (!password || (!email && !username)) {
      return res.status(400).json({ error: 'Informe identificador e senha.' });
    }

    // Normaliza o identificador para comparação consistente
    const key = String(email || username).trim().toLowerCase();

    // Busca por email OU username e garante que o password venha do banco
    const user = await User.findOne({
      $or: [{ email: key }, { username: key }]
    }).select('+password +approved +status +role +name +email +username');

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Se não for admin, exige aprovação
    // (ajuste se você usa `status: 'approved'` ao invés de `approved: true`)
    const isAdmin = user.role === 'admin';
    const isApproved =
      typeof user.approved === 'boolean'
        ? user.approved
        : (user.status ? String(user.status).toLowerCase() === 'approved' : true);

    if (!isAdmin && !isApproved) {
      return res.status(403).json({ error: 'Conta pendente de aprovação.' });
    }

    const ok = await bcrypt.compare(String(password), user.password || '');
    if (!ok) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { sub: user._id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        username: user.username
      },
      token
    });
  } catch (err) {
    console.error('Erro no /login:', err);
    return res.status(500).json({ error: 'Erro no login.' });
  }
});

export default router;
