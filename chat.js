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
      imagePrompt: m.imagePrompt, imageRatio: m.imageRatio, imageSize: m.imageSize,
      videoPrompt: m.videoPrompt
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
    if (content && content.startsWith('![VIDEO]')) {
        bubble.appendChild(buildVideoElement(content.substring(8), opts.videoPrompt));
    } else if (content && content.startsWith('![IMAGE]')) {
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
        if (img.mime && (img.mime.startsWith('video/') || img.mime.startsWith('audio/'))) {
          const mEl = document.createElement(img.mime.startsWith('video/') ? 'video' : 'audio');
          mEl.controls = true;
          mEl.src = img.dataUrl;
          mEl.style.maxWidth = '100%';
          mEl.title = img.name || '';
          imgGrid.appendChild(mEl);
          return;
        }
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
    } else if (typeof content === 'string' && content.startsWith('![VIDEO]')) {
      content = m.videoPrompt ? `[Vidéo générée pour : ${m.videoPrompt}]` : '[Vidéo générée]';
    }
    if (m.role === 'user' && Array.isArray(m.images) && m.images.some(i => !i.mime || i.mime.startsWith('image/'))) {
      const parts = [];
      if (content) parts.push({ type: 'text', text: content });
      m.images.filter(i => !i.mime || i.mime.startsWith('image/')).forEach(img => {
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
      } else if (typeof text === 'string' && text.startsWith('![VIDEO]')) {
        text = m.videoPrompt ? `[Vidéo générée pour : ${m.videoPrompt}]` : '[Vidéo générée]';
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

  const mediaIsSupported = providerSelect.value === 'gemini';
  if (!mediaIsSupported && currentAttachedFiles.some(isMediaFile)) {
    showToast("🎬🎙️ Les vidéos et l'audio sont acceptés uniquement avec Gemini — fichiers ignorés.", 'warning');
    currentAttachedFiles = currentAttachedFiles.filter(f => !isMediaFile(f));
  }
  const hasImage = currentAttachedFiles.some(f => f.type.startsWith('image/') || isMediaFile(f));
  if (hasImage && !text) {
    finalPromptContent = (currentAttachedFiles.some(isMediaFile) ? "Analyse et décris ce contenu en détail." : "Décris cette image en détail.") + (finalPromptContent ? '\n' + finalPromptContent : '');
  }

  let imagesForApi = [];
  if (hasImage) {
    const imageFiles = currentAttachedFiles.filter(f => f.type.startsWith('image/') || isMediaFile(f));
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

  if (lastMsg.content.startsWith('![VIDEO]')) {
      showToast("La continuation n'est pas supportée pour les vidéos générées.", "warning");
      return;
  }
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
