# 🌍 Unbiased

**AI-Powered Feasibility Analysis for Development Projects**

Get instant, comprehensive feasibility reports for infrastructure, housing, energy, and development projects. Discuss insights with AI expert panels in real-time, in your language.

---

## ✨ What is Unbiased?

Unbiased helps you evaluate development projects with AI-powered analysis across six critical dimensions:

- 💰 **Economic** - Budget viability, ROI, funding strategies
- 🏗️ **Technical** - Infrastructure feasibility, engineering challenges
- ⚖️ **Legal** - Regulations, permits, compliance requirements
- 🌱 **Environmental** - Sustainability, climate impact, conservation
- 👥 **Social** - Community benefit, equity, accessibility
- ⚙️ **Operational** - Day-to-day logistics, maintenance, staffing

---

## 🎯 Key Features

### 📊 **Live Analytics Dashboard**

Get real-time insights into platform activity on the home page:

- **Platform Metrics**: Total reports, active discussions, weekly activity, avg feasibility score
- **Category Breakdown**: Visual pie chart showing project distribution across categories
- **Score Distribution**: Bar chart displaying feasibility score ranges
- **5-minute edge caching** for fast load times

### 🔥 **Hot Topics & Trending**

Discover what's trending on the platform:

- **Trending Reports**: Latest analyses from the past 7 days with feasibility scores
- **Live Discussions**: Active panel discussions with real-time message counts
- **Pulse Indicators**: Visual animations showing active discussions
- **Quick Navigation**: Jump directly to trending reports and discussions

### 🤖 **AI Expert Panel Discussions**

Discuss your project with 6 specialized AI experts + a moderator:

- **Dr. [Name] - Economist**: Budget analysis, ROI, market dynamics
- **[Name] - Lead Engineer**: Technical feasibility, implementation
- **[Name] - Legal Counsel**: Regulations, compliance, liability
- **Dr. [Name] - Environmental Specialist**: Sustainability, climate impact
- **[Name] - Community Relations**: Social equity, public benefit
- **[Name] - Operations Director**: Logistics, execution, scalability

Each expert has a **unique personality, speaking style, and culturally appropriate name** for your region.

### 🌐 **Multi-Language Support**

Reports and discussions available in **6 languages** with native scripts:
- 🇬🇧 English
- 🇲🇻 Dhivehi (ދިވެހި - Thaana script)
- 🇮🇳 Hindi (हिन्दी - Devanagari)
- 🇧🇩 Bengali (বাংলা)
- 🇱🇰 Sinhala (සිංහල) & Tamil (தமிழ்)

**On-demand translation** - Click any language, AI translates instantly and caches for future users.

### 🗺️ **Multi-Country Coverage**

Currently supporting:
- 🏝️ **Maldives** - Dhivehi experts, MVR currency
- 🇮🇳 **India** - Hindi experts, INR currency
- 🇧🇩 **Bangladesh** - Bengali experts, BDT currency
- 🇱🇰 **Sri Lanka** - Sinhala/Tamil experts, LKR currency

**Want your country?** Request it - AI adds it automatically!

### 🚀 **AI-Assisted Country Addition**

Don't see your country? **Request it and we'll add it:**

1. **Submit Request** - Enter country name, optional email for updates
2. **AI Validates** - Gemini confirms it's a real country and generates:
   - Country configuration (code, currency, flag)
   - Comprehensive regions list
   - Culturally appropriate expert names
   - Translations in 6 languages
3. **Team Notified** - Our team receives the validated data
4. **Manual Implementation** - We add your country to the platform
5. **Goes Live** - You get an email when it's ready!

**No coding required. Get notified when your country is live.** ✨

---

## 💡 How It Works

### Step 0: Explore Platform Analytics
See real-time stats, trending reports, and active discussions on the home page to get inspired.

### Step 1: Select Country & Describe Project
Choose your country and describe your development project in any detail.

### Step 2: Get Instant Feasibility Report
AI analyzes your project across 6 categories with:
- Overall feasibility score (0-100)
- Detailed category breakdowns
- Pros & cons
- Key risks & recommendations
- Budget impact analysis

### Step 3: Discuss with Expert Panel
Start a real-time panel discussion:
- Ask follow-up questions
- Get expert opinions from different angles
- Experts debate and build on each other's insights
- All in natural, conversational language

### Step 4: Translate to Your Language
Switch to any of 6 languages - reports and discussions translate instantly.

---

## 🌟 Why Unbiased?

