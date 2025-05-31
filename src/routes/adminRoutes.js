// backend/src/routes/adminRoutes.js

import express from 'express';
import { authenticateToken, authorizeAdmin } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Reservation from '../models/Reservation.js';

const router = express.Router();

/* ============================================
   ROTAS PARA USUÁRIOS PENDENTES
   ============================================ */

// GET /api/admin/pending-users
// → Retorna todos os usuários com approved: false
router.get(
  '/pending-users',
  authenticateToken,
  authorizeAdmin,
  async (_req, res) => {
    try {
      const pendentes = await User.find({ approved: false }).sort({ createdAt: 1 });
      return res.json(pendentes);
    } catch (err) {
      console.error('Erro ao buscar usuários pendentes:', err);
      return res.status(500).json({ error: 'Erro ao buscar usuários pendentes.' });
    }
  }
);

// PATCH /api/admin/approve-user/:id
// → Marca approved = true para o usuário especificado
router.patch(
  '/approve-user/:id',
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      user.approved = true;
      await user.save();
      return res.json({ message: 'Usuário aprovado com sucesso.' });
    } catch (err) {
      console.error(`Erro ao aprovar usuário ${req.params.id}:`, err);
      return res.status(500).json({ error: 'Erro ao aprovar usuário.' });
    }
  }
);

// DELETE /api/admin/reject-user/:id
// → Remove (ou rejeita) o usuário especificado
router.delete(
  '/reject-user/:id',
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      // Se preferir apenas marcar rejeitado, adicione um campo "rejected" em vez de deletar. 
      // Aqui vamos deletar completamente:
      await User.findByIdAndDelete(userId);
      return res.json({ message: 'Usuário rejeitado e excluído com sucesso.' });
    } catch (err) {
      console.error(`Erro ao rejeitar usuário ${req.params.id}:`, err);
      return res.status(500).json({ error: 'Erro ao rejeitar usuário.' });
    }
  }
);


/* ============================================
   ROTAS PARA RESERVAS PENDENTES
   ============================================ */

// GET /api/admin/pending-reservations
// → Retorna todas as reservas com status: 'pending'
router.get(
  '/pending-reservations',
  authenticateToken,
  authorizeAdmin,
  async (_req, res) => {
    try {
      const pendentes = await Reservation.find({ status: 'pending' }).sort({ createdAt: -1 });
      return res.json(pendentes);
    } catch (err) {
      console.error('Erro ao buscar reservas pendentes:', err);
      return res.status(500).json({ error: 'Erro ao buscar reservas pendentes.' });
    }
  }
);

// PATCH /api/admin/approve-reservation/:id
// → Altera status = 'approved' para a reserva especificada
router.patch(
  '/approve-reservation/:id',
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const reservationId = req.params.id;
      const reservation = await Reservation.findById(reservationId);
      if (!reservation) {
        return res.status(404).json({ error: 'Reserva não encontrada.' });
      }

      reservation.status = 'approved';
      await reservation.save();
      return res.json({ message: 'Reserva aprovada com sucesso.' });
    } catch (err) {
      console.error(`Erro ao aprovar reserva ${req.params.id}:`, err);
      return res.status(500).json({ error: 'Erro ao aprovar reserva.' });
    }
  }
);

// DELETE /api/admin/reject-reservation/:id
// → Deleta a reserva pendente especificada
router.delete(
  '/reject-reservation/:id',
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const reservationId = req.params.id;
      const reservation = await Reservation.findById(reservationId);
      if (!reservation) {
        return res.status(404).json({ error: 'Reserva não encontrada.' });
      }

      await Reservation.findByIdAndDelete(reservationId);
      return res.json({ message: 'Reserva rejeitada e excluída com sucesso.' });
    } catch (err) {
      console.error(`Erro ao rejeitar reserva ${req.params.id}:`, err);
      return res.status(500).json({ error: 'Erro ao rejeitar reserva.' });
    }
  }
);

export default router;
