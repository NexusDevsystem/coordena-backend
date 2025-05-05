// backend/src/controllers/authController.js
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const generateToken = id =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Preencha todos os campos' })

    const exists = await User.findOne({ email })
    if (exists)
      return res.status(400).json({ message: 'Usuário já existe' })

    const user = await User.create({ name, email, password })
    if (!user) throw new Error('Falha ao criar usuário')

    return res.status(201).json({
      _id:   user._id,
      name:  user.name,
      email: user.email,
      token: generateToken(user._id)
    })
  } catch (err) {
    console.error('🔥 registerUser error:', err)
    res.status(500).json({ message: 'Erro interno no servidor' })
  }
}

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ message: 'Preencha todos os campos' })

    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'E-mail ou senha incorretos' })

    return res.json({
      _id:   user._id,
      name:  user.name,
      email: user.email,
      token: generateToken(user._id)
    })
  } catch (err) {
    console.error('🔥 loginUser error:', err)
    res.status(500).json({ message: 'Erro interno no servidor' })
  }
}
