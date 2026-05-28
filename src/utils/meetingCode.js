const crypto = require('crypto');

/**
 * Generates a cryptographically random, non-sequential 8-character alphanumeric meeting code.
 * Format: ABC-DEF-GH (or just 8 characters, or hyphenated like abc-defg-hij. Let's do a clean 8-char code.
 * To make it easy to type, we can avoid ambiguous characters or just use standard uppercase alphanumeric.
 * @returns {string} 8-character meeting code
 */
const generateMeetingCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
};

module.exports = generateMeetingCode;
