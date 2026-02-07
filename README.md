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

### 🚀 **Autonomous Country Addition** (Revolutionary!)

Don't see your country? **Request it and AI builds it for you:**

1. **Submit Request** - Enter country name, optional email
2. **AI Validates** - Gemini confirms it's a real country
3. **AI Generates Code** - Claude writes all necessary files:
   - Country configuration
   - Currency & regions
   - Expert names (culturally appropriate)
   - Translations in 6 languages
4. **Auto-Deploy Preview** - Live preview in minutes
5. **Owner Approves** - One-click merge or request improvements
6. **Goes Live** - You get an email notification!

**No coding required. Fully automated. Goes live in minutes.** 🤯

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
4. Submit - AI validates and generates code automatically
5. Receive email when your country goes live!

---

## 🏗️ Technical Architecture

### Analytics System

The analytics dashboard features a robust, performant architecture:

- **Backend API** (`/api/stats`)
  - Aggregates data from D1 database (reports, discussions, messages)
  - Calculates metrics: total reports, active discussions, weekly activity
  - Computes averages, distributions, and category breakdowns
  - 5-minute Cloudflare edge caching for optimal performance

- **Frontend Components**
  - `AnalyticsDashboard` - Main container with stat cards and charts
  - `StatCard` - Reusable metric display with icons and animations
  - `CategoryBreakdownChart` - Recharts PieChart for project categories
  - `ScoreDistributionChart` - Recharts BarChart with color-coded ranges
  - `TrendingCard` - Compact report cards with flame icons
  - `DiscussionPreviewCard` - Active discussion previews with pulse animations

- **Features**
  - Graceful degradation (hides if API fails)
  - Loading skeletons (no layout shift)
  - Framer Motion animations (stagger effects, scroll reveals)
  - Full RTL support for Dhivehi
  - Responsive design (mobile-first)
  - Dark mode compatible

---

## 🛠️ For Developers

Want to contribute or self-host? See **[DEVELOPMENT.md](DEVELOPMENT.md)** for:
- Installation & setup
- Development commands
- Architecture overview
- API documentation
- Deployment guide

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
- **Google Gemini** - AI analysis & translation
- **Anthropic Claude** - Autonomous code generation
- **Cloudflare** - Edge computing & real-time infrastructure

---

Made with ❤️ for unbiased project analysis
