import { Bot } from "grammy";
import { MyContext } from "@/types/context";

export function setupBroadcastCommands(bot: Bot<MyContext>) {
  // Comando para iniciar broadcast
  bot.command("broadcast", async (ctx) => {
    const userId = ctx.from?.id?.toString();
    if (!userId || userId !== process.env.ADMIN_ID) {
      return ctx.reply("Você não tem permissão para usar este comando.");
    }

    await ctx.conversation.enter("broadcast");
  });
}