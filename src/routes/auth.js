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
    //    Supondo que o seu model User criptografa a senha via pre('save')
    const newUser = await User.create({
      name,
      email,
      password,
      role,
      approved: false // ficará pendente até o administrador aprovar
    });

    // 5) Retorna apenas mensagem de sucesso (sem gerar token neste momento)
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
    // 1) Pega email e senha do corpo da requisição
    const rawEmail = req.body.email || '';
    const password = req.body.password || '';
    const email = rawEmail.trim().toLowerCase();

    // 2) Valida domínio institucional (incluindo @admin.estacio.br)
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

    // 4) Bloqueia login apenas se NÃO for admin e ainda não estiver aprovado
    if (user.role !== 'admin' && !user.approved) {
      return res
        .status(403)
        .json({ error: 'Sua conta ainda não foi aprovada pelo administrador.' });
    }

    // 5) Compara a senha que veio na requisição com o hash salvo no banco
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // 6) Gera o JWT (use a sua chave secreta definida em .env)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 7) Retorna o objeto 'user' (sem a senha) e o token
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

