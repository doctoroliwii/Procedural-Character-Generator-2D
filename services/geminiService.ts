import { GoogleGenAI, Type } from "@google/genai";
import type { Lore, CharacterProfile, Story } from '../types';

// API key is automatically provided by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// FIX: Moved parseJsonResponse to the top to be accessible by all functions and standardized JSON parsing.
const parseJsonResponse = (jsonText: string) => {
  try {
    // Attempt to find a valid JSON object within the string, in case of extraneous text
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("Failed to parse JSON response:", jsonText, e);
    throw new Error("Invalid JSON response from API.");
  }
}

// Defines the expected JSON structure for the simple comic script
const simpleComicScriptSchema = {
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

export interface ComicScript {
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
        responseSchema: simpleComicScriptSchema,
      },
    });

    // FIX: Replaced brittle JSON parsing with robust helper function.
    return parseJsonResponse(response.text);
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


// --- NEW NARRATIVE GENERATION SERVICES ---

const loreSchema = {
  type: Type.OBJECT,
  properties: {
    genre: { type: Type.STRING },
    rules: { type: Type.STRING },
    locations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { name: { type: Type.STRING }, description: { type: Type.STRING } }
      }
    },
    history: { type: Type.STRING },
  }
};

export const generateLore = async (genreSuggestion: string): Promise<Omit<Lore, 'locations'> & { locations: Omit<Location, 'id'>[] }> => {
  const prompt = `Crea el lore para un universo de ficción del género: "${genreSuggestion}".
  Describe las reglas del universo, 3 lugares clave con sus descripciones, y un breve resumen de la historia del mundo.
  La respuesta debe ser un objeto JSON.`;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: loreSchema },
  });
  return parseJsonResponse(response.text);
};

const characterProfileSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        age: { type: Type.STRING },
        species: { type: Type.STRING },
        occupation: { type: Type.STRING },
        originLocationId: { type: Type.STRING },
        skills: { type: Type.STRING },
        limitations: { type: Type.STRING },
        psychology: {
            type: Type.OBJECT,
            properties: {
                motivation: { type: Type.STRING },
                fear: { type: Type.STRING },
                virtues: { type: Type.STRING },
                flaws: { type: Type.STRING },
                archetype: { type: Type.STRING },
            }
        },
        backstory: {
            type: Type.OBJECT,
            properties: {
                origin: { type: Type.STRING },
                wound: { type: Type.STRING },
                journey: { type: Type.STRING },
                initialState: { type: Type.STRING },
            }
        },
    },
    required: [ "id", "name", "age", "species", "occupation", "originLocationId", "psychology", "skills", "limitations", "backstory" ]
};

