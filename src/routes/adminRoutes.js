// backend/src/routes/adminRoutes.js
import { Router } from 'express';
import User from '../models/User.js';
import { authenticateToken, ensureAdmin } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * 1) GET /api/admin/pending-users
 *    — Retorna todos os usuários ainda pendentes (approved: false), exceto admins
 */
router.get(
  '/pending-users',
  authenticateToken,
  ensureAdmin,
  async (_req, res) => {
    try {
      const pendentes = await User.find({
        approved: false,
        role:    { $ne: 'admin' }
      }).select('name email role createdAt');
      return res.json(pendentes);
    } catch (err) {
      console.error('[Admin][GET /pending-users] Error:', err);
      return res.status(500).json({ error: 'Erro ao buscar usuários pendentes.' });
    }
  }
);

/**
 * 2) PATCH /api/admin/approve/:id
 *    — Marca approved=true no usuário de ID informado
 */
router.patch(
  '/approve/:id',
  authenticateToken,
  ensureAdmin,
  async (req, res) => {
    const userId = req.params.id;
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      user.approved = true;
      await user.save();
      return res.json({ message: 'Usuário aprovado com sucesso.' });
    } catch (err) {
      console.error('[Admin][PATCH /approve/:id] Error:', err);
      return res.status(500).json({ error: 'Erro ao aprovar usuário.' });
    }
  }
);

/**
 * 3) DELETE /api/admin/reject/:id
 *    — Exclui (rejeita) o usuário de ID informado
 */
router.delete(
  '/reject/:id',
  authenticateToken,
  ensureAdmin,
  async (req, res) => {
    const userId = req.params.id;
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      await user.deleteOne();
      return res.json({ message: 'Usuário rejeitado e excluído.' });
    } catch (err) {
      console.error('[Admin][DELETE /reject/:id] Error:', err);
      return res.status(500).json({ error: 'Erro ao rejeitar usuário.' });
    }
  }
);

export default router;
