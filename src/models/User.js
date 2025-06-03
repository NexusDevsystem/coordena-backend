// backend/src/models/User.js

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    select: false // não retorna por padrão
  },
  role: {
    type: String,
    enum: ['student', 'professor', 'admin'],
    default: 'student'
  },
  // Novo campo “status” para controlar pending / approved / rejected
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  // (Opcional: se você ainda quiser manter “approved” booleano, deixe-o aqui. Mas não é mais indispensável.)
  // approved: {
  //   type: Boolean,
  //   default: false
  // },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Antes de salvar, “hash” na senha
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Método para comparar senha (caso você use algo como user.matchPassword)
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
