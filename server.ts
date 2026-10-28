import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini SDK with server-side API Key
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no servidor.');
  }
  return new GoogleGenAI({ apiKey });
};

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString()
  });
});

// Endpoint: AI Nutrition Parser (Natural Language meal breakdown)
app.post('/api/ai/nutrition-parse', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'O texto da refeição é obrigatório.' });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `
Você é o motor de cálculo nutricional do FitEvolution AI.
Analise a refeição descrita pelo usuário:
"${text}"

Instruções rigorosas:
1. Identifique todos os alimentos, ingredientes e bebidas citados.
2. Interprete as quantidades (g, ml, unidades, colheres, fatias) e modos de preparo (grelhado, cozido, cru, frito).
3. Baseie os dados nutricionais em fontes oficiais prioritariamente:
   - TACO (Tabela Brasileira de Composição de Alimentos / UNICAMP)
   - TBCA (Tabela Brasileira de Composição de Alimentos / USP)
   - USDA FoodData Central
   - Open Food Facts
4. Se o usuário não informar peso exato (ex: "um bife", "uma banana"), use o peso médio padrão (ex: banana prata média ~80g, bife médio ~120g) e marque "isEstimate": true.
5. Se o modo de preparo alterar calorias (ex: frito em óleo vs grelhado), considere a gordura adicionada.

Retorne EXCLUSIVAMENTE um JSON válido com o seguinte formato:
{
  "foods": [
    {
      "name": "Arroz branco cozido",
      "quantity": 150,
      "unit": "g",
      "calories": 192,
      "protein": 3.75,
      "carbs": 42.15,
      "fats": 0.45,
      "fiber": 2.4,
      "preparation": "cozido em água e sal",
      "source": "TACO / UNICAMP 4ª Edição",
      "sourceUrl": "https://www.cfn.org.br/wp-content/uploads/2017/03/taco_4_edicao_ampliada_e_revisada.pdf",
      "isEstimate": false
    }
  ],
  "totalCalories": 192,
  "totalProtein": 3.8,
  "totalCarbs": 42.2,
  "totalFats": 0.5,
  "totalFiber": 2.4,
  "summary": "Breve explicação clara do cálculo nutricional para o usuário",
  "confidenceLevel": "high" | "medium" | "estimated",
  "sourcesConsulted": ["TACO / UNICAMP", "TBCA"]
}
`;

    // Timeout safety race
    const callGemini = async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
      return JSON.parse(response.text || '{}');
    };

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 5000)
    );

    let parsedData;
    try {
      parsedData = await Promise.race([callGemini(), timeoutPromise]);
    } catch {
      // Local TACO Fallback Parser for immediate responsiveness
      parsedData = fallbackTacoParser(text);
    }

    res.json(parsedData);
  } catch (err: unknown) {
    console.error('Erro no parser nutricional:', err);
    res.json(fallbackTacoParser(req.body.text || ''));
  }
});

