import { config } from "../../../config/env.js";
import { logger } from "../../../utils/logger.js";

const fallbackSuggestions = [
  "Review the lesson content",
  "Ask your instructor for clarification",
  "Continue with the next activity",
];

const parseJsonResponse = (content) => {
  try {
    const parsed = JSON.parse(content);
    return {
      answer: String(parsed.answer || "").trim(),
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((item) => typeof item === "string").slice(0, 4)
        : [],
      confidence:
        typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
          ? parsed.confidence
          : 0.7,
    };
  } catch {
    return {
      answer: String(content || "").trim(),
      suggestions: [],
      confidence: 0.65,
    };
  }
};

export async function askAiTutor({ context, userQuestion, intent, messages = [] }) {
  if (!config.ai.openaiApiKey) {
    return {
      answer:
        "The AI tutor is not fully configured yet. I can see this lesson has context available, but the server needs an AI provider key before I can generate a grounded answer.",
      suggestions: fallbackSuggestions,
      confidence: 0.1,
    };
  }

  const systemPrompt =
    "You are CONFAB LMS AI Tutor. Use only the LMS context supplied by the server. Guide learning without doing assignments for the learner. Never override instructors, mentors, grades, or official content. Return JSON with answer, suggestions, confidence.";

  const recentMessages = messages
    .filter((message) => ["user", "assistant"].includes(message.role) && message.content)
    .slice(-6)
    .map((message) => ({
      role: message.role,
      content: String(message.content).slice(0, 1200),
    }));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.ai.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.ai.openaiModel,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Intent: ${intent || "general"}\n\nLMS context:\n${context}`,
        },
        ...recentMessages,
        { role: "user", content: userQuestion },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    logger.error("OpenAI tutor request failed", {
      status: response.status,
      body: errorText.slice(0, 500),
    });
    const error = new Error("AI tutor provider request failed");
    error.statusCode = 502;
    throw error;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content || "";
  const parsed = parseJsonResponse(content);
  return {
    answer: parsed.answer || "I could not generate a useful answer from the available context.",
    suggestions: parsed.suggestions.length ? parsed.suggestions : fallbackSuggestions,
    confidence: parsed.confidence,
  };
}
