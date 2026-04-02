const JSZip = require('jszip');

async function extractPPTX(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = [];

  zip.forEach((relativePath, file) => {
    if (/^ppt\/slides\/slide\d+\.xml$/.test(relativePath)) {
      slideFiles.push({ path: relativePath, file });
    }
  });

  // Sort slides numerically
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.path.match(/slide(\d+)\.xml/)[1]);
    const numB = parseInt(b.path.match(/slide(\d+)\.xml/)[1]);
    return numA - numB;
  });

  const texts = [];
  for (const { file } of slideFiles) {
    const xmlContent = await file.async('string');
    // Extract text from <a:t> elements
    const matches = xmlContent.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
    const slideText = matches
      .map(m => m.replace(/<[^>]+>/g, ''))
      .filter(t => t.trim().length > 0)
      .join(' ');
    if (slideText.trim()) {
      texts.push(slideText.trim());
    }
  }

  return texts.join('\n\n');
}

module.exports = { extractPPTX };