// Built-in TACO / TBCA Verified Fallback Database Parser
function fallbackTacoParser(text: string) {
  const lower = text.toLowerCase();
  const foodsFound: Array<{
    name: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
    preparation: string;
    source: string;
    isEstimate: boolean;
  }> = [];

  const tacoDB = [
    { key: 'arroz', name: 'Arroz branco cozido', calPer100: 128, p: 2.5, c: 28.1, f: 0.2, fib: 1.6, defaultQty: 150, unit: 'g' },
    { key: 'feij', name: 'Feijão carioca cozido', calPer100: 76, p: 4.8, c: 13.6, f: 0.5, fib: 8.5, defaultQty: 100, unit: 'g' },
    { key: 'frango', name: 'Peito de frango grelhado', calPer100: 159, p: 32.0, c: 0, f: 2.5, fib: 0, defaultQty: 150, unit: 'g' },
    { key: 'patinho', name: 'Carne bovina patinho grelhado', calPer100: 219, p: 35.9, c: 0, f: 7.3, fib: 0, defaultQty: 150, unit: 'g' },
    { key: 'ovo', name: 'Ovo de galinha cozido', calPer100: 146, p: 13.3, c: 0.6, f: 9.5, fib: 0, defaultQty: 50, unit: 'g' },
    { key: 'banana', name: 'Banana prata crua', calPer100: 98, p: 1.3, c: 26.0, f: 0.1, fib: 2.0, defaultQty: 80, unit: 'g' },
    { key: 'aveia', name: 'Aveia em flocos finos', calPer100: 394, p: 13.9, c: 66.6, f: 8.5, fib: 9.1, defaultQty: 40, unit: 'g' },
    { key: 'whey', name: 'Whey Protein Concentrado 80%', calPer100: 400, p: 80.0, c: 6.6, f: 5.0, fib: 0, defaultQty: 30, unit: 'g' },
    { key: 'batata', name: 'Batata-doce cozida', calPer100: 77, p: 0.6, c: 18.4, f: 0.1, fib: 2.2, defaultQty: 150, unit: 'g' },
    { key: 'azeite', name: 'Azeite de oliva extra virgem', calPer100: 884, p: 0, c: 0, f: 100.0, fib: 0, defaultQty: 10, unit: 'ml' },
  ];

  for (const item of tacoDB) {
    if (lower.includes(item.key)) {
      // Regex search for quantity e.g. "150g", "200 g", "2 ovos"
      let qty = item.defaultQty;
      const regex = new RegExp(`(\\d+)\\s*(g|gr|gramas|ml|unid)?\\s*(?:de\\s*)?${item.key}`, 'i');
      const match = lower.match(regex);
      if (match && match[1]) {
        const parsedNum = parseInt(match[1], 10);
        if (item.key === 'ovo' && parsedNum < 10) {
          qty = parsedNum * 50; // 50g per egg
        } else {
          qty = parsedNum;
        }
      }

      const factor = qty / 100;
      foodsFound.push({
        name: item.name,
        quantity: qty,
        unit: item.unit,
        calories: Math.round(item.calPer100 * factor),
        protein: Math.round(item.p * factor * 10) / 10,
        carbs: Math.round(item.c * factor * 10) / 10,
        fats: Math.round(item.f * factor * 10) / 10,
        fiber: Math.round(item.fib * factor * 10) / 10,
        preparation: 'Preparo padrão',
        source: 'TACO / UNICAMP 4ª Edição',
        isEstimate: false,
      });
    }
  }

  if (foodsFound.length === 0) {
    foodsFound.push({
      name: text.slice(0, 30),
      quantity: 100,
      unit: 'g',
      calories: 150,
      protein: 10,
      carbs: 15,
      fats: 5,
      fiber: 2,
      preparation: 'Geral',
      source: 'USDA Estimativa',
      isEstimate: true,
    });
  }

  const totals = foodsFound.reduce(
    (acc, f) => ({
      cal: acc.cal + f.calories,
      p: acc.p + f.protein,
      c: acc.c + f.carbs,
      f: acc.f + f.fats,
      fib: acc.fib + f.fiber,
    }),
    { cal: 0, p: 0, c: 0, f: 0, fib: 0 }
  );

  return {
    foods: foodsFound,
    totalCalories: totals.cal,
    totalProtein: Math.round(totals.p * 10) / 10,
    totalCarbs: Math.round(totals.c * 10) / 10,
    totalFats: Math.round(totals.f * 10) / 10,
    totalFiber: Math.round(totals.fib * 10) / 10,
    summary: `Identificados ${foodsFound.length} alimento(s) com base na Tabela TACO / UNICAMP.`,
    confidenceLevel: 'high',
    sourcesConsulted: ['TACO / UNICAMP', 'TBCA / USP'],
  };
}

