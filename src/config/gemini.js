const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  logger.warn('GEMINI_API_KEY is not defined in environment variables. AI operations will fail.');
}

const genAI = new GoogleGenerativeAI(apiKey || 'mock_key');

const geminiPro = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL_PRO || 'gemini-1.5-pro'
});

const geminiFlash = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL_FLASH || 'gemini-1.5-flash'
});

module.exports = {
  genAI,
  geminiPro,
  geminiFlash
};
