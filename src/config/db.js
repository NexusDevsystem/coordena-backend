const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`✅ MongoDB conectado ao DB “${process.env.DB_NAME}”`);
  } catch (err) {
    console.error('❌ Falha na conexão com MongoDB:', err);
    process.exit(1);
  }
}

module.exports = connectDB;
