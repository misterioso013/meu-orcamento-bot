# Meu Orçamento Bot
É um Bot de Telegram onde o usuário pode fazer orçamentos para sites, bots, aplicativos (Mobile e Desktop), scripts de automação, etc.

E não para por ai, poderá também fazer compras de produtos já desenvolvidos que estão disponíveis na loja por um preço mais barato que o mercado e sem falar do sistema de afiliados do proprio telegram que paga 50% de comissão para o afiliado.

## Tecnologias

- Node.js / Typescript
- Telegram Bot API
- Grammy
- SQLite
- Prisma ORM
- PM2
- PNPM
- Google AI (Gemini)

## Instalação

### Deploy Automático
Cole e execute o comando abaixo no seu terminal:
```bash
curl -o- https://raw.githubusercontent.com/misterioso013/meu-orcamento-bot/main/deploy.sh | bash
```

O script irá:
1. Instalar todas as dependências necessárias (NVM, Node.js, PNPM, PM2)
2. Clonar o repositório
3. Configurar o ambiente
4. Configurar o banco de dados SQLite com Prisma
5. Compilar e iniciar o bot

> **⚠️ IMPORTANTE:** Após a primeira execução, configure o arquivo `.env` com suas credenciais!

### Instalação Manual

1. Clone o repositório
2. Instale as dependências
3. Configure o arquivo .env
4. Configure o banco de dados
5. Execute o bot

```bash
git clone https://github.com/misterioso013/meu-orcamento-bot.git
cd meu-orcamento-bot
cp .env.example .env
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy
pnpm run dev
```

### Produção
Para rodar o bot em produção você deve instalar o PM2 e rodar o comando abaixo:
```bash
corepack enable # Se não estiver instalado
pnpm install -g pm2
pm2 start dist/index.js --name meu-orcamento-bot
```
> **OBS:** O PM2 é um gerenciador de processos para Node.js, ele é responsável por iniciar, parar, reiniciar e monitorar os processos do seu bot.

### Comandos Úteis
```bash
pm2 monit               # Monitora o bot em tempo real
pm2 logs meu-orcamento-bot  # Visualiza os logs do bot
pm2 stop meu-orcamento-bot  # Para o bot
pm2 restart meu-orcamento-bot # Reinicia o bot

# Comandos do Prisma
pnpm prisma studio     # Interface web para gerenciar o banco de dados
pnpm prisma db push    # Atualiza o banco com alterações do schema
pnpm prisma migrate deploy # Aplica as migrações pendentes
```

> **⚠️ IMPORTANTE:** Sempre que você atualizar o arquivo `.env`, é necessário reiniciar o PM2 para que as novas variáveis de ambiente sejam carregadas. Use o comando:
```bash
pm2 restart meu-orcamento-bot
```

## Configuração
- **BOT_TOKEN:** O token do seu bot do Telegram.
- **GEMINI_API_KEY:** A chave da API do Google AI (Gemini).
- **GEMINI_MODEL:** O modelo do Google AI (Gemini).
- **GEMINI_MAX_TOKENS:** O número máximo de tokens que o Google AI (Gemini) pode gerar.
- **GEMINI_TEMPERATURE:** A temperatura da resposta do Google AI (Gemini).
- **GEMINI_TOP_P:** A top_p da resposta do Google AI (Gemini).
- **GEMINI_TOP_K:** O top_k da resposta do Google AI (Gemini).
- **DATABASE_URL:** URL de conexão com o banco SQLite (padrão: "file:./dev.db")

## Contribuição
Contribuições são sempre bem-vindas! Por favor, abra uma issue ou um pull request para sugerir mudanças.
