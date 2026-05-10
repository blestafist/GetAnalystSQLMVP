# 📊 SQL Assistant MVP

> **AI-powered SQL and database visualization tool** — Transform natural language descriptions into SQL queries and ER diagrams instantly.

A modern, production-ready application for generating database schemas, SQL queries, and entity-relationship diagrams powered by OpenAI. Built with JavaScript and deployed on Netlify with serverless functions.

---

## ✨ Features

- 🤖 **AI-Powered Generation** — Convert natural language to SQL queries and ER diagrams using GPT models
- 🎨 **Beautiful UI** — Modern Material Design interface with dark mode, syntax highlighting, and interactive diagrams
- 🔐 **Secure Authentication** — Secret key-based access control with bcrypt hashing
- 📈 **Multiple AI Models** — Support for GPT-5.4, GPT-5.4 Mini, and GPT-5 with configurable temperature
- 📊 **Mermaid Diagrams** — Automatic ER diagram generation and rendering
- ⚡ **Rate Limiting** — Built-in usage tracking and request throttling (10 req/min)
- 🌐 **Serverless** — Zero-config deployment on Netlify Functions
- 📝 **Syntax Highlighting** — SQL code highlighting with Highlight.js

---

## 📸 Screenshots

| Successful Generation                 | Security Validation (Off-Topic)            | Security Validation (Injection)           |
|:-------------------------------------:|:------------------------------------------:|:-----------------------------------------:|
| ![Success](./screenshots/success.png) | ![Off-Topic](./screenshots/unrelevant.png) | ![Injection](./screenshots/injection.png) |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key

### Installation

1. **Clone and install dependencies:**
   
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   
   ```bash
   cp .env.example .env
   ```

Edit `.env` with your credentials:

```env
OPENAI_API_KEY=sk-your-key-here
SECRET_KEY_HASH=$2b$12$your-bcrypt-hash-here
```

3. **Generate your secret key hash:**
   
   ```bash
   npm run generate:key
   ```

This will output your bcrypt hash to use in the `.env` file.

