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
    // 1) Captura tanto "registration" quanto "matricula"
    const {
      name,
      registration: registrationBody,
      matricula,
      institutionalEmail,
      personalEmail,
      password
    } = req.body;

    // 2) Usa registrationBody se existir, senão matricula
    const registration = registrationBody || matricula;

    // 3) Validação de campos obrigatórios
    if (!name || !registration || !institutionalEmail || !personalEmail || !password) {
      return res.status(400).json({ message: 'Preencha todos os campos' });
    }

    // 4) Normaliza e valida domínio institucional
    const instEmail = institutionalEmail.trim().toLowerCase();
    const persEmail = personalEmail.trim().toLowerCase();
    if (!estacioRegex.test(instEmail)) {
      return res.status(400).json({
        message:
          'Use um e-mail institucional válido (@alunos.estacio.br ou @professor.estacio.br)'
      });
    }

    // 5) Define role automaticamente pelo domínio institucional
    const role = instEmail.endsWith('@professor.estacio.br') ? 'professor' : 'student';

    // 6) Se já existir, atualiza name, registration, password e role (status permanece)
    let user = await User.findOne({ institutionalEmail: instEmail }).select('+status');
    if (user) {
      user.name         = name;
      user.registration = registration;
      user.role         = role;
      user.password     = password;  // hash no pre-save
      await user.save();

      const token = generateToken(user._id, user.role);
      return res.json({
        _id:               user._id,
        name:              user.name,
        registration:      user.registration,
        institutionalEmail:user.institutionalEmail,
        personalEmail:     user.personalEmail,
        role:              user.role,
        status:            user.status,
        token
      });
    }

    // 7) Caso seja novo, cria com status 'pending'
    const newUser = new User({
      name,
      registration,
      institutionalEmail: instEmail,
      personalEmail:      persEmail,
      password,
      role,
      status: 'pending'
    });
    await newUser.save();

    // 8) Notifica admins via push (lógica existente)
    const admins = await User.find({ role: 'admin', status: 'approved' }).select('_id');
    const adminIds = admins.map(a => a._id.toString());
    const subs = await PushSubscription.find({ userId: { $in: adminIds } });
    const payload = JSON.stringify({
      title: 'Nova solicitação de cadastro',
      body:  `${newUser.name} solicitou acesso.`,
      data:  { url: '/pages/admin.html' }
    });
    subs.forEach(sub =>
      sendPushNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
        .catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
          }
        })
    );

    // 9) Retorna dados + token
    const token = generateToken(newUser._id, newUser.role);
    return res.status(201).json({
      _id:               newUser._id,
      name:              newUser.name,
      registration:      newUser.registration,
      institutionalEmail:newUser.institutionalEmail,
      personalEmail:     newUser.personalEmail,
      role:              newUser.role,
      status:            newUser.status,
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

/* loginUser permanece inalterado */
