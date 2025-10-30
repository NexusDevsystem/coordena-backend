// backend/src/routes/adminRoutes.js

import express from 'express';
import authorize from '../middleware/authorize.js'; // Usando o novo middleware
import User from '../models/User.js';
import Reservation from '../models/reservation.js';

const router = express.Router();

/* ============================================
   GERENCIAMENTO DE USUÁRIOS
   ============================================ */

// Listar usuários pendentes
router.get('/pending-users', authorize('admin'), async (req, res) => {
  try {
    const pendingUsers = await User.find({ status: 'pending' }).sort({ createdAt: 1 });
    return res.json(pendingUsers);
  } catch (err) {
    console.error('[admin:get-pending-users]', err);
    return res.status(500).json({ error: 'Erro ao buscar usuários pendentes' });
  }
});

// Aprovar usuário
router.patch('/approve-user/:id', authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    user.status = 'approved';
    user.approved = true;       // compat com código antigo
    user.isApproved = true;     // compat com variação de nome
    await user.save();

    // A lógica de e-mail foi removida para manter o controller limpo,
    // podendo ser movida para um model hook ou service.

    return res.json({ ok: true, user });
  } catch (err) {
    console.error('[admin:approve-user]', err);
    return res.status(500).json({ error: 'Erro ao aprovar usuário' });
  }
});

// Rejeitar usuário
router.patch('/reject-user/:id', authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    user.status = 'rejected';
    await user.save();

    return res.json({ ok: true, user });
  } catch (err) {
    console.error('[admin:reject-user]', err);
    return res.status(500).json({ error: 'Erro ao rejeitar usuário' });
  }
});


/* ============================================
   GERENCIAMENTO DE RESERVAS
   ============================================ */

// Listar reservas pendentes
router.get('/pending-reservations', authorize('admin'), async (req, res) => {
  try {
    const pendingReservations = await Reservation.find({ status: 'pending' }).sort({ date: 1, start: 1 });
    return res.json(pendingReservations);
  } catch (err) {
    console.error('[admin:get-pending-reservations]', err);
    return res.status(500).json({ error: 'Erro ao buscar reservas pendentes' });
  }
});

// Aprovar reserva (admin ou professor)
router.patch('/approve-reservation/:id', authorize(['admin', 'professor']), async (req, res) => {
  try {
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Reserva não encontrada' });

    r.status = 'approved';
    await r.save();

    return res.json({ ok: true, reservation: r });
  } catch (err) {
    console.error('[admin:approve-reservation]', err);
    return res.status(500).json({ error: 'Erro ao aprovar reserva' });
  }
});

// Rejeitar reserva (admin ou professor)
router.patch('/reject-reservation/:id', authorize(['admin', 'professor']), async (req, res) => {
  try {
    const { reason } = req.body || {};
    const r = await Reservation.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Reserva não encontrada' });

    r.status = 'rejected';
    if (reason) r.rejectionReason = reason; // Salva o motivo se existir no schema
    await r.save();

    return res.json({ ok: true, reservation: r });
  } catch (err) {
    console.error('[admin:reject-reservation]', err);
    return res.status(500).json({ error: 'Erro ao rejeitar reserva' });
  }
});

export default router;
