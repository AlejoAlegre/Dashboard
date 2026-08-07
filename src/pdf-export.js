const puppeteer = require('puppeteer');

async function generatePDF(html) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();

    // Load HTML and wait for fonts/network to settle
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1.4cm', right: '1.4cm', bottom: '1.4cm', left: '1.4cm' },
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

module.exports = { generatePDF };
