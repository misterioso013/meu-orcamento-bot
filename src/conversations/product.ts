import { Conversation } from "@grammyjs/conversations";
import { Category } from "@prisma/client";
import { createProduct, updateProduct, getProduct } from "@/utils/db/product";
import { MyContext } from "@/types/context";
import { randomUUID } from "crypto";

type MyConversation = Conversation<MyContext>;

export async function addProductConversation(conversation: MyConversation, ctx: MyContext) {
  await ctx.reply("Vamos adicionar um novo produto! 🛍️\nPor favor, responda às perguntas a seguir.");

  await ctx.reply("Digite o nome do produto:");
  const { message } = await conversation.wait();
  const name = message?.text || "";

  await ctx.reply("Digite a descrição curta do produto:");
  const { message: descMessage } = await conversation.wait();
  const description = descMessage?.text || "";

  await ctx.reply("Digite o preço do produto (apenas números):");
  const { message: priceMessage } = await conversation.wait();
  const price = priceMessage?.text || "0";

  await ctx.reply("Envie a imagem do produto:");
  const { message: imageMessage } = await conversation.wait();

  let image = "";
  if (imageMessage?.photo) {
    // Pega o último item do array photo (maior resolução)
    const photo = imageMessage.photo[imageMessage.photo.length - 1];
    image = photo.file_id;
  } else {
    await ctx.reply("❌ Nenhuma imagem recebida. Por favor, envie uma imagem.");
    return;
  }

  await ctx.reply("Escolha a categoria:\n1 - SITE\n2 - BOT\n3 - APP\n4 - SCRIPT");
  const { message: categoryMessage } = await conversation.wait();
  const categoryMap: Record<string, Category> = {
    "1": "SITE",
    "2": "BOT",
    "3": "APP",
    "4": "SCRIPT"
  };
  const category = categoryMap[categoryMessage?.text || "1"];

  await ctx.reply("Digite o link de download (opcional):");
  const { message: downloadMessage } = await conversation.wait();
  const downloadLink = downloadMessage?.text || null;

  const product = await createProduct({
    id: randomUUID(),
    name,
    description,
    price,
    image,
    category,
    downloadLink,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await ctx.reply("✅ Produto criado com sucesso!");
  return;
}

export async function editProductConversation(conversation: MyConversation, ctx: MyContext) {
  const productId = ctx.session.productId;
  if (!productId) {
    await ctx.reply("ID do produto não encontrado!");
    return;
  }

  const product = await getProduct(productId);

  if (!product) {
    await ctx.reply("Produto não encontrado!");
    return;
  }

  await ctx.reply(`Editando: ${product.name}\nDigite o novo nome ou "pular" para manter:`);
  const { message } = await conversation.wait();
  const name = message?.text === "pular" ? product.name : message?.text || product.name;

  // Repete o processo para os outros campos...
  // Por brevidade, estou mostrando apenas o nome, mas você deve repetir para todos os campos

  const updatedProduct = await updateProduct(productId, {
    ...product,
    name,
    updatedAt: new Date(),
  });

  await ctx.reply("✅ Produto atualizado com sucesso!");
  return;
}