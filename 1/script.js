
marked.setOptions({ breaks: true, gfm: true });

const AGNES_IMAGE_MODEL = 'agnes-image-2.5-flash';
const AGNES_IMAGE_ENDPOINT = 'https://apihub.agnes-ai.com/v1/images/generations';
const IMAGE_KEYWORDS = ['dessine', 'dessin', 'génère une image', 'génére une image', 'montre-moi', "montre moi", 'image de', 'peins', 'peinture', 'photo de', 'illustration'];
const IMAGE_SLASH_REGEX = /^\/(image|img|dessine|generate-image)\s+/i;
let forceImageMode = false;
let imageRatio = localStorage.getItem('deepchat_image_ratio') || '1:1';
let imageSize = localStorage.getItem('deepchat_image_size') || '1024x1024';

// ==== INDEXEDDB (persistance images + conversations + brouillons) ====
const IDB_NAME = 'deepchat_db';
const IDB_VERSION = 2; // ⬅️ passé de 1 à 2
const IDB_STORE = 'images';
const IDB_CONVS_STORE = 'conversations';
const IDB_DRAFTS_STORE = 'drafts';
let idbPromise = null;

function openIDB() {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('IndexedDB non supporté')); return; }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(IDB_CONVS_STORE)) {
        db.createObjectStore(IDB_CONVS_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(IDB_DRAFTS_STORE)) {
        db.createObjectStore(IDB_DRAFTS_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return idbPromise;
}

// --- IMAGES ---
async function idbPutImage(id, blob, mime) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put({ id, blob, mime, createdAt: Date.now() });
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGetImage(id) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function idbDeleteImage(id) {
  if (!id) return;
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {}
}
async function idbClearAll() {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([IDB_STORE, IDB_CONVS_STORE, IDB_DRAFTS_STORE], 'readwrite');
      tx.objectStore(IDB_STORE).clear();
      tx.objectStore(IDB_CONVS_STORE).clear();
      tx.objectStore(IDB_DRAFTS_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {}
}

// --- CONVERSATIONS ---
async function idbSaveConversations(data) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_CONVS_STORE, 'readwrite');
    tx.objectStore(IDB_CONVS_STORE).put({ key: 'main', data, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbLoadConversations() {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_CONVS_STORE, 'readonly');
      const req = tx.objectStore(IDB_CONVS_STORE).get('main');
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return null; }
}

// --- BROUILLONS ---
async function idbSaveDrafts(draftsObj) {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_DRAFTS_STORE, 'readwrite');
      tx.objectStore(IDB_DRAFTS_STORE).put({ key: 'main', data: draftsObj, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {}
}
async function idbLoadDrafts() {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_DRAFTS_STORE, 'readonly');
      const req = tx.objectStore(IDB_DRAFTS_STORE).get('main');
      req.onsuccess = () => resolve(req.result ? req.result.data : {});
      req.onerror = () => reject(req.error);
    });
  } catch (e) { return {}; }
}

// --- Utilitaires blob ---
function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',');
  const mime = (meta.match(/:(.*?);/) || [null, 'image/png'])[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const d = r.result; resolve(d.includes(',') ? d.split(',')[1] : ''); };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
function generateImageId() { return 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10); }

const GEMINI_MEDIA_MAX_BYTES = 20 * 1024 * 1024;
function isGeminiProvider(key) {
  const k = key || providerSelect.value;
  return k === 'gemini' || String(k).toLowerCase().includes('gemini');
}
function getFileKind(f) {
  if (!f) return 'unknown';
  const t = (f.type || '').toLowerCase();
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'audio';
  return 'text';
}

// ==== LIMITES DE CONTEXTE (cache + découverte API) ====
const TOKEN_LIMITS = {
  'llama-3.3-70b-versatile': 131072,
  'llama-3.1-8b-instant': 131072,
  'openai/gpt-oss-120b': 128000,
  'moonshotai/kimi-k2-instruct': 128000,
  'deepseek-r1-distill-llama-70b': 128000,
  'mistral-large-latest': 128000,
  'mistral-small-latest': 32000,
  'mistral-medium-latest': 32000,
  'codestral-latest': 32000,
  'magistral-medium-latest': 128000,
  'gemini-3.5-flash': 1048576,
  'gemini-3.5-flash-lite': 1048576,
  'agnes-3.0-flash': 512000,
  'agnes-2.5-pro-beta': 1000000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'qwen/qwen3.8-27b': 131072
};

const MAX_OUTPUT_LIMITS = {
  'qwen/qwen3.8-27b': 16384,
  'openai/gpt-oss-120b': 65536,
  'llama-3.3-70b-versatile': 32768,
  'llama-3.1-8b-instant': 8192,
  'gemini-3.5-flash': 65536,
  'gemini-3.5-flash-lite': 65536,
  'mistral-large-latest': 8192,
  'mistral-small-latest': 8192,
  'agnes-3.0-flash': 65536,
  'agnes-2.5-pro-beta': 65536
};

let modelLimitsCache = {};
try { modelLimitsCache = JSON.parse(localStorage.getItem('deepchat_model_limits') || '{}'); } catch(e) {}

let customModelLimits = JSON.parse(localStorage.getItem('deepchat_custom_model_limits') || '{}');
function saveCustomModelLimits() {
  try { localStorage.setItem('deepchat_custom_model_limits', JSON.stringify(customModelLimits)); } catch(e) {}
}

const modelLimitsFetching = {};

function saveModelLimitsCache() {
  try { localStorage.setItem('deepchat_model_limits', JSON.stringify(modelLimitsCache)); } catch(e) {}
}

function getModelLimits(model) {
  if (!model) return null;
  
  // 1. Limites personnalisées (priorité absolue)
  if (customModelLimits[model] && (customModelLimits[model].context || customModelLimits[model].output)) {
    return { ...customModelLimits[model], source: 'custom' };
  }
  
  // 2. Limites de l'API en cache
  const cacheKey = `${providerSelect.value}:${model}`;
  if (modelLimitsCache[cacheKey]) return modelLimitsCache[cacheKey];
  
  // 3. Limites intégrées par défaut
  const ctx = TOKEN_LIMITS[model];
  const out = MAX_OUTPUT_LIMITS[model];
  if (ctx || out) return { context: ctx || null, output: out || null, source: 'builtin' };
  
  return null;
}

async function fetchModelLimits(providerKey, model) {
  if (!providerKey || !model) return;
  const cacheKey = `${providerKey}:${model}`;
  if (modelLimitsCache[cacheKey] || modelLimitsFetching[cacheKey]) return;
  const provider = PROVIDERS[providerKey];
  const apiKey = apiKeys[providerKey];
  if (!provider || !provider.testUrl || !apiKey) return;
  modelLimitsFetching[cacheKey] = true;
  try {
    let url = provider.testUrl;
    const headers = {};
    if (provider.testType === 'bearer') headers['Authorization'] = `Bearer ${apiKey}`;
    else if (provider.testType === 'query') url += `?key=${apiKey}`;
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) return;
    const data = await res.json();
    const limits = parseModelLimitsFromApi(data, model);
    if (limits && (limits.context || limits.output)) {
      modelLimitsCache[cacheKey] = limits;
      saveModelLimitsCache();
      updateTokenCounter();
    }
  } catch (e) {
    console.warn('[DeepChat] Limites non récupérées pour', model, e.message);
  } finally {
    modelLimitsFetching[cacheKey] = false;
  }
}

function parseModelLimitsFromApi(data, model) {
  const items = data?.data || data?.models || [];
  if (!Array.isArray(items)) return null;
  const target = items.find(m => {
    const id = m.id || m.name || '';
    return id === model || id === `models/${model}` || id.endsWith(`/${model}`);
  });
  if (!target) return null;
  const context = target.context_window || target.context_length
    || target.max_context_length || target.inputTokenLimit || null;
  const output = target.max_completion_tokens || target.max_output_tokens
    || target.top_provider?.max_completion_tokens || target.outputTokenLimit || null;
  if (!context && !output) return null;
  return { context, output, source: 'api' };
}

const DEFAULT_PROVIDERS = {
  agnes: {
    label: 'Agnes',
    endpoint: 'https://apihub.agnes-ai.com/v1/chat/completions',
    models: ['agnes-3.0-flash', 'agnes-2.5-flash', 'agnes-image-2.5-flash', 'agnes-video-2.5-flash'],
    format: 'openai',
    testUrl: 'https://apihub.agnes-ai.com/v1/models',
    testType: 'bearer',
    apiKeyUrl: 'https://platform.agnes-ai.com'
  },

  groq: {
    label: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    models: [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'openai/gpt-oss-safeguard-20b',
      'qwen/qwen3.8-27b'
    ],
    format: 'openai',
    testUrl: 'https://api.groq.com/openai/v1/models',
    testType: 'bearer',
    apiKeyUrl: 'https://console.groq.com/keys'
  },

  mistral: {
    label: 'Mistral',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    models: ['codestral-latest', 'mistral-medium-latest', 'mistral-small-latest', 'magistral-medium-latest'],
    format: 'openai',
    testUrl: 'https://api.mistral.ai/v1/models',
    testType: 'bearer',
    apiKeyUrl: 'https://console.mistral.ai/api-keys'
  },

  gemini: {
    label: 'Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent',
    models: ['gemini-3.5-flash', 'gemini-3.5-flash-lite'],
    format: 'gemini',
    testUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    testType: 'query',
    apiKeyUrl: 'https://aistudio.google.com/apikey'
  },

  openrouter: {
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    models: [
      'openrouter/free', // ✅ Le seul modèle 100% fiable qui trouve toujours un modèle gratuit (dont DeepSeek)
      'nividia/nemotron-3.5-super-vl:free',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'
    ],
    format: 'openai',
    testUrl: 'https://openrouter.ai/api/v1/models',
    testType: 'bearer',
    apiKeyUrl: 'https://openrouter.ai/keys'
  },

  tokenharbor: {
    label: 'TokenHarbor',
    endpoint: 'https://tokenharbor.ai/v1/chat/completions',
    models: [
      'deepseek-v4-flash:free',
      'deepseek-v4.1-flash:free',
      'mimo-v2.5:free',
      'mimo-v2.6-flash:free'
    ],
    format: 'openai',
    testUrl: 'https://tokenharbor.ai/v1/models',
    testType: 'bearer',
    apiKeyUrl: 'https://tokenharbor.ai/dashboard'
  },

  puter: {
    label: 'Puter (Gratuit, sans clé)',
    endpoint: 'https://api.puter.com/v1/chat/completions',
    models: [
        'deepseek/deepseek-v4-pro',
        'openai/gpt-5.5',
        'baidu/ernie-5.5-flash-preview:free',
        'recursive/flint-v1.0:free',
        'fireworks/ember-1',
        'prism-ml/ternary-bonsai-27b',
        'cohere/north-mini-code:free',
        'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
        'google/gemma-4-31b-it',
        'google/gemma-4-26b-a4b-it'
    ],
    format: 'openai',
    testUrl: null,
    testType: 'bearer',
    apiKeyUrl: null
  },
};

let customProviders = JSON.parse(localStorage.getItem('deepchat_custom_providers') || '[]');
let PROVIDERS = { ...DEFAULT_PROVIDERS };
customProviders.forEach(cp => {
  PROVIDERS[cp.id] = { label: cp.label, endpoint: cp.endpoint, models: cp.models, format: 'openai', testUrl: cp.testUrl || cp.endpoint.replace(/\/chat\/completions\/?$/, '/models'), testType: 'bearer', isCustom: true };
});

let conversations = {};
let isHydrating = true;
let currentConvId = null;
let apiKeys = JSON.parse(localStorage.getItem('deepchat_keys') || '{}');
let currentAttachedFiles = [];
let currentTheme = localStorage.getItem('deepchat_theme') || 'dark';
let currentMaxTokens = parseInt(localStorage.getItem('deepchat_maxtokens') || '8192');
let currentTemperature = parseFloat(localStorage.getItem('deepchat_temperature') || '0.7');
let currentTopP = parseFloat(localStorage.getItem('deepchat_topp') || '1');
let currentFreqPenalty = parseFloat(localStorage.getItem('deepchat_freqpenalty') || '0');
let currentPresPenalty = parseFloat(localStorage.getItem('deepchat_prespenalty') || '0');
let systemPrompt = localStorage.getItem('deepchat_system_prompt') || '';
let customAccent = localStorage.getItem('deepchat_accent') || 'default';
let currentFontSize = parseInt(localStorage.getItem('deepchat_fontsize') || '14');
let currentBubbleWidth = parseInt(localStorage.getItem('deepchat_bubblewidth') || '100');
let compactMode = localStorage.getItem('deepchat_compact') === '1';
let useIDB = localStorage.getItem('deepchat_use_idb') !== '0';
let showTimestamps = localStorage.getItem('deepchat_timestamps') === '1';
let showReasoning = localStorage.getItem('deepchat_show_reasoning') !== '0';
let soundEnabled = localStorage.getItem('deepchat_sound') === '1';
let autoScrollEnabled = localStorage.getItem('deepchat_autoscroll') !== '0';
let isStreaming = false;
let abortController = null;
let userScrolledDuringStream = false;
let editingMessage = null;
let drafts = {};
let saveDraftTimer = null;
let currentFetchProviderKey = null;
let currentFetchedModelsList = [];

const $ = id => document.getElementById(id);
const providerSelect = $('providerSelect');
const modelSelect = $('modelSelect');
const hfModelInput = $('hfModelInput');
const chatMessages = $('chatMessages');
const messagesInner = $('messagesInner');
const messageInput = $('messageInput');
const sendBtn = $('sendBtn');
const conversationList = $('conversationList');
const searchInput = $('searchInput');
const settingsModal = $('settingsModal');
const backdrop = $('backdrop');
const imageLightbox = $('imageLightbox');
const lightboxImg = $('lightboxImg');
const imageBtn = $('imageBtn');
const imageModeBanner = $('imageModeBanner');
const cancelImageModeBtn = $('cancelImageModeBtn');
const inputWrapperEl = $('inputWrapperEl');

// ==== NOTIFICATIONS NAVIGATEUR ====
function requestNotifPermission() {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'default') {
    try { Notification.requestPermission(); } catch(e) {}
  }
}
function showNotification(title, body) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, silent: false });
  } catch(e) {}
}

// ==== TOKEN COUNTER ====
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 3.5);
}
function getContextLimit() {
  const model = getCurrentModel();
  const limits = getModelLimits(model);
  return limits ? limits.context : null;
}
function getConversationTokens(conv) {
  if (!conv) return 0;
  let total = 0;
  if (systemPrompt && systemPrompt.trim()) total += estimateTokens(systemPrompt);
  conv.messages.forEach(m => {
    if (!m.isHidden) total += estimateTokens(m.content || '') + 4;
  });
  return total;
}
function formatTokens(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(1) + 'k';
  return n.toString();
}
function updateTokenCounter() {
  const tokenInfo = $('tokenInfo');
  const contextInfo = $('contextInfo');
  const contextBar = $('contextBar');
  const contextBarWrap = $('contextBarWrap');
  if (!tokenInfo) return;

  const inputTokens = estimateTokens(messageInput.value);
  tokenInfo.textContent = inputTokens > 0
    ? `~${inputTokens} token${inputTokens > 1 ? 's' : ''}` : '';

  const conv = conversations[currentConvId];
  if (!conv) {
    contextBarWrap.style.display = 'none';
    contextInfo.textContent = '';
    contextInfo.title = '';
    return;
  }

  const convTokens = getConversationTokens(conv) + inputTokens;
  const limit = getContextLimit();

  if (limit === null || limit === undefined) {
    if (convTokens > 0) {
      contextBarWrap.style.display = 'none';
      contextInfo.textContent = `~${formatTokens(convTokens)} tokens · limite inconnue`;
      contextInfo.style.opacity = '0.6';
      contextInfo.title = 'Aucune limite connue pour ce modèle.';
    } else {
      contextBarWrap.style.display = 'none';
      contextInfo.textContent = '';
    }
    return;
  }

  contextInfo.style.opacity = '1';
  contextInfo.title = `Limite : ${limit.toLocaleString()} tokens`;
  const pct = Math.min(100, Math.round((convTokens / limit) * 100));

  if (convTokens > 0) {
    contextBarWrap.style.display = 'block';
    contextBar.style.width = pct + '%';
    contextBar.className = 'context-bar' + (pct > 90 ? ' danger' : pct > 70 ? ' warn' : '');
    contextInfo.textContent = `${formatTokens(convTokens)} / ${formatTokens(limit)} (${pct}%)`;
  } else {
    contextBarWrap.style.display = 'none';
    contextInfo.textContent = '';
  }
}

