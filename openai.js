import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askOpenAI(question) {
  try {
    const response = await openai.responses.create({
      model: "gpt-5-nano",
      input: question,
      store: true,
    });

    return response.output_text;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to get response from OpenAI");
  }
}