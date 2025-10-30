# 🔧 Guia de Solução - Erro de Autenticação MongoDB

## ❌ Erro Atual
```
bad auth : authentication failed
```

## 📋 Checklist de Solução

### 1️⃣ **Configurar MongoDB Atlas Corretamente**

#### A) Criar/Verificar Usuário do Banco de Dados

1. Acesse [MongoDB Atlas](https://cloud.mongodb.com/)
2. Selecione seu **Projeto** e **Cluster**
3. Vá em **Database Access** (no menu lateral esquerdo)
4. Clique em **+ ADD NEW DATABASE USER**
5. Configure:
   - **Authentication Method**: Password
   - **Username**: `coordenaplus` (ou outro de sua escolha)
   - **Password**: Clique em "Autogenerate Secure Password" e **COPIE A SENHA**
   - **Database User Privileges**: `Atlas admin` ou `Read and write to any database`
   - Clique em **Add User**

⚠️ **IMPORTANTE**: Guarde a senha em local seguro! Você não conseguirá vê-la novamente.

#### B) Configurar Network Access (Whitelist de IPs)

1. Ainda no MongoDB Atlas, vá em **Network Access** (menu lateral)
2. Clique em **+ ADD IP ADDRESS**
3. Selecione **ALLOW ACCESS FROM ANYWHERE** ou adicione `0.0.0.0/0`
4. Clique em **Confirm**

⚠️ **Nota**: Em produção, você pode restringir apenas aos IPs do Render, mas `0.0.0.0/0` funciona para começar.

#### C) Obter a String de Conexão

1. Volte para **Database** (menu lateral)
2. Clique no botão **Connect** do seu cluster
3. Selecione **Connect your application**
4. Escolha **Driver**: Node.js e **Version**: 5.5 or later
5. **COPIE** a connection string que aparece:

```
mongodb+srv://<username>:<password>@cluster.xxx.mongodb.net/?retryWrites=true&w=majority
```

6. **SUBSTITUA** `<username>` e `<password>` pelos valores reais:
   - `<username>`: o nome de usuário que você criou (ex: `coordenaplus`)
   - `<password>`: a senha que você copiou (sem os símbolos `<` e `>`)

**Exemplo**:
```
mongodb+srv://coordenaplus:MinHaS3nh4S3gur4@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```

⚠️ **ATENÇÃO**: Se sua senha contém caracteres especiais (como `@`, `#`, `$`, etc.), você precisa codificá-los:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`

Use este site para codificar: https://www.urlencoder.org/

---

### 2️⃣ **Configurar Variáveis de Ambiente no Render**

1. Acesse [Render Dashboard](https://dashboard.render.com/)
2. Selecione seu serviço **backend**
3. Vá em **Environment** (menu lateral)
4. Adicione/Atualize as seguintes variáveis:

```env
MONGO_URI=mongodb+srv://coordenaplus:SuaSenhaAqui@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
DB_NAME=Coordena+
FRONTEND_URL=https://seu-frontend.netlify.app,https://outro-frontend.com
JWT_SECRET=sua-chave-jwt-super-secreta-de-no-minimo-32-caracteres
ADMIN_EMAIL=admin@admin.estacio.br
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_MATRICULA=ADMIN-0001
```

5. Clique em **Save Changes**
6. O Render irá **automaticamente** redeployar seu serviço

---

### 3️⃣ **Testar Conexão Localmente (ANTES de fazer deploy)**

1. Crie um arquivo `.env` na pasta `backend/`:

```bash
cp .env.example .env
```

2. Edite o `.env` e coloque sua MONGO_URI real

3. Execute o script de teste:

```bash
node test-mongo-connection.js
```

4. **Se aparecer ✅ SUCESSO**, sua configuração está correta!
5. **Se aparecer ❌ ERRO**, revise os passos acima

---

### 4️⃣ **Checklist Final**

- [ ] Usuário criado no MongoDB Atlas (Database Access)
- [ ] Senha copiada e guardada com segurança
- [ ] IP `0.0.0.0/0` adicionado no Network Access
- [ ] Connection string copiada e password substituído corretamente
- [ ] Caracteres especiais da senha foram codificados (se houver)
- [ ] MONGO_URI configurada no Render
- [ ] Teste local passou com sucesso
- [ ] Deploy refeito no Render

---

## 🧪 Comandos Úteis

### Testar conexão local:
```bash
node test-mongo-connection.js
```

### Ver logs do Render em tempo real:
Acesse: https://dashboard.render.com/web/[seu-servico-id]/logs

---

## 🆘 Problemas Comuns

### ❌ "bad auth : authentication failed"
- ✅ Senha incorreta ou não codificada
- ✅ Usuário não existe no Database Access
- ✅ Username ou password com erro de digitação

### ❌ "connection timeout"
- ✅ IP não está na whitelist (Network Access)
- ✅ Cluster está pausado

### ❌ "MONGO_URI não está definida"
- ✅ Variável não foi configurada no Render
- ✅ Nome da variável está errado (deve ser exatamente `MONGO_URI`)

---

## 📞 Precisa de Ajuda?

1. Verifique os logs do Render
2. Execute o teste de conexão local
3. Revise cada passo do checklist acima
4. Certifique-se que a senha não tem caracteres especiais (ou estão codificados)

---

**Criado em**: 30/10/2025
**Versão**: 1.0
