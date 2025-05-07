// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');    // ou como você estiver importando o model
const jwt  = require('jsonwebtoken');      // se usar JWT
// …

// Regex que só permite @alunos.estacio.br ou @professor.estacio.br
const estacioRegex = /^[\w.%+-]+@(alunos|professor)\.estacio\.br$/i;

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 1) Validação de domínio institucional
  if (!estacioRegex.test(email)) {
    return res
      .status(400)
      .json({
        error:
          'E-mail inválido. Use @alunos.estacio.br ou @professor.estacio.br.'
      });
  }

  // 2) Busca o usuário no BD
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  // 3) Valida senha (ajuste ao seu método, bcrypt etc.)
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  // 4) Gera token e responde
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token });
});

module.exports = router;
