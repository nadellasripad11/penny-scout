# Claude Context Map — Sripad Nadella

**Last Updated:** 2026-06-13 | **Location:** `/Users/hnadella/Leads`

---

## 👤 About You

**Name:** Sripad Nadella  
**Role:** CS student (Class of 2029) · Startup founder · Full-stack AI product engineer  
**Email:** nadellasripad11@gmail.com  
**GitHub:** github.com/nadellasripad11  
**Portfolio:** sripadnadella.com  

**Current Focus:**
- Building Socle (AI hospitality intelligence platform) — active startup with paying customers
- Shipping production-quality portfolio projects (SerenityOS, FanZone)
- Targeting internship/co-founder roles for Summer/Fall 2026
- Deep expertise: LLM integration, Next.js, TypeScript, Supabase, Claude API, real-time systems

**Key Values:**
- Prefer shipped, real-user products over prototypes
- Write clean, typed, maintainable code — not quick hacks
- Product thinking is inseparable from engineering
- Scale, security, and UX as first-class concerns from day one

---

## 📁 Active Projects

### 🎯 Socle — AI Hospitality Intelligence Platform (Private)
**Status:** Production · Paying customers active  
**Stack:** Next.js · TypeScript · Supabase · PostgreSQL · Claude API · Vercel  
**What:** AI-powered guest sentiment analysis, trend detection, and automated outreach for luxury hotels  
**Your Role:** Founder, full-stack engineer, product lead  
**Key Files:**
- Sentiment analysis pipeline: Claude API integration for guest feedback
- Multi-tenant SaaS architecture with row-level security
- Real-time analytics dashboard with property insights
- Real-world customers providing direct feedback loops

**How Claude helps:** Code architecture reviews, LLM prompt optimization, system design decisions, Supabase schema patterns

---

### 🖥️ SerenityOS (serenityux) — Web-Based Desktop Environment
**Status:** Shipping readiness · Ready for portfolio showcase  
**Stack:** Vanilla JavaScript (no deps) · HTML5 · CSS3 · Vercel  
**What:** Fully functional web OS with 9 interactive apps, draggable windows, persistent storage  
**Key Files:**
- `index.html` — Multi-page structure (~15KB)
- `styles.css` — All styling & animations (~35KB)
- `script.js` — Window management, app logic, event handlers (~20KB)
- `README.md` — Comprehensive feature documentation (recently updated)
- `Demo.png` — Visual reference for portfolio

**Recent Work:**
- ✅ Fix window positioning to prevent windows off-screen
- ✅ Add comprehensive shipping readiness checklist
- ✅ Rewrite README for clarity and impact
- 🔄 Refine demo content with portfolio information

**How Claude helps:** Window management edge cases, DOM optimization, CSS animation refinement, README clarity

---

### 🎮 FanZone — Real-Time FIFA Fan Engagement Platform
**Status:** Feature-complete · Active development  
**Stack:** Firebase Realtime Database · WebRTC · JavaScript · Deployed  
**What:** Live multiplayer fan reactions during FIFA matches; sub-100ms latency  
**Your Role:** Solo full-stack engineer  

**How Claude helps:** Real-time architecture debugging, Firebase RLS rules, WebRTC peer connection flows

---

### 📱 Other Projects (Portfolio)
| Project | Stack | Status | Notes |
|---------|-------|--------|-------|
| **Bio EOC Prep** | HTML/CSS/JS | Shipped | Serving thousands of FL students; no deps |
| **TrueCost** | React + Supabase | Shipped | Financial literacy app; real user base |
| **Climate Note** | React + Firebase | Active | Global student environmental publication |
| **GoalRush** | (TBD) | Early stage | Goal/habit tracking |
| **Penny Scout** | (TBD) | Early stage | Finance-related tool |
| **FatVsFit** | (TBD) | Early stage | Fitness tracking |
| **Beacons MCP** | (TBD) | Experimental | MCP server development |

---

## 🛠️ Tech Stack & Conventions

### Languages & Runtimes
- **Primary:** TypeScript (strict mode preferred)
- **Secondary:** JavaScript, Python, SQL
- **Runtimes:** Node.js (latest LTS), Vercel Fluid Compute

### Frontend
- **Framework:** Next.js (App Router) or vanilla JavaScript
- **Styling:** Tailwind CSS or plain CSS (no Sass)
- **State:** React hooks, TanStack Query for server state
- **Type Safety:** TypeScript + ESLint

### Backend & Database
- **Primary DB:** Supabase (PostgreSQL with RLS)
- **Alternative:** Firebase (Firestore, Realtime DB, Auth)
- **API Patterns:** Next.js API routes or Supabase Edge Functions
- **Authentication:** OAuth 2.0, Supabase Auth, Firebase Auth

### AI/LLM Integration
- **Provider:** Anthropic Claude API (preferred)
- **Patterns:**
  - Structured outputs for deterministic results
  - Prompt engineering: zero-shot, few-shot, chain-of-thought
  - Tool use for agents and autonomous workflows
  - RAG for context injection
- **Data:** Vector embeddings for semantic search (if needed)

### Cloud & Deployment
- **Hosting:** Vercel (default)
- **Databases:** Supabase (PostgreSQL), Firebase
- **Monitoring:** Vercel Analytics, custom logging
- **Environment:** Vercel env for secrets, no .env.local in git

### Development Practices
- **Version Control:** Git + GitHub; trunk-based development on `master`
- **Testing:** Manual first (especially UI); integration tests when logic is non-trivial
- **Commits:** Descriptive messages; one feature per commit when possible
- **Code Review:** Inline feedback; PRs for major refactors
- **Documentation:** README for setup; inline comments only for non-obvious WHY

