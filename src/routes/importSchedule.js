// routes/importSchedule.js
import express from 'express';
import multer  from 'multer';
import mongoose from 'mongoose';
import ScheduledBlock from '../models/ScheduledBlock.js';
import { parseExcelToBlocks } from '../lib/scheduleImporter.js';

const upload = multer({ dest: '/tmp' });
const router = express.Router();

router.post('/', upload.single('file'), async (req, res) => {
  try {
    // 1) Parse XLSX → array de blocos
    const blocks = await parseExcelToBlocks(req.file.path);
    // 2) Limpa a coleção
    await ScheduledBlock.deleteMany({});
    // 3) Insere em massa
    await ScheduledBlock.insertMany(blocks);
    res.json({ inserted: blocks.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Falha ao importar agenda' });
  }
});

export default router;
