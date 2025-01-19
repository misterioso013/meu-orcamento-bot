import { Context, SessionFlavor } from "grammy";
import { ConversationFlavor } from "@grammyjs/conversations";

export interface SessionData {
  productId?: string;
  currentBudgetId?: string;
}

export type MyContext = Context & SessionFlavor<SessionData> & ConversationFlavor;