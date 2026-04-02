const mammoth = require('mammoth');

async function extractDOCX(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

module.exports = { extractDOCX };
