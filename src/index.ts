import "dotenv/config";
import { Bot, session } from "grammy";
import { getUser, createUser } from "@/utils/db/user";
import { User } from "./types/schemas";
import { setupProductCommands } from "./commands/admin/product";
import { conversations, createConversation } from "@grammyjs/conversations";
import { addProductConversation, editProductConversation } from "./conversations/product";
import { ConversationFlavor } from "@grammyjs/conversations";
import { MyContext, SessionData } from "./types/context";
import { setupStoreCommands } from "./commands/store";
import { createBudgetConversation, sendProposalConversation } from "./conversations/budget";
import { setupAdminBudgetCommands } from "./commands/admin/budget";
import { updateBudgetProposal, listBudgets, getBudget, updateBudgetStatus } from "@/utils/db/budget";
import { InlineKeyboard } from "grammy";
import { BudgetStatus, Budget, Message } from "@prisma/client";
import { getBudgetAnalysis, getProductInfo } from "@/utils/ai";
import { getProduct, listProducts } from "@/utils/db/product";
import { createMessage, getMessagesByBudgetId, updateBudgetChatStatus } from "@/utils/db/message";
import { db } from "@/utils/db";

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

const bot = new Bot<MyContext>(process.env.BOT_TOKEN as string);

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  console.error(err.error);
});

bot.use(session({ initial: (): SessionData => ({}) }));
bot.use(conversations());

bot.use(createConversation(addProductConversation, "addProduct"));
bot.use(createConversation(editProductConversation, "editProduct"));
bot.use(createConversation(createBudgetConversation, "createBudget"));
bot.use(createConversation(sendProposalConversation, "sendProposal"));

