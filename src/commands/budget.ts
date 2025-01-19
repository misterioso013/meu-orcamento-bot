import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "@/types/context";
import { listBudgets, getBudget } from "@/utils/db/budget";
import { Budget, BudgetStatus } from "@prisma/client";

export function setupBudgetCommands(bot: Bot<MyContext>) {
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
      budgets.forEach((budget) => {
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

  // Handler para visualizar um orçamento específico
  bot.callbackQuery(/^view_budget:(.+)$/, async (ctx) => {
    try {
      const budgetId = ctx.match[1];
      const budget = await getBudget(budgetId);

      if (!budget) {
        await ctx.answerCallbackQuery("Orçamento não encontrado!");
        return;
      }

      const message = formatBudgetDetails(budget);
      const keyboard = new InlineKeyboard()
        .text("🔙 Voltar aos orçamentos", "view_budgets");

      await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: "Markdown"
      });
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error("Erro ao visualizar orçamento:", error);
      await ctx.reply("Ocorreu um erro ao carregar o orçamento. Tente novamente.");
    }
  });
}

// Funções auxiliares
function getBudgetEmoji(status: BudgetStatus): string {
  const statusMap: Record<BudgetStatus, string> = {
    PENDING: "⏳",
    ANALYZING: "🔍",
    APPROVED: "✅",
    REJECTED: "❌",
    COMPLETED: "🎉"
  };
  return statusMap[status];
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

function formatBudgetDetails(budget: Budget): string {
  let message = `*Orçamento - ${budget.category}*\n\n`;
  message += `*Status:* ${getBudgetEmoji(budget.status)} ${budget.status}\n`;
  message += `*Data:* ${formatDate(budget.createdAt)}\n\n`;

  message += `*Objetivo:* ${budget.objective}\n`;
  message += `*Público-alvo:* ${budget.targetAudience}\n`;
  message += `*Funcionalidades:* ${budget.features}\n`;
  message += `*Prazo:* ${budget.deadline}\n`;
  message += `*Orçamento:* ${budget.budget}\n`;
  message += `*Design:* ${budget.design}\n`;
  message += `*Manutenção:* ${budget.maintenance ? "Sim" : "Não"}\n`;

  if (budget.technologies) {
    message += `*Tecnologias:* ${budget.technologies}\n`;
  }

  if (budget.hosting) {
    message += `*Hospedagem:* Sim\n`;
  }

  if (budget.integrations) {
    message += `*Integrações:* ${budget.integrations}\n`;
  }

  const answers = budget.specificAnswers as Record<string, string>;
  if (Object.keys(answers).length > 0) {
    message += "\n*Detalhes Específicos:*\n";
    Object.entries(answers).forEach(([key, value]) => {
      message += `*${key}:* ${value}\n`;
    });
  }

  return message;
}