import { GoogleGenAI, Type, Modality } from "@google/genai";
// FIX: Added import for Location type.
import type { Lore, CharacterProfile, Story, Location, RichText } from '../types';

// API key is automatically provided by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const richTextToString = (value: RichText | undefined): string => value?.map(s => s.text).join('') || '';

// FIX: Moved parseJsonResponse to the top to be accessible by all functions and standardized JSON parsing.
const parseJsonResponse = (jsonText: string) => {
  try {
    // Attempt to find a valid JSON object within the string, in case of extraneous text
    const match = jsonText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
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

export const generateComicScript = async (theme: string, numPanels: number, language: string, numCharacters?: number): Promise<ComicScript> => {
  const languageMap: Record<string, string> = {
    es: 'español',
    en: 'inglés',
    ja: 'japonés',
    zh: 'chino',
    ru: 'ruso',
    hi: 'hindi',
  };
  const languageName = languageMap[language] || 'español';

  const characterConstraint = numCharacters
    ? `El guion debe tener exactamente ${numCharacters} personajes únicos.`
    : 'Primero, decide cuántos personajes únicos hay en toda la historia (totalUniqueCharacters).';

  const prompt = `Crea un guion de cómic corto de ${numPanels} viñetas en ${languageName} basado en el tema: "${theme}".
  ${characterConstraint}
  El guion debe ser coherente, con personajes consistentes a lo largo de las viñetas.
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

export const getTrendsForCountry = async (countryName: string): Promise<string[]> => {
    const prompt = `Enumera los 10 temas de búsqueda de Google más buscados en ${countryName} en las últimas 24 horas.
  Responde únicamente con un array JSON de strings.
  Cada string debe ser una consulta de búsqueda real y popular.
  Por ejemplo: ["resultados de fútbol", "estreno de película", "noticias de celebridades"].`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
      },
    });
    return parseJsonResponse(response.text);
  } catch (error) {
    console.error(`Error fetching trends for ${countryName}:`, error);
    throw error;
  }
};

export const generateCharacterName = async (genre: string, language: string): Promise<string> => {
  const languageMap: Record<string, string> = {
    es: 'español',
    en: 'inglés',
    ja: 'japonés',
    zh: 'chino',
    ru: 'ruso',
    hi: 'hindi',
  };
  const languageName = languageMap[language] || 'español';

  const prompt = `Suggest a single, creative, and funny character name for a story with the theme: "${genre}".
  The name should be in ${languageName}.
  Respond ONLY with the name itself, nothing else. For example: "Pepito Risitas" or "Capitán Calamidad".`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text.trim().replace(/^"|"$/g, '');
  } catch (error) {
    console.error("Error generating character name:", error);
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

export const generateLore = async (genreSuggestion: string): Promise<{ genre: string; rules: string; locations: { name: string; description: string }[]; history: string; }> => {
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
            },
            required: ["motivation", "fear", "virtues", "flaws", "archetype"],
        },
        backstory: {
            type: Type.OBJECT,
            properties: {
                origin: { type: Type.STRING },
                wound: { type: Type.STRING },
                journey: { type: Type.STRING },
                initialState: { type: Type.STRING },
            },
            required: ["origin", "wound", "journey", "initialState"],
        },
    },
    required: [ "id", "name", "age", "species", "occupation", "originLocationId", "psychology", "skills", "limitations", "backstory" ]
};

export const generateFullCharacterProfile = async (
    partialProfile: CharacterProfile,
    lore: Lore | null
): Promise<Omit<CharacterProfile, 'characterParams' | 'id'>> => {
    const loreContext = lore
        ? `CONTEXTO DEL MUNDO (LORE):
        Género: ${richTextToString(lore.genre)}
        Reglas: ${richTextToString(lore.rules)}
        Historia: ${richTextToString(lore.history)}`
        : 'No hay un contexto de mundo (lore) definido. Siéntete libre de ser creativo.';

    const partialProfileString = JSON.stringify({
        ...partialProfile,
        name: richTextToString(partialProfile.name),
        age: richTextToString(partialProfile.age),
        species: richTextToString(partialProfile.species),
        occupation: richTextToString(partialProfile.occupation),
        skills: richTextToString(partialProfile.skills),
        limitations: richTextToString(partialProfile.limitations),
        psychology: {
            motivation: richTextToString(partialProfile.psychology.motivation),
            fear: richTextToString(partialProfile.psychology.fear),
            virtues: richTextToString(partialProfile.psychology.virtues),
            flaws: richTextToString(partialProfile.psychology.flaws),
            archetype: richTextToString(partialProfile.psychology.archetype),
        },
        backstory: {
            origin: richTextToString(partialProfile.backstory.origin),
            wound: richTextToString(partialProfile.backstory.wound),
            journey: richTextToString(partialProfile.backstory.journey),
            initialState: richTextToString(partialProfile.backstory.initialState),
        }
    });

    const prompt = `Eres un escritor creativo y desarrollador de personajes.
    ${loreContext}

    TAREA: Completa el siguiente perfil de personaje.
    - Rellena todos los campos que estén vacíos (indicados con "" o un objeto vacío).
    - IMPORTANTE: Si el campo 'name' es 'New Character' o está vacío, genera un nombre nuevo y creativo para el personaje.
    - Mantén cualquier otro dato que ya exista y no esté vacío. NO lo sobrescribas.
    - Asegúrate de que toda la información sea coherente entre sí y con el lore del mundo si se proporciona.
    - El resultado debe ser un objeto JSON completo y válido.

    PERFIL DE PERSONAJE PARCIAL:
    ${partialProfileString}
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: characterProfileSchema,
        },
    });

    const result = parseJsonResponse(response.text);
    // The Gemini API may incorrectly return a plain string for `name` instead of an object.
    // This ensures that the structure matches the expected `Omit<CharacterProfile, '...'>` type.
    return {
      ...result,
      name: result.name || partialProfile.name, // Fallback to existing name
    };
};


