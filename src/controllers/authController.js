import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Gera token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  })
}

// POST /api/auth/register
export const registerUser = async (req, res) => {
  const { name, email, password } = req.body

  // Verifica se já existe usuário com o e‑mail
  const exists = await User.findOne({ email })
  if (exists) {
    return res.status(400).json({ message: 'E‑mail já cadastrado' })
  }

  // Cria e salva novo usuário
  const user = await User.create({ name, email, password })
  if (user) {
    res.status(201).json({
      _id:   user._id,
      name:  user.name,
      email: user.email,
      token: generateToken(user._id)
    })
  } else {
    res.status(400).json({ message: 'Dados inválidos' })
  }
}

// POST /api/auth/login
export const loginUser = async (req, res) => {
  const { email, password } = req.body

  // Busca usuário e compara senha
  const user = await User.findOne({ email }).select('+password')
  if (user && await user.matchPassword(password)) {
    res.json({
      _id:   user._id,
      name:  user.name,
      email: user.email,
      token: generateToken(user._id)
    })
  } else {
    res.status(401).json({ message: 'E‑mail ou senha incorretos' })
  }
}
