// backend/src/models/Reservation.js

import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    date:        { type: String, required: true },
    start:       { type: String, required: true },
    end:         { type: String, required: true },
    resource:    { type: String, required: true },
    sala:        { type: String, default: '' },
    type:        { type: String, required: true },
    responsible: { type: String, required: true },
    department:  { type: String, required: true },
    status:      { type: String, required: true, default: 'pending' },
    description: { type: String, default: '' },
    time:        { type: String, required: true },
    title:       { type: String, required: true }
  },
  { timestamps: true }
);

const Reservation = mongoose.model('Reservation', reservationSchema);
export default Reservation;
