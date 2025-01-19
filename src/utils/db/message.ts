import { db } from "@/utils/db";
import { Message } from "@prisma/client";

export async function createMessage(message: Omit<Message, "id" | "createdAt" | "updatedAt">) {
  const newMessage = await db.message.create({
    data: message,
  });
  return newMessage;
}

export async function getMessagesByBudgetId(budgetId: string) {
  const messages = await db.message.findMany({
    where: { budgetId },
    orderBy: { createdAt: "asc" },
    include: {
      user: true,
    },
  });
  return messages;
}

export async function updateBudgetChatStatus(budgetId: string, isActive: boolean) {
  const budget = await db.budget.update({
    where: { id: budgetId },
    data: { chatActive: isActive },
  });
  return budget;
}