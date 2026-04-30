/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeFloorPlan(base64Image: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          {
            text: "Analise esta planta baixa e extraia uma lista de cômodos com suas dimensões estimadas (área em m² e perímetro em m). Tipos permitidos: 'kitchen', 'living', 'bedroom', 'bathroom', 'laundry', 'hallway' ou 'other'. Retorne os dados em um JSON estruturado."
          }
        ]
      },
      config: {
        systemInstruction: "Você é um arquiteto e engenheiro eletricista experiente. Sua tarefa é analisar imagens de plantas baixas e fornecer dados estruturados precisos em JSON. Certifique-se de identificar áreas de circulação como corredores e halls.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rooms: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  area: { type: Type.NUMBER },
                  perimeter: { type: Type.NUMBER },
                  type: { type: Type.STRING, enum: ['kitchen', 'living', 'bedroom', 'bathroom', 'laundry', 'hallway', 'other'] }
                },
                required: ["name", "area", "perimeter", "type"]
              }
            }
          },
          required: ["rooms"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Floor plan analysis error:", error);
    throw new Error("Não foi possível analisar a planta baixa.");
  }
}

export async function generateDiagrams(rooms: any[], base64Image?: string) {
  try {
    const contents: any[] = [
      {
        text: `Com base nesta lista de cômodos: ${JSON.stringify(rooms)}, gere o código SVG para dois diagramas técnicos profissionais e detalhados:

        1. Diagrama Unifilar Técnico: 
           - Deve seguir rigorosamente as normas NBR 5410 e NBR 5444.
           - Mostre claramente: Entrada de serviço, Dispositivo de Proteção contra Surtos (DPS), Interruptor Diferencial Residual (DR), Disjuntor Geral e os barramentos de fase, neutro e terra (PE).
           - Organize os circuitos por cômodo, indicando a fiação (símbolos de fase, neutro, terra), seção dos condutores (ex: 2.5mm²) e a corrente nominal dos disjuntores.
           - CORREÇÃO DE ERROS: Garanta que o DPS e o DR estejam presentes. Verifique se as bitolas estão coerentes com a carga (ex: 6mm² para chuveiro 220V).
           - O desenho deve ser limpo, com textos legíveis e conexões bem definidas.

        2. Esquema Elétrico em Planta (Escala Ampliada e Legenda):
           - Gere um SVG com um viewbox amplo (mínimo 1200x800) para garantir que os detalhes não fiquem pequenos.
           - Desenhe a disposição de iluminação, tomadas (TUG/TUE) e interruptores DIRETAMENTE sobre o layout real da planta.
           - REGRA CRÍTICA: Nunca esqueça de posicionar pontos de iluminação em corredores (hallways) e halls de entrada.
           - LEGENDA OBRIGATÓRIA: Inclua uma legenda técnica organizada informando os símbolos de cada componente no canto do desenho.
           - DETALHAMENTO: Inclua exatamente a quantidade de TUGs e TUEs dimensionadas. Distribua os pontos de forma lógica.
           - FIDELIDADE E ESCALA: Mantenha a fidelidade absoluta à arquitetura da imagem fornecida. Faça o desenho GRANDE para facilitar a visualização.

        Retorne um JSON com os campos 'unifilar' e 'electrical' contendo as strings SVG completas e prontas para exibição.`,
      }
    ];

    if (base64Image) {
      contents.unshift({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: contents },
      config: {
        systemInstruction: "Você é um engenheiro eletricista e cadista experiente. Seu objetivo é criar diagramas profissionais que respeitem rigorosamente o layout arquitetônico original da planta fornecida.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            unifilar: { type: Type.STRING },
            electrical: { type: Type.STRING }
          },
          required: ["unifilar", "electrical"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Diagram generation error:", error);
    return null;
  }
}

export async function getElectricalAdvice(query: string, context: any) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `O usuário está usando um app de orçamento elétrico residencial.
      Contexto atual do projeto: ${JSON.stringify(context)}
      
      Responda de forma técnica e prestativa em Português do Brasil.
      Siga a norma NBR 5410.
      
      Dúvida: ${query}`,
      config: {
        systemInstruction: "Você é um mestre eletricista especializado em NBR 5410. Ajude o usuário com cálculos, normas e dicas de instalação.",
      }
    });

    return response.text;
  } catch (error) {
    console.error("AI Error:", error);
    return "Desculpe, tive um problema ao processar sua dúvida. Tente novamente.";
  }
}
