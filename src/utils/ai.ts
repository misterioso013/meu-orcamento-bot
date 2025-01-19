import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Schema para análise de orçamento
const budgetAnalysisSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: "Título da análise"
    },
    topics: {
      type: SchemaType.ARRAY,
      description: "Lista de tópicos analisados",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          number: {
            type: SchemaType.STRING,
            description: "Número do tópico (ex: 1.)"
          },
          title: {
            type: SchemaType.STRING,
            description: "Título do tópico"
          },
          content: {
            type: SchemaType.STRING,
            description: "Conteúdo detalhado do tópico"
          }
        },
        required: ["number", "title", "content"]
      }
    }
  },
  required: ["title", "topics"]
};

// Schema para análise de produto
const productAnalysisSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: "Título da análise"
    },
    topics: {
      type: SchemaType.ARRAY,
      description: "Lista de tópicos analisados",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          number: {
            type: SchemaType.STRING,
            description: "Número do tópico (ex: 1.)"
          },
          title: {
            type: SchemaType.STRING,
            description: "Título do tópico"
          },
          content: {
            type: SchemaType.STRING,
            description: "Conteúdo detalhado do tópico"
          }
        },
        required: ["number", "title", "content"]
      }
    }
  },
  required: ["title", "topics"]
};

// Função para escapar caracteres especiais do MarkdownV2
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

// Funções de formatação de texto
function bold(text: string): string {
  return `*${escapeMarkdown(text)}*`;
}

// Função para formatar a análise estruturada
function formatStructuredAnalysis(analysis: any): string {
  let formattedResponse = `${bold(analysis.title)}\n\n`;

  analysis.topics.forEach((topic: any) => {
    const formattedNumber = escapeMarkdown(topic.number);
    const formattedTitle = bold(topic.title);
    const formattedContent = escapeMarkdown(topic.content);

    formattedResponse += `${formattedNumber} ${formattedTitle}\n${formattedContent}\n\n`;
  });

  return formattedResponse;
}

export async function getBudgetAnalysis(budget: any) {
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL as string,
    generationConfig: {
      maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS as string),
      temperature: parseFloat(process.env.GEMINI_TEMPERATURE as string),
      topP: parseFloat(process.env.GEMINI_TOP_P as string),
      topK: parseInt(process.env.GEMINI_TOP_K as string),
      responseMimeType: "application/json",
      responseSchema: budgetAnalysisSchema,
    },
  });

  const prompt = `Analise este orçamento e forneça insights úteis. Seja direto e conciso em cada tópico:

  Categoria: ${budget.category}
  Objetivo: ${budget.objective}
  Público-alvo: ${budget.targetAudience}
  Funcionalidades: ${budget.features}
  Prazo: ${budget.deadline}
  Orçamento: ${budget.budget}

  Forneça uma análise com os seguintes tópicos (use linguagem formal e profissional):
  1. Viabilidade do projeto
  2. Tecnologias recomendadas
  3. Desafios principais
  4. Estimativa de tempo
  5. Recomendações`;

  try {
    const result = await model.generateContent(prompt);
    const analysis = JSON.parse(result.response.text());
    return formatStructuredAnalysis(analysis);
  } catch (error) {
    console.error("Erro ao analisar orçamento:", error);
    return "Desculpe, tive um problema ao processar sua mensagem\\. Tente novamente mais tarde\\.";
  }
}

export async function getProductInfo(product: any) {
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL as string,
    generationConfig: {
      maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS as string),
      temperature: parseFloat(process.env.GEMINI_TEMPERATURE as string),
      topP: parseFloat(process.env.GEMINI_TOP_P as string),
      topK: parseInt(process.env.GEMINI_TOP_K as string),
      responseMimeType: "application/json",
      responseSchema: productAnalysisSchema,
    },
  });

  const prompt = `Analise este produto e forneça informações úteis. Seja direto e conciso em cada tópico:

  Nome: ${product.name}
  Descrição: ${product.description}
  Preço: ${product.price}

  Forneça uma análise com os seguintes tópicos (use linguagem formal e profissional):
  1. Benefícios principais
  2. Casos de uso ideais
  3. Diferenciais do produto
  4. Possibilidades de personalização
  5. Comparativo com o mercado

  Lembre-se que você está vendendo este produto então use palavras que façam sentido para o cliente.`;

  try {
    const result = await model.generateContent(prompt);
    const analysis = JSON.parse(result.response.text());
    return formatStructuredAnalysis(analysis);
  } catch (error) {
    console.error("Erro ao analisar produto:", error);
    return "Desculpe, tive um problema ao processar sua mensagem\\. Tente novamente mais tarde\\.";
  }
}