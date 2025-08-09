// backend/src/routes/adminRoutes.js

import express from 'express';
import { authenticateToken, authorizeAdmin } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Reservation from '../models/reservation.js';
import {
  sendUserNotification,
  sendReservationNotification
} from '../services/emailService.js';

const router = express.Router();

/* ============================================
   ROTAS PARA USUÁRIOS PENDENTES (status: 'pending')
   ============================================ */

// GET /api/admin/pending-users
router.get(
  '/pending-users',
  authenticateToken,
  authorizeAdmin,
  async (_req, res) => {
    try {
      const pendentes = await User.find({ status: 'pending' }).sort({ createdAt: 1 });
      return res.json(pendentes);
    } catch (err) {
      console.error('Erro ao buscar usuários pendentes:', err);
      return res.status(500).json({ error: 'Erro ao buscar usuários pendentes.' });
    }
  }
);

// PATCH /api/admin/approve-user/:id
router.patch(
  '/approve-user/:id',
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

      user.status = 'approved'; // agora é válido no schema
      await user.save();

      // não deixe o envio de e-mail derrubar a rota
      try {
        await sendUserNotification(user, 'approved');
      } catch (mailErr) {
        console.warn('Aviso: falha ao enviar e-mail de aprovação:', mailErr?.message || mailErr);
      }

      return res.json({ message: 'Usuário aprovado.' });
    } catch (err) {
      console.error(`Erro ao aprovar usuário ${req.params.id}:`, err);
      return res.status(500).json({ error: 'Erro ao aprovar usuário.' });
    }
  }
);

// PATCH /api/admin/reject-user/:id
router.patch(
  '/reject-user/:id',
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { reason } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

      user.status = 'rejected'; // agora é válido no schema
      await user.save();

      try {
        await sendUserNotification(user, 'rejected', reason);
      } catch (mailErr) {
        console.warn('Aviso: falha ao enviar e-mail de rejeição:', mailErr?.message || mailErr);
      }

      return res.json({ message: 'Usuário rejeitado.' });
    } catch (err) {
      console.error(`Erro ao rejeitar usuário ${req.params.id}:`, err);
      return res.status(500).json({ error: 'Erro ao rejeitar usuário.' });
    }
  }
);

// PATCH /api/admin/approve-reservation/:id
router.patch(
  '/approve-reservation/:id',
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const reservation = await Reservation.findById(req.params.id);
      if (!reservation) return res.status(404).json({ error: 'Reserva não encontrada.' });

      reservation.status = 'approved';
      await reservation.save();

      try {
        const user = await User.findById(reservation.user);
        await sendReservationNotification(reservation, user, 'approved');
      } catch (mailErr) {
        console.warn('Aviso: e-mail de reserva aprovada falhou:', mailErr?.message || mailErr);
      }

      return res.json({ message: 'Reserva aprovada.' });
    } catch (err) {
      console.error(`Erro ao aprovar reserva ${req.params.id}:`, err);
      return res.status(500).json({ error: 'Erro ao aprovar reserva.' });
    }
  }
);

// PATCH /api/admin/reject-reservation/:id
router.patch(
  '/reject-reservation/:id',
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { reason } = req.body;
      const reservation = await Reservation.findById(req.params.id);
      if (!reservation) return res.status(404).json({ error: 'Reserva não encontrada.' });

      reservation.status = 'rejected';
      await reservation.save();

      try {
        const user = await User.findById(reservation.user);
        await sendReservationNotification(reservation, user, 'rejected', reason);
      } catch (mailErr) {
        console.warn('Aviso: e-mail de reserva rejeitada falhou:', mailErr?.message || mailErr);
      }

      return res.json({ message: 'Reserva rejeitada.' });
    } catch (err) {
      console.error(`Erro ao rejeitar reserva ${req.params.id}:`, err);
      return res.status(500).json({ error: 'Erro ao rejeitar reserva.' });
    }
  }
);


export default router;
