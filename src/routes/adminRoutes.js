// backend/src/routes/adminRoutes.js

import express from 'express';
import { authenticateToken, authorizeAdmin } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Reservation from '../models/reservation.js';

const router = express.Router();

/* ============================================
   ROTAS PARA USUÁRIOS PENDENTES (status: 'pending')
   ============================================ */

// GET /api/admin/pending-users
// → Retorna todos os usuários com status: 'pending'
router.get(
  '/pending-users',
  authenticateToken,
  authorizeAdmin,
  async (_req, res) => {
    try {
      // Agora filtramos por status: 'pending'
      const pendentes = await User.find({ status: 'pending' }).sort({ createdAt: 1 });
      return res.json(pendentes);
    } catch (err) {
      console.error('Erro ao buscar usuários pendentes:', err);
      return res.status(500).json({ error: 'Erro ao buscar usuários pendentes.' });
    }
  }
);

// PATCH /api/admin/approve-user/:id
// → Marca status = 'approved' para o usuário especificado
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

      // Atualiza o status para "approved"
      user.status = 'approved';
      await user.save();
      return res.json({ message: 'Usuário aprovado com sucesso.' });
    } catch (err) {
      console.error(`Erro ao aprovar usuário ${req.params.id}:`, err);
      return res.status(500).json({ error: 'Erro ao aprovar usuário.' });
    }
  }
);

// PATCH /api/admin/reject-user/:id
// → Altera status = 'rejected' para o usuário especificado (não deleta mais)
router.patch(
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

      // Atualiza o status para "rejected"
      user.status = 'rejected';
      await user.save();
      return res.json({ message: 'Usuário rejeitado com sucesso.' });
    } catch (err) {
      console.error(`Erro ao rejeitar usuário ${req.params.id}:`, err);
      return res.status(500).json({ error: 'Erro ao rejeitar usuário.' });
    }
  }
);

/* ============================================
   NOVA ROTA: Histórico de Usuários (aprovados + rejeitados)
   ============================================ */

// GET /api/admin/users-history
// → Retorna todos os usuários cujo status esteja em ['approved','rejected']
router.get(
  '/users-history',
  authenticateToken,
  authorizeAdmin,
  async (_req, res) => {
    try {
      // Busca usuários com status "approved" ou "rejected", ordenados pelo updatedAt (mais recentes primeiro)
      const historico = await User.find({ status: { $in: ['approved', 'rejected'] } })
        .select('-password')           // não retornar campo password
        .sort({ updatedAt: -1 });

      return res.json(historico);
    } catch (err) {
      console.error('Erro ao buscar histórico de usuários:', err);
      return res.status(500).json({ error: 'Erro ao buscar histórico de usuários.' });
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
