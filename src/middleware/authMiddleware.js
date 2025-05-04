import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const authMiddleware = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.user = await User.findById(decoded.id).select('-password')
      return next()
    } catch (err) {
      console.error('⚠️  Token inválido:', err)
      return res.status(401).json({ message: 'Não autorizado' })
    }
  }

  return res.status(401).json({ message: 'Token não fornecido' })
}

export default authMiddleware
