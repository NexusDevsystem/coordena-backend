// backend/src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded contém { id: userId, role: '...' }
    req.user = await User.findById(decoded.id).select('-password');
    return next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: 'Token inválido.' });
  }
};

export const ensureAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Usuário não autenticado.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Permissão negada.' });
  }
  return next();
};
