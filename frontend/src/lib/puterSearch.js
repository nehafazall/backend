/**
 * Puter.js Web Search Utility for Claret AI
 * Uses Puter's free AI API for real-time web search
 */

let puterReady = false;
let puterInitPromise = null;

const initPuter = () => {
  if (puterInitPromise) return puterInitPromise;
  puterInitPromise = new Promise((resolve) => {
    // Load Puter.js from CDN if not already loaded
    if (window.puter) {
      puterReady = true;
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.onload = () => {
      puterReady = true;
      resolve(true);
    };
    script.onerror = () => {
      console.warn('Puter.js CDN failed to load');
      resolve(false);
    };
    document.head.appendChild(script);
  });
  return puterInitPromise;
};

/**
 * Perform a web search using Puter.js AI chat with web_search tool
 * @param {string} query - The search query
 * @returns {Promise<string>} - Search results as text
 */
export const puterWebSearch = async (query) => {
  try {
    const ready = await initPuter();
    if (!ready || !window.puter?.ai?.chat) {
      return '';
    }

    const response = await window.puter.ai.chat(
      `Search the web and provide a concise, factual summary about: ${query}. Focus on the most recent and relevant information. Include specific numbers, dates, and facts where available.`,
      {
        model: 'gpt-4o-mini',
        stream: false,
        tools: [{ type: 'web_search' }],
      }
    );

    // Extract the text from response
    if (typeof response === 'string') return response;
    if (response?.message?.content) {
      if (Array.isArray(response.message.content)) {
        return response.message.content.map(c => c.text || '').join('\n');
      }
      return response.message.content;
    }
    if (response?.text) return response.text;
    return '';
  } catch (e) {
    console.warn('Puter web search failed:', e);
    return '';
  }
};

/**
 * Check if a message likely needs web search
 */
export const needsWebSearch = (message) => {
  const searchTriggers = [
    'market trend', 'market update', 'news', 'today', 'latest',
    'current', 'price', 'forex', 'gold', 'oil', 'dollar', 'economy',
    'geopolitic', 'war', 'conflict', 'election', 'interest rate',
    'fed', 'central bank', 'inflation', 'gdp', 'unemployment',
    'stock', 'crypto', 'bitcoin', 'ethereum', 'regulatory',
    'what is happening', 'whats happening', "what's happening",
    'search', 'look up', 'find out', 'google',
    'competitor website', 'their latest', 'new promotion',
    'social media trend', 'content idea', 'marketing strategy',
    'real time', 'real-time', 'realtime',
  ];
  const lower = message.toLowerCase();
  return searchTriggers.some(t => lower.includes(t));
};
