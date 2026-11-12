<div align="center">
  <h3>🌍 Choose your language / Choisissez votre langue</h3>
  <a href="#english">🇬🇧 English</a> | <a href="#francais">🇫🇷 Français</a>
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
👉 **[Test DeepChat here](https://bstudio136.github.io/MONIA/)**

## ✨ Features

- **Multi-Provider Support**: Native support for Agnes, Groq, Mistral, Gemini, Hugging Face, and custom OpenAI-compatible endpoints.
- **100% Local Privacy**: All conversations, images, and API keys are stored securely in your browser (`localStorage` and `IndexedDB`). No server involved.
- **Streaming & Reasoning**: Real-time streaming responses (SSE) with support for "Thinking/Reasoning" blocks (e.g., DeepSeek, Gemini).
- **AI Image Generation**: Generate images directly in the chat using the Agnes image API, complete with a built-in gallery and lightbox.
- **Rich Attachments**: Drop images, text, or code files into the chat. Text files are read into the context; images are sent to vision-capable models.
- **Advanced Markdown & Syntax Highlighting**: Beautiful code blocks with `highlight.js`, copy buttons, and line-wrap toggles.
- **Token & Context Tracking**: Real-time estimation of token usage with visual context limits to prevent API errors.
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

## 🚀 Installation & Usage

This project is entirely contained within a single static HTML file. No build step, no npm, no backend.

1. Clone the repository:
   ```bash
   git clone https://github.com/Bstudio136/MONIA.git
   ```
2. Open `MONIA.html` (or `index.html`) directly in your browser.
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
👉 **[Tester DeepChat ici](https://bstudio136.github.io/MONIA/)**

## ✨ Fonctionnalités

- **Support Multi-Fournisseurs** : Prise en charge native d'Agnes, Groq, Mistral, Gemini, Hugging Face et des points de terminaison personnalisés compatibles OpenAI.
- **Confidentialité 100% Locale** : Toutes les conversations, images et clés API sont stockées de manière sécurisée dans votre navigateur (`localStorage` et `IndexedDB`). Aucun serveur impliqué.
- **Streaming & Raisonnement** : Réponses en temps réel avec support des blocs de "Réflexion/Reasoning" (ex: DeepSeek, Gemini).
- **Génération d'Images IA** : Générez des images directement dans le chat via l'API Agnes, avec une galerie et une lightbox intégrées.
- **Pièces Jointes Riches** : Glissez-déposez des images, textes ou codes dans le chat. Les fichiers textes sont lus dans le contexte ; les images sont envoyées aux modèles compatibles vision.
- **Markdown Avancé & Coloration Syntaxique** : Blocs de code optimisés avec `highlight.js`, boutons de copie et retour à la ligne.
- **Suivi des Tokens** : Estimation en temps réel de l'utilisation des tokens avec limites visuelles pour éviter les erreurs API.
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

## 🚀 Installation & Utilisation

Ce projet est entièrement contenu dans un seul fichier HTML statique. Aucune étape de build, pas de npm, pas de backend.

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/Bstudio136/MONIA.git
   ```
2. Ouvrez `MONIA.html` (ou `index.html`) directement dans votre navigateur.
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
