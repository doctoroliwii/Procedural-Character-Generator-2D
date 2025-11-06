import { GoogleGenAI, Type } from "@google/genai";

// API key is automatically provided by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// Defines the expected JSON structure for the comic script
const schema = {
  type: Type.OBJECT,
  properties: {
    totalUniqueCharacters: {
      type: Type.INTEGER,
      description: 'El número total de personajes únicos en todo el cómic.'
    },
    panels: {
      type: Type.ARRAY,
      description: 'Un array de viñetas de cómic.',
      items: {
        type: Type.OBJECT,
        required: ["panel", "description", "shotType", "charactersInPanel", "dialogues"],
        properties: {
          panel: { type: Type.INTEGER, description: 'El número de la viñeta, comenzando desde 1.' },
          description: { type: Type.STRING, description: 'Una descripción detallada de la escena, los personajes, su apariencia, pose y acción en esta viñeta.' },
          shotType: { 
            type: Type.STRING,
            description: "El tipo de plano para la viñeta. Debe ser 'close-up' (cabeza y hombros), 'medium-shot' (de cintura para arriba), o 'full-shot' (cuerpo completo)."
          },
          charactersInPanel: { 
            type: Type.ARRAY,
            description: 'Un array de IDs (basados en 0) para cada personaje único presente en esta viñeta.',
            items: { type: Type.INTEGER }
          },
          dialogues: {
            type: Type.ARRAY,
            description: 'Una lista de diálogos en esta viñeta. Puede estar vacía.',
            items: {
              type: Type.OBJECT,
              required: ["characterId", "text"],
              properties: {
                characterId: { type: Type.INTEGER, description: 'El ID (basado en 0) del personaje único que está hablando.' },
                text: { type: Type.STRING, description: 'El texto del diálogo para el bocadillo.' }
              }
            }
          }
        }
      }
    }
  }
};

interface Dialogue {
  characterId: number;
  text: string;
}

interface PanelScript {
  panel: number;
  description: string;
  shotType: 'close-up' | 'medium-shot' | 'full-shot';
  charactersInPanel: number[];
  dialogues: Dialogue[];
}

interface ComicScript {
  totalUniqueCharacters: number;
  panels: PanelScript[];
}

export const generateComicScript = async (theme: string, numPanels: number, language: string): Promise<ComicScript> => {
  const languageMap: Record<string, string> = {
    es: 'español',
    en: 'inglés',
    ja: 'japonés',
    zh: 'chino',
    ru: 'ruso',
    hi: 'hindi',
  };
  const languageName = languageMap[language] || 'español';

  const prompt = `Crea un guion de cómic corto de ${numPanels} viñetas en ${languageName} basado en el tema: "${theme}".
  El guion debe ser coherente, con personajes consistentes a lo largo de las viñetas.
  Primero, decide cuántos personajes únicos hay en toda la historia (totalUniqueCharacters).
  Para cada viñeta:
  1.  Describe la escena, la apariencia de los personajes, sus poses y sus acciones.
  2.  Determina el tipo de plano (shotType) para la viñeta para enfocar la acción. Las opciones son: 'close-up' (enfoca en la cara y hombros, para diálogos o emociones), 'medium-shot' (muestra de la cintura para arriba, bueno para interacciones), o 'full-shot' (muestra el cuerpo completo, para establecer la escena o mostrar acción).
  3.  Especifica qué personajes únicos están en la viñeta usando sus IDs (basados en 0) en el array 'charactersInPanel'.
  4.  Escribe los diálogos. Para cada diálogo, usa el 'characterId' del personaje único que habla. Asegúrate de que este ID corresponda a un personaje presente en 'charactersInPanel'.
  5.  El texto del diálogo debe ser corto y conciso para que quepa en un bocadillo.
  Proporciona la salida en formato JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonText = response.text.trim();
    if (jsonText.startsWith('{') && jsonText.endsWith('}')) {
      const script = JSON.parse(jsonText);
      return script;
    } else {
      console.error("Gemini did not return a valid JSON object string:", jsonText);
      throw new Error("Failed to parse comic script from Gemini response.");
    }
  } catch (error) {
    console.error("Error generating comic script:", error);
    throw error;
  }
};

export const getTrendingTopic = async (): Promise<string> => {
  const prompt = `¿Cuál es un tema o meme de tendencia global en este momento?
Responde solo con una frase corta y divertida, adecuada como tema para una tira cómica.
Por ejemplo: 'Gatos aprendiendo a programar' o 'El auge de las cafeteras con IA'.
Sé creativo y conciso, y responde solo con el tema en sí, sin texto adicional. La respuesta debe ser en español.`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    // Clean up response, removing potential quotes or extra phrasing.
    return response.text.trim().replace(/^"|"$/g, '');
  } catch (error) {
    console.error("Error fetching trending topic:", error);
    // Re-throw to be handled by the caller, which will use a fallback.
    throw error;
  }
};