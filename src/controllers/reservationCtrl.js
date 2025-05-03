const Reservation = require('../models/reservation');

// GET /api/reservations
exports.getReservations = async (req, res) => {
  try {
    const all = await Reservation.find().sort({ date: 1, start: 1 });
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar reservas' });
  }
};

// POST /api/reservations
exports.createReservation = async (req, res) => {
  try {
    const novo = await Reservation.create(req.body);
    res.status(201).json(novo);
  } catch (err) {
    res.status(400).json({ error: 'Dados inválidos', details: err });
  }
};

// PUT /api/reservations/:id
exports.updateReservation = async (req, res) => {
  try {
    const updated = await Reservation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Reserva não encontrada' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'Falha ao atualizar', details: err });
  }
};

// DELETE /api/reservations/:id
exports.deleteReservation = async (req, res) => {
  try {
    const deleted = await Reservation.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Reserva não encontrada' });
    res.json({ message: 'Reserva removida' });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao deletar reserva' });
  }
};
