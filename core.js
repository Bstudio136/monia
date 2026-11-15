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
    models: ['agnes-3.0-flash', 'agnes-2.5-flash', 'agnes-image-2.5-flash'],
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
    if (currentAttachedFiles.some(f => f.type.startsWith('image/'))) return false;
    const lowerPrompt = prompt.toLowerCase();
    return IMAGE_KEYWORDS.some(keyword => lowerPrompt.includes(keyword));
}

// ==== AFFICHAGE DES ANCIENNES VIDÉOS (conversations existantes) ====
function buildVideoElement(url, prompt) {
  const wrap = document.createElement('div');
  wrap.className = 'generated-video-container';
  const v = document.createElement('video');
  v.controls = true; v.preload = 'metadata'; v.src = url;
  v.style.cssText = 'max-width:100%;border-radius:12px;display:block;';
  wrap.appendChild(v);
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener';
  a.textContent = '⬇️ Ouvrir / télécharger la vidéo';
  a.style.cssText = 'display:inline-block;margin-top:6px;font-size:12px;';
  wrap.appendChild(a);
  if (prompt) {
    const p = document.createElement('div');
    p.style.cssText = 'font-size:12px;color:var(--text-muted);margin-top:4px;';
    p.textContent = '🎬 ' + prompt;
    wrap.appendChild(p);
  }
  return wrap;
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
  'gemini-3.5-flash': 'Le plus rapide de Google. Contexte gigantesque de 1 million de tokens. Parfait pour de longs documents. 🎬🎙️ Accepte aussi les vidéos et l\'audio.',
  'gemini-3.5-flash-lite': 'Version encore plus rapide et légère de Gemini. 🎬🎙️ Accepte aussi les vidéos et l\'audio.',
  
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
