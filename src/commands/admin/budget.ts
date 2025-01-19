import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "@/types/context";
import { listBudgets, getBudget, updateBudgetStatus } from "@/utils/db/budget";
import { Budget, BudgetStatus } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

export function setupAdminBudgetCommands(bot: Bot<MyContext>) {
  // Comando para listar todos os orçamentos
  bot.command("orcamentos", async (ctx) => {
    if (!ctx.from?.id || ctx.from.id.toString() !== process.env.ADMIN_ID) {
      return;
    }

    // Buscar todos os orçamentos com dados dos usuários
    const budgets = await prisma.budget.findMany({
      include: {
        user: true
      },
      orderBy: [
        { chatActive: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    if (budgets.length === 0) {
      await ctx.reply("Não há orçamentos cadastrados.");
      return;
    }

    // Agrupar orçamentos por status
    const groupedBudgets = budgets.reduce((acc, budget) => {
      const status = budget.chatActive ? "CHAT_ATIVO" : budget.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(budget);
      return acc;
    }, {} as Record<string, typeof budgets>);

    // Criar mensagem de cabeçalho
    let message = "📋 *Lista de Orçamentos*\n\nEscolha um status para ver os orçamentos:\n\n";

    // Criar teclado com os status
    const keyboard = new InlineKeyboard();

    // Primeiro os chats ativos
    if (groupedBudgets["CHAT_ATIVO"]) {
      message += `💬 *Chats Ativos:* ${groupedBudgets["CHAT_ATIVO"].length} orçamento(s)\n`;
      keyboard.text(`💬 CHATS ATIVOS (${groupedBudgets["CHAT_ATIVO"].length})`, `view_status:CHAT_ATIVO`).row();
    }

    // Depois os outros status
    const statusOrder: BudgetStatus[] = ["PENDING", "ANALYZING", "APPROVED", "REJECTED", "COMPLETED"];
    statusOrder.forEach((status) => {
      if (groupedBudgets[status] && groupedBudgets[status].length > 0) {
        message += `${getBudgetEmoji(status)} *${status}:* ${groupedBudgets[status].length} orçamento(s)\n`;
        keyboard.text(
          `${getBudgetEmoji(status)} ${status} (${groupedBudgets[status].length})`,
          `view_status:${status}`
        ).row();
      }
    });

    // Enviar mensagem com o teclado
    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
  });

  // Handler para visualizar orçamentos por status
  bot.callbackQuery(/^view_status:(.+)$/, async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_ID) {
      await ctx.answerCallbackQuery("Acesso não autorizado");
      return;
    }

    const status = ctx.match[1];
    const isChat = status === "CHAT_ATIVO";

    // Buscar orçamentos do status selecionado
    const budgets = await prisma.budget.findMany({
      where: isChat ? { chatActive: true } : { status: status as BudgetStatus },
      include: {
        user: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (budgets.length === 0) {
      await ctx.answerCallbackQuery("Nenhum orçamento encontrado neste status!");
      return;
    }

    // Criar mensagem
    const statusEmoji = isChat ? "💬" : getBudgetEmoji(status as BudgetStatus);
    let message = `${statusEmoji} *Orçamentos - ${status}*\n\n`;
    message += `Total: ${budgets.length} orçamento(s)\n\n`;
    message += "Selecione um orçamento para gerenciar:";

    // Criar teclado com os orçamentos
    const keyboard = new InlineKeyboard();
    budgets.forEach((budget) => {
      keyboard.text(
        `${budget.category} - ${budget.user.name}`,
        `admin_budget:${budget.id}`
      ).row();
    });
    keyboard.text("🔙 Voltar", "back_to_budgets").row();

    // Enviar mensagem com o teclado
    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard
    });
    await ctx.answerCallbackQuery();
  });

  // Handler para voltar à lista de status
  bot.callbackQuery("back_to_budgets", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.deleteMessage();
    // Recriar o comando /orcamentos
    await bot.api.sendMessage(ctx.from.id, "/orcamentos");
  });

  // Handler para visualizar e gerenciar um orçamento
  bot.callbackQuery(/^admin_budget:(.+)$/, async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_ID) {
      await ctx.answerCallbackQuery("Acesso não autorizado");
      return;
    }

    const budgetId = ctx.match[1];
    const budget = await getBudget(budgetId);

    if (!budget) {
      await ctx.answerCallbackQuery("Orçamento não encontrado!");
      return;
    }

    const message = formatBudgetDetails(budget);
    const keyboard = new InlineKeyboard()
      .text("🔍 Analisando", `status:${budget.id}:ANALYZING`).row()
      .text("✅ Aprovar", `status:${budget.id}:APPROVED`)
      .text("❌ Rejeitar", `status:${budget.id}:REJECTED`).row()
      .text("💰 Enviar Proposta", `send_proposal:${budget.id}`).row()
      .text("🎉 Concluído", `status:${budget.id}:COMPLETED`).row()
      .text("🔙 Voltar", "admin_budgets");

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: "Markdown"
    });
    await ctx.answerCallbackQuery();
  });

  // Handler para iniciar envio de proposta
  bot.callbackQuery(/^send_proposal:(.+)$/, async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_ID) {
      await ctx.answerCallbackQuery("Acesso não autorizado");
      return;
    }

    ctx.session.currentBudgetId = ctx.match[1];
    await ctx.conversation.enter("sendProposal");
    await ctx.answerCallbackQuery();
  });

  // Handler para atualizar status
  bot.callbackQuery(/^status:(.+):(.+)$/, async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_ID) {
      await ctx.answerCallbackQuery("Acesso não autorizado");
      return;
    }

    const [budgetId, status] = [ctx.match[1], ctx.match[2] as BudgetStatus];
    const budget = await updateBudgetStatus(budgetId, status);

    // Notifica o usuário sobre a mudança de status
    let userMessage = "";
    switch (status) {
      case "APPROVED":
        userMessage = "✅ *Orçamento Aprovado!*\n\n" +
          "Seu orçamento foi aprovado pela nossa equipe.\n" +
          "Entraremos em contato em breve para discutir os próximos passos.";
        break;
      case "REJECTED":
        userMessage = "❌ *Orçamento Não Aprovado*\n\n" +
          "Infelizmente seu orçamento não foi aprovado.\n" +
          "Nossa equipe entrará em contato para explicar os motivos e discutir alternativas.";
        break;
      case "COMPLETED":
        userMessage = "🎉 *Projeto Concluído!*\n\n" +
          "Seu projeto foi marcado como concluído.\n" +
          "Agradecemos a confiança em nosso trabalho!";
        break;
    }

    if (userMessage) {
      await ctx.api.sendMessage(budget.userId, userMessage, {
        parse_mode: "Markdown"
      });
    }

    const message = formatBudgetDetails(budget);
    const keyboard = new InlineKeyboard()
      .text("🔙 Voltar aos orçamentos", "admin_budgets");

    await ctx.editMessageText(message, {
      reply_markup: keyboard,
      parse_mode: "Markdown"
    });
    await ctx.answerCallbackQuery(`Status atualizado para ${status}`);
  });

  // Handler para voltar à lista de orçamentos
  bot.callbackQuery("admin_budgets", async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_ID) {
      await ctx.answerCallbackQuery("Acesso não autorizado");
      return;
    }

    const budgets = await listBudgets(process.env.ADMIN_ID);
    if (budgets.length === 0) {
      await ctx.editMessageText("Nenhum orçamento pendente.");
      await ctx.answerCallbackQuery();
      return;
    }

    const keyboard = new InlineKeyboard();
    budgets.forEach((budget) => {
      keyboard.text(
        `${getBudgetEmoji(budget.status)} ${budget.category} - ${formatDate(budget.createdAt)}`,
        `admin_budget:${budget.id}`
      ).row();
    });

    await ctx.editMessageText("*Gerenciar Orçamentos:*", {
      reply_markup: keyboard,
      parse_mode: "Markdown"
    });
    await ctx.answerCallbackQuery();
  });
}