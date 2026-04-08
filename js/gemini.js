/**
 * gemini.js — Gemini AI Image Generation
 * API key is now loaded from environment/config, NOT hardcoded.
 * For production, move this to a Supabase Edge Function.
 */

// Load API key from a non-committed config or environment
// In production, this should be a server-side Edge Function call
const GEMINI_API_KEY = window.__CAMPUSLOOT_CONFIG__?.GEMINI_API_KEY || '';
const GEMINI_IMAGE_URL = GEMINI_API_KEY 
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`
  : '';

/**
 * Generate a promotional banner image using Gemini 2.5 Flash
 * @param {string} title 
 * @param {string} brand 
 * @param {string} category 
 * @returns {Promise<string|null>} Base64 encoded image string or null
 */
export async function generateDealImage(title, brand, category) {
  if (!GEMINI_API_KEY) {
    console.warn('[Gemini] API key not configured. Skipping image generation.');
    return null;
  }

  const categoryStyles = {
    software: 'dark tech aesthetic, circuit board patterns, neon blue and purple tones, premium software vibe',
    food:     'warm and vibrant, cinematic food photography lighting, appetizing colors, orange and red, restaurant mood',
    courses:  'clean academic aesthetic, books and graduation elements, calm blue and gold tones, modern learning',
    ott:      'cinematic dark background, glowing neon screens, futuristic entertainment vibe',
    other:    'modern minimal gradient background, premium product photography studio style, soft lighting'
  };

  const style = categoryStyles[category] || categoryStyles.other;
  const prompt = `Create a high quality, 16:9 premium promotional banner background image for a deal. 
Brand: ${brand}. Deal Title: ${title}. 
Visual style: ${style}. 
CRITICAL REQUIREMENT: Do NOT include any text, typography, letters, words, or numbers in the image at all. It must be a pure graphical/visual scene only.`;

  try {
    const response = await fetch(GEMINI_IMAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"]
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      return null;
    }

    const data = await response.json();
    if (data.candidates && data.candidates[0].content.parts) {
      const imagePart = data.candidates[0].content.parts.find(part => part.inlineData);
      if (imagePart) {
        return imagePart.inlineData.data;
      }
    }
  } catch (error) {
    console.error('Failed to generate image with Gemini:', error);
  }
  return null;
}

/**
 * Convert a base64 string to a Blob for uploading
 * @param {string} base64 
 * @param {string} mimeType 
 * @returns {Blob}
 */
export function base64ToBlob(base64, mimeType = 'image/png') {
  const byteCharacters = atob(base64);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  
  return new Blob(byteArrays, { type: mimeType });
}
