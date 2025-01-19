import { db } from "@/utils/db";
import { orderSchema } from "@/types/schemas";
import { Order } from "@prisma/client";

export async function createOrder(order: Order) {
  const orderData = orderSchema.parse(order);
  const newOrder = await db.order.create({
    data: orderData as Order,
  });
  return newOrder;
}

export async function getOrdersByUserId(userId: string) {
  const orders = await db.order.findMany({
    where: { userId },
  });
  return orders;
}

export async function getOrder(id: string) {
  const order = await db.order.findUnique({
    where: { id },
  });
  return order;
}
