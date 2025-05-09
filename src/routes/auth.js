import { Router } from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();

// Regex institucional Estácio (alunos e professores)
const estacioRegex = /^[\w.%+-]+@(alunos|professor)\.estacio\.br$/i;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email: rawEmail, password } = req.body;
    const email = rawEmail.trim().toLowerCase();

    // Valida domínio institucional
    if (!estacioRegex.test(email)) {
      return res
        .status(400)
        .json({ error: 'E-mail inválido. Use @alunos.estacio.br ou @professor.estacio.br.' });
    }

    // Infere role automaticamente
    const role = email.endsWith('@professor.estacio.br') ? 'professor' : 'student';

    // Busca usuário existente
    let user = await User.findOne({ email });
    if (user) {
      // Atualiza nome, senha e role (pre-save hook cuidará do hash)
      user.name     = name;
      user.password = password;
      user.role     = role;
      await user.save();

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
    }

    // Cria novo usuário
    user = await User.create({ name, email, password, role });
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    return res.status(201).json({
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role
      },
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
    const email    = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    // Valida domínio institucional
    if (!estacioRegex.test(email)) {
      return res
        .status(400)
        .json({ error: 'E-mail inválido. Use @alunos.estacio.br ou @professor.estacio.br.' });
    }

    // Busca usuário incluindo o campo oculto 'password'
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Compara senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    // Gera token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Retorna tanto o user quanto o token
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
