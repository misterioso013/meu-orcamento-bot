import { Conversation } from "@grammyjs/conversations";
import { MyContext } from "@/types/context";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type MyConversation = Conversation<MyContext>;

export async function broadcastConversation(conversation: MyConversation, ctx: MyContext) {
  // Verificar se é admin
  if (!ctx.from?.id || ctx.from.id.toString() !== process.env.ADMIN_ID) {
    await ctx.reply("Você não tem permissão para usar este comando.");
    return;
  }

  // Verificar se temos o chat_id
  if (!ctx.chat?.id) {
    await ctx.reply("Erro: Não foi possível identificar o chat.");
    return;
  }

  const chatId = ctx.chat.id;

  // Iniciar composição da mensagem
  await ctx.reply(
    "📢 *Compose sua mensagem de broadcast*\n\n" +
    "• Envie suas mensagens, mídias ou links normalmente\n" +
    "• Cada item será encaminhado exatamente como enviado\n" +
    "• Use /send para enviar o broadcast\n" +
    "• Use /cancel para cancelar", {
    parse_mode: "Markdown"
  });

  let messages: { messageId: number }[] = [];

  // Loop para coletar as mensagens
  while (true) {
    const { message } = await conversation.wait();
    if (!message) continue;

    // Verificar comandos especiais
    if (message.text === "/cancel") {
      await ctx.reply("❌ Broadcast cancelado!");
      return;
    }

    if (message.text === "/send") {
      if (messages.length === 0) {
        await ctx.reply("❌ Nenhuma mensagem para enviar. Broadcast cancelado!");
        return;
      }
      break;
    }

    // Salvar o ID da mensagem
    messages.push({ messageId: message.message_id });
    await ctx.reply(
      "✅ Item adicionado ao broadcast!\n\n" +
      `Total de itens: ${messages.length}\n\n` +
      "Continue enviando mensagens, use /send para enviar ou /cancel para cancelar."
    );
  }

  try {
    // Buscar todos os usuários únicos
    const users = await prisma.budget.findMany({
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });

    let successCount = 0;
    let errorCount = 0;

    // Enviar mensagens para cada usuário
    for (const user of users) {
      try {
        // Encaminhar cada mensagem na sequência
        for (const msg of messages) {
          await ctx.api.copyMessage(user.userId, chatId, msg.messageId);
        }
        successCount++;
      } catch (error) {
        console.error(`Erro ao enviar broadcast para ${user.userId}:`, error);
        errorCount++;
      }
    }

    // Enviar relatório para o admin
    await ctx.reply(
      "📊 *Relatório do Broadcast*\n\n" +
      `✅ Enviado com sucesso: ${successCount} usuário(s)\n` +
      `❌ Falhas no envio: ${errorCount} usuário(s)\n\n` +
      `Total de usuários: ${users.length}\n` +
      `Total de itens enviados: ${messages.length}`, {
      parse_mode: "Markdown"
    });

  } catch (error) {
    console.error("Erro ao executar broadcast:", error);
    await ctx.reply(
      "❌ *Erro ao executar broadcast*\n\n" +
      "Ocorreu um erro ao tentar enviar a mensagem para os usuários. " +
      "Por favor, tente novamente mais tarde.", {
      parse_mode: "Markdown"
    });
  }
}