// backend/src/controllers/authController.js

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PushSubscription from '../models/PushSubscription.js';
import { sendPushNotification } from '../config/webpush.js';
import bcrypt from 'bcryptjs';

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
 * → Espera name, institutionalEmail e personalEmail e password
 * → Role inferido pelo domínio institucional.
 * → Se já existir, só atualiza name, password, role (status permanece).
 * → Se for novo, cria com status="pending" e notifica admins via push.
 */
export const registerUser = async (req, res) => {
  try {
    const {
      name,
      institutionalEmail,
      personalEmail,
      password
    } = req.body;

    if (!name || !institutionalEmail || !personalEmail || !password) {
      return res.status(400).json({ message: 'Preencha todos os campos' });
    }

    const instEmail = institutionalEmail.trim().toLowerCase();
    // valida domínio institucional
    if (!estacioRegex.test(instEmail)) {
      return res.status(400).json({
        message:
          'Use um e-mail institucional válido (@alunos.estacio.br ou @professor.estacio.br)'
      });
    }

    // define role pelo domínio institucional
    const role = instEmail.endsWith('@professor.estacio.br')
      ? 'professor'
      : 'student';

    // verifica se já existe usuário com esse institucionalEmail
    let user = await User.findOne({ institutionalEmail: instEmail }).select('+status');

    if (user) {
      // atualiza name, password e role, mantém status
      user.name = name;
      user.role = role;
      user.password = password;
      await user.save();

      const token = generateToken(user._id, user.role);
      return res.json({
        _id:               user._id,
        name:              user.name,
        institutionalEmail:user.institutionalEmail,
        personalEmail:     user.personalEmail,
        role:              user.role,
        status:            user.status,
        token
      });
    }

    // cria novo usuário
    const newUser = new User({
      name,
      institutionalEmail: instEmail,
      personalEmail:      personalEmail.trim().toLowerCase(),
      password,
      role,
      status: 'pending'
    });
    await newUser.save();

    // notifica admins via push
    const admins = await User.find({ role: 'admin', status: 'approved' }).select('_id');
    const adminIds = admins.map((a) => a._id.toString());
    const subs = await PushSubscription.find({ userId: { $in: adminIds } });

    const payload = JSON.stringify({
      title: 'Nova solicitação de cadastro',
      body:  `${newUser.name} solicitou acesso.`,
      data:  { url: '/pages/admin.html' }
    });

    subs.forEach((sub) =>
      sendPushNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      ).catch((err) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        }
      })
    );

    const token = generateToken(newUser._id, newUser.role);
    return res.status(201).json({
      _id:               newUser._id,
      name:              newUser.name,
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

/**
 * POST /api/auth/login
 * → Recebe institucionalEmail e password.
 * → Valida domínio institucional, senha e status='approved'.
 * → Retorna dados + token.
 */
export const loginUser = async (req, res) => {
  try {
    const { institutionalEmail, password } = req.body;
    if (!institutionalEmail || !password) {
      return res.status(400).json({ message: 'Preencha todos os campos' });
    }

    const instEmail = institutionalEmail.trim().toLowerCase();
    if (!estacioRegex.test(instEmail)) {
      return res.status(400).json({
        message:
          'Use um e-mail institucional válido (@alunos.estacio.br ou @professor.estacio.br)'
      });
    }

    const user = await User.findOne({ institutionalEmail: instEmail })
      .select('+password +status +personalEmail');
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    if (user.status !== 'approved') {
      return res
        .status(403)
        .json({ message: 'Sua conta ainda não foi aprovada pelo administrador.' });
    }

    const token = generateToken(user._id, user.role);
    user.password = undefined;

    return res.json({
      _id:               user._id,
      name:              user.name,
      institutionalEmail:user.institutionalEmail,
      personalEmail:     user.personalEmail,
      role:              user.role,
      status:            user.status,
      token
    });
  } catch (err) {
    console.error('🔥 loginUser error:', err);
    return res.status(500).json({ message: 'Erro interno no servidor' });
  }
};
