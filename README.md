# LawFlow ⚖️
### Autonomous Judicial Intake, Scheduling & Human-in-the-Loop Case Management System
**Target Event:** Agentika 2.0 @ NaSCon 2026 (FAST University Islamabad)  
**Theme:** "Human + AI: Better Together"  
**Deployment Target:** Clouds by Alternate Futures (`clouds.alternatefutures.ai`)  

---

## 🌟 Executive Summary
LawFlow is an enterprise judicial technology platform that automates municipal court backlogs, notice delivery, and judge scheduling while enforcing strict **Human-in-the-Loop (HITL) safeguards** at critical civil rights checkpoints. 

Addressing the universal problem of court administrative delays (average 5 days manual processing reduced to **< 12 seconds**) and catastrophic failure-to-appear rates (improving attendance from **61% to 94.2%**), LawFlow orchestrates **5 specialized AI micro-agents** across traffic violations, civil code infractions, and criminal dual-party summons.

---

## 🏛️ Theme: "Human + AI: Better Together"
Judicial authority cannot be delegated to an unsupervised algorithm. LawFlow is architected around two non-negotiable **Human-in-the-Loop Gates**:
1. **Gate 1 (Judicial Assignment & Summons Approval):**  
   The AI analyzes case precedents, calculates sentencing boundaries, and computes an **AI Reasoning Card** scoring judge availability and historical disposition rates. A human Court Clerk must review and click to approve or manually override the magistrate before any summons is dispatched.
2. **Gate 2 (Bench Warrant & Police Referral Authorization):**  
   If a respondent ignores the summons and automated 48-hour reminder, a 72-hour default compiles a digital Law Enforcement Bench Warrant packet. The AI **cannot** issue an arrest warrant autonomously; the Clerk must examine the docket history and formally sign off on police handoff.

---

## 🤖 The 5 AI Micro-Agents
| Micro-Agent | Primary Function | Core Technology |
| :--- | :--- | :--- |
| **Agent 1: Precedent & Case Brief** | Analyzes charges, retrieves relevant statutes and case law, generates 1-page judicial summary brief. | Groq Llama-3.3 / Gemini 1.5 Flash + MCP Tool |
| **Agent 2: Calendar & Scheduling** | Enforces minimum statutory notice windows (7–14 days), checks courtroom capacity and judge docket availability. | Discrete Slot Solver + MCP Tool |
| **Agent 3: Judge Matcher** | Ranks magistrates across 4 weighted factors (Specialization, Clearance Speed, Workload Balance, Conflict Check) and generates the **AI Reasoning Card**. | Multi-Objective Matcher + Rationale LLM |
| **Agent 4: Notice & Token Dispatch** | Generates HMAC-SHA256 2FA verification tokens and drafts bilingual summons text. | Cryptographic Token Generator + Virtual Telephony |
| **Agent 5: Safety & Police Escalation** | Enforces 30-minute staggered corridor arrival buffers for dual-party criminal cases, and compiles Bench Warrant Dossiers at 72h default. | Safety Buffer Logic + Enforcement Dossier Compiler |

---

## ⚡ Model Context Protocol (MCP) Integration
LawFlow implements **6 codified Model Context Protocol (MCP) tools** accessible via `/api/mcp/tools` and `/api/mcp/call`:
1. `search_precedents`: Case law citation, statutory baseline, and typical disposition rate lookup.
2. `get_sentencing_guidelines`: Minimum notice windows, fine ranges, and diversion eligibility.
3. `get_judge_availability`: Courtroom assignments and active docket loads.
4. `verify_safety_separation_buffers`: Staggered corridor schedules and restraining order alerts for dual-party cases.
5. `generate_secure_token`: Cryptographic 2FA tokens and one-touch respondent verification URLs.
6. `dispatch_police_packet`: Digital bench warrant generation for police enforcement after 72-hour default.

### Fastn workflow bridge

LawFlow can POST events to provisioned Fastn workflow webhook URLs. Set
`FASTN_GATE1_WEBHOOK_URL`, `FASTN_VERIFY_WEBHOOK_URL`, and
`FASTN_GATE2_WEBHOOK_URL` in the deployment environment after creating the
workflows in Fastn. Optionally set `FASTN_WEBHOOK_SECRET` when the receiving
webhooks are configured to validate the matching HMAC signature. The example
environment leaves these values blank; blank values mean the Fastn workflows
are **not configured**. The status endpoint reports endpoint configuration,
not the health of downstream Google or Slack connectors.

The Fastn bridge does not use a guessed Fastn REST execution URL. Gate 1 keeps
the existing application notice dispatch path; configure its Fastn workflow
for calendar and ledger work so it does not send a duplicate summons. Gate 2
must remain a human clerk action after the 72-hour case reaches
`FORCE_ACTION_PENDING_CLERK`.

---

## 📱 4 Interactive UI Views
* **View 1: Executive Command & Analytics Dashboard (`/analytics`):** Real-time KPI metrics, case categorization, and an interactive 60fps canvas visualizer showing data packet flow through the micro-agent neural network.
* **View 2: Clerk Intake & HITL Hub (`/clerk`):** One-click demo presets (Radar speed, Dual-party domestic violence, Sanitation infraction, Trespass misdemeanor), Gate 1 and Gate 2 action banners, and an active docket management queue with inline fast-forward time simulation buttons (`0h`, `48h`, `72h`).
* **View 3: Judicial Hearing Calendar (`/judge`):** Chamber docket view showing active caseloads, courtroom locations, and safety separation buffers.
* **View 4: Respondent Secure Portal (`/verify?token=...`):** Mobile-optimized 2FA identity verification (last 4 digits of CNIC/SSN), multilingual engine (**English**, **اردو Urdu**, **Español Spanish**), browser Text-to-Speech audio reader, and one-click appearance confirmation.

---

## 🚀 Deployment on Alternate Clouds (`clouds.alternatefutures.ai`)

LawFlow is built as a **Single-Container Unified Web Application** to eliminate reverse proxy errors, CORS failures, and Cloudflare 502 Bad Gateway timeouts.

### Alternate Clouds Steps:
1. Push this repository to GitHub.
2. Log in to [clouds.alternatefutures.ai](https://clouds.alternatefutures.ai).
3. Select **Add Service** &rarr; **Alternate Agent** (or Docker Service).
4. Connect your GitHub repository.
5. Set environment variable: `PORT=8000`.
6. (Optional) Set `GROQ_API_KEY` and `GEMINI_API_KEY`. If omitted, LawFlow automatically falls back to its deterministic judicial reasoning engine without crashing.
7. Click **Deploy**. The container will build and expose the application on Port 8000.

---

## 💻 Local Quickstart

```bash
# 1. Clone repository
git clone https://github.com/<your-username>/LawFlow-Agentika.git
cd LawFlow-Agentika

# 2. Set up virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run application
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open `http://localhost:8000` in your browser.

---

## 🛡️ Disqualification Prevention Checklist
- [x] **Deployed on Alternate Clouds:** Container strictly configured for `PORT=8000`.
- [x] **No AI-Written LinkedIn Post:** Post written manually by student in English with required hashtags (`#AgentikaAIHackathon #AIAutomation #AIHackathon #BuildInPublic`).
- [x] **English Communication:** All documentation, UI strings, and video voiceovers in English.
- [x] **Zero Exposed Secrets:** All keys stored via environment variables.
- [x] **Submission Package:** Single PDF submitted before 12:45 PM PKT on 17 October 2026.
