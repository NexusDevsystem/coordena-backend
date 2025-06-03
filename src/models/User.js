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
    select: false // não retorna por padrão ao buscar
  },
  role: {
    type: String,
    enum: ['student', 'professor', 'admin'],
    default: 'student'
  },
  // Substituímos o booleano `approved` pelo campo `status`:
  // - “pending” (novo usuário ainda não avaliado),
  // - “approved” (usuário aprovado),
  // - “rejected” (usuário rejeitado)
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Antes de salvar, "hash" na senha
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  this.updatedAt = Date.now();
  next();
});

// Antes de atualizar via findOneAndUpdate (e rotas que usam findByIdAndUpdate), atualizar o updatedAt
 userSchema.pre('findOneAndUpdate', function(next) {
   this.set({ updatedAt: Date.now() });
   next();
 });

export default mongoose.model('User', userSchema);