bot.command("start", async (ctx) => {
  const user = await getUser(ctx.from?.id.toString() as string);
  if (!user) {
    const name = ctx.from?.first_name + " " + ctx.from?.last_name;
    const isAdmin = ctx.from?.id.toString() === process.env.ADMIN_ID;
    const userData: User = {
      id: ctx.from?.id.toString() as string,
      name,
      username: ctx.from?.username || undefined,
      isAdmin: isAdmin,
      isActive: true,
      inChatAi: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await createUser(userData);
  }

  const text = `Olá *${ctx?.from?.first_name}*!\nNós somos a [AllDevs](https://all.dev.br), um time de desenvolvedores que está aqui para te ajudar a transformar suas ideias em realidade.\n*Escolha uma opção para continuar:*`;

  const buttons = {
    inline_keyboard: [
      [{ text: "🛒 Nossos produtos", callback_data: "store" }],
      [{ text: "💰 Criar orçamento", callback_data: "create_budget" }],
      [{ text: "💰 Meus orçamentos", callback_data: "view_budgets" }],
      [{ text: "💬 Nossa I.A.", callback_data: "chat_ai" }],
      [{ text: "💬 Suporte", url: "https://t.me/misterioso013" }],
    ],
  };

  ctx.reply(text, {
    reply_markup: buttons,
    parse_mode: "Markdown",
    link_preview_options: { is_disabled: true },
  });
});

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

bot.callbackQuery("chat_ai", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("💰 Analisar um orçamento", "ai_analyze_budgets").row()
    .text("🛒 Consultar sobre produtos", "ai_view_products").row()
    .text("🔙 Voltar", "back_to_menu");

  await ctx.editMessageText(
    "*Assistente Virtual AllDevs* 🤖\n\n" +
    "Olá! Eu sou o assistente virtual da AllDevs. Como posso ajudar?\n\n" +
    "Escolha uma das opções abaixo:", {
    reply_markup: keyboard,
    parse_mode: "Markdown"
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery("ai_analyze_budgets", async (ctx) => {
  try {
    if (!ctx.from?.id) {
      await ctx.answerCallbackQuery("Erro ao identificar usuário");
      return;
    }

    const budgets = await listBudgets(ctx.from.id.toString());

    if (budgets.length === 0) {
      await ctx.editMessageText(
        "📝 *Análise de Orçamentos*\n\nVocê ainda não tem nenhum orçamento para analisar.\nClique em 'Criar orçamento' para solicitar um!", {
        reply_markup: new InlineKeyboard()
          .text("💰 Criar orçamento", "create_budget").row()
          .text("🔙 Voltar ao menu da IA", "chat_ai"),
        parse_mode: "Markdown"
      });
      await ctx.answerCallbackQuery();
      return;
    }

    const keyboard = new InlineKeyboard();
    budgets.forEach((budget: Budget) => {
      keyboard.text(
        `${getBudgetEmoji(budget.status)} ${budget.category}`,
        `ai_analyze_budget:${budget.id}`
      ).row();
    });
    keyboard.text("🔙 Voltar ao menu da IA", "chat_ai");

    await ctx.editMessageText(
      "📝 *Análise de Orçamentos*\nSelecione um orçamento para análise:", {
      reply_markup: keyboard,
      parse_mode: "Markdown"
    });
    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Erro ao listar orçamentos para análise:", error);
    await ctx.reply("Ocorreu um erro ao carregar seus orçamentos. Tente novamente.");
  }
});

bot.callbackQuery(/^ai_analyze_budget:(.+)$/, async (ctx) => {
  try {
    const budgetId = ctx.match[1];
    const budget = await getBudget(budgetId);

    if (!budget) {
      await ctx.answerCallbackQuery("Orçamento não encontrado!");
      return;
    }

    await ctx.editMessageText(
      "🤖 *Analisando seu orçamento\\.\\.\\.\\.*\n\n" +
      "Por favor, aguarde enquanto processo as informações\\.", {
      parse_mode: "MarkdownV2"
    });

    const analysis = await getBudgetAnalysis(budget);

    const keyboard = new InlineKeyboard()
      .text("🔙 Voltar aos orçamentos", "ai_analyze_budgets");

    await ctx.editMessageText(analysis, {
      reply_markup: keyboard,
      parse_mode: "MarkdownV2"
    });
  } catch (error) {
    console.error("Erro ao analisar orçamento:", error);
    await ctx.editMessageText(
      "Desculpe, ocorreu um erro ao analisar o orçamento\\. Tente novamente\\.", {
      reply_markup: new InlineKeyboard().text("🔙 Voltar", "ai_analyze_budgets"),
      parse_mode: "MarkdownV2"
    });
  }
});

setupProductCommands(bot);
setupStoreCommands(bot);
setupAdminBudgetCommands(bot);

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

    // Notifica o admin
    await ctx.api.sendMessage(
      process.env.ADMIN_ID as string,
      `✅ *Proposta Aceita!*\n\n` +
      `O cliente aceitou a proposta de R$ ${newValue} para o projeto.\n` +
      `Use /orcamentos para ver os detalhes atualizados.`,
      { parse_mode: "Markdown" }
    );

    await ctx.answerCallbackQuery("Proposta aceita com sucesso!");
  } catch (error) {
    console.error("Erro ao aceitar proposta:", error);
    await ctx.answerCallbackQuery("Erro ao processar sua resposta. Tente novamente.");
  }
});

bot.callbackQuery(/^reject_proposal:(.+)$/, async (ctx) => {
  const budgetId = ctx.match[1];

  try {
    // Atualiza o status para ANALYZING
    await updateBudgetStatus(budgetId, "ANALYZING");

    // Notifica o cliente
    await ctx.editMessageText(
      "❌ *Proposta Recusada*\n\n" +
      "Você recusou a proposta. O orçamento continuará em análise.\n" +
      "Nossa equipe entrará em contato para discutir outras possibilidades.",
      { parse_mode: "Markdown" }
    );

    // Notifica o admin
    await ctx.api.sendMessage(
      process.env.ADMIN_ID as string,
      `❌ *Proposta Recusada*\n\n` +
      `O cliente recusou a proposta para o orçamento.\n` +
      `O status foi alterado para "Em Análise".\n` +
      `Use /orcamentos para fazer uma nova proposta.`,
      { parse_mode: "Markdown" }
    );

    await ctx.answerCallbackQuery("Proposta recusada");
  } catch (error) {
    console.error("Erro ao rejeitar proposta:", error);
    await ctx.answerCallbackQuery("Erro ao processar sua resposta. Tente novamente.");
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

    const message = formatBudgetDetails(budget);
    const keyboard = new InlineKeyboard()
      .text("💬 Iniciar conversa", `start_chat:${budgetId}`).row()
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

    // Notificar o admin
    await ctx.api.sendMessage(
      process.env.ADMIN_ID as string,
      `💬 *Novo chat iniciado!*\n\n` +
      `Cliente: ${ctx.from?.first_name} ${ctx.from?.last_name || ""}\n` +
      `Orçamento: ${budget.category}\n\n` +
      `Para responder, use a função "Responder" do Telegram em qualquer mensagem do cliente.\n` +
      `Para encerrar o chat, use o comando /done ${budgetId}`, {
      parse_mode: "Markdown"
    });

    await ctx.answerCallbackQuery("Chat iniciado com sucesso!");
  } catch (error) {
    console.error("Erro ao iniciar chat:", error);
    await ctx.answerCallbackQuery("Erro ao iniciar o chat. Tente novamente.");
  }
});

// Comando para encerrar o chat
bot.command("done", async (ctx) => {
  try {
    // Verificar se é o admin
    if (!ctx.from?.id || ctx.from.id.toString() !== process.env.ADMIN_ID) return;

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

// Manipular todas as mensagens
bot.on(["message:text", "message:photo", "message:video", "message:document", "message:audio"], async (ctx) => {
  try {
    if (!ctx.from?.id || !ctx.message) return;

    const isAdmin = ctx.from.id.toString() === process.env.ADMIN_ID;
    const isReply = !!ctx.message.reply_to_message;

    console.log("Mensagem recebida:", ctx.message);
    console.log("Contexto:", ctx);
    console.log("Usuário:", ctx.from);
    console.log("É admin:", isAdmin);
    console.log("É resposta:", isReply);

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

      // Verificar se é comando /info
      if ("text" in ctx.message && ctx.message.text === "/info") {
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

        // Buscar histórico de mensagens
        const messages = await getMessagesByBudgetId(activeBudget.id);
        const totalMessages = messages.length;
        const lastMessage = messages[totalMessages - 1];
        const chatStarted = messages[0]?.createdAt;

        // Formatar a mensagem com as informações
        let infoMessage = `ℹ️ *Informações do Orçamento*\n\n`;
        infoMessage += formatBudgetDetails(activeBudget);
        infoMessage += `\n*Informações do Chat:*\n`;
        infoMessage += `• Chat iniciado em: ${formatDate(chatStarted)}\n`;
        infoMessage += `• Total de mensagens: ${totalMessages}\n`;
        if (lastMessage) {
          infoMessage += `• Última mensagem: ${formatDate(lastMessage.createdAt)}\n`;
        }

        // Enviar as informações
        await ctx.reply(infoMessage, {
          parse_mode: "Markdown"
        });
        return;
      }

      // Verificar se é comando /done
      if ("text" in ctx.message && ctx.message.text === "/done") {
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

      // Encontrar o último orçamento do usuário
      const lastBudget = await db.budget.findFirst({
        where: {
          userId: userId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!lastBudget) {
        await ctx.reply("Não foi possível encontrar um orçamento associado a este usuário.");
        return;
      }

      // Salvar a mensagem no banco
      let messageData = {
        content: ctx.message.text || ctx.message.caption || "",
        userId: userId,
        budgetId: lastBudget.id,
        fromAdmin: true,
        fileId: null as string | null,
        fileType: null as string | null
      };

      // Salvar a mensagem
      await createMessage(messageData);

      // Encaminhar a mensagem para o usuário
      await ctx.copyMessage(userId);

      // Confirmar envio
      await ctx.reply("✅ Resposta enviada ao cliente.");
      return;
    }

    // Se for mensagem do usuário (não admin)
    if (!isAdmin) {
      // Verificar se o usuário tem um chat ativo
      const activeBudget = await db.budget.findFirst({
        where: {
          userId: ctx.from.id.toString(),
          chatActive: true
        }
      });

      if (!activeBudget) return;

      let messageData = {
        content: "",
        userId: ctx.from.id.toString(),
        budgetId: activeBudget.id,
        fromAdmin: false,
        fileId: null as string | null,
        fileType: null as string | null
      };

      // Identificar o tipo de mensagem
      if ("text" in ctx.message && ctx.message.text) {
        messageData.content = ctx.message.text;
      } else if ("photo" in ctx.message && ctx.message.photo) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        messageData.fileId = photo.file_id;
        messageData.fileType = "photo";
        messageData.content = ctx.message.caption || "📷 Foto";
      } else if ("video" in ctx.message && ctx.message.video) {
        messageData.fileId = ctx.message.video.file_id;
        messageData.fileType = "video";
        messageData.content = ctx.message.caption || "🎥 Vídeo";
      } else if ("document" in ctx.message && ctx.message.document) {
        messageData.fileId = ctx.message.document.file_id;
        messageData.fileType = "document";
        messageData.content = ctx.message.caption || `📄 Documento: ${ctx.message.document.file_name}`;
      } else if ("audio" in ctx.message && ctx.message.audio) {
        messageData.fileId = ctx.message.audio.file_id;
        messageData.fileType = "audio";
        messageData.content = ctx.message.caption || "🎵 Áudio";
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
    }
  } catch (error) {
    console.error("Erro ao processar mensagem:", error);
    await ctx.reply("Ocorreu um erro ao processar sua mensagem. Tente novamente.");
  }
});

bot.callbackQuery("ai_view_products", async (ctx) => {
  try {
    const products = await listProducts();

    if (products.length === 0) {
      await ctx.editMessageText(
        "🛒 *Consulta de Produtos*\n\nAinda não há produtos cadastrados.", {
        reply_markup: new InlineKeyboard()
          .text("🔙 Voltar ao menu da IA", "chat_ai"),
        parse_mode: "Markdown"
      });
      await ctx.answerCallbackQuery();
      return;
    }

    const keyboard = new InlineKeyboard();
    products.forEach((product) => {
      keyboard.text(
        `🛍️ ${product.name}`,
        `ai_view_product:${product.id}`
      ).row();
    });
    keyboard.text("🔙 Voltar ao menu da IA", "chat_ai");

    await ctx.editMessageText(
      "🛒 *Consulta de Produtos*\nSelecione um produto para saber mais:", {
      reply_markup: keyboard,
      parse_mode: "Markdown"
    });
    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Erro ao listar produtos para consulta:", error);
    await ctx.reply("Ocorreu um erro ao carregar os produtos. Tente novamente.");
  }
});

bot.callbackQuery(/^ai_view_product:(.+)$/, async (ctx) => {
  try {
    const productId = ctx.match[1];
    const product = await getProduct(productId);

    if (!product) {
      await ctx.answerCallbackQuery("Produto não encontrado!");
      return;
    }

    await ctx.editMessageText(
      "🤖 *Analisando o produto\\.\\.\\.\\.*\n\n" +
      "Por favor, aguarde enquanto processo as informações\\.", {
      parse_mode: "MarkdownV2"
    });

    const analysis = await getProductInfo(product);

    const keyboard = new InlineKeyboard()
      .text("🔙 Voltar aos produtos", "ai_view_products");

    await ctx.editMessageText(analysis, {
      reply_markup: keyboard,
      parse_mode: "MarkdownV2"
    });
  } catch (error) {
    console.error("Erro ao analisar produto:", error);
    await ctx.editMessageText(
      "Desculpe, ocorreu um erro ao analisar o produto\\. Tente novamente\\.", {
      reply_markup: new InlineKeyboard().text("🔙 Voltar", "ai_view_products"),
      parse_mode: "MarkdownV2"
    });
  }
});

// Adicionar o handler para voltar ao menu principal
bot.callbackQuery("back_to_menu", async (ctx) => {
  const text = `Olá *${ctx?.from?.first_name}*!\nNós somos a [AllDevs](https://all.dev.br), um time de desenvolvedores que está aqui para te ajudar a transformar suas ideias em realidade.\n*Escolha uma opção para continuar:*`;

  const buttons = {
    inline_keyboard: [
      [{ text: "🛒 Nossos produtos", callback_data: "store" }],
      [{ text: "💰 Criar orçamento", callback_data: "create_budget" }],
      [{ text: "💰 Meus orçamentos", callback_data: "view_budgets" }],
      [{ text: "💬 Nossa I.A.", callback_data: "chat_ai" }],
      [{ text: "💬 Suporte", url: "https://t.me/misterioso013" }],
    ],
  };

  await ctx.editMessageText(text, {
    reply_markup: buttons,
    parse_mode: "Markdown",
    link_preview_options: { is_disabled: true },
  });
  await ctx.answerCallbackQuery();
});

// Handler para o cliente encerrar o chat
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

bot.start();
