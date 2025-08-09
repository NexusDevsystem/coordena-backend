// BACKEND/src/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// Login:
// - Admin: body { username: 'admin', password: 'admin' }
// - Outros: body { email, password }
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};

    // Fluxo ADMIN por username
    if (username) {
      // só permitimos username quando é admin
      if (username !== 'admin') {
        return res.status(400).json({ error: 'Login por username permitido apenas para admin.' });
      }

      const admin = await User.findOne({ username: 'admin', role: 'admin' });
      if (!admin) {
        return res.status(401).json({ error: 'Admin não encontrado.' });
      }

      const ok = await bcrypt.compare(password || '', admin.password);
      if (!ok) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      // Admin ignora approved
      const token = jwt.sign(
        { sub: admin._id, role: admin.role, name: admin.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        user: {
          id: admin._id,
          name: admin.name,
          role: admin.role,
          username: admin.username
        },
        token
      });
    }

    // Fluxo padrão por EMAIL
    if (!email) {
      return res.status(400).json({ error: 'Informe email e senha.' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' });

    // Para não-admin, precisa estar aprovado
    if (user.role !== 'admin' && !user.approved) {
      return res.status(403).json({ error: 'Conta ainda não aprovada.' });
    }

    const ok = await bcrypt.compare(password || '', user.password);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas.' });

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
        email: user.email
      },
      token
    });
  } catch (err) {
    console.error('Erro no /login:', err);
    return res.status(500).json({ error: 'Erro no login.' });
  }
});

export default router;