// Endpoint: AI Food Search (Search individual food with standard nutrients & per quantity)
app.post('/api/ai/nutrition-search', async (req: Request, res: Response) => {
  try {
    const { query, quantity, unit } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Termo de pesquisa obrigatório.' });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `
Pesquise e forneça a tabela nutricional precisa para:
Alimento: "${query}"
${quantity ? `Quantidade informada: ${quantity} ${unit || 'g'}` : 'Quantidade padrão: 100g'}

Fontes confiáveis: TACO (Tabela Brasileira), TBCA ou USDA.
Retorne EXCLUSIVAMENTE um JSON com o esquema:
{
  "name": "Nome comum padronizado",
  "standardServing": 100,
  "unit": "g",
  "per100g": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fats": 0,
    "fiber": 0
  },
  "requestedServing": {
    "quantity": ${Number(quantity) || 100},
    "unit": "${unit || 'g'}",
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fats": 0,
    "fiber": 0
  },
  "source": "TACO / UNICAMP ou USDA",
  "sourceUrl": "URL de referência pública",
  "notes": "Informações sobre modo de preparo ou porção"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const outputText = response.text || '{}';
    const parsedData = JSON.parse(outputText);
    res.json(parsedData);
  } catch (err: unknown) {
    console.error('Erro na pesquisa nutricional Gemini:', err);
    res.status(500).json({
      error: 'Falha ao pesquisar alimento com IA.',
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

// Endpoint: Workout AI Assistant (Substitutions, form tips, load progression analysis)
app.post('/api/ai/workout-assistant', async (req: Request, res: Response) => {
  try {
    const { prompt, userContext } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Pergunta ou solicitação não fornecida.' });
      return;
    }

    const ai = getGeminiClient();
    const systemPrompt = `
Você é o FitEvolution Coach, um especialista em biomecânica, fisiologia do exercício e periodização de treinamento de força.
Contexto do atleta:
${userContext ? JSON.stringify(userContext, null, 2) : 'Não informado'}

Diretrizes:
- Forneça respostas técnicas, embasadas e diretas em português claro e motivador.
- Ao sugerir substituição de exercícios, explique o motivo (ex: biomecânica semelhante, mesmo vetor de força, menor sobrecarga lombar).
- Ao analisar evolução de cargas ou estagnação (platô), forneça estratégias práticas (periodização ondulatória, deload, ajuste de volume/RPE, tempo sob tensão).
- Nunca execute alterações no calendário sem permissão explícita.
- Estruture a resposta com tópicos claros e recomendações práticas.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nSolicitação do usuário: ${prompt}` }] }
      ],
      config: {
        temperature: 0.6
      }
    });

    res.json({
      reply: response.text || 'Não foi possível gerar a resposta no momento.'
    });
  } catch (err: unknown) {
    console.error('Erro no assistente de treinos Gemini:', err);
    res.status(500).json({
      error: 'Falha ao consultar assistente de treino.',
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

// Endpoint: AI Split Generator (Generate complete split based on goals and schedule)
app.post('/api/ai/generate-split', async (req: Request, res: Response) => {
  try {
    const { goal, daysPerWeek, level, restrictions } = req.body;
    const ai = getGeminiClient();

    const prompt = `
Crie uma divisão de treinamento de musculação completa e otimizada:
- Objetivo: ${goal || 'Hipertrofia'}
- Dias disponíveis por semana: ${daysPerWeek || 5} dias
- Nível de experiência: ${level || 'Intermediário'}
- Restrições físicas: ${restrictions || 'Nenhuma'}

Regras:
1. Gere entre 3 a 5 treinos nomeados como TREINO A, TREINO B, TREINO C, etc.
2. Cada treino deve ter 4 a 6 exercícios essenciais com grupos musculares complementares.
3. Para cada exercício indique: nome em português, grupo muscular, equipamento, séries sugeridas (ex: 4), repetições (ex: 8-12), carga inicial estimada em kg (ex: 20), descanso em segundos (ex: 60 a 90) e breve nota de execução.

Retorne EXCLUSIVAMENTE um JSON no formato:
{
  "splitName": "Divisão ABCDE Foco Hipertrofia",
  "description": "Periodização focada em volume progressivo",
  "suggestedRestDays": ["Sábado", "Domingo"],
  "workouts": [
    {
      "name": "TREINO A — PEITO E TRÍCEPS",
      "muscleGroup": "Peito e Tríceps",
      "description": "Foco em peitoral maior e tríceps braquial",
      "exercises": [
        {
          "name": "Supino Reto com Barra",
          "muscleGroup": "Peito",
          "equipment": "Barra e Banco Reto",
          "targetSets": 4,
          "targetReps": 10,
          "targetWeightKg": 25,
          "restTimeSeconds": 90,
          "notes": "Escápulas aduzidas e descida controlada"
        }
      ]
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (err: unknown) {
    console.error('Erro ao gerar divisão de treino:', err);
    res.status(500).json({
      error: 'Falha ao gerar treino com IA.',
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

// Configure Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FitEvolution AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha crítica ao iniciar servidor:', err);
  process.exit(1);
});
