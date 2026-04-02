import { AIChatMessage } from '../types';

interface GenerateAIResponseOptions {
  apiKey: string;
  model: string;
  prompt: string;
  context?: string;
  conversationHistory?: AIChatMessage[];
}

const buildPrompt = (prompt: string, context?: string, conversationHistory: AIChatMessage[] = []) => {
  const recentHistory = conversationHistory
    .slice(0, -1)
    .slice(-6)
    .map(message => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.text}`)
    .join('\n');

  return `
You are an intelligent assistant for an academic chair using a project-management tool.
Your job is to help the user make decisions, draft communications, summarize risk, and turn current data into practical next steps.

Rules:
- Use only the supplied context and conversation history. Do not invent facts, names, deadlines, or metrics.
- Lead with the most urgent issues first when relevant.
- Be concrete. Refer to actual projects, tasks, people, courses, or service commitments from the context.
- When helpful, organize the response into short sections like "Top Priorities", "Recommended Next Steps", "Draft", or "Risks".
- If the user asks for drafted content, write it in a polished, ready-to-use tone.
- If the request is ambiguous, make the best reasonable interpretation from the context instead of asking follow-up questions.
- Keep the response concise but genuinely useful.

Conversation History:
${recentHistory || 'No prior conversation in this session.'}

Live App Context:
${context || 'No specific context provided.'}

User Request:
${prompt}
  `.trim();
};

const extractOutputText = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const candidate = payload as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        text?: string;
      }>;
    }>;
  };

  if (typeof candidate.output_text === 'string' && candidate.output_text.trim()) {
    return candidate.output_text.trim();
  }

  const contentText =
    candidate.output
      ?.flatMap(item => item.content ?? [])
      .map(item => item.text?.trim())
      .filter((text): text is string => Boolean(text))
      .join('\n')
      .trim() ?? '';

  return contentText;
};

const extractErrorMessage = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) {
    return null;
  }

  const error = (payload as { error?: { message?: string } }).error;
  return typeof error?.message === 'string' ? error.message : null;
};

export const generateAIResponse = async ({
  apiKey,
  model,
  prompt,
  context,
  conversationHistory = [],
}: GenerateAIResponseOptions): Promise<string> => {
  if (!apiKey.trim()) {
    return 'OpenAI API key is missing. Add it in Settings to use ChatGPT.';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.trim(),
        input: buildPrompt(prompt, context, conversationHistory),
      }),
    });

    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      const message = extractErrorMessage(payload);

      if (response.status === 401) {
        return 'OpenAI rejected the API key. Update it in Settings and try again.';
      }

      if (response.status === 429) {
        return 'OpenAI rate-limited this request. Wait a moment and try again.';
      }

      return message || 'OpenAI could not complete this request right now.';
    }

    const text = extractOutputText(payload);
    return text || "I couldn't generate a response.";
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return 'Sorry, I encountered an error while contacting OpenAI.';
  }
};