// ==== TELECHARGEMENT IMAGE ====
function downloadImage(url, filename) {
  if (!url) return;
  try {
    if (url.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `image-${Date.now()}.png`;
      a.click();
      showToast('Image téléchargée', 'success');
    } else {
      fetch(url).then(r => r.blob()).then(blob => {
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = filename || `image-${Date.now()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
        showToast('Image téléchargée', 'success');
      }).catch(() => {
        window.open(url, '_blank');
      });
    }
  } catch(e) {
    showToast('Téléchargement impossible', 'error');
  }
}

// ==== BOUTONS D'ACTION POUR IMAGES ====
function buildImageActions(opts) {
  const actions = document.createElement('div');
  actions.className = 'img-actions';

  const dlBtn = document.createElement('button');
  dlBtn.className = 'img-action-btn';
  dlBtn.innerHTML = '⬇';
  dlBtn.title = 'Télécharger';
  dlBtn.onclick = (e) => {
    e.stopPropagation();
    downloadImage(opts.imageUrl, `image-${Date.now()}.png`);
  };
  actions.appendChild(dlBtn);

  if (opts.messageIndex !== undefined && opts.messageIndex >= 0) {
    const regenBtn = document.createElement('button');
    regenBtn.className = 'img-action-btn';
    regenBtn.innerHTML = '🔄';
    regenBtn.title = 'Nouvelle version';
    regenBtn.onclick = (e) => {
      e.stopPropagation();
      regenerateImageFromMsg(opts.messageIndex);
    };
    actions.appendChild(regenBtn);
  }

  return actions;
}

function buildImagePromptPreview(opts) {
  if (!opts.imagePrompt) return null;
  const preview = document.createElement('div');
  preview.className = 'image-prompt-preview';
  const parts = [`🎨 ${opts.imagePrompt}`];
  if (opts.imageRatio) parts.push(opts.imageRatio);
  if (opts.imageSize) parts.push(opts.imageSize);
  preview.textContent = parts.join(' · ');
  return preview;
}

// ==== REGENERER UNE IMAGE ====
async function regenerateImageFromMsg(msgIndex) {
  if (isStreaming) return;
  const conv = conversations[currentConvId];
  if (!conv) return;
  const msg = conv.messages[msgIndex];
  if (!msg || !msg.content.startsWith('![IMAGE]')) return;

  const prompt = msg.imagePrompt;
  const ratio = msg.imageRatio || imageRatio;
  const size = msg.imageSize || imageSize;

  if (!prompt) {
    showToast((translations[currentLang] || translations.fr).promptNotFound, 'error');
    return;
  }

  conv.messages = conv.messages.slice(0, msgIndex);
  conv.upd = Date.now();
  saveConversations();
  renderCurrentConversation();

  await runImageGeneration(prompt, ratio, size);
}

// ==== GALERIE ====
function openGallery() {
  const conv = conversations[currentConvId];
  if (!conv) return;
  const grid = $('galleryGrid');
  const count = $('galleryCount');
  grid.innerHTML = '';

  const images = [];
  conv.messages.forEach((m, idx) => {
    if (m.role === 'assistant' && m.content && m.content.startsWith('![IMAGE]')) {
      images.push({
        url: m.content.substring(8),
        index: idx,
        prompt: m.imagePrompt,
        ratio: m.imageRatio,
        size: m.imageSize,
        timestamp: m.timestamp
      });
    }
  });

  if (images.length === 0) {
    count.textContent = '';
    grid.innerHTML = `<p class="g-empty">${(translations[currentLang] || translations.fr).noImages}</p>`;
  } else {
    count.textContent = `${images.length} ${(translations[currentLang] || translations.fr).imgCount}`;
    images.forEach(img => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      const el = document.createElement('img');
      el.src = img.url;
      el.alt = img.prompt || 'Image générée';
      el.loading = 'lazy';
      item.appendChild(el);
      const actions = document.createElement('div');
      actions.className = 'g-actions';
      const dlBtn = document.createElement('button');
      dlBtn.textContent = '⬇';
      dlBtn.title = 'Télécharger';
      dlBtn.onclick = (e) => {
        e.stopPropagation();
        downloadImage(img.url, `image-${img.index}.png`);
      };
      actions.appendChild(dlBtn);
      item.appendChild(actions);
      item.onclick = () => {
        lightboxImg.src = img.url;
        imageLightbox.classList.add('active');
      };
      grid.appendChild(item);
    });
  }
  $('galleryModal').classList.add('open');
}

// ==== SHOULD GENERATE IMAGE ====
function shouldGenerateImage(prompt) {
    if (IMAGE_SLASH_REGEX.test(prompt)) return true;
    if (forceImageMode && apiKeys['agnes']) return true;
    if (!apiKeys['agnes']) return false;
    if (currentAttachedFiles.some(f => {
  const k = getFileKind(f);
  return k === 'image' || k === 'video' || k === 'audio';
})) return false;
    const lowerPrompt = prompt.toLowerCase();
    return IMAGE_KEYWORDS.some(keyword => lowerPrompt.includes(keyword));
}

// ==== MODE IMAGE UI ====
function updateImageModeUI() {
    if (forceImageMode) {
        imageBtn.classList.add('active');
        imageModeBanner.classList.add('active');
        inputWrapperEl.classList.add('image-mode');
        messageInput.placeholder = (translations[currentLang] || translations.fr).describeImage;
    } else {
        imageBtn.classList.remove('active');
        imageModeBanner.classList.remove('active');
        inputWrapperEl.classList.remove('image-mode');
        messageInput.placeholder = (translations[currentLang] || translations.fr).placeholder;
    }
    const rs = $('imageRatioSelect');
    const ss = $('imageSizeSelect');
    if (rs) rs.value = imageRatio;
    if (ss) ss.value = imageSize;
}

imageBtn.addEventListener('click', () => {
    if (!apiKeys['agnes']) {
        showToast((translations[currentLang] || translations.fr).apiKeyMissingAgnes, 'warning');
        return;
    }
    forceImageMode = !forceImageMode;
    updateImageModeUI();
    if (forceImageMode) {
        showToast((translations[currentLang] || translations.fr).imgModeOn, 'success');
        messageInput.focus();
    } else {
        showToast((translations[currentLang] || translations.fr).imgModeOff);
    }
});
cancelImageModeBtn.addEventListener('click', () => {
    forceImageMode = false;
    updateImageModeUI();
});

document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'imageRatioSelect') {
        imageRatio = e.target.value;
        localStorage.setItem('deepchat_image_ratio', imageRatio);
    } else if (e.target && e.target.id === 'imageSizeSelect') {
        imageSize = e.target.value;
        localStorage.setItem('deepchat_image_size', imageSize);
    }
});

imageLightbox.addEventListener('click', (e) => {
    if (e.target === imageLightbox || e.target === lightboxImg) {
        imageLightbox.classList.remove('active');
    }
});
$('lbDownloadBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    downloadImage(lightboxImg.src, `image-${Date.now()}.png`);
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && imageLightbox.classList.contains('active')) {
        imageLightbox.classList.remove('active');
    }
});

function showToast(msg, type = 'info', duration = 4000) {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  $('toastContainer').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; }, duration);
  setTimeout(() => t.remove(), duration + 400);
}

let scrollScheduled = false;
function scrollToBottom(force=false) {
  if (!autoScrollEnabled && !force) return;
  if (isStreaming && userScrolledDuringStream && !force) return;
  if (force) { chatMessages.scrollTop = chatMessages.scrollHeight; return; }
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(() => {
    scrollScheduled = false;
    const { scrollHeight, clientHeight, scrollTop } = chatMessages;
    const distance = scrollHeight - clientHeight - scrollTop;
    if (distance < 150) chatMessages.scrollTop = scrollHeight;
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.substring(0,2),16), g: parseInt(h.substring(2,4),16), b: parseInt(h.substring(4,6),16) };
}
function darkenHex(hex, percent) {
  const rgb = hexToRgb(hex);
  const f = (100 - percent) / 100;
  const r = Math.floor(rgb.r * f);
  const g = Math.floor(rgb.g * f);
  const b = Math.floor(rgb.b * f);
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}
function formatDuration(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + 'min ' + r + 's';
}
function playNotification() {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}

const streamRenderState = { scheduled: false, pending: null, last: '', el: null };
const STREAM_RENDER_INTERVAL = 70;

function scheduleStreamRender(el, text) {
  streamRenderState.el = el;
  streamRenderState.pending = text;
  if (streamRenderState.scheduled) return;
  streamRenderState.scheduled = true;
  setTimeout(() => {
    streamRenderState.scheduled = false;
    const pending = streamRenderState.pending;
    if (pending === null || pending === streamRenderState.last) return;
    streamRenderState.last = pending;
    try {
      renderMarkdown(streamRenderState.el, pending, false);
    } catch (e) {
      streamRenderState.el.textContent = pending;
    }
  }, STREAM_RENDER_INTERVAL);
}

function resetStreamRenderState() {
  streamRenderState.scheduled = false;
  streamRenderState.pending = null;
  streamRenderState.last = '';
  streamRenderState.el = null;
}

function applyAccent(color) {
  if (!color || color === 'default') {
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--accent-hover');
    document.documentElement.style.removeProperty('--accent-text');
    return;
  }
  const hover = darkenHex(color, 15);
  const rgb = hexToRgb(color);
  const lum = (0.299*rgb.r + 0.587*rgb.g + 0.114*rgb.b) / 255;
  const textColor = lum > 0.55 ? '#111111' : '#ffffff';
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-hover', hover);
  document.documentElement.style.setProperty('--accent-text', textColor);
}
function applyFontSize(size) { document.documentElement.style.setProperty('--base-font-size', size + 'px'); }
function applyBubbleWidth(pct) { document.documentElement.style.setProperty('--bubble-width', pct + '%'); }
function applyCompact(on) { document.body.classList.toggle('compact', on); }
function applyTheme(t) {
  let effective = t;
  if (t === 'system') effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = effective;
  $('hljs-theme').href = effective === 'light'
    ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css'
    : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css';
  document.querySelectorAll('.theme-option').forEach(o => {
    o.classList.toggle('active', o.dataset.theme === currentTheme);
  });
}
function applyAllAppearance() {
  applyTheme(currentTheme);
  applyAccent(customAccent);
  applyFontSize(currentFontSize);
  applyBubbleWidth(currentBubbleWidth);
  applyCompact(compactMode);
  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.color === customAccent);
  });
}
function setTheme(t) {
  currentTheme = t;
  localStorage.setItem('deepchat_theme', t);
  applyAllAppearance();
}

function renderMarkdown(el, text, skipHighlight=false) {
  let cleanText = text.replace(/```([a-zA-Z0-9]+)\s+/g, '```$1\n');
  cleanText = cleanText.replace(/([^\n])```/g, '$1\n```');

  const rawHTML = marked.parse(cleanText);
  
  if (window.DOMPurify) {
    el.innerHTML = DOMPurify.sanitize(rawHTML);
  } else {
    console.error('[DeepChat] DOMPurify absent — rendu texte brut par sécurité');
    el.textContent = text;
    return;
  }
  
  if (skipHighlight) return;
  
  if (window.hljs) {
    el.querySelectorAll('pre code').forEach(codeEl => {
      try {
        const cls = codeEl.className || '';
        const m = cls.match(/language-([\w-]+)/);
        const lang = m ? m[1].toLowerCase() : null;
        const codeText = codeEl.textContent || '';
        if (!codeText.trim()) return;
        let highlighted;
        if (lang && hljs.getLanguage(lang)) {
          highlighted = hljs.highlight(codeText, { language: lang, ignoreIllegals: true }).value;
        } else {
          const auto = hljs.highlightAuto(codeText);
          highlighted = auto.value;
          if (auto.language) codeEl.classList.add('language-' + auto.language);
        }
        codeEl.innerHTML = highlighted;
        codeEl.classList.add('hljs');
      } catch (err) { console.warn('[DeepChat] Highlight error:', err); }
    });
  } else { 
    console.warn('[DeepChat] hljs not loaded — check CDN'); 
  }

  el.querySelectorAll('pre').forEach(pre => {
    const codeEl = pre.querySelector('code');
    if (!codeEl) return;
    const codeText = codeEl.textContent || '';

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    
    const toolbar = document.createElement('div');
    toolbar.className = 'code-actions';

    // 1. Bouton Retour à la ligne
    const wrapBtn = document.createElement('button');
    wrapBtn.className = 'code-action-btn';
    wrapBtn.title = 'Retour à la ligne';
    wrapBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 3 21 7 17 11"/><path d="M3 3v10a4 4 0 0 0 4 4h14"/></svg>';
    wrapBtn.onclick = () => {
      const on = pre.classList.toggle('wrap-lines');
      wrapBtn.classList.toggle('active', on);
    };
    toolbar.appendChild(wrapBtn);

    // 2. Bouton Télécharger
    const dlBtn = document.createElement('button');
    dlBtn.className = 'code-action-btn';
    dlBtn.title = 'Télécharger';
    dlBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    dlBtn.onclick = () => {
      let ext = 'txt';
      const m = (codeEl.className || '').match(/language-(\w+)/);
      if (m) ext = m[1];
      const blob = new Blob([codeText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `code-${Date.now()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    };
    toolbar.appendChild(dlBtn);

    // 3. Bouton Aperçu (HTML uniquement)
    const langMatch = (codeEl.className || '').match(/language-([\w-]+)/);
    const currentLang = langMatch ? langMatch[1].toLowerCase() : '';
    
    if (['html', 'htm', 'svg', 'xml'].includes(currentLang)) {
      const previewBtn = document.createElement('button');
      previewBtn.className = 'code-action-btn';
      previewBtn.title = 'Voir le rendu en plein écran';
      previewBtn.innerHTML = '👁️ Aperçu';
      
      const previewContainer = document.createElement('div');
      previewContainer.className = 'code-preview-container';
      
      const previewHeader = document.createElement('div');
      previewHeader.className = 'code-preview-header';
      previewHeader.innerHTML = `<span>👁️ Aperçu du site</span>
        <button class="code-preview-close">Fermer l'aperçu</button>`;
      
      const iframe = document.createElement('iframe');
      iframe.sandbox = 'allow-scripts allow-same-origin allow-modals allow-forms allow-popups';
      
      previewContainer.appendChild(previewHeader);
      previewContainer.appendChild(iframe);
      
      previewBtn.onclick = (e) => {
        e.stopPropagation();
        const isActive = previewContainer.classList.contains('active');
        
        if (isActive) {
          previewContainer.classList.remove('active');
          wrapper.appendChild(previewContainer); // On remet l'aperçu à sa place d'origine
          previewBtn.classList.remove('active');
          previewBtn.innerHTML = '👁️ Aperçu';
          iframe.srcdoc = ''; // On vide l'iframe
        } else {
          previewContainer.classList.add('active');
          document.body.appendChild(previewContainer); // ✨ L'ASTUCE : On le déplace tout en haut de la page
          iframe.srcdoc = codeText; 
          previewBtn.classList.add('active');
          previewBtn.innerHTML = '👁️ Masquer';
        }
      };
      
      previewHeader.querySelector('.code-preview-close').onclick = (e) => {
        e.stopPropagation();
        previewContainer.classList.remove('active');
        wrapper.appendChild(previewContainer); // On remet l'aperçu à sa place d'origine
        previewBtn.classList.remove('active');
        previewBtn.innerHTML = '👁️ Aperçu';
        iframe.srcdoc = ''; 
      };
      
      toolbar.appendChild(previewBtn);
      wrapper.appendChild(previewContainer);
    }

    // 4. Bouton Copier
    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-action-btn';
    copyBtn.title = 'Copier';
    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copier';
    copyBtn.onclick = () => {
      const doCopy = () => {
        copyBtn.innerHTML = '✅ Copié !';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copier';
          copyBtn.classList.remove('copied');
        }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(codeText).then(doCopy).catch(() => {
          const ta = document.createElement('textarea');
          ta.value = codeText;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          doCopy();
        });
      } else {
        const ta = document.createElement('textarea');
        ta.value = codeText;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        doCopy();
      }
    };
    toolbar.appendChild(copyBtn);

    // L'ORDRE EST IMPORTANT ICI
    wrapper.appendChild(toolbar);
    wrapper.appendChild(pre);
  });

  el.querySelectorAll('img').forEach(img => {
    if (img.dataset.generated === 'true') {
      img.style.cursor = 'zoom-in';
      img.onclick = (e) => {
        e.stopPropagation();
        lightboxImg.src = img.src;
        imageLightbox.classList.add('active');
      };
    }
  });
}

const BRAIN_ICON = '<svg class="brain-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/></svg>';
const CHEVRON_ICON = '<svg class="reasoning-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';

function createReasoningBlock() {
  const t = translations[currentLang] || translations.fr;
  const block = document.createElement('div');
  block.className = 'reasoning-block streaming';
  block.innerHTML = `
    <div class="reasoning-header">
      ${BRAIN_ICON}
      <span class="reasoning-label">${t.reasoning}</span>
      <span class="reasoning-status">${t.reasoningInProgress}<span class="reasoning-dots"><span></span><span></span><span></span></span></span>
      ${CHEVRON_ICON}
    </div>
    <div class="reasoning-content"></div>
  `;
  block.querySelector('.reasoning-header').onclick = () => {
    if (block.classList.contains('streaming')) return;
    block.classList.toggle('expanded');
  };
  return block;
}

function updateReasoningStatus(block, startTime) {
  const t = translations[currentLang] || translations.fr;
  const status = block.querySelector('.reasoning-status');
  if (!status) return;
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  status.innerHTML = `${t.reasoningInProgress} (${elapsed}s)<span class="reasoning-dots"><span></span><span></span><span></span></span>`;
}

function updateReasoningBlock(block, content) {
  const contentEl = block.querySelector('.reasoning-content');
  if (contentEl) contentEl.textContent = content;
}

function finalizeReasoningBlock(block, durationMs, hasContent) {
  const t = translations[currentLang] || translations.fr;
  if (!hasContent) { block.remove(); return; }
  block.classList.remove('streaming');
  block.classList.remove('expanded');
  const status = block.querySelector('.reasoning-status');
  status.textContent = t.reasoningFinished + (durationMs ? ' · ' + formatDuration(durationMs) : '');
}

function initProviderSelect() {
  providerSelect.innerHTML = '';
  Object.entries(PROVIDERS).forEach(([k, p]) => {
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = p.label;
    providerSelect.appendChild(opt);
  });
  const savedProvider = localStorage.getItem('deepchat_provider');
  if (savedProvider && PROVIDERS[savedProvider]) providerSelect.value = savedProvider;
  updateModelList();
}
function updateImageButtonVisibility() {
  const imgBtn = $('imageBtn');
  if (!imgBtn) return;
  
  const provider = providerSelect.value;
  const currentModel = getCurrentModel() || '';
  
  // Affiche le bouton SEULEMENT si on est sur Agnes ou si le modèle gère les images
  const supportsImage = (provider === 'agnes') || currentModel.toLowerCase().includes('image') || currentModel.toLowerCase().includes('dall-e');
  
  if (supportsImage) {
    imgBtn.style.display = 'flex';
  } else {
    imgBtn.style.display = 'none';
    if (forceImageMode) {
      forceImageMode = false;
      updateImageModeUI();
    }
  }
}
const MODEL_DESCRIPTIONS = {
  // Agnes
  'agnes-3.0-flash': 'Le modèle phare d\'Agnes : rapide, polyvalent, contexte de 512k tokens.',
  'agnes-2.5-flash': 'Version allégée pour les tâches rapides et courantes.',
  'agnes-image-2.5-flash': 'Spécialisé dans la génération d\'images à partir de texte.',
  'agnes-video-2.5-flash': 'Spécialisé dans la génération de vidéos.',
  
  // Groq
  'openai/gpt-oss-120b': 'Modèle open-source massif de 120B. Excellent pour le code et le raisonnement complexe.',
  'openai/gpt-oss-20b': 'Version plus légère et ultra-rapide du modèle GPT-OSS.',
  'openai/gpt-oss-safeguard-20b': 'Modèle GPT-OSS 20B spécialisé dans la sécurité et la modération (safeguard).',
  'qwen/qwen3.8-27b': 'Modèle Qwen 3.8B. Très efficace pour le code et les mathématiques.',
  'llama-3.3-70b-versatile': 'Le célèbre Llama 3.3 70B. Polyvalent, intelligent et très rapide sur Groq.',
  'llama-3.1-8b-instant': 'Modèle Llama 3.1 8B. Ultra rapide, idéal pour les conversations simples.',
  
  // Mistral
  'codestral-latest': 'Modèle de Mistral spécialisé dans la génération de code. Idéal pour les développeurs.',
  'mistral-medium-latest': 'Bon équilibre entre puissance, rapidité et coût.',
  'mistral-small-latest': 'Modèle léger et rapide pour les tâches basiques.',
  'magistral-medium-latest': 'Modèle orienté raisonnement (Chain of Thought) de Mistral.',
  
  // Gemini
  'gemini-3.5-flash': 'Le plus rapide de Google. Contexte gigantesque de 1 million de tokens. Parfait pour de longs documents.',
  'gemini-3.5-flash-lite': 'Version encore plus rapide et légère de Gemini.',
  
  // OpenRouter
  'openrouter/free': 'Sélectionne automatiquement un modèle gratuit disponible sur OpenRouter.',
  'nividia/nemotron-3.5-super-vl:free': 'Modèle NVIDIA gratuit orienté Vision-Langage (analyse d\'images).',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free': 'Petit modèle NVIDIA gratuit spécialisé dans le raisonnement.',
  
  // TokenHarbor
  'deepseek-v4-flash:free': 'Modèle DeepSeek ultra-rapide et gratuit via TokenHarbor.',
  'deepseek-v4.1-flash:free': 'Version améliorée de DeepSeek Flash, gratuit.',
  'mimo-v2.5:free': 'Modèle léger et gratuit via TokenHarbor.',
  'mimo-v2.6-flash:free': 'Version rapide et gratuite du modèle Mimo via TokenHarbor.',

  // Puter
  'deepseek/deepseek-v4-pro': 'Modèle DeepSeek accessible gratuitement et sans clé via Puter.js.',
  'openai/gpt-5.5': 'Modèle OpenAI accessible gratuitement et sans clé via Puter.js.',
  'baidu/ernie-5.5-flash-preview:free': 'Modèle Baidu ERNIE 5.5 Flash (preview) gratuit via Puter. Rapide et polyvalent pour les conversations courantes.',
  'recursive/flint-v1.0:free': 'Modèle Recursive Flint v1.0, accessible gratuitement et sans clé via Puter.',
  'fireworks/ember-1': 'Modèle Fireworks Ember 1, optimisé pour la génération rapide via Puter.',
  'prism-ml/ternary-bonsai-27b': 'Modèle Prism ML Ternary Bonsai 27B, orienté raisonnement, disponible via Puter.',
  'cohere/north-mini-code:free': 'Modèle Cohere North Mini Code, spécialisé dans le code, gratuit via Puter.',
  'google/gemma-4-31b-it': 'Google Gemma 4 31B (instruction-tuned), modèle open-weight polyvalent via Puter.',
  'google/gemma-4-26b-a4b-it': 'Google Gemma 4 26B MoE (4B actifs) instruction-tuned, efficace et rapide via Puter.',
};

function updateModelDescription() {
  const descEl = $('modelDescription');
  if (!descEl) return;
  
  const t = translations[currentLang] || translations.fr;
  const tDesc = t.modelDesc || translations.fr.modelDesc;
  
  const currentModel = getCurrentModel();
  const desc = tDesc[currentModel];
  
  if (desc) {
    // ✅ Le modèle a une description dans la base → on l'affiche
    descEl.innerHTML = `<span>${tDesc.infoLabel}</span> ${desc}`;
    descEl.classList.remove('empty');
    return;
  }
  
  // 🔍 Fallback intelligent : on déduit une description pour les modèles dynamiques
  if (currentModel) {
    const lower = currentModel.toLowerCase();
    let fallback = null;
    
    const fallbacks = {
      // Multimodal / Vision
      vision: {
        fr: 'Modèle multimodal (vision + texte).',
        en: 'Multimodal model (vision + text).',
        it: 'Modello multimodale (visione + testo).',
        tr: 'Çok modlu model (görsel + metin).'
      },
      // Raisonnement
      reasoning: {
        fr: 'Modèle orienté raisonnement.',
        en: 'Reasoning-focused model.',
        it: 'Modello orientato al ragionamento.',
        tr: 'Akıl yürütme odaklı model.'
      },
      // Code
      code: {
        fr: 'Modèle spécialisé dans le code.',
        en: 'Code-specialized model.',
        it: 'Modello specializzato nel codice.',
        tr: 'Koda özel model.'
      },
      // Image
      image: {
        fr: 'Modèle de génération d\'images.',
        en: 'Image generation model.',
        it: 'Modello di generazione immagini.',
        tr: 'Görsel oluşturma modeli.'
      },
      // Vidéo
      video: {
        fr: 'Modèle de génération de vidéos.',
        en: 'Video generation model.',
        it: 'Modello di generazione video.',
        tr: 'Video oluşturma modeli.'
      },
      // Grand contexte (token)
      large: {
        fr: 'Modèle à grand contexte (longues conversations).',
        en: 'Large-context model (long conversations).',
        it: 'Modello a grande contesto (lunghe conversazioni).',
        tr: 'Geniş bağlam modeli (uzun sohbetler).'
      }
    };
    
    if (lower.includes('vision') || lower.includes('-vl') || lower.includes('multimodal')) {
      fallback = fallbacks.vision[currentLang] || fallbacks.vision.fr;
    } else if (lower.includes('reasoning') || lower.includes('think') || lower.includes('r1')) {
      fallback = fallbacks.reasoning[currentLang] || fallbacks.reasoning.fr;
    } else if (lower.includes('code') || lower.includes('coder')) {
      fallback = fallbacks.code[currentLang] || fallbacks.code.fr;
    } else if (lower.includes('image') || lower.includes('dall-e') || lower.includes('flux') || lower.includes('sdxl')) {
      fallback = fallbacks.image[currentLang] || fallbacks.image.fr;
    } else if (lower.includes('video') || lower.includes('sora') || lower.includes('kling')) {
      fallback = fallbacks.video[currentLang] || fallbacks.video.fr;
    }
    
    if (fallback) {
      descEl.innerHTML = `<span>${tDesc.infoLabel}</span> ${fallback}`;
      descEl.classList.remove('empty');
      return;
    }
  }
  
  // ❌ Aucune description trouvée → on cache la barre
  descEl.innerHTML = '';
  descEl.classList.add('empty');
}

function updateModelList() {
  const p = PROVIDERS[providerSelect.value];
  if (!p) return;
  modelSelect.innerHTML = '';
  if (p.models.length > 0) {
    p.models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m; opt.textContent = m;
      modelSelect.appendChild(opt);
    });
    modelSelect.style.display = '';
    hfModelInput.style.display = 'none';
    const savedModel = localStorage.getItem('deepchat_model_' + providerSelect.value);
    if (savedModel && p.models.includes(savedModel)) modelSelect.value = savedModel;
  } else {
    modelSelect.style.display = 'none';
    hfModelInput.style.display = '';
    hfModelInput.value = localStorage.getItem('deepchat_hfmodel') || 'Qwen/Qwen2.5-7B-Instruct';
  }
  localStorage.setItem('deepchat_provider', providerSelect.value);
  updateTokenCounter();
  
  // 👇 C'est ici qu'on ajoute l'appel pour cacher/montrer le bouton
  updateImageButtonVisibility(); 
  
  const m = getCurrentModel();
  if (m) fetchModelLimits(providerSelect.value, m);
  
  updateModelDescription(); // 👈 Ajout de cette ligne
}

function getCurrentModel() {
  if (providerSelect.value === 'huggingface') {
    const v = hfModelInput.value.trim();
    if (v) localStorage.setItem('deepchat_hfmodel', v);
    return v;
  }
  const v = modelSelect.value;
  if (v) localStorage.setItem('deepchat_model_' + providerSelect.value, v);
  return v;
}

function saveDraftsToStorage() {
  if (useIDB) {
    idbSaveDrafts(drafts).catch(() => {
      try { localStorage.setItem('deepchat_drafts', JSON.stringify(drafts)); } catch (e) {}
    });
  } else {
    try { localStorage.setItem('deepchat_drafts', JSON.stringify(drafts)); } catch (e) {}
  }
}

function saveDraft() {
  if (currentConvId) {
    drafts[currentConvId] = messageInput.value;
    clearTimeout(saveDraftTimer);
    saveDraftTimer = setTimeout(saveDraftsToStorage, 400);
  }
}
function newConversation() {
  const curr = conversations[currentConvId];
  if (curr && curr.messages.length === 0) { messageInput.focus(); return; }
  if (currentConvId) {
    drafts[currentConvId] = messageInput.value;
    idbSaveDrafts(drafts).catch(() => {});
  }
  const t = translations[currentLang] || translations.fr;
  const id = 'conv_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
  conversations[id] = { id, title: t.newChatTitle, messages: [], created: Date.now(), upd: Date.now() };
  currentConvId = id;
  messageInput.value = '';
  cancelEdit();
  autoResize();
  forceImageMode = false; updateImageModeUI();
  saveConversations();
  renderConversations();
  renderCurrentConversation();
  messageInput.focus();
  updateTokenCounter();
  document.body.classList.remove('sidebar-mobile-open');
}

function loadConversation(id) {
  if (isStreaming) return;
  if (currentConvId && currentConvId !== id) {
    drafts[currentConvId] = messageInput.value;
    try { localStorage.setItem('deepchat_drafts', JSON.stringify(drafts)); } catch(e) {}
  }
  currentConvId = id;
  cancelEdit();
  messageInput.value = drafts[id] || '';
  forceImageMode = false; updateImageModeUI();
  autoResize();
  renderConversations();
  renderCurrentConversation();
  updateTokenCounter();
  document.body.classList.remove('sidebar-mobile-open');
}
async function deleteConversation(id) {
  if (!conversations[id]) return;
  if (!confirm((translations[currentLang] || translations.fr).confirmDelete)) return;

  const conv = conversations[id];
  const toDelete = [];
  conv.messages.forEach(m => {
    if (Array.isArray(m.images)) m.images.forEach(img => { if (img.idbKey) toDelete.push(img.idbKey); });
    if (m.imageIdbKey) toDelete.push(m.imageIdbKey);
  });
  for (const key of toDelete) await idbDeleteImage(key);

  delete conversations[id];
  delete drafts[id];
idbSaveDrafts(drafts).catch(() => {});

  if (currentConvId === id) {
    currentConvId = null;
    const ids = Object.keys(conversations).sort((a,b) => (conversations[b].created||0) - (conversations[a].created||0));
    if (ids.length > 0) loadConversation(ids[0]);
    else newConversation();
  }
  await saveConversations();
  renderConversations();
}
let saveQueue = Promise.resolve();

async function serializeConversationsForStorage() {
  const clone = JSON.parse(JSON.stringify(conversations));
  for (const convId of Object.keys(clone)) {
    const conv = clone[convId];
    for (const msg of conv.messages) {
      if (Array.isArray(msg.images)) {
        for (const img of msg.images) {
          if (img.dataUrl && !img.idbKey) {
            try {
              const blob = dataUrlToBlob(img.dataUrl);
              const id = generateImageId();
              await idbPutImage(id, blob, img.mime || blob.type || 'image/png');
              img.idbKey = id;
            } catch (e) {
              console.warn('[IDB] save image failed for', img.name, e.message);
            }
          }
          delete img.dataUrl;
          delete img.base64;
        }
      }
      if (typeof msg.content === 'string' && msg.content.startsWith('![IMAGE]data:')) {
        const dataUrl = msg.content.substring(8);
        if (!msg.imageIdbKey) {
          try {
            const blob = dataUrlToBlob(dataUrl);
            const id = generateImageId();
            await idbPutImage(id, blob, blob.type || 'image/png');
            msg.imageIdbKey = id;
          } catch (e) {
            console.warn('[IDB] save generated image failed', e.message);
            continue;
          }
        }
        msg.content = `![IMAGE]idb:${msg.imageIdbKey}`;
      }
    }
  }
  return clone;
}

async function doSaveConversations() {
  try {
    const serialized = await serializeConversationsForStorage();

    if (useIDB) {
      try {
        await idbSaveConversations(serialized);
        try { localStorage.removeItem('deepchat_convs'); } catch (e) {}
        return;
      } catch (idbErr) {
        console.warn('[IDB] save convs failed, fallback localStorage:', idbErr);
      }
    }

    // Fallback ou mode standard
    try {
      localStorage.setItem('deepchat_convs', JSON.stringify(serialized));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
        const totalMB = (JSON.stringify(serialized).length / 1024 / 1024).toFixed(2);
        const count = Object.keys(serialized).length;
        showToast(
          `⚠️ Stockage saturé (${totalMB} Mo, ${count} conversations).\n` +
          `💡 Activez le "Stockage étendu" dans les paramètres ou exportez vos données.`,
          'error', 10000
        );
      } else {
        throw e;
      }
    }
  } catch (e) {
    console.error('[DeepChat] saveConversations:', e);
    showToast('❌ Erreur de sauvegarde : ' + e.message, 'error');
  }
}

function saveConversations() {
  saveQueue = saveQueue.then(() => doSaveConversations()).catch(e => console.warn('[saveQueue]', e));
  return saveQueue;
}

async function hydrateConversations() {
  const t0 = performance.now();
  let migrated = 0;
  for (const convId of Object.keys(conversations)) {
    const conv = conversations[convId];
    for (const msg of conv.messages) {
      if (Array.isArray(msg.images)) {
        for (const img of msg.images) {
          if (img.idbKey && !img.dataUrl) {
            try {
              const rec = await idbGetImage(img.idbKey);
              if (rec && rec.blob) {
                img.dataUrl = await blobToDataUrl(rec.blob);
                img.base64 = await blobToBase64(rec.blob);
                img.mime = img.mime || rec.mime || 'image/png';
                migrated++;
              } else {
                img.dataUrl = '';
                img.base64 = '';
                img.missing = true;
              }
            } catch (e) {
              console.warn('[IDB] hydrate image failed', img.idbKey, e.message);
              img.missing = true;
            }
          }
        }
      }
      if (typeof msg.content === 'string' && msg.content.startsWith('![IMAGE]idb:')) {
        const idbKey = msg.content.substring(12);
        try {
          const rec = await idbGetImage(idbKey);
          if (rec && rec.blob) {
            const dataUrl = await blobToDataUrl(rec.blob);
            msg.imageIdbKey = idbKey;
            msg.content = `![IMAGE]${dataUrl}`;
            migrated++;
          } else {
            msg.content = '[Image introuvable — storage corrompu]';
            msg.imageMissing = true;
          }
        } catch (e) {
          console.warn('[IDB] hydrate generated image failed', idbKey, e.message);
          msg.content = '[Image introuvable]';
          msg.imageMissing = true;
        }
      }
    }
  }
  if (migrated > 0) {
    console.log(`[IDB] ${migrated} image(s) hydratée(s) en ${Math.round(performance.now() - t0)}ms`);
  }
}

function renderConversations() {
  const filter = (searchInput.value || '').toLowerCase().trim();
  const entries = Object.values(conversations)
    .sort((a,b) => {
      const ta = b.upd || b.created || 0;
      const tb = a.upd || a.created || 0;
      return ta - tb;
    })
    .filter(c => !filter || c.title.toLowerCase().includes(filter));
  conversationList.innerHTML = '';
  if (entries.length === 0) {
    const d = document.createElement('div');
    d.className = 'conv-empty';
    d.textContent = filter ? (translations[currentLang] || translations.fr).emptySearch : (translations[currentLang] || translations.fr).emptyChat;
    conversationList.appendChild(d);
    return;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const weekAgo = todayStart - 7 * 86400000;
  let lastGroup = null;

  entries.forEach(c => {
    const t = translations[currentLang] || translations.fr;
    const ts = c.upd || c.created || 0;
    let group;
    if (ts >= todayStart) group = t.today;
    else if (ts >= yesterdayStart) group = t.yesterday;
    else if (ts >= weekAgo) group = t.last7;
    else group = t.older;
    if (group !== lastGroup) {
      const sep = document.createElement('div');
      sep.className = 'conv-date-separator';
      sep.textContent = group;
      conversationList.appendChild(sep);
      lastGroup = group;
    }

    const item = document.createElement('div');
    item.className = 'conv-item' + (c.id === currentConvId ? ' active' : '');
    const title = document.createElement('span');
    title.className = 'conv-item-title';
    // Traduit le titre si c'est le titre par défaut
    const defaultTitles = ['Nouvelle conversation', 'New chat', 'Nuova chat', 'Yeni sohbet'];
    title.textContent = defaultTitles.includes(c.title) ? t.newChatTitle : c.title;
    title.title = "Double-cliquez pour renommer";
    const startEdit = () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'conv-item-input';
      input.value = c.title;
      item.replaceChild(input, title);
      input.focus();
      input.select();
      const saveEdit = () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== c.title) {
          conversations[c.id].title = newTitle;
          conversations[c.id].upd = Date.now();
          saveConversations();
        }
        renderConversations();
      };
      input.onblur = saveEdit;
      input.onkeydown = (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') renderConversations();
      };
      input.onclick = (e) => e.stopPropagation();
    };
    title.ondblclick = (e) => { e.stopPropagation(); startEdit(); };
    const edit = document.createElement('button');
    edit.className = 'conv-item-edit';
    edit.title = t.tooltipRename;
    edit.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L14 13l-4 1 1-4 7.5-7.5z"></path></svg>';
    edit.onclick = (e) => { e.stopPropagation(); startEdit(); };
    const del = document.createElement('button');
    del.className = 'conv-item-delete';
    del.title = t.tooltipDelete;
    del.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
    del.onclick = (e) => { e.stopPropagation(); deleteConversation(c.id); };
    item.appendChild(title);
    item.appendChild(edit);
    item.appendChild(del);
    item.onclick = () => loadConversation(c.id);
    conversationList.appendChild(item);
  });
}

function renderCurrentConversation() {
  messagesInner.innerHTML = '';
  const conv = conversations[currentConvId];
  if (!conv || conv.messages.length === 0) { renderWelcome(); return; }
  const visibleMessages = conv.messages.filter(m => !m.isHidden);
  conv.messages.forEach((m) => {
    if (m.isHidden) return;
    const isLastVisible = m === visibleMessages[visibleMessages.length - 1];
    const idx = conv.messages.indexOf(m);
    const contentToShow = (m.role === 'user' && m.displayContent !== undefined) ? m.displayContent : m.content;
    addMessage(m.role, contentToShow, {
      isLast: isLastVisible, files: m.files, images: m.images, timestamp: m.timestamp,
      reasoning: m.reasoning, reasoningDuration: m.reasoningDuration,
      skipScroll: true, messageIndex: idx,
      imagePrompt: m.imagePrompt, imageRatio: m.imageRatio, imageSize: m.imageSize
    });
  });
  scrollToBottom(true);
  updateTokenCounter();
}
function renderWelcome() {
  const t = translations[currentLang] || translations.fr;
  const div = document.createElement('div');
  div.className = 'welcome';
  div.innerHTML = `
    <div class="welcome-icon">D</div>
    <h1>${t.welcomeTitle}</h1>
    <p>${t.welcomeText}</p>
    <div class="welcome-grid">
      <button class="welcome-card" data-prompt="/image un chat astronaute sur la lune"><strong>${t.card1T}</strong>${t.card1D}</button>
      <button class="welcome-card" data-prompt="Explique-moi les principes SOLID avec des exemples concrets en JavaScript."><strong>${t.card2T}</strong>${t.card2D}</button>
      <button class="welcome-card" data-prompt="Écris une fonction Python qui trouve le plus long palindrome dans une chaîne."><strong>${t.card3T}</strong>${t.card3D}</button>
      <button class="welcome-card" data-prompt="Compare les avantages et inconvénients de React, Vue et Svelte en 2024."><strong>${t.card4T}</strong>${t.card4D}</button>
    </div>`;
  messagesInner.appendChild(div);
  div.querySelectorAll('.welcome-card').forEach(b => {
    b.onclick = () => { messageInput.value = b.dataset.prompt; messageInput.focus(); autoResize(); updateTokenCounter(); };
  });
}

async function generateImage(prompt, ratio, size, signal) {
    const apiKey = apiKeys['agnes'];
    if (!apiKey) {
        throw new Error("Veuillez configurer votre clé API Agnes dans les paramètres pour générer des images.");
    }
    const cleanPrompt = prompt
        .replace(IMAGE_SLASH_REGEX, '')
        .replace(/^(dessine|génère une image|montre moi|image de)\s*/gi, '')
        .trim() || prompt;
    const finalRatio = ratio || imageRatio || '1:1';
    const finalSize = size || imageSize || '1024x1024';
    const body = {
        model: AGNES_IMAGE_MODEL,
        prompt: cleanPrompt,
        n: 1,
        size: finalSize,
        ratio: finalRatio,
        response_format: "b64_json"
    };
    const res = await fetch(AGNES_IMAGE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal
    });
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erreur API Image: ${res.status} - ${errorText.substring(0, 100)}`);
    }
    const data = await res.json();
    const imageData = data.data[0];
    let imageUrl;
    if (imageData.b64_json) imageUrl = `data:image/png;base64,${imageData.b64_json}`;
    else if (imageData.url) imageUrl = imageData.url;
    else throw new Error("Format de réponse inconnu de l'API d'image");
    return { url: imageUrl, prompt: cleanPrompt, ratio: finalRatio, size: finalSize };
}

function addMessage(role, content, opts={}) {
  const welcome = messagesInner.querySelector('.welcome');
  if (welcome) welcome.remove();
  const msg = document.createElement('div');
  msg.className = `message ${role}`;
  const avatar = document.createElement('div');
  avatar.className = `avatar ${role === 'user' ? 'avatar-user' : 'avatar-ai'}`;
  avatar.textContent = role === 'user' ? 'U' : 'AI';
  const body = document.createElement('div');
  body.className = 'message-body';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if (role === 'assistant') {
    if (content && content.startsWith('![IMAGE]')) {
        const imageUrl = content.substring(8);
        const imgContainer = document.createElement('div');
        imgContainer.className = 'generated-image-container';
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = "Image générée";
        img.dataset.generated = "true";
        const spinner = document.createElement('div');
        spinner.className = 'image-loading-spinner';
        spinner.textContent = (translations[currentLang] || translations.fr).loading;
        imgContainer.appendChild(img);
        imgContainer.appendChild(spinner);

        const actions = buildImageActions({
          imageUrl: imageUrl,
          messageIndex: opts.messageIndex
        });
        imgContainer.appendChild(actions);

        img.onload = () => {
            spinner.remove();
            img.onclick = () => {
                lightboxImg.src = img.src;
                imageLightbox.classList.add('active');
            };
        };
        img.onerror = () => {
            spinner.textContent = (translations[currentLang] || translations.fr).loadError;
            spinner.classList.add('error');
        };
        bubble.appendChild(imgContainer);

        const preview = buildImagePromptPreview(opts);
        if (preview) bubble.appendChild(preview);
    } else {
        if (showReasoning && opts.reasoning && opts.reasoning.trim()) {
          const rb = document.createElement('div');
          rb.className = 'reasoning-block';
          rb.innerHTML = `
            <div class="reasoning-header">
              ${BRAIN_ICON}
              <span class="reasoning-label">Réflexion</span>
              <span class="reasoning-status">terminée${opts.reasoningDuration ? ' · ' + formatDuration(opts.reasoningDuration) : ''}</span>
              ${CHEVRON_ICON}
            </div>
            <div class="reasoning-content"></div>
          `;
          rb.querySelector('.reasoning-content').textContent = opts.reasoning;
          rb.querySelector('.reasoning-header').onclick = () => rb.classList.toggle('expanded');
          bubble.appendChild(rb);
        }
        renderMarkdown(bubble, content);
    }
  } else {
    if (opts.images && opts.images.length > 0) {
      const imgGrid = document.createElement('div');
      imgGrid.className = 'user-image-preview';
      opts.images.forEach(img => {
        const imgEl = document.createElement('img');
        imgEl.src = img.dataUrl;
        imgEl.alt = img.name || 'Image jointe';
        imgEl.onclick = (e) => {
          e.stopPropagation();
          lightboxImg.src = img.dataUrl;
          imageLightbox.classList.add('active');
        };
        imgGrid.appendChild(imgEl);
      });
      bubble.appendChild(imgGrid);
    }

    if (content && content !== '🖼️ [Image jointe]') {
      const wrap = document.createElement('div');
      wrap.className = 'msg-content-wrap';
      const textDiv = document.createElement('div');
      textDiv.className = 'msg-text-container';
      textDiv.textContent = content; 
      textDiv.style.whiteSpace = 'pre-wrap';
      wrap.appendChild(textDiv);
      bubble.appendChild(wrap);
      
      setTimeout(() => {
        if (textDiv.scrollHeight > 110) {
          wrap.classList.add('collapsed');
          const fade = document.createElement('div');
          fade.className = 'msg-content-fade';
          bubble.appendChild(fade);
          const toggleBtn = document.createElement('button');
          toggleBtn.className = 'msg-toggle-btn';
          toggleBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg> ' + (translations[currentLang] || translations.fr).showMore;
          toggleBtn.onclick = (e) => {
            e.stopPropagation();
            const isExpanded = wrap.classList.toggle('expanded');
            fade.style.display = isExpanded ? 'none' : 'block';
            toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}"><polyline points="6 9 12 15 18 9"></polyline></svg> ${isExpanded ? (translations[currentLang] || translations.fr).showLess : (translations[currentLang] || translations.fr).showMore}`;
          };
          bubble.appendChild(toggleBtn);
        }
      }, 10);
    }

    const nonImageFiles = (opts.files || []).filter(f => !f.type.startsWith('image/'));
    if (nonImageFiles.length > 0) bubble.insertAdjacentHTML('beforeend', generateFileBadgesHTML(nonImageFiles));
  }

  body.appendChild(bubble);

  if (showTimestamps && opts.timestamp) {
    const ts = document.createElement('div');
    ts.className = 'message-timestamp';
    ts.textContent = formatTime(opts.timestamp);
    body.appendChild(ts);
  }

  if (role === 'assistant' && !opts.noActions) {
    addMessageActions(body, !!opts.isLast);
  } else if (role === 'user' && !opts.noActions) {
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn edit-btn';
    editBtn.title = 'Modifier et renvoyer';
    editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L14 13l-4 1 1-4 7.5-7.5z"></path></svg> Modifier';
    editBtn.onclick = () => startEditingMessage(opts.messageIndex, content);
    actions.appendChild(editBtn);
    body.appendChild(actions);
  }

  msg.appendChild(avatar);
  msg.appendChild(body);
  messagesInner.appendChild(msg);

  if (!opts.skipScroll) scrollToBottom(true);
  return { msg, bubble, body };
}

function addMessageActions(body, isLast) {
  const actions = document.createElement('div');
  actions.className = 'message-actions';
  const bubble = body.querySelector('.bubble');
  const copyBtn = document.createElement('button');
  copyBtn.className = 'action-btn';
  copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> ' + (translations[currentLang] || translations.fr).copy;
  copyBtn.onclick = () => navigator.clipboard.writeText(bubble.innerText).then(() => showToast('Copié !', 'success'));
  actions.appendChild(copyBtn);
  if (isLast) {
    const regenBtn = document.createElement('button');
    regenBtn.className = 'action-btn';
    regenBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> ' + (translations[currentLang] || translations.fr).regen;
    regenBtn.onclick = regenerate;
    actions.appendChild(regenBtn);
    const isImageMsg = !!bubble.querySelector('.generated-image-container');
    if (!isImageMsg) {
      const contBtn = document.createElement('button');
      contBtn.className = 'action-btn';
      contBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg> ' + (translations[currentLang] || translations.fr).continueBtn;
      contBtn.onclick = () => continueGeneration(body, bubble);
      actions.appendChild(contBtn);
    }
  }
  body.appendChild(actions);
}

function startEditingMessage(index, content) {
  if (isStreaming) return;
  editingMessage = { convId: currentConvId, index };
  messageInput.value = content;
  autoResize();
  messageInput.focus();
  updateTokenCounter();
  $('editBanner').style.display = 'flex';
}
function cancelEdit() {
  editingMessage = null;
  $('editBanner').style.display = 'none';
}

async function testApiKey(providerKey, key) {
  const provider = PROVIDERS[providerKey];
  if (!provider.testUrl) return false;
  const headers = {};
  let url = provider.testUrl;
  if (provider.testType === 'bearer') headers['Authorization'] = `Bearer ${key}`;
  else if (provider.testType === 'query') url += `?key=${key}`;
  const res = await fetch(url, { method: 'GET', headers });
  return res.ok;
}

function buildApiMessages(history) {
  const msgs = history.map(m => {
    let content = m.content || '';
    if (typeof content === 'string' && content.startsWith('![IMAGE]')) {
      content = m.imagePrompt ? `[Image générée pour : ${m.imagePrompt}]` : '[Image générée]';
    }
    if (m.role === 'user' && Array.isArray(m.images) && m.images.length > 0) {
      const parts = [];
      if (content) parts.push({ type: 'text', text: content });
      m.images.forEach(img => {
        parts.push({ type: 'image_url', image_url: { url: img.dataUrl } });
      });
      return { role: m.role, content: parts };
    }
    return { role: m.role, content };
  });
  if (systemPrompt && systemPrompt.trim()) msgs.unshift({ role: 'system', content: systemPrompt.trim() });
  return msgs;
}

// ✨ FONCTION : Streaming avec Puter.js ✨
async function streamChatWithPuter(history, callbacks) {
    const onDelta = callbacks.onDelta;
    // Puter ne gère pas le "reasoning" nativement dans cet appel, on l'ignore.
    
    const apiMessages = buildApiMessages(history);
    const model = getCurrentModel();

    try {
        const response = await puter.ai.chat(apiMessages, {
            model: model,
            stream: true
        });

        let fullText = '';
        // La réponse de Puter en mode stream est un itérateur
        for await (const part of response) {
            if (part?.text) {
                fullText += part.text;
                onDelta(fullText); // On met à jour l'interface
            }
        }
        return { content: fullText, reasoning: '' };
    } catch (err) {
        console.error("Erreur Puter:", err);
        throw new Error(`Erreur avec Puter : ${err.message}`);
    }
}

async function streamChat(history, callbacks, signal) {
  const onDelta = callbacks.onDelta;
  const onReasoning = callbacks.onReasoning;
  const providerKey = providerSelect.value;
  const provider = PROVIDERS[providerKey];
  const apiKey = apiKeys[providerKey];
  const model = getCurrentModel();

  // Autoriser l'absence de clé pour Puter
  if (!apiKey && providerKey !== 'puter') {
      throw new Error(`Clé API manquante pour ${provider.label}. Ouvrez les paramètres.`);
  }
  if (!model) throw new Error('Veuillez sélectionner un modèle.');
  const apiMessages = buildApiMessages(history);

  if (provider.format === 'openai') {
    const limits = getModelLimits(model);
    const modelMaxOutput = limits ? limits.output : null;
    const safeMaxTokens = modelMaxOutput
      ? Math.min(currentMaxTokens, modelMaxOutput)
      : currentMaxTokens;
    
    const body = { model, messages: apiMessages, temperature: currentTemperature, max_tokens: safeMaxTokens, stream: true };
    if (currentTopP < 1) body.top_p = currentTopP;
    if (currentFreqPenalty > 0) body.frequency_penalty = currentFreqPenalty;
    if (currentPresPenalty > 0) body.presence_penalty = currentPresPenalty;
    const res = await fetchWithRetry(provider.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal
    });
    if (!res.ok) { const t = await res.text(); throw new Error(`HTTP ${res.status}: ${t.slice(0,200)}`); }
    return await readSSE(res, d => {
      const delta = d.choices?.[0]?.delta || {};
      return { content: delta.content || '', reasoning: delta.reasoning_content || delta.reasoning || delta.thinking || '' };
    }, onDelta, onReasoning);
  }
  if (provider.format === 'gemini') {
    const endpoint = provider.endpoint.replace('{model}', model) + `?alt=sse&key=${apiKey}`;
    const contents = [];
    if (systemPrompt && systemPrompt.trim()) {
      contents.push({ role: 'user', parts: [{ text: '[SYSTEM INSTRUCTION] ' + systemPrompt.trim() }] });
      contents.push({ role: 'model', parts: [{ text: 'Compris.' }] });
    }
    history.forEach(m => {
      let text = m.content || '';
      if (typeof text === 'string' && text.startsWith('![IMAGE]')) {
        text = m.imagePrompt ? `[Image générée pour : ${m.imagePrompt}]` : '[Image générée]';
      }
      const parts = [];
      if (text) parts.push({ text });
      if (m.role === 'user' && Array.isArray(m.images)) {
        m.images.forEach(img => {
          parts.push({ inlineData: { mimeType: img.mime, data: img.base64 } });
        });
      }
      if (parts.length === 0) parts.push({ text: '' });
      contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts });
    });
    const limits = getModelLimits(model);
    const modelMaxOutput = limits ? limits.output : null;
    const safeMaxOutput = modelMaxOutput
      ? Math.min(currentMaxTokens, modelMaxOutput)
      : currentMaxTokens;
    const genConfig = { temperature: currentTemperature, maxOutputTokens: safeMaxOutput };
    if (currentTopP < 1) genConfig.topP = currentTopP;
    const res = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: genConfig }),
      signal
    });
    if (!res.ok) { const t = await res.text(); throw new Error(`HTTP ${res.status}: ${t.slice(0,200)}`); }
    return await readSSE(res, d => {
      const parts = d.candidates?.[0]?.content?.parts || [];
      let content = '', reasoning = '';
      for (const p of parts) {
        if (p.thought === true) reasoning += p.text || '';
        else content += p.text || '';
      }
      return { content, reasoning };
    }, onDelta, onReasoning);
  }
  throw new Error('Format non supporté');
}

async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url, options);
    if (res.status === 503 || res.status === 429) {
      const delay = Math.pow(2, i) * 1000;
      console.warn(`[API] Surcharge (${res.status}). Nouvelle tentative dans ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    return res;
  }
  throw new Error("Le serveur est actuellement surchargé. Veuillez réessayer dans quelques minutes.");
}

async function readSSE(res, extract, onDelta, onReasoning) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let full = '', fullReasoning = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split(/\r?\n/);
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const j = JSON.parse(data);
        const r = extract(j);
        if (!r) continue;
        if (typeof r === 'string') {
          if (r) { full += r; onDelta && onDelta(full); }
          continue;
        }
        if (r.reasoning) { fullReasoning += r.reasoning; onReasoning && onReasoning(fullReasoning); }
        if (r.content) { full += r.content; onDelta && onDelta(full); }
      } catch {}
    }
  }
  return { content: full, reasoning: fullReasoning };
}

// ===== CLASSIFICATION DES ERREURS =====
function classifyError(msg, ctx = {}) {
  const lower = (msg || '').toLowerCase();
  const provider = ctx.provider || providerSelect.value;
  const providerLabel = (PROVIDERS[provider] || {}).label || provider;

  // Fenêtre de contexte dépassée
  if (lower.includes('contextwindowexceeded') || lower.includes('context length')
      || lower.includes('too many tokens') || (lower.includes('input') && lower.includes('longer than'))) {
    const limit = getContextLimit();
    const m = msg.match(/input \((\d+) tokens\)/i);
    const actual = m ? parseInt(m[1]) : null;
    return {
      title: 'Conversation trop longue pour ce modèle',
      detail:
        `Le modèle "${ctx.model || getCurrentModel()}" ne peut pas traiter un historique aussi long.\n\n` +
        (actual && limit
          ? `📊 Votre conversation : ~${formatTokens(actual)} tokens\n📏 Limite du modèle : ${formatTokens(limit)} tokens\n\n`
          : '') +
        `💡 Solutions :\n` +
        `• Démarrez une nouvelle conversation (Ctrl+K)\n` +
        `• Supprimez des messages anciens de cette conversation\n` +
        `• Changez pour un modèle avec un contexte plus grand (ex. Gemini : 1M tokens)`,
      actions: [
        { id: 'newchat', label: '🆕 Nouvelle conversation' },
        { id: 'settings', label: '⚙️ Changer de modèle' }
      ]
    };
  }

  // Clé API
  if (lower.includes('401') || lower.includes('unauthorized')
      || lower.includes('invalid_api_key') || lower.includes('incorrect api key')
      || lower.includes('clé api') || lower.includes('missing api key')) {
    return {
      title: 'Clé API invalide ou manquante',
      detail: `La clé API de ${providerLabel} est invalide, expirée ou absente.\nAllez dans les paramètres pour la vérifier ou la renouveler.`,
      actions: [{ id: 'settings', label: '⚙️ Ouvrir les paramètres' }]
    };
  }

  // Rate limit / quota
  if (lower.includes('429') || lower.includes('rate_limit') || lower.includes('rate limit')
      || lower.includes('quota') || lower.includes('too many requests')) {
    return {
      title: 'Limite de requêtes atteinte',
      detail: `Vous avez atteint la limite imposée par ${providerLabel}.\nAttendez quelques minutes avant de réessayer.`,
      actions: [{ id: 'retry', label: '🔄 Réessayer' }]
    };
  }

  // Contenu refusé
  if (lower.includes('content_policy') || lower.includes('safety')
      || lower.includes('blocked') || lower.includes('moderation')) {
    return {
      title: 'Contenu refusé par les filtres',
      detail: `Votre message a été bloqué par les filtres de sécurité de ${providerLabel}.\nReformulez votre demande autrement.`
    };
  }

  // Serveur surchargé / indisponible
  if (lower.includes('500') || lower.includes('502') || lower.includes('503')
      || lower.includes('overloaded') || lower.includes('surchargé')) {
    return {
      title: `Serveur ${providerLabel} indisponible`,
      detail: `Le service rencontre des difficultés temporaires.\nRéessayez dans quelques instants.`,
      actions: [{ id: 'retry', label: '🔄 Réessayer' }]
    };
  }

  // Réseau / CORS
  if (lower.includes('failed to fetch') || lower.includes('networkerror')
      || lower.includes('network') || lower.includes('cors')
      || lower.includes('connection')) {
    return {
      title: 'Erreur réseau',
      detail:
        `Impossible de contacter ${providerLabel}.\n` +
        `Vérifiez votre connexion internet et que le service n'est pas bloqué par un pare-feu/proxy.`,
      actions: [{ id: 'retry', label: '🔄 Réessayer' }]
    };
  }

  // Timeout
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return {
      title: 'Délai dépassé',
      detail: `La requête a pris trop de temps à répondre.\nRéessayez ou essayez avec un message plus court.`,
      actions: [{ id: 'retry', label: '🔄 Réessayer' }]
    };
  }

  // Image
  if (ctx.isImage) {
    return {
      title: 'Erreur de génération d\'image',
      detail: (msg.length > 400 ? msg.substring(0, 400) + '…' : msg),
      actions: [{ id: 'settings', label: '⚙️ Vérifier la clé API' }]
    };
  }

  // Générique
  return {
    title: 'Erreur inattendue',
    detail: msg.length > 400 ? msg.substring(0, 400) + '…' : msg
  };
}

// ===== AFFICHAGE D'UNE ERREUR DANS LA BULLE =====
function renderErrorInBubble(container, err, ctx = {}) {
  const info = classifyError(err.message || String(err), ctx);
  container.innerHTML = `
    <div class="error-block">
      <div class="error-title">❌ ${escapeHtml(info.title)}</div>
      <div class="error-detail">${escapeHtml(info.detail)}</div>
      ${info.actions ? `<div class="error-actions">${
        info.actions.map(a => `<button class="btn btn-secondary error-action-btn" data-action="${a.id}">${escapeHtml(a.label)}</button>`).join('')
      }</div>` : ''}
      <details class="error-raw">
        <summary>▸ Détails techniques</summary>
        <pre>${escapeHtml(err.message || String(err))}</pre>
      </details>
    </div>
  `;
  container.querySelectorAll('.error-action-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.action;
      if (id === 'settings') openSettings();
      else if (id === 'newchat') newConversation();
      else if (id === 'retry') regenerate();
    };
  });
}

async function sendMessage() {
  const rawText = messageInput.value.trim();
    if (isHydrating) { showToast('Chargement en cours… réessayez dans un instant.', 'warning'); return; }
  if ((!rawText && currentAttachedFiles.length === 0) || isStreaming) return;
  const conv = conversations[currentConvId];
  if (!conv) return;

  requestNotifPermission();

  if (editingMessage && editingMessage.convId === currentConvId) {
    conv.messages = conv.messages.slice(0, editingMessage.index);
    cancelEdit();
    renderCurrentConversation();
  }

  const hasSlash = IMAGE_SLASH_REGEX.test(rawText);
  const text = hasSlash ? rawText.replace(IMAGE_SLASH_REGEX, '').trim() : rawText;

  const fileMetadatas = currentAttachedFiles.map(f => ({ name: f.name, size: f.size, type: f.type }));
  let finalPromptContent = text;
  const textFilesToRead = currentAttachedFiles.filter(f => isTextFile(f));
  if (textFilesToRead.length > 0) {
    try {
      const fileContents = await Promise.all(textFilesToRead.map(f => readFileContent(f)));
      const fileContext = fileContents.map((content, i) => {
        const ext = textFilesToRead[i].name.split('.').pop();
        return `\n\n### Fichier joint : ${textFilesToRead[i].name} (${ext})\n\`\`\`${ext}\n${content}\n\`\`\``;
      }).join('');
      if (finalPromptContent) finalPromptContent += fileContext;
      else finalPromptContent = `Voici les fichiers joints à analyser :` + fileContext;
    } catch (err) { console.error("Erreur de lecture fichier", err); }
  }

  const hasImage = currentAttachedFiles.some(f => f.type.startsWith('image/'));
  if (hasImage && !text) {
    finalPromptContent = "Décris cette image en détail." + (finalPromptContent ? '\n' + finalPromptContent : '');
  }

  let imagesForApi = [];
  if (hasImage) {
    const imageFiles = currentAttachedFiles.filter(f => f.type.startsWith('image/'));
    try {
      imagesForApi = await Promise.all(imageFiles.map(async f => {
        const dataUrl = await readFileAsDataURL(f);
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
        if (!base64) throw new Error('encodage échoué');
        return { name: f.name, mime: f.type || 'image/png', base64, dataUrl };
      }));
      const totalMB = imagesForApi.reduce((s, i) => s + i.base64.length * 0.75, 0) / (1024 * 1024);
      if (totalMB > 3) {
        showToast(`⚠️ Images lourdes (~${totalMB.toFixed(1)} MB) — risque de quota localStorage`, 'warning');
      }
    } catch (err) {
      console.error('Erreur lecture image:', err);
      showToast("Certaines images n'ont pas pu être lues.", 'error');
      imagesForApi = [];
    }
  }

  const isImageRequest = shouldGenerateImage(rawText);

  conv.messages.push({
    role: 'user', content: finalPromptContent, displayContent: text || (hasImage ? '🖼️ [Image jointe]' : ''),
    files: fileMetadatas, timestamp: Date.now(),
    isImageRequest: isImageRequest,
    images: imagesForApi.length > 0 ? imagesForApi : undefined
  });
  conv.upd = Date.now();

  if (conv.messages.length === 1) {
    let titleSource = text || (hasImage ? `Image jointe` : `Fichier: ${fileMetadatas[0]?.name}`);
    conv.title = titleSource.slice(0, 50) + (titleSource.length > 50 ? '…' : '');
  }

  addMessage('user', text || (hasImage ? '🖼️ [Image jointe]' : ''), { files: fileMetadatas, images: imagesForApi, timestamp: Date.now(), messageIndex: conv.messages.length - 1 });
  saveConversations();
  renderConversations();
  messageInput.value = '';
  delete drafts[currentConvId];
  idbSaveDrafts(drafts).catch(() => {});
  currentAttachedFiles = [];
  renderFilePreviews();
  autoResize();
  updateTokenCounter();

  const wasForced = forceImageMode;
  if (wasForced) { forceImageMode = false; updateImageModeUI(); }

  if (isImageRequest && apiKeys['agnes']) {
      await runImageCompletion();
  } else {
      await runCompletion();
  }
}

async function runImageGeneration(prompt, ratio, size) {
    isStreaming = true;
    setSendBtnStop();
    const conv = conversations[currentConvId];
    const { msg, bubble, body } = addMessage('assistant', '', { noActions: true });
    const contentEl = document.createElement('div');
    contentEl.className = 'stream-content';
    bubble.appendChild(contentEl);
    const cursorEl = document.createElement('span');
    cursorEl.className = 'typing-cursor';
    bubble.appendChild(cursorEl);

    abortController = new AbortController();

    try {
        const result = await generateImage(prompt, ratio, size, abortController.signal);
        cursorEl.remove();
        contentEl.innerHTML = '';
        const imgContainer = document.createElement('div');
        imgContainer.className = 'generated-image-container';
        const img = document.createElement('img');
        img.src = result.url;
        img.dataset.generated = "true";
        const spinner = document.createElement('div');
        spinner.className = 'image-loading-spinner';
        spinner.textContent = (translations[currentLang] || translations.fr).loading;
        imgContainer.appendChild(img);
        imgContainer.appendChild(spinner);

        const msgData = {
            role: 'assistant',
            content: `![IMAGE]${result.url}`,
            timestamp: Date.now(),
            imagePrompt: result.prompt,
            imageRatio: result.ratio,
            imageSize: result.size
        };
        conv.messages.push(msgData);
        const msgIndex = conv.messages.length - 1;

        const actions = buildImageActions({ imageUrl: result.url, messageIndex: msgIndex });
        imgContainer.appendChild(actions);

        img.onload = () => {
            spinner.remove();
            img.onclick = () => {
                lightboxImg.src = img.src;
                imageLightbox.classList.add('active');
            };
        };
        contentEl.appendChild(imgContainer);

        const preview = buildImagePromptPreview({
            imagePrompt: result.prompt,
            imageRatio: result.ratio,
            imageSize: result.size
        });
        if (preview) contentEl.appendChild(preview);

        conv.upd = Date.now();
        saveConversations();
        addMessageActions(body, true);
        if (showTimestamps) {
            const ts = document.createElement('div');
            ts.className = 'message-timestamp';
            ts.textContent = formatTime(Date.now());
            body.appendChild(ts);
        }
        playNotification();
        if (document.hidden) showNotification('🎨 Image prête', result.prompt.substring(0, 80));
        updateTokenCounter();
    } catch (err) {
        cursorEl.remove();
        if (err.name === 'AbortError') {
            contentEl.innerHTML = '<em style="color:var(--text-muted)">[génération annulée]</em>';
            msg.remove();
        } else {
            renderErrorInBubble(contentEl, err, { provider: 'agnes', model: AGNES_IMAGE_MODEL, isImage: true });
            if (false) {
                const btn = document.createElement('button');
                btn.className = 'btn btn-primary';
                btn.style.marginTop = '10px';
                btn.textContent = 'Ouvrir les paramètres';
                btn.onclick = openSettings;
                contentEl.appendChild(document.createElement('br'));
                contentEl.appendChild(btn);
            }
        }
    } finally {
        isStreaming = false;
        abortController = null;
        setSendBtnSend();
        resetStreamRenderState();
        saveConversations();
    }
}

async function runImageCompletion() {
    const conv = conversations[currentConvId];
    const lastUserMsg = conv.messages[conv.messages.length - 1];
    const prompt = lastUserMsg.displayContent || lastUserMsg.content;
    await runImageGeneration(prompt, imageRatio, imageSize);
}

async function regenerate() {
  if (isStreaming) return;
  const conv = conversations[currentConvId];
  if (!conv || conv.messages.length < 2) return;
  if (conv.messages[conv.messages.length-1].role === 'assistant') {
    conv.messages.pop();
    conv.upd = Date.now();
    saveConversations();
    renderCurrentConversation();
  }
  const lastUserMsg = conv.messages[conv.messages.length - 1];
  const shouldImg = lastUserMsg && (
    lastUserMsg.isImageRequest ||
    (!lastUserMsg.images?.length && shouldGenerateImage(lastUserMsg.displayContent || lastUserMsg.content))
  );
  if (shouldImg && apiKeys['agnes']) {
      await runImageCompletion();
  } else {
      await runCompletion();
  }
}

async function runCompletion() {
  isStreaming = true;
  userScrolledDuringStream = false;
  resetStreamRenderState();
  $('scrollBottomBtn').classList.add('streaming');
  setSendBtnStop();
  const conv = conversations[currentConvId];
  const { msg, bubble, body } = addMessage('assistant', '', { noActions: true });

  const contentEl = document.createElement('div');
  contentEl.className = 'stream-content';
  bubble.appendChild(contentEl);

  const cursorEl = document.createElement('span');
  cursorEl.className = 'typing-cursor';
  bubble.appendChild(cursorEl);

  let reasoningBlock = null;
  let reasoningContent = '';
  let reasoningStartTime = null;
  let reasoningEndTime = null;
  let streamingText = '';
  abortController = new AbortController();

  try {
    let result;

    // ✨ Aiguillage vers la bonne fonction de streaming ✨
    if (providerSelect.value === 'puter') {
        result = await streamChatWithPuter(conv.messages, {
            onReasoning: (fullReasoning) => { /* Puter ne gère pas le reasoning pour l'instant */ },
            onDelta: (partial) => {
                if (!reasoningEndTime && reasoningContent && reasoningStartTime) reasoningEndTime = Date.now();
                streamingText = partial;
                scheduleStreamRender(contentEl, partial);
                scrollToBottom();
            }
        });
    } else {
        result = await streamChat(conv.messages, {
            onReasoning: (fullReasoning) => {
                reasoningContent = fullReasoning;
                if (!reasoningStartTime) reasoningStartTime = Date.now();
                if (showReasoning) {
                    if (!reasoningBlock) {
                        reasoningBlock = createReasoningBlock();
                        bubble.insertBefore(reasoningBlock, contentEl);
                    }
                    updateReasoningBlock(reasoningBlock, fullReasoning);
                    updateReasoningStatus(reasoningBlock, reasoningStartTime);
                }
                scrollToBottom();
            },
            onDelta: (partial) => {
                if (!reasoningEndTime && reasoningContent && reasoningStartTime) reasoningEndTime = Date.now();
                streamingText = partial;
                scheduleStreamRender(contentEl, partial);
                scrollToBottom();
            }
        }, abortController.signal);
    }

    const full = result.content;
    const finalReasoning = result.reasoning || reasoningContent;

    if (reasoningBlock) {
      if (finalReasoning && finalReasoning.trim()) {
        const duration = reasoningStartTime ? (reasoningEndTime || Date.now()) - reasoningStartTime : null;
        finalizeReasoningBlock(reasoningBlock, duration, true);
      } else {
        reasoningBlock.remove();
        reasoningBlock = null;
      }
    }

    cursorEl.remove();
    try { renderMarkdown(contentEl, full, false); }
    catch (e) { console.error(e); contentEl.textContent = full; }

    const duration = (reasoningStartTime && reasoningEndTime) ? (reasoningEndTime - reasoningStartTime) : null;
    const msgData = { role: 'assistant', content: full, timestamp: Date.now() };
    if (finalReasoning && finalReasoning.trim()) {
      msgData.reasoning = finalReasoning;
      if (duration) msgData.reasoningDuration = duration;
    }
    conv.messages.push(msgData);
    conv.upd = Date.now();
    saveConversations();
    addMessageActions(body, true);

    if (showTimestamps) {
      const ts = document.createElement('div');
      ts.className = 'message-timestamp';
      ts.textContent = formatTime(Date.now());
      body.appendChild(ts);
    }
    playNotification();
    if (document.hidden) showNotification('✅ Réponse prête', (full || '').substring(0, 100));
    updateTokenCounter();
  } catch (err) {
    if (err.name === 'AbortError') {
      if (streamingText || reasoningContent) {
        if (reasoningBlock) {
          if (reasoningContent && reasoningContent.trim()) {
            const duration = reasoningStartTime ? (Date.now() - reasoningStartTime) : null;
            finalizeReasoningBlock(reasoningBlock, duration, true);
          } else {
            reasoningBlock.remove();
            reasoningBlock = null;
          }
        }
        cursorEl.remove();
        try { renderMarkdown(contentEl, streamingText || ' ', false); }
        catch { contentEl.textContent = streamingText; }
        contentEl.insertAdjacentHTML('beforeend', ' <em style="color:var(--text-muted)">[interrompu]</em>');
        const msgData = { role: 'assistant', content: streamingText, timestamp: Date.now() };
        if (reasoningContent && reasoningContent.trim()) msgData.reasoning = reasoningContent;
        conv.messages.push(msgData);
        conv.upd = Date.now();
        saveConversations();
        addMessageActions(body, true);
      } else {
        msg.remove();
      }
    } else {
      cursorEl.remove();
      renderErrorInBubble(contentEl, err, { provider: providerSelect.value, model: getCurrentModel() });
      if (false) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.style.marginTop = '10px';
        btn.textContent = 'Ouvrir les paramètres';
        btn.onclick = openSettings;
        contentEl.appendChild(document.createElement('br'));
        contentEl.appendChild(btn);
      }
    }
  } finally {
    isStreaming = false;
    abortController = null;
    setSendBtnSend();
    $('scrollBottomBtn').classList.remove('streaming');
    resetStreamRenderState();
    saveConversations();
    updateTokenCounter();
  }
}

async function continueGeneration(body, bubble) {
  if (isStreaming) return;
  const conv = conversations[currentConvId];
  if (!conv || conv.messages.length === 0) return;
  let lastMsg = null;
  for (let i = conv.messages.length - 1; i >= 0; i--) {
    if (conv.messages[i].role === 'assistant') { lastMsg = conv.messages[i]; break; }
  }
  if (!lastMsg) return;

  if (lastMsg.content.startsWith('![IMAGE]')) {
      showToast("La continuation n'est pas supportée pour les images générées.", "warning");
      return;
  }

  conv.upd = Date.now();
  saveConversations();

  isStreaming = true;
  userScrolledDuringStream = false;
  resetStreamRenderState();
  $('scrollBottomBtn').classList.add('streaming');
  setSendBtnStop();
  const originalContent = lastMsg.content;
  let streamingText = originalContent;

  const actions = body.querySelector('.message-actions');
  if (actions) actions.style.display = 'none';

  const existingReasoningBlock = bubble.querySelector('.reasoning-block');
  const oldContentEl = bubble.querySelector('.stream-content') || Array.from(bubble.children).find(c => !c.classList.contains('reasoning-block'));
  if (oldContentEl && oldContentEl !== existingReasoningBlock) oldContentEl.remove();
  const oldCursor = bubble.querySelector('.typing-cursor');
  if (oldCursor) oldCursor.remove();

  const contentEl = document.createElement('div');
  contentEl.className = 'stream-content';
  renderMarkdown(contentEl, originalContent, true);
  bubble.appendChild(contentEl);

  const cursorEl = document.createElement('span');
  cursorEl.className = 'typing-cursor';
  bubble.appendChild(cursorEl);

  let reasoningBlock = null;
  let reasoningContent = '';
  let reasoningStartTime = null;
  let reasoningEndTime = null;

  abortController = new AbortController();
  try {
    const result = await streamChat(conv.messages, {
      onReasoning: (fullReasoning) => {
        reasoningContent = fullReasoning;
        if (!reasoningStartTime) reasoningStartTime = Date.now();
        if (showReasoning) {
          if (!reasoningBlock) {
            reasoningBlock = createReasoningBlock();
            if (existingReasoningBlock) existingReasoningBlock.insertAdjacentElement('afterend', reasoningBlock);
            else bubble.insertBefore(reasoningBlock, contentEl);
          }
          updateReasoningBlock(reasoningBlock, fullReasoning);
          updateReasoningStatus(reasoningBlock, reasoningStartTime);
        }
        scrollToBottom();
      },
      onDelta: (partial) => {
        if (!reasoningEndTime && reasoningContent) reasoningEndTime = Date.now();
        streamingText = originalContent + partial;
        scheduleStreamRender(contentEl, streamingText);
        scrollToBottom();
      }
    }, abortController.signal);

    const full = result.content;
    const finalReasoning = result.reasoning || reasoningContent;

    if (reasoningBlock) {
      if (finalReasoning && finalReasoning.trim()) {
        const duration = reasoningStartTime ? (reasoningEndTime || Date.now()) - reasoningStartTime : null;
        finalizeReasoningBlock(reasoningBlock, duration, true);
      } else {
        reasoningBlock.remove();
        reasoningBlock = null;
      }
    }

    cursorEl.remove();
    try { renderMarkdown(contentEl, originalContent + full, false); }
    catch { contentEl.textContent = originalContent + full; }

    lastMsg.content = originalContent + full;
    if (finalReasoning && finalReasoning.trim()) {
      lastMsg.reasoning = lastMsg.reasoning ? lastMsg.reasoning + '\n\n' + finalReasoning : finalReasoning;
    }
    conv.upd = Date.now();
    saveConversations();
    playNotification();
    updateTokenCounter();
  } catch (err) {
    if (err.name === 'AbortError') {
      if (reasoningBlock) {
        if (reasoningContent && reasoningContent.trim()) {
          const duration = reasoningStartTime ? (Date.now() - reasoningStartTime) : null;
          finalizeReasoningBlock(reasoningBlock, duration, true);
        } else {
          reasoningBlock.remove();
        }
      }
      cursorEl.remove();
      lastMsg.content = streamingText;
      if (reasoningContent && reasoningContent.trim()) {
        lastMsg.reasoning = lastMsg.reasoning ? lastMsg.reasoning + '\n\n' + reasoningContent : reasoningContent;
      }
      try { renderMarkdown(contentEl, streamingText, false); }
      catch { contentEl.textContent = streamingText; }
      conv.upd = Date.now();
      saveConversations();
    } else {
      showToast("Erreur lors de la continuation : " + err.message, 'error');
      cursorEl.remove();
      try { renderMarkdown(contentEl, originalContent, false); }
      catch { contentEl.textContent = originalContent; }
    }
  } finally {
    isStreaming = false;
    abortController = null;
    setSendBtnSend();
    if (actions) actions.style.display = 'flex';
    $('scrollBottomBtn').classList.remove('streaming');
    resetStreamRenderState();
    saveConversations();
    updateTokenCounter();
  }
}

function setSendBtnStop() {
  sendBtn.classList.add('stop');
  sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
}
function setSendBtnSend() {
  sendBtn.classList.remove('stop');
  sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
}
function stopStreaming() { if (abortController) abortController.abort(); }

function openSettings() {
  renderProviderKeys();
  renderCustomProviders();
  initSettingsControls();
  applyAllAppearance();
  settingsModal.classList.add('open');
}
function closeSettings() { settingsModal.classList.remove('open'); }

function initSettingsControls() {
  $('systemPromptInput').value = systemPrompt;
  $('systemPromptInput').oninput = (e) => { systemPrompt = e.target.value; localStorage.setItem('deepchat_system_prompt', systemPrompt); };

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.onclick = () => {
      $('systemPromptInput').value = btn.dataset.prompt;
      systemPrompt = btn.dataset.prompt;
      localStorage.setItem('deepchat_system_prompt', systemPrompt);
    };
  });

  const tempRange = $('tempRange');
  tempRange.value = currentTemperature;
  $('tempValue').textContent = currentTemperature.toFixed(2);
  tempRange.oninput = (e) => { currentTemperature = parseFloat(e.target.value); $('tempValue').textContent = currentTemperature.toFixed(2); localStorage.setItem('deepchat_temperature', currentTemperature); };

  const topPRange = $('topPRange');
  topPRange.value = currentTopP;
  $('topPValue').textContent = currentTopP.toFixed(2);
  topPRange.oninput = (e) => { currentTopP = parseFloat(e.target.value); $('topPValue').textContent = currentTopP.toFixed(2); localStorage.setItem('deepchat_topp', currentTopP); };

  const freqRange = $('freqPenaltyRange');
  freqRange.value = currentFreqPenalty;
  $('freqPenaltyValue').textContent = currentFreqPenalty.toFixed(2);
  freqRange.oninput = (e) => { currentFreqPenalty = parseFloat(e.target.value); $('freqPenaltyValue').textContent = currentFreqPenalty.toFixed(2); localStorage.setItem('deepchat_freqpenalty', currentFreqPenalty); };

  const presRange = $('presPenaltyRange');
  presRange.value = currentPresPenalty;
  $('presPenaltyValue').textContent = currentPresPenalty.toFixed(2);
  presRange.oninput = (e) => { currentPresPenalty = parseFloat(e.target.value); $('presPenaltyValue').textContent = currentPresPenalty.toFixed(2); localStorage.setItem('deepchat_prespenalty', currentPresPenalty); };

  const maxTokensInput = $('maxTokensInput');
  maxTokensInput.value = currentMaxTokens;
  maxTokensInput.onchange = (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val) || val < 100) val = 100;
    if (val > 200000) val = 200000;
    currentMaxTokens = val;
    e.target.value = val;
    localStorage.setItem('deepchat_maxtokens', currentMaxTokens);
  };

  document.querySelectorAll('.theme-option').forEach(o => {
    o.classList.toggle('active', o.dataset.theme === currentTheme);
    o.onclick = () => setTheme(o.dataset.theme);
  });

  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.color === customAccent);
    sw.onclick = () => {
      customAccent = sw.dataset.color;
      localStorage.setItem('deepchat_accent', customAccent);
      applyAllAppearance();
      if (customAccent !== 'default') $('customColorInput').value = customAccent;
    };
  });

  const customColor = $('customColorInput');
  if (customAccent !== 'default' && customAccent.startsWith('#')) customColor.value = customAccent;
  customColor.oninput = (e) => {
    customAccent = e.target.value;
    localStorage.setItem('deepchat_accent', customAccent);
    applyAllAppearance();
    document.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('active'));
  };

  const fontSizeRange = $('fontSizeRange');
  fontSizeRange.value = currentFontSize;
  $('fontSizeValue').textContent = currentFontSize + 'px';
  fontSizeRange.oninput = (e) => { currentFontSize = parseInt(e.target.value); $('fontSizeValue').textContent = currentFontSize + 'px'; applyFontSize(currentFontSize); localStorage.setItem('deepchat_fontsize', currentFontSize); };

  const bwRange = $('bubbleWidthRange');
  bwRange.value = currentBubbleWidth;
  $('bubbleWidthValue').textContent = currentBubbleWidth + '%';
  bwRange.oninput = (e) => {
    currentBubbleWidth = parseInt(e.target.value);
    $('bubbleWidthValue').textContent = currentBubbleWidth + '%';
    applyBubbleWidth(currentBubbleWidth);
    localStorage.setItem('deepchat_bubblewidth', currentBubbleWidth);
  };

  const compactToggle = $('compactToggle');
  compactToggle.classList.toggle('on', compactMode);
  compactToggle.onclick = () => { compactMode = !compactMode; compactToggle.classList.toggle('on', compactMode); applyCompact(compactMode); localStorage.setItem('deepchat_compact', compactMode ? '1' : '0'); };

  const reasonToggle = $('reasoningToggle');
  reasonToggle.classList.toggle('on', showReasoning);
  reasonToggle.onclick = () => { showReasoning = !showReasoning; reasonToggle.classList.toggle('on', showReasoning); localStorage.setItem('deepchat_show_reasoning', showReasoning ? '1' : '0'); renderCurrentConversation(); };

  const tsToggle = $('timestampsToggle');
  tsToggle.classList.toggle('on', showTimestamps);
  tsToggle.onclick = () => { showTimestamps = !showTimestamps; tsToggle.classList.toggle('on', showTimestamps); localStorage.setItem('deepchat_timestamps', showTimestamps ? '1' : '0'); renderCurrentConversation(); };

  const asToggle = $('autoScrollToggle');
  asToggle.classList.toggle('on', autoScrollEnabled);
  asToggle.onclick = () => { autoScrollEnabled = !autoScrollEnabled; asToggle.classList.toggle('on', autoScrollEnabled); localStorage.setItem('deepchat_autoscroll', autoScrollEnabled ? '1' : '0'); };

  const sToggle = $('soundToggle');
  sToggle.classList.toggle('on', soundEnabled);
  sToggle.onclick = () => { soundEnabled = !soundEnabled; sToggle.classList.toggle('on', soundEnabled); localStorage.setItem('deepchat_sound', soundEnabled ? '1' : '0'); if (soundEnabled) playNotification(); };
  
  const idbToggle = $('idbToggle');
  if (idbToggle) {
    idbToggle.classList.toggle('on', useIDB);
    idbToggle.onclick = () => {
      useIDB = !useIDB;
      idbToggle.classList.toggle('on', useIDB);
      localStorage.setItem('deepchat_use_idb', useIDB ? '1' : '0');
      
      // Sauvegarde immédiate pour basculer les données actuelles
      saveConversations();
      saveDraftsToStorage();
      
      showToast(useIDB ? '🚀 Stockage étendu (IndexedDB) activé' : '📦 Stockage local standard activé', 'success');
    };
  }
}

// Nouvelle fonction pour rafraichir uniquement l'UI de la liste des modèles
function updateProviderModelUI(providerKey) {
  const container = document.getElementById(`model-list-${providerKey}`);
  if (!container) return;
  
  container.innerHTML = '';
  const p = PROVIDERS[providerKey];
  if (!p || !p.models) return;
  
  p.models.forEach((model, index) => {
    const item = document.createElement('div');
    item.className = 'model-item';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'stretch';
    
    // Ligne du haut (Input + Boutons)
    const topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.alignItems = 'center';
    topRow.style.gap = '8px';
    topRow.style.width = '100%';
    
    topRow.innerHTML = `
      <span class="drag-handle">⋮⋮</span>
      <input type="text" class="model-id" value="${escapeHtml(model)}" placeholder="ID">
      <button class="btn-edit-limits" title="Configurer les limites manuellement">⚙️</button>
      <button class="btn-del-model" title="Supprimer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
    `;
    
    // Éditeur de limites (caché par défaut)
    const limitsEditor = document.createElement('div');
    limitsEditor.className = 'model-limits-editor';
    limitsEditor.style.display = 'none';
    
    // On récupère les limites par défaut actuelles
    const defaultLimits = getModelLimits(model) || {};
    const currentLimits = customModelLimits[model] || {};
    
    // Valeur à afficher : personnalisée si elle existe, sinon la valeur par défaut
    const displayCtx = currentLimits.context !== undefined ? currentLimits.context : (defaultLimits.context || '');
    const displayOut = currentLimits.output !== undefined ? currentLimits.output : (defaultLimits.output || '');
    
    limitsEditor.innerHTML = `
      <label>Ctx <input type="number" class="ctx-input" placeholder="Auto${defaultLimits.context ? ' ('+defaultLimits.context+')' : ''}" value="${displayCtx}"></label>
      <label>Out <input type="number" class="out-input" placeholder="Auto${defaultLimits.output ? ' ('+defaultLimits.output+')' : ''}" value="${displayOut}"></label>
    `;
    
    item.appendChild(topRow);
    item.appendChild(limitsEditor);
    
    // Gestion de la modification du nom du modèle
    const input = topRow.querySelector('.model-id');
    input.addEventListener('change', (e) => {
      const newVal = e.target.value.trim();
      if (newVal && newVal !== model) {
        const oldModel = model;
        p.models[index] = newVal;
        
        // Transférer les limites si le nom change
        if (customModelLimits[oldModel]) {
          customModelLimits[newVal] = customModelLimits[oldModel];
          delete customModelLimits[oldModel];
          saveCustomModelLimits();
        }
        
        if (p.isCustom) {
          const cp = customProviders.find(c => c.id === providerKey);
          if (cp) { cp.models = p.models; localStorage.setItem('deepchat_custom_providers', JSON.stringify(customProviders)); }
        }
        updateModelList();
        updateProviderModelUI(providerKey);
      }
    });

    // Bouton supprimer
    topRow.querySelector('.btn-del-model').onclick = () => {
      const modelToDelete = p.models[index];
      p.models.splice(index, 1);
      delete customModelLimits[modelToDelete];
      saveCustomModelLimits();
      updateProviderModelUI(providerKey);
      updateModelList();
      if (p.isCustom) {
        const cp = customProviders.find(c => c.id === providerKey);
        if (cp) { cp.models = p.models; localStorage.setItem('deepchat_custom_providers', JSON.stringify(customProviders)); }
      }
    };

    // Bouton ⚙️ pour afficher/masquer l'éditeur
    topRow.querySelector('.btn-edit-limits').onclick = (e) => {
      e.preventDefault();
      limitsEditor.style.display = limitsEditor.style.display === 'none' ? 'flex' : 'none';
    };
    
    // Sauvegarde des limites
    const saveLimits = () => {
      const ctxVal = parseInt(limitsEditor.querySelector('.ctx-input').value);
      const outVal = parseInt(limitsEditor.querySelector('.out-input').value);
      
      // Si l'utilisateur vide le champ, on supprime la limite personnalisée
      // Sinon, on la sauvegarde
      if ((!isNaN(ctxVal) && ctxVal > 0) || (!isNaN(outVal) && outVal > 0)) {
        customModelLimits[model] = {};
        if (!isNaN(ctxVal) && ctxVal > 0) customModelLimits[model].context = ctxVal;
        if (!isNaN(outVal) && outVal > 0) customModelLimits[model].output = outVal;
      } else {
        delete customModelLimits[model]; // Si vide, on repasse en mode auto
      }
      
      saveCustomModelLimits();
      updateTokenCounter(); // Met à jour la jauge d'utilisation instantanément
      
      // Petit feedback visuel
      const btn = topRow.querySelector('.btn-edit-limits');
      const oldText = btn.innerHTML;
      btn.innerHTML = '✅';
      setTimeout(() => btn.innerHTML = oldText, 1000);
    };
    
    limitsEditor.querySelector('.ctx-input').addEventListener('change', saveLimits);
    limitsEditor.querySelector('.out-input').addEventListener('change', saveLimits);
    
    container.appendChild(item);
  });
}

// Variables pour la modale de sélection
function openModelsSelectionModal(providerKey, models) {
  currentFetchProviderKey = providerKey;
  currentFetchedModelsList = models;
  
  const modal = $('modelsSelectionModal');
  const title = $('modelsSelectionTitle');
  const listContainer = $('modelsSelectionList');
  const searchInput = $('modelSearchInput');
  
  title.textContent = `Modèles disponibles (${PROVIDERS[providerKey].label})`;
  searchInput.value = '';
  
  renderModelsList(models, searchInput.value);
  modal.classList.add('open');
}

function renderModelsList(models, filterText = '') {
  const listContainer = $('modelsSelectionList');
  const filter = filterText.toLowerCase().trim();
  
  // ✨ NOUVEAU : On récupère la liste des modèles déjà installés pour ce fournisseur
  const installedModels = PROVIDERS[currentFetchProviderKey]?.models || [];

  listContainer.innerHTML = models.map((m, index) => {
    if (filter && !m.toLowerCase().includes(filter)) return '';
    
    // ✨ NOUVEAU : On vérifie si le modèle est déjà installé
    const isChecked = installedModels.includes(m) ? 'checked' : '';

    return `
      <label class="model-select-item">
        <input type="checkbox" value="${index}" class="model-checkbox" ${isChecked}>
        <span class="model-select-name">${escapeHtml(m)}</span>
      </label>
    `;
  }).join('');

  // Mettre à jour le compteur
  updateSelectedModelsCount();
  
  // Ajouter les écouteurs sur les checkboxes
  listContainer.querySelectorAll('.model-checkbox').forEach(cb => {
    cb.addEventListener('change', updateSelectedModelsCount);
  });
}

function updateSelectedModelsCount() {
  const checked = document.querySelectorAll('.model-checkbox:checked').length;
  $('selectedModelsCount').textContent = `${checked} sélectionné(s)`;
}

// Gestion des boutons de la modale (à exécuter au chargement de la page)
document.addEventListener('DOMContentLoaded', () => {
  // Recherche
  const searchInput = $('modelSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderModelsList(currentFetchedModelsList, e.target.value);
    });
  }

  // Tout cocher
  const selectAllBtn = $('selectAllModelsBtn');
  if (selectAllBtn) {
    selectAllBtn.onclick = () => {
      document.querySelectorAll('.model-checkbox').forEach(cb => cb.checked = true);
      updateSelectedModelsCount();
    };
  }

  // Tout décocher
  const unselectAllBtn = $('unselectAllModelsBtn');
  if (unselectAllBtn) {
    unselectAllBtn.onclick = () => {
      document.querySelectorAll('.model-checkbox').forEach(cb => cb.checked = false);
      updateSelectedModelsCount();
    };
  }

  // Fermer
  const closeModal = () => $('modelsSelectionModal').classList.remove('open');
  $('closeModelsSelectionBtn').onclick = closeModal;
  $('cancelModelsSelectionBtn').onclick = closeModal;
  $('modelsSelectionModal').addEventListener('click', (e) => {
    if (e.target === $('modelsSelectionModal')) closeModal();
  });

  // Valider
  $('validateModelsSelectionBtn').onclick = () => {
    const checkedBoxes = document.querySelectorAll('.model-checkbox:checked');
    const selectedModels = Array.from(checkedBoxes).map(cb => currentFetchedModelsList[parseInt(cb.value)]);
    
    if (selectedModels.length === 0) {
      showToast('Veuillez sélectionner au moins un modèle.', 'warning');
      return;
    }

    const k = currentFetchProviderKey;
    PROVIDERS[k].models = selectedModels;

    // Sauvegarder si c'est un fournisseur personnalisé
    if (PROVIDERS[k].isCustom) {
      const cp = customProviders.find(c => c.id === k);
      if (cp) {
        cp.models = selectedModels;
        localStorage.setItem('deepchat_custom_providers', JSON.stringify(customProviders));
      }
    }

    updateProviderModelUI(k);
    updateModelList();
    closeModal();
    showToast(`✅ ${selectedModels.length} modèle(s) sélectionné(s)`, 'success');
  };
});

function renderProviderKeys() {
  const container = $('providerKeysContainer');
  container.innerHTML = '';
  const t = translations[currentLang] || translations.fr; 
  
  Object.entries(PROVIDERS).forEach(([k, p]) => {
    const row = document.createElement('div');
    row.className = 'provider-key-row';
    
    const status = apiKeys[k] 
      ? `<span class="provider-status set">${t.defined}</span>` 
      : `<span class="provider-status">${t.undefined}</span>`;
      
    const keyLink = p.apiKeyUrl
      ? ` <a href="${p.apiKeyUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="font-size:11px;color:var(--accent);text-decoration:none;margin-left:6px;">${t.getKey} ↗</a>`
      : '';

    row.innerHTML = `
      <div class="provider-header" onclick="this.parentElement.classList.toggle('expanded')">
        <div class="provider-header-left">
          <strong>${p.label}</strong> 
          ${status}${keyLink}
        </div>
        <svg class="provider-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      <div class="provider-key-content">
        <div class="form-row">
          <input type="password" data-provider="${k}" placeholder="Clé API ${p.label}" value="${apiKeys[k] ? '••••••••••••' : ''}">
          <button class="btn btn-secondary" data-toggle="${k}" title="Afficher/Masquer" style="padding:8px 12px;">👁</button>
          <button class="btn btn-secondary test-btn" data-test="${k}">${t.testBtn}</button>
        </div>

        <!-- Section Paramètres personnalisés -->
        <div style="margin-top: 12px; border-top: 1px solid var(--border); padding-top: 10px;">
          <div onclick="const el = this.nextElementSibling; el.style.display = el.style.display === 'none' ? 'block' : 'none'; this.querySelector('.arrow').style.transform = el.style.display === 'none' ? 'rotate(0deg)' : 'rotate(90deg)';" 
               style="font-size: 12px; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; gap: 6px; user-select: none;">
            <span class="arrow" style="display:inline-block; transition: transform 0.2s; font-weight: bold; font-size: 14px;">›</span> 
            ${t.customSettings}
          </div>
          
          <div style="display: none; margin-top: 10px;">
            <div class="form-group">
              <label class="form-label">${t.baseUrl}</label>
              <input type="text" class="form-input" data-custom-url="${k}" value="${p.endpoint || ''}">
            </div>
            
            <div class="form-group" style="background: rgba(127,127,127,0.05); padding: 10px; border-radius: 8px; border: 1px solid var(--border);">
              <label class="form-label" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                <span>${t.modelsLabel}</span>
                <button class="btn btn-secondary" data-fetch-models="${k}" style="padding: 4px 8px; font-size: 11px;">${t.fetchModels}</button>
              </label>
              
              <!-- Nouvelle liste de modèles dynamique -->
              <div class="model-list" id="model-list-${k}"></div>
              <button class="btn-add-model" data-add-model="${k}">${t.addModel}</button>
            </div>
          </div>
        </div>

      </div>
    `;
    container.appendChild(row);
    
    // Initialiser l'UI de la liste pour ce fournisseur
    updateProviderModelUI(k);
  });

  // Gestion de la saisie et sauvegarde
  container.querySelectorAll('input[data-provider]').forEach(inp => {
    inp.addEventListener('focus', () => { if (inp.value.startsWith('••')) inp.value = ''; });
    inp.addEventListener('blur', () => {
      const k = inp.dataset.provider;
      const val = inp.value.trim();
      if (val && !val.startsWith('••')) {
        apiKeys[k] = val;
        localStorage.setItem('deepchat_keys', JSON.stringify(apiKeys));
        inp.value = '••••••••••••';
        showToast(`Clé ${PROVIDERS[k].label} enregistrée`, 'success');
        renderProviderKeys();
      }
    });
  });

  // Bouton 👁 pour afficher/masquer
  container.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const k = btn.dataset.toggle;
      const inp = container.querySelector(`input[data-provider="${k}"]`);
      if (inp.type === 'password') {
        inp.type = 'text';
        if (inp.value.startsWith('••')) inp.value = apiKeys[k] || '';
      } else {
        inp.type = 'password';
        if (apiKeys[k]) inp.value = '••••••••••••';
      }
    };
  });

  // Bouton Tester
  container.querySelectorAll('.test-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const k = btn.dataset.test;
      const inp = container.querySelector(`input[data-provider="${k}"]`);
      let keyToTest = inp.value.trim();
      
      if (keyToTest.startsWith('••')) keyToTest = apiKeys[k];
      if (!keyToTest) { showToast('Veuillez saisir une clé avant de tester.', 'error'); return; }
      
      if (!keyToTest.startsWith('••') && !apiKeys[k]) {
        apiKeys[k] = keyToTest;
        localStorage.setItem('deepchat_keys', JSON.stringify(apiKeys));
      }
      
      btn.className = 'btn test-btn testing';
      btn.innerHTML = 'Test…';
      btn.disabled = true;
      
      try {
        const isValid = await testApiKey(k, keyToTest);
        if (isValid) {
          btn.className = 'btn test-btn success';
          btn.innerHTML = '✅ OK';
          showToast(`La clé ${PROVIDERS[k].label} est valide !`, 'success');
        } else {
          btn.className = 'btn test-btn error';
          btn.innerHTML = '❌ Invalide';
          showToast(`La clé ${PROVIDERS[k].label} est invalide.`, 'error');
        }
      } catch (err) {
        btn.className = 'btn test-btn error';
        btn.innerHTML = '❌ Erreur';
        showToast(`Erreur réseau/CORS pour ${PROVIDERS[k].label}.`, 'error');
      } finally {
        setTimeout(() => {
          if (btn.classList.contains('testing')) return;
          btn.className = 'btn btn-secondary test-btn';
          btn.innerHTML = 'Tester';
          btn.disabled = false;
        }, 3000);
      }
    };
  });

  // Sauvegarde URL personnalisée
  container.querySelectorAll('input[data-custom-url]').forEach(inp => {
    inp.addEventListener('change', (e) => {
      const k = inp.dataset.customUrl;
      PROVIDERS[k].endpoint = e.target.value.trim();
      if (PROVIDERS[k].isCustom) {
        const cp = customProviders.find(c => c.id === k);
        if (cp) { cp.endpoint = PROVIDERS[k].endpoint; localStorage.setItem('deepchat_custom_providers', JSON.stringify(customProviders)); }
      }
      showToast('Endpoint mis à jour', 'success');
    });
  });

  // Bouton Ajouter un modèle manuellement
  container.querySelectorAll('[data-add-model]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const k = btn.dataset.addModel;
      const newModel = prompt("Entrez l'ID du nouveau modèle :");
      if (newModel && newModel.trim()) {
        PROVIDERS[k].models.push(newModel.trim());
        updateProviderModelUI(k);
        updateModelList();
        if (PROVIDERS[k].isCustom) {
          const cp = customProviders.find(c => c.id === k);
          if (cp) { cp.models = PROVIDERS[k].models; localStorage.setItem('deepchat_custom_providers', JSON.stringify(customProviders)); }
        }
      }
    };
  });

  // Bouton Récupérer les modèles (FILTRÉ POUR LE GRATUIT)
  container.querySelectorAll('[data-fetch-models]').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const k = btn.dataset.fetchModels;
      let key = apiKeys[k];
      
      if (!key) {
        key = prompt(`Colle ta clé API pour ${PROVIDERS[k].label} afin de récupérer les modèles :`);
        if (!key) return;
        apiKeys[k] = key;
        localStorage.setItem('deepchat_keys', JSON.stringify(apiKeys));
      }

      let url = PROVIDERS[k].testUrl;
      if (!url && PROVIDERS[k].endpoint) {
        url = PROVIDERS[k].endpoint.replace(/\/chat\/completions\/?$/, '/models');
      }
      
      const customUrlInput = container.querySelector(`input[data-custom-url="${k}"]`);
      if (customUrlInput && customUrlInput.value) {
         let customUrl = customUrlInput.value;
         url = customUrl.replace(/\/chat\/completions\/?$/, '/models');
      }

      if (!url) {
        showToast("URL introuvable pour récupérer les modèles.", "warning");
        return;
      }

      btn.innerHTML = '⏳...';
      btn.disabled = true;

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${key}` }
        });

        if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
        const data = await res.json();

        let allModels = [];
        if (data.data && Array.isArray(data.data)) allModels = data.data;
        else if (data.models && Array.isArray(data.models)) allModels = data.models;

        // ✨ FILTRAGE : Uniquement les modèles de CHAT et GRATUITS ✨
        let freeModels = allModels.filter(m => {
            const id = (m.id || m.name || '').toLowerCase();
            
            // 1. EXCLURE les modèles audio (Whisper, Allam, etc.)
            if (id.includes('whisper') || id.includes('allam') || id.includes('tts')) return false;
            // Exclure aussi les modèles de garde ou d'embedding
            if (id.includes('guard') || id.includes('embed')) return false;

            // 2. Si c'est OpenRouter et qu'il y a des infos de prix, on vérifie si c'est 0
            if (m.pricing && (m.pricing.prompt === "0" || m.pricing.prompt === 0)) return true;
            if (m.pricing && m.pricing.prompt !== "0" && m.pricing.prompt !== 0) return false;

            // 3. Si l'ID contient ':free', c'est gratuit
            if (id.includes(':free')) return true;
            
            // 4. Pour les autres fournisseurs (Groq, etc.), on garde le modèle
            return true; 
        });

        // Si le filtre a tout supprimé par erreur, on prend tout pour ne pas laisser vide
        if (freeModels.length === 0) freeModels = allModels;

        const modelIds = freeModels.map(m => m.id || m.name);
        
        if (customUrlInput) PROVIDERS[k].endpoint = customUrlInput.value;
        if (PROVIDERS[k].isCustom) {
            const cpIndex = customProviders.findIndex(cp => cp.id === k);
            if (cpIndex > -1) {
                customProviders[cpIndex].endpoint = PROVIDERS[k].endpoint;
                localStorage.setItem('deepchat_custom_providers', JSON.stringify(customProviders));
            }
        }

        // OUVERTURE DE LA MODALE AU LIEU DE REMPLACER DIRECTEMENT
        openModelsSelectionModal(k, modelIds);
        
      } catch (err) {
        showToast("❌ Impossible de récupérer les modèles : " + err.message, "error");
      } finally {
        btn.innerHTML = '🔄 Récupérer les modèles disponibles';
        btn.disabled = false;
      }
    };
  });
}

function renderCustomProviders() {
  const container = $('customProvidersContainer');
  container.innerHTML = '';
  const t = translations[currentLang] || translations.fr;
  if (customProviders.length === 0) {
    container.innerHTML = `<p style="font-size:12px;color:var(--text-muted);text-align:center;padding:8px;">${t.noCustom}</p>`;
    return;
  }
  customProviders.forEach((cp, i) => {
    const row = document.createElement('div');
    row.className = 'provider-key-row';
    row.style.cssText = 'padding:10px;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;margin-bottom:8px;';
    const cpLink = cp.apiKeyUrl
      ? ` <a href="${cp.apiKeyUrl}" target="_blank" rel="noopener" style="font-size:11px;color:var(--accent);text-decoration:none;margin-left:6px;">Obtenir une clé ↗</a>`
      : '';
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;">
        <div>
          <strong style="font-size:13px;">${escapeHtml(cp.label)}</strong>${cpLink}
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${escapeHtml(cp.endpoint)}</div>
        </div>
        <button class="btn btn-danger" data-del-cp="${i}" style="padding:4px 8px;font-size:11px;">${t.deleteBtn}</button>
      </div>
      <div class="form-row">
        <input type="password" data-cp-key="${i}" placeholder="Clé API ${escapeHtml(cp.label)}" value="${apiKeys[cp.id] ? '••••••••••••' : ''}">
      </div>`;
    container.appendChild(row);
  });

  container.querySelectorAll('[data-del-cp]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.delCp);
      if (!confirm('Supprimer ce fournisseur personnalisé ?')) return;
      const cp = customProviders[idx];
      delete apiKeys[cp.id];
      localStorage.setItem('deepchat_keys', JSON.stringify(apiKeys));
      customProviders.splice(idx, 1);
      localStorage.setItem('deepchat_custom_providers', JSON.stringify(customProviders));
      delete PROVIDERS[cp.id];
      rebuildProviders();
      renderCustomProviders();
      renderProviderKeys();
    };
  });

  container.querySelectorAll('input[data-cp-key]').forEach(inp => {
    inp.addEventListener('focus', () => { if (inp.value.startsWith('••')) inp.value = ''; });
    inp.addEventListener('blur', () => {
      const idx = parseInt(inp.dataset.cpKey);
      const cp = customProviders[idx];
      const val = inp.value.trim();
      if (val && !val.startsWith('••')) {
        apiKeys[cp.id] = val;
        localStorage.setItem('deepchat_keys', JSON.stringify(apiKeys));
        inp.value = '••••••••••••';
        showToast(`Clé ${cp.label} enregistrée`, 'success');
      }
    });
  });
}

function rebuildProviders() {
  PROVIDERS = { ...DEFAULT_PROVIDERS };
  customProviders.forEach(cp => {
    PROVIDERS[cp.id] = {
      label: cp.label, endpoint: cp.endpoint, models: cp.models, format: 'openai',
      testUrl: cp.testUrl || cp.endpoint.replace(/\/chat\/completions\/?$/, '/models'),
      testType: 'bearer', isCustom: true
    };
  });
  initProviderSelect();
}

function addCustomProvider() {
  const label = $('cpLabel').value.trim();
  const endpoint = $('cpEndpoint').value.trim();
  const testUrl = $('cpTestUrl').value.trim();
  const models = $('cpModels').value.split(',').map(m => m.trim()).filter(Boolean);
  if (!label || !endpoint || models.length === 0) {
    showToast('Nom, endpoint et au moins un modèle requis.', 'error');
    return;
  }
  const id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  customProviders.push({ id, label, endpoint, testUrl, models });
  localStorage.setItem('deepchat_custom_providers', JSON.stringify(customProviders));
  rebuildProviders();
  $('cpLabel').value = '';
  $('cpEndpoint').value = '';
  $('cpTestUrl').value = '';
  $('cpModels').value = '';
  $('customProviderForm').style.display = 'none';
  renderCustomProviders();
  renderProviderKeys();
  showToast(`Fournisseur "${label}" ajouté`, 'success');
}

async function exportConversations() {
  await hydrateConversations();
  const data = JSON.stringify(conversations, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `deepchat-export-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Conversations exportées', 'success');
}
function importConversations(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (typeof imported !== 'object') throw new Error('Format invalide');
      let count = 0;
      Object.entries(imported).forEach(([id, conv]) => {
        if (!conversations[id]) { conversations[id] = conv; count++; }
      });
      saveConversations();
      renderConversations();
      showToast(`${count} conversation(s) importée(s)`, 'success');
    } catch (err) {
      showToast('Fichier invalide : ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}
function resetAllSettings() {
  if (!confirm('Réinitialiser tous les paramètres (apparence, génération, chat) ?')) return;
  ['deepchat_theme','deepchat_accent','deepchat_fontsize','deepchat_bubblewidth','deepchat_compact','deepchat_timestamps','deepchat_sound','deepchat_autoscroll','deepchat_system_prompt','deepchat_temperature','deepchat_maxtokens','deepchat_topp','deepchat_freqpenalty','deepchat_prespenalty','deepchat_show_reasoning'].forEach(k => localStorage.removeItem(k));
  currentTheme = 'dark'; customAccent = 'default'; currentFontSize = 14; currentBubbleWidth = 100;
  compactMode = false; showTimestamps = false; showReasoning = true; soundEnabled = false; autoScrollEnabled = true;
  systemPrompt = ''; currentTemperature = 0.7; currentMaxTokens = 8192; currentTopP = 1; currentFreqPenalty = 0; currentPresPenalty = 0;
  applyAllAppearance();
  initSettingsControls();
  renderCurrentConversation();
  showToast('Paramètres réinitialisés', 'success');
}

function autoResize() {
  if (!messageInput.value.trim()) {
    messageInput.style.height = '24px';
    return;
  }
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
}

providerSelect.addEventListener('change', updateModelList);
modelSelect.addEventListener('change', updateModelDescription);
hfModelInput.addEventListener('input', updateModelDescription);
hfModelInput.addEventListener('change', () => localStorage.setItem('deepchat_hfmodel', hfModelInput.value));
sendBtn.addEventListener('click', () => { if (isStreaming) stopStreaming(); else sendMessage(); });
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isStreaming) sendMessage(); }
});
messageInput.addEventListener('input', () => { autoResize(); saveDraft(); updateTokenCounter(); });
$('newChatBtn').addEventListener('click', newConversation);
$('newChatBtn2').addEventListener('click', newConversation);
$('cancelEditBtn').addEventListener('click', () => { cancelEdit(); messageInput.value = ''; autoResize(); updateTokenCounter(); });

$('galleryBtn').addEventListener('click', openGallery);
$('closeGalleryBtn').addEventListener('click', () => $('galleryModal').classList.remove('open'));
$('galleryModal').addEventListener('click', (e) => { if (e.target === $('galleryModal')) $('galleryModal').classList.remove('open'); });

$('collapseBtn').addEventListener('click', () => {
  if (window.innerWidth <= 768) document.body.classList.remove('sidebar-mobile-open');
  else { document.body.classList.toggle('sidebar-collapsed'); localStorage.setItem('deepchat_sidebar', document.body.classList.contains('sidebar-collapsed') ? '1' : '0'); }
});
$('openSidebarBtn').addEventListener('click', () => document.body.classList.add('sidebar-mobile-open'));
backdrop.addEventListener('click', () => document.body.classList.remove('sidebar-mobile-open'));

// ===== SWIPE POUR FERMER LE SIDEBAR (mobile) =====
let touchStartX = 0;
let touchCurrentX = 0;
const sidebarEl = $('sidebar');

sidebarEl.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchCurrentX = touchStartX;
  sidebarEl.style.transition = 'none';
}, { passive: true });

sidebarEl.addEventListener('touchmove', e => {
  if (!document.body.classList.contains('sidebar-mobile-open')) return;
  touchCurrentX = e.touches[0].clientX;
  const dx = touchCurrentX - touchStartX;
  if (dx < 0) {
    sidebarEl.style.transform = `translateX(${dx}px)`;
  }
}, { passive: true });

sidebarEl.addEventListener('touchend', () => {
  const dx = touchCurrentX - touchStartX;
  sidebarEl.style.transition = '';
  sidebarEl.style.transform = '';
  if (dx < -60) document.body.classList.remove('sidebar-mobile-open');
}, { passive: true });

searchInput.addEventListener('input', renderConversations);
$('settingsBtn').addEventListener('click', openSettings);
$('themeBtn').addEventListener('click', () => { openSettings(); document.querySelector('.tab-btn[data-tab="appearance"]').click(); });
$('closeSettingsBtn').addEventListener('click', closeSettings);
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettings(); });
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === btn.dataset.tab));
  };
});

$('clearAllBtn').addEventListener('click', async () => {
  if (confirm('Supprimer TOUTES les conversations ? Cette action est irréversible.')) {
    conversations = {}; drafts = {};
    localStorage.removeItem('deepchat_drafts');
    await idbClearAll();
    await saveConversations();
    newConversation();
    showToast('Conversations et images supprimées', 'success');
  }
});
$('clearKeysBtn').addEventListener('click', () => {
  if (confirm('Supprimer toutes les clés API ?')) {
    apiKeys = {};
    localStorage.removeItem('deepchat_keys');
    renderProviderKeys();
    renderCustomProviders();
    showToast('Clés supprimées', 'success');
  }
});
$('resetSettingsBtn').addEventListener('click', resetAllSettings);
$('exportBtn').addEventListener('click', exportConversations);
$('importBtn').addEventListener('click', () => $('importInput').click());
$('importInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) importConversations(file);
  e.target.value = '';
});
$('addCustomProviderBtn').addEventListener('click', () => {
  const f = $('customProviderForm');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
});
$('cancelCustomProviderBtn').addEventListener('click', () => $('customProviderForm').style.display = 'none');
$('saveCustomProviderBtn').addEventListener('click', addCustomProvider);

chatMessages.addEventListener('scroll', () => {
  const { scrollHeight, clientHeight, scrollTop } = chatMessages;
  const distance = scrollHeight - clientHeight - scrollTop;
  if (distance < 50) userScrolledDuringStream = false;
  $('scrollBottomBtn').classList.toggle('visible', distance > 100);
}, { passive: true });
chatMessages.addEventListener('wheel', (e) => {
  if (isStreaming && e.deltaY < 0) userScrolledDuringStream = true;
}, { passive: true });
chatMessages.addEventListener('touchmove', () => {
  if (isStreaming) userScrolledDuringStream = true;
}, { passive: true });
$('scrollBottomBtn').addEventListener('click', () => {
  userScrolledDuringStream = false;
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
});

document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'b') {
    e.preventDefault();
    if (window.innerWidth <= 768) document.body.classList.toggle('sidebar-mobile-open');
    else { document.body.classList.toggle('sidebar-collapsed'); localStorage.setItem('deepchat_sidebar', document.body.classList.contains('sidebar-collapsed') ? '1' : '0'); }
  }
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); newConversation(); }
  if (mod && e.key === ',') { e.preventDefault(); openSettings(); }
  if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); exportConversations(); }
  if (e.key === 'Escape') { 
    closeSettings(); 
    document.body.classList.remove('sidebar-mobile-open'); 
    $('galleryModal').classList.remove('open'); 
    
    // Ferme l'aperçu de code si ouvert
    const activePreview = document.querySelector('.code-preview-container.active');
    if (activePreview) {
      const btnClose = activePreview.querySelector('.code-preview-close');
      if (btnClose) btnClose.click();
    }
    
    // Ferme la modale de sélection de modèles si ouverte
    const modelsModal = $('modelsSelectionModal');
    if (modelsModal && modelsModal.classList.contains('open')) {
      modelsModal.classList.remove('open');
    }
  }
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (currentTheme === 'system') applyTheme('system');
});

function checkMobile() {
  $('openSidebarBtn').style.display = window.innerWidth <= 768 ? 'flex' : 'none';
  if (window.innerWidth > 768) document.body.classList.remove('sidebar-mobile-open');
}
window.addEventListener('resize', checkMobile);

const uploadBtn = $('uploadBtn');
const fileInput = $('fileInput');
const filePreviews = $('filePreviews');

uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    if (file.size > 4 * 1024 * 1024) { showToast(`Le fichier "${file.name}" dépasse 4MB.`, 'error'); return; }
    currentAttachedFiles.push(file);
  });
  renderFilePreviews();
  e.target.value = '';
});

document.addEventListener('paste', (e) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  let hasImage = false;

  for (let index in items) {
    const item = items[index];
    if (item.kind === 'file') {
      const blob = item.getAsFile();
      if (blob && blob.type.startsWith('image/')) {
        hasImage = true;
        const ext = blob.type.split('/')[1] || 'png';
        const timeStr = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `screenshot_${timeStr}.${ext}`, { type: blob.type });
        if (file.size > 4 * 1024 * 1024) {
          showToast("L'image collée dépasse 4MB.", 'error');
        } else {
          currentAttachedFiles.push(file);
        }
      }
    }
  }

  if (hasImage) {
    e.preventDefault(); 
    renderFilePreviews();
    updateTokenCounter();
    showToast('Image collée !', 'success');
  }
});

function renderFilePreviews() {
  if (currentAttachedFiles.length === 0) {
    filePreviews.classList.remove('has-files');
    filePreviews.innerHTML = '';
    return;
  }
  filePreviews.classList.add('has-files');
  filePreviews.innerHTML = '';
  
  currentAttachedFiles.forEach((file, index) => {
    const chip = document.createElement('div');
    chip.className = 'file-chip';
    
    if (file.type.startsWith('image/')) {
      chip.classList.add('image-chip');
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.className = 'file-chip-thumbnail';
      img.onclick = (e) => {
        e.stopPropagation();
        lightboxImg.src = img.src;
        imageLightbox.classList.add('active');
      };
      chip.appendChild(img);
      const removeBtn = document.createElement('span');
      removeBtn.className = 'file-chip-remove';
      removeBtn.innerHTML = '×';
      removeBtn.title = 'Supprimer';
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        URL.revokeObjectURL(img.src);
        currentAttachedFiles.splice(index, 1);
        renderFilePreviews();
      };
      chip.appendChild(removeBtn);
    } else {
      let icon = '📄';
      if (file.name.endsWith('.js') || file.name.endsWith('.py')) icon = '⚙️';
      const shortName = file.name.length > 10 ? file.name.substring(0, 8) + '...' : file.name;
      chip.innerHTML = `
        <span class="file-chip-icon">${icon}</span>
        <span class="file-chip-name" title="${escapeHtml(file.name)}">${shortName}</span>
        <span class="file-chip-remove" title="Supprimer">×</span>`;
      chip.querySelector('.file-chip-remove').onclick = (e) => {
        e.stopPropagation();
        currentAttachedFiles.splice(index, 1);
        renderFilePreviews();
      };
    }
    
    filePreviews.appendChild(chip);
  });
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
}
const TEXT_EXTENSIONS = [
  'txt','md','markdown','py','js','jsx','ts','tsx','html','htm','css','scss',
  'json','cpp','cc','c','h','hpp','java','cs','go','rs','php','sh','bash',
  'yml','yaml','xml','csv','tsv','rb','swift','kt','sql','log','ini','toml','env'
];

function isTextFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith('text/')) return true;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return TEXT_EXTENSIONS.includes(ext);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function generateFileBadgesHTML(filesMetadata) {
  if (!filesMetadata || filesMetadata.length === 0) return '';
  return `
    <div class="file-badge-list">
      ${filesMetadata.map(f => {
        const iconSvg = f.type.startsWith('image/')
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
        return `
          <div class="file-badge" title="Fichier joint : ${escapeHtml(f.name)}">
            ${iconSvg}
            <span class="file-badge-name">${escapeHtml(f.name)}</span>
            <span class="file-badge-size">${formatFileSize(f.size)}</span>
          </div>`;
      }).join('')}
    </div>`;
}

const dropZone = document.getElementById('dropZone');
const dragOverlay = document.getElementById('dragOverlay');
let dragCounter = 0;
['dragover', 'drop'].forEach(eventName => {
  document.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); });
});
if (dropZone) {
  dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (e.dataTransfer.types.includes('Files')) dragOverlay.classList.add('active');
  });
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) dragOverlay.classList.remove('active');
  });
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) dragOverlay.classList.add('active');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    dragOverlay.classList.remove('active');
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.size > 4 * 1024 * 1024) { showToast(`Le fichier "${file.name}" dépasse 4MB.`, 'error'); return; }
      const allowedExtensions = ['txt','md','py','js','html','css','json','cpp','java','cs','go','rs','php','sh','yml','yaml','xml','png','jpg','jpeg','gif','webp'];
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (file.type.startsWith('image/') || allowedExtensions.includes(fileExt)) currentAttachedFiles.push(file);
      else showToast(`Type de fichier non supporté : ${file.name}`, 'error');
    });
    renderFilePreviews();
  });
}

window.addEventListener('beforeunload', () => {
  if (currentConvId) {
    drafts[currentConvId] = messageInput.value;
    idbSaveDrafts(drafts).catch(() => {});
  }
  saveConversations();
});

// ==== SYSTEME DE TRADUCTION (i18n) ====
const translations = {
  fr: {
    newChat: "Nouvelle conversation", newChatTitle: "Nouvelle conversation", search: "Rechercher…", settings: "Paramètres", appearance: "Apparence",
    placeholder: "Écrivez votre message…", welcomeTitle: "Comment puis-je vous aider ?", 
    welcomeText: "Posez une question, demandez du code, générez des images… Essayez <b>\"Dessine-moi un chat\"</b> ou cliquez sur le bouton 🎨.",
    card1T: "🎨 Générer une image", card1D: "Chat astronaute (Agnes)",
    card2T: "Principes SOLID", card2D: "Explications avec exemples JS",
    card3T: "Algorithme", card3D: "Plus long palindrome en Python",
    card4T: "Comparaison", card4D: "React vs Vue vs Svelte",
    today: "Aujourd'hui", yesterday: "Hier", last7: "7 derniers jours", older: "Plus ancien",
    emptySearch: "Aucun résultat", emptyChat: "Aucune conversation", noImages: "Aucune image générée dans cette conversation.",
    tabApi: "Clés API", tabGen: "Génération", tabApp: "Apparence", tabChat: "Chat", tabData: "Données", tabShort: "Raccourcis", tabAbout: "À propos",
    apiDesc: "Vos clés sont stockées localement dans ce navigateur uniquement. Testez-les pour vérifier leur validité.",
    defined: "Définie", undefined: "Non définie", getKey: "Obtenir une clé", testBtn: "Tester",
    customProviders: "Fournisseurs personnalisés", addBtn: "+ Ajouter", customDesc: "Ajoutez n'importe quelle API compatible OpenAI (endpoint + modèles + clé).", noCustom: "Aucun fournisseur personnalisé.",
    genSys: "Prompt système (personnalité / instructions)", genSysHint: "Ce prompt est ajouté au début de chaque conversation (invisible dans le chat).",
    genTemp: "Température (créativité)", genMax: "Tokens maximaux",
    appTheme: "Thème", appDark: "Sombre", appLight: "Clair", appSys: "Système", appAccent: "Couleur d'accent", appCustomColor: "Couleur personnalisée", appFont: "Taille du texte", appBubble: "Largeur des bulles", appCompact: "Mode compact",
    chatOpts: "Options d'affichage", chatReason: "Afficher les réflexions (reasoning)", chatReasonHint: "Montre le raisonnement interne des modèles compatibles", chatTs: "Afficher l'horodatage", chatTsHint: "Heure d'envoi de chaque message", chatScroll: "Retour automatique en bas", chatScrollHint: "Défile automatiquement à la fin du stream", chatSound: "Notification sonore", chatSoundHint: "Un petit son quand la réponse est terminée",
    dataExport: "Exporter les conversations", dataExportBtn: "📥 Exporter", dataImport: "Importer des conversations", dataImportBtn: "📤 Importer", dataClear: "Effacer toutes les conversations", dataClearBtn: "Tout effacer", dataKeys: "Réinitialiser les clés API", dataKeysBtn: "Réinitialiser les clés", dataReset: "Réinitialiser les paramètres", dataResetBtn: "Réinitialiser",
    copy: "Copier", regen: "Régénérer", continueBtn: "Continuer", edit: "Modifier",
    reasoning: "Réflexion", reasoningInProgress: "en cours", reasoningFinished: "terminée",
    loading: "Chargement...", loadError: "Erreur de chargement", loadImagesError: "Impossible de charger les images. Les messages texte restent accessibles.",
    imgModeActive: "Mode image actif", imgModeDesc: "votre prochaine requête génèrera une image Agnes", ratio: "Ratio", size: "Taille", cancel: "Annuler", describeImage: "🎨 Décrivez l'image à générer…",
    customSettings: "Paramètres personnalisés", baseUrl: "URL de base", modelsLabel: "Modèles",
    cpName: "Nom", cpEndpoint: "Endpoint Chat", cpTestUrl: "Test URL", cpModels: "Modèles (séparés par virgule)",
    scToggle: "Basculer la barre latérale", scNew: "Nouvelle conversation", scSettings: "Ouvrir les paramètres", scExport: "Exporter les conversations", scSend: "Envoyer le message", scNewLine: "Nouvelle ligne", scImage: "Mode image", scClose: "Fermer les modales",
    aboutCreator: "Créateur", aboutLink: "Voir mes projets", confirmDelete: "Supprimer cette conversation ?",
    aboutDesc: "DeepChat est un client de chat multi-fournisseurs (multi-provider AI) qui vous permet de discuter avec différents modèles d'intelligence artificielle (OpenAI, Groq, Mistral, Gemini, Hugging Face, Agnes) depuis une interface unique. Il supporte le streaming, le raisonnement (reasoning), la génération d'images, le rendu Markdown, la coloration syntaxique, les pièces jointes, et bien plus encore. Toutes les données (conversations, clés API) sont stockées localement dans votre navigateur pour une confidentialité maximale.",
    // === AJOUTS ===
    inputHfModel: "ID modèle HF",
    settingsTitle: "Paramètres",
    galleryTitle: "Galerie d'images",
    downloadImg: "Télécharger",
    enter: "Entrée",
    shiftEnter: "Shift + Entrée",
    escape: "Échap",
    fetchModels: "🔄 Récupérer les modèles disponibles",
    addModel: "+ Ajouter un modèle",
    deleteBtn: "Supprimer",
    showMore: "Voir plus",
    showLess: "Voir moins",
    promptNotFound: "Prompt introuvable",
    imgCount: "image(s)",
    apiKeyMissingAgnes: "Clé API Agnes manquante. Configurez-la dans les paramètres.",
    sysPromptPlaceholder: "Laissez vide pour ne rien envoyer…",
    developedBy: "Développé par",
    presetDefault: "Défaut",
    presetConcise: "Concis",
    presetDeveloper: "Développeur",
    presetTeacher: "Pédagogue",
    presetCreative: "Créatif",
    dataExportDesc: "Télécharge toutes vos conversations au format JSON (sauvegarde).",
    dataImportDesc: "Restaure des conversations depuis un fichier JSON.",
    compactModeHint: "Réduit les espacements pour afficher plus de messages",
    dataClearDesc: "Supprime définitivement toutes vos conversations.",
    dataKeysDesc: "Supprime toutes les clés API enregistrées.",
    dataResetDesc: "Restaure les paramètres par défaut.",
    storageOptions: "Options de stockage",
    idbLabel: "Stockage étendu (IndexedDB)",
    idbHint: "Permet de stocker plusieurs Go de conversations et d'images (recommandé)",
    activateLabel: "Activer",
    tooltipRename: "Renommer",
    tooltipDelete: "Supprimer",
    tooltipAttach: "Joindre un fichier",
    tooltipImageMode: "Mode image — générer une image avec Agnes (ou tapez /image)",
    imgModeOn: "Mode image activé",
    imgModeOff: "Mode image désactivé",
    modelDesc: {
      'agnes-3.0-flash': 'Le modèle phare d\'Agnes : rapide, polyvalent, contexte de 512k tokens.',
      'agnes-2.5-flash': 'Version allégée pour les tâches rapides et courantes.',
      'agnes-image-2.5-flash': 'Spécialisé dans la génération d\'images à partir de texte.',
      'agnes-video-2.5-flash': 'Spécialisé dans la génération de vidéos.',
      'openai/gpt-oss-120b': 'Modèle open-source massif de 120B. Excellent pour le code et le raisonnement complexe.',
      'openai/gpt-oss-20b': 'Version plus légère et ultra-rapide du modèle GPT-OSS.',
      'openai/gpt-oss-safeguard-20b': 'Modèle GPT-OSS 20B spécialisé dans la sécurité et la modération (safeguard).',
      'qwen/qwen3.8-27b': 'Modèle Qwen 3.8B. Très efficace pour le code et les mathématiques.',
      'llama-3.3-70b-versatile': 'Le célèbre Llama 3.3 70B. Polyvalent, intelligent et très rapide sur Groq.',
      'llama-3.1-8b-instant': 'Modèle Llama 3.1 8B. Ultra rapide, idéal pour les conversations simples.',
      'codestral-latest': 'Modèle de Mistral spécialisé dans la génération de code. Idéal pour les développeurs.',
      'mistral-medium-latest': 'Bon équilibre entre puissance, rapidité et coût.',
      'mistral-small-latest': 'Modèle léger et rapide pour les tâches basiques.',
      'magistral-medium-latest': 'Modèle orienté raisonnement (Chain of Thought) de Mistral.',
      'gemini-3.5-flash': 'Le plus rapide de Google. Contexte gigantesque de 1 million de tokens. Parfait pour de longs documents.',
      'gemini-3.5-flash-lite': 'Version encore plus rapide et légère de Gemini.',
      'openrouter/free': 'Sélectionne automatiquement un modèle gratuit disponible sur OpenRouter.',
      'nividia/nemotron-3.5-super-vl:free': 'Modèle NVIDIA gratuit orienté Vision-Langage (analyse d\'images).',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free': 'Petit modèle NVIDIA gratuit spécialisé dans le raisonnement.',
      'deepseek-v4-flash:free': 'Modèle DeepSeek ultra-rapide et gratuit via TokenHarbor.',
      'deepseek-v4.1-flash:free': 'Version améliorée de DeepSeek Flash, gratuit.',
      'mimo-v2.5:free': 'Modèle léger et gratuit via TokenHarbor.',
      'mimo-v2.6-flash:free': 'Version rapide et gratuite du modèle Mimo via TokenHarbor.',
      'deepseek/deepseek-v4-pro': 'Modèle DeepSeek accessible gratuitement et sans clé via Puter.js.',
      'openai/gpt-5.5': 'Modèle OpenAI accessible gratuitement et sans clé via Puter.js.',
      'baidu/ernie-5.5-flash-preview:free': 'Modèle Baidu ERNIE 5.5 Flash (preview) gratuit via Puter. Rapide et polyvalent pour les conversations courantes.',
      'recursive/flint-v1.0:free': 'Modèle Recursive Flint v1.0, accessible gratuitement et sans clé via Puter.',
      'fireworks/ember-1': 'Modèle Fireworks Ember 1, optimisé pour la génération rapide via Puter.',
      'prism-ml/ternary-bonsai-27b': 'Modèle Prism ML Ternary Bonsai 27B, orienté raisonnement, disponible via Puter.',
      'cohere/north-mini-code:free': 'Modèle Cohere North Mini Code, spécialisé dans le code, gratuit via Puter.',
      'google/gemma-4-31b-it': 'Google Gemma 4 31B (instruction-tuned), modèle open-weight polyvalent via Puter.',
      'google/gemma-4-26b-a4b-it': 'Google Gemma 4 26B MoE (4B actifs) instruction-tuned, efficace et rapide via Puter.',
      infoLabel: 'Info'
    },
  },
  en: {
    newChat: "New chat", newChatTitle: "New chat", search: "Search...", settings: "Settings", appearance: "Appearance",
    placeholder: "Type your message...", welcomeTitle: "How can I help you?", 
    welcomeText: "Ask a question, request code, generate images... Try <b>\"Draw me a cat\"</b> or click the 🎨 button.",
    card1T: "🎨 Generate an image", card1D: "Astronaut cat (Agnes)",
    card2T: "SOLID Principles", card2D: "Explanations with JS examples",
    card3T: "Algorithm", card3D: "Longest palindrome in Python",
    card4T: "Comparison", card4D: "React vs Vue vs Svelte",
    today: "Today", yesterday: "Yesterday", last7: "Last 7 days", older: "Older",
    emptySearch: "No results", emptyChat: "No conversations", noImages: "No images generated in this conversation.",
    tabApi: "API Keys", tabGen: "Generation", tabApp: "Appearance", tabChat: "Chat", tabData: "Data", tabShort: "Shortcuts", tabAbout: "About",
    apiDesc: "Your keys are stored locally in this browser only. Test them to verify their validity.",
    defined: "Defined", undefined: "Not defined", getKey: "Get key", testBtn: "Test",
    customProviders: "Custom providers", addBtn: "+ Add", customDesc: "Add any OpenAI-compatible API (endpoint + models + key).", noCustom: "No custom provider.",
    genSys: "System prompt (personality / instructions)", genSysHint: "This prompt is added at the beginning of each conversation (invisible in chat).",
    genTemp: "Temperature (creativity)", genMax: "Max tokens",
    appTheme: "Theme", appDark: "Dark", appLight: "Light", appSys: "System", appAccent: "Accent color", appCustomColor: "Custom color", appFont: "Text size", appBubble: "Bubble width", appCompact: "Compact mode",
    chatOpts: "Display options", chatReason: "Show reasoning", chatReasonHint: "Shows the internal reasoning of compatible models", chatTs: "Show timestamp", chatTsHint: "Time each message was sent", chatScroll: "Auto-scroll to bottom", chatScrollHint: "Automatically scrolls at the end of the stream", chatSound: "Sound notification", chatSoundHint: "A little sound when the response is finished",
    dataExport: "Export conversations", dataExportBtn: "📥 Export", dataImport: "Import conversations", dataImportBtn: "📤 Import", dataClear: "Clear all conversations", dataClearBtn: "Clear all", dataKeys: "Reset API keys", dataKeysBtn: "Reset keys", dataReset: "Reset settings", dataResetBtn: "Reset",
    copy: "Copy", regen: "Regenerate", continueBtn: "Continue", edit: "Edit",
    reasoning: "Reasoning", reasoningInProgress: "in progress", reasoningFinished: "finished",
    loading: "Loading...", loadError: "Loading error", loadImagesError: "Failed to load images. Text messages remain accessible.",
    imgModeActive: "Image mode active", imgModeDesc: "your next request will generate an Agnes image", ratio: "Ratio", size: "Size", cancel: "Cancel", describeImage: "🎨 Describe the image to generate...",
    customSettings: "Custom settings", baseUrl: "Base URL", modelsLabel: "Models",
    cpName: "Name", cpEndpoint: "Chat Endpoint", cpTestUrl: "Test URL", cpModels: "Models (comma separated)",
    scToggle: "Toggle sidebar", scNew: "New chat", scSettings: "Open settings", scExport: "Export conversations", scSend: "Send message", scNewLine: "New line", scImage: "Image mode", scClose: "Close modals",
    aboutCreator: "Creator", aboutLink: "See my projects", confirmDelete: "Delete this conversation?",
    aboutDesc: "DeepChat is a multi-provider AI chat client that allows you to chat with different AI models (OpenAI, Groq, Mistral, Gemini, Hugging Face, Agnes) from a single interface. It supports streaming, reasoning, image generation, Markdown rendering, syntax highlighting, attachments, and much more. All data (conversations, API keys) is stored locally in your browser for maximum privacy.",
    // === AJOUTS ===
    inputHfModel: "HF model ID",
    settingsTitle: "Settings",
    galleryTitle: "Image gallery",
    downloadImg: "Download",
    enter: "Enter",
    shiftEnter: "Shift + Enter",
    escape: "Escape",
    fetchModels: "🔄 Fetch available models",
    addModel: "+ Add a model",
    deleteBtn: "Delete",
    showMore: "Show more",
    showLess: "Show less",
    promptNotFound: "Prompt not found",
    imgCount: "image(s)",
    apiKeyMissingAgnes: "Agnes API key missing. Configure it in settings.",
    sysPromptPlaceholder: "Leave empty to send nothing...",
    developedBy: "Developed by",
    presetDefault: "Default",
    presetConcise: "Concise",
    presetDeveloper: "Developer",
    presetTeacher: "Teacher",
    presetCreative: "Creative",
    dataExportDesc: "Downloads all your conversations in JSON format (backup).",
    dataImportDesc: "Restores conversations from a JSON file.",
    compactModeHint: "Reduces spacing to show more messages",
    dataClearDesc: "Permanently deletes all your conversations.",
    dataKeysDesc: "Deletes all saved API keys.",
    dataResetDesc: "Restores default settings.",
    storageOptions: "Storage options",
    idbLabel: "Extended storage (IndexedDB)",
    idbHint: "Allows storing several GB of conversations and images (recommended)",
    activateLabel: "Enable",
    tooltipRename: "Rename",
    tooltipDelete: "Delete",
    tooltipAttach: "Attach a file",
    tooltipImageMode: "Image mode — generate an image with Agnes (or type /image)",
    imgModeOn: "Image mode enabled",
    imgModeOff: "Image mode disabled",
    modelDesc: {
      'agnes-3.0-flash': 'Agnes\' flagship model: fast, versatile, 512k token context.',
      'agnes-2.5-flash': 'Lighter version for fast and common tasks.',
      'agnes-image-2.5-flash': 'Specialized in text-to-image generation.',
      'agnes-video-2.5-flash': 'Specialized in video generation.',
      'openai/gpt-oss-120b': 'Massive 120B open-source model. Excellent for code and complex reasoning.',
      'openai/gpt-oss-20b': 'Lighter and ultra-fast version of the GPT-OSS model.',
      'openai/gpt-oss-safeguard-20b': 'GPT-OSS 20B model specialized in safety and content moderation (safeguard).',
      'qwen/qwen3.8-27b': 'Qwen 3.8B model. Very effective for code and math.',
      'llama-3.3-70b-versatile': 'The famous Llama 3.3 70B. Versatile, smart, and very fast on Groq.',
      'llama-3.1-8b-instant': 'Llama 3.1 8B model. Ultra-fast, ideal for simple conversations.',
      'codestral-latest': 'Mistral\'s code-specialized model. Ideal for developers.',
      'mistral-medium-latest': 'Good balance between power, speed, and cost.',
      'mistral-small-latest': 'Light and fast model for basic tasks.',
      'magistral-medium-latest': 'Reasoning-focused (Chain of Thought) model from Mistral.',
      'gemini-3.5-flash': 'Google\'s fastest. Huge 1M token context. Perfect for long documents.',
      'gemini-3.5-flash-lite': 'Even faster and lighter version of Gemini.',
      'openrouter/free': 'Automatically selects an available free model on OpenRouter.',
      'nividia/nemotron-3.5-super-vl:free': 'Free NVIDIA model focused on Vision-Language (image analysis).',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free': 'Small free NVIDIA model specialized in reasoning.',
      'deepseek-v4-flash:free': 'Ultra-fast and free DeepSeek model via TokenHarbor.',
      'deepseek-v4.1-flash:free': 'Improved version of DeepSeek Flash, free.',
      'mimo-v2.5:free': 'Light and free model via TokenHarbor.',
      'mimo-v2.6-flash:free': 'Fast and free version of the Mimo model via TokenHarbor.',
      'deepseek/deepseek-v4-pro': 'DeepSeek model available for free without a key via Puter.js.',
      'openai/gpt-5.5': 'OpenAI model available for free without a key via Puter.js.',
      'baidu/ernie-5.5-flash-preview:free': 'Baidu ERNIE 5.5 Flash (preview) model, free via Puter. Fast and versatile for everyday conversations.',
      'recursive/flint-v1.0:free': 'Recursive Flint v1.0 model, available for free without a key via Puter.',
      'fireworks/ember-1': 'Fireworks Ember 1 model, optimized for fast generation via Puter.',
      'prism-ml/ternary-bonsai-27b': 'Prism ML Ternary Bonsai 27B model, reasoning-focused, available via Puter.',
      'cohere/north-mini-code:free': 'Cohere North Mini Code model, code-specialized, free via Puter.',
      'google/gemma-4-31b-it': 'Google Gemma 4 31B (instruction-tuned), versatile open-weight model via Puter.',
      'google/gemma-4-26b-a4b-it': 'Google Gemma 4 26B MoE (4B active) instruction-tuned, efficient and fast via Puter.',
      infoLabel: 'Info'
    },
  },
  it: {
    newChat: "Nuova chat", newChatTitle: "Nuova chat", search: "Cerca...", settings: "Impostazioni", appearance: "Aspetto",
    placeholder: "Scrivi il tuo messaggio...", welcomeTitle: "Come posso aiutarti?", 
    welcomeText: "Fai una domanda, chiedi codice, genera immagini... Prova <b>\"Disegnami un gatto\"</b> o clicca sul pulsante 🎨.",
    card1T: "🎨 Genera un'immagine", card1D: "Gatto astronauta (Agnes)",
    card2T: "Principi SOLID", card2D: "Spiegazioni con esempi JS",
    card3T: "Algoritmo", card3D: "Palindromo più lungo in Python",
    card4T: "Confronto", card4D: "React vs Vue vs Svelte",
    today: "Oggi", yesterday: "Ieri", last7: "Ultimi 7 giorni", older: "Più vecchio",
    emptySearch: "Nessun risultato", emptyChat: "Nessuna conversazione", noImages: "Nessuna immagine generata in questa conversazione.",
    tabApi: "Chiavi API", tabGen: "Generazione", tabApp: "Aspetto", tabChat: "Chat", tabData: "Dati", tabShort: "Scorciatoie", tabAbout: "Informazioni",
    apiDesc: "Le tue chiavi sono memorizzate localmente in questo browser. Testale per verificarne la validità.",
    defined: "Definito", undefined: "Non definito", getKey: "Ottieni chiave", testBtn: "Test",
    customProviders: "Provider personalizzati", addBtn: "+ Aggiungi", customDesc: "Aggiungi qualsiasi API compatibile con OpenAI.", noCustom: "Nessun provider personalizzato.",
    genSys: "Prompt di sistema (personalità / istruzioni)", genSysHint: "Questo prompt viene aggiunto all'inizio di ogni conversazione.",
    genTemp: "Temperatura (creatività)", genMax: "Token massimi",
    appTheme: "Tema", appDark: "Scuro", appLight: "Chiaro", appSys: "Sistema", appAccent: "Colore d'accento", appCustomColor: "Colore personalizzato", appFont: "Dimensione testo", appBubble: "Larghezza fumetti", appCompact: "Modalità compatta",
    chatOpts: "Opzioni di visualizzazione", chatReason: "Mostra il ragionamento", chatReasonHint: "Mostra il ragionamento interno dei modelli compatibili", chatTs: "Mostra data e ora", chatTsHint: "Ora di invio di ogni messaggio", chatScroll: "Scorrimento automatico in basso", chatScrollHint: "Scorre automaticamente alla fine del flusso", chatSound: "Notifica sonora", chatSoundHint: "Un piccolo suono al termine della risposta",
    dataExport: "Esporta conversazioni", dataExportBtn: "📥 Esporta", dataImport: "Importa conversazioni", dataImportBtn: "📤 Importa", dataClear: "Cancella tutte le conversazioni", dataClearBtn: "Cancella tutto", dataKeys: "Ripristina chiavi API", dataKeysBtn: "Ripristina chiavi", dataReset: "Ripristina impostazioni", dataResetBtn: "Ripristina",
    copy: "Copia", regen: "Rigenera", continueBtn: "Continua", edit: "Modifica",
    reasoning: "Ragionamento", reasoningInProgress: "in corso", reasoningFinished: "terminato",
    loading: "Caricamento...", loadError: "Errore di caricamento", loadImagesError: "Impossibile caricare le immagini. I messaggi di testo rimangono accessibili.",
    imgModeActive: "Modalità immagine attiva", imgModeDesc: "la tua prossima richiesta genererà un'immagine Agnes", ratio: "Proporzioni", size: "Dimensione", cancel: "Annulla", describeImage: "🎨 Descrivi l'immagine da generare...",
    customSettings: "Impostazioni personalizzate", baseUrl: "URL di base", modelsLabel: "Modelli",
    cpName: "Nome", cpEndpoint: "Endpoint Chat", cpTestUrl: "URL di test", cpModels: "Modelli (separati da virgola)",
    scToggle: "Attiva/disattiva barra laterale", scNew: "Nuova chat", scSettings: "Apri impostazioni", scExport: "Esporta conversazioni", scSend: "Invia messaggio", scNewLine: "Nuova riga", scImage: "Modalità immagine", scClose: "Chiudi finestre",
    aboutCreator: "Creatore", aboutLink: "Vedi i miei progetti", confirmDelete: "Eliminare questa conversazione?",
    aboutDesc: "DeepChat è un client di chat multi-provider che ti permette di chattare con diversi modelli AI (OpenAI, Groq, Mistral, Gemini, Hugging Face, Agnes) da un'unica interfaccia. Supporta streaming, ragionamento, generazione di immagini, rendering Markdown, evidenziazione della sintassi, allegati e molto altro. Tutti i dati sono memorizzati localmente nel tuo browser per la massima privacy.",
    // === AJOUTS ===
    inputHfModel: "ID modello HF",
    settingsTitle: "Impostazioni",
    galleryTitle: "Galleria immagini",
    downloadImg: "Scarica",
    enter: "Invio",
    shiftEnter: "Shift + Invio",
    escape: "Esc",
    fetchModels: "🔄 Recupera modelli disponibili",
    addModel: "+ Aggiungi un modello",
    deleteBtn: "Elimina",
    showMore: "Mostra di più",
    showLess: "Mostra meno",
    promptNotFound: "Prompt non trovato",
    imgCount: "immagine(i)",
    apiKeyMissingAgnes: "Chiave API Agnes mancante. Configurala nelle impostazioni.",
    sysPromptPlaceholder: "Lascia vuoto per non inviare nulla...",
    developedBy: "Sviluppato da",
    presetDefault: "Predefinito",
    presetConcise: "Conciso",
    presetDeveloper: "Sviluppatore",
    presetTeacher: "Pedagogo",
    presetCreative: "Creativo",
    dataExportDesc: "Scarica tutte le tue conversazioni in formato JSON (backup).",
    dataImportDesc: "Ripristina le conversazioni da un file JSON.",
    compactModeHint: "Riduce la spaziatura per mostrare più messaggi",
    dataClearDesc: "Elimina definitivamente tutte le tue conversazioni.",
    dataKeysDesc: "Elimina tutte le chiavi API salvate.",
    dataResetDesc: "Ripristina le impostazioni predefinite.",
    storageOptions: "Opzioni di archiviazione",
    idbLabel: "Archiviazione estesa (IndexedDB)",
    idbHint: "Consente di memorizzare diversi GB di conversazioni e immagini (consigliato)",
    activateLabel: "Attiva",
    tooltipRename: "Rinomina",
    tooltipDelete: "Elimina",
    tooltipAttach: "Allega un file",
    tooltipImageMode: "Modalità immagine — genera un'immagine con Agnes (o digita /image)",
    imgModeOn: "Modalità immagine attivata",
    imgModeOff: "Modalità immagine disattivata",
    modelDesc: {
      'agnes-3.0-flash': 'Il modello di punta di Agnes: veloce, versatile, contesto di 512k token.',
      'agnes-2.5-flash': 'Versione più leggera per attività rapide e comuni.',
      'agnes-image-2.5-flash': 'Specializzato nella generazione di immagini da testo.',
      'agnes-video-2.5-flash': 'Specializzato nella generazione di video.',
      'openai/gpt-oss-120b': 'Modello open-source massiccio da 120B. Eccellente per codice e ragionamento complesso.',
      'openai/gpt-oss-20b': 'Versione più leggera e ultra-veloce del modello GPT-OSS.',
      'openai/gpt-oss-safeguard-20b': 'Modello GPT-OSS 20B specializzato in sicurezza e moderazione (safeguard).',
      'qwen/qwen3.8-27b': 'Modello Qwen 3.8B. Molto efficace per codice e matematica.',
      'llama-3.3-70b-versatile': 'Il famoso Llama 3.3 70B. Versatile, intelligente e molto veloce su Groq.',
      'llama-3.1-8b-instant': 'Modello Llama 3.1 8B. Ultra-veloce, ideale per conversazioni semplici.',
      'codestral-latest': 'Modello di Mistral specializzato nel codice. Ideale per sviluppatori.',
      'mistral-medium-latest': 'Buon equilibrio tra potenza, velocità e costo.',
      'mistral-small-latest': 'Modello leggero e veloce per attività di base.',
      'magistral-medium-latest': 'Modello orientato al ragionamento (Chain of Thought) di Mistral.',
      'gemini-3.5-flash': 'Il più veloce di Google. Contesto gigantesco di 1 milione di token. Perfetto per documenti lunghi.',
      'gemini-3.5-flash-lite': 'Versione ancora più veloce e leggera di Gemini.',
      'openrouter/free': 'Seleziona automaticamente un modello gratuito disponibile su OpenRouter.',
      'nividia/nemotron-3.5-super-vl:free': 'Modello NVIDIA gratuito orientato a Visione-Linguaggio (analisi immagini).',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free': 'Piccolo modello NVIDIA gratuito specializzato nel ragionamento.',
      'deepseek-v4-flash:free': 'Modello DeepSeek ultra-veloce e gratuito tramite TokenHarbor.',
      'deepseek-v4.1-flash:free': 'Versione migliorata di DeepSeek Flash, gratuita.',
      'mimo-v2.5:free': 'Modello leggero e gratuito tramite TokenHarbor.',
      'mimo-v2.6-flash:free': 'Versione veloce e gratuita del modello Mimo tramite TokenHarbor.',
      'deepseek/deepseek-v4-pro': 'Modello DeepSeek disponibile gratuitamente e senza chiave tramite Puter.js.',
      'openai/gpt-5.5': 'Modello OpenAI disponibile gratuitamente e senza chiave tramite Puter.js.',
      'baidu/ernie-5.5-flash-preview:free': 'Modello Baidu ERNIE 5.5 Flash (preview) gratuito tramite Puter. Veloce e versatile per conversazioni quotidiane.',
      'recursive/flint-v1.0:free': 'Modello Recursive Flint v1.0, disponibile gratuitamente e senza chiave tramite Puter.',
      'fireworks/ember-1': 'Modello Fireworks Ember 1, ottimizzato per la generazione rapida tramite Puter.',
      'prism-ml/ternary-bonsai-27b': 'Modello Prism ML Ternary Bonsai 27B, orientato al ragionamento, disponibile tramite Puter.',
      'cohere/north-mini-code:free': 'Modello Cohere North Mini Code, specializzato nel codice, gratuito tramite Puter.',
      'google/gemma-4-31b-it': 'Google Gemma 4 31B (instruction-tuned), modello open-weight versatile tramite Puter.',
      'google/gemma-4-26b-a4b-it': 'Google Gemma 4 26B MoE (4B attivi) instruction-tuned, efficiente e veloce tramite Puter.',
      infoLabel: 'Info'
    },
  },
  tr: {
    newChat: "Yeni sohbet", newChatTitle: "Yeni sohbet", search: "Ara...", settings: "Ayarlar", appearance: "Görünüm",
    placeholder: "Mesajınızı yazın...", welcomeTitle: "Size nasıl yardımcı olabilirim?", 
    welcomeText: "Soru sorun, kod isteyin, resim oluşturun... <b>\"Bana bir kedi çiz\"</b> yazmayı deneyin veya 🎨 butonuna tıklayın.",
    card1T: "🎨 Resim oluştur", card1D: "Astronot kedi (Agnes)",
    card2T: "SOLID İlkeleri", card2D: "JS örnekleriyle açıklamalar",
    card3T: "Algoritma", card3D: "Python'da en uzun palindrom",
    card4T: "Karşılaştırma", card4D: "React vs Vue vs Svelte",
    today: "Bugün", yesterday: "Dün", last7: "Son 7 gün", older: "Daha eski",
    emptySearch: "Sonuç yok", emptyChat: "Sohbet yok", noImages: "Bu sohbette oluşturulmuş resim yok.",
    tabApi: "API Anahtarları", tabGen: "Oluşturma", tabApp: "Görünüm", tabChat: "Sohbet", tabData: "Veriler", tabShort: "Kısayollar", tabAbout: "Hakkında",
    apiDesc: "Anahtarlarınız yalnızca bu tarayıcıda yerel olarak saklanır. Geçerliliğini test edin.",
    defined: "Tanımlı", undefined: "Tanımlı değil", getKey: "Anahtar al", testBtn: "Test et",
    customProviders: "Özel sağlayıcılar", addBtn: "+ Ekle", customDesc: "OpenAI uyumlu herhangi bir API ekleyin.", noCustom: "Özel sağlayıcı yok.",
    genSys: "Sistem istemi (kişilik / talimatlar)", genSysHint: "Bu istem her sohbetin başına eklenir.",
    genTemp: "Sıcaklık (yaratıcılık)", genMax: "Maksimum token",
    appTheme: "Tema", appDark: "Koyu", appLight: "Açık", appSys: "Sistem", appAccent: "Vurgu rengi", appCustomColor: "Özel renk", appFont: "Metin boyutu", appBubble: "Balon genişliği", appCompact: "Kompakt mod",
    chatOpts: "Görüntüleme seçenekleri", chatReason: "Akıl yürütmeyi göster", chatReasonHint: "Uyumlu modellerin iç akıl yürütmesini gösterir", chatTs: "Zaman damgasını göster", chatTsHint: "Her mesajın gönderilme saati", chatScroll: "Otomatik aşağı kaydır", chatScrollHint: "Akış sonunda otomatik olarak aşağı kaydırır", chatSound: "Ses bildirimi", chatSoundHint: "Yanıt bittiğinde küçük bir ses",
    dataExport: "Sohbetleri dışa aktar", dataExportBtn: "📥 Dışa aktar", dataImport: "Sohbetleri içe aktar", dataImportBtn: "📤 İçe aktar", dataClear: "Tüm sohbetleri temizle", dataClearBtn: "Tümünü temizle", dataKeys: "API anahtarlarını sıfırla", dataKeysBtn: "Anahtarları sıfırla", dataReset: "Ayarları sıfırla", dataResetBtn: "Sıfırla",
    copy: "Kopyala", regen: "Yeniden oluştur", continueBtn: "Devam et", edit: "Düzenle",
    reasoning: "Akıl yürütme", reasoningInProgress: "devam ediyor", reasoningFinished: "tamamlandı",
    loading: "Yükleniyor...", loadError: "Yükleme hatası", loadImagesError: "Resimler yüklenemedi. Metin mesajları erişilebilir durumda.",
    imgModeActive: "Resim modu aktif", imgModeDesc: "bir sonraki isteğiniz bir Agnes resmi oluşturacak", ratio: "Oran", size: "Boyut", cancel: "İptal", describeImage: "🎨 Oluşturulacak resmi tanımlayın...",
    customSettings: "Özel ayarlar", baseUrl: "Temel URL", modelsLabel: "Modeller",
    cpName: "Ad", cpEndpoint: "Sohbet Uç Noktası", cpTestUrl: "Test URL'si", cpModels: "Modeller (virgülle ayrılmış)",
    scToggle: "Kenar çubuğunu aç/kapat", scNew: "Yeni sohbet", scSettings: "Ayarları aç", scExport: "Sohbetleri dışa aktar", scSend: "Mesaj gönder", scNewLine: "Yeni satır", scImage: "Resim modu", scClose: "Modalları kapat",
    aboutCreator: "Yaratıcı", aboutLink: "Projelerimi gör", confirmDelete: "Bu sohbet silinsin mi?",
    aboutDesc: "DeepChat, farklı yapay zeka modelleri (OpenAI, Groq, Mistral, Gemini, Hugging Face, Agnes) ile tek bir arayüzden sohbet etmenizi sağlayan çok sağlayıcılı bir yapay zeka sohbet istemcisidir. Akış, akıl yürütme, resim oluşturma, Markdown işleme, sözdizimi vurgulama, ekler ve daha fazlasını destekler. Tüm veriler maksimum gizlilik için tarayıcınızda yerel olarak saklanır.",
    // === AJOUTS ===
    inputHfModel: "HF model kimliği",
    settingsTitle: "Ayarlar",
    galleryTitle: "Resim galerisi",
    downloadImg: "İndir",
    enter: "Enter",
    shiftEnter: "Shift + Enter",
    escape: "Esc",
    fetchModels: "🔄 Mevcut modelleri getir",
    addModel: "+ Model ekle",
    deleteBtn: "Sil",
    showMore: "Daha fazla göster",
    showLess: "Daha az göster",
    promptNotFound: "İstem bulunamadı",
    imgCount: "resim",
    apiKeyMissingAgnes: "Agnes API anahtarı eksik. Ayarlardan yapılandırın.",
    sysPromptPlaceholder: "Hiçbir şey göndermemek için boş bırakın...",
    developedBy: "Geliştiren",
    presetDefault: "Varsayılan",
    presetConcise: "Kısa",
    presetDeveloper: "Geliştirici",
    presetTeacher: "Eğitmen",
    presetCreative: "Yaratıcı",
    dataExportDesc: "Tüm sohbetlerinizi JSON formatında indirir (yedekleme).",
    dataImportDesc: "Sohbetleri bir JSON dosyasından geri yükler.",
    compactModeHint: "Daha fazla mesaj göstermek için boşlukları azaltır",
    dataClearDesc: "Tüm sohbetlerinizi kalıcı olarak siler.",
    dataKeysDesc: "Kayıtlı tüm API anahtarlarını siler.",
    dataResetDesc: "Varsayılan ayarları geri yükler.",
    storageOptions: "Depolama seçenekleri",
    idbLabel: "Genişletilmiş depolama (IndexedDB)",
    idbHint: "Birkaç GB konuşma ve resim depolamaya olanak tanır (önerilir)",
    activateLabel: "Etkinleştir",
    tooltipRename: "Yeniden adlandır",
    tooltipDelete: "Sil",
    tooltipAttach: "Dosya ekle",
    tooltipImageMode: "Resim modu — Agnes ile resim oluştur (veya /image yazın)",
    imgModeOn: "Resim modu etkinleştirildi",
    imgModeOff: "Resim modu devre dışı bırakıldı",
    modelDesc: {
      'agnes-3.0-flash': 'Agnes\'in amiral gemisi modeli: hızlı, çok yönlü, 512k token bağlamı.',
      'agnes-2.5-flash': 'Hızlı ve rutin görevler için daha hafif sürüm.',
      'agnes-image-2.5-flash': 'Metinden görsel oluşturma konusunda uzmanlaşmıştır.',
      'agnes-video-2.5-flash': 'Video oluşturma konusunda uzmanlaşmıştır.',
      'openai/gpt-oss-120b': 'Devasa 120B açık kaynak modeli. Kod ve karmaşık akıl yürütme için mükemmel.',
      'openai/gpt-oss-20b': 'GPT-OSS modelinin daha hafif ve ultra hızlı sürümü.',
      'openai/gpt-oss-safeguard-20b': 'Güvenlik ve içerik moderasyonu (safeguard) konusunda uzmanlaşmış GPT-OSS 20B modeli.',
      'qwen/qwen3.8-27b': 'Qwen 3.8B modeli. Kod ve matematik için çok etkili.',
      'llama-3.3-70b-versatile': 'Ünlü Llama 3.3 70B. Groq üzerinde çok yönlü, akıllı ve çok hızlı.',
      'llama-3.1-8b-instant': 'Llama 3.1 8B modeli. Ultra hızlı, basit sohbetler için ideal.',
      'codestral-latest': 'Mistral\'in koda özel modeli. Geliştiriciler için ideal.',
      'mistral-medium-latest': 'Güç, hız ve maliyet arasında iyi denge.',
      'mistral-small-latest': 'Temel görevler için hafif ve hızlı model.',
      'magistral-medium-latest': 'Mistral\'in akıl yürütme odaklı (Chain of Thought) modeli.',
      'gemini-3.5-flash': 'Google\'ın en hızlısı. 1 milyon token\'lık devasa bağlam. Uzun belgeler için mükemmel.',
      'gemini-3.5-flash-lite': 'Gemini\'nin daha da hızlı ve hafif sürümü.',
      'openrouter/free': 'OpenRouter\'da mevcut olan ücretsiz bir modeli otomatik olarak seçer.',
      'nividia/nemotron-3.5-super-vl:free': 'Görsel-Dil (görsel analizi) odaklı ücretsiz NVIDIA modeli.',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free': 'Akıl yürütme konusunda uzmanlaşmış küçük ücretsiz NVIDIA modeli.',
      'deepseek-v4-flash:free': 'TokenHarbor aracılığıyla ultra hızlı ve ücretsiz DeepSeek modeli.',
      'deepseek-v4.1-flash:free': 'DeepSeek Flash\'ın geliştirilmiş ücretsiz sürümü.',
      'mimo-v2.5:free': 'TokenHarbor aracılığıyla hafif ve ücretsiz model.',
      'mimo-v2.6-flash:free': 'TokenHarbor üzerinden Mimo modelinin hızlı ve ücretsiz sürümü.',
      'deepseek/deepseek-v4-pro': 'Puter.js aracılığıyla ücretsiz ve anahtar gerektirmeden kullanılabilen DeepSeek modeli.',
      'openai/gpt-5.5': 'Puter.js aracılığıyla ücretsiz ve anahtar gerektirmeden kullanılabilen OpenAI modeli.',
      'baidu/ernie-5.5-flash-preview:free': 'Baidu ERNIE 5.5 Flash (önizleme) modeli, Puter aracılığıyla ücretsiz. Günlük sohbetler için hızlı ve çok yönlü.',
      'recursive/flint-v1.0:free': 'Recursive Flint v1.0 modeli, Puter aracılığıyla ücretsiz ve anahtar gerektirmeden kullanılabilir.',
      'fireworks/ember-1': 'Fireworks Ember 1 modeli, Puter aracılığıyla hızlı üretim için optimize edilmiştir.',
      'prism-ml/ternary-bonsai-27b': 'Prism ML Ternary Bonsai 27B modeli, akıl yürütme odaklı, Puter aracılığıyla kullanılabilir.',
      'cohere/north-mini-code:free': 'Cohere North Mini Code modeli, koda özel, Puter aracılığıyla ücretsiz.',
      'google/gemma-4-31b-it': 'Google Gemma 4 31B (talimat ayarlı), Puter aracılığıyla çok yönlü açık ağırlıklı model.',
      'google/gemma-4-26b-a4b-it': 'Google Gemma 4 26B MoE (4B aktif) talimat ayarlı, Puter aracılığıyla verimli ve hızlı.',
      infoLabel: 'Bilgi'
    },
  }
};

let currentLang = localStorage.getItem('deepchat_lang') || 'fr';

function applyLanguage(lang) {
  const t = translations[lang] || translations.fr;
  const langSelect = $('languageSelect');
  if (langSelect) langSelect.value = lang;

  // --- SIDEBAR & CHAT ---
  document.querySelector('#newChatBtn span').textContent = t.newChat;
  $('searchInput').placeholder = t.search;
  document.querySelector('#settingsBtn span').textContent = t.settings;
  document.querySelector('#themeBtn span').textContent = t.appearance;
  messageInput.placeholder = t.placeholder;

  // --- TOPBAR & MODALES (Nouveau) ---
  document.querySelector('.topbar-group input').placeholder = t.inputHfModel;
  document.querySelector('#settingsModal h2').textContent = t.settingsTitle;
  document.querySelector('#galleryModal h2').textContent = t.galleryTitle;
  document.querySelector('#lbDownloadBtn').textContent = '⬇ ' + t.downloadImg;

  // --- BANNIÈRE MODE IMAGE ---
  const imgBanner = $('imageModeBanner');
  if (imgBanner) {
    imgBanner.querySelector('.mode-info span').innerHTML = `🎨 <strong>${t.imgModeActive}</strong> — ${t.imgModeDesc}`;
    imgBanner.querySelector('label:nth-of-type(1)').childNodes[0].nodeValue = t.ratio + ' ';
    imgBanner.querySelector('label:nth-of-type(2)').childNodes[0].nodeValue = t.size + ' ';
    $('cancelImageModeBtn').textContent = t.cancel;
  }

  // --- BOUTONS D'ACTION DES MESSAGES ---
  document.querySelectorAll('.action-btn').forEach(btn => {
    if (btn.innerHTML.includes('Copier')) btn.innerHTML = btn.innerHTML.replace(/Copier/g, t.copy);
    if (btn.innerHTML.includes('Régénérer')) btn.innerHTML = btn.innerHTML.replace(/Régénérer/g, t.regen);
    if (btn.innerHTML.includes('Continuer')) btn.innerHTML = btn.innerHTML.replace(/Continuer/g, t.continueBtn);
    if (btn.innerHTML.includes('Modifier')) btn.innerHTML = btn.innerHTML.replace(/Modifier/g, t.edit);
  });

  // --- MODALE PARAMETRES (Onglets) ---
  const tabs = { 'api': t.tabApi, 'generation': t.tabGen, 'appearance': t.tabApp, 'chat': t.tabChat, 'data': t.tabData, 'shortcuts': t.tabShort, 'about': t.tabAbout };
  Object.keys(tabs).forEach(key => {
    const btn = document.querySelector(`.tab-btn[data-tab="${key}"]`);
    if (btn) btn.textContent = tabs[key];
  });

  // --- ONGLET API (Textes généraux) ---
  const apiTab = document.querySelector('.tab-content[data-tab="api"]');
  if (apiTab) {
    apiTab.querySelector('p').textContent = t.apiDesc;
    apiTab.querySelector('h3').textContent = t.customProviders;
    $('addCustomProviderBtn').textContent = t.addBtn;
    apiTab.querySelectorAll('p')[1].textContent = t.customDesc;
    
    const cpForm = $('customProviderForm');
    if (cpForm) {
      cpForm.querySelector('#cpLabel').previousElementSibling.textContent = t.cpName;
      cpForm.querySelector('#cpEndpoint').previousElementSibling.textContent = t.cpEndpoint;
      cpForm.querySelector('#cpTestUrl').previousElementSibling.textContent = t.cpTestUrl;
      cpForm.querySelector('#cpModels').previousElementSibling.textContent = t.cpModels;
      $('cancelCustomProviderBtn').textContent = t.cancel;
      $('saveCustomProviderBtn').textContent = t.addBtn;
    }
  }

  // --- ONGLET GÉNÉRATION ---
  const genTab = document.querySelector('.tab-content[data-tab="generation"]');
  if (genTab) {
    genTab.querySelectorAll('.form-label')[0].textContent = t.genSys;
    genTab.querySelector('.form-hint').textContent = t.genSysHint;
    genTab.querySelectorAll('.form-label')[1].textContent = t.genTemp;
    genTab.querySelectorAll('.form-label')[5].textContent = t.genMax;
    
    // 👇 AJOUTS ICI 👇
    $('systemPromptInput').placeholder = t.sysPromptPlaceholder;
    const presets = genTab.querySelectorAll('.preset-btn');
    if (presets.length >= 5) {
      presets[0].textContent = t.presetDefault;
      presets[1].textContent = t.presetConcise;
      presets[2].textContent = t.presetDeveloper;
      presets[3].textContent = t.presetTeacher;
      presets[4].textContent = t.presetCreative;
    }
  }

  // --- ONGLET APPARENCE ---
  const appTab = document.querySelector('.tab-content[data-tab="appearance"]');
  if (appTab) {
    appTab.querySelectorAll('.form-label')[0].textContent = t.appTheme;
    appTab.querySelector('.theme-option[data-theme="dark"] span').textContent = t.appDark;
    appTab.querySelector('.theme-option[data-theme="light"] span').textContent = t.appLight;
    appTab.querySelector('.theme-option[data-theme="system"] span').textContent = t.appSys;
    appTab.querySelectorAll('.form-label')[1].textContent = t.appAccent;
    appTab.querySelector('div[style*="display:flex"] span').textContent = t.appCustomColor;
    appTab.querySelectorAll('.form-label')[2].textContent = t.appFont;
    appTab.querySelectorAll('.form-label')[3].textContent = t.appBubble;
    appTab.querySelectorAll('.form-label')[4].textContent = t.appCompact;
    
    const compactToggleLabel = appTab.querySelector('.toggle-label');
    if (compactToggleLabel) {
      compactToggleLabel.innerHTML = `${t.activateLabel}<small>${t.compactModeHint}</small>`;
    }
  }

  // --- ONGLET CHAT ---
  const chatTab = document.querySelector('.tab-content[data-tab="chat"]');
  if (chatTab) {
    chatTab.querySelector('.form-label').textContent = t.chatOpts;
    const toggles = chatTab.querySelectorAll('.toggle-label');
    toggles[0].innerHTML = `${t.chatReason}<small>${t.chatReasonHint}</small>`;
    toggles[1].innerHTML = `${t.chatTs}<small>${t.chatTsHint}</small>`;
    toggles[2].innerHTML = `${t.chatScroll}<small>${t.chatScrollHint}</small>`;
    toggles[3].innerHTML = `${t.chatSound}<small>${t.chatSoundHint}</small>`;
  }

// --- ONGLET DONNÉES ---
const dataTab = document.querySelector('.tab-content[data-tab="data"]');
if (dataTab) {
  // 👇 NOUVEAU : Section "Options de stockage" (form-group au-dessus des danger-zones)
  const storageFormGroup = dataTab.querySelector('.form-group');
  if (storageFormGroup) {
    const storageLabel = storageFormGroup.querySelector('.form-label');
    if (storageLabel) storageLabel.textContent = t.storageOptions;

    const idbToggleLabel = storageFormGroup.querySelector('.toggle-label');
    if (idbToggleLabel) {
      idbToggleLabel.innerHTML = `${t.idbLabel}<small>${t.idbHint}</small>`;
    }
  }

  const zones = dataTab.querySelectorAll('.danger-zone');
  
  zones[0].querySelector('h4').textContent = t.dataExport;
  zones[0].querySelector('p').textContent = t.dataExportDesc;
  zones[0].querySelector('button').textContent = t.dataExportBtn;
  
  zones[1].querySelector('h4').textContent = t.dataImport;
  zones[1].querySelector('p').textContent = t.dataImportDesc;
  zones[1].querySelector('button').textContent = t.dataImportBtn;

  zones[2].querySelector('h4').textContent = t.dataClear;
  zones[2].querySelector('p').textContent = t.dataClearDesc; 
  zones[2].querySelector('button').textContent = t.dataClearBtn;

  zones[3].querySelector('h4').textContent = t.dataKeys;
  zones[3].querySelector('p').textContent = t.dataKeysDesc; 
  zones[3].querySelector('button').textContent = t.dataKeysBtn;

  zones[4].querySelector('h4').textContent = t.dataReset;
  zones[4].querySelector('p').textContent = t.dataResetDesc; 
  zones[4].querySelector('button').textContent = t.dataResetBtn;
}

  // --- ONGLET RACCOURCIS ---
  const scList = document.querySelectorAll('.shortcut-list li span');
  if (scList.length >= 8) {
    scList[0].textContent = t.scToggle; scList[1].textContent = t.scNew; scList[2].textContent = t.scSettings;
    scList[3].textContent = t.scExport; scList[4].textContent = t.scSend; scList[5].textContent = t.scNewLine;
    scList[6].textContent = t.scImage; scList[7].textContent = t.scClose;
  }
  const kbdList = document.querySelectorAll('.shortcut-list kbd');
  if (kbdList.length >= 14) {
    kbdList[8].textContent  = t.enter;
    kbdList[9].textContent  = t.shiftEnter.split(' + ')[0];
    kbdList[10].textContent = t.enter;
    kbdList[13].textContent = t.escape;
  }

  // --- ONGLET À PROPOS ---
  const aboutTab = document.querySelector('.tab-content[data-tab="about"]');
  if (aboutTab) {
    aboutTab.querySelectorAll('p')[0].textContent = t.aboutDesc;
    aboutTab.querySelectorAll('h3')[1].textContent = t.aboutCreator;
    aboutTab.querySelector('a').textContent = t.aboutLink;
    
    // 👇 AJOUTS ICI 👇
    const devP = aboutTab.querySelectorAll('p')[1];
    if (devP) {
      devP.innerHTML = `${t.developedBy} <strong>Bstudio136</strong>.<br><a href="https://bstudio136.github.io/mylink/" target="_blank" rel="noopener" style="color:var(--accent); text-decoration:underline;">${t.aboutLink}</a>`;
    }
  }

  // 👇 NOUVEAU : INFOBULLES (TOOLTIPS) 👇
  $('uploadBtn').title = t.tooltipAttach;
  $('imageBtn').title = t.tooltipImageMode;
  // 👆 FIN NOUVEAU 👆

  // --- RAFRAÎCHISSEMENTS DYNAMIQUES ---
  renderConversations();
  if (!conversations[currentConvId] || conversations[currentConvId].messages.length === 0) {
    messagesInner.innerHTML = '';
    renderWelcome();
  }

  if (settingsModal.classList.contains('open')) {
    renderProviderKeys();
    renderCustomProviders();
  }
    // Mettre à jour la description du modèle lors du changement de langue
  updateModelDescription();
}

// Écouter le changement du select
document.addEventListener('DOMContentLoaded', () => {
  const langSelect = $('languageSelect');
  if (langSelect) {
    langSelect.value = currentLang;
    langSelect.addEventListener('change', (e) => {
      currentLang = e.target.value;
      localStorage.setItem('deepchat_lang', currentLang);
      applyLanguage(currentLang);
    });
  }
});

(function init() {
  checkMobile();
  if (localStorage.getItem('deepchat_sidebar') === '1') document.body.classList.add('sidebar-collapsed');
  applyLanguage(currentLang); 
  applyAllAppearance();
  initProviderSelect();
  updateImageModeUI();
  updateImageButtonVisibility();

  const rs = $('imageRatioSelect');
  const ss = $('imageSizeSelect');
  if (rs) rs.value = imageRatio;
  if (ss) ss.value = imageSize;

  if (window.hljs) {
    console.log('[DeepChat] highlight.js loaded:', hljs.versionString || 'unknown');
  } else {
    console.warn('[DeepChat] highlight.js NOT loaded — colors will fallback to plain text');
  }
  (async () => {
    // 1. Charge les conversations
    try {
      if (useIDB) {
        const idbData = await idbLoadConversations();
        if (idbData && Object.keys(idbData).length > 0) {
          conversations = idbData;
        } else {
          const legacy = localStorage.getItem('deepchat_convs');
          if (legacy) {
            conversations = JSON.parse(legacy);
            if (Object.keys(conversations).length > 0) {
              await doSaveConversations();
              try { localStorage.removeItem('deepchat_convs'); } catch (e) {}
            }
          }
        }
      } else {
        const legacy = localStorage.getItem('deepchat_convs');
        if (legacy) conversations = JSON.parse(legacy);
      }
    } catch (e) {
      conversations = {};
    }

    // 2. Charge les brouillons
    try {
      if (useIDB) {
        const idbDrafts = await idbLoadDrafts();
        if (idbDrafts && Object.keys(idbDrafts).length > 0) {
          drafts = idbDrafts;
        } else {
          const legacyDrafts = localStorage.getItem('deepchat_drafts');
          if (legacyDrafts) {
            drafts = JSON.parse(legacyDrafts);
            await idbSaveDrafts(drafts);
            try { localStorage.removeItem('deepchat_drafts'); } catch (e) {}
          }
        }
      } else {
        const legacyDrafts = localStorage.getItem('deepchat_drafts');
        if (legacyDrafts) drafts = JSON.parse(legacyDrafts);
      }
    } catch (e) { drafts = {}; }

// 3. Hydrate les images
try {
  await hydrateConversations();
} catch (e) {
  console.error('[init] hydrate failed:', e);
  showToast((translations[currentLang] || translations.fr).loadImagesError, 'error');
}
isHydrating = false;

    const ids = Object.keys(conversations).sort((a,b) => (conversations[b].updated || conversations[b].upd || conversations[b].created||0) - (conversations[a].upd || conversations[a].created||0));
    if (ids.length > 0) loadConversation(ids[0]);
    else newConversation();

    updateTokenCounter();

    const _initModel = getCurrentModel();
    if (_initModel) fetchModelLimits(providerSelect.value, _initModel);
  })();
})();

/* ============ MODIF VIDÉO/AUDIO GEMINI — bloc autonome ============ */
(function() {
  'use strict';
  
  window.addEventListener('load', function() {
    if (typeof sendMessage !== 'function') return;
    
    var MAX = 20 * 1024 * 1024;
    
    function isGem() {
      var k = (typeof providerSelect !== 'undefined' && providerSelect) ? providerSelect.value : '';
      return k === 'gemini' || String(k).toLowerCase().indexOf('gemini') >= 0;
    }
    
    function kindOf(f) {
      if (!f) return 'text';
      var t = (f.type || '').toLowerCase();
      if (t.indexOf('image/') === 0) return 'image';
      if (t.indexOf('video/') === 0) return 'video';
      if (t.indexOf('audio/') === 0) return 'audio';
      return 'text';
    }
    
    function hasMedia() {
      if (typeof currentAttachedFiles === 'undefined' || !currentAttachedFiles) return false;
      return currentAttachedFiles.some(function(f){
        var k = kindOf(f);
        return k === 'video' || k === 'audio';
      });
    }
    
    // Empêcher le mode image auto quand on joint une vidéo/audio
    if (typeof shouldGenerateImage === 'function') {
      var _origS = shouldGenerateImage;
      window.shouldGenerateImage = function(prompt) {
        if (typeof currentAttachedFiles !== 'undefined' && currentAttachedFiles) {
          var m = currentAttachedFiles.some(function(f){
            var k = kindOf(f);
            return k === 'image' || k === 'video' || k === 'audio';
          });
          if (m) return false;
        }
        return _origS(prompt);
      };
    }
    
    // Filtre vidéo/audio pour les providers OpenAI
    if (typeof buildApiMessages === 'function') {
      var _origB = buildApiMessages;
      window.buildApiMessages = function(history) {
        var msgs = history.map(function(m){
          var content = m.content || '';
          if (typeof content === 'string' && content.indexOf('![IMAGE]') === 0) {
            content = m.imagePrompt ? '[Image générée : ' + m.imagePrompt + ']' : '[Image générée]';
          }
          if (m.role === 'user' && Array.isArray(m.images) && m.images.length) {
            var parts = [];
            if (content) parts.push({ type: 'text', text: content });
            m.images.forEach(function(img){
              var k = img.kind || 'image';
              if (k === 'video' || k === 'audio') {
                parts.push({ type: 'text', text: '[' + k + ' : ' + (img.name||'fichier') + ']' });
              } else {
                parts.push({ type: 'image_url', image_url: { url: img.dataUrl } });
              }
            });
            return { role: m.role, content: parts };
          }
          return { role: m.role, content: content };
        });
        if (typeof systemPrompt !== 'undefined' && systemPrompt && systemPrompt.trim()) {
          msgs.unshift({ role: 'system', content: systemPrompt.trim() });
        }
        return msgs;
      };
    }
    
    // Afficher les vidéos/audios dans les bulles
    if (typeof addMessage === 'function') {
      var _origA = addMessage;
      window.addMessage = function(role, content, opts) {
        opts = opts || {};
        var imgs = opts.images;
        if (role === 'user' && Array.isArray(imgs) && imgs.length) {
          var onlyImg = imgs.filter(function(i){ return (i.kind||'image') === 'image'; });
          var onlyMedia = imgs.filter(function(i){
            var k = i.kind || 'image';
            return k === 'video' || k === 'audio';
          });
          var newOpts = Object.assign({}, opts);
          newOpts.images = onlyImg.length ? onlyImg : undefined;
          var res = _origA.call(this, role, content, newOpts);
          if (onlyMedia.length && res && res.bubble) {
            var target = res.bubble.querySelector('.user-image-preview');
            if (!target) {
              target = document.createElement('div');
              target.className = 'user-image-preview';
              res.bubble.appendChild(target);
            }
            onlyMedia.forEach(function(img){
              var k = img.kind || 'image';
              if (k === 'video') {
                var v = document.createElement('video');
                v.src = img.dataUrl; v.controls = true; v.preload = 'metadata';
                v.style.cssText = 'max-width:260px;max-height:240px;border-radius:10px;border:1px solid var(--border);background:var(--bg-input);';
                target.appendChild(v);
              } else {
                var a = document.createElement('audio');
                a.src = img.dataUrl; a.controls = true; a.preload = 'metadata';
                a.style.cssText = 'width:260px;';
                target.appendChild(a);
              }
            });
          }
          return res;
        }
        return _origA.call(this, role, content, opts);
      };
    }
    
    // override sendMessage pour inclure vidéo/audio
    var _origSend = sendMessage;
    window.sendMessage = async function() {
      if (!hasMedia()) return _origSend.apply(this, arguments);
      
      if (!isGem()) {
        if (typeof showToast === 'function') showToast('❌ Vidéos/audios = Gemini uniquement.', 'error', 6000);
        return;
      }
      var tooBig = currentAttachedFiles.find(function(f){
        var k = kindOf(f);
        return (k === 'video' || k === 'audio') && f.size > MAX;
      });
      if (tooBig) {
        if (typeof showToast === 'function') showToast('❌ "' + tooBig.name + '" dépasse 20 Mo', 'error', 6000);
        return;
      }
      
      var rawText = messageInput.value.trim();
      if (!rawText && currentAttachedFiles.length === 0) return;
      if (typeof isStreaming !== 'undefined' && isStreaming) return;
      
      var conv = (typeof conversations !== 'undefined') ? conversations[currentConvId] : null;
      if (!conv) return;
      
      if (typeof editingMessage !== 'undefined' && editingMessage && editingMessage.convId === currentConvId) {
        conv.messages = conv.messages.slice(0, editingMessage.index);
        cancelEdit();
        renderCurrentConversation();
      }
      
      var allMedia = currentAttachedFiles.filter(function(f){
        var k = kindOf(f);
        return k === 'image' || k === 'video' || k === 'audio';
      });
      
      var imagesForApi = [];
      try {
        imagesForApi = await Promise.all(allMedia.map(async function(f){
          var d = await readFileAsDataURL(f);
          var b64 = d.indexOf(',') >= 0 ? d.split(',')[1] : '';
          return {
            name: f.name,
            mime: f.type || 'application/octet-stream',
            base64: b64,
            dataUrl: d,
            kind: kindOf(f)
          };
        }));
      } catch(e) {
        if (typeof showToast === 'function') showToast('Erreur lecture fichier', 'error');
        return;
      }
      
      var metas = currentAttachedFiles.map(function(f){ return { name: f.name, size: f.size, type: f.type }; });
      var finalContent = rawText;
      
      if (!finalContent) finalContent = 'Analyse ces fichiers en détail.';
      
      conv.messages.push({
        role: 'user',
        content: finalContent,
        displayContent: rawText || '📎 [Fichiers joints]',
        files: metas,
        timestamp: Date.now(),
        images: imagesForApi.length ? imagesForApi : undefined
      });
      conv.upd = Date.now();
      
      if (conv.messages.length === 1) {
        conv.title = (rawText || 'Fichier').slice(0, 50);
      }
      
      addMessage('user', rawText || '📎 [Fichiers joints]', {
        files: metas,
        images: imagesForApi,
        timestamp: Date.now(),
        messageIndex: conv.messages.length - 1
      });
      
      saveConversations();
      renderConversations();
      messageInput.value = '';
      if (typeof drafts !== 'undefined') { delete drafts[currentConvId]; idbSaveDrafts(drafts).catch(function(){}); }
      currentAttachedFiles = [];
      renderFilePreviews();
      autoResize();
      updateTokenCounter();
      
      await runCompletion();
    };
    
    // Hint au changement de provider
    function updateHint() {
      var h = document.getElementById('mediaHint');
      if (h) h.style.display = isGem() ? 'block' : 'none';
    }
    if (typeof providerSelect !== 'undefined' && providerSelect) {
      providerSelect.addEventListener('change', updateHint);
    }
    updateHint();
    
    console.log('[MODIF] ✅ Vidéo/audio Gemini activé');
  });
})();

/* ============ DICTÉE VOCALE + LECTURE TTS ============ */
(function(){
  if (window.__voiceTtsPatched) return;
  window.__voiceTtsPatched = true;

  /* ============================================================
     PARTIE 1 — DICTÉE VOCALE (bouton 🎤 à côté du 📎)
     ============================================================ */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  function injectVoiceButton(){
    var wrapper = document.querySelector('.input-wrapper');
    if (!wrapper) { setTimeout(injectVoiceButton, 200); return; }
    if (document.getElementById('voiceBtn')) return;

    var btn = document.createElement('button');
    btn.id = 'voiceBtn';
    btn.className = 'icon-btn upload-btn';
    btn.title = 'Dicter un message (Ctrl+Shift+M)';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';

    // Toujours insérer DANS la barre de saisie (.input-wrapper), après le bouton 📎
    var uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn && uploadBtn.parentNode === wrapper) {
      wrapper.insertBefore(btn, uploadBtn.nextSibling);
    } else {
      wrapper.insertBefore(btn, wrapper.firstChild);
    }

    if (!SR) {
      btn.style.opacity = '0.4';
      btn.title = 'Dictée non supportée (Chrome/Edge recommandé)';
      btn.onclick = function() {
        if (typeof showToast === 'function') showToast('❌ Dictée non supportée. Utilisez Chrome ou Edge.', 'warning', 5000);
      };
      return;
    }

    var recognition = null;
    var isListening = false;
    var baseText = '';

    btn.onclick = function(){
      if (!recognition) {
        recognition = new SR();
        recognition.lang = localStorage.getItem('deepchat_voice_lang') || 'fr-FR';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = function(){
          isListening = true;
          btn.style.color = 'var(--accent)';
          btn.style.background = 'rgba(251,191,36,0.15)';
          btn.classList.add('voice-listening');
          baseText = messageInput.value;
        };

        recognition.onresult = function(e){
          var interim = '';
          var final = '';
          for (var i = e.resultIndex; i < e.results.length; i++) {
            var t = e.results[i][0].transcript;
            if (e.results[i].isFinal) final += t;
            else interim += t;
          }
          var newText = (baseText + ' ' + final).trim();
          if (final) baseText = newText;
          messageInput.value = (baseText + (interim ? ' ' + interim : '')).trim();
          if (typeof autoResize === 'function') autoResize();
          if (typeof updateTokenCounter === 'function') updateTokenCounter();
        };

        recognition.onerror = function(e){
          if (e.error === 'not-allowed') {
            if (typeof showToast === 'function') showToast('❌ Micro refusé. Autorisez dans les paramètres du navigateur.', 'error', 5000);
          } else if (e.error !== 'no-speech') {
            if (typeof showToast === 'function') showToast('Erreur micro : ' + e.error, 'error');
          }
          stopVoice();
        };

        recognition.onend = function(){
          if (isListening) {
            try { recognition.start(); } catch(e) {}
          }
        };
      }

      if (isListening) stopVoice();
      else startVoice();
    };

    function startVoice(){
      try { recognition.start(); } catch(e) {
        if (typeof showToast === 'function') showToast('Impossible de démarrer le micro', 'error');
      }
    }

    function stopVoice(){
      isListening = false;
      btn.style.color = 'var(--text-secondary)';
      btn.style.background = '';
      btn.classList.remove('voice-listening');
      try { recognition.stop(); } catch(e) {}
    }

    // Raccourci clavier
    document.addEventListener('keydown', function(e){
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        btn.click();
      }
    });

    // CSS animations
    var style = document.createElement('style');
    style.textContent = `
      @keyframes voicePulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.5); }
        50% { box-shadow: 0 0 0 6px rgba(251,191,36,0); }
      }
      .voice-listening { animation: voicePulse 1.2s ease-in-out infinite; }
      .tts-btn.speaking { color: var(--accent) !important; background: rgba(251,191,36,0.1); }
    `;
    document.head.appendChild(style);

    console.log('%c[VOICE] ✅ Dictée activée (Ctrl+Shift+M)', 'color:#22c55e');
  }

  /* ============================================================
     PARTIE 2 — LECTURE DES MESSAGES (bouton 🔊 sur chaque bulle IA)
     ============================================================ */
  var currentBtn = null;

  function getTtsLang(){
    return localStorage.getItem('deepchat_tts_lang') || (navigator.language || 'fr-FR');
  }

  function extractTextFromBubble(bubble){
    // Si du texte est sélectionné dans la bulle, ne lire QUE la sélection
    var sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 10) {
      var range = sel.getRangeAt(0);
      if (bubble.contains(range.commonAncestorContainer)) {
        return sel.toString().trim();
      }
    }
    // Sinon, cloner et nettoyer
    var clone = bubble.cloneNode(true);
    clone.querySelectorAll('.code-actions, .img-actions, .message-actions, .reasoning-block, .generated-image-container, .user-image-preview, .user-media-preview, .file-badge-list, .msg-toggle-btn, .msg-content-fade, script, style, button, .tts-btn').forEach(function(el){ el.remove(); });
    var text = clone.innerText || clone.textContent || '';
    return text.replace(/\s+/g, ' ').trim();
  }

  function splitIntoChunks(text, maxLen){
    maxLen = maxLen || 200;
    var result = [];
    var sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    var current = '';
    sentences.forEach(function(s){
      s = s.trim();
      if (!s) return;
      if ((current + ' ' + s).length > maxLen && current) {
        result.push(current.trim());
        current = s;
      } else {
        current = (current + ' ' + s).trim();
      }
    });
    if (current) result.push(current);
    // Découper les chunks trop longs
    var final = [];
    result.forEach(function(c){
      if (c.length > maxLen * 2) {
        var re = new RegExp('.{1,' + maxLen + '}(?:\\s|$)', 'g');
        var parts = c.match(re) || [c];
        final = final.concat(parts.map(function(p){ return p.trim(); }));
      } else {
        final.push(c);
      }
    });
    return final;
  }

  function stopTTS(){
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (currentBtn) {
      currentBtn.classList.remove('speaking');
      currentBtn.innerHTML = '🔊 Lire';
      currentBtn = null;
    }
  }

  function speakText(btn, text){
    if (!text || !window.speechSynthesis) {
      if (typeof showToast === 'function') showToast('❌ Lecture non supportée sur ce navigateur', 'error');
      return;
    }
    // Toggle : re-clic sur le même bouton = stop
    if (currentBtn === btn) { stopTTS(); return; }
    stopTTS();

    var lang = getTtsLang();
    var chunks = splitIntoChunks(text, 200);
    var idx = 0;

    currentBtn = btn;
    btn.classList.add('speaking');
    btn.innerHTML = '⏹️ Stop';

    function speakNext(){
      if (idx >= chunks.length) { stopTTS(); return; }
      var u = new SpeechSynthesisUtterance(chunks[idx]);
      u.lang = lang;
      u.rate = 1.0;
      u.pitch = 1.0;
      u.onend = function(){ idx++; speakNext(); };
      u.onerror = function(e){
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('[TTS] error:', e);
        }
        stopTTS();
      };
      window.speechSynthesis.speak(u);
    }
    speakNext();
  }

  function attachTtsButton(body){
    if (!body || body.querySelector('.tts-btn')) return;
    var bubble = body.querySelector('.bubble');
    if (!bubble) return;

    var text = extractTextFromBubble(bubble);
    if (!text || text.length < 3) return;

    var actions = body.querySelector('.message-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'message-actions';
      body.appendChild(actions);
    }

    var btn = document.createElement('button');
    btn.className = 'action-btn tts-btn';
    btn.innerHTML = '🔊 Lire';
    btn.title = 'Lire ce message à voix haute (' + getTtsLang() + ')';
    btn.onclick = function(e){
      e.stopPropagation();
      // Re-extraire le texte au moment du clic (au cas où)
      var freshText = extractTextFromBubble(bubble);
      speakText(btn, freshText);
    };
    actions.insertBefore(btn, actions.firstChild);
  }

  // Override addMessageActions → ajoute le bouton 🔊
  if (typeof addMessageActions === 'function') {
    var _origAMA = addMessageActions;
    window.addMessageActions = function(body, isLast){
      var r = _origAMA.apply(this, arguments);
      try { attachTtsButton(body); } catch(e) { console.warn('[TTS]', e); }
      return r;
    };
  }

  // Fallback : observer les nouveaux messages assistant
  function startObserver(){
    var container = document.getElementById('messagesInner');
    if (!container) { setTimeout(startObserver, 200); return; }

    var observer = new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.addedNodes.forEach(function(node){
          if (node.nodeType !== 1) return;
          if (node.classList && node.classList.contains('message') && node.classList.contains('assistant')) {
            var body = node.querySelector('.message-body');
            if (body) attachTtsButton(body);
          }
          // Cas où un .message-actions vient d'être ajouté
          if (node.classList && node.classList.contains('message-actions')) {
            var parentBody = node.closest('.message-body');
            if (parentBody) attachTtsButton(parentBody);
          }
        });
      });
    });
    observer.observe(container, { childList: true, subtree: true });

    // Traiter les messages déjà présents
    container.querySelectorAll('.message.assistant').forEach(function(msg){
      var body = msg.querySelector('.message-body');
      if (body) attachTtsButton(body);
    });
  }

  // Stop TTS quand on change de conversation
  document.addEventListener('click', function(e){
    if (e.target.closest('.conv-item') || e.target.closest('#newChatBtn') || e.target.closest('#newChatBtn2')) {
      stopTTS();
    }
  }, true);

  // Bootstrap
  injectVoiceButton();
  startObserver();

  console.log('%c[VOICE+TTS] ✅ Dictée + Lecture activées', 'color:#22c55e;font-weight:bold');
})();
/* ============================================================
   GESTION DES MODES IMAGE / VIDÉO (dans la topbar)
   ============================================================ */
(function setupMediaModes() {
  const imageBtn = document.getElementById('imageBtn');
  const videoBtn = document.getElementById('videoBtn');
  const imageBanner = document.getElementById('imageModeBanner');
  const videoBanner = document.getElementById('videoModeBanner');
  const cancelImageBtn = document.getElementById('cancelImageModeBtn');
  const cancelVideoBtn = document.getElementById('cancelVideoModeBtn');
  const inputWrapper = document.getElementById('inputWrapperEl');
  const messageInput = document.getElementById('messageInput');

  if (!imageBtn || !videoBtn) {
    console.warn('[MediaModes] Boutons image/vidéo introuvables');
    return;
  }

  window.isImageMode = false;
  window.isVideoMode = false;

  // --- Bouton IMAGE ---
  imageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willActivate = !window.isImageMode;
    if (willActivate && window.isVideoMode) {
      window.isVideoMode = false;
      videoBanner.classList.remove('active');
      videoBtn.classList.remove('active');
    }
    window.isImageMode = willActivate;
    imageBtn.classList.toggle('active', willActivate);
    imageBanner.classList.toggle('active', willActivate);
    inputWrapper.classList.toggle('image-mode', willActivate);
    messageInput.placeholder = willActivate
      ? "Décrivez l'image à générer…"
      : 'Écrivez votre message…';
  });

  // --- Bouton VIDÉO ---
  videoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willActivate = !window.isVideoMode;
    if (willActivate && window.isImageMode) {
      window.isImageMode = false;
      imageBanner.classList.remove('active');
      imageBtn.classList.remove('active');
      inputWrapper.classList.remove('image-mode');
    }
    window.isVideoMode = willActivate;
    videoBtn.classList.toggle('active', willActivate);
    videoBanner.classList.toggle('active', willActivate);
    messageInput.placeholder = willActivate
      ? 'Décrivez la vidéo à générer…'
      : 'Écrivez votre message…';
  });

  // --- Bouton "Désactiver" dans le popover image ---
  if (cancelImageBtn) {
    cancelImageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.isImageMode = false;
      imageBtn.classList.remove('active');
      imageBanner.classList.remove('active');
      inputWrapper.classList.remove('image-mode');
      messageInput.placeholder = 'Écrivez votre message…';
    });
  }

  // --- Bouton "Désactiver" dans le popover vidéo ---
  if (cancelVideoBtn) {
    cancelVideoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.isVideoMode = false;
      videoBtn.classList.remove('active');
      videoBanner.classList.remove('active');
      messageInput.placeholder = 'Écrivez votre message…';
    });
  }

  // --- Fermer les popovers si on clique ailleurs (sans désactiver le mode) ---
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.topbar-right')) {
      imageBanner.classList.remove('active');
      videoBanner.classList.remove('active');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      imageBanner.classList.remove('active');
      videoBanner.classList.remove('active');
    }
  });

  // --- Afficher les boutons quand le provider Agnes est sélectionné ---
  const providerSelect = document.getElementById('providerSelect');
  if (providerSelect) {
    const updateModeButtons = () => {
      const val = (providerSelect.value || '').toLowerCase();
      // Adapte ici si ton provider Agnes a un ID différent de "agnes"
      const isAgnes = val.includes('agnes');
      imageBtn.style.display = isAgnes ? 'flex' : 'none';
      videoBtn.style.display = isAgnes ? 'flex' : 'none';
      if (!isAgnes) {
        window.isImageMode = false;
        window.isVideoMode = false;
        imageBtn.classList.remove('active');
        videoBtn.classList.remove('active');
        imageBanner.classList.remove('active');
        videoBanner.classList.remove('active');
        inputWrapper.classList.remove('image-mode');
        messageInput.placeholder = 'Écrivez votre message…';
      }
    };
    providerSelect.addEventListener('change', updateModeButtons);
    updateModeButtons();
  }
})();

/* ============================================================
   GÉNÉRATION VIDÉO via Agnes AI
   ============================================================ */
async function generateVideoFromPrompt(prompt) {
  if (typeof addMessage === 'function') {
    addMessage('user', prompt);
  }

  const container = document.createElement('div');
  container.className = 'generated-image-container';
  container.innerHTML = `<div class="image-loading-spinner">Génération de la vidéo… (cela peut prendre du temps)</div>`;
  document.getElementById('messagesInner').appendChild(container);
  container.scrollIntoView({ behavior: 'smooth', block: 'end' });

  const model = document.getElementById('videoModelSelect').value;
  // Pour le modèle Flash, la durée doit être une chaîne entre "4" et "12" secondes
  const seconds = document.getElementById('videoDurationSelect').value;
  // Le modèle Flash impose la taille "720P"
  const size = "720P"; 

  // 🔑 RÉCUPÉRATION AUTOMATIQUE DE LA CLÉ API AGNES
  // Le code va chercher la clé que tu as enregistrée dans les paramètres.
  // (On teste plusieurs noms de variables au cas où, car ton code n'était pas visible en entier)
  const AGNES_API_KEY = localStorage.getItem('key_agnes') 
                     || localStorage.getItem('apiKey_agnes') 
                     || localStorage.getItem('agnes_key') 
                     || (window.apiKeys && window.apiKeys['agnes']) 
                     || "";

  if (!AGNES_API_KEY) {
    container.innerHTML = `<div class="error-block">
      <div class="error-title">Clé API Agnes manquante</div>
      <div class="error-detail">Veuillez renseigner votre clé API Agnes dans les paramètres de l'application (onglet Clés API).</div>
    </div>`;
    return;
  }

  try {
    // 1. Création de la tâche vidéo auprès d'Agnes
    const createResponse = await fetch('https://apihub.agnes-ai.com/v1/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGNES_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        seconds: seconds, 
        mode: "text",
        size: size,
        aspect_ratio: "16:9" // Optionnel
      })
    });

    if (!createResponse.ok) {
      const errData = await createResponse.json().catch(() => ({}));
      throw new Error(`Erreur API Agnes (${createResponse.status}) : ${errData.message || 'Vérifiez votre clé API.'}`);
    }

    const createData = await createResponse.json();
    const videoId = createData.video_id; 

    if (!videoId) {
      throw new Error("L'API Agnes n'a pas renvoyé de video_id.");
    }

    // 2. Attente de la fin de la génération (Polling toutes les 2 secondes)
    let videoUrl = null;
    while (!videoUrl) {
      await new Promise(resolve => setTimeout(resolve, 2000)); 

      const pollResponse = await fetch(`https://apihub.agnes-ai.com/agnesapi?video_id=${videoId}&model_name=${model}`, {
        headers: { 'Authorization': `Bearer ${AGNES_API_KEY}` }
      });

      if (!pollResponse.ok) continue;

      const pollData = await pollResponse.json();
      const status = pollData.status;

      if (status === 'completed') {
        videoUrl = pollData.url; 
      } else if (status === 'failed') {
        throw new Error("La génération de la vidéo a échoué côté Agnes.");
      }
    }

    // 3. Affichage de la vidéo générée
    container.innerHTML = '';
    const videoEl = document.createElement('video');
    videoEl.src = videoUrl;
    videoEl.controls = true;
    videoEl.autoplay = true;
    videoEl.loop = true;
    videoEl.style.width = '100%';
    videoEl.style.borderRadius = '8px';
    videoEl.style.display = 'block';
    container.appendChild(videoEl);

    const actions = document.createElement('div');
    actions.className = 'img-actions';
    actions.style.opacity = '1';
    const dl = document.createElement('button');
    dl.className = 'img-action-btn';
    dl.innerHTML = '⬇ Télécharger';
    dl.onclick = () => {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = 'video-generee.mp4';
      a.click();
    };
    actions.appendChild(dl);
    container.appendChild(actions);

  } catch (err) {
    console.error('Erreur génération vidéo:', err);
    container.innerHTML = `<div class="error-block">
      <div class="error-title">Erreur de génération vidéo</div>
      <div class="error-detail">${err.message || 'Une erreur est survenue.'}</div>
    </div>`;
  }

  // Désactiver le mode vidéo après génération
  window.isVideoMode = false;
  document.getElementById('videoBtn').classList.remove('active');
  document.getElementById('videoModeBanner').classList.remove('active');
  document.getElementById('messageInput').placeholder = 'Écrivez votre message…';
}

/* ============================================================
   INTERCEPTION DU BOUTON ENVOYER — MODE VIDÉO
   ============================================================ */
(function interceptVideoSend() {
  const sendBtn = document.getElementById('sendBtn');
  const messageInput = document.getElementById('messageInput');
  if (!sendBtn || !messageInput) {
    console.warn('[VideoIntercept] Éléments introuvables');
    return;
  }

  function triggerVideoIfActive(e) {
    if (!window.isVideoMode) return false;
    const prompt = (messageInput.value || '').trim();
    if (!prompt) return false;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    messageInput.value = '';
    messageInput.style.height = 'auto';
    generateVideoFromPrompt(prompt);
    return true;
  }

  // 1) Clic sur le bouton Envoyer
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#sendBtn')) return;
    triggerVideoIfActive(e);
  }, true); 

  // 2) Touche Entrée dans le textarea
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    if (document.activeElement !== messageInput) return;
    triggerVideoIfActive(e);
  }, true);

  console.log('[VideoIntercept] ✅ Envoi en mode vidéo activé');
})();
