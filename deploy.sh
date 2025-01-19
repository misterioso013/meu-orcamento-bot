#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Iniciando deploy do Meu Orçamento Bot...${NC}\n"

# Verifica se o nvm está instalado
if ! command -v nvm &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando NVM...${NC}"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# Instala a versão LTS do Node.js
echo -e "${YELLOW}📦 Instalando Node.js LTS...${NC}"
nvm install --lts
nvm use --lts

# Habilita o corepack (para usar pnpm)
echo -e "${YELLOW}📦 Habilitando corepack...${NC}"
corepack enable

# Verifica se o PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando PM2...${NC}"
    pnpm install -g pm2
fi

# Verifica se o diretório do projeto existe
if [ ! -d "meu-orcamento-bot" ]; then
    echo -e "${YELLOW}📦 Clonando repositório...${NC}"
    git clone https://github.com/misterioso013/meu-orcamento-bot.git
    cd meu-orcamento-bot
else
    echo -e "${YELLOW}📦 Atualizando repositório...${NC}"
    cd meu-orcamento-bot
    git pull
fi

# Copia o arquivo .env se não existir
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📦 Configurando arquivo .env...${NC}"
    cp .env.example .env
    echo -e "${RED}⚠️ IMPORTANTE: Configure o arquivo .env com suas credenciais!${NC}"
    exit 1
fi

# Instala as dependências
echo -e "${YELLOW}📦 Instalando dependências...${NC}"
pnpm install

# Configura o Prisma e o banco SQLite
echo -e "${YELLOW}📦 Configurando banco de dados...${NC}"
if [ ! -f "prisma/dev.db" ]; then
    echo -e "${YELLOW}🔄 Gerando cliente Prisma...${NC}"
    pnpm prisma generate

    echo -e "${YELLOW}🔄 Criando banco de dados...${NC}"
    pnpm prisma migrate deploy

    echo -e "${GREEN}✅ Banco de dados configurado com sucesso!${NC}"
else
    echo -e "${YELLOW}🔄 Atualizando banco de dados...${NC}"
    pnpm prisma generate
    pnpm prisma migrate deploy
fi

# Compila o projeto
echo -e "${YELLOW}📦 Compilando o projeto...${NC}"
pnpm run build

# Verifica se o bot já está rodando no PM2
if pm2 show meu-orcamento-bot > /dev/null 2>&1; then
    echo -e "${YELLOW}🔄 Reiniciando o bot...${NC}"
    pm2 restart meu-orcamento-bot
else
    echo -e "${YELLOW}🚀 Iniciando o bot...${NC}"
    pm2 start dist/index.js --name meu-orcamento-bot
fi

# Salva a configuração do PM2
pm2 save

echo -e "\n${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo -e "${YELLOW}📊 Use 'pm2 monit' para monitorar o bot${NC}"
echo -e "${YELLOW}📝 Use 'pm2 logs meu-orcamento-bot' para ver os logs${NC}"
echo -e "${YELLOW}🛑 Use 'pm2 stop meu-orcamento-bot' para parar o bot${NC}"