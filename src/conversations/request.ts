import { Conversation } from "@grammyjs/conversations";
import { MyContext } from "@/types/context";
import { createRequest } from "@/utils/db/request";
import { getBudget } from "@/utils/db/budget";

export async function createRequestConversation(conversation: Conversation<MyContext>, ctx: MyContext) {
  const budgetId = ctx.session.currentBudgetId;
  if (!budgetId) {
    await ctx.reply("Erro: Orçamento não encontrado!");
    return;
  }

  // Busca o orçamento para obter o userId
  const budget = await getBudget(budgetId);
  if (!budget) {
    await ctx.reply("Erro: Orçamento não encontrado!");
    return;
  }

  // Solicita o título da solicitação
  await ctx.reply("📝 Digite o título da solicitação:");
  const { message: titleMsg } = await conversation.wait();
  const title = titleMsg?.text || "";

  // Solicita o conteúdo da solicitação
  await ctx.reply("📄 Digite o conteúdo da solicitação:");
  const { message: contentMsg } = await conversation.wait();
  const content = contentMsg?.text || "";

  try {
    // Cria a solicitação
    const request = await createRequest(budgetId, title, content);

    // Notifica o cliente sobre a nova solicitação
    await ctx.api.sendMessage(
      budget.userId,
      `📋 *Nova Solicitação de Informações*\n\n` +
      `*${title}*\n\n` +
      `${content}\n\n` +
      `Por favor, clique no botão abaixo para responder:`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "💬 Responder", callback_data: `start_chat:${budgetId}` }]
          ]
        }
      }
    );

    await ctx.reply("✅ Solicitação enviada com sucesso!");
  } catch (error) {
    console.error("Erro ao criar solicitação:", error);
    await ctx.reply("❌ Ocorreu um erro ao criar a solicitação. Tente novamente.");
  }
}