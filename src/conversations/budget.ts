import { Conversation } from "@grammyjs/conversations";
import { MyContext } from "@/types/context";
import { Category, Budget, BudgetStatus } from "@prisma/client";
import { createBudget, getBudget, listBudgets } from "@/utils/db/budget";
import { InlineKeyboard } from "grammy";
import { Bot } from "grammy";
import { db as prisma } from "@/utils/db";

type MyConversation = Conversation<MyContext>;

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

interface BudgetData {
  category: Category;
  objective: string;
  targetAudience: string;
  features: string;
  deadline: string;
  budget: string;
  design: string;
  maintenance: boolean;
  technologies: string;
  hosting: boolean;
  integrations: string;
  specificAnswers: Record<string, string>;
}

export async function createBudgetConversation(conversation: MyConversation, ctx: MyContext) {
  const budgetData: BudgetData = {
    category: "SITE",
    objective: "",
    targetAudience: "",
    features: "",
    deadline: "",
    budget: "",
    design: "",
    maintenance: false,
    technologies: "",
    hosting: false,
    integrations: "",
    specificAnswers: {}
  };

  // Escolha da categoria
  await ctx.reply("🏷️ Qual tipo de projeto você precisa?", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🌐 Site", callback_data: "SITE" }],
        [{ text: "🤖 Bot", callback_data: "BOT" }],
        [{ text: "📱 App", callback_data: "APP" }],
        [{ text: "📜 Script", callback_data: "SCRIPT" }]
      ]
    }
  });

  const result = await conversation.waitFor("callback_query");
  budgetData.category = result.update.callback_query.data as Category;
  await ctx.answerCallbackQuery();

  // Perguntas gerais
  await ctx.reply("🎯 Qual é o objetivo principal do seu projeto?");
  const { message: objMsg } = await conversation.wait();
  budgetData.objective = objMsg?.text || "";

  await ctx.reply("👥 Quem é o público-alvo do projeto?");
  const { message: audMsg } = await conversation.wait();
  budgetData.targetAudience = audMsg?.text || "";

  // Perguntas gerais adicionais
  await ctx.reply("⚡ Quais são as funcionalidades essenciais do projeto?");
  const { message: featMsg } = await conversation.wait();
  budgetData.features = featMsg?.text || "";

  await ctx.reply("⏰ Qual é o prazo ideal para entrega?");
  const { message: deadlineMsg } = await conversation.wait();
  budgetData.deadline = deadlineMsg?.text || "";

  await ctx.reply("💰 Qual é o orçamento disponível para o projeto?");
  const { message: budgetMsg } = await conversation.wait();
  budgetData.budget = budgetMsg?.text || "";

  await ctx.reply("🎨 Você tem referências de design ou identidade visual?");
  const { message: designMsg } = await conversation.wait();
  budgetData.design = designMsg?.text || "";

  await ctx.reply("🔧 Você precisará de manutenção após o lançamento?", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Sim", callback_data: "maintenance_yes" },
          { text: "❌ Não", callback_data: "maintenance_no" }
        ]
      ]
    }
  });

  try {
    const maintResult = await conversation.waitFor("callback_query");
    budgetData.maintenance = maintResult.update.callback_query.data === "maintenance_yes";
    await maintResult.answerCallbackQuery().catch(() => {}); // Ignora erro se o callback expirar
  } catch (error) {
    console.error("Erro ao processar resposta de manutenção:", error);
    budgetData.maintenance = false; // Valor padrão em caso de erro
  }

  // ... continua com as perguntas específicas baseadas na categoria
  await askSpecificQuestions(ctx, conversation, budgetData);

  // Salvar orçamento e enviar confirmação
  try {
    await saveBudget(budgetData, ctx);
    await ctx.reply(
      "✅ Orçamento enviado com sucesso!\n\n" +
      "Nossa equipe analisará sua solicitação e entrará em contato em breve.\n" +
      "Enquanto isso, que tal dar uma olhada em nossos produtos prontos? Use /produtos para ver."
    );
  } catch (error) {
    await ctx.reply("❌ Ocorreu um erro ao salvar seu orçamento. Por favor, tente novamente mais tarde.");
  }
}

async function askSpecificQuestions(
  ctx: MyContext,
  conversation: MyConversation,
  data: BudgetData
) {
  const questions = getQuestionsByCategory(data.category);

  for (const [key, question] of Object.entries(questions)) {
    await ctx.reply(question);
    const { message } = await conversation.wait();
    data.specificAnswers[key] = message?.text || "";
  }
}

