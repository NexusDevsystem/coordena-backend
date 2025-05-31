// backend/src/routes/adminRoutes.js
import express from 'express';
import { authenticateToken, authorizeAdmin } from '../middleware/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

// Antes: buscava por { status: 'pending' }
// Agora: buscará por { approved: false }
router.get(
  '/pending-users',
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      // Busca todos que ainda não foram aprovados (approved: false)
      const pendentes = await User.find({ approved: false }).sort({ createdAt: 1 });
      return res.json(pendentes);
    } catch (err) {
      console.error('Erro ao buscar usuários pendentes:', err);
      return res.status(500).json({ error: 'Erro ao buscar usuários pendentes.' });
    }
  }
);

// PATCH /api/admin/approve/:id (aprova trocando approved para true)
router.patch(
  '/approve/:id',
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

      user.approved = true;
      await user.save();
      return res.json({ message: 'Usuário aprovado com sucesso.' });
    } catch (err) {
      console.error(`Erro ao aprovar usuário ${req.params.id}:`, err);
      return res.status(500).json({ error: 'Erro ao aprovar usuário.' });
    }
  }
);

// DELETE /api/admin/reject/:id (remove do banco ou marque como rejeitado)
router.delete(
  '/reject/:id',
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

      // Aqui você pode remover ou só manter approved=false + outro campo de “rejeitado”
      await User.findByIdAndDelete(userId);
      return res.json({ message: 'Usuário rejeitado e excluído com sucesso.' });
    } catch (err) {
      console.error(`Erro ao rejeitar usuário ${req.params.id}:`, err);
      return res.status(500).json({ error: 'Erro ao rejeitar usuário.' });
    }
  }
);

export default router;
