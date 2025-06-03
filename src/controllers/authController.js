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
      // Se já existe, apenas atualiza nome, role e senha (re‐hash no hook do schema)
      user.name = name;
      user.role = role;
      user.password = password;
      // ** NÃO alteramos `status` aqui, deixamos como está (pendente, approved ou rejected )**
      await user.save();

      const token = generateToken(user._id, user.role);
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status, // devolve o status atual
        token,
      });
    }

    // Se for novo usuário, criamos com status: "pending"
    const newUser = new User({
      name,
      email: normalizedEmail,
      password, // o pre-save hook irá gerar o hash
      role,
      status: 'pending' // por padrão, pendente até o admin aprovar
    });
    await newUser.save();

    console.log(`→ Novo usuário pendente: ${newUser._id} (${newUser.email})`);

    // --- Envia push para todos os admins aprovados ---
    const admins = await User.find({ role: 'admin', status: 'approved' }).select('_id');
    const adminIds = admins.map(a => a._id.toString());
    console.log(`→ Admins aprovados encontrados: [${adminIds.join(', ')}]`);

    const subs = await PushSubscription.find({ userId: { $in: adminIds } });
    console.log(`→ Subscriptions de admins: ${subs.length}`);

    const payload = JSON.stringify({
      title: 'Nova solicitação de cadastro',
      body: `${newUser.name} solicitou acesso.`,
      data: { url: '/pages/admin.html' },
    });

    subs.forEach(sub => {
      console.log(`→ Enviando push para: ${sub.endpoint}`);
      sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        },
        payload
      )
        .then(() => {
          console.log('   ✔ Push enviado com sucesso!');
        })
        .catch(err => {
          console.error('   ❌ Falha ao enviar push:', sub.endpoint, err);
          if (err.statusCode === 410 || err.statusCode === 404) {
            PushSubscription.deleteOne({ _id: sub._id })
              .then(() =>
                console.log(`   • Subscription removida (${sub.endpoint}) inválida.`)
              )
              .catch(e =>
                console.error('   • Erro ao remover subscription inválida:', e)
              );
          }
        });
    });

    // Retorna a resposta de registro
    const token = generateToken(newUser._id, newUser.role);
    return res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
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
    if (!estacioRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message:
          'Use um e-mail institucional válido (@alunos.estacio.br ou @professor.estacio.br)',
      });
    }

    // Busca usuário incluindo senha e status
    const user = await User.findOne({ email: normalizedEmail })
      .select('+password +status');

    if (!user) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos' });
    }

    // Valida a senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos' });
    }

    // Agora só permite login se status for exatamente 'approved'
    if (user.status !== 'approved') {
      return res
        .status(403)
        .json({ message: 'Sua conta ainda não foi aprovada pelo administrador.' });
    }

    // Se chegou até aqui, gera o token e devolve dados
    const token = generateToken(user._id, user.role);

    // Remove a senha do objeto para não enviar junto
    user.password = undefined;

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      token,
    });
  } catch (err) {
    console.error('🔥 loginUser error:', err);
    return res.status(500).json({ message: 'Erro interno no servidor' });
  }
};
