// routes/scheduledBlocks.js
import express from 'express';
import ScheduledBlock from '../models/ScheduledBlock.js';

const router = express.Router();

// GET /api/scheduled-blocks?lab=Lab401&date=2025-05-12
router.get('/', async (req, res) => {
  const { lab, date } = req.query;
  if (!lab || !date) return res.status(400).end();

  const day = new Date(date).getDay();    // 0-dom,1-seg…6-sáb
  const dayOfWeek = day === 0 ? 7 : day;   // padrão nosso: 1..7

  const blocks = await ScheduledBlock.find({ lab, dayOfWeek })
    .select('startTime endTime -_id')
    .lean();

  res.json(blocks);
});

export default router;
