import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function connectDB() {
  try {
    // Validação das variáveis de ambiente
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI não está definida nas variáveis de ambiente');
    }

    console.log('🔄 Tentando conectar ao MongoDB...');
    
    const dbName = process.env.DB_NAME || 'Coordena+';
    
    const options = {
      dbName: dbName,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Timeout de 10 segundos
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(process.env.MONGO_URI, options);
    console.log(`✅ MongoDB conectado ao DB "${dbName}"`);
  } catch (err) {
    console.error('❌ Falha na conexão com MongoDB:', err.message);
    console.error('💡 Verifique:');
    console.error('   1. Se MONGO_URI está corretamente configurada no Render');
    console.error('   2. Se o usuário e senha do MongoDB estão corretos');
    console.error('   3. Se o IP do Render está na whitelist do MongoDB Atlas');
    process.exit(1);
  }
}

export default connectDB;
