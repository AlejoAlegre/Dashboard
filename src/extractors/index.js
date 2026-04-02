const { extractPDF }  = require('./pdf');
const { extractDOCX } = require('./docx');
const { extractPPTX } = require('./pptx');
const { extractTXT }  = require('./txt');

const SUPPORTED_TYPES = {
  'application/pdf': extractPDF,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': extractDOCX,
  'application/msword': extractDOCX,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': extractPPTX,
  'application/vnd.ms-powerpoint': extractPPTX,
  'text/plain': extractTXT,
};

const EXTENSION_MAP = {
  '.pdf':  'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc':  'application/msword',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt':  'application/vnd.ms-powerpoint',
  '.txt':  'text/plain',
};

async function extractText(file) {
  const ext = require('path').extname(file.originalname).toLowerCase();
  const mimeType = EXTENSION_MAP[ext] || file.mimetype;
  const extractor = SUPPORTED_TYPES[mimeType];

  if (!extractor) {
    throw new Error(`Formato no soportado: ${ext}. Use PDF, DOCX, PPTX o TXT.`);
  }

  const text = await extractor(file.buffer);
  return {
    filename: file.originalname,
    text: text.trim(),
    type: ext.replace('.', '').toUpperCase(),
  };
}

module.exports = { extractText, SUPPORTED_TYPES, EXTENSION_MAP };
