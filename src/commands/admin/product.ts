import { Bot, InlineKeyboard } from "grammy";
import { Product } from "@prisma/client";
import { createProduct, deleteProduct, getProduct, updateProduct, listProducts } from "@/utils/db/product";
import { MyContext } from "@/types/context";

export function setupProductCommands(bot: Bot<MyContext>) {
  // Comando para iniciar gerenciamento de produtos
  bot.command("produtos", async (ctx) => {
    const userId = ctx.from?.id?.toString();
    if (!userId || userId !== process.env.ADMIN_ID) {
      return ctx.reply("Você não tem permissão para usar este comando.");
    }

    const keyboard = new InlineKeyboard()
      .text("➕ Adicionar Produto", "add_product")
      .row()
      .text("📝 Editar Produto", "list_products_edit")
      .row()
      .text("❌ Excluir Produto", "list_products_delete");

    await ctx.reply("🏪 Gerenciamento de Produtos", {
      reply_markup: keyboard,
    });
  });

  // Handlers para callbacks
  bot.callbackQuery("add_product", async (ctx) => {
    const userId = ctx.from?.id?.toString();
    if (!userId || userId !== process.env.ADMIN_ID) {
      await ctx.answerCallbackQuery("Você não tem permissão para adicionar produtos.");
      return;
    }

    try {
      await ctx.editMessageText("Iniciando processo de adição de produto...");
      await ctx.conversation.enter("addProduct");
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error("Erro ao iniciar conversação:", error);
      await ctx.reply("Ocorreu um erro ao iniciar o processo. Tente novamente.");
    }
  });

  bot.callbackQuery(/^edit_product:(.+)$/, async (ctx) => {
    const productId = ctx.match[1];
    ctx.session.productId = productId;
    await ctx.conversation.enter("editProduct");
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^delete_product:(.+)$/, async (ctx) => {
    const productId = ctx.match[1];
    const product = await getProduct(productId);

    if (!product) {
      await ctx.answerCallbackQuery("Produto não encontrado!");
      return;
    }

    const keyboard = new InlineKeyboard()
      .text("✅ Sim", `confirm_delete:${productId}`)
      .text("❌ Não", "cancel_delete");

    await ctx.editMessageText(
      `Tem certeza que deseja excluir o produto "${product.name}"?`,
      { reply_markup: keyboard }
    );
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^confirm_delete:(.+)$/, async (ctx) => {
    const productId = ctx.match[1];
    await deleteProduct(productId);
    await ctx.editMessageText("✅ Produto excluído com sucesso!");
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery("cancel_delete", async (ctx) => {
    await ctx.editMessageText("❌ Operação cancelada!");
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(["list_products_edit", "list_products_delete"], async (ctx) => {
    const isEdit = ctx.callbackQuery.data === "list_products_edit";
    const products = await listProducts();

    if (products.length === 0) {
      await ctx.editMessageText("Nenhum produto cadastrado.");
      await ctx.answerCallbackQuery();
      return;
    }

    const keyboard = new InlineKeyboard();
    products.forEach((product) => {
      keyboard.text(
        product.name || "Untitled",
        isEdit ? `edit_product:${product.id}` : `delete_product:${product.id}`
      ).row();
    });

    await ctx.editMessageText(
      isEdit ? "📝 Selecione o produto para editar:" : "❌ Selecione o produto para excluir:",
      { reply_markup: keyboard }
    );
    await ctx.answerCallbackQuery();
  });
}