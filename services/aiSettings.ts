const OPENAI_API_KEY_STORAGE_KEY = 'facultyone.ai.openai.api-key';
const OPENAI_MODEL_STORAGE_KEY = 'facultyone.ai.openai.model';

export const DEFAULT_OPENAI_MODEL = 'gpt-5-mini';

export interface AISettingsSnapshot {
  openAIApiKey: string;
  openAIModel: string;
}

export const OPENAI_MODEL_OPTIONS = [
  { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
] as const;

const supportsWindow = () => typeof window !== 'undefined';

export const loadOpenAIApiKey = () => {
  if (!supportsWindow()) {
    return '';
  }

  return window.localStorage.getItem(OPENAI_API_KEY_STORAGE_KEY) ?? '';
};

export const saveOpenAIApiKey = (apiKey: string) => {
  if (!supportsWindow()) {
    return;
  }

  const trimmedKey = apiKey.trim();

  if (!trimmedKey) {
    window.localStorage.removeItem(OPENAI_API_KEY_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(OPENAI_API_KEY_STORAGE_KEY, trimmedKey);
};

export const loadOpenAIModel = () => {
  if (!supportsWindow()) {
    return DEFAULT_OPENAI_MODEL;
  }

  const savedModel = window.localStorage.getItem(OPENAI_MODEL_STORAGE_KEY)?.trim();
  return savedModel || DEFAULT_OPENAI_MODEL;
};

export const saveOpenAIModel = (model: string) => {
  if (!supportsWindow()) {
    return;
  }

  const nextModel = model.trim() || DEFAULT_OPENAI_MODEL;
  window.localStorage.setItem(OPENAI_MODEL_STORAGE_KEY, nextModel);
};

export const clearOpenAISettings = () => {
  if (!supportsWindow()) {
    return;
  }

  window.localStorage.removeItem(OPENAI_API_KEY_STORAGE_KEY);
  window.localStorage.removeItem(OPENAI_MODEL_STORAGE_KEY);
};

export const buildAISettingsSnapshot = (apiKey: string, model: string): AISettingsSnapshot => ({
  openAIApiKey: apiKey.trim(),
  openAIModel: model.trim() || DEFAULT_OPENAI_MODEL,
});
