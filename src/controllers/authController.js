// backend/src/controllers/authController.js

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PushSubscription from '../models/PushSubscription.js';
import { sendPushNotification } from '../config/webpush.js';
import bcrypt from 'bcryptjs';

// Regex institucional Estácio (alunos e professores)
const estacioRegex = /^[\w.%+-]+@(alunos|professor)\.estacio\.br$/i;

// Gera o JWT com payload id e role
const generateToken = (id, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não definido');
  }
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/register - role inferido pelo domínio
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Preencha todos os campos' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    // Validação de domínio institucional
    if (!estacioRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message:
          'Use um e-mail institucional válido (@alunos.estacio.br ou @professor.estacio.br)',
      });
    }

    // Define role automaticamente pelo domínio
    const role = normalizedEmail.endsWith('@professor.estacio.br')
      ? 'professor'
      : 'student';

    // Verifica se usuário já existe
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // **Se já existe, apenas atualiza nome, role e senha (re‐hash será feito pelo pre‐save hook)**
      user.name = name;
      user.role = role;
      user.password = password;
      // **Manter o campo `approved` como está (se já tinha sido aprovado ou não)**
      await user.save();

      const token = generateToken(user._id, user.role);
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      });
    }

    // **Cria novo usuário com approved: false (pendente)**
    const newUser = new User({
      name,
      email: normalizedEmail,
      password, // pre-save hook no model fará o hash
      role,
      approved: false, // pendente até o admin aprovar
    });
    await newUser.save();

    // **A partir daqui, disparamos o push para os admins**

    console.log(`→ Novo usuário pendente criado: ${newUser._id} (${newUser.email})`);

    // 1) Buscar todos os admins que já estão aprovados
    const admins = await User.find({ role: 'admin', approved: true }).select('_id');
    const adminIds = admins.map((a) => a._id.toString());
    console.log(`→ IDs de admins aprovados: [${adminIds.join(', ')}]`);

    // 2) Buscar todas as subscriptions desses admins
    const subs = await PushSubscription.find({ userId: { $in: adminIds } });
    console.log(`→ Encontrei ${subs.length} subscription(s) de admin(es).`);

    // 3) Montar payload da notificação
    const payload = JSON.stringify({
      title: 'Nova solicitação de cadastro',
      body: `${newUser.name} solicitou acesso.`,
      data: { url: '/pages/admin.html' },
    });

    // 4) Enviar push para cada subscription
    subs.forEach((sub) => {
      console.log(`→ Tentando enviar push para endpoint: ${sub.endpoint}`);
      sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        },
        payload
      )
        .then(() => {
          console.log('   ✔ Enviado com sucesso!');
        })
        .catch((err) => {
          console.error('   ❌ Falha ao enviar push para:', sub.endpoint, err);
          // Opcional: se err.statusCode for 410/404 (subscription inválida), remova do banco:
          if (err.statusCode === 410 || err.statusCode === 404) {
            PushSubscription.deleteOne({ _id: sub._id })
              .then(() =>
                console.log(`   • Subscription removida (${sub.endpoint}) pois está inválida.`)
              )
              .catch((e) =>
                console.error('   • Erro ao remover subscription inválida:', e)
              );
          }
        });
    });

    // 5) Retorna a resposta de registro
    const token = generateToken(newUser._id, newUser.role);
    return res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      token,
    });
  } catch (err) {
    console.error('🔥 registerUser error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Erro interno no servidor' });
  }
};

// POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Preencha todos os campos' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    // Validação de domínio institucional
    if (!estacioRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message:
          'Use um e-mail institucional válido (@alunos.estacio.br ou @professor.estacio.br)',
      });
    }

    // Busca usuário incluindo senha
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos' });
    }

    // Opcional: só permitir login se o usuário já tiver sido aprovado (caso queira bloquear estudantes antes da aprovação)
    // if (!user.approved && user.role !== 'professor') {
    //   return res.status(403).json({ message: 'Usuário ainda não aprovado pelo administrador.' });
    // }

    const token = generateToken(user._id, user.role);
    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (err) {
    console.error('🔥 loginUser error:', err);
    return res.status(500).json({ message: 'Erro interno no servidor' });
  }
};
