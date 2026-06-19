require('dotenv').config();
const { answerMeetingQuestion } = require('./src/services/gemini.service');

(async () => {
  try {
    const transcript = "[Host]: Welcome to the meeting! We are discussing the new AI initiative called Project Phoenix. [Participant]: Project Phoenix sounds great.";
    const question = "What is the name of the initiative the company is taking?";
    const answer = await answerMeetingQuestion(transcript, question);
    console.log("Answer:", answer);
  } catch (err) {
    console.error("Error:", err);
  }
})();
