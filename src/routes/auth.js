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

    // Busca usuário incluindo password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // ← Novo: bloqueia se não aprovado
    if (!user.approved) {
      return res
        .status(403)
        .json({ error: 'Sua conta ainda não foi aprovada pelo administrador.' });
    }

    // Checa senha
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Gera JWT normalmente
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
