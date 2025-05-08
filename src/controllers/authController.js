import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Regex institucional Estácio (alunos e professores)
const estacioRegex = /^[\w.%+-]+@(alunos|professor)\.estacio\.br$/i

// Gera o JWT com payload id e role
const generateToken = (id, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não definido')
  }
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

// POST /api/auth/register - role inferido pelo domínio
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Preencha todos os campos' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    // Validação de domínio institucional
    if (!estacioRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Use um e-mail institucional válido (@alunos.estacio.br ou @professor.estacio.br)' })
    }

    // Define role automaticamente pelo domínio
    const role = normalizedEmail.endsWith('@professor.estacio.br')
      ? 'professor'
      : 'student'

    // Verifica se usuário já existe
    let user = await User.findOne({ email: normalizedEmail })
    if (user) {
      // Atualiza nome, senha e role
      user.name     = name
      user.role     = role
      user.password = password // pre-save hook no model cuidará do hash
      await user.save()

      const token = generateToken(user._id, user.role)
      return res.json({
        _id:   user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
        token
      })
    }

    // Cria novo usuário
    user = await User.create({ name, email: normalizedEmail, password, role })
    const token = generateToken(user._id, user.role)
    return res.status(201).json({
      _id:   user._id,
      name:  user.name,
      email: user.email,
      role:  user.role,
      token
    })
  } catch (err) {
    console.error('🔥 registerUser error:', err)
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message })
    }
    res.status(500).json({ message: 'Erro interno no servidor' })
  }
}

// POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Preencha todos os campos' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    // Validação de domínio institucional
    if (!estacioRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Use um e-mail institucional válido (@alunos.estacio.br ou @professor.estacio.br)' })
    }

    // Busca usuário incluindo senha
    const user = await User.findOne({ email: normalizedEmail }).select('+password')
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos' })
    }

    const token = generateToken(user._id, user.role)
    return res.json({
      _id:   user._id,
      name:  user.name,
      email: user.email,
      role:  user.role,
      token
    })
  } catch (err) {
    console.error('🔥 loginUser error:', err)
    res.status(500).json({ message: 'Erro interno no servidor' })
  }
}
