// models/ScheduledBlock.js
import mongoose from 'mongoose';

const ScheduledBlockSchema = new mongoose.Schema({
  lab:         { type: String, required: true },
  dayOfWeek:   { type: Number, required: true },   // 1 = segunda … 7 = domingo
  startTime:   { type: String, required: true },   // "08:00"
  endTime:     { type: String, required: true },   // "10:00"
  course:      { type: String, required: true },
  professor:   { type: String, required: true }
});

export default mongoose.model('ScheduledBlock', ScheduledBlockSchema);
