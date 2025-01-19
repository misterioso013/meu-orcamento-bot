import { db } from "@/utils/db";
import { User, userSchema } from "@/types/schemas";

export async function createUser(user: User) {
  const userData = userSchema.parse(user);
  const newUser = await db.user.create({
    data: userData,
  });
  return newUser;
}

export async function getUser(id: string) {
  const user = await db.user.findUnique({
    where: { id },
  });
  return user;
}

export async function updateUser(id: string, user: User) {
  const userData = userSchema.parse(user);
  const updatedUser = await db.user.update({
    where: { id },
    data: userData,
  });
  return updatedUser;
}