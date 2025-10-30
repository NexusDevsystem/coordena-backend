// Script para testar conexão com MongoDB
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Testando conexão com MongoDB...\n');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI não está definida no arquivo .env');
  process.exit(1);
}

// Mostra a URI mascarando a senha
const maskedUri = MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
console.log('📝 URI (mascarada):', maskedUri);
console.log('📝 DB Name:', process.env.DB_NAME || 'Coordena+');
console.log('\n🔄 Conectando...\n');

const options = {
  dbName: process.env.DB_NAME || 'Coordena+',
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
};

mongoose.connect(MONGO_URI, options)
  .then(() => {
    console.log('✅ CONEXÃO ESTABELECIDA COM SUCESSO!');
    console.log('✅ Banco de dados:', mongoose.connection.db.databaseName);
    console.log('✅ Host:', mongoose.connection.host);
    
    // Testa uma operação simples
    return mongoose.connection.db.admin().listDatabases();
  })
  .then((result) => {
    console.log('\n📊 Bancos de dados disponíveis:');
    result.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    console.log('\n🎉 Teste concluído com sucesso!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ FALHA NA CONEXÃO!');
    console.error('❌ Erro:', err.message);
    console.error('\n💡 Possíveis causas:');
    console.error('   1. Senha incorreta na MONGO_URI');
    console.error('   2. Usuário não existe no MongoDB Atlas');
    console.error('   3. IP não está na whitelist (0.0.0.0/0)');
    console.error('   4. Cluster está pausado ou desativado');
    console.error('\n📖 Detalhes completos:');
    console.error(err);
    process.exit(1);
  });
