const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  logger.warn('GEMINI_API_KEY is not defined in environment variables. AI operations will fail.');
}

const genAI = new GoogleGenerativeAI(apiKey || 'mock_key');

const uniqueList = (items) => [...new Set(items.filter(Boolean))];

/** Ordered fallbacks — Gemini 1.5 names are shut down; try 2.5/2.0 next. */
const PRO_MODEL_CANDIDATES = uniqueList([
  process.env.GEMINI_MODEL_PRO,
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro-002',
]);

const FLASH_MODEL_CANDIDATES = uniqueList([
  process.env.GEMINI_MODEL_FLASH,
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-002',
]);

const getGenerativeModel = (modelName) => genAI.getGenerativeModel({ model: modelName });

module.exports = {
  genAI,
  getGenerativeModel,
  PRO_MODEL_CANDIDATES,
  FLASH_MODEL_CANDIDATES,
};
