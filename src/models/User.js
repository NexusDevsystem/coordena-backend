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
  approved: {
    type: Boolean,
    default: false  // TODO: novo usuário fica pendente
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Antes de salvar, "hash" na senha
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model('User', userSchema);
