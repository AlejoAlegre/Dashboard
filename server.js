require('dotenv').config();

const express  = require('express');
const multer   = require('multer');
const cors     = require('cors');
const path     = require('path');

const { extractText }       = require('./src/extractors');
const { processDashboard }  = require('./src/processor');
const { generatePDF }       = require('./src/pdf-export');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Multer: memory storage, 50 MB limit ──────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error(`Formato no soportado: ${ext}`));
  },
});

// ── Routes ────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// SSE endpoint: process files and stream progress + final result
app.post('/api/process', upload.array('files', 10), async (req, res) => {
  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY no configurada. Creá un archivo .env con tu clave.',
    });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const files  = req.files || [];
    const pastedText = req.body?.pastedText?.trim() || '';

    if (files.length === 0 && !pastedText) {
      send('error', { message: 'No se recibieron archivos ni texto.' });
      return res.end();
    }

    send('progress', { message: 'Leyendo archivos...' });

    // Extract text from each file
    const extracted = [];

    for (const file of files) {
      send('progress', { message: `Extrayendo texto de ${file.originalname}...` });
      try {
        const result = await extractText(file);
        if (result.text.length < 10) {
          send('progress', { message: `⚠ ${file.originalname} parece estar vacío o sin texto extraíble.` });
        } else {
          extracted.push(result);
        }
      } catch (err) {
        send('progress', { message: `⚠ Error en ${file.originalname}: ${err.message}` });
      }
    }

    // Add pasted text as a virtual file
    if (pastedText) {
      extracted.push({ filename: 'Texto pegado', text: pastedText, type: 'TXT' });
    }

    if (extracted.length === 0) {
      send('error', { message: 'No se pudo extraer texto de ningún archivo.' });
      return res.end();
    }

    // Process with Claude
    const dashboard = await processDashboard(extracted, (msg) => {
      send('progress', { message: msg });
    });

    send('done', { dashboard });
    res.end();

  } catch (err) {
    console.error('Error processing:', err);
    send('error', { message: err.message || 'Error interno del servidor.' });
    res.end();
  }
});

// Handle text-only input (no files)
app.post('/api/process-text', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { text } = req.body;
    if (!text?.trim()) {
      send('error', { message: 'No se recibió texto.' });
      return res.end();
    }

    const extracted = [{ filename: 'Texto ingresado', text: text.trim(), type: 'TXT' }];

    const dashboard = await processDashboard(extracted, (msg) => {
      send('progress', { message: msg });
    });

    send('done', { dashboard });
    res.end();
  } catch (err) {
    send('error', { message: err.message || 'Error interno.' });
    res.end();
  }
});

// ── PDF export ────────────────────────────────────────────────
app.post('/api/export/pdf', async (req, res) => {
  const { html, filename } = req.body || {};
  if (!html) return res.status(400).json({ error: 'HTML requerido.' });

  try {
    const pdf = await generatePDF(html);
    const safe = (filename || 'studydash').replace(/[^a-z0-9-_]/gi, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safe}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'No se pudo generar el PDF: ' + err.message });
  }
});

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎓 StudyDash corriendo en http://localhost:${PORT}\n`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠  ANTHROPIC_API_KEY no configurada. Copiá .env.example → .env y agregá tu clave.\n');
  }
});
