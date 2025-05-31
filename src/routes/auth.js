// backend/src/routes/auth.js

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email: rawEmail, password } = req.body;
    const email = rawEmail.trim().toLowerCase();

    // 1) Valida domínio institucional
    const estacioRegex = /^[\w.%+-]+@(alunos|professor)\.estacio\.br$/i;
    if (!estacioRegex.test(email)) {
      return res
        .status(400)
        .json({ error: 'E-mail inválido. Use @alunos.estacio.br ou @professor.estacio.br.' });
    }

    // 2) Verifica se já existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    // 3) Infere role (student/professor)
    const role = email.endsWith('@professor.estacio.br') ? 'professor' : 'student';

    // 4) Cria novo usuário com approved=false (pendente)
    const newUser = await User.create({
      name,
      email,
      password,   // a senha será criptografada pelo pre('save') do model
      role,
      approved: false // fica pendente até ADM aprovar
    });

    // 5) Retorna apenas mensagem de sucesso (sem gerar token)
    return res.status(201).json({
      message: 'Cadastro recebido! Aguarde aprovação do administrador antes de logar.'
    });
  } catch (err) {
    console.error('[Auth Register] Error:', err);
    return res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const rawEmail = req.body.email || '';
    const password = req.body.password || '';
    const email = rawEmail.trim().toLowerCase();

    // Valida domínio institucional
    const estacioRegex = /^[\w.%+-]+@(alunos|professor|admin)\.estacio\.br$/i;
    if (!estacioRegex.test(email)) {
      return res
        .status(400)
        .json({ error: 'E-mail inválido. Use @alunos.estacio.br ou @professor.estacio.br.' });
    }

    // Busca usuário incluindo password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Bloqueia login se não aprovado
    if (!user.approved) {
      return res
        .status(403)
        .json({ error: 'Sua conta ainda não foi aprovada pelo administrador.' });
    }

    // Checa senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Gera JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    return res.json({
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role
      },
      token
    });
  } catch (err) {
    console.error('[Auth Login] Error:', err);
    return res.status(500).json({ error: 'Erro no login.' });
  }
});

export default router;
