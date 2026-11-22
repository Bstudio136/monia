<div align="center">
  <h3>🌍 Choose your language / Choisissez votre langue / Scegli la lingua / Dilinizi seçin / Elige tu idioma / Wählen Sie Ihre Sprache</h3>
  <a href="#english">🇬🇧 English</a> | <a href="#francais">🇫🇷 Français</a> | <a href="#italiano">🇮🇹 Italiano</a> | <a href="#turkce">🇹🇷 Türkçe</a> | <a href="#espanol">🇪🇸 Español</a> | <a href="#deutsch">🇩🇪 Deutsch</a>
</div>

---

<div id="english"></div>
🇬🇧<br>

# 🧠 DeepChat | Multi-Provider AI

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Privacy](https://img.shields.io/badge/100%25_Local_Privacy-22c55e?style=for-the-badge&logo=shield)

A powerful, 100% client-side, multi-provider AI chat interface delivered as a **single HTML file**. Connect to Puter.js (free models), Hugging Face, or any custom OpenAI-compatible API from a single, beautiful interface. No backend, no data collection — your API keys and conversations never leave your browser.

## 🔗 Live Demo
👉 **[Test DeepChat here](https://bstudio136.github.io/monia/)**

## ✨ Features

- **Multi-Provider Support**: Native support for Puter.js (free access to GPT, Claude, Gemini, Llama, Mistral…), Hugging Face, and any custom OpenAI-compatible endpoint.
- **100% Local Privacy**: All conversations, images, and API keys are stored securely in your browser (`localStorage` and `IndexedDB`). No server involved.
- **Streaming & Reasoning**: Real-time streaming responses (SSE) with support for collapsible "Thinking/Reasoning" blocks (DeepSeek-R1, o1, Gemini…).
- **AI Image Generation (Agnes)**: Generate images directly in the chat via the `/image` command or the dedicated mode, with ratio and size options, plus a built-in gallery and lightbox.
- **Rich Attachments**: Drag-and-drop images, text, or code files into the chat. Text files are read into the context; images are sent to vision-capable models.
- **Advanced Markdown & Syntax Highlighting**: Beautiful code blocks with `highlight.js`, copy buttons, and line-wrap toggle. Supports tables, headings, blockquotes and more.
- **Live HTML/CSS/JS Preview**: Execute generated code blocks in a fullscreen sandbox preview.
- **Token & Context Tracking**: Real-time estimation of token usage with a visual context bar to prevent API errors.
- **Multilingual Interface**: Available in French, English, Italian, Turkish, Spanish and German.
- **Fully Customizable UI**: Dark/Light/System themes, custom accent colors, adjustable font size, bubble width, and a compact mode.
- **Export & Import**: Backup your entire chat history as a JSON file and restore it anytime.
- **Mobile Responsive**: Carefully optimized for mobile devices with safe-area support, touch-friendly targets, and a sliding sidebar.

## 🛠️ Tech Stack

- **HTML5 & CSS3**: Semantic structure, CSS Variables, Flexbox, CSS Grid, and smooth animations.
- **JavaScript (Vanilla)**: No frameworks. Direct DOM manipulation and state management.
- **IndexedDB**: Used to store heavy base64 images locally without hitting the `localStorage` quota limit.
- **Libraries (via CDN)**:
  - `marked.js` (Markdown parsing)
  - `DOMPurify` (XSS protection / HTML sanitization)
  - `highlight.js` (Code syntax highlighting)
  - `Puter.js` (Free access to multiple AI models)

## 📁 Project Structure

```
monia/
└── MONIA.html   # The entire application (HTML + CSS + JS in one file)
```

> ⚠️ `MONIA.html` is a **standalone single-file app**. No build step, no separate assets — just open it in a browser and it works.

## 🚀 Installation & Usage

This project is 100% static: no build step, no npm, no backend.

1. Clone the repository:
   ```bash
   git clone https://github.com/Bstudio136/MONIA.git
   ```
2. Open `MONIA.html` directly in your browser.
3. Go to **Settings (⚙️)** -> **API Keys**.
4. Enter your API keys for the providers you want to use, or use **Puter** for free models with no key.
5. Start chatting!

## 🎨 Customization & Configuration

- **Custom Providers**: You can add any API that mimics the OpenAI format (Endpoint + Models + API Key) directly in the settings.
- **System Prompt**: Define the AI's personality with ready-made presets (Concise, Developer, Teacher, Creative).
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

Une interface de chat IA puissante, 100% côté client, compatible avec de multiples fournisseurs, livrée en **un seul fichier HTML**. Connectez-vous à Puter.js (modèles gratuits), Hugging Face ou n'importe quelle API personnalisée compatible OpenAI depuis une interface unique et magnifique. Aucun serveur, aucune collecte de données — vos clés API et conversations ne quittent jamais votre navigateur.

## 🔗 Démo en direct
👉 **[Tester DeepChat ici](https://bstudio136.github.io/monia/)**

## ✨ Fonctionnalités

- **Support Multi-Fournisseurs** : Prise en charge native de Puter.js (accès gratuit à GPT, Claude, Gemini, Llama, Mistral…), Hugging Face et de tout point de terminaison personnalisé compatible OpenAI.
- **Confidentialité 100% Locale** : Toutes les conversations, images et clés API sont stockées de manière sécurisée dans votre navigateur (`localStorage` et `IndexedDB`). Aucun serveur impliqué.
- **Streaming & Raisonnement** : Réponses en temps réel (SSE) avec support des blocs de "Réflexion/Reasoning" pliables (DeepSeek-R1, o1, Gemini…).
- **Génération d'Images IA (Agnes)** : Générez des images directement dans le chat via la commande `/image` ou le mode dédié, avec options de ratio et de taille, et une galerie + lightbox intégrées.
- **Pièces Jointes Riches** : Glissez-déposez des images, textes ou codes dans le chat. Les fichiers textes sont lus dans le contexte ; les images sont envoyées aux modèles compatibles vision.
- **Markdown Avancé & Coloration Syntaxique** : Blocs de code optimisés avec `highlight.js`, boutons de copie et retour à la ligne. Prend en charge les tableaux, titres, citations, etc.
- **Aperçu HTML/CSS/JS en Direct** : Exécutez les blocs de code générés dans un aperçu plein écran sécurisé (sandbox).
- **Suivi des Tokens** : Estimation en temps réel de l'utilisation des tokens avec une barre de contexte visuelle pour éviter les erreurs API.
- **Interface Multilingue** : Disponible en français, anglais, italien, turc, espagnol et allemand.
- **Interface Entièrement Personnalisable** : Thèmes Sombre/Clair/Système, couleurs d'accentuation personnalisées, taille du texte, largeur des bulles et mode compact.
- **Export & Import** : Sauvegardez tout votre historique de chat dans un fichier JSON et restaurez-le à tout moment.
- **100% Responsive** : Soigneusement optimisé pour les mobiles avec support des safe-areas, cibles tactiles adaptées et menu latéral coulissant.

## 🛠️ Technologies Utilisées

- **HTML5 & CSS3** : Structure sémantique, Variables CSS, Flexbox, CSS Grid et animations fluides.
- **JavaScript (Vanilla)** : Sans framework. Manipulation directe du DOM et gestion de l'état.
- **IndexedDB** : Utilisé pour stocker les images lourdes en base64 localement sans atteindre le quota de `localStorage`.
- **Bibliothèques (via CDN)** :
  - `marked.js` (Parsing Markdown)
  - `DOMPurify` (Protection XSS / Nettoyage HTML)
  - `highlight.js` (Coloration syntaxique du code)
  - `Puter.js` (Accès gratuit à plusieurs modèles IA)

## 📁 Structure du Projet

```
monia/
└── MONIA.html   # L'application complète (HTML + CSS + JS dans un seul fichier)
```

> ⚠️ `MONIA.html` est une **application autonome en un seul fichier**. Aucune étape de build, aucun asset séparé — ouvrez-la dans un navigateur et ça fonctionne.

## 🚀 Installation & Utilisation

Ce projet est 100% statique : aucune étape de build, pas de npm, pas de backend.

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/Bstudio136/MONIA.git
   ```
2. Ouvrez `MONIA.html` directement dans votre navigateur.
3. Allez dans **Paramètres (⚙️)** -> **Clés API**.
4. Entrez vos clés API pour les fournisseurs souhaités, ou utilisez **Puter** pour les modèles gratuits sans clé.
5. Commencez à discuter !

## 🎨 Personnalisation & Configuration

- **Fournisseurs Personnalisés** : Vous pouvez ajouter n'importe quelle API imitant le format OpenAI (Endpoint + Modèles + Clé API) directement dans les paramètres.
- **Prompt Système** : Définissez la personnalité de l'IA via des presets prêts à l'emploi (Concise, Développeur, Pédagogue, Créatif).
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

Un'interfaccia di chat IA potente, 100% lato client, compatibile con più provider, distribuita come **un singolo file HTML**. Collegati a Puter.js (modelli gratuiti), Hugging Face o a qualsiasi API personalizzata compatibile con OpenAI da un'unica, bellissima interfaccia. Nessun backend, nessuna raccolta di dati — le tue chiavi API e le tue conversazioni non lasciano mai il tuo browser.

## 🔗 Demo dal vivo
👉 **[Prova DeepChat qui](https://bstudio136.github.io/monia/)**

## ✨ Funzionalità

- **Supporto Multi-Provider**: Supporto nativo per Puter.js (accesso gratuito a GPT, Claude, Gemini, Llama, Mistral…), Hugging Face e per qualsiasi endpoint personalizzato compatibile con OpenAI.
- **Privacy 100% Locale**: Tutte le conversazioni, le immagini e le chiavi API sono archiviate in modo sicuro nel tuo browser (`localStorage` e `IndexedDB`). Nessun server coinvolto.
- **Streaming e Ragionamento**: Risposte in tempo reale (SSE) con supporto per blocchi di "Pensiero/Reasoning" comprimibili (DeepSeek-R1, o1, Gemini…).
- **Generazione di Immagini IA (Agnes)**: Genera immagini direttamente nella chat tramite il comando `/image` o la modalità dedicata, con opzioni di ratio e dimensione, oltre a una galleria e lightbox integrate.
- **Allegati Ricchi**: Trascina immagini, testi o file di codice nella chat. I file di testo vengono letti nel contesto; le immagini vengono inviate ai modelli con supporto alla visione.
- **Markdown Avanzato ed Evidenziazione della Sintassi**: Blocchi di codice curati con `highlight.js`, pulsanti di copia e a capo automatico. Supporta tabelle, titoli, citazioni e altro.
- **Anteprima HTML/CSS/JS in Diretta**: Esegui i blocchi di codice generati in un'anteprima a schermo intero in sandbox.
- **Monitoraggio di Token e Contesto**: Stima in tempo reale dell'utilizzo dei token con una barra di contesto visiva per evitare errori API.
- **Interfaccia Multilingue**: Disponibile in francese, inglese, italiano, turco, spagnolo e tedesco.
- **Interfaccia Completamente Personalizzabile**: Modalità Scura/Chiara/Sistema, colori d'accento personalizzati, dimensione del testo regolabile, larghezza dei messaggi e modalità compatta.
- **Esporta e Importa**: Salva l'intera cronologia delle chat in un file JSON e ripristinala quando vuoi.
- **Ottimizzato per Mobile**: Curato nei dettagli per i dispositivi mobili, con supporto per le safe-area, elementi touch-friendly e barra laterale scorrevole.

## 🛠️ Tecnologie Utilizzate

- **HTML5 e CSS3**: Struttura semantica, variabili CSS, Flexbox, CSS Grid e animazioni fluide.
- **JavaScript (Vanilla)**: Nessun framework. Manipolazione diretta del DOM e gestione dello stato.
- **IndexedDB**: Usato per archiviare in locale le immagini pesanti in base64 senza raggiungere il limite di `localStorage`.
- **Librerie (via CDN)**:
  - `marked.js` (parsing Markdown)
  - `DOMPurify` (protezione XSS / sanificazione HTML)
  - `highlight.js` (evidenziazione della sintassi del codice)
  - `Puter.js` (accesso gratuito a diversi modelli IA)

## 📁 Struttura del Progetto

```
monia/
└── MONIA.html   # L'intera applicazione (HTML + CSS + JS in un unico file)
```

> ⚠️ `MONIA.html` è un'**applicazione autonoma in un unico file**. Nessuna fase di build, nessun asset separato — aprilo nel browser e funziona.

## 🚀 Installazione e Utilizzo

Questo progetto è 100% statico: nessuna fase di build, niente npm, nessun backend.

1. Clona il repository:
   ```bash
   git clone https://github.com/Bstudio136/MONIA.git
   ```
2. Apri `MONIA.html` direttamente nel tuo browser.
3. Vai in **Impostazioni (⚙️)** -> **Chiavi API**.
4. Inserisci le chiavi API dei provider che vuoi usare, oppure utilizza **Puter** per i modelli gratuiti senza chiave.
5. Inizia a chattare!

## 🎨 Personalizzazione e Configurazione

- **Provider Personalizzati**: Puoi aggiungere qualsiasi API che imita il formato OpenAI (Endpoint + Modelli + Chiave API) direttamente dalle impostazioni.
- **Prompt di Sistema**: Definisci la personalità dell'IA tramite preset pronti all'uso (Conciso, Sviluppatore, Insegnante, Creativo).
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

Güçlü, %100 istemci taraflı, çok sağlayıcılı bir yapay zeka sohbet arayüzü — **tek bir HTML dosyası** olarak sunulur. Puter.js (ücretsiz modeller), Hugging Face veya OpenAI uyumlu herhangi bir özel API'ye tek ve şık bir arayüzden bağlanın. Sunucu yok, veri toplama yok — API anahtarlarınız ve konuşmalarınız tarayıcınızdan asla çıkmaz.

## 🔗 Canlı Demo
👉 **[DeepChat'i buradan deneyin](https://bstudio136.github.io/monia/)**

## ✨ Özellikler

- **Çok Sağlayıcı Desteği**: Puter.js (GPT, Claude, Gemini, Llama, Mistral… ücretsiz erişim), Hugging Face ve OpenAI uyumlu herhangi bir özel uç nokta için yerleşik destek.
- **%100 Yerel Gizlilik**: Tüm konuşmalar, görseller ve API anahtarları tarayıcınızda (`localStorage` ve `IndexedDB`) güvenle saklanır. Hiçbir sunucu devrede değildir.
- **Akış ve Akıl Yürütme**: Katlanabilir "Düşünme/Reasoning" bloklarını destekleyen gerçek zamanlı akış (SSE) yanıtları (DeepSeek-R1, o1, Gemini…).
- **Yapay Zeka ile Görsel Oluşturma (Agnes)**: `/image` komutu veya özel mod ile doğrudan sohbet içinde görsel oluşturun; oran ve boyut seçenekleri ile yerleşik galeri ve lightbox dahildir.
- **Zengin Ekler**: Sohbete görsel, metin veya kod dosyaları sürükleyip bırakın. Metin dosyaları bağlama okunur; görseller görme destekli modellere gönderilir.
- **Gelişmiş Markdown ve Sözdizimi Vurgulama**: `highlight.js` ile şık kod blokları, kopyalama düğmeleri ve satır kaydırma seçeneği. Tablolar, başlıklar, alıntılar ve daha fazlası desteklenir.
- **Canlı HTML/CSS/JS Önizleme**: Oluşturulan kod bloklarını tam ekran sandbox önizlemede çalıştırın.
- **Token ve Bağlam Takibi**: API hatalarını önlemek için görsel bağlam çubuğuyla gerçek zamanlı token kullanım tahmini.
- **Çok Dilli Arayüz**: Fransızca, İngilizce, İtalyanca, Türkçe, İspanyolca ve Almanca olarak kullanılabilir.
- **Tamamen Özelleştirilebilir Arayüz**: Koyu/Açık/Sistem teması, özel vurgu renkleri, ayarlanabilir yazı boyutu, mesaj balonu genişliği ve kompakt mod.
- **Dışa ve İçe Aktarma**: Tüm sohbet geçmişinizi JSON dosyası olarak yedekleyin ve istediğiniz zaman geri yükleyin.
- **Mobil Uyumlu**: Güvenli alan (safe-area) desteği, dokunmatik dostu öğeler ve kayan kenar çubuğu ile mobil cihazlar için özenle optimize edilmiştir.

## 🛠️ Kullanılan Teknolojiler

- **HTML5 ve CSS3**: Anlamsal yapı, CSS değişkenleri, Flexbox, CSS Grid ve akıcı animasyonlar.
- **JavaScript (Vanilla)**: Framework yok. Doğrudan DOM yönetimi ve durum yönetimi.
- **IndexedDB**: Ağır base64 görselleri `localStorage` kotasına takılmadan yerel olarak saklamak için kullanılır.
- **Kütüphaneler (CDN ile)**:
  - `marked.js` (Markdown ayrıştırma)
  - `DOMPurify` (XSS koruması / HTML temizleme)
  - `highlight.js` (Kod sözdizimi vurgulama)
  - `Puter.js` (Birden fazla yapay zeka modeline ücretsiz erişim)

## 📁 Proje Yapısı

```
monia/
└── MONIA.html   # Uygulamanın tamamı (HTML + CSS + JS tek bir dosyada)
```

> ⚠️ `MONIA.html` **tek dosyalık bağımsız bir uygulamadır**. Derleme adımı yok, ayrı varlık yok — tarayıcıda açın, çalışır.

## 🚀 Kurulum ve Kullanım

Bu proje %100 statiktir: derleme adımı yok, npm yok, sunucu yok.

1. Depoyu klonlayın:
   ```bash
   git clone https://github.com/Bstudio136/MONIA.git
   ```
2. `MONIA.html` dosyasını doğrudan tarayıcınızda açın.
3. **Ayarlar (⚙️)** -> **API Anahtarları** bölümüne gidin.
4. Kullanmak istediğiniz sağlayıcıların API anahtarlarını girin veya ücretsiz modeller için anahtarsız **Puter** kullanın.
5. Sohbete başlayın!

## 🎨 Özelleştirme ve Yapılandırma

- **Özel Sağlayıcılar**: OpenAI biçimini taklit eden herhangi bir API'yi (Uç nokta + Modeller + API Anahtarı) doğrudan ayarlardan ekleyebilirsiniz.
- **Sistem İstemi (System Prompt)**: Hazır şablonlarla (Kısa, Geliştirici, Öğretmen, Yaratıcı) yapay zekanın kişiliğini tanımlayın.
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

---

<div id="espanol"></div>
🇪🇸<br>

# 🧠 DeepChat | Chat IA Multi-Proveedor

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Privacy](https://img.shields.io/badge/Privacidad_100%25_Local-22c55e?style=for-the-badge&logo=shield)

Una potente interfaz de chat con IA, 100% del lado del cliente y compatible con múltiples proveedores, entregada como **un único archivo HTML**. Conéctate a Puter.js (modelos gratuitos), Hugging Face o cualquier API personalizada compatible con OpenAI desde una única y hermosa interfaz. Sin backend, sin recopilación de datos: tus claves API y conversaciones nunca abandonan tu navegador.

## 🔗 Demo en vivo
👉 **[Probar DeepChat aquí](https://bstudio136.github.io/monia/)**

## ✨ Características

- **Soporte Multi-Proveedor**: Compatibilidad nativa con Puter.js (acceso gratuito a GPT, Claude, Gemini, Llama, Mistral…), Hugging Face y cualquier endpoint personalizado compatible con OpenAI.
- **Privacidad 100% Local**: Todas las conversaciones, imágenes y claves API se almacenan de forma segura en tu navegador (`localStorage` e `IndexedDB`). Ningún servidor involucrado.
- **Streaming y Razonamiento**: Respuestas en tiempo real (SSE) con soporte para bloques plegables de "Pensamiento/Reasoning" (DeepSeek-R1, o1, Gemini…).
- **Generación de Imágenes con IA (Agnes)**: Genera imágenes directamente en el chat mediante el comando `/image` o el modo dedicado, con opciones de proporción y tamaño, además de una galería y lightbox integrados.
- **Adjuntos Enriquecidos**: Arrastra y suelta imágenes, textos o archivos de código en el chat. Los archivos de texto se leen en el contexto; las imágenes se envían a los modelos con capacidad de visión.
- **Markdown Avanzado y Resaltado de Sintaxis**: Bloques de código elegantes con `highlight.js`, botones de copia y ajuste de línea. Admite tablas, encabezados, citas y más.
- **Vista Previa HTML/CSS/JS en Vivo**: Ejecuta los bloques de código generados en una vista previa a pantalla completa en sandbox.
- **Seguimiento de Tokens y Contexto**: Estimación en tiempo real del uso de tokens con una barra de contexto visual para evitar errores de API.
- **Interfaz Multilingüe**: Disponible en francés, inglés, italiano, turco, español y alemán.
- **Interfaz Totalmente Personalizable**: Temas Oscuro/Claro/Sistema, colores de acento personalizados, tamaño de fuente ajustable, ancho de burbujas y modo compacto.
- **Exportar e Importar**: Haz una copia de seguridad de todo tu historial de chat en un archivo JSON y restáuralo en cualquier momento.
- **100% Responsive**: Cuidadosamente optimizado para dispositivos móviles con soporte de safe-area, objetivos táctiles amigables y barra lateral deslizante.

## 🛠️ Tecnologías Utilizadas

- **HTML5 y CSS3**: Estructura semántica, Variables CSS, Flexbox, CSS Grid y animaciones fluidas.
- **JavaScript (Vanilla)**: Sin frameworks. Manipulación directa del DOM y gestión del estado.
- **IndexedDB**: Utilizado para almacenar localmente imágenes pesadas en base64 sin alcanzar el límite de `localStorage`.
- **Bibliotecas (vía CDN)**:
  - `marked.js` (Análisis de Markdown)
  - `DOMPurify` (Protección XSS / Saneamiento de HTML)
  - `highlight.js` (Resaltado de sintaxis del código)
  - `Puter.js` (Acceso gratuito a varios modelos de IA)

## 📁 Estructura del Proyecto

```
monia/
└── MONIA.html   # La aplicación completa (HTML + CSS + JS en un solo archivo)
```

> ⚠️ `MONIA.html` es una **aplicación autónoma en un solo archivo**. Sin paso de compilación, sin assets separados: ábrela en un navegador y funciona.

## 🚀 Instalación y Uso

Este proyecto es 100% estático: sin paso de compilación, sin npm, sin backend.

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Bstudio136/MONIA.git
   ```
2. Abre `MONIA.html` directamente en tu navegador.
3. Ve a **Ajustes (⚙️)** -> **Claves API**.
4. Introduce tus claves API para los proveedores que desees usar, o utiliza **Puter** para modelos gratuitos sin clave.
5. ¡Empieza a chatear!

## 🎨 Personalización y Configuración

- **Proveedores Personalizados**: Puedes añadir cualquier API que imite el formato de OpenAI (Endpoint + Modelos + Clave API) directamente en los ajustes.
- **Prompt del Sistema**: Define la personalidad de la IA con presets listos para usar (Conciso, Desarrollador, Profesor, Creativo).
- **Seguridad de las Claves API**: Tus claves se almacenan localmente en `localStorage`. Solo se envían al endpoint del proveedor de IA correspondiente. **Nunca compartas los datos de tu navegador ni los archivos de exportación con nadie si contienen tus claves API.**

## 👨‍💻 Autor

**Bstudio136**

- 🐙 GitHub : [@Bstudio136](https://github.com/Bstudio136)
- 🎵 TikTok : [@bstudio136](https://tiktok.com/@bstudio136)
- 🐦 Twitter / X : [@Bstudio136](https://x.com/Bstudio136)
- 📺 YouTube : [@Bstudio136](https://www.youtube.com/@Bstudio136)

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Eres libre de usarlo y modificarlo para tus propias necesidades.

<a href="https://hiddenswap.com/pay/AgRPwfFe" target="_blank" rel="noopener"><img src="https://hiddenswap.com/pay/AgRPwfFe/button.svg" alt="Donate with any coin" width="247" height="44"></a>

---

<div id="deutsch"></div>
🇩🇪<br>

# 🧠 DeepChat | Multi-Provider-KI-Chat

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Privacy](https://img.shields.io/badge/100%25_Lokaler_Datenschutz-22c55e?style=for-the-badge&logo=shield)

Eine leistungsstarke, zu 100 % clientseitige Multi-Provider-KI-Chat-Oberfläche, geliefert als **einzelne HTML-Datei**. Verbinde dich mit Puter.js (kostenlose Modelle), Hugging Face oder einer beliebigen benutzerdefinierten, OpenAI-kompatiblen API über eine einzige, wunderschöne Oberfläche. Kein Backend, keine Datenerfassung — deine API-Schlüssel und Unterhaltungen verlassen niemals deinen Browser.

## 🔗 Live-Demo
👉 **[DeepChat hier testen](https://bstudio136.github.io/monia/)**

## ✨ Funktionen

- **Multi-Provider-Unterstützung**: Native Unterstützung für Puter.js (kostenloser Zugang zu GPT, Claude, Gemini, Llama, Mistral…), Hugging Face und jeden benutzerdefinierten, OpenAI-kompatiblen Endpunkt.
- **100 % Lokaler Datenschutz**: Alle Unterhaltungen, Bilder und API-Schlüssel werden sicher in deinem Browser gespeichert (`localStorage` und `IndexedDB`). Kein Server beteiligt.
- **Streaming & Reasoning**: Echtzeit-Streaming-Antworten (SSE) mit Unterstützung für einklappbare „Thinking/Reasoning"-Blöcke (DeepSeek-R1, o1, Gemini…).
- **KI-Bildgenerierung (Agnes)**: Erzeuge Bilder direkt im Chat über den Befehl `/image` oder den dedizierten Modus, mit Seitenverhältnis- und Größenoptionen sowie einer integrierten Galerie und Lightbox.
- **Umfangreiche Anhänge**: Ziehe Bilder, Texte oder Code-Dateien per Drag & Drop in den Chat. Textdateien werden in den Kontext eingelesen; Bilder werden an vision-fähige Modelle gesendet.
- **Erweitertes Markdown & Syntaxhervorhebung**: Wunderschöne Code-Blöcke mit `highlight.js`, Kopierbuttons und Zeilenumbruch-Umschalter. Unterstützt Tabellen, Überschriften, Blockzitate und mehr.
- **Live-HTML/CSS/JS-Vorschau**: Führe generierte Code-Blöcke in einer Vollbild-Sandbox-Vorschau aus.
- **Token- & Kontext-Tracking**: Echtzeit-Schätzung des Token-Verbrauchs mit einer visuellen Kontextleiste, um API-Fehler zu vermeiden.
- **Mehrsprachige Oberfläche**: Verfügbar in Französisch, Englisch, Italienisch, Türkisch, Spanisch und Deutsch.
- **Vollständig anpassbare UI**: Dunkel/Hell/System-Themen, benutzerdefinierte Akzentfarben, anpassbare Schriftgröße, Blasenbreite und Kompaktmodus.
- **Export & Import**: Sichere deinen gesamten Chat-Verlauf als JSON-Datei und stelle ihn jederzeit wieder her.
- **Mobil-Responsiv**: Sorgfältig für Mobilgeräte optimiert mit Safe-Area-Unterstützung, touch-freundlichen Zielen und einer ausfahrbaren Seitenleiste.

## 🛠️ Verwendeter Tech-Stack

- **HTML5 & CSS3**: Semantische Struktur, CSS-Variablen, Flexbox, CSS Grid und flüssige Animationen.
- **JavaScript (Vanilla)**: Keine Frameworks. Direkte DOM-Manipulation und State-Management.
- **IndexedDB**: Wird verwendet, um schwere Base64-Bilder lokal zu speichern, ohne das `localStorage`-Kontingent zu überschreiten.
- **Bibliotheken (via CDN)**:
  - `marked.js` (Markdown-Parsing)
  - `DOMPurify` (XSS-Schutz / HTML-Bereinigung)
  - `highlight.js` (Code-Syntaxhervorhebung)
  - `Puter.js` (Kostenloser Zugang zu mehreren KI-Modellen)

## 📁 Projektstruktur

```
monia/
└── MONIA.html   # Die gesamte Anwendung (HTML + CSS + JS in einer Datei)
```

> ⚠️ `MONIA.html` ist eine **eigenständige Single-File-App**. Kein Build-Schritt, keine separaten Assets — einfach im Browser öffnen und es funktioniert.

## 🚀 Installation & Nutzung

Dieses Projekt ist zu 100 % statisch: kein Build-Schritt, kein npm, kein Backend.

1. Repository klonen:
   ```bash
   git clone https://github.com/Bstudio136/MONIA.git
   ```
2. Öffne `MONIA.html` direkt in deinem Browser.
3. Gehe zu **Einstellungen (⚙️)** -> **API-Schlüssel**.
4. Gib deine API-Schlüssel für die gewünschten Anbieter ein oder nutze **Puter** für kostenlose Modelle ohne Schlüssel.
5. Fang an zu chatten!

## 🎨 Anpassung & Konfiguration

- **Benutzerdefinierte Anbieter**: Du kannst jede API hinzufügen, die das OpenAI-Format nachahmt (Endpunkt + Modelle + API-Schlüssel), direkt in den Einstellungen.
- **System-Prompt**: Definiere die Persönlichkeit der KI mit vorgefertigten Presets (Prägnant, Entwickler, Lehrer, Kreativ).
- **API-Schlüssel-Sicherheit**: Deine Schlüssel werden lokal im `localStorage` gespeichert. Sie werden nur an den Endpunkt des jeweiligen KI-Anbieters gesendet. **Teile niemals deine Browserdaten oder Exportdateien mit jemandem, wenn sie deine API-Schlüssel enthalten.**

## 👨‍💻 Autor

**Bstudio136**

- 🐙 GitHub : [@Bstudio136](https://github.com/Bstudio136)
- 🎵 TikTok : [@bstudio136](https://tiktok.com/@bstudio136)
- 🐦 Twitter / X : [@Bstudio136](https://x.com/Bstudio136)
- 📺 YouTube : [@Bstudio136](https://www.youtube.com/@Bstudio136)

## 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Du bist frei, es für deine eigenen Bedürfnisse zu nutzen und zu verändern.

<a href="https://hiddenswap.com/pay/AgRPwfFe" target="_blank" rel="noopener"><img src="https://hiddenswap.com/pay/AgRPwfFe/button.svg" alt="Donate with any coin" width="247" height="44"></a>
