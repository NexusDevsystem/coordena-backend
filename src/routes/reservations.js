import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

const reservationSchema = new mongoose.Schema(
  {
    user:        { type: ObjectId, ref: 'User', required: true },
    date:        { type: String, required: true },
    start:       { type: String, required: true },
    end:         { type: String, required: true },
    resource:    { type: String, required: true },
    sala:        { type: String, default: '' },
    type:        { type: String, required: true },
    responsible: { type: String, required: true },
    department:  { type: String, required: true },
    status:      { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
    description: { type: String, default: '' },
    time:        { type: String, required: true },
    title:       { type: String, required: true }
  },
  { timestamps: true }
);

export default mongoose.model('Reservation', reservationSchema);
