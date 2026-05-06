import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
});

export interface PricingAnalysis {
  minPrice: number;
  maxPrice: number;
  reasoning: string;
  marketInsights: {
    demand: string;
    seasonality: string;
    competition: string;
  };
  tips: string[];
}

export async function analyzePricing(itemData: {
  type: string;
  brand: string;
  size: string;
  color: string;
  condition: string;
  originalPrice: string;
  defects: string;
  notes: string;
}): Promise<PricingAnalysis | null> {
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const prompt = `Analyze the potential Vinted market for this item:
- Item: ${itemData.type}
- Brand: ${itemData.brand}
- Size: ${itemData.size}
- Color: ${itemData.color}
- Condition: ${itemData.condition}
- Original Price: ${itemData.originalPrice}€
- Defects: ${itemData.defects || "None"}
- Additional Notes: ${itemData.notes || "None"}
- Current Month: ${currentMonth}

Provide a realistic pricing estimation and market analysis for the Vinted platform.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional Vinted reseller and market analyst. Provide realistic pricing based on actual Vinted market trends, luxury brand positioning, and current demand. Be concise and professional.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            minPrice: { type: Type.NUMBER, description: "Minimum suggested price in Euros" },
            maxPrice: { type: Type.NUMBER, description: "Maximum suggested price in Euros" },
            reasoning: { type: Type.STRING, description: "Detailed reasoning for this price range" },
            marketInsights: {
              type: Type.OBJECT,
              properties: {
                demand: { type: Type.STRING, description: "Current demand level for this type/brand" },
                seasonality: { type: Type.STRING, description: "How the current season affects this item" },
                competition: { type: Type.STRING, description: "Typical competition level on Vinted" }
              }
            },
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Pro tips to sell this specific item faster"
            }
          },
          required: ["minPrice", "maxPrice", "reasoning", "marketInsights", "tips"]
        }
      }
    });

    if (!response.text) return null;
    return JSON.parse(response.text.trim()) as PricingAnalysis;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return null;
  }
}