4. **Start development server:**
   
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:8888`

---

## 📁 Project Structure

```
GetAnalystMVP/
├── index.html                      # Single Page Application (SPA)
│   ├── Tailwind CSS styling
│   ├── Mermaid.js for diagram rendering
│   └── Highlight.js for SQL syntax highlighting
│
├── netlify/
│   ├── functions/
│   │   ├── config.js              # GET /config → System configuration
│   │   ├── auth.js                # POST /auth → Authentication endpoint
│   │   ├── generate.js            # POST /generate → SQL/diagram generation
│   │   ├── usage.js               # GET /usage → Usage statistics (protected)
│   │   │
│   │   └── _lib/                  # Shared utilities
│   │       ├── auth.js            # Secret key validation (bcrypt)
│   │       ├── validator.js       # Input/output validation
│   │       ├── llm.js             # OpenAI API integration
│   │       ├── usage-tracker.js   # Token usage tracking
│   │       ├── rate-limit.js      # Rate limiting logic
│   │       ├── logger.js          # Structured logging
│   │       ├── http.js            # HTTP response helpers
│   │       ├── settings.js        # Environment & config management
│   │       └── errors.js          # Custom error classes
│
├── config.json                     # UI models & rate limit configuration
├── usage.json                      # Local usage tracking
├── netlify.toml                    # Netlify build & function configuration
│
├── scripts/
│   └── generate-key.js            # CLI tool for generating bcrypt hashes
│
├── package.json                    # Dependencies: OpenAI, bcryptjs, dotenv
└── python_legacy/                 # Archive of previous Python implementation
```

---

## 🔌 API Reference

### Authentication

All API calls (except `/config`) require the `X-Secret-Key` header with your secret key.

### Endpoints

#### `GET /.netlify/functions/config`

Returns public configuration including available models and rate limits.

**Response:**

```json
{
  "models": [
    {"id": "gpt-5.4", "display_name": "OpenAI - GPT-5.4", "supports_temperature": true, "default_temperature": 0.5},
    {"id": "gpt-5.4-mini", "display_name": "OpenAI - GPT-5.4 Mini", "supports_temperature": true, "default_temperature": 0.5},
    {"id": "gpt-5", "display_name": "OpenAI - GPT-5", "supports_temperature": false, "default_temperature": 1.0}
  ],
  "validation_model": "gpt-5.4-nano",
  "rate_limit": {"requests_per_minute": 10},
  "accent_color": "#FFB26E"
}
```

#### `POST /.netlify/functions/auth`

Validates the secret key for UI access.

**Headers:**

```
X-Secret-Key: your-secret-key
```

#### `POST /.netlify/functions/generate`

Generates SQL queries and ER diagrams from natural language descriptions.

**Headers:**

```
X-Secret-Key: your-secret-key
Content-Type: application/json
```

**Body:**

```json
{
  "description": "Create a users table with name and email",
  "model": "gpt-5.4",
  "temperature": 0.7
}
```

#### `GET /.netlify/functions/usage`

Returns usage statistics including token consumption and API call history. **Requires authentication.**

**Headers:**

```
X-Secret-Key: your-secret-key
```

**Response:**

```json
{
  "calls": 42,
  "total_tokens": 158340,
  "log": [
    {
      "timestamp": "2026-05-10T09:30:00.000Z",
      "model": "gpt-5.4",
      "prompt_tokens": 312,
      "completion_tokens": 480,
      "total_tokens": 792,
      "temperature": 0.7,
      "validation_reason": "ok"
    }
  ]
}
```

**Note:** In serverless environments (Netlify), usage data is stored in ephemeral `/tmp` storage and may reset between cold starts. For persistent tracking, consider integrating with external analytics services.

---

## ⚙️ Environment Variables

| Variable          | Required | Description                                                 |
| ----------------- | -------- | ----------------------------------------------------------- |
| `OPENAI_API_KEY`  | ✅        | Your OpenAI API key for model access                        |
| `SECRET_KEY_HASH` | ✅        | Bcrypt hash of your secret key (use `npm run generate:key`) |
| `NODE_ENV`        | ❌        | Environment (development/production)                        |

---

## 🌐 Deployment

### Deploy to Netlify

1. **Connect your repository** to Netlify
2. **Build settings:**
   - Build command: `npm install`
   - Publish directory: `.`
   - Functions directory: `netlify/functions`
3. **Add environment variables** in Site settings → Environment variables:
   - `OPENAI_API_KEY`
   - `SECRET_KEY_HASH`
4. **Deploy!**

Your application will be live at your Netlify domain.

---

## 🛠️ Development

### Available Scripts

```bash
# Start local development server
npm run dev

# Verify all functions load correctly
npm check

# Generate a new secret key
npm run generate:key
```

### Tech Stack

| Layer             | Technology                                   |
| ----------------- | -------------------------------------------- |
| **Frontend**      | HTML, Tailwind CSS, Mermaid.js, Highlight.js |
| **Backend**       | Node.js, Netlify Functions                   |
| **AI**            | OpenAI API (GPT-5.4, GPT-5.4 Mini, GPT-5)    |
| **Security**      | bcryptjs (password hashing)                  |
| **Configuration** | dotenv (environment management)              |

---

## 📝 Configuration

Edit `config.json` to customize:

- Available AI models
- Default model parameters (temperature range)
- Rate limiting rules
- UI accent color

---

## 🔒 Security Notes

- All sensitive keys are stored in environment variables (never committed)
- Secret key is hashed using bcrypt before storage
- API validation ensures requests are properly authenticated
- Usage tracking prevents abuse through rate limiting

---

## 📚 Migration Notes

This project is a complete JavaScript/Netlify rewrite of the original Python implementation. The legacy Python code is preserved in `python_legacy/` for reference.

---

## 📄 License

See LICENSE file for details.

---

## 🤝 Contributing

Contributions are welcome! Please ensure all changes pass the verification check:

```bash
npm run check
```

---

Made with ❤️ for database professionals and developers.
