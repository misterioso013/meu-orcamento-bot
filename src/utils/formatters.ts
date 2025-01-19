import { Budget, BudgetStatus } from "@prisma/client";

export function getBudgetEmoji(status: BudgetStatus): string {
  const statusMap: Record<BudgetStatus, string> = {
    PENDING: "⏳",
    ANALYZING: "🔍",
    APPROVED: "✅",
    REJECTED: "❌",
    COMPLETED: "🎉"
  };
  return statusMap[status];
}

export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatBudgetDetails(budget: Budget): string {
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