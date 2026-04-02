/* ══════════════════════════════════════════════════════════════
   StudyDash — Upload Page Logic
══════════════════════════════════════════════════════════════ */

const dropZone    = document.getElementById('dropZone');
const fileInput   = document.getElementById('fileInput');
const fileList    = document.getElementById('fileList');
const submitFiles = document.getElementById('submitFiles');
const submitText  = document.getElementById('submitText');
const textInput   = document.getElementById('textInput');
const textCount   = document.getElementById('textCount');
const overlay     = document.getElementById('processingOverlay');
const processingMsg   = document.getElementById('processingMsg');
const processingSteps = document.getElementById('processingSteps');
const toast       = document.getElementById('toast');

let selectedFiles = [];
let progressLog   = [];

// ── TAB SWITCHING ─────────────────────────────────────────────
document.querySelectorAll('.upload-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.upload-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ── FILE DROP ZONE ────────────────────────────────────────────
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  addFiles([...e.dataTransfer.files]);
});

fileInput.addEventListener('change', () => {
  addFiles([...fileInput.files]);
  fileInput.value = '';
});

function addFiles(newFiles) {
  const allowed = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.txt'];
  newFiles.forEach(file => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      showToast(`Formato no soportado: ${ext}`, 'error');
      return;
    }
    // Avoid duplicates by name+size
    const exists = selectedFiles.some(f => f.name === file.name && f.size === file.size);
    if (!exists) selectedFiles.push(file);
  });
  renderFileList();
}

function renderFileList() {
  fileList.innerHTML = '';
  selectedFiles.forEach((file, idx) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <div class="file-icon ${ext}">${ext.toUpperCase()}</div>
      <span class="file-name" title="${file.name}">${file.name}</span>
      <span class="file-size">${formatSize(file.size)}</span>
      <button class="file-remove" data-idx="${idx}" title="Quitar">✕</button>
    `;
    fileList.appendChild(item);
  });

  fileList.querySelectorAll('.file-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      selectedFiles.splice(parseInt(btn.dataset.idx), 1);
      renderFileList();
    });
  });

  submitFiles.disabled = selectedFiles.length === 0;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ── TEXT INPUT ────────────────────────────────────────────────
textInput.addEventListener('input', () => {
  const len = textInput.value.trim().length;
  textCount.textContent = `${len.toLocaleString()} caracteres`;
  submitText.disabled = len < 100;
});

// ── SUBMIT FILES ──────────────────────────────────────────────
submitFiles.addEventListener('click', async () => {
  if (selectedFiles.length === 0) return;
  const formData = new FormData();
  selectedFiles.forEach(f => formData.append('files', f));
  await processWithSSE('/api/process', formData);
});

// ── SUBMIT TEXT ───────────────────────────────────────────────
submitText.addEventListener('click', async () => {
  const text = textInput.value.trim();
  if (text.length < 100) return;
  await processWithSSE('/api/process-text', JSON.stringify({ text }), 'application/json');
});

// ── SSE PROCESSING ────────────────────────────────────────────
async function processWithSSE(url, body, contentType = null) {
  showOverlay();

  try {
    const fetchOpts = { method: 'POST', body };
    if (contentType) fetchOpts.headers = { 'Content-Type': contentType };

    const response = await fetch(url, fetchOpts);

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Error de red' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const reader   = response.body.getReader();
    const decoder  = new TextDecoder();
    let buffer     = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop();

      let eventType = null;
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          try {
            const data = JSON.parse(dataStr);
            handleSSEEvent(eventType, data);
          } catch (_) {}
          eventType = null;
        }
      }
    }
  } catch (err) {
    hideOverlay();
    showToast(err.message || 'Error al conectar con el servidor.', 'error');
  }
}

function handleSSEEvent(event, data) {
  if (event === 'progress') {
    updateProgress(data.message);
  } else if (event === 'done') {
    hideOverlay();
    sessionStorage.setItem('studydash_data', JSON.stringify(data.dashboard));
    window.location.href = '/dashboard';
  } else if (event === 'error') {
    hideOverlay();
    showToast(data.message || 'Error desconocido.', 'error');
  }
}

// ── OVERLAY ───────────────────────────────────────────────────
function showOverlay() {
  progressLog = [];
  processingSteps.innerHTML = '';
  processingMsg.textContent = 'Iniciando análisis...';
  overlay.classList.add('visible');
}

function hideOverlay() {
  overlay.classList.remove('visible');
}

function updateProgress(message) {
  processingMsg.textContent = message;

  const step = document.createElement('div');
  step.className = 'processing-step';
  step.textContent = message;

  // Mark previous as done
  processingSteps.querySelectorAll('.processing-step.active')
    .forEach(s => { s.classList.remove('active'); s.classList.add('done'); s.prepend('✓ '); });

  step.classList.add('active');
  processingSteps.appendChild(step);
  step.scrollIntoView({ block: 'nearest' });
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(message, type = '') {
  toast.textContent = message;
  toast.className = 'toast' + (type === 'error' ? ' error-toast' : '') + ' show';
  setTimeout(() => toast.classList.remove('show'), 4000);
}
