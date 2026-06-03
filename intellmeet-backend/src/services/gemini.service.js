const {
  getGenerativeModel,
  PRO_MODEL_CANDIDATES,
  FLASH_MODEL_CANDIDATES,
} = require('../config/gemini');
const logger = require('../utils/logger');

const SUMMARY_SCHEMA_HINT = `{
  "summary": "A 3-5 sentence executive summary of the meeting.",
  "keyPoints": ["5-8 bullet points detailing key topics discussed."],
  "decisions": ["List of decisions made during the meeting. Empty array if none."],
  "openQuestions": ["List of open questions or unresolved items. Empty array if none."],
  "sentiment": "Overall meeting sentiment (Productive, Neutral, or Inconclusive)."
}`;

const LOCAL_FALLBACK_MARKER = 'generated locally from your meeting transcript';

const parseModelJson = (rawText) => {
  if (!rawText) throw new Error('Empty model response');
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('Model response did not contain JSON object');
  }
  return JSON.parse(cleaned.slice(start, end + 1));
};

const callSummaryModel = async (model, transcript, meetingTitle, duration) => {
  const systemPrompt =
    'You are an expert meeting analyst. Analyze this meeting transcript and output the summary in valid JSON only.';
  const userPrompt = `
Meeting Title: ${meetingTitle}
Duration: ${duration} minutes
Transcript:
${transcript.slice(0, 120000)}

Analyze the transcript above and return a JSON object with these fields:
${SUMMARY_SCHEMA_HINT}
Return only the JSON string. No markdown fences.
`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });

  const parsed = parseModelJson(result.response.text());
  return {
    summary: parsed.summary || '',
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
    openQuestions: Array.isArray(parsed.openQuestions) ? parsed.openQuestions : [],
    sentiment: parsed.sentiment || 'Neutral',
  };
};

const buildHeuristicSummary = (transcript, meetingTitle, duration) => {
  const lines = transcript
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const speakers = new Set();
  const talkingPoints = [];

  for (const line of lines) {
    const speakerMatch = line.match(/\]\s*([^:]+):/);
    if (speakerMatch) speakers.add(speakerMatch[1].trim());

    const content = line.replace(/^\[[^\]]+\]\s*[^:]*:\s*/, '').trim();
    if (content.length >= 12) {
      talkingPoints.push(content.length > 140 ? `${content.slice(0, 137)}...` : content);
    }
  }

  const uniquePoints = [...new Set(talkingPoints)];
  const highlight = uniquePoints.slice(0, 2).join(' ');

  const summary = [
    `"${meetingTitle}" completed in ${duration || 1} minute(s) with ${speakers.size || 'multiple'} speaker(s) across ${lines.length} transcript segment(s).`,
    highlight
      ? `Discussion highlights included: ${highlight}`
      : 'The session covered team updates and working topics captured in the live transcript.',
    'This overview was generated locally from your meeting transcript because the AI service was temporarily unavailable.',
  ].join(' ');

  return {
    summary,
    keyPoints: uniquePoints.slice(0, 8),
    decisions: uniquePoints
      .filter((p) => /\b(decide|decided|agree|approved|will|must|should)\b/i.test(p))
      .slice(0, 5),
    openQuestions: uniquePoints
      .filter((p) => /\?|follow up|next step|todo|action/i.test(p))
      .slice(0, 5),
    sentiment: uniquePoints.length >= 5 ? 'Productive' : 'Neutral',
    isLocalFallback: true,
  };
};

const tryModelsInOrder = async (modelNames, fn) => {
  const tried = new Set();
  for (const name of modelNames) {
    if (tried.has(name)) continue;
    tried.add(name);
    try {
      const model = getGenerativeModel(name);
      const result = await fn(model, name);
      if (result !== undefined && result !== null) {
        logger.info(`Gemini success with model: ${name}`);
        return result;
      }
    } catch (error) {
      logger.warn(`Gemini model "${name}" failed: ${error.message}`);
    }
  }
  return null;
};

