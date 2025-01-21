import { Bot } from "grammy";
import { MyContext } from "@/types/context";

export function setupHelpCommand(bot: Bot<MyContext>) {
  bot.command("help", async (ctx) => {
    const userId = ctx.from?.id?.toString();
    const isAdmin = userId === process.env.ADMIN_ID;

    const userCommands = `🤖 *Comandos Disponíveis*

/start - Inicia o bot e mostra o menu principal
/help - Mostra esta mensagem de ajuda

*Menu Principal:*
🛒 Nossos produtos - Veja nossa lista de produtos disponíveis
💰 Criar orçamento - Solicite um orçamento personalizado
💰 Meus orçamentos - Veja seus orçamentos existentes
💬 Nossa I.A. - Converse com nossa inteligência artificial
💬 Suporte - Entre em contato com nosso suporte

*Como usar:*
1. Use /start para começar
2. Navegue pelo menu usando os botões
3. Para criar um orçamento, clique em "Criar orçamento"
4. Para ver produtos, clique em "Nossos produtos"
5. Para suporte, use o botão de Suporte`;

    const adminCommands = `\n\n👑 *Comandos de Administrador*

/produtos - Gerenciar produtos (adicionar, editar, remover)
/orcamentos - Ver e gerenciar orçamentos
/done - Finalizar uma conversa de suporte
/info - Ver informações detalhadas de um orçamento
/broadcast - Enviar mensagem para todos os usuários

*Funções administrativas:*
• Gerenciamento completo de produtos
• Análise e resposta de orçamentos
• Atendimento ao cliente via chat
• Envio de propostas personalizadas
• Comunicação em massa com usuários`;

    await ctx.reply(
      isAdmin ? userCommands + adminCommands : userCommands,
      {
        parse_mode: "Markdown",
        link_preview_options: { is_disabled: true }
      }
    );
  });
}