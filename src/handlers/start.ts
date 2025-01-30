import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "@/types/context";
import { getUser, createUser } from "@/utils/db/user";
import { User } from "@/types/schemas";

export function setupStartCommand(bot: Bot<MyContext>) {
  bot.command("start", async (ctx) => {
    const user = await getUser(ctx.from?.id.toString() as string);
    if (!user) {
      const name = ctx.from?.first_name + " " + ctx.from?.last_name;
      const isAdmin = ctx.from?.id.toString() === process.env.ADMIN_ID;
      const userData: User = {
        id: ctx.from?.id.toString() as string,
        name,
        username: ctx.from?.username || null,
        isAdmin: isAdmin || false,
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

  // Handler para voltar ao menu principal
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
}