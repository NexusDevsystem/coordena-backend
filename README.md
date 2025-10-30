# Coordena+ Backend

## 🚀 Servidor Backend do Sistema Coordena+

Sistema de gerenciamento de reservas e agendamentos para laboratórios e recursos acadêmicos.

## 📋 Configuração

### Variáveis de Ambiente Necessárias

```env
MONGO_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=Coordena+
JWT_SECRET=sua-chave-secreta-super-segura
FRONTEND_URL=https://seu-frontend.com
PORT=10000
```

### Como Configurar

1. Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

2. Edite o `.env` com suas credenciais reais

3. Teste a conexão:
```bash
node test-mongo-connection.js
```

## 🧪 Testar Localmente

```bash
npm install
npm run dev
```

## 📚 Documentação

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Guia de solução de problemas

## 🔒 Segurança

- Nunca commite o arquivo `.env`
- Use senhas fortes
- Configure Network Access no MongoDB Atlas (whitelist de IPs)

## 📦 Deploy

O projeto está configurado para deploy automático no Render.

**Importante**: Configure todas as variáveis de ambiente no painel do Render antes do deploy.

---

Desenvolvido por NexusDevsystem
