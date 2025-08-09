<<<<<<< HEAD
// BACKEND/src/models/User.js
=======
// backend/src/models/User.js
>>>>>>> 46c31a77d9005eaa104e8fa1240824eda93504db
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // Admin loga por username. Outros podem até não ter username.
    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // permite vários docs sem username
      index: true
    },

<<<<<<< HEAD
    // Email obrigatório para não-admin
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true, // permite doc sem email (caso admin)
      validate: {
        validator(v) {
          if (!v) return true; // ok se vazio (p/ admin)
          // validação simples de email
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Email inválido.'
      },
      required: function requiredEmail() {
        return this.role !== 'admin';
      }
    },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
      index: true
    },

    approved: { type: Boolean, default: false }
  },
  { timestamps: true, collection: 'users' }
);

// Índices auxiliares
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ username: 1 }, { unique: true, sparse: true });

const User = mongoose.model('User', UserSchema);
export default User;
=======
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
>>>>>>> 46c31a77d9005eaa104e8fa1240824eda93504db
