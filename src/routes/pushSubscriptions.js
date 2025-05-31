import express from 'express';
import PushSubscription from '../models/PushSubscription.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getPublicKey } from '../config/webpush.js';

const router = express.Router();

// 1) Retorna a VAPID public key
router.get('/publicKey', (_req, res) => {
  return res.json({ publicKey: getPublicKey() });
});

// 2) Salvar uma nova PushSubscription no banco
router.post('/subscribe', authenticateToken, async (req, res) => {
  const { endpoint, keys } = req.body;
  const userId = req.user.id;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Subscription inválida.' });
  }

  try {
    let sub = await PushSubscription.findOne({ endpoint });

    if (!sub) {
      sub = new PushSubscription({ endpoint, keys, userId });
      await sub.save();
    } else if (!sub.userId.equals(userId)) {
      sub.userId = userId;
      await sub.save();
    }

    return res.status(201).json({ message: 'Subscription salva com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao salvar subscription.' });
  }
});

// 3) Remover subscription (quando o admin quiser desinscrever)
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  const { endpoint } = req.body;
  const userId = req.user.id;

  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint obrigatório.' });
  }

  try {
    await PushSubscription.deleteOne({ endpoint, userId });
    return res.json({ message: 'Subscription removida com sucesso.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao remover subscription.' });
  }
});

export default router;
