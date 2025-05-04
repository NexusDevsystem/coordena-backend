// backend/src/models/user.js
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório']
  },
  email: {
    type: String,
    required: [true, 'E‑mail é obrigatório'],
    unique: true,
    match: [/.+\@.+\..+/, 'E‑mail inválido']
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'A senha precisa ter ao menos 6 caracteres'],
    select: false // não retorna a senha por padrão nas queries
  }
}, { timestamps: true })

// antes de salvar, hash da senha
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

// método para comparar senha
userSchema.methods.matchPassword = function(plain) {
  return bcrypt.compare(plain, this.password)
}

export default mongoose.model('User', userSchema)
