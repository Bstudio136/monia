<div align="center">
  <h3>🌍 Choose your language / Choisissez votre langue / Scegli la lingua / Dilinizi seçin</h3>
  <a href="#english">🇬🇧 English</a> | <a href="#francais">🇫🇷 Français</a> | <a href="#italiano">🇮🇹 Italiano</a> | <a href="#turkce">🇹🇷 Türkçe</a>
</div>

---

<div id="english"></div>
🇬🇧<br>

# 🧠 DeepChat | Multi-Provider AI

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Privacy](https://img.shields.io/badge/100%25_Local_Privacy-22c55e?style=for-the-badge&logo=shield)

A powerful, 100% client-side, multi-provider AI chat interface. Connect to Groq, Mistral, Gemini, Hugging Face, Agnes, or any custom OpenAI-compatible API from a single, beautiful interface. No backend, no data collection — your API keys and conversations never leave your browser.

## 🔗 Live Demo
👉 **[Test DeepChat here](https://bstudio136.github.io/monia/)**

## ✨ Features

- **Multi-Provider Support**: Native support for Agnes, Groq, Mistral, Gemini, Hugging Face, and custom OpenAI-compatible endpoints.
- **100% Local Privacy**: All conversations, images, and API keys are stored securely in your browser (`localStorage` and `IndexedDB`). No server involved.
- **Streaming & Reasoning**: Real-time streaming responses (SSE) with support for "Thinking/Reasoning" blocks (e.g., DeepSeek, Gemini).
- **AI Image Generation**: Generate images directly in the chat using the Agnes image API, complete with a built-in gallery and lightbox.
- **Rich Attachments**: Drop images, text, or code files into the chat. Text files are read into the context; images are sent to vision-capable models.
- **Audio & Video with Gemini**: When Gemini is selected, you can also attach audio and video files (up to 15 MB) and have them analyzed.
- **Advanced Markdown & Syntax Highlighting**: Beautiful code blocks with `highlight.js`, copy buttons, and line-wrap toggles.
- **Token & Context Tracking**: Real-time estimation of token usage with visual context limits to prevent API errors.
- **Multilingual Interface**: Available in French, English, Italian, and Turkish.
- **Fully Customizable UI**: Dark/Light mode, custom accent colors, adjustable font size, bubble width, and a compact mode.
- **Export & Import**: Backup your entire chat history (including images) as a JSON file and restore it anytime.
- **Mobile Responsive**: Carefully optimized for mobile devices with safe-area support, touch-friendly targets, and a sliding sidebar.

## 🛠️ Tech Stack

- **HTML5 & CSS3**: Semantic structure, CSS Variables, Flexbox, CSS Grid, and smooth animations.
- **JavaScript (Vanilla)**: No frameworks. Direct DOM manipulation and state management.
- **IndexedDB**: Used to store heavy base64 images locally without hitting the `localStorage` quota limit.
- **Libraries (via CDN)**:
  - `marked.js` (Markdown parsing)
  - `DOMPurify` (XSS protection / HTML sanitization)
  - `highlight.js` (Code syntax highlighting)

## 📁 Project Structure

```
monia/
├── index.html   # Page structure (HTML)
├── style.css    # All styles (CSS)
├── core.js      # Config, providers, token limits, IndexedDB, image mode & gallery
├── chat.js      # Conversations, messages, API calls, streaming, error handling
└── app.js       # Events, settings, translations (i18n), startup
```

> ⚠️ Keep the three JavaScript files in the same folder, and load them in this order: `core.js` → `chat.js` → `app.js` (already done in `index.html`).

## 🚀 Installation & Usage

This project is 100% static: no build step, no npm, no backend.

1. Clone the repository:
   ```bash
   git clone https://github.com/Bstudio136/MONIA.git
   ```
2. Open `index.html` directly in your browser (keep all the files in the same folder).
3. Go to **Settings (⚙️)** -> **API Keys**.
4. Enter your API keys for the providers you want to use (e.g., Groq or Mistral).
5. Start chatting!

## 🎨 Customization & Configuration

- **Custom Providers**: You can add any API that mimics the OpenAI format (Endpoint + Models + API Key) directly in the settings.
- **System Prompt**: Define the AI's personality (hidden by default).
- **API Keys Security**: Your keys are stored locally in `localStorage`. They are only sent to the respective AI provider's endpoint. **Never share your browser data or export files with anyone if they contain your API keys.**

## 👨‍💻 Author

**Bstudio136**

- 🐙 GitHub : [@Bstudio136](https://github.com/Bstudio136)
- 🎵 TikTok : [@bstudio136](https://tiktok.com/@bstudio136)
- 🐦 Twitter / X : [@Bstudio136](https://x.com/Bstudio136)
- 📺 YouTube : [@Bstudio136](https://www.youtube.com/@Bstudio136)

## 📄 License

This project is under the MIT License. You are free to use and modify it for your own needs.

<a href="https://hiddenswap.com/pay/AgRPwfFe" target="_blank" rel="noopener"><img src="https://hiddenswap.com/pay/AgRPwfFe/button.svg" alt="Donate with any coin" width="247" height="44"></a>

---

<div id="francais"></div>
🇫🇷<br>

# 🧠 DeepChat | Chat IA Multi-Fournisseurs

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Privacy](https://img.shields.io/badge/Confidentialit%C3%A9_100%25_Locale-22c55e?style=for-the-badge&logo=shield)

Une interface de chat IA puissante, 100% côté client, compatible avec de multiples fournisseurs. Connectez-vous à Groq, Mistral, Gemini, Hugging Face, Agnes ou n'importe quelle API personnalisée compatible OpenAI depuis une interface unique et magnifique. Aucun serveur, aucune collecte de données — vos clés API et conversations ne quittent jamais votre navigateur.

## 🔗 Démo en direct
👉 **[Tester DeepChat ici](https://bstudio136.github.io/monia/)**

## ✨ Fonctionnalités

- **Support Multi-Fournisseurs** : Prise en charge native d'Agnes, Groq, Mistral, Gemini, Hugging Face et des points de terminaison personnalisés compatibles OpenAI.
- **Confidentialité 100% Locale** : Toutes les conversations, images et clés API sont stockées de manière sécurisée dans votre navigateur (`localStorage` et `IndexedDB`). Aucun serveur impliqué.
- **Streaming & Raisonnement** : Réponses en temps réel avec support des blocs de "Réflexion/Reasoning" (ex: DeepSeek, Gemini).
- **Génération d'Images IA** : Générez des images directement dans le chat via l'API Agnes, avec une galerie et une lightbox intégrées.
- **Pièces Jointes Riches** : Glissez-déposez des images, textes ou codes dans le chat. Les fichiers textes sont lus dans le contexte ; les images sont envoyées aux modèles compatibles vision.
- **Audio & Vidéo avec Gemini** : Quand Gemini est sélectionné, vous pouvez aussi joindre des fichiers audio et vidéo (jusqu'à 15 Mo) pour les faire analyser.
- **Markdown Avancé & Coloration Syntaxique** : Blocs de code optimisés avec `highlight.js`, boutons de copie et retour à la ligne.
- **Suivi des Tokens** : Estimation en temps réel de l'utilisation des tokens avec limites visuelles pour éviter les erreurs API.
- **Interface Multilingue** : Disponible en français, anglais, italien et turc.
- **Interface Entièrement Personnalisable** : Mode Sombre/Clair, couleurs d'accentuation personnalisées, taille du texte, largeur des bulles et mode compact.
- **Export & Import** : Sauvegardez tout votre historique de chat (y compris les images) dans un fichier JSON et restaurez-le à tout moment.
- **100% Responsive** : Soigneusement optimisé pour les mobiles avec support des safe-areas, cibles tactiles adaptées et menu latéral coulissant.

## 🛠️ Technologies Utilisées

- **HTML5 & CSS3** : Structure sémantique, Variables CSS, Flexbox, CSS Grid et animations fluides.
- **JavaScript (Vanilla)** : Sans framework. Manipulation directe du DOM et gestion de l'état.
- **IndexedDB** : Utilisé pour stocker les images lourdes en base64 localement sans atteindre le quota de `localStorage`.
- **Bibliothèques (via CDN)** :
  - `marked.js` (Parsing Markdown)
  - `DOMPurify` (Protection XSS / Nettoyage HTML)
  - `highlight.js` (Coloration syntaxique du code)

## 📁 Structure du Projet

```
monia/
├── index.html   # Structure de la page (HTML)
├── style.css    # Tous les styles (CSS)
├── core.js      # Config, fournisseurs, limites de tokens, IndexedDB, mode image et galerie
├── chat.js      # Conversations, messages, appels API, streaming, gestion des erreurs
└── app.js       # Événements, paramètres, traductions (i18n), démarrage
```

> ⚠️ Gardez les trois fichiers JavaScript dans le même dossier et chargez-les dans cet ordre : `core.js` → `chat.js` → `app.js` (déjà fait dans `index.html`).

## 🚀 Installation & Utilisation

Ce projet est 100% statique : aucune étape de build, pas de npm, pas de backend.

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/Bstudio136/MONIA.git
   ```
2. Ouvrez `index.html` directement dans votre navigateur (gardez tous les fichiers dans le même dossier).
3. Allez dans **Paramètres (⚙️)** -> **Clés API**.
4. Entrez vos clés API pour les fournisseurs que vous souhaitez utiliser (ex: Groq ou Mistral).
5. Commencez à discuter !

## 🎨 Personnalisation & Configuration

- **Fournisseurs Personnalisés** : Vous pouvez ajouter n'importe quelle API imitant le format OpenAI (Endpoint + Modèles + Clé API) directement dans les paramètres.
- **Prompt Système** : Définissez la personnalité de l'IA (invisible par défaut).
- **Sécurité des Clés API** : Vos clés sont stockées localement dans le `localStorage`. Elles ne sont envoyées qu'aux points de terminaison des fournisseurs d'IA respectifs. **Ne partagez jamais les données de votre navigateur ou des fichiers d'export avec quelqu'un d'autre s'ils contiennent vos clés API.**

## 👨‍💻 Auteur

**Bstudio136**

- 🐙 GitHub : [@Bstudio136](https://github.com/Bstudio136)
- 🎵 TikTok : [@bstudio136](https://tiktok.com/@bstudio136)
- 🐦 Twitter / X : [@Bstudio136](https://x.com/Bstudio136)
- 📺 YouTube : [@Bstudio136](https://www.youtube.com/@Bstudio136)

## 📄 Licence

Ce projet est sous licence MIT. Vous êtes libre de l'utiliser et de le modifier pour vos propres besoins.

<a href="https://hiddenswap.com/pay/AgRPwfFe" target="_blank" rel="noopener"><img src="https://hiddenswap.com/pay/AgRPwfFe/button.svg" alt="Donate with any coin" width="247" height="44"></a>

---

<div id="italiano"></div>
🇮🇹<br>

# 🧠 DeepChat | Chat IA Multi-Provider

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Privacy](https://img.shields.io/badge/Privacy_100%25_Locale-22c55e?style=for-the-badge&logo=shield)

Un'interfaccia di chat IA potente, 100% lato client, compatibile con più provider. Collegati a Groq, Mistral, Gemini, Hugging Face, Agnes o a qualsiasi API personalizzata compatibile con OpenAI da un'unica, bellissima interfaccia. Nessun backend, nessuna raccolta di dati — le tue chiavi API e le tue conversazioni non lasciano mai il tuo browser.

## 🔗 Demo dal vivo
👉 **[Prova DeepChat qui](https://bstudio136.github.io/monia/)**

## ✨ Funzionalità

- **Supporto Multi-Provider**: Supporto nativo per Agnes, Groq, Mistral, Gemini, Hugging Face e per endpoint personalizzati compatibili con OpenAI.
- **Privacy 100% Locale**: Tutte le conversazioni, le immagini e le chiavi API sono archiviate in modo sicuro nel tuo browser (`localStorage` e `IndexedDB`). Nessun server coinvolto.
- **Streaming e Ragionamento**: Risposte in tempo reale (SSE) con supporto per i blocchi di "Pensiero/Reasoning" (es. DeepSeek, Gemini).
- **Generazione di Immagini IA**: Genera immagini direttamente nella chat tramite l'API immagini di Agnes, con galleria e lightbox integrate.
- **Allegati Ricchi**: Trascina immagini, testi o file di codice nella chat. I file di testo vengono letti nel contesto; le immagini vengono inviate ai modelli con supporto alla visione.
- **Audio e Video con Gemini**: Quando selezioni Gemini, puoi allegare anche file audio e video (fino a 15 MB) e farli analizzare.
- **Markdown Avanzato ed Evidenziazione della Sintassi**: Blocchi di codice curati con `highlight.js`, pulsanti di copia e a capo automatico.
- **Monitoraggio di Token e Contesto**: Stima in tempo reale dell'utilizzo dei token con limiti di contesto visivi per evitare errori API.
- **Interfaccia Multilingue**: Disponibile in francese, inglese, italiano e turco.
- **Interfaccia Completamente Personalizzabile**: Modalità Scura/Chiara, colori d'accento personalizzati, dimensione del testo regolabile, larghezza dei messaggi e modalità compatta.
- **Esporta e Importa**: Salva l'intera cronologia delle chat (immagini incluse) in un file JSON e ripristinala quando vuoi.
- **Ottimizzato per Mobile**: Curato nei dettagli per i dispositivi mobili, con supporto per le safe-area, elementi touch-friendly e barra laterale scorrevole.

## 🛠️ Tecnologie Utilizzate

- **HTML5 e CSS3**: Struttura semantica, variabili CSS, Flexbox, CSS Grid e animazioni fluide.
- **JavaScript (Vanilla)**: Nessun framework. Manipolazione diretta del DOM e gestione dello stato.
- **IndexedDB**: Usato per archiviare in locale le immagini pesanti in base64 senza raggiungere il limite di `localStorage`.
- **Librerie (via CDN)**:
  - `marked.js` (parsing Markdown)
  - `DOMPurify` (protezione XSS / sanificazione HTML)
  - `highlight.js` (evidenziazione della sintassi del codice)

## 📁 Struttura del Progetto

```
monia/
├── index.html   # Struttura della pagina (HTML)
├── style.css    # Tutti gli stili (CSS)
├── core.js      # Configurazione, provider, limiti token, IndexedDB, modalità immagine e galleria
├── chat.js      # Conversazioni, messaggi, chiamate API, streaming, gestione errori
└── app.js       # Eventi, impostazioni, traduzioni (i18n), avvio
```

> ⚠️ Tieni i tre file JavaScript nella stessa cartella e caricali in quest'ordine: `core.js` → `chat.js` → `app.js` (già fatto in `index.html`).

## 🚀 Installazione e Utilizzo

Questo progetto è 100% statico: nessuna fase di build, niente npm, nessun backend.

1. Clona il repository:
   ```bash
   git clone https://github.com/Bstudio136/MONIA.git
   ```
2. Apri `index.html` direttamente nel tuo browser (tieni tutti i file nella stessa cartella).
3. Vai in **Impostazioni (⚙️)** -> **Chiavi API**.
4. Inserisci le chiavi API dei provider che vuoi usare (es. Groq o Mistral).
5. Inizia a chattare!

## 🎨 Personalizzazione e Configurazione

- **Provider Personalizzati**: Puoi aggiungere qualsiasi API che imita il formato OpenAI (Endpoint + Modelli + Chiave API) direttamente dalle impostazioni.
- **Prompt di Sistema**: Definisci la personalità dell'IA (nascosto per impostazione predefinita).
- **Sicurezza delle Chiavi API**: Le tue chiavi sono salvate in locale nel `localStorage`. Vengono inviate solo agli endpoint dei rispettivi provider IA. **Non condividere mai i dati del tuo browser o i file di esportazione con nessuno se contengono le tue chiavi API.**

## 👨‍💻 Autore

**Bstudio136**

- 🐙 GitHub : [@Bstudio136](https://github.com/Bstudio136)
- 🎵 TikTok : [@bstudio136](https://tiktok.com/@bstudio136)
- 🐦 Twitter / X : [@Bstudio136](https://x.com/Bstudio136)
- 📺 YouTube : [@Bstudio136](https://www.youtube.com/@Bstudio136)

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT. Sei libero di usarlo e modificarlo per le tue esigenze.

<a href="https://hiddenswap.com/pay/AgRPwfFe" target="_blank" rel="noopener"><img src="https://hiddenswap.com/pay/AgRPwfFe/button.svg" alt="Donate with any coin" width="247" height="44"></a>

---

<div id="turkce"></div>
🇹🇷<br>

# 🧠 DeepChat | Çok Sağlayıcılı Yapay Zeka Sohbeti

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Privacy](https://img.shields.io/badge/%25100_Yerel_Gizlilik-22c55e?style=for-the-badge&logo=shield)

Güçlü, %100 istemci taraflı, çok sağlayıcılı bir yapay zeka sohbet arayüzü. Groq, Mistral, Gemini, Hugging Face, Agnes veya OpenAI uyumlu herhangi bir özel API'ye tek ve şık bir arayüzden bağlanın. Sunucu yok, veri toplama yok — API anahtarlarınız ve konuşmalarınız tarayıcınızdan asla çıkmaz.

## 🔗 Canlı Demo
👉 **[DeepChat'i buradan deneyin](https://bstudio136.github.io/monia/)**

## ✨ Özellikler

- **Çok Sağlayıcı Desteği**: Agnes, Groq, Mistral, Gemini, Hugging Face ve OpenAI uyumlu özel uç noktalar için yerleşik destek.
- **%100 Yerel Gizlilik**: Tüm konuşmalar, görseller ve API anahtarları tarayıcınızda (`localStorage` ve `IndexedDB`) güvenle saklanır. Hiçbir sunucu devrede değildir.
- **Akış ve Akıl Yürütme**: "Düşünme/Reasoning" bloklarını destekleyen gerçek zamanlı akış (SSE) yanıtları (ör. DeepSeek, Gemini).
- **Yapay Zeka ile Görsel Oluşturma**: Agnes görsel API'si ile doğrudan sohbet içinde görsel oluşturun; yerleşik galeri ve lightbox dahildir.
- **Zengin Ekler**: Sohbete görsel, metin veya kod dosyaları sürükleyip bırakın. Metin dosyaları bağlama okunur; görseller görme destekli modellere gönderilir.
- **Gemini ile Ses ve Video**: Gemini seçiliyken ses ve video dosyaları da (15 MB'a kadar) ekleyip analiz ettirebilirsiniz.
- **Gelişmiş Markdown ve Sözdizimi Vurgulama**: `highlight.js` ile şık kod blokları, kopyalama düğmeleri ve satır kaydırma seçeneği.
- **Token ve Bağlam Takibi**: API hatalarını önlemek için görsel bağlam sınırlarıyla birlikte gerçek zamanlı token kullanım tahmini.
- **Çok Dilli Arayüz**: Fransızca, İngilizce, İtalyanca ve Türkçe olarak kullanılabilir.
- **Tamamen Özelleştirilebilir Arayüz**: Koyu/Açık mod, özel vurgu renkleri, ayarlanabilir yazı boyutu, mesaj balonu genişliği ve kompakt mod.
- **Dışa ve İçe Aktarma**: Tüm sohbet geçmişinizi (görseller dahil) JSON dosyası olarak yedekleyin ve istediğiniz zaman geri yükleyin.
- **Mobil Uyumlu**: Güvenli alan (safe-area) desteği, dokunmatik dostu öğeler ve kayan kenar çubuğu ile mobil cihazlar için özenle optimize edilmiştir.

## 🛠️ Kullanılan Teknolojiler

- **HTML5 ve CSS3**: Anlamsal yapı, CSS değişkenleri, Flexbox, CSS Grid ve akıcı animasyonlar.
- **JavaScript (Vanilla)**: Framework yok. Doğrudan DOM yönetimi ve durum yönetimi.
- **IndexedDB**: Ağır base64 görselleri `localStorage` kotasına takılmadan yerel olarak saklamak için kullanılır.
- **Kütüphaneler (CDN ile)**:
  - `marked.js` (Markdown ayrıştırma)
  - `DOMPurify` (XSS koruması / HTML temizleme)
  - `highlight.js` (Kod sözdizimi vurgulama)

## 📁 Proje Yapısı

```
monia/
├── index.html   # Sayfa yapısı (HTML)
├── style.css    # Tüm stiller (CSS)
├── core.js      # Yapılandırma, sağlayıcılar, token sınırları, IndexedDB, görsel modu ve galeri
├── chat.js      # Konuşmalar, mesajlar, API çağrıları, akış, hata yönetimi
└── app.js       # Olaylar, ayarlar, çeviriler (i18n), başlatma
```

> ⚠️ Üç JavaScript dosyasını aynı klasörde tutun ve şu sırayla yükleyin: `core.js` → `chat.js` → `app.js` (`index.html` içinde zaten yapılmıştır).

## 🚀 Kurulum ve Kullanım

Bu proje %100 statiktir: derleme adımı yok, npm yok, sunucu yok.

1. Depoyu klonlayın:
   ```bash
   git clone https://github.com/Bstudio136/MONIA.git
   ```
2. `index.html` dosyasını doğrudan tarayıcınızda açın (tüm dosyaları aynı klasörde tutun).
3. **Ayarlar (⚙️)** -> **API Anahtarları** bölümüne gidin.
4. Kullanmak istediğiniz sağlayıcıların API anahtarlarını girin (ör. Groq veya Mistral).
5. Sohbete başlayın!

## 🎨 Özelleştirme ve Yapılandırma

- **Özel Sağlayıcılar**: OpenAI biçimini taklit eden herhangi bir API'yi (Uç nokta + Modeller + API Anahtarı) doğrudan ayarlardan ekleyebilirsiniz.
- **Sistem İstemi (System Prompt)**: Yapay zekanın kişiliğini tanımlayın (varsayılan olarak gizlidir).
- **API Anahtarı Güvenliği**: Anahtarlarınız yerel olarak `localStorage` içinde saklanır. Yalnızca ilgili yapay zeka sağlayıcısının uç noktasına gönderilir. **API anahtarlarınızı içeriyorlarsa, tarayıcı verilerinizi veya dışa aktarma dosyalarınızı asla kimseyle paylaşmayın.**

## 👨‍💻 Yazar

**Bstudio136**

- 🐙 GitHub : [@Bstudio136](https://github.com/Bstudio136)
- 🎵 TikTok : [@bstudio136](https://tiktok.com/@bstudio136)
- 🐦 Twitter / X : [@Bstudio136](https://x.com/Bstudio136)
- 📺 YouTube : [@Bstudio136](https://www.youtube.com/@Bstudio136)

## 📄 Lisans

Bu proje MIT Lisansı altındadır. İhtiyaçlarınıza göre özgürce kullanabilir ve değiştirebilirsiniz.

<a href="https://hiddenswap.com/pay/AgRPwfFe" target="_blank" rel="noopener"><img src="https://hiddenswap.com/pay/AgRPwfFe/button.svg" alt="Donate with any coin" width="247" height="44"></a>
