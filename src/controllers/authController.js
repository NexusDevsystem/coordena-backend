// backend/src/controllers/authController.js

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PushSubscription from '../models/PushSubscription.js';
import { sendPushNotification } from '../config/webpush.js';

// Regex institucional Estácio (alunos e professores)
const estacioRegex = /^[\w.%+-]+@(alunos|professor)\.estacio\.br$/i;

// Gera o JWT com payload { id, role }
const generateToken = (id, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não definido');
  }
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

/**
 * POST /api/auth/register
 */
export const registerUser = async (req, res) => {
  try {
    const {
      name,
      registration,
      institutionalEmail,
      personalEmail,
      password
    } = req.body;

    // 1) validação de campos obrigatórios
    if (!name || !registration || !institutionalEmail || !personalEmail || !password) {
      return res.status(400).json({ message: 'Preencha todos os campos' });
    }

    // 2) normaliza valores
    const reg        = registration.trim();
    const instEmail  = institutionalEmail.trim().toLowerCase();
    const persEmail  = personalEmail.trim().toLowerCase();

    // 3) valida domínio institucional
    if (!estacioRegex.test(instEmail)) {
      return res.status(400).json({
        message:
          'Use um e-mail institucional válido (@alunos.estacio.br ou @professor.estacio.br)'
      });
    }

    // 4) define role automaticamente
    const role = instEmail.endsWith('@professor.estacio.br') ? 'professor' : 'student';

    // 5) se já existir, atualiza
    let user = await User.findOne({ institutionalEmail: instEmail }).select('+status');
    if (user) {
      user.name         = name;
      user.registration = reg;
      user.password     = password;  // pre-save faz hash
      user.role         = role;
      await user.save();

      const token = generateToken(user._id, user.role);
      return res.json({
        _id:                user._id,
        name:               user.name,
        registration:       user.registration,
        institutionalEmail: user.institutionalEmail,
        personalEmail:      user.personalEmail,
        role:               user.role,
        status:             user.status,
        token
      });
    }

    // 6) cria novo usuário com status 'pending'
    const newUser = new User({
      name,
      registration:       reg,
      institutionalEmail: instEmail,
      personalEmail:      persEmail,
      password,
      role,
      status:             'pending'
    });
    await newUser.save();

    // 7) notifica admins via push
    const admins   = await User.find({ role: 'admin', status: 'approved' }).select('_id');
    const adminIds = admins.map(a => a._id.toString());
    const subs     = await PushSubscription.find({ userId: { $in: adminIds } });

    const payload = JSON.stringify({
      title: 'Nova solicitação de cadastro',
      body:  `${newUser.name} solicitou acesso.`,
      data:  { url: '/pages/admin.html' }
    });

    subs.forEach(sub =>
      sendPushNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      ).catch(err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        }
      })
    );

    // 8) retorna dados e token
    const token = generateToken(newUser._id, newUser.role);
    return res.status(201).json({
      _id:                newUser._id,
      name:               newUser.name,
      registration:       newUser.registration,
      institutionalEmail: newUser.institutionalEmail,
      personalEmail:      newUser.personalEmail,
      role:               newUser.role,
      status:             newUser.status,
      token
    });
  } catch (err) {
    console.error('🔥 registerUser error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Erro interno no servidor' });
  }
};

/**
 * POST /api/auth/login
 *
 * Suporta:
 *  - login “super-admin” com usuário “admin” + senha “admin123”
 *    → não exige e-mail, retorna token admin.
 *  - login comum, via campo `email` ou `institutionalEmail`.
 */
export const loginUser = async (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    if ((!email && !username) || !password) {
      return res.status(400).json({ error: 'Credenciais inválidas.' });
    }

    const query = email
      ? { email: String(email).toLowerCase() }
      : { username: String(username) };

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) return res.status(401).json({ error: 'E-mail/usuário ou senha inválidos.' });

    // ✅ considera aprovado se QUALQUER uma das formas estiver marcada
    const approved =
      user.status === 'approved' ||
      user.approved === true ||
      user.isApproved === true;

    if (!approved) {
      return res.status(403).json({
        error: 'Sua conta está pendente. Aguarde até 24h para aprovação.'
      });
    }

    const payload = {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status || ((user.approved || user.isApproved) ? 'approved' : 'pending'),
    };

    return res.json({ user: safeUser, token });
  } catch (err) {
    console.error('[authController.login]', err);
    return res.status(500).json({ error: 'Erro ao efetuar login.' });
  }
};
