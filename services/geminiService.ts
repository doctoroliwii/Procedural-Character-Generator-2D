import { GoogleGenAI, Type, Modality } from "@google/genai";
// FIX: Added import for Location type.
import type { Lore, CharacterProfile, Story, Location, RichText, NarrativeScript, StoryCircleStep } from '../types';

// API key is automatically provided by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const richTextToString = (value: RichText | undefined): string => value?.map(s => s.text).join('') || '';
// S-Fix: Add stringToRichText function
const stringToRichText = (text: string, source: 'user' | 'ai'): RichText => [{ text, source }];

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

const narrativeScriptSchema = {
  type: Type.OBJECT,
  properties: {
    theme: { type: Type.STRING },
    scene: { type: Type.STRING },
    characterList: {
      type: Type.ARRAY,
      description: "Una lista de los personajes únicos en la historia.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER, description: "ID basado en 0 del personaje." },
          name: { type: Type.STRING },
          description: { type: Type.STRING, description: "Breve descripción del personaje." }
        },
        required: ["id", "name", "description"]
      }
    },
    pages: {
      type: Type.ARRAY,
      description: "Un array de páginas de cómic.",
      items: {
        type: Type.OBJECT,
        properties: {
          pageNumber: { type: Type.INTEGER },
          context: { type: Type.STRING },
          panels: {
            type: Type.ARRAY,
            description: "Un array de viñetas dentro de esta página.",
            items: {
              type: Type.OBJECT,
              properties: {
                panelNumber: { type: Type.INTEGER },
                description: { type: Type.STRING },
                emotion: { type: Type.STRING },
                dialogues: {
                  type: Type.ARRAY,
                  description: "Diálogos en esta viñeta. Puede estar vacío.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      characterId: { type: Type.INTEGER, description: "ID basado en 0 del personaje que habla." },
                      text: { type: Type.STRING }
                    },
                    required: ["characterId", "text"]
                  }
                },
                shotType: { type: Type.STRING, description: "p. ej., 'plano general', 'plano medio', 'primer plano'." },
                techNotes: { type: Type.STRING, description: "Instrucciones para el generador de fondos." },
                dynamicAlt: { type: Type.STRING, description: "Una alternativa coherente para la viñeta." },
                charactersInPanel: {
                  type: Type.ARRAY,
                  description: "Array de IDs (basados en 0) de los personajes en la viñeta.",
                  items: { type: Type.INTEGER }
                }
              },
              required: ["panelNumber", "description", "emotion", "dialogues", "shotType", "techNotes", "dynamicAlt", "charactersInPanel"]
            }
          }
        },
        required: ["pageNumber", "context", "panels"]
      }
    }
  },
  required: ["theme", "scene", "pages", "characterList"]
};

export const generateComicScript = async (theme: string, scene: string, numPages: number, language: string, numCharacters: number, characterNames: string[] = []): Promise<NarrativeScript> => {
  const languageMap: Record<string, string> = { es: 'español', en: 'inglés', ja: 'japonés', zh: 'chino', ru: 'ruso', hi: 'hindi' };
  const languageName = languageMap[language] || 'español';
  const characterNamesPrompt = characterNames.length > 0 ? `Usa estos nombres de personaje: ${characterNames.join(', ')}.` : 'Inventa nombres para los personajes.';

  const prompt = `Eres un guionista estructural de cómics en ${languageName}.
Tu tarea es generar un guion narrativo por página y por viñeta.
El guion debe tener una narrativa estructurada con coherencia visual y técnica.
Debe haber exactamente ${numCharacters} personajes únicos en toda la historia.
${characterNamesPrompt}

Parámetros de entrada:
- theme: "${theme}"
- scene: "${scene}"
- pages: ${numPages}

Instrucciones creativas:
- Cada página es un bloque narrativo (inicio, desarrollo, desenlace parcial).
- Cada viñeta es una unidad de acción o diálogo. Usa humor y ritmo.
- La historia debe ser continua a lo largo de las páginas si 'pages' > 1.

Contenido de cada viñeta:
- description: Qué se ve (acción visual concreta).
- emotion: Tono o sentimiento dominante.
- dialogues: Un array de objetos de diálogo. Cada objeto debe tener 'characterId' (un entero basado en 0, de 0 a ${numCharacters - 1}) y 'text'. Asigna los diálogos a los personajes de forma coherente.
- shotType: Tipo de plano sugerido (p. ej., 'plano general', 'plano medio', 'primer plano', 'detalle', 'plano americano').
- techNotes: Instrucciones para el generador de fondo IA (p. ej., "Horizonte bajo, 25% superior despejado para cielo.").
- dynamicAlt: Una alternativa dinámica y coherente para la viñeta.
- charactersInPanel: Un array con los 'characterId' de todos los personajes presentes en la viñeta, incluso si no hablan.

Formato de Salida:
- La salida debe ser un único objeto JSON que se ajuste al esquema proporcionado.
- El JSON debe tener una clave 'pages' que sea un array de ${numPages} objetos de página.
- Además, incluye una clave 'characterList' en el objeto JSON principal. Debe ser un array de objetos, donde cada objeto representa un personaje único y contiene 'id' (entero basado en 0), 'name' (string) y 'description' (una breve descripción de su apariencia o personalidad). El número de personajes en esta lista debe coincidir con ${numCharacters}.
- El theme y scene de entrada deben reflejarse en el JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: narrativeScriptSchema,
      },
    });
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

export const getTrendsForCountry = async (countryName: string): Promise<{ title: string; summary: string; }[]> => {
  const prompt = `Using Google Search, find the top 5 real, current trending search topics in ${countryName} right now.
For each topic, provide a concise title and a one-sentence summary in Spanish.
The topics should be interesting, specific, and suitable for a comic strip theme (e.g., "Chilean national holiday food preparations", "unexpected winter snow in Santiago", not just "news" or "weather").
Return the answer ONLY as a valid JSON array of objects. Each object must have a "title" and a "summary" key. Do not include any other text, markdown, or explanations.

Example format:
[
  {"title": "Ola de frío en el sur", "summary": "Una inesperada ola de frío polar afecta a la Patagonia, dejando postales de nieve en lugares inusuales."},
  {"title": "Nuevo descubrimiento astronómico", "summary": "Astrónomos chilenos descubren un exoplaneta con características similares a la Tierra desde el observatorio Paranal."}
]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
      },
    });
    // The model with search grounding might return markdown with a JSON block.
    // parseJsonResponse is designed to handle this.
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

export const generateSceneDescription = async (theme: string, language: string): Promise<string> => {
  const languageMap: Record<string, string> = {
    es: 'español',
    en: 'inglés',
    ja: 'japonés',
    zh: 'chino',
    ru: 'ruso',
    hi: 'hindi',
  };
  const languageName = languageMap[language] || 'español';
  const prompt = `Describe una escena o lugar visualmente interesante en ${languageName} para una tira cómica con el tema: "${theme}".
  La descripción debe ser concisa (1-2 frases) y evocadora.
  Ejemplo: "Una concurrida calle de la ciudad por la noche, con letreros de neón reflejándose en los charcos."
  Responde solo con la descripción de la escena, sin texto adicional.`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text.trim().replace(/^"|"$/g, '');
  } catch (error) {
    console.error("Error generating scene description:", error);
    throw error;
  }
};


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
    
    // The API returns string fields. We need to convert them to RichText to match the return type
    // and fall back to existing data if the API doesn't return a value for a field.
    const toRichText = (value: unknown): RichText | undefined => {
      if (typeof value === 'string' && value.trim()) {
        return stringToRichText(value, 'ai');
      }
      return undefined;
    };

    const psychology = result.psychology || {};
    const backstory = result.backstory || {};
    
    return {
        name: toRichText(result.name) || partialProfile.name,
        age: toRichText(result.age) || partialProfile.age,
        species: toRichText(result.species) || partialProfile.species,
        occupation: toRichText(result.occupation) || partialProfile.occupation,
        originLocationId: result.originLocationId || partialProfile.originLocationId,
        skills: toRichText(result.skills) || partialProfile.skills,
        limitations: toRichText(result.limitations) || partialProfile.limitations,
        psychology: {
            motivation: toRichText(psychology.motivation) || partialProfile.psychology.motivation,
            fear: toRichText(psychology.fear) || partialProfile.psychology.fear,
            virtues: toRichText(psychology.virtues) || partialProfile.psychology.virtues,
            flaws: toRichText(psychology.flaws) || partialProfile.psychology.flaws,
            archetype: toRichText(psychology.archetype) || partialProfile.psychology.archetype,
        },
        backstory: {
            origin: toRichText(backstory.origin) || partialProfile.backstory.origin,
            wound: toRichText(backstory.wound) || partialProfile.backstory.wound,
            journey: toRichText(backstory.journey) || partialProfile.backstory.journey,
            initialState: toRichText(backstory.initialState) || partialProfile.backstory.initialState,
        },
    };
};


export const generateStory = async (lore: Lore, characters: CharacterProfile[], genre: RichText, stakes: RichText): Promise<{ storyCircle: StoryCircleStep[] }> => {
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

export const generateComicScriptFromStory = async (storyCircle: StoryCircleStep[], lore: Lore, characters: CharacterProfile[], numPanels: number, language: string, scene: string): Promise<NarrativeScript> => {
    const characterMap = new Map(characters.map(c => [c.id, c]));
    const charactersInStory = characters;
    const characterSummaries = charactersInStory.map((c, index) => `ID ${index}: ${richTextToString(c.name)}. PSICOLOGÍA: ${richTextToString(c.psychology.virtues)}, ${richTextToString(c.psychology.flaws)}.`).join('\n');
    const languageMap: Record<string, string> = { es: 'español', en: 'inglés', ja: 'japonés', zh: 'chino', ru: 'ruso', hi: 'hindi' };
    const languageName = languageMap[language] || 'español';

    const prompt = `Eres un guionista estructural de cómics en ${languageName}.
    Tu tarea es adaptar la siguiente historia a un guion de cómic de una sola página con ${numPanels} viñetas.

    UNIVERSO: ${richTextToString(lore.genre)}. ${richTextToString(lore.rules)}
    ESCENA: "${scene}"
    PERSONAJES:
    ${characterSummaries}
    
    HISTORIA A ADAPTAR (en 8 pasos):
    ${storyCircle.map(s => `${s.step}. ${s.title}: ${s.description}`).join('\n')}
    
    TAREA:
    - Adapta la historia a un guion de ${numPanels} viñetas. Distribuye los 8 pasos de la historia de forma lógica.
    - El guion debe ser coherente, con personajes consistentes.
    - Debe haber exactamente ${charactersInStory.length} personajes únicos en toda la historia.
    
    Contenido de cada viñeta:
    - description: Qué se ve (acción visual concreta).
    - emotion: Tono o sentimiento dominante.
    - dialogues: Un array de objetos de diálogo. Cada objeto debe tener 'characterId' (un entero basado en 0) y 'text'. Asigna los diálogos a los personajes de forma coherente.
    - shotType: Tipo de plano sugerido (p. ej., 'plano general', 'plano medio').
    - techNotes: Instrucciones para el generador de fondo IA (p. ej., "Horizonte bajo, 25% superior despejado.").
    - dynamicAlt: Una alternativa dinámica y coherente para la viñeta.
    - charactersInPanel: Un array con los 'characterId' de todos los personajes presentes en la viñeta.

    Formato de Salida:
    - La salida debe ser un único objeto JSON que se ajuste al esquema proporcionado.
    - El JSON debe tener una clave 'pages' que sea un array con UNA SOLA página.
    - El theme y scene de entrada deben reflejarse en el JSON.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: narrativeScriptSchema,
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
    const prompt = `Eres un compositor visual experto en arte secuencial. Tu tarea es generar un fondo de cómic para un plano general donde los personajes deben integrarse visualmente a escala humana dentro de la escena.
El fondo será usado por un sistema que superpone personajes en el 75 % inferior de la viñeta, dejando el 25 % superior para bocadillos de diálogo.

**DESCRIPCIÓN DE LA ESCENA:** "${description}"

**🧩 Instrucciones de composición (plano general)**

**Estructura de imagen (zonas):**
- **25 % superior:** Cielo, nubes o cimas lejanas de montañas. Sin elementos importantes ni horizonte.
- **75 % inferior:** Zona de acción y personajes. La línea del suelo debe ubicarse en el tercio inferior exacto de toda la imagen.
- **Horizonte:** Coloca el horizonte entre 1/3 y 2/5 de la altura total, siguiendo la ley de tercios y la sección áurea (φ ≈ 0.618). Esto crea un equilibrio visual natural.

**Escala y perspectiva humana:**
- Imagina que los personajes medirán entre 1,6 y 1,8 m y ocuparán aproximadamente la mitad del alto del área de acción (75 %).
- Los objetos del entorno (bancos, árboles, senderos, autos, postes) deben dimensionarse coherentemente con esa escala.
- El punto de fuga principal debe estar a la altura de los ojos humanos, ligeramente por debajo del centro vertical.

**Reglas de composición avanzadas:**
- **Ley de tercios:** los elementos clave (bancos, caminos, árboles principales) deben alinearse con las líneas o intersecciones de los tercios.
- **Guía Visual:** Si usas curvas o diagonales, que sigan la espiral dorada para guiar la mirada hacia el centro donde estarán los personajes.
- Mantén la dirección del recorrido visual desde el primer plano (abajo) hacia el fondo.

**Estilo visual:**
- Estilo dibujo animado moderno, colores planos, contornos negros limpios.
- Perspectiva coherente y sin distorsión angular.
- Evita cualquier sombra o profundidad exagerada que distraiga.
- **Importante:** No incluyas figuras humanas, animales ni siluetas.

**Compatibilidad con planos cerrados:**
- Asegúrate de que el fondo pueda reencuadrarse (crop y zoom central superior) sin perder coherencia visual. Esto permite generar primeros planos aplicando un zoom y blur suave sobre la parte superior central de la imagen.`;

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

export const generateVariantPanelBackground = async (baseImageB64: string, description: string): Promise<string> => {
    const prompt = `Usando la imagen proporcionada como referencia ESTRICTA para el estilo artístico y la ubicación, genera un nuevo fondo de cómic que se ajuste a esta nueva descripción de escena: "${description}".

**REGLAS CRÍTICAS (OBLIGATORIAS):**

1.  **MANTENER ESTILO:** El estilo (colores planos, contornos negros definidos) debe ser idéntico al de la imagen de referencia.
2.  **NO INCLUIR PERSONAJES:** No dibujes personas, criaturas, siluetas o figuras. El escenario debe estar vacío.
3.  **RESPETAR COMPOSICIÓN AVANZADA:** Sigue las mismas reglas de composición que la imagen original. La acción principal, los objetos clave y la línea del suelo deben permanecer en el 75% inferior de la imagen. El 25% superior debe estar despejado (cielo, etc.) para los diálogos. El horizonte debe estar bajo (tercio inferior de la imagen).
4.  **ESCALA COHERENTE:** Asegúrate de que los nuevos elementos en la escena mantengan la misma escala y perspectiva que la imagen de referencia, para que los personajes se integren correctamente.

El objetivo es crear una variación de la escena que se sienta como si estuviera en el mismo lugar y momento, pero con un ángulo o enfoque ligeramente diferente según la descripción.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/png', data: baseImageB64 } },
                    { text: prompt }
                ],
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
        throw new Error("No image data found in API response for variant background.");
    } catch (error) {
        console.error("Error generating variant panel background:", error);
        // Fallback to a transparent pixel
        return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    }
};

export const generateFullComicPanelImage = async (
    prompt: string, 
    aspectRatio: '1:1' | '16:9' | '9:16',
    referenceImageB64: string | null = null
): Promise<string> => {
    
    let fullPrompt = `${prompt}\nThe final image must have a precise aspect ratio of ${aspectRatio}.`;
    if (referenceImageB64) {
        fullPrompt += `\n\n**IMPORTANT FOR CONSISTENCY:** Use the provided reference image to maintain a consistent art style and character appearance. The new panel should depict a different moment or action as described in the prompt, but the characters and environment MUST look like they belong in the same scene as the reference image. Replicate the characters' clothing, hair, and features exactly as they appear in the reference.`;
    }

    const parts: any[] = [{ text: fullPrompt }];
    if (referenceImageB64) {
        parts.unshift({ inlineData: { mimeType: 'image/png', data: referenceImageB64 } });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data; // This is the base64 string
            }
        }
        throw new Error("No image data found in API response for full comic panel.");
    } catch (error) {
        console.error("Error generating full comic panel image:", error);
        // Fallback to a transparent pixel
        return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    }
};