import { z } from "zod";
import { Category } from "@prisma/client";

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string().nullable(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  isAdmin: z.boolean(),
  isActive: z.boolean(),
  inChatAi: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof userSchema>;

export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  price: z.string(),
  image: z.string().optional(),
  category: z.enum(["SITE", "BOT", "APP", "SCRIPT"]),
  downloadLink: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Product = z.infer<typeof productSchema>;

export const orderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  productId: z.string(),
  status: z.string().refine((status) => ["PENDING", "PAID", "REJECTED"].includes(status), {
    message: "Status inválido",
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Order = z.infer<typeof orderSchema>;

export const budgetSchema = z.object({
  id: z.string(),
  userId: z.string(),
  objective: z.string().optional(),
  targetAudience: z.string().optional(),
  features: z.string().optional(),
  integrations: z.string().optional(),
  deadline: z.string().optional(),
  budget: z.number().optional(),
  design: z.string().optional(),
  technologies: z.string().optional(),
  hosting: z.string().optional(),
  maintenance: z.boolean().optional(),
  others: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Budget = z.infer<typeof budgetSchema>;

export const messageSchema = z.object({
  id: z.string(),
  messageId: z.string(),
  userId: z.string(),
  budgetId: z.string().optional(),
  content: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Message = z.infer<typeof messageSchema>;

export interface BudgetData {
  category: Category;
  objective: string;
  targetAudience: string;
  features: string;
  deadline: string;
  budget: string;
  design: string;
  maintenance: boolean;
  technologies: string;
  hosting: boolean;
  integrations: string;
  specificAnswers: Record<string, string>;
}