export const generateFullCharacterProfile = async (
    partialProfile: CharacterProfile,
    lore: Lore | null
): Promise<CharacterProfile> => {
    const loreContext = lore
        ? `CONTEXTO DEL MUNDO (LORE):
        Género: ${lore.genre}
        Reglas: ${lore.rules}
        Historia: ${lore.history}`
        : 'No hay un contexto de mundo (lore) definido. Siéntete libre de ser creativo.';

    const prompt = `Eres un escritor creativo y desarrollador de personajes.
    ${loreContext}

    TAREA: Completa el siguiente perfil de personaje.
    - Mantén todos los datos que ya existen. NO los sobrescribas.
    - Rellena todos los campos que estén vacíos (indicados con "" o un objeto vacío).
    - Asegúrate de que toda la información sea coherente entre sí y con el lore del mundo si se proporciona.
    - El resultado debe ser un objeto JSON completo y válido.

    PERFIL DE PERSONAJE PARCIAL:
    ${JSON.stringify(partialProfile, null, 2)}
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: characterProfileSchema,
        },
    });

    return parseJsonResponse(response.text);
};


export const generateStory = async (lore: Lore, characters: CharacterProfile[], genre: string, stakes: string): Promise<Omit<Story, 'characterProfileIds'>> => {
    const characterSummaries = characters.map(c => `PERSONAJE: ${c.name}. HERIDA (TRAUMA): ${c.backstory.wound}. MOTIVACIÓN: ${c.psychology.motivation}.`).join('\n');
    const prompt = `DADO el siguiente universo (lore):
    ${JSON.stringify(lore)}
    
    Y estos personajes:
    ${characterSummaries}
    
    CREA una historia del género "${genre}" donde lo que está en juego es: "${stakes}".
    
    La historia debe seguir la estructura del Story Circle de Dan Harmon en 8 pasos.
    Cada paso debe confrontar o poner a prueba la "herida" de los personajes.
    La respuesta debe ser un objeto JSON con claves "genre", "stakes", y "storyCircle" (un array de 8 objetos, cada uno con "step", "title", "description").`;
    
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    return parseJsonResponse(response.text);
};

export const generateComicScriptFromStory = async (story: Story, lore: Lore, characters: CharacterProfile[], numPanels: number, language: string): Promise<ComicScript> => {
    const characterMap = new Map(characters.map(c => [c.id, c]));
    const charactersInStory = story.characterProfileIds.map(id => characterMap.get(id)).filter(Boolean) as CharacterProfile[];
    const characterSummaries = charactersInStory.map((c, index) => `ID ${index}: ${c.name}. PSICOLOGÍA: ${c.psychology.virtues}, ${c.psychology.flaws}.`).join('\n');

    const prompt = `Eres un guionista de cómics experto.
    UNIVERSO: ${lore.genre}. ${lore.rules}
    PERSONAJES:
    ${characterSummaries}
    
    HISTORIA A ADAPTAR (en 8 pasos):
    ${story.storyCircle.map(s => `${s.step}. ${s.title}: ${s.description}`).join('\n')}
    
    TAREA: Adapta esta historia a un guion de cómic de ${numPanels} viñetas en ${language}.
    Distribuye los 8 pasos de la historia de forma lógica a lo largo de las viñetas.
    Para cada viñeta, describe la escena, acción, tipo de plano, personajes presentes (usando sus IDs numéricos), y diálogos que reflejen su personalidad.
    La salida debe ser un objeto JSON.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: simpleComicScriptSchema,
        },
    });
    return parseJsonResponse(response.text);
};


