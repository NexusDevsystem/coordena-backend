// backend/src/routes/adminRoutes.js

import express from 'express';
import { authenticateToken, authorizeAdmin } from '../middleware/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * GET /api/admin/pending-users
 * Retorna todos os usuários com status "pending"
 */
router.get(
  '/pending-users',
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const pendentes = await User.find({ status: 'pending' }).sort({ createdAt: 1 });
      return res.json(pendentes);
    } catch (err) {
      console.error('Erro ao buscar usuários pendentes:', err);
      return res.status(500).json({ error: 'Erro ao buscar usuários pendentes.' });
    }
  }
);

/**
 * PATCH /api/admin/approve/:id
 * Altera status do usuário para "approved"
 */
router.patch(
  '/approve/:id',
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    const userId = req.params.id;
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      user.status = 'approved';
      await user.save();

      return res.json({ message: 'Usuário aprovado com sucesso.' });
    } catch (err) {
      console.error(`Erro ao aprovar usuário ${userId}:`, err);
      return res.status(500).json({ error: 'Erro ao aprovar usuário.' });
    }
  }
);

/**
 * DELETE /api/admin/reject/:id
 * Remove (ou marca como rejeitado) o usuário
 */
router.delete(
  '/reject/:id',
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    const userId = req.params.id;
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      // Aqui você pode 'remover' ou alterar status para 'rejected'. 
      // Exemplo removendo diretamente:
      await User.findByIdAndDelete(userId);

      return res.json({ message: 'Usuário rejeitado e excluído com sucesso.' });
    } catch (err) {
      console.error(`Erro ao rejeitar usuário ${userId}:`, err);
      return res.status(500).json({ error: 'Erro ao rejeitar usuário.' });
    }
  }
);

export default router;
