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
    if (file.size > maxFileSize(file)) { showToast(`Le fichier "${file.name}" dépasse ${isMediaFile(file) ? 15 : 4}MB.`, 'error'); return; }
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

function isMediaFile(f) {
  return !!(f && f.type && (f.type.startsWith('audio/') || f.type.startsWith('video/')));
}
function maxFileSize(f) { return isMediaFile(f) ? 15 * 1024 * 1024 : 4 * 1024 * 1024; }

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
      if (file.type.startsWith('video/')) icon = '🎬';
      else if (file.type.startsWith('audio/')) icon = '🎙️';
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
      if (file.size > maxFileSize(file)) { showToast(`Le fichier "${file.name}" dépasse ${isMediaFile(file) ? 15 : 4}MB.`, 'error'); return; }
      const allowedExtensions = ['txt','md','py','js','html','css','json','cpp','java','cs','go','rs','php','sh','yml','yaml','xml','png','jpg','jpeg','gif','webp'];
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (file.type.startsWith('image/') || isMediaFile(file) || allowedExtensions.includes(fileExt)) currentAttachedFiles.push(file);
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
      'gemini-3.5-flash': 'Le plus rapide de Google. Contexte gigantesque de 1 million de tokens. Parfait pour de longs documents. 🎬🎙️ Accepte aussi les vidéos et l\'audio.',
      'gemini-3.5-flash-lite': 'Version encore plus rapide et légère de Gemini. 🎬🎙️ Accepte aussi les vidéos et l\'audio.',
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
      'gemini-3.5-flash': 'Google\'s fastest. Huge 1M token context. Perfect for long documents. 🎬🎙️ Also accepts video and audio.',
      'gemini-3.5-flash-lite': 'Even faster and lighter version of Gemini. 🎬🎙️ Also accepts video and audio.',
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
      'gemini-3.5-flash': 'Il più veloce di Google. Contesto gigantesco di 1 milione di token. Perfetto per documenti lunghi. 🎬🎙️ Accetta anche video e audio.',
      'gemini-3.5-flash-lite': 'Versione ancora più veloce e leggera di Gemini. 🎬🎙️ Accetta anche video e audio.',
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
      'gemini-3.5-flash': 'Google\'ın en hızlısı. 1 milyon token\'lık devasa bağlam. Uzun belgeler için mükemmel. 🎬🎙️ Video ve ses de kabul eder.',
      'gemini-3.5-flash-lite': 'Gemini\'nin daha da hızlı ve hafif sürümü. 🎬🎙️ Video ve ses de kabul eder.',
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
