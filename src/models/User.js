import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role:     {
    type: String,
    enum: ['student','professor','admin'],
    default: 'student'
  },

  // ← Novo campo: fica "false" até o ADM aprovar
  approved: {
    type: Boolean,
    default: false
  }

}, { timestamps: true })

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

userSchema.methods.matchPassword = function(entered) {
  return bcrypt.compare(entered, this.password)
}

export default mongoose.model('User', userSchema)
