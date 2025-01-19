import { db } from "@/utils/db";
import { productSchema } from "@/types/schemas";
import { Product } from "@prisma/client";

export async function createProduct(product: Product) {
  const productData = productSchema.parse(product);
  const newProduct = await db.product.create({
    data: productData,
  });
  return newProduct;
}

export async function getProduct(id: string) {
  const product = await db.product.findUnique({
    where: { id },
  });
  return product;
}

export async function updateProduct(id: string, product: Product) {
  const productData = productSchema.parse(product);
  const updatedProduct = await db.product.update({
    where: { id },
    data: productData,
  });
  return updatedProduct;
}

export async function deleteProduct(id: string) {
  await db.product.delete({
    where: { id },
  });
}

export async function listProducts() {
  const products = await db.product.findMany();
  return products;
}
