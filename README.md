# NewsTracker ⚡

> An executive-grade corporate news aggregation, deduplication, and AI synthesis platform architected for **Cloudflare Free Plan** and **Firebase Free Plan** (Spark Tier).

---

## 🌟 Key Features

1. **Universal Data API Aggregator & Advanced Scraper Engine**:
   - Ingests from Google News RSS (zero API key required, unlimited queries), Finnhub financial wire, or any user-defined REST API.
   - **Advanced Multi-Strategy Scraper**:
     - *Strategy A (Smart Direct Fetch)*: Browser-grade headers, user-agents, redirect tracing.
     - *Strategy B (JSON-LD Microdata)*: Extracts clean `schema.org/NewsArticle` body text without ad clutter.
     - *Strategy C (Semantic DOM Readability)*: Paragraph density scoring, stripping cookie overlays and paywalls.
     - *Strategy D (Edge Reader Fallback)*: Jina Reader proxy (`r.jina.ai/{url}`) for anti-bot Turnstile bypass.
   - **Multi-Level Deduplication**: Strips tracking parameters, computes SHA-256 fingerprints, and performs Levenshtein & Jaccard fuzzy headline matching.
   - **Strict Non-Overlapping Company Partitioning**: Guarantees that each company's news payload is distinct and never duplicated across buckets.

2. **Model Orchestrator (Multi-Provider & Custom AI APIs)**:
   - Built-in adapters for Google Gemini, OpenAI, Groq, and OpenRouter.
   - **Dynamic In-UI Registration**: Register **any new AI API** (DeepSeek, Mistral, Together AI, local Ollama, vLLM, custom endpoints) on the fly without code changes.
   - **Smart Automatic Failover**: Cascades to backup models on HTTP 429 rate limits, timeouts, or quota exhaustion.
   - **Real-Time Dynamic Usage Meter**: Parses live quota and usage directly from API response headers (`x-ratelimit-remaining-tokens`, `x-ratelimit-remaining-requests`) and account endpoints with **zero hardcoded values**.

3. **Meticulous, Minimalist User Interface**:
   - **Strict Password-Only Sign-In**: UI presents a single password input (no email field, no signup links).
   - **In-UI API Key Manager & Live Ping Tester**: Enter keys for data APIs and AI providers with instant latency and connectivity verification.
   - **Company Tagger**: Intuitive chip input with bulk paste support and watchlist management.
   - **Prompt Studio**: Custom prompt composer with reusable templates (Earnings & Growth, Regulatory & Legal, Leadership & M&A).
   - **Executive PDF Exporter**: Client-side vector PDF report generator (`jspdf`) with section customizer modal.
   - **Report Snapshot History**: Instant zero-token recall of past briefing runs.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Test Suite
```bash
npm run test
```

### 3. Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🔐 Authentication Guide

- **Local Mode (Out of the Box)**:
  - Default master password: `newstracker` (or `admin`, `password`).
- **Firebase Production Mode (Spark Tier Free)**:
  1. Create a project in [Firebase Console](https://console.firebase.google.com/).
  2. Enable **Authentication** with the **Email/Password** provider.
  3. Create your single admin user (e.g. `admin@newstracker.internal`) with your chosen password.
  4. Enable **Cloud Firestore** in production mode.
  5. Add your Firebase keys to `.env.local` or Cloudflare Pages environment variables:
     ```env
     VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     VITE_FIREBASE_ADMIN_EMAIL=admin@newstracker.internal
     ```

---

## 🌐 Cloudflare Pages Deployment (100% Free Tier)

1. Connect this repository to **Cloudflare Pages**.
2. **Build Settings**:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Deploy! All Edge functions in `/functions/api/` will deploy automatically as Cloudflare Pages Functions.

---

## 📄 License
MIT
