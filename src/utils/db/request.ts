import { db as prisma } from "@/utils/db";
import { Request, RequestStatus } from "@prisma/client";

export async function createRequest(
  budgetId: string,
  title: string,
  content: string
): Promise<Request> {
  return prisma.request.create({
    data: {
      budgetId,
      title,
      content,
    },
  });
}

export async function listRequestsByBudget(budgetId: string): Promise<Request[]> {
  return prisma.request.findMany({
    where: { budgetId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateRequestStatus(
  id: string,
  status: RequestStatus
): Promise<Request> {
  return prisma.request.update({
    where: { id },
    data: { status },
  });
}

export async function getRequest(id: string): Promise<Request | null> {
  return prisma.request.findUnique({
    where: { id },
  });
}