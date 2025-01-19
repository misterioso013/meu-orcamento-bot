import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "@/types/context";
import { listProducts, getProduct } from "@/utils/db/product";
import { convertToStars } from "@/utils/currency";
import { Category, Product } from "@prisma/client";

// Função auxiliar para obter emoji da categoria
function getCategoryEmoji(category: Category): string {
  const emojiMap: Record<Category, string> = {
    SITE: "🌐",
    BOT: "🤖",
    APP: "📱",
    SCRIPT: "📜"
  };
  return emojiMap[category] || "❓";
}

export function setupStoreCommands(bot: Bot<MyContext>) {
  // Handler para mostrar categorias
  bot.callbackQuery("store", async (ctx) => {
    try {
      const keyboard = new InlineKeyboard()
        .text("🌐 Sites", "category:SITE").row()
        .text("🤖 Bots", "category:BOT").row()
        .text("📱 Apps", "category:APP").row()
        .text("📜 Scripts", "category:SCRIPT").row()
        .text("🔙 Voltar", "back_to_menu");

      try {
        await ctx.editMessageText("🛍️ *Nossa Loja*\nEscolha uma categoria:", {
          reply_markup: keyboard,
          parse_mode: "Markdown"
        });
      } catch (error) {
        // Se não conseguir editar a mensagem (ex: mensagem com foto), envia uma nova
        await ctx.reply("🛍️ *Nossa Loja*\nEscolha uma categoria:", {
          reply_markup: keyboard,
          parse_mode: "Markdown"
        });
      }

      await ctx.answerCallbackQuery().catch(() => {});
    } catch (error) {
      console.error("Erro ao mostrar categorias:", error);
      await ctx.reply("Ocorreu um erro. Por favor, tente novamente.");
    }
  });

  // Handler para listar produtos por categoria
  bot.callbackQuery(/^category:(.+)$/, async (ctx) => {
    try {
      const category = ctx.match[1] as Category;
      const products = await listProducts();
      const categoryProducts = products.filter(p => p.category === category);

      if (categoryProducts.length === 0) {
        await ctx.editMessageText(
          `*Nenhum produto disponível na categoria ${getCategoryEmoji(category)}*\n\nVolte mais tarde!`, {
          reply_markup: new InlineKeyboard().text("🔙 Voltar para Categorias", "store"),
          parse_mode: "Markdown"
        });
        await ctx.answerCallbackQuery();
        return;
      }

      const keyboard = new InlineKeyboard();
      for (const product of categoryProducts) {
        const price = parseFloat(product.price);
        const starsPrice = await convertToStars(price);
        keyboard.text(
          `${product.name} - ⭐️ ${starsPrice}`,
          `view_product:${product.id}`
        ).row();
      }
      keyboard.text("🔙 Voltar para Categorias", "store");

      await ctx.editMessageText(
        `*Produtos ${getCategoryEmoji(category)}*\nEscolha um produto para ver mais detalhes:`, {
        reply_markup: keyboard,
        parse_mode: "Markdown"
      });
      await ctx.answerCallbackQuery().catch(() => {});
    } catch (error) {
      console.error("Erro ao listar produtos:", error);
      await ctx.reply("Ocorreu um erro. Por favor, tente novamente.");
    }
  });

  bot.callbackQuery(["store", "back_to_menu"], async (ctx) => {
    try {
      if (ctx.callbackQuery.data === "back_to_menu") {
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
      } else {
        const products = await listProducts();

        if (products.length === 0) {
          await ctx.reply("Nenhum produto disponível no momento.");
          await ctx.answerCallbackQuery();
          return;
        }

        const keyboard = new InlineKeyboard();
        for (const product of products) {
          const price = parseFloat(product.price);
          const starsPrice = await convertToStars(price);
          keyboard.text(
            `${product.name} - ⭐️ ${starsPrice}`,
            `view_product:${product.id}`
          ).row();
        }
        keyboard.text("🔙 Voltar", "back_to_menu");

        try {
          await ctx.editMessageText("🛍️ *Nossa Loja*\nEscolha um produto para ver mais detalhes:", {
            reply_markup: keyboard,
            parse_mode: "Markdown"
          });
        } catch (error) {
          // Se falhar ao editar (ex: mensagem com foto), envia uma nova mensagem
          await ctx.reply("🛍️ *Nossa Loja*\nEscolha um produto para ver mais detalhes:", {
            reply_markup: keyboard,
            parse_mode: "Markdown"
          });
        }
      }

      await ctx.answerCallbackQuery().catch(() => {}); // Ignora erro do answerCallbackQuery
    } catch (error) {
      console.error("Erro no callback:", error);
      await ctx.reply("Ocorreu um erro. Por favor, tente novamente.").catch(() => {});
    }
  });

  bot.callbackQuery(/^view_product:(.+)$/, async (ctx) => {
    try {
      const productId = ctx.match[1];
      const product = await getProduct(productId);

      if (!product) {
        await ctx.answerCallbackQuery("Produto não encontrado!");
        return;
      }

      const price = parseFloat(product.price);
      const starsPrice = await convertToStars(price);
      const keyboard = new InlineKeyboard()
        .text("💫 Comprar por ⭐️ " + starsPrice, `buy_product:${product.id}`).row()
        .text("🔙 Voltar", "store");

      const message = `*${product.name}*\n\n` +
        `💫 Preço: ⭐️ ${starsPrice}\n` +
        `💰 (R$ ${parseFloat(product.price).toFixed(2)})\n\n` +
        `📝 *Descrição:*\n${product.description}\n\n` +
        `📋 *Detalhes:*\n${product.description}\n\n` +
        `🏷️ Categoria: ${product.category || 'N/A'}`;

      if (product.image) {
        try {
          await ctx.editMessageMedia({
            type: "photo",
            media: product.image,
            caption: message,
            parse_mode: "Markdown"
          }, { reply_markup: keyboard });
        } catch (error) {
          await ctx.reply(message, {
            reply_markup: keyboard,
            parse_mode: "Markdown"
          });
        }
      } else {
        try {
          await ctx.editMessageText(message, {
            reply_markup: keyboard,
            parse_mode: "Markdown"
          });
        } catch (error) {
          await ctx.reply(message, {
            reply_markup: keyboard,
            parse_mode: "Markdown"
          });
        }
      }
      await ctx.answerCallbackQuery().catch(() => {});
    } catch (error) {
      console.error("Erro ao mostrar produto:", error);
      await ctx.reply("Ocorreu um erro. Por favor, tente novamente.");
    }
  });

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

  // Placeholder para compra (você pode implementar a lógica de pagamento depois)
  bot.callbackQuery(/^buy_product:(.+)$/, async (ctx) => {
    try {
      const productId = ctx.match[1];
      const product = await getProduct(productId);

      if (!product) {
        await ctx.answerCallbackQuery("Produto não encontrado!");
        return;
      }

      const price = parseFloat(product.price);
      const starsPrice = await convertToStars(price);

      await ctx.api.sendInvoice(
        ctx.from.id,
        product.name || "Untitled", // título do produto
        product.description || "No description", // descrição
        productId, // payload para identificar o produto
        "XTR", // moeda das Stars
        [{
          amount: Math.round(starsPrice * 100), // Telegram espera o valor em centavos
          label: product.name || "Untitled"
        }],
        {
          need_name: true,
          need_email: true
        }
      );

      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error("Erro ao gerar invoice:", error);
      await ctx.reply("Ocorreu um erro ao processar o pagamento. Tente novamente.");
    }
  });

  // Adicione o handler de pre_checkout_query
  bot.on("pre_checkout_query", async (ctx) => {
    try {
      await ctx.answerPreCheckoutQuery(true);
    } catch (error) {
      console.error("Erro no pre_checkout_query:", error);
    }
  });

  // Adicione o handler de pagamento bem sucedido
  bot.on("message:successful_payment", async (ctx) => {
    if (!ctx.message?.successful_payment || !ctx.from) {
      return;
    }

    try {
      const productId = ctx.message.successful_payment.invoice_payload;
      const product = await getProduct(productId);

      await ctx.reply(
        `✅ Pagamento recebido!\n\n` +
        `Produto: *${product?.name}*\n` +
        `ID da transação: \`${ctx.message.successful_payment.telegram_payment_charge_id}\`\n\n` +
        (product?.downloadLink ?
          `🔗 Link para download: ${product.downloadLink}` :
          "Um de nossos administradores entrará em contato em breve!"),
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      await ctx.reply("Ocorreu um erro ao processar seu pagamento. Por favor, contate o suporte.");
    }
  });
}