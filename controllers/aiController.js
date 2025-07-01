const OpenAI = require("openai");
const dotenv = require('dotenv');
dotenv.config();

const openai = new OpenAI.OpenAI({ apiKey: process.env.OPENAI_KEY});

exports.generateQuestions = async (req, res) => {
  const { topic, count } = req.body;

  if (!topic || !count) return res.status(400).json({ error: "Topic and count are required" });

  const prompt = `Generate ${count} clear and professional survey questions about "${topic}". 
  Return them as a numbered list, one per line, without any explanations or formatting.`;

  try {
    const result = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that writes only clean, numbered survey questions.' },
        { role: 'user', content: prompt }
      ]
    });

    const rawText = result.choices[0].message.content;

    const questions = rawText
      .split('\n')
      .map(q => q.replace(/^\d+\.?\s*/, '').trim())
      .filter(Boolean);

    const formatted = questions.map(text => ({
      text,
      options: ["Strongly Agree", "Agree", "Neutral", "Disagree", "Strongly Disagree"]
    }));

    res.json({ questions: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate questions" });
  }
};

