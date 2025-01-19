# Meu Orçamento Bot
É um Bot de Telegram onde o usuário pode fazer orçamentos para sites, bots, aplicativos (Mobile e Desktop), scripts de automação, etc.

E não para por ai, poderá também fazer compras de produtos já desenvolvidos que estão disponíveis na loja por um preço mais barato que o mercado e sem falar do sistema de afiliados do proprio telegram que paga 50% de comissão para o afiliado.

## Tecnologias

- Node.js / Typescript
- Telegram Bot API
- Grammy
- SQLite
- PM2
- PNPM
- Google AI (Gemini)

## Instalação

1. Clone o repositório
2. Instale as dependências
3. Configure o arquivo .env
4. Execute o bot

Ou use o comando abaixo para instalar e rodar o bot:
```bash
git clone https://github.com/misterioso013/meu-orcamento-bot.git
cd meu-orcamento-bot
cp .env.example .env
pnpm install
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

## Configuração
- **BOT_TOKEN:** O token do seu bot do Telegram.
- **GEMINI_API_KEY:** A chave da API do Google AI (Gemini).
- **GEMINI_MODEL:** O modelo do Google AI (Gemini).
- **GEMINI_MAX_TOKENS:** O número máximo de tokens que o Google AI (Gemini) pode gerar.
- **GEMINI_TEMPERATURE:** A temperatura da resposta do Google AI (Gemini).
- **GEMINI_TOP_P:** A top_p da resposta do Google AI (Gemini).
- **GEMINI_TOP_K:** O top_k da resposta do Google AI (Gemini).

## Contribuição
Contribuições são sempre bem-vindas! Por favor, abra uma issue ou um pull request para sugerir mudanças.
