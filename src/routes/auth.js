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

    // 1) Valida domínio institucional (alunos ou professor)
    const estacioRegex = /^[\w.%+-]+@(alunos|professor)\.estacio\.br$/i;
    if (!estacioRegex.test(email)) {
      return res
        .status(400)
        .json({ error: 'E-mail inválido. Use @alunos.estacio.br ou @professor.estacio.br.' });
    }

    // 2) Verifica se já existe um usuário com este e-mail
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    // 3) Determina role (student ou professor)
    const role = email.endsWith('@professor.estacio.br') ? 'professor' : 'student';

    // 4) Cria novo usuário com approved=false (pendente de aprovação)
    const newUser = await User.create({
      name,
      email,
      password,       // o hash será gerado no pre('save') do model
      role,
      approved: false // aguardando aprovação
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
    // 1) Pega email e password do corpo da requisição
    const rawEmail = req.body.email || '';
    const password = req.body.password || '';
    const email = rawEmail.trim().toLowerCase();

    // 2) Valida domínio institucional (agora incluindo @admin)
    const estacioRegex = /^[\w.%+-]+@(alunos|professor|admin)\.estacio\.br$/i;
    if (!estacioRegex.test(email)) {
      return res
        .status(400)
        .json({ error: 'E-mail inválido. Use @alunos.estacio.br, @professor.estacio.br ou @admin.estacio.br.' });
    }

    // 3) Busca usuário pelo e-mail e inclui o campo 'password' (normalmente oculto)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // 4) Se NÃO for admin e ainda não estiver aprovado, bloqueia
    if (user.role !== 'admin' && !user.approved) {
      return res
        .status(403)
        .json({ error: 'Sua conta ainda não foi aprovada pelo administrador.' });
    }

    // 5) Caso ESPECIAL para o administrador usar sempre a senha "admin"
    //    Se o user.role for "admin" e a senha que chegou no body for exatamente "admin",
    //    pulamos o bcrypt.compare e consideramos como senha válida.
    let isMatch = false;
    if (user.role === 'admin' && password === 'admin') {
      isMatch = true;
    } else {
      // 6) Para todos os outros casos, comparamos com bcrypt normalmente
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // 7) Gera JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 8) Retorna usuário (sem senha) e token
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