✅ **Instant Analysis** - Get comprehensive reports in seconds
✅ **Live Analytics** - See real-time platform insights and trending topics
✅ **Multi-Perspective** - 6 expert viewpoints, not just one AI response
✅ **Natural Conversations** - Experts have unique personalities and speaking styles
✅ **Your Language** - Native script support for local languages
✅ **Region-Specific** - Experts have culturally appropriate names
✅ **Transparent** - See all reasoning, pros, cons, and risks
✅ **Community Insights** - Discover what others are analyzing
✅ **Growing Coverage** - Request new countries, AI adds them automatically

---

## 🚀 Getting Started

### For End Users

1. **Visit the Platform** - [https://unbiased.talk](https://unbiased.talk)
2. **Select Your Country** - Choose from the dropdown
3. **Describe Your Project** - Be as detailed as you like
4. **Get Your Report** - Instant feasibility analysis
5. **Start Discussion** - Ask questions, get expert insights
6. **Translate** - Switch languages anytime

### Request a New Country

1. Click **"Request a country"** in the country selector
2. Enter the country name
3. Optionally provide your email for updates
4. Submit - AI validates your request and prepares the data
5. Our team adds your country to the platform
6. Receive email notification when it's live!

---

## 🛠️ Tech Stack & Dependencies

### Languages
- **TypeScript** - Primary language for both frontend and backend
- **SQL** - Database schema and migrations (via Drizzle ORM)
- **HTML/CSS** - Markup and styling (via JSX + Tailwind CSS)

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** + **shadcn/ui** - Styling and component library
- **React Router v7** - Client-side routing
- **Framer Motion** - Animations
- **Recharts** - Data visualization (charts)
- **i18next** - Internationalization (6 languages)
- **Radix UI** - Accessible UI primitives

### Backend
- **Hono** - Lightweight API framework (Cloudflare Workers)
- **Cloudflare Workers** - Serverless edge compute
- **Cloudflare D1** (SQLite) - Database
- **Drizzle ORM** - Type-safe database queries and migrations
- **Cloudflare Durable Objects** - Real-time WebSocket connections
- **Google Gemini API** - AI analysis, translation, and code generation
- **Zod** - Runtime schema validation

### DevOps & Tooling
- **pnpm** - Package manager
- **Wrangler** - Cloudflare CLI for local dev and deployment
- **ESLint** - Code linting
- **GitHub Actions** - CI/CD and automated country addition

---

## 🤖 AI Tools Used

### AI-Powered Coding
- **Claude Code** (Anthropic) - AI coding assistant used throughout development for writing features, debugging, refactoring, and generating documentation

### AI in the Product
- **Google Gemini** (`gemini-2.5-flash`) - Powers all in-app AI features:
  - Feasibility report generation
  - Expert panel discussion responses
  - On-demand translation across 6 languages
  - Country addition validation and code generation

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** ([Install](https://pnpm.io/installation))
- **Cloudflare Account** ([Sign up](https://dash.cloudflare.com/sign-up))
- **Google Gemini API Key** ([Get key](https://aistudio.google.com/app/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/tecticmv/unbiased.git
cd unbiased

# Install dependencies
pnpm install

# Set up environment variables
cp .dev.vars.example .dev.vars
# Edit .dev.vars and add your GEMINI_API_KEY
```

### Running Locally

Run **two terminals** for full local development:

```bash
# Terminal 1: Frontend (Vite dev server with hot reload)
pnpm dev
# → http://localhost:5173

# Terminal 2: Backend (API + WebSocket + Durable Objects)
pnpm dev:worker
# → http://localhost:8787
```

### Database Setup

```bash
# Apply migrations to local D1 database
pnpm db:migrate:local

# (Optional) Open Drizzle Studio to view/edit data
pnpm db:studio
```

### Deploying to Production

```bash
# 1. Set production secrets
wrangler secret put GEMINI_API_KEY

# 2. Create production D1 database
wrangler d1 create unbiased-db
# Copy the database_id to wrangler.toml

# 3. Apply migrations to production
pnpm db:migrate

# 4. Build and deploy
pnpm deploy
```

For detailed developer documentation (architecture, API docs, automated country addition, troubleshooting), see **[DEVELOPMENT.md](DEVELOPMENT.md)**.

---

## 📋 Supported Languages

| Code | Language | Script | Direction |
|------|----------|--------|-----------|
| `en` | English | Latin | LTR |
| `dv` | Dhivehi | Thaana (ދިވެހި) | RTL |
| `hi` | Hindi | Devanagari (हिन्दी) | LTR |
| `bn` | Bengali | Bengali (বাংলা) | LTR |
| `si` | Sinhala | Sinhala (සිංහල) | LTR |
| `ta` | Tamil | Tamil (தமிழ்) | LTR |

---

## 🙏 Acknowledgments

Powered by:
- **Google Gemini** - AI analysis, validation & translation
- **Cloudflare** - Edge computing & real-time infrastructure

---

Made with ❤️ for unbiased project analysis
