import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "@/types/context";
import { getBudget } from "@/utils/db/budget";
import { createMessage } from "@/utils/db/message";
import { updateBudgetChatStatus } from "@/utils/db/message";
import { db } from "@/utils/db";

export function setupChatHandlers(bot: Bot<MyContext>) {
  // Iniciar chat
  bot.callbackQuery(/^start_chat:(.+)$/, async (ctx) => {
    try {
      if (!ctx.from?.id) {
        await ctx.answerCallbackQuery("Erro ao identificar usuário!");
        return;
      }

      // Verificar se o usuário já tem algum chat ativo
      const activeChat = await db.budget.findFirst({
        where: {
          userId: ctx.from.id.toString(),
          chatActive: true
        }
      });

      if (activeChat) {
        await ctx.answerCallbackQuery({
          text: "Você já tem uma conversa ativa! Por favor, encerre a conversa atual antes de iniciar uma nova.",
          show_alert: true
        });
        return;
      }

      const budgetId = ctx.match[1];
      const budget = await getBudget(budgetId);

      if (!budget) {
        await ctx.answerCallbackQuery("Orçamento não encontrado!");
        return;
      }

      // Ativar o chat para este orçamento
      await updateBudgetChatStatus(budgetId, true);

      // Enviar mensagem para o usuário
      await ctx.editMessageText(
        "💬 *Chat iniciado!*\n\n" +
        "Você pode enviar mensagens, fotos, vídeos e documentos.\n" +
        "Todas as mensagens serão encaminhadas para nossa equipe.\n" +
        "Aguarde enquanto respondemos sua mensagem.", {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("🔙 Voltar ao orçamento", `view_budget:${budgetId}`)
      });

      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error("Erro ao iniciar chat:", error);
      await ctx.answerCallbackQuery("Erro ao iniciar o chat. Tente novamente.");
    }
  });

  // Encerrar chat
  bot.callbackQuery(/^end_chat:(.+)$/, async (ctx) => {
    try {
      const budgetId = ctx.match[1];
      const budget = await getBudget(budgetId);

      if (!budget) {
        await ctx.answerCallbackQuery("Orçamento não encontrado!");
        return;
      }

      // Verificar se o usuário é o dono do orçamento
      if (budget.userId !== ctx.from?.id.toString()) {
        await ctx.answerCallbackQuery("Você não tem permissão para encerrar este chat!");
        return;
      }

      // Desativar o chat
      await updateBudgetChatStatus(budgetId, false);

      // Notificar o usuário
      await ctx.editMessageText(
        "💬 *Chat encerrado*\n\n" +
        "Você encerrou a conversa. Se precisar de mais ajuda, você pode iniciar uma nova conversa a qualquer momento.", {
        parse_mode: "Markdown"
      });

      // Notificar o admin
      await ctx.api.sendMessage(
        process.env.ADMIN_ID as string,
        `💬 *Chat encerrado pelo cliente*\n\n` +
        `Cliente: ${ctx.from?.first_name} ${ctx.from?.last_name || ""}\n` +
        `Orçamento: ${budget.category}`, {
        parse_mode: "Markdown"
      });

      await ctx.answerCallbackQuery("Chat encerrado com sucesso!");
    } catch (error) {
      console.error("Erro ao encerrar chat:", error);
      await ctx.answerCallbackQuery("Erro ao encerrar o chat. Tente novamente.");
    }
  });

  // Manipular todas as mensagens
  bot.on(["message:text", "message:photo", "message:video", "message:document", "message:audio"], async (ctx) => {
    try {
      if (!ctx.from?.id || !ctx.message) return;

      // Ignorar comandos administrativos logo no início
      if ("text" in ctx.message && ctx.message.text?.startsWith("/")) {
        const command = ctx.message.text.split(" ")[0];
        const adminCommands = ["/produtos", "/orcamentos", "/done", "/info"];
        if (adminCommands.includes(command)) {
          return;
        }
      }

      const isAdmin = ctx.from.id.toString() === process.env.ADMIN_ID;
      const isReply = !!ctx.message.reply_to_message;

      // Se for admin respondendo uma mensagem
      if (isAdmin && isReply) {
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

        // Encaminhar a resposta para o usuário
        await ctx.api.copyMessage(userId, ctx.chat.id, ctx.message.message_id);
        await ctx.reply("✅ Mensagem enviada ao cliente!");
        return;
      }

      // Se não for admin, procurar por chat ativo
      const activeBudget = await db.budget.findFirst({
        where: {
          userId: ctx.from.id.toString(),
          chatActive: true
        }
      });

      if (!activeBudget) {
        await ctx.reply(
          "❌ *Nenhuma conversa ativa*\n\n" +
          "Você não tem nenhuma conversa ativa no momento.\n" +
          "Para iniciar uma conversa, acesse um de seus orçamentos.", {
          parse_mode: "Markdown"
        });
        return;
      }

      // Preparar dados da mensagem
      const messageData = {
        id: Math.random().toString(36).substring(7),
        content: ctx.message.text || "",
        fileId: null as string | null,
        fileType: null as string | null,
        fromAdmin: false,
        userId: ctx.from.id.toString(),
        budgetId: activeBudget.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Verificar tipo de mensagem e salvar anexo se houver
      if (ctx.message.photo) {
        messageData.fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        messageData.fileType = "photo";
      } else if (ctx.message.video) {
        messageData.fileId = ctx.message.video.file_id;
        messageData.fileType = "video";
      } else if (ctx.message.document) {
        messageData.fileId = ctx.message.document.file_id;
        messageData.fileType = "document";
      } else if (ctx.message.audio) {
        messageData.fileId = ctx.message.audio.file_id;
        messageData.fileType = "audio";
      }

      // Salvar a mensagem
      await createMessage(messageData);

      // Encaminhar para o admin com informações do remetente original
      await ctx.forwardMessage(process.env.ADMIN_ID as string);

      // Confirmar recebimento para o usuário com botão para encerrar chat
      const keyboard = new InlineKeyboard()
        .text("❌ Encerrar conversa", `end_chat:${activeBudget.id}`);

      await ctx.reply("✅ Mensagem enviada! Aguarde a resposta da nossa equipe.", {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error("Erro ao processar mensagem:", error);
      await ctx.reply("Ocorreu um erro ao processar sua mensagem. Tente novamente.");
    }
  });
}