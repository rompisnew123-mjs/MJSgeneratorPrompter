
import { GoogleGenAI, Type } from "@google/genai";
import { PromptDetails } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        "style": { "type": Type.STRING, "description": "Visual style of the image, e.g., 'realistic photo', 'anime', 'cyberpunk art'." },
        "lighting": { "type": Type.STRING, "description": "Description of the lighting, e.g., 'cinematic lighting', 'neon glow'." },
        "effect": { "type": Type.STRING, "description": "Special effects in the image, e.g., 'depth of field', 'lens flare'." },
        "outfit": { "type": Type.STRING, "description": "Detailed description of the character's outfit." },
        "face": { "type": Type.STRING, "description": "Description of the character's facial features and expression." },
        "background": { "type": Type.STRING, "description": "Detailed description of the background scene." },
        "camera": { "type": Type.STRING, "description": "Camera type, angle, or lens, e.g., 'close-up shot', 'wide angle'." },
        "editing": { "type": Type.STRING, "description": "Post-processing or quality keywords, e.g., 'highly detailed', '4K'." },
    },
};


const callGeminiAPI = async (prompt: string): Promise<PromptDetails> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });

    const text = response.text;
    if (!text) throw new Error("AI response was empty or invalid.");

    try {
        const parsedJson = JSON.parse(text);
        return parsedJson as PromptDetails;
    } catch (e) {
        console.error("Failed to parse AI JSON response:", text, e);
        throw new Error("Could not understand the AI's response.");
    }
}

export const expandIdeaWithAI = (idea: string): Promise<PromptDetails> => {
    const prompt = `You are a creative assistant for an AI image generator. Take the user's simple idea and expand it into a detailed prompt. Be creative and imaginative. Break down the details into the provided JSON schema. User's idea: "${idea}"`;
    return callGeminiAPI(prompt);
};

export const refineDetailsWithAI = (currentDetails: Partial<PromptDetails>): Promise<PromptDetails> => {
    const prompt = `You are a creative assistant for an AI image generator. Take the user's existing prompt details and make them more vivid, creative, and detailed. Enhance each category where possible. Return the refined details in the provided JSON schema. User's current details: ${JSON.stringify(currentDetails)}`;
    return callGeminiAPI(prompt);
};
