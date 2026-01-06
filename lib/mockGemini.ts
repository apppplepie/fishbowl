// lib/mockGemini.ts
// A lightweight mock for Gemini API calls.
// Replace real Gemini calls with these functions in the UI so the app can run without an API key.

export async function generateText(prompt: string) {
  // Simple deterministic mock — can be expanded to use local templates or randomness
  return {
    id: 'mock-1',
    prompt,
    text: `Mocked response for: ${prompt.slice(0,120)}`,
    createdAt: new Date().toISOString()
  };
}

export async function generateImage(prompt: string) {
  // Return a data URL placeholder SVG
  const svgPlaceholder = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">Placeholder Image</text></svg>`;
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgPlaceholder)}`;
  
  return {
    id: 'mock-img-1',
    prompt,
    url: dataUrl
  };
}