export const generateStory = async (lore: Lore, characters: CharacterProfile[], genre: RichText, stakes: RichText): Promise<Omit<Story, 'characterProfileIds' | 'genre' | 'stakes'>> => {
    const characterSummaries = characters.map(c => `PERSONAJE: ${richTextToString(c.name)}. HERIDA (TRAUMA): ${richTextToString(c.backstory.wound)}. MOTIVACIÓN: ${richTextToString(c.psychology.motivation)}.`).join('\n');
    const loreString = JSON.stringify({
        genre: richTextToString(lore.genre),
        rules: richTextToString(lore.rules),
        history: richTextToString(lore.history),
        locations: lore.locations.map(l => ({ name: richTextToString(l.name), description: richTextToString(l.description) }))
    });
    
    const prompt = `DADO el siguiente universo (lore):
    ${loreString}
    
    Y estos personajes:
    ${characterSummaries}
    
    CREA una historia del género "${richTextToString(genre)}" donde lo que está en juego es: "${richTextToString(stakes)}".
    
    La historia debe seguir la estructura del Story Circle de Dan Harmon en 8 pasos.
    Cada paso debe confrontar o poner a prueba la "herida" de los personajes.
    La respuesta debe ser un objeto JSON con la clave "storyCircle" (un array de 8 objetos, cada uno con "step", "title", "description").`;
    
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    return parseJsonResponse(response.text);
};

