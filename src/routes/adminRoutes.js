// backend/src/routes/adminRoutes.js
import { Router } from 'express';
import User from '../models/User.js';
import { authenticateToken, ensureAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/admin/pending-users
// → Retorna lista de usuários com approved: false
router.get(
  '/pending-users',
  authenticateToken,
  ensureAdmin,
  async (req, res) => {
    try {
      const pendentes = await User.find({ approved: false })
                                  .select(' _id name email role createdAt ');
      return res.json(pendentes);
    } catch (err) {
      console.error('[Admin][GET pending-users] Error:', err);
      return res.status(500).json({ error: 'Erro ao buscar usuários pendentes.' });
    }
  }
);

// PUT /api/admin/pending-users/:id/approve
// → Aprova um usuário pendente (approved=true)
router.put(
  '/pending-users/:id/approve',
  authenticateToken,
  ensureAdmin,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      if (user.approved) {
        return res.status(400).json({ error: 'Usuário já está aprovado.' });
      }
      user.approved = true;
      await user.save();
      return res.json({ message: 'Usuário aprovado com sucesso.' });
    } catch (err) {
      console.error('[Admin][APPROVE user] Error:', err);
      return res.status(500).json({ error: 'Erro ao aprovar usuário.' });
    }
  }
);

// DELETE /api/admin/pending-users/:id/reject
// → Rejeita (remove) um usuário pendente
router.delete(
  '/pending-users/:id/reject',
  authenticateToken,
  ensureAdmin,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      if (user.approved) {
        return res.status(400).json({ error: 'Não é possível rejeitar usuário já aprovado.' });
      }
      await user.deleteOne(); // apenas remove o documento
      return res.json({ message: 'Usuário rejeitado e removido.' });
    } catch (err) {
      console.error('[Admin][REJECT user] Error:', err);
      return res.status(500).json({ error: 'Erro ao rejeitar usuário.' });
    }
  }
);

export default router;
