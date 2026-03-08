import OpenAI, { toFile } from "openai";
import { env } from "./env.js";

export const openai = new OpenAI({ apiKey: env.openaiApiKey });
export { toFile };
