const { OpenAI } = require('openai');
const logger = require('../utils/logger');

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  logger.warn('OPENROUTER_API_KEY is not defined in environment variables. AI operations will fail.');
}

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: apiKey || 'mock_key',
});

const uniqueList = (items) => [...new Set(items.filter(Boolean))];

const PRO_MODEL_CANDIDATES = uniqueList([
  process.env.AI_MODEL_PRO,
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.5-flash-lite',
  'google/gemini-2.0-flash-lite-preview-02-05:free'
]);

const FLASH_MODEL_CANDIDATES = uniqueList([
  process.env.AI_MODEL_FLASH,
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.5-flash-lite',
  'google/gemini-2.0-flash-lite-preview-02-05:free'
]);

module.exports = {
  openai,
  PRO_MODEL_CANDIDATES,
  FLASH_MODEL_CANDIDATES,
};
