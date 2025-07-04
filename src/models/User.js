// backend/src/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    // Novo campo de matrícula  
    registration: {
      type: String,
      required: true,
      unique: true
    },

    // E-mail institucional
    institutionalEmail: {
      type: String,
      required: true,
      unique: true
    },

    // E-mail pessoal
    personalEmail: {
      type: String,
      required: true,
      unique: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: ['student','professor','admin'],
      default: 'student'
    },

    status: {
      type: String,
      enum: ['pending','approved','rejected'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

// hash da senha
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function(entered) {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model('User', userSchema);
