import { db as prisma } from "@/utils/db";
import { Budget, BudgetStatus } from "@prisma/client";
import type { BudgetData } from "@/types/schemas";

export async function createBudget(userId: string, data: BudgetData): Promise<Budget> {
  return prisma.budget.create({
    data: {
      userId,
      category: data.category,
      objective: data.objective,
      targetAudience: data.targetAudience,
      features: data.features,
      deadline: data.deadline,
      budget: data.budget,
      design: data.design,
      maintenance: data.maintenance,
      technologies: data.technologies,
      hosting: data.hosting,
      integrations: data.integrations,
      specificAnswers: data.specificAnswers,
    }
  });
}

export async function listBudgets(userId: string): Promise<Budget[]> {
  return prisma.budget.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
}

export async function updateBudgetStatus(id: string, status: BudgetStatus): Promise<Budget> {
  return prisma.budget.update({
    where: { id },
    data: { status }
  });
}

export async function getBudget(id: string): Promise<Budget | null> {
  return prisma.budget.findUnique({
    where: { id }
  });
}

export async function updateBudgetProposal(budgetId: string, newValue: string): Promise<Budget> {
  return prisma.budget.update({
    where: { id: budgetId },
    data: {
      budget: newValue,
      status: "APPROVED"
    }
  });
}
