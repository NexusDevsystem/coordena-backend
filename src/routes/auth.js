// src/routes/auth.js
import { Router } from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
// (importe também bcrypt ou outros que use)

const router = Router();

// Regex institucional
const estacioRegex = /^[\w.%+-]+@(alunos|professor)\.estacio\.br$/i;

router.post('/login', async (req, res) => {
  let email = req.body.email.trim().toLowerCase();
  const { password } = req.body;

  if (!estacioRegex.test(email)) {
    return res.status(400).json({
      error: 'E-mail inválido. Use @alunos.estacio.br ou @professor.estacio.br.'
    });
  }

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return res.status(401).json({ error: 'Senha incorreta.' });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token });
});

export default router;
