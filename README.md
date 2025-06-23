# PaperPulse v2.0 📚✨

Your advanced research platform - AI-powered paper discovery with user authentication and detailed analysis.

## 🚀 What's New in v2.0

PaperPulse v2.0 is a complete overhaul featuring:

### 🔐 **Advanced Authentication System**
- **Email/Password Authentication** with verification
- **Google OAuth Integration** for one-click sign-in
- **User Profiles** with personalized preferences
- **Multiple Keyword Sets** per user
- **Personal Digest History**

### 📊 **Enhanced Browse Experience** 
- **Daily Digest Tabs** (inspired by Papers with Code)
- **7-Day History** with smooth tab transitions
- **Paper Preview Grid** with 3-4 columns on desktop
- **Interactive Paper Cards** with bookmarking
- **Filter & Sort Options** by relevance, date, category

### 📖 **Detailed Paper Analysis**
- **Full Paper Report Pages** (`/paper/[id]`)
- **AI-Generated Analysis** with Claude 4:
  - Executive summary
  - Key contributions breakdown
  - Methodology overview
  - Results and findings
  - Limitations assessment
  - Technical difficulty rating
- **Interactive Features**:
  - Bookmark/save functionality
  - 5-star rating system
  - Share buttons (Twitter, LinkedIn, Email)
  - Export options

### 🎨 **Modern UI/UX**
- **Notion-like Polish** with clean typography
- **Responsive Design** optimized for all devices
- **Dark/Light Mode** support
- **Smooth Animations** and transitions
- **Professional Color Palette** (Purple #6366f1 primary)

## Architecture

```
┌─────────────────┐        ┌──────────────────┐
│   Next.js Web   │  <───> │    Supabase DB   │
│  (React + TS)   │        │  (Auth + Data)   │
└─────────────────┘        └──────────────────┘
         ▲                           ▲
         │                           │
         ▼                           ▼
┌─────────────────┐        ┌──────────────────┐
│ PaperPulse      │  ────> │  Daily Digests   │
│ Agent (Python)  │        │  (JSON files)    │
└─────────────────┘        └──────────────────┘
```

## Architecture

```
┌────────────┐        ┌───────────────┐
│ Next.js UI │  <---> │  Sign-up API  │───▶ Mailchimp / DB
└────────────┘        └───────────────┘
                             ▲
                             │ nightly cron
                             ▼
                    ┌────────────────────┐
                    │ PaperPulse Agent   │
                    │  • fetch arXiv API │
                    │  • filter by kw    │
                    │  • LLM summarise   │
                    │  • send email      │
                    └────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** for the web application
- **Python 3.9+** for the agent
- **Supabase Account** for authentication and database
- **Anthropic API key** for AI summarization

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/paperpulse.git
cd paperpulse

# Install web dependencies
cd web
npm install
```

### 2. Set up Supabase

Follow the detailed [Supabase Setup Guide](SUPABASE_SETUP.md):

1. Create a Supabase project
2. Get your credentials
3. Run the database schema
4. Configure authentication

### 3. Environment Variables

Create `web/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Run the Application

```bash
# Start the web app
cd web
npm run dev
```

Visit http://localhost:3000 and sign up to test the new features!

### 5. Set up the Agent (Optional)

```bash
# Set up Python agent
cd agent
pip install -r requirements.txt
cp .env.sample .env
# Edit .env with your API keys

# Test the agent
python -m paperpulse.main --dry-run
```

## Deployment

### One-Command Deploy
```bash
# Deploy web to Vercel
cd scripts && ./deploy-web.sh

# Deploy agent to GitHub Actions  
./deploy-agent.sh
```

See [SETUP.md](SETUP.md) for detailed setup instructions.

## Configuration

Subscribers are configured with:
```json
{
  "email": "user@example.com",
  "keywords": ["diffusion", "audio", "TTS"],
  "digest_time_utc": "13:00",
  "max_papers": 20,
  "summary_model": "llama-3.1-8b-instant-groq",
  "tone": "concise",
  "include_pdf_link": true
}
```

## License

MIT