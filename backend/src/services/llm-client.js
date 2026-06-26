/**
 * llm-client.js
 * LLM integration for generating citizen advisory text.
 * Uses OpenAI by default — swap LLM_PROVIDER env var to switch.
 * Falls back to a static advisory message if LLM API fails.
 */

const OpenAI = require('openai');
const { GoogleGenAI } = require('@google/genai');

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai';
const LLM_API_KEY = process.env.LLM_API_KEY;

let openaiClient = null;
let geminiClient = null;
let defaultModel = 'gpt-4o-mini';

if (LLM_API_KEY) {
  if (LLM_PROVIDER === 'groq') {
    openaiClient = new OpenAI({ apiKey: LLM_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
    defaultModel = 'llama3-8b-8192';
  } else if (LLM_PROVIDER === 'gemini') {
    geminiClient = new GoogleGenAI({ apiKey: LLM_API_KEY });
    defaultModel = 'gemini-2.5-flash';
  } else {
    openaiClient = new OpenAI({ apiKey: LLM_API_KEY });
  }
}

// AQI category helper
function getAQICategory(aqi) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

function getRiskLevel(aqi) {
  if (aqi <= 100) return 'low';
  if (aqi <= 200) return 'moderate';
  if (aqi <= 300) return 'high';
  if (aqi <= 400) return 'very-high';
  return 'severe';
}

// Fallback static advisory messages (English + Hindi)
const FALLBACK_ADVISORY = {
  en: (location, aqi) =>
    `Air quality at ${location} is ${getAQICategory(aqi)} (AQI: ${aqi}). Please take necessary precautions. Sensitive groups should avoid outdoor activities. (Advisory service temporarily unavailable — this is a general message.)`,
  hi: (location, aqi) =>
    `${location} में वायु गुणवत्ता ${getAQICategory(aqi)} है (AQI: ${aqi})। कृपया आवश्यक सावधानियां बरतें। संवेदनशील समूहों को बाहरी गतिविधियों से बचना चाहिए। (परामर्श सेवा अस्थायी रूप से अनुपलब्ध है।)`,
};

/**
 * Generate a personalized health advisory using LLM.
 * @param {string} location - Zone name
 * @param {number} aqi - Current/predicted AQI
 * @param {string} query - User's question
 * @param {string} language - 'en' | 'hi'
 * @param {boolean} nearVulnerablePOI - If near hospital/school
 */
async function generateAdvisory({ location, aqi, query, language = 'en', nearVulnerablePOI = false }) {
  const aqiCategory = getAQICategory(aqi);
  const riskLevel = getRiskLevel(aqi);
  const urgencyNote = nearVulnerablePOI
    ? 'This area is near a hospital or school — extra caution is advised for children, elderly, and patients.'
    : '';

  if (!openaiClient && !geminiClient) {
    console.warn('[LLM] No LLM client configured — returning fallback advisory');
    const fallbackFn = FALLBACK_ADVISORY[language] || FALLBACK_ADVISORY.en;
    return { reply: fallbackFn(location, aqi), riskLevel };
  }

  const systemPrompt = language === 'hi'
    ? `आप एक उपयोगी वायु गुणवत्ता स्वास्थ्य सलाहकार हैं। हिंदी में संक्षिप्त, व्यावहारिक सलाह दें। AQI श्रेणी: ${aqiCategory}। ${urgencyNote}`
    : `You are a helpful air quality health advisor. Give concise, practical advice in English. AQI Category: ${aqiCategory}. ${urgencyNote}`;

  const userPrompt = `Location: ${location}. Current AQI: ${aqi} (${aqiCategory}). User question: "${query}"`;

  try {
    let reply = '';
    
    if (LLM_PROVIDER === 'gemini' && geminiClient) {
      // Using the official @google/genai SDK
      try {
        const response = await geminiClient.models.generateContent({
          model: defaultModel,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
            maxOutputTokens: 300,
          }
        });
        reply = response.text || '';
      } catch (apiErr) {
        if (apiErr.status === 503 && defaultModel === 'gemini-2.5-flash') {
          console.warn('[LLM] 503 Service Unavailable on 2.5-flash. Falling back to 1.5-flash via native SDK...');
          const fallbackResp = await geminiClient.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: userPrompt,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.7,
              maxOutputTokens: 300,
            }
          });
          reply = fallbackResp.text || '';
        } else {
          throw apiErr;
        }
      }
    } else if (openaiClient) {
      // Using OpenAI (or Groq) SDK
      let completion;
      try {
        completion = await openaiClient.chat.completions.create({
          model: defaultModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 300,
          temperature: 0.7,
        });
      } catch (apiErr) {
        if (apiErr.status === 503 && defaultModel === 'gemini-2.5-flash') {
          console.warn('[LLM] 503 Service Unavailable on 2.5-flash. Falling back to 1.5-flash...');
          completion = await openaiClient.chat.completions.create({
            model: 'gemini-1.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: 300,
            temperature: 0.7,
          });
        } else {
          throw apiErr;
        }
      }
      reply = completion.choices[0]?.message?.content || '';
    }

    return { reply, riskLevel };
  } catch (err) {
    console.error('[LLM] API call failed:', err.message);
    const fallbackFn = FALLBACK_ADVISORY[language] || FALLBACK_ADVISORY.en;
    return { reply: fallbackFn(location, aqi), riskLevel };
  }
}

module.exports = { generateAdvisory, getRiskLevel, getAQICategory };