export const generateNarrativeField = async (
    fieldType: string,
    context: { lore?: Lore | null; character?: CharacterProfile | null, story?: Story | null, characters?: CharacterProfile[] }
): Promise<{ text: string }> => {
    let prompt = '';
    const { lore, character, story, characters } = context;

    switch (fieldType) {
        // --- Lore ---
        case 'lore.genre':
            prompt = 'Sugiere un solo género de ficción interesante y específico. Responde solo con el nombre del género, nada más. Por ejemplo: "Cyberpunk gótico" o "Fantasía de pólvora".';
            break;
        case 'lore.rules':
            prompt = `Basado en el género "${lore?.genre || 'fantasía'}", escribe 2 o 3 reglas fundamentales o leyes físicas que gobiernan este mundo. Sé conciso y creativo. Responde solo con el texto de las reglas.`;
            break;
        case 'lore.history':
            prompt = `Dado el género "${lore?.genre || 'fantasía'}" y las reglas "${lore?.rules || 'desconocidas'}", escribe un breve resumen (2-3 párrafos) de la historia de este mundo. Responde solo con el texto de la historia.`;
            break;
        // --- Character Profile ---
        case 'character.name':
            prompt = `Sugiere un nombre de personaje único y evocador que encaje en un mundo de género "${lore?.genre || 'misterio'}". Responde solo con el nombre.`;
            break;
        case 'character.age':
            prompt = `Para un personaje en un mundo de género "${lore?.genre || 'misterio'}", sugiere una edad. Puede ser un número o una descripción como "Adolescente" o "Anciano". Responde solo con la edad.`;
            break;
        case 'character.species':
            prompt = `Para un mundo de género "${lore?.genre || 'misterio'}", sugiere una especie o raza para un personaje. Sé creativo. Responde solo con el nombre de la especie.`;
            break;
        case 'character.occupation':
            prompt = `En un mundo de género "${lore?.genre || 'misterio'}", ¿cuál podría ser una ocupación interesante para un personaje? Responde solo con la ocupación.`;
            break;
        // --- Character Psychology ---
        case 'character.psychology.archetype':
            prompt = `Sugiere un arquetipo de personaje junguiano (ej: Héroe, Sabio, Rebelde) que sea interesante para un mundo de género "${lore?.genre || 'misterio'}". Responde solo con el arquetipo.`;
            break;
        case 'character.psychology.motivation':
            prompt = `Para un personaje con el arquetipo "${character?.psychology.archetype || 'cualquiera'}" en un mundo de "${lore?.genre || 'misterio'}", ¿cuál es su principal motivación? Responde en una frase corta.`;
            break;
        case 'character.psychology.fear':
            prompt = `Para un personaje con la motivación "${character?.psychology.motivation || 'desconocida'}", ¿cuál es su mayor miedo? Responde en una frase corta.`;
            break;
        case 'character.psychology.virtues':
            prompt = `Describe en una lista corta (2-3 puntos) las principales virtudes de un personaje con arquetipo "${character?.psychology.archetype || 'cualquiera'}".`;
            break;
        case 'character.psychology.flaws':
            prompt = `Describe en una lista corta (2-3 puntos) los principales defectos de un personaje con arquetipo "${character?.psychology.archetype || 'cualquiera'}".`;
            break;
        // --- Character Backstory ---
        case 'character.backstory.origin':
            prompt = `Describe brevemente (1-2 frases) el origen o lugar de nacimiento de un personaje de la especie "${character?.species || 'desconocida'}" en un mundo de "${lore?.genre || 'misterio'}".`;
            break;
        case 'character.backstory.wound':
            prompt = `¿Qué evento traumático ("herida") en el pasado de ${character?.name || 'el personaje'} define su miedo "${character?.psychology.fear || 'desconocido'}" y su motivación "${character?.psychology.motivation || 'desconocida'}"? Describe el evento en 1 o 2 frases.`;
            break;
        case 'character.backstory.journey':
            prompt = `Describe en 2-3 frases el viaje o camino que ${character?.name || 'el personaje'} ha recorrido desde su "herida" hasta ahora.`;
            break;
        case 'character.backstory.initialState':
            prompt = `Describe en una frase el estado mental y situacional de ${character?.name || 'el personaje'} al comienzo de la historia.`;
            break;
        // --- Character Skills/Limitations ---
        case 'character.skills':
            prompt = `Basado en la ocupación "${character?.occupation || 'desconocida'}" y el trasfondo de ${character?.name || 'el personaje'}, enumera 2-3 habilidades o talentos clave que posee.`;
            break;
        case 'character.limitations':
            prompt = `Basado en los defectos "${character?.psychology.flaws || 'desconocidos'}" y la "herida" de ${character?.name || 'el personaje'}, enumera 2-3 limitaciones o debilidades importantes.`;
            break;
        // --- Story ---
        case 'story.genre':
            prompt = `Basado en el género del mundo "${lore?.genre || 'misterio'}", sugiere un subgénero más específico para una historia (ej: "Misterio detectivesco", "Aventura épica", "Romance prohibido"). Responde solo con el género.`;
            break;
        case 'story.stakes':
             const characterNames = (characters || []).map(c => c.name).join(', ') || 'los protagonistas';
            prompt = `Para una historia de género "${story?.genre || 'aventura'}" protagonizada por ${characterNames}, ¿qué podría estar en juego (stakes)? Sé dramático y conciso. Responde en una frase.`;
            break;

        default:
             throw new Error(`Unknown fieldType for generation: ${fieldType}`);
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });

    return { text: response.text.trim() };
};