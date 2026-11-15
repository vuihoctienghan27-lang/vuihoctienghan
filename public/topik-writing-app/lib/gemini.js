import { GoogleGenerativeAI } from "@google/generative-ai";

let client = null;

/**
 * Returns a cached GoogleGenerativeAI client built from GEMINI_API_KEY.
 * Throws a clear error if the key is missing so API routes can surface
 * a useful 500 instead of a cryptic SDK failure.
 */
export function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }
  if (!client) {
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return client;
}

/**
 * Builds a model configured for strict JSON structured output.
 * `schema` follows the Gemini responseSchema format (a subset of OpenAPI).
 */
export function getJsonModel({   modelName = "gemini-flash-lite-latest", schema, systemInstruction }) {
  const genAI = getGeminiClient();
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      ...(schema ? { responseSchema: schema } : {}),
    },
  });
}