export const generateComicScriptFromStory = async (story: Story, lore: Lore, characters: CharacterProfile[], numPanels: number, language: string): Promise<ComicScript> => {
    const characterMap = new Map(characters.map(c => [c.id, c]));
    const charactersInStory = story.characterProfileIds.map(id => characterMap.get(id)).filter(Boolean) as CharacterProfile[];
    const characterSummaries = charactersInStory.map((c, index) => `ID ${index}: ${richTextToString(c.name)}. PSICOLOGÍA: ${richTextToString(c.psychology.virtues)}, ${richTextToString(c.psychology.flaws)}.`).join('\n');

    const prompt = `Eres un guionista de cómics experto.
    UNIVERSO: ${richTextToString(lore.genre)}. ${richTextToString(lore.rules)}
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

const locationSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
    },
    required: ["name", "description"],
};

export const generateLocation = async (genre: string): Promise<{ name: string; description: string }> => {
    const prompt = `Crea un lugar único y evocador para un mundo de ficción del género "${genre}".
    Proporciona un nombre y una descripción breve (2-3 frases).
    La respuesta debe ser un objeto JSON con las claves "name" y "description".`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: locationSchema,
        },
    });
    return parseJsonResponse(response.text);
};


export const generateNarrativeField = async (
    fieldType: string,
    context: { lore?: Lore | null; character?: CharacterProfile | null, story?: Story | null, characters?: CharacterProfile[], location?: Location | null }
): Promise<{ text: string }> => {
    let prompt = '';
    const { lore, character, story, characters, location } = context;

    switch (fieldType) {
        // --- Lore ---
        case 'lore.genre':
            prompt = 'Sugiere un solo género de ficción interesante y específico. Responde solo con el nombre del género, nada más. Por ejemplo: "Cyberpunk gótico" o "Fantasía de pólvora".';
            break;
        case 'lore.rules':
            prompt = `Basado en el género "${richTextToString(lore?.genre) || 'fantasía'}", escribe 2 o 3 reglas fundamentales o leyes físicas que gobiernan este mundo. Sé conciso y creativo. Responde solo con el texto de las reglas.`;
            break;
        case 'lore.history':
            prompt = `Dado el género "${richTextToString(lore?.genre) || 'fantasía'}" y las reglas "${richTextToString(lore?.rules) || 'desconocidas'}", escribe un breve resumen (2-3 párrafos) de la historia de este mundo. Responde solo con el texto de la historia.`;
            break;
        // --- Location ---
        case 'location.name':
            prompt = `Dado un mundo de ficción con el género "${richTextToString(lore?.genre) || 'fantasía'}" y la siguiente descripción, sugiere un nombre creativo y evocador para el lugar.
            Descripción: "${richTextToString(location?.description) || 'Un lugar misterioso.'}"
            Responde solo con el nombre, nada más. La respuesta debe ser en español.`;
            break;
        case 'location.description':
            prompt = `Para un mundo de ficción con el género "${richTextToString(lore?.genre) || 'fantasía'}", escribe una breve y evocadora descripción (2-3 frases) en español para un lugar llamado "${richTextToString(location?.name) || 'Un nuevo lugar'}".
            Responde solo con el texto de la descripción.`;
            break;
        // --- Character Profile ---
        case 'character.name':
            prompt = `Sugiere un nombre de personaje único y evocador que encaje en un mundo de género "${richTextToString(lore?.genre) || 'misterio'}". Responde solo con el nombre.`;
            break;
        case 'character.age':
            prompt = `Para un personaje en un mundo de género "${richTextToString(lore?.genre) || 'misterio'}", sugiere una edad. Puede ser un número o una descripción como "Adolescente" o "Anciano". Responde solo con la edad.`;
            break;
        case 'character.species':
            prompt = `Para un mundo de género "${richTextToString(lore?.genre) || 'misterio'}", sugiere una especie o raza para un personaje. Sé creativo. Responde solo con el nombre de la especie.`;
            break;
        case 'character.occupation':
            prompt = `En un mundo de género "${richTextToString(lore?.genre) || 'misterio'}", ¿cuál podría ser una ocupación interesante para un personaje? Responde solo con la ocupación.`;
            break;
        // --- Character Psychology ---
        case 'character.psychology.archetype':
            prompt = `Sugiere un arquetipo de personaje junguiano (ej: Héroe, Sabio, Rebelde) que sea interesante para un mundo de género "${richTextToString(lore?.genre) || 'misterio'}". Responde solo con el arquetipo.`;
            break;
        case 'character.psychology.motivation':
            prompt = `Para un personaje con el arquetipo "${richTextToString(character?.psychology.archetype) || 'cualquiera'}" en un mundo de "${richTextToString(lore?.genre) || 'misterio'}", ¿cuál es su principal motivación? Responde en una frase corta.`;
            break;
        case 'character.psychology.fear':
            prompt = `Para un personaje con la motivación "${richTextToString(character?.psychology.motivation) || 'desconocida'}", ¿cuál es su mayor miedo? Responde en una frase corta.`;
            break;
        case 'character.psychology.virtues':
            prompt = `Describe en una lista corta (2-3 puntos) las principales virtudes de un personaje con arquetipo "${richTextToString(character?.psychology.archetype) || 'cualquiera'}".`;
            break;
        case 'character.psychology.flaws':
            prompt = `Describe en una lista corta (2-3 puntos) los principales defectos de un personaje con arquetipo "${richTextToString(character?.psychology.archetype) || 'cualquiera'}".`;
            break;
        // --- Character Backstory ---
        case 'character.backstory.origin':
            prompt = `Describe brevemente (1-2 frases) el origen o lugar de nacimiento de un personaje de la especie "${richTextToString(character?.species) || 'desconocida'}" en un mundo de "${richTextToString(lore?.genre) || 'misterio'}".`;
            break;
        case 'character.backstory.wound':
            prompt = `¿Qué evento traumático ("herida") en el pasado de ${richTextToString(character?.name) || 'el personaje'} define su miedo "${richTextToString(character?.psychology.fear) || 'desconocido'}" y su motivación "${richTextToString(character?.psychology.motivation) || 'desconocida'}"? Describe el evento en 1 o 2 frases.`;
            break;
        case 'character.backstory.journey':
            prompt = `Describe en 2-3 frases el viaje o camino que ${richTextToString(character?.name) || 'el personaje'} ha recorrido desde su "herida" hasta ahora.`;
            break;
        case 'character.backstory.initialState':
            prompt = `Describe en una frase el estado mental y situacional de ${richTextToString(character?.name) || 'el personaje'} al comienzo de la historia.`;
            break;
        // --- Character Skills/Limitations ---
        case 'character.skills':
            prompt = `Basado en la ocupación "${richTextToString(character?.occupation) || 'desconocida'}" y el trasfondo de ${richTextToString(character?.name) || 'el personaje'}, enumera 2-3 habilidades o talentos clave que posee.`;
            break;
        case 'character.limitations':
            prompt = `Basado en los defectos "${richTextToString(character?.psychology.flaws) || 'desconocidos'}" y la "herida" de ${richTextToString(character?.name) || 'el personaje'}, enumera 2-3 limitaciones o debilidades importantes.`;
            break;
        // --- Story ---
        case 'story.genre':
            prompt = `Basado en el género del mundo "${richTextToString(lore?.genre) || 'misterio'}", sugiere un subgénero más específico para una historia (ej: "Misterio detectivesco", "Aventura épica", "Romance prohibido"). Responde solo con el género.`;
            break;
        case 'story.stakes':
             const characterNames = (characters || []).map(c => richTextToString(c.name)).join(', ') || 'los protagonistas';
            prompt = `Para una historia de género "${richTextToString(story?.genre) || 'aventura'}" protagonizada por ${characterNames}, ¿qué podría estar en juego (stakes)? Sé dramático y conciso. Responde en una frase.`;
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

export const generateLocationImage = async (name: string, description: string, genre: string): Promise<string> => {
    const prompt = `Create a beautiful, atmospheric landscape image that visually represents a location in a ${genre} world.
    Location Name: "${name}"
    Description: "${description}"
    The image should be a wide, scenic view. Do not include any text, borders, or UI elements in the image.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data; // This is the base64 string
            }
        }
        throw new Error("No image data found in API response.");
    } catch (error) {
        console.error("Error generating location image:", error);
        throw error;
    }
};

export const generatePanelBackground = async (description: string): Promise<string> => {
    const prompt = `Generate a comic book background that accurately reflects this scene description: "${description}".

**CRITICAL INSTRUCTIONS:**
1.  **THEME AND CONTEXT ARE KEY:** The generated background MUST match the theme and context provided in the scene description. For example, if the description mentions a city street, draw a city street, not a fantasy landscape.
2.  **IGNORE CHARACTERS:** The description might mention characters (e.g., "a robot," "a hero"). You MUST ignore them. Your task is to create ONLY the environment. Do NOT draw any people, creatures, robots, animals, silhouettes, or figures.
3.  **ART STYLE:** The style must be a simple, modern cartoon aesthetic. Use vibrant and colorful flat colors with bold, clean black outlines. Avoid photorealism, gradients, and complex textures.
4.  **NO TEXT:** The image must be completely free of any text, logos, or user interface elements.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data; // This is the base64 string
            }
        }
        throw new Error("No image data found in API response for background.");
    } catch (error) {
        console.error("Error generating panel background:", error);
        // Return a transparent pixel as a fallback to not break the comic layout
        return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    }
};