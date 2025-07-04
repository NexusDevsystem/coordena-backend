// backend/src/controllers/authController.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PushSubscription from '../models/PushSubscription.js';
import { sendPushNotification } from '../config/webpush.js';

// … todas as constantes e a função generateToken …

export const registerUser = async (req, res) => {
  // … sua lógica de registro (já corrigida para receber `registration`) …
};

export const loginUser = async (req, res) => {
  try {
    const { institutionalEmail, password } = req.body;
    // … lógica de login que você já tinha …
  } catch (err) {
    console.error('🔥 loginUser error:', err);
    return res.status(500).json({ message: 'Erro interno no servidor' });
  }
};
