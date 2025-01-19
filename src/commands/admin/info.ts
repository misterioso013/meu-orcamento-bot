import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "@/types/context";
import { db } from "@/utils/db";
import { formatBudgetDetails, formatDate } from "@/utils/formatters";
import { updateBudgetChatStatus } from "@/utils/db/message";
import { Budget, Message } from "@prisma/client";

export function setupInfoCommands(bot: Bot<MyContext>) {
  // Comando para encerrar chat
  bot.command("done", async (ctx) => {
    // Verificar se é admin
    if (!ctx.from?.id || ctx.from.id.toString() !== process.env.ADMIN_ID) {
      return;
    }

    try {
      // Se for uma resposta a uma mensagem
      if (ctx.message?.reply_to_message) {
        const originalMessage = ctx.message.reply_to_message;
        const forwardInfo = originalMessage as any;

        // Tentar obter o ID do usuário de diferentes maneiras
        let userId = forwardInfo.forward_from?.id?.toString();

        if (!userId && forwardInfo.from?.id) {
          userId = forwardInfo.from.id.toString();
        }

        if (!userId) {
          await ctx.reply(
            "❌ *Erro ao identificar o destinatário*\n\n" +
            "Não foi possível identificar o remetente original da mensagem.\n" +
            "Isso pode acontecer se o usuário tiver as configurações de privacidade ativadas.\n" +
            "Neste caso, você precisará criar um novo grupo com o usuário para continuar a conversa.", {
            parse_mode: "Markdown"
          });
          return;
        }

        // Encontrar o orçamento ativo do usuário
        const activeBudget = await db.budget.findFirst({
          where: {
            userId: userId,
            chatActive: true
          }
        });

        if (!activeBudget) {
          await ctx.reply("Este usuário não tem nenhum chat ativo.");
          return;
        }

        // Desativar o chat
        await updateBudgetChatStatus(activeBudget.id, false);

        // Notificar o usuário
        await ctx.api.sendMessage(
          userId,
          "💬 *Chat encerrado*\n\n" +
          "O atendimento foi finalizado. Se precisar de mais ajuda, você pode iniciar uma nova conversa a qualquer momento.", {
          parse_mode: "Markdown"
        });

        // Confirmar para o admin
        await ctx.reply("✅ Chat encerrado com sucesso!");
        return;
      }

      // Se não for resposta, verifica se foi fornecido um ID
      const args = ctx.message?.text.split(" ");
      if (args && args.length >= 2) {
        const budgetId = args[1];
        const budget = await updateBudgetChatStatus(budgetId, false);

        // Notificar o usuário
        await ctx.api.sendMessage(
          budget.userId,
          "💬 *Chat encerrado*\n\n" +
          "O atendimento foi finalizado. Se precisar de mais ajuda, você pode iniciar uma nova conversa a qualquer momento.", {
          parse_mode: "Markdown"
        });

        // Confirmar para o admin
        await ctx.reply("✅ Chat encerrado com sucesso!");
        return;
      }

      // Se não for resposta e não tiver ID, mostra a ajuda
      await ctx.reply(
        "ℹ️ *Como usar o comando /done*\n\n" +
        "1. Responda uma mensagem do cliente com /done\n" +
        "2. Ou use /done <id_do_orçamento>", {
        parse_mode: "Markdown"
      });
    } catch (error) {
      console.error("Erro ao encerrar chat:", error);
      await ctx.reply("Ocorreu um erro ao encerrar o chat. Tente novamente.");
    }
  });

  // Comando para ver informações do chat
  bot.command("info", async (ctx) => {
    // Verificar se é admin
    if (!ctx.from?.id || ctx.from.id.toString() !== process.env.ADMIN_ID) {
      return;
    }

    try {
      // Verificar se é resposta a uma mensagem
      if (!ctx.message?.reply_to_message) {
        await ctx.reply("Este comando deve ser usado respondendo a uma mensagem do cliente.");
        return;
      }

      const originalMessage = ctx.message.reply_to_message;
      const forwardInfo = originalMessage as any;

      // Tentar obter o ID do usuário
      let userId = forwardInfo.forward_from?.id?.toString();

      if (!userId && forwardInfo.from?.id) {
        userId = forwardInfo.from.id.toString();
      }

      if (!userId) {
        await ctx.reply(
          "❌ *Erro ao identificar o usuário*\n\n" +
          "Não foi possível identificar o remetente original da mensagem.", {
          parse_mode: "Markdown"
        });
        return;
      }

      // Encontrar o orçamento ativo do usuário
      const activeBudget = await db.budget.findFirst({
        where: {
          userId: userId,
          chatActive: true
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      if (!activeBudget) {
        await ctx.reply("Este usuário não tem nenhum chat ativo.");
        return;
      }

      // Buscar histórico de mensagens
      const messages = activeBudget.messages || [];
      const totalMessages = messages.length;
      const lastMessage = messages[totalMessages - 1];
      const chatStarted = messages[0]?.createdAt;

      // Formatar a mensagem com as informações
      let infoMessage = `ℹ️ *Informações do Orçamento*\n\n`;
      infoMessage += formatBudgetDetails(activeBudget);
      infoMessage += `\n*Informações do Chat:*\n`;
      infoMessage += `• Chat iniciado em: ${chatStarted ? formatDate(chatStarted) : 'N/A'}\n`;
      infoMessage += `• Total de mensagens: ${totalMessages}\n`;
      if (lastMessage) {
        infoMessage += `• Última mensagem: ${formatDate(lastMessage.createdAt)}\n`;
      }

      // Enviar as informações
      await ctx.reply(infoMessage, {
        parse_mode: "Markdown"
      });
    } catch (error) {
      console.error("Erro ao buscar informações:", error);
      await ctx.reply("Ocorreu um erro ao buscar as informações. Tente novamente.");
    }
  });
}