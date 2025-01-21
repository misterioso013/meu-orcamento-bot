import { Bot, session } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import { MyContext, SessionData } from "@/types/context";
import { addProductConversation, editProductConversation } from "@/conversations/product";
import { createBudgetConversation, sendProposalConversation } from "@/conversations/budget";
import { broadcastConversation } from "@/conversations/broadcast";

export function createBot(): Bot<MyContext> {
  const bot = new Bot<MyContext>(process.env.BOT_TOKEN as string);

  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    console.error(err.error);
  });

  // Configuração de sessão e conversas
  bot.use(session({ initial: (): SessionData => ({}) }));
  bot.use(conversations());

  // Registro das conversas
  bot.use(createConversation(addProductConversation, "addProduct"));
  bot.use(createConversation(editProductConversation, "editProduct"));
  bot.use(createConversation(createBudgetConversation, "createBudget"));
  bot.use(createConversation(sendProposalConversation, "sendProposal"));
  bot.use(createConversation(broadcastConversation, "broadcast"));

  return bot;
}