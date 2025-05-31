// backend/src/routes/adminRoutes.js

import { Router } from 'express';
import User from '../models/User.js';
import { authenticateToken, ensureAdmin } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * GET /api/admin/pending-users
 * Retorna todos os usuários com approved=false e role ≠ 'admin'
 * Protegido por authenticateToken + ensureAdmin
 */
router.get(
  '/pending-users',
  authenticateToken,
  ensureAdmin,
  async (req, res) => {
    try {
      // Busca todos os usuários pendentes (approved: false), exceto administradores
      const pendentes = await User.find({
        approved: false,
        role: { $ne: 'admin' }
      }).select('name email role createdAt');

      return res.json(pendentes);
    } catch (err) {
      console.error('[Admin][GET /pending-users] Error:', err);
      return res.status(500).json({ error: 'Erro ao buscar usuários pendentes.' });
    }
  }
);

export default router;