---

## 💡 Coding Principles

### What Claude Should Do
- **Write clean, typed, production-ready code** — not tutorials or demos
- **Prefer editing existing files** to creating new ones
- **Trust internal APIs and frameworks** — don't add redundant error handling
- **Optimize for shipping** — features > perfection; real users > test coverage
- **Think product-first** — architecture serves user needs, not theoretical elegance

### What Claude Should NOT Do
- **Over-engineer abstractions** — three similar lines is fine; don't build for hypothetical future needs
- **Add unnecessary error handling** — only validate at system boundaries (user input, external APIs)
- **Use feature flags or backwards-compatibility shims** — just refactor when needed
- **Write verbose comments** — code should be self-documenting; comments only explain WHY
- **Create half-finished implementations** — either ship or don't

### Code Style
- **No emojis in code** — reserve for docs/README if user asks
- **Minimal comments** — trust well-named variables and functions
- **Type everything in TypeScript** — use `interface` over `type` for object shapes
- **Tailwind classes > custom CSS** — except when Tailwind limits you
- **Functional components** — hooks, not classes; no prop drilling (TanStack Query if needed)

---

## 🚀 Current Sprint Focus (as of 2026-06-13)

### SerenityOS — Shipping Readiness
- **Goal:** Ready for portfolio showcase; clean demo
- **Status:** Window management fixed, README updated, demo captured
- **Next Steps:**
  - Verify all 9 apps work smoothly in demo flow
  - Test edge cases (window overlap, resize, mobile)
  - Finalize deployment on Vercel
  - Link prominently in portfolio

### Socle — Customer Iteration
- **Goal:** Improve retention and feature adoption with live customers
- **Status:** Active user feedback loops; pinpointing friction points
- **Next Steps:** (Depends on customer feedback — check private journal for details)

### Open Internship Opportunities
- **Target:** Summer/Fall 2026 AI/ML or Full Stack roles
- **Approach:** Highlight shipped products, real users, LLM expertise
- **Leverage:** Socle (startup founder), SerenityOS (portfolio polish), GitHub activity

---

## 📊 File Organization

```
/Users/hnadella/Leads/
├── serenityux/                # SerenityOS (primary portfolio piece)
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   ├── README.md
│   ├── Demo.png
│   └── vercel.json
│
├── fanzone/                   # FanZone (real-time platform)
│   ├── app/
│   ├── public/
│   ├── NEXT_STEPS.md
│   ├── APP_RATING.md
│   ├── TESTING_REPORT.md
│   └── DATABASE_RULES.json
│
├── socle-lead-engine/         # Socle (private startup) 
│   ├── app/
│   ├── lib/
│   ├── components/
│   └── [multi-tenant SaaS structure]
│
├── penny-scout/               # Portfolio / Finance tool
├── goalrush/                  # Goal tracking
├── FatVsFit/                  # Fitness tracking
├── beacons-mcp/               # MCP server experiments
│
├── .claude/                   # Claude Code configuration
├── .vercel/                   # Vercel deployment config
├── memory/                    # Auto-memory (persistent across sessions)
│   ├── MEMORY.md
│   ├── user_profile.md
│   └── project_socle.md
│
└── CLAUDE.md                  # This file — your context map
```

---

## 🔗 Key References

**Portfolio/Brand:**
- Main README: `/Users/hnadella/Leads/README.md` (comprehensive profile)
- Portfolio site: sripadnadella.com

**Project Documentation:**
- SerenityOS README: `serenityux/README.md` (features, setup, testing)
- FanZone status: `fanzone/NEXT_STEPS.md`, `fanzone/APP_RATING.md`
- Socle journal: Private repo (check git history for context)

**Auto-Memory (Persistent):**
- User profile: `memory/user_profile.md`
- Socle context: `memory/project_socle.md`

**External Links:**
- GitHub: github.com/nadellasripad11
- Email: nadellasripad11@gmail.com
- LinkedIn: linkedin.com/in/sripad-nadella

---

## ✅ How to Use This File

This CLAUDE.md is your **single source of truth** for project context. When Claude Code loads this file:

1. **It reads this automatically** — no need to paste context into every conversation
2. **It reduces token usage** — structured, concise context beats long explanations
3. **It stays up-to-date** — update it as your projects evolve or focus shifts
4. **It guides decisions** — principles here shape what Claude suggests

### To Update This File:
- After major project pivots, add a new **Current Sprint** section
- When adding/shipping a project, update the **Active Projects** table
- When your tech stack evolves, update the **Tech Stack & Conventions** section
- Keep it concise — lean on linked files for detailed docs

---

## 🎯 Claude's Quick Reference

| Scenario | Action |
|----------|--------|
| You ask about a specific project | Check "Active Projects" section for context, files, and what Claude helps with |
| You want Claude to write code | Claude writes clean, typed, production-ready code following your principles |
| You're working on SerenityOS | Focus on vanilla JS, no deps, window management, portfolio quality |
| You're working on Socle | Focus on LLM prompts, Supabase RLS, multi-tenant SaaS patterns, real customer feedback |
| You're shipping a feature | Verify in browser first; real UI validation beats test suites |
| You hit a blocker | Check project README or ask Claude to search codebase (use Explore agent for large codebases) |

---

**Remember:** You're not building learning projects — you're shipping real products with real users. Code quality, user experience, and deployment readiness are non-negotiable.

Build amazing things. 🚀
