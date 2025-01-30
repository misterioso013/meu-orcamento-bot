import { db as prisma } from "@/utils/db";
import { User } from "@prisma/client";

export async function createUser(user: User) {
  const newUser = await prisma.user.create({
    data: user,
  });
  return newUser;
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  return user?.isAdmin || false;
}

export async function getUser(userId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id: userId }
  });
}

export async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data
  });
}

export async function getAdminUsers(): Promise<User[]> {
  return prisma.user.findMany({
    where: { isAdmin: true }
  });
}