import jwt from 'jsonwebtoken'

export default function protect(req, res, next) {
  let token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      // armazena id e role para uso posterior
      req.user = { id: decoded.id, role: decoded.role }
      return next()
    } catch (err) {
      console.error('🔒 authMiddleware error:', err)
      return res.status(401).json({ message: 'Token inválido' })
    }
  }
  return res.status(401).json({ message: 'Não autorizado, token faltando' })
}
