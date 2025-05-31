// backend/src/middleware/authMiddleware.js

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Verifica se o header Authorization contém um token válido.
 * Se válido, busca o usuário no banco (sem a senha) e anexa em req.user.
 * Caso contrário, retorna erro 401.
 */
export const authenticateToken = async (req, res, next) => {
  let token;

  // Extrair token do header Authorization: "Bearer <token>"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  try {
    // Verifica e decodifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded deve conter { id: userId, role: '...' }

    // Busca o usuário no banco, removendo o campo "password"
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }

    // Anexa o usuário autenticado em req.user
    req.user = user;
    return next();
  } catch (err) {
    console.error('Erro ao verificar token JWT:', err);
    return res.status(401).json({ error: 'Token inválido.' });
  }
};

/**
 * Garante que o usuário (já autenticado em req.user) tenha role "admin".
 * Retorna 401 se não houver req.user ou 403 se não for admin.
 */
export const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Usuário não autenticado.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Permissão negada. Somente admin.' });
  }
  return next();
};
