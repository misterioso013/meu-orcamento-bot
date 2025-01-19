import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "@/types/context";
import { Budget } from "@prisma/client";
import { listBudgets, getBudget } from "@/utils/db/budget";
import { getBudgetAnalysis, getProductInfo } from "@/utils/ai";
import { getProduct, listProducts } from "@/utils/db/product";
import { getBudgetEmoji, formatDate } from "@/utils/formatters";

export function setupAiHandlers(bot: Bot<MyContext>) {
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
}