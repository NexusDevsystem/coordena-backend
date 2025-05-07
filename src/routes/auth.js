// backend/src/routes/auth.js

import { Router } from 'express';
import User        from '../models/User.js';
import jwt         from 'jsonwebtoken';
import bcrypt      from 'bcryptjs';

const router = Router();

// Regex institucional Estácio (alunos e professores)
const estacioRegex = /^[\w.%+-]+@(alunos|professor)\.estacio\.br$/i;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    console.log('[Auth Register] req.body =', req.body);
    let { name, email, password, role } = req.body;
    email = email.trim().toLowerCase();
    console.log('[Auth Register] password raw =', password);

    if (!estacioRegex.test(email)) {
      return res.status(400).json({
        error: 'E-mail inválido. Use @alunos.estacio.br ou @professor.estacio.br.'
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Usuário já registrado.' });
    }

    const salt   = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    console.log('[Auth Register] password hash =', hashed);

    const user = await User.create({ name, email, password: hashed, role });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (err) {
    console.error('[Auth Register] Error:', err);
    return res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    console.log('[Auth Login] req.body =', req.body);
    console.log('[Auth Login] JWT_SECRET =', process.env.JWT_SECRET ? 'defined' : 'undefined');

    const email    = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    if (!estacioRegex.test(email)) {
      return res.status(400).json({
        error: 'E-mail inválido. Use @alunos.estacio.br ou @professor.estacio.br.'
      });
    }

    // Busca usuário incluindo o password (select: false por padrão)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Logs para debug de senha
    console.log('[Auth Login] password raw:', password);
    console.log('[Auth Login] password hash:', user.password);
    console.log('[Auth Login] compareSync:', bcrypt.compareSync(password, user.password));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    return res.json({ token });
  } catch (err) {
    console.error('[Auth Login] Error:', err);
    return res.status(500).json({ error: 'Erro no login.' });
  }
});

export default router;