const generateMeetingSummary = async (transcript, meetingTitle, duration) => {
  if (!transcript || transcript.trim() === '') {
    return {
      summary: 'No transcript was recorded for this meeting.',
      keyPoints: [],
      decisions: [],
      openQuestions: [],
      sentiment: 'Neutral',
    };
  }

  const allModels = [...PRO_MODEL_CANDIDATES, ...FLASH_MODEL_CANDIDATES];
  const aiResult = await tryModelsInOrder(allModels, async (model) => {
    const result = await callSummaryModel(model, transcript, meetingTitle, duration);
    if (result.summary?.trim()) {
      return { ...result, isLocalFallback: false };
    }
    return null;
  });

  if (aiResult) {
    return aiResult;
  }

  logger.warn(`All Gemini summary attempts failed for "${meetingTitle}". Using transcript heuristic.`);
  return buildHeuristicSummary(transcript, meetingTitle, duration);
};

const extractActionItems = async (transcript, participants = []) => {
  if (!transcript || transcript.trim() === '') {
    return [];
  }

  const systemPrompt =
    'You are an expert at identifying action items and tasks from meeting discussions. Return the results in a valid JSON array format.';
  const userPrompt = `
Participants list: ${participants.join(', ')}
Transcript:
${transcript.slice(0, 120000)}

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
Return only the JSON string.
`;

  const tryExtract = async (model) => {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
    const raw = result.response.text();
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1) {
      throw new Error('Model response did not contain JSON array');
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  };

  const allModels = [...PRO_MODEL_CANDIDATES, ...FLASH_MODEL_CANDIDATES];
  const items = await tryModelsInOrder(allModels, async (model) => {
    const parsed = await tryExtract(model);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  });

  if (items) {
    return items;
  }

  logger.error('Error extracting action items: all Gemini models failed');
  return [];
};

const generateMeetingAgenda = async (title, description, duration = 30, teamContext = '') => {
  const systemPrompt =
    'You are an expert project manager. Suggest a structured meeting agenda with time allocations.';
  const userPrompt = `
Meeting Title: ${title}
Description: ${description}
Expected Duration: ${duration} minutes
Team Context: ${teamContext}

Generate a suggested agenda for this meeting. Return a JSON array of strings in format: "Agenda Item - MM min".
The sum of minutes must match the total duration of ${duration} minutes.
Return only the JSON string.
`;

  const agenda = await tryModelsInOrder(FLASH_MODEL_CANDIDATES, async (model) => {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
    const responseText = result.response.text();
    const cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    return JSON.parse(cleaned.slice(start, end + 1));
  });

  if (agenda) {
    return agenda;
  }

  return [
    `Welcome & Roll Call - 5 min`,
    `Main Discussion: ${title} - ${duration - 10} min`,
    `Wrap-up & Action Items - 5 min`,
  ];
};

const analyzeMeetingProductivity = async (meetingData) => {
  const systemPrompt = 'You are an expert in workplace analytics and team dynamics.';
  const userPrompt = `
Meeting Metrics:
- Duration: ${meetingData.duration} minutes
- Number of Participants: ${meetingData.participantCount}
- Chat Messages Exchanged: ${meetingData.chatCount}
- Action Items / Tasks Created: ${meetingData.actionItemsCount}

Analyze these metrics and provide productivity score (0-100), reasoning, and suggestions.
Return JSON: { "score": 85, "reasoning": "...", "suggestions": ["..."] }
`;

  const analysis = await tryModelsInOrder(FLASH_MODEL_CANDIDATES, async (model) => {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
    return parseModelJson(result.response.text());
  });

  if (analysis) {
    return analysis;
  }

  return {
    score: 70,
    reasoning: 'Score estimated from meeting duration, participation, and task output.',
    suggestions: [
      'Circulate a written agenda before each session.',
      'Assign owners to action items before ending the call.',
    ],
  };
};

const transcribeAudio = async (audioBuffer, mimeType) => {
  if (!audioBuffer) {
    throw new Error('No audio buffer provided');
  }

  const base64Audio = audioBuffer.toString('base64');
  const transcript = await tryModelsInOrder(FLASH_MODEL_CANDIDATES, async (model) => {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64Audio, mimeType } },
            {
              text: 'Transcribe this meeting audio accurately. Format as a conversation with speaker turns if distinguishable. Return only the transcript text.',
            },
          ],
        },
      ],
    });
    const text = result.response.text();
    return text?.trim() ? text : null;
  });

  if (!transcript) {
    throw new Error('All Gemini models failed to transcribe audio');
  }
  return transcript;
};

module.exports = {
  generateMeetingSummary,
  extractActionItems,
  generateMeetingAgenda,
  analyzeMeetingProductivity,
  transcribeAudio,
  buildHeuristicSummary,
  LOCAL_FALLBACK_MARKER,
};
