/** Server-only env checks for LLM features. */

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/** Anthropic API key (console.anthropic.com) — not the same as a Claude Pro subscription. */
export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** Whisper STT — OpenAI only today. */
export function isWhisperAvailable(): boolean {
  return isOpenAIConfigured();
}

/** "Extract insights" + follow-up drafts: Claude or OpenAI. */
export function isTextAiConfigured(): boolean {
  return isAnthropicConfigured() || isOpenAIConfigured();
}

export const OPENAI_WHISPER_SETUP_MESSAGE =
  "Voice transcription needs OPENAI_API_KEY (Whisper). Add it to your environment, restart the dev server, or type/paste the transcript instead. Keys: https://platform.openai.com/api-keys";

export const TEXT_AI_SETUP_MESSAGE =
  "Add ANTHROPIC_API_KEY (Claude) or OPENAI_API_KEY for \"Extract insights\" and follow-up drafts. Anthropic: https://console.anthropic.com/ — Claude Pro (claude.ai) does not include API access; create an API key separately.";