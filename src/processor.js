const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT, buildUserMessage } = require('./prompts');

const MAX_CHARS_PER_FILE = 80000;   // ~20k tokens per file
const MAX_TOTAL_CHARS   = 200000;   // ~50k tokens total

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function truncateText(text, maxChars) {
  if (text.length <= maxChars) return text;
  const half = Math.floor(maxChars / 2);
  return (
    text.slice(0, half) +
    `\n\n[... contenido truncado por longitud - ${Math.round((text.length - maxChars) / 1000)}k chars omitidos ...]\n\n` +
    text.slice(text.length - half)
  );
}

async function processDashboard(extractedFiles, onProgress) {
  // Truncate individual files if too long
  const files = extractedFiles.map(f => ({
    ...f,
    text: truncateText(f.text, MAX_CHARS_PER_FILE),
  }));

  // Check total length
  const totalChars = files.reduce((sum, f) => sum + f.text.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    const ratio = MAX_TOTAL_CHARS / totalChars;
    files.forEach(f => {
      f.text = truncateText(f.text, Math.floor(f.text.length * ratio));
    });
  }

  const userMessage = buildUserMessage(files);

  onProgress?.('Conectando con IA...');

  let fullText = '';

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  onProgress?.('Analizando contenido...');

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      fullText += event.delta.text;
    }
  }

  onProgress?.('Procesando resultado...');

  // Extract JSON from response
  const jsonStr = extractJSON(fullText);
  if (!jsonStr) {
    throw new Error('No se pudo extraer un JSON válido de la respuesta de la IA.');
  }

  let dashboardData;
  try {
    dashboardData = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(`JSON inválido recibido: ${err.message}`);
  }

  validateDashboard(dashboardData);
  return dashboardData;
}

function extractJSON(text) {
  // Remove markdown code fences if present
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  // Try direct parse first
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (_) {}

  // Find first { and last }
  const start = cleaned.indexOf('{');
  const end   = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = cleaned.slice(start, end + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch (_) {}
  }

  return null;
}

function validateDashboard(data) {
  if (!data.meta)    throw new Error('Falta el campo meta en el JSON');
  if (!data.hero)    throw new Error('Falta el campo hero en el JSON');
  if (!data.modules) throw new Error('Falta el campo modules en el JSON');

  const required = ['summary', 'concepts', 'map', 'errors', 'quiz', 'exec'];
  for (const mod of required) {
    if (!data.modules[mod]) {
      throw new Error(`Falta el módulo requerido: ${mod}`);
    }
  }
}

module.exports = { processDashboard };
