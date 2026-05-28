const { geminiPro, geminiFlash } = require('../config/gemini');
const logger = require('../utils/logger');

/**
 * Generate a meeting summary using Gemini Pro with responseMimeType JSON.
 * @param {string} transcript 
 * @param {string} meetingTitle 
 * @param {number} duration 
 * @returns {Promise<Object>} Summary object
 */
const generateMeetingSummary = async (transcript, meetingTitle, duration) => {
  try {
    if (!transcript || transcript.trim() === '') {
      return {
        summary: 'No transcript was recorded for this meeting.',
        keyPoints: [],
        decisions: [],
        openQuestions: [],
        sentiment: 'Neutral'
      };
    }

    const systemPrompt = 'You are an expert meeting analyst. Analyze this meeting transcript and output the summary in a valid JSON format.';
    const userPrompt = `
      Meeting Title: ${meetingTitle}
      Duration: ${duration} minutes
      Transcript:
      ${transcript}

      Analyze the transcript above and return a JSON object with the following fields:
      {
        "summary": "A 3-5 sentence executive summary of the meeting.",
        "keyPoints": ["5-8 bullet points detailing key topics discussed."],
        "decisions": ["List of decisions made during the meeting. Empty array if none."],
        "openQuestions": ["List of open questions or unresolved items. Empty array if none."],
        "sentiment": "Overall meeting sentiment (Productive, Neutral, or Inconclusive)."
      }
      Do not wrap the JSON output in markdown formatting like \`\`\`json. Return only the JSON string.
    `;

    const result = await geminiPro.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    logger.error(`Error generating meeting summary: ${error.message}`);
    // Graceful fallback
    return {
      summary: `Fallback Summary: The meeting titled "${meetingTitle}" ran for ${duration} minutes. Summary generation failed due to an external service error.`,
      keyPoints: ['Key points could not be generated.'],
      decisions: [],
      openQuestions: [],
      sentiment: 'Neutral'
    };
  }
};

/**
 * Extract action items from a transcript using Gemini.
 * @param {string} transcript 
 * @param {Array<string>} participants 
 * @returns {Promise<Array>} List of action items
 */
const extractActionItems = async (transcript, participants = []) => {
  try {
    if (!transcript || transcript.trim() === '') {
      return [];
    }

    const systemPrompt = 'You are an expert at identifying action items and tasks from meeting discussions. Return the results in a valid JSON array format.';
    const userPrompt = `
      Participants list: ${participants.join(', ')}
      Transcript:
      ${transcript}

      Extract all explicit or implicit action items discussed in the transcript above. 
      Return a JSON array of objects. Minimum 1 item, maximum 20 items. 
      Each item must follow this schema:
      {
        "title": "Concise task name (e.g. Update Database Schema)",
        "description": "Detailed explanation of what needs to be done based on transcript context.",
        "assignee": "Name of the person responsible, matching the participants list exactly. Use 'Unassigned' if not mentioned.",
        "dueDate": "Suggested due date in YYYY-MM-DD format if mentioned, or null.",
        "priority": "Task priority based on discussion. Must be one of: high, medium, low."
      }
      Do not wrap the output in markdown formatting. Return only the JSON string.
    `;

    const result = await geminiPro.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    logger.error(`Error extracting action items: ${error.message}`);
    return [];
  }
};

/**
 * Generate a suggested meeting agenda based on metadata.
 * @param {string} title 
 * @param {string} description 
 * @param {number} duration 
 * @param {string} teamContext 
 * @returns {Promise<Array>} Suggested agenda items
 */
const generateMeetingAgenda = async (title, description, duration = 30, teamContext = '') => {
  try {
    const systemPrompt = 'You are an expert project manager. Suggest a structured meeting agenda with time allocations.';
    const userPrompt = `
      Meeting Title: ${title}
      Description: ${description}
      Expected Duration: ${duration} minutes
      Team Context: ${teamContext}

      Generate a suggested agenda for this meeting. Return a JSON array of strings in format: "Agenda Item - MM min" (e.g. ["Introductions & Icebreaker - 5 min", "Feature Walkthrough - 15 min"]).
      The sum of minutes must match the total duration of ${duration} minutes.
      Do not wrap the output in markdown formatting. Return only the JSON string.
    `;

    const result = await geminiFlash.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    logger.error(`Error generating meeting agenda: ${error.message}`);
    return [`Welcome & Roll Call - 5 min`, `Main Discussion: ${title} - ${duration - 10} min`, `Wrap-up & Action Items - 5 min`];
  }
};

/**
 * Analyze meeting productivity based on basic counts.
 * @param {Object} meetingData - Object containing duration, participant count, actionItems count, chat count
 * @returns {Promise<Object>} Productivity report
 */
const analyzeMeetingProductivity = async (meetingData) => {
  try {
    const systemPrompt = 'You are an expert in workplace analytics and team dynamics.';
    const userPrompt = `
      Meeting Metrics:
      - Duration: ${meetingData.duration} minutes
      - Number of Participants: ${meetingData.participantCount}
      - Chat Messages Exchanged: ${meetingData.chatCount}
      - Action Items / Tasks Created: ${meetingData.actionItemsCount}

      Analyze these metrics and provide:
      1. A productivity score between 0 and 100.
      2. 2-3 sentences of reasoning behind this score.
      3. 2-3 bullet point suggestions for improving engagement or productivity in future meetings.

      Return the analysis in a valid JSON format:
      {
        "score": 85,
        "reasoning": "Detailed reasoning here.",
        "suggestions": ["Suggestion 1", "Suggestion 2"]
      }
      Do not wrap the output in markdown. Return only the JSON string.
    `;

    const result = await geminiFlash.generateContent({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    logger.error(`Error analyzing meeting productivity: ${error.message}`);
    return {
      score: 70,
      reasoning: 'Productivity analysis fallback due to service interruption.',
      suggestions: ['Ensure agenda is circulated beforehand.', 'Keep presentations brief to promote conversation.']
    };
  }
};

/**
 * Transcribe meeting audio buffer using Gemini 1.5 Flash (supporting multimodal audio)
 * @param {Buffer} audioBuffer - Audio buffer
 * @param {string} mimeType - e.g. 'audio/mp3', 'audio/wav'
 * @returns {Promise<string>} Transcription text
 */
const transcribeAudio = async (audioBuffer, mimeType) => {
  try {
    if (!audioBuffer) {
      throw new Error('No audio buffer provided');
    }

    const base64Audio = audioBuffer.toString('base64');
    const audioPart = {
      inlineData: {
        data: base64Audio,
        mimeType: mimeType
      }
    };

    const promptPart = {
      text: 'Transcribe this meeting audio accurately. Format as a conversation with speaker turns if distinguishable. Return only the transcript text.'
    };

    const result = await geminiFlash.generateContent({
      contents: [
        {
          role: 'user',
          parts: [audioPart, promptPart]
        }
      ]
    });

    return result.response.text();
  } catch (error) {
    logger.error(`Error transcribing audio with Gemini: ${error.message}`);
    throw error;
  }
};

module.exports = {
  generateMeetingSummary,
  extractActionItems,
  generateMeetingAgenda,
  analyzeMeetingProductivity,
  transcribeAudio
};
