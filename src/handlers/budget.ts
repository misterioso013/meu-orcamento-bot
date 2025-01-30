import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "@/types/context";
import { Budget } from "@prisma/client";
import { listBudgets, getBudget, updateBudgetProposal } from "@/utils/db/budget";
import { createRequest, listRequestsByBudget } from "@/utils/db/request";
import { getBudgetEmoji, formatDate, formatBudgetDetails } from "@/utils/formatters";
import { isUserAdmin, getAdminUsers } from "@/utils/db/user";

export function setupBudgetHandlers(bot: Bot<MyContext>) {
  bot.callbackQuery("create_budget", async (ctx) => {
    await ctx.conversation.enter("createBudget");
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("view_budgets", async (ctx) => {
    try {
      if (!ctx.from?.id) {
        await ctx.answerCallbackQuery("Erro ao identificar usuário");
        return;
      }

      const budgets = await listBudgets(ctx.from.id.toString());

      if (budgets.length === 0) {
        await ctx.editMessageText(
          "📝 *Meus Orçamentos*\n\nVocê ainda não tem nenhum orçamento.\nClique em 'Criar orçamento' para solicitar um!", {
          reply_markup: new InlineKeyboard()
            .text("💰 Criar orçamento", "create_budget").row()
            .text("🔙 Voltar", "back_to_menu"),
          parse_mode: "Markdown"
        });
        await ctx.answerCallbackQuery();
        return;
      }

      const keyboard = new InlineKeyboard();
      budgets.forEach((budget: Budget) => {
        keyboard.text(
          `${getBudgetEmoji(budget.status)} ${budget.category} - ${formatDate(budget.createdAt)}`,
          `view_budget:${budget.id}`
        ).row();
      });
      keyboard.text("🔙 Voltar", "back_to_menu");

      await ctx.editMessageText(
        "📝 *Meus Orçamentos*\nSelecione um orçamento para ver mais detalhes:", {
        reply_markup: keyboard,
        parse_mode: "Markdown"
      });
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error("Erro ao listar orçamentos:", error);
      await ctx.reply("Ocorreu um erro ao carregar seus orçamentos. Tente novamente.");
    }
  });

  bot.callbackQuery(/^view_budget:(.+)$/, async (ctx) => {
    try {
      const budgetId = ctx.match[1];
      const budget = await getBudget(budgetId);

      if (!budget) {
        await ctx.answerCallbackQuery("Orçamento não encontrado!");
        return;
      }

      const keyboard = new InlineKeyboard();

      // Lista as solicitações pendentes
      const requests = await listRequestsByBudget(budget.id);
      if (requests.length > 0) {
        keyboard.text(`📋 Ver solicitações (${requests.length})`, `view_requests:${budget.id}`).row();
      }

      keyboard
        .text("💬 Iniciar conversa", `start_chat:${budget.id}`).row()
        .text("🔙 Voltar", "view_budgets");

      await ctx.editMessageText(formatBudgetDetails(budget), {
        reply_markup: keyboard,
        parse_mode: "Markdown"
      });
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error("Erro ao visualizar orçamento:", error);
      await ctx.reply("Ocorreu um erro ao carregar o orçamento. Tente novamente.");
    }
  });

  // Handlers para propostas de orçamento
  bot.callbackQuery(/^accept_proposal:(.+):(.+)$/, async (ctx) => {
    const [budgetId, newValue] = [ctx.match[1], ctx.match[2]];

    try {
      const budget = await updateBudgetProposal(budgetId, newValue);

      // Notifica o cliente
      await ctx.editMessageText(
        "✅ *Proposta Aceita!*\n\n" +
        "O orçamento foi atualizado e aprovado.\n" +
        "Entraremos em contato em breve para prosseguir com o projeto.",
        { parse_mode: "Markdown" }
      );

      // Notifica os admins
      const admins = await getAdminUsers();
      const adminMessage = `✅ *Proposta Aceita!*\n\n` +
        `O cliente aceitou a proposta de R$ ${newValue} para o projeto.\n` +
        `Use /orcamentos para ver os detalhes atualizados.`;

      for (const admin of admins) {
        await ctx.api.sendMessage(admin.id, adminMessage, {
          parse_mode: "Markdown"
        });
      }

      await ctx.answerCallbackQuery("Proposta aceita com sucesso!");
    } catch (error) {
      console.error("Erro ao aceitar proposta:", error);
      await ctx.answerCallbackQuery("Erro ao processar sua resposta. Tente novamente.");
    }
  });

  // Handler para rejeitar proposta
  bot.callbackQuery(/^reject_proposal:(.+)$/, async (ctx) => {
    const budgetId = ctx.match[1];

    try {
      const budget = await getBudget(budgetId);
      if (!budget) {
        await ctx.answerCallbackQuery("Orçamento não encontrado!");
        return;
      }

      // Notifica o cliente
      await ctx.editMessageText(
        "❌ *Proposta Rejeitada*\n\n" +
        "Você rejeitou a proposta de orçamento.\n" +
        "Entraremos em contato para discutir alternativas.",
        { parse_mode: "Markdown" }
      );

      // Notifica os admins
      const admins = await getAdminUsers();
      const adminMessage = `❌ *Proposta Rejeitada!*\n\n` +
        `O cliente rejeitou a proposta para o projeto ${budget.category}.\n` +
        `Use /orcamentos para ver os detalhes e fazer uma nova proposta.`;

      for (const admin of admins) {
        await ctx.api.sendMessage(admin.id, adminMessage, {
          parse_mode: "Markdown"
        });
      }

      await ctx.answerCallbackQuery("Proposta rejeitada com sucesso!");
    } catch (error) {
      console.error("Erro ao rejeitar proposta:", error);
      await ctx.answerCallbackQuery("Erro ao processar sua resposta. Tente novamente.");
    }
  });

  // Handler para iniciar solicitação de informações
  bot.callbackQuery(/^request_info:(.+)$/, async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (!userId) {
      await ctx.answerCallbackQuery("Erro ao identificar usuário!");
      return;
    }

    const isAdmin = await isUserAdmin(userId);
    if (!isAdmin) {
      await ctx.answerCallbackQuery("Apenas administradores podem fazer solicitações!");
      return;
    }

    const budgetId = ctx.match[1];
    ctx.session.currentBudgetId = budgetId;
    await ctx.conversation.enter("createRequest");
    await ctx.answerCallbackQuery();
  });

  // Handler para visualizar solicitações
  bot.callbackQuery(/^view_requests:(.+)$/, async (ctx) => {
    try {
      const budgetId = ctx.match[1];
      const requests = await listRequestsByBudget(budgetId);
      const budget = await getBudget(budgetId);

      if (!budget) {
        await ctx.answerCallbackQuery("Orçamento não encontrado!");
        return;
      }

      let message = "📋 *Solicitações do Orçamento*\n\n";
      requests.forEach((req, index) => {
        message += `${index + 1}. *${req.title}*\n`;
        message += `Status: ${req.status === "PENDING" ? "⏳ Pendente" : "✅ Respondida"}\n`;
        message += `${req.content}\n\n`;
      });

      const keyboard = new InlineKeyboard()
        .text("💬 Iniciar conversa", `start_chat:${budgetId}`).row()
        .text("🔙 Voltar ao orçamento", `view_budget:${budgetId}`);

      await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: "Markdown"
      });
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error("Erro ao listar solicitações:", error);
      await ctx.reply("Ocorreu um erro ao carregar as solicitações. Tente novamente.");
    }
  });
}