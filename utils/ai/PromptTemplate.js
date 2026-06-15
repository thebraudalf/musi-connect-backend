import { Groq } from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

/**
 * @constant groq
 * Initializes the Groq SDK client using a secure API key from environment variables.
 * This instance acts as the bridge between your server and the Llama-3 model.
 */
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * @function generateChatCompetion
 * A service function that sends a structured prompt to the AI model and retrieves a text response.
 * 
 * @param {Function} promptToContext - A callback function that returns an object containing 
 * the 'content' string (the system instructions or user prompt).
 * 
 * 
 * @property {string} model - Specifies "llama-3.3-70b-versatile", a high-performance model 
 * optimized for conversational tasks and speed.
 * 
 * @property {number} temperature - Set to 1 for high creativity and varied responses, 
 * making the AI feel more natural and less repetitive.
 * 
 * @property {number} max_completion_tokens - Limits the response length to 1024 tokens 
 * to control API costs and response times.
 * 
 * @description `Error Handling`
 * Uses a try-catch block to prevent the server from crashing if the AI provider is 
 * unreachable or the API key is invalid, logging the error to the console.

* @returns {Promise<string>} The AI-generated message content or an empty string if it fails.
 */
export async function generateChatCompetion(promptToContext) {
  try {
    // prompt to give context
    if (promptToContext) {
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "system", content: promptToContext().content }],
        model: "llama-3.3-70b-versatile",
        temperature: 1,
        max_completion_tokens: 1024,
        top_p: 1,
        stop: null,
      });

      //console.log("Chat Completion Response: ", chatCompletion.choices[0]?.message.content || '');
      return chatCompletion.choices[0]?.message.content || "";
    }
  } catch (error) {
    console.log(error);
  }
}