function getQuestionsByCategory(category: Category): Record<string, string> {
  switch (category) {
    case "SITE":
      return {
        type: "🌐 Que tipo de site você precisa? (institucional, e-commerce, blog, etc)",
        pages: "📑 Quantas páginas aproximadamente o site terá?",
        responsive: "📱 O site precisa ser responsivo (adaptado para mobile)?",
        forms: "📝 Precisará de formulários? Quais?",
        seo: "🔍 Deseja otimização para SEO?",
        cms: "⚙️ Precisará de um sistema para gerenciar conteúdo?"
      };

    case "BOT":
      return {
        platform: "📱 Em qual plataforma o bot será implementado? (Telegram, WhatsApp, Discord, etc)",
        purpose: "🎯 Qual será a finalidade principal do bot? (atendimento, automação, etc)",
        flow: "🔄 Você já tem um fluxo de conversa definido?",
        integrations: "🔌 O bot precisará se integrar com outros sistemas?",
        scalability: "📈 Quantos usuários você espera que o bot atenda simultaneamente?"
      };

    case "APP":
      return {
        platform: "📱 O app será para Android, iOS ou ambos?",
        offline: "🔌 O app precisará funcionar offline?",
        features: "📲 Quais recursos do dispositivo serão necessários? (GPS, câmera, etc)",
        store: "🏪 Você quer publicar o app nas lojas oficiais?",
        auth: "🔐 Qual método de autenticação você prefere? (email, redes sociais, etc)"
      };

    case "SCRIPT":
      return {
        purpose: "🎯 Qual problema o script resolverá?",
        execution: "⚙️ Como o script será executado? (manual, automatizado, agendado)",
        io: "📥 Quais serão os dados de entrada e saída?",
        environment: "💻 Em qual ambiente o script será executado?",
        performance: "📊 Qual o volume de dados esperado?"
      };
  }
}

async function saveBudget(data: BudgetData, ctx: MyContext) {
  if (!ctx.from?.id) {
    throw new Error("User ID not found");
  }

  try {
    const budget = await createBudget(ctx.from.id.toString(), data);

    // Envia notificação para o admin
    const adminMessage = `🔔 *Novo Orçamento Recebido!*\n\n` +
      `*Categoria:* ${data.category}\n` +
      `*Cliente:* ${ctx.from.first_name} ${ctx.from.last_name || ''}\n` +
      `*Username:* @${ctx.from.username || 'Não informado'}\n\n` +
      `*Objetivo:* ${data.objective}\n` +
      `*Prazo:* ${data.deadline}\n` +
      `*Orçamento:* ${data.budget}\n\n` +
      `Use /orcamentos para gerenciar.`;

    await ctx.api.sendMessage(process.env.ADMIN_ID as string, adminMessage, {
      parse_mode: "Markdown"
    });

    return budget;
  } catch (error) {
    console.error("Error saving budget:", error);
    throw new Error("Failed to save budget");
  }
}

export async function sendProposalConversation(conversation: MyConversation, ctx: MyContext) {
  const budgetId = ctx.session.currentBudgetId;
  if (!budgetId) {
    await ctx.reply("Erro: Orçamento não encontrado!");
    return;
  }

  const budget = await getBudget(budgetId);
  if (!budget) {
    await ctx.reply("Erro: Orçamento não encontrado!");
    return;
  }

  // Solicita o novo valor
  await ctx.reply("💰 Digite o valor proposto para o projeto:");
  const { message: valueMsg } = await conversation.wait();
  const proposedValue = valueMsg?.text || "";

  // Solicita a descrição/justificativa
  await ctx.reply("📝 Digite uma descrição ou justificativa para a proposta:");
  const { message: descMsg } = await conversation.wait();
  const description = descMsg?.text || "";

  // Envia a proposta para o cliente
  const proposalMessage = `💼 *Nova Proposta de Orçamento*\n\n` +
    `*Projeto:* ${budget.category}\n` +
    `*Valor Proposto:* R$ ${proposedValue}\n\n` +
    `*Descrição:*\n${description}\n\n` +
    `Você aceita esta proposta?`;

  const keyboard = new InlineKeyboard()
    .text("✅ Aceitar", `accept_proposal:${budgetId}:${proposedValue}`)
    .text("❌ Recusar", `reject_proposal:${budgetId}`);

  await ctx.api.sendMessage(budget.userId, proposalMessage, {
    reply_markup: keyboard,
    parse_mode: "Markdown"
  });

  await ctx.reply("✅ Proposta enviada com sucesso! Aguardando resposta do cliente.");
}