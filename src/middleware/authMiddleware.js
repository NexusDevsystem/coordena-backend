// backend/src/middleware/auth.js
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export async function protect(req, res, next) {
  let token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'Não autenticado' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id)
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido' })
  }
}

export function authorizeProfessor(req, res, next) {
  if (req.user.role !== 'professor') {
    return res.status(403).json({ message: 'Acesso negado' })
  }
  next()
}
