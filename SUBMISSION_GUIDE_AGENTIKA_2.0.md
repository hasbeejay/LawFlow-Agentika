# ⚖️ LawFlow — Agentika 2.0 Official Submission Package
**Event:** Agentika 2.0 @ NaSCon 2026 (FAST National University, Islamabad)  
**Track:** Agentic AI & Human-in-the-Loop Autonomous Systems  
**Theme:** *Human + AI: Better Together*  
**Submission Deadline:** 17 October 2026, 12:45 PM PKT  
**Format:** Exactly 1 PDF per team (Sections 1 to 5)  

---

## Section 1: Team Details
* **Team Name:** Ctrl Alt Elite
* **Member 1 (Team Lead):**
  * **Full Name:** Haseeb Jalil
  * **Email:** `hasbeejayleo@gmail.com`
  * **Registered Discord Username:** `hasbeejay` [Participant / Ctrl Alt Elite]
* **Member 2 (Teammate):**
  * **Full Name:** Ansab saddique
  * **Email:** *(Provide teammate email)*
  * **Registered Discord Username:** *(Provide teammate Discord ID)*
* **Official Court Sender Email:** `241908@students.au.edu.pk`

---

## Section 2: About Your Project

* **Project Name:** LawFlow — Autonomous Judicial Intake & Dual-Gate HITL Case Management System
* **One-Line Pitch:** An autonomous judicial scheduling and human-in-the-loop compliance engine that collapses court intake from 5 days to 12 seconds while strictly preventing default arrest warrants through multi-agent verification and civil rights safeguards.
* **The Problem & Who It Is For (2–3 Lines):**  
  Courts face massive administrative bottlenecks where routine summons take days to process, and over 39% of respondents fail to appear due to outdated, opaque paper notices—resulting in automatic default bench arrest warrants. LawFlow serves municipal court clerks, presiding magistrates, and citizens by providing instant AI-assisted intake, plain-language legal transparency, and automated multi-channel summons dispatch.
* **Where the Human Comes In (Theme: "Human + AI: Better Together"):**  
  LawFlow enforces an uncompromised **Dual-Gate Human-in-the-Loop (HITL) Architecture**:
  1. **Gate 1 (Magistrate Assignment & Hearing Sign-Off):** The AI analyzes statutory precedents, computes weighted suitability scores, and recommends a courtroom slot—but an authorized Court Clerk must physically review and sign off before any summons or calendar reservation is issued.
  2. **Gate 2 (Bench Warrant Referral Authorization):** If a citizen fails to verify within 72 hours, the AI compiles a preliminary compliance dossier. However, the system is strictly prohibited from generating a police warrant or contacting law enforcement without explicit, logged human clerk authorization.
* **What You Built With:**  
  * **Core Stack:** Python 3.11, FastAPI, SQLite with persistent schema migrations, HTML5/CSS3 glassmorphic UI with a 60fps hardware-accelerated neural visualizer canvas.
  * **Agentic AI Models:** Groq Cloud (`openai/gpt-oss-20b`, `openai/gpt-oss-120b`) delivering ultra-low-latency (0.04s) inference for precedent analysis, plain-language respondent summaries, and official correspondence drafting. Supported by Google Gemini 1.5 Flash fallback.
  * **Fastn Composable MCP Connectors:** Fully integrated Fastn Model Context Protocol (MCP) server managing live, automated judicial operations across **Google Sheets** (master docket telemetry), **Google Drive** (case dossier storage), **Google Calendar** (hearing slot reservation), and **Google Docs** (Rule 12 Bench Warrant draft generation).

---

## Section 3: Official Required Links

* **GitHub Repository Link:** [https://github.com/hasbeejay/LawFlow-Agentika](https://github.com/hasbeejay/LawFlow-Agentika)
* **Live Alternate Clouds Deployment Link:** [https://lawflow-app-app.alternatefutures.ai](https://lawflow-app-app.alternatefutures.ai)
* **Fastn Master Google Sheets Docket:** [LawFlow Master Docket Ledger](https://docs.google.com/spreadsheets/d/1nWJj4TawBA4NO0TvzyRt6GB-g-xJh7YsPccQCg1WZnw/edit?gid=0#gid=0)
* **Fastn Google Drive Case Dossier Archive:** [LawFlow Case Dossier Folder](https://drive.google.com/drive/folders/1IDfiawCj8uAIIc-hs1tdZOK_5DMSD-tS?usp=share_link)
* **Demo Video Link (2–3 minutes):** *(Insert unlisted YouTube or Google Drive link)*
* **LinkedIn Original Post Link (Teammate 1):** *(Insert LinkedIn post link)*
* **LinkedIn Reshare Link (Teammate 2):** *(Insert LinkedIn reshare link)*

---

## Section 4: Judge Test Access & Demonstration Scripts

### 🔑 Test Credentials (No Setup Required)
* **Court Clerk Gateway (`/clerk`):**
  * Username / Email: `clerk@lawflow.court`
  * Password: `clerk2026`
* **Police-Admin Security Gateway (`/admin`):**
  * Username / Email: `admin@lawflow.gov`
  * Password: `admin2026`
* **Citizen Verification Portal (`/verify`):** Open access via token or case lookup.

### 🧪 Ready-to-Test Judge Scenarios

| Scenario | Case ID / Token | Verification Credential | What Judges Will Experience |
| :--- | :--- | :--- | :--- |
| **1. Gate 1 Intake & Clerk Sign-Off** | `LF-2026-1042` | Clerk Portal (`/clerk`) | Inspect the AI Precedent Brief, view the judicial factor weighting card, and click **Approve & Dispatch Summons ⚡**. Fastn automatically creates an event on Google Calendar and appends a row to Google Sheets. |
| **2. Citizen 2FA Verification** | `LF-2026-3180` / `tok_lf_2026_3180_da0855cf72a4` | CNIC Last 4: `3054` | Open `/verify?token=tok_lf_2026_3180_da0855cf72a4`. Read the plain-language case explanation, listen to audio summons, enter `3054`, and click **Confirm Appearance**. Google Sheets instantly updates to `SCHEDULED_CONFIRMED`. |
| **3. Time-Travel & 72h Default** | Any active case | Time Travel Slider (`/clerk`) | Drag the time slider to `+72h`. The case automatically triggers default escalation, generating a Bench Warrant Draft banner and updating Google Sheets to `AWAITING_CLERK_REVIEW`. |
| **4. Gate 2 Human-Authorized Warrant** | `LF-2026-4412` | Clerk Portal (`/clerk`) | Click **Authorize Police Escalation**. Fastn creates a formal Google Doc titled `DRAFT FOR HUMAN REVIEW - NOT A WARRANT`, uploads the audit file to the user's Google Drive folder, and logs the action to police dispatch. |
| **5. Secret Police-Admin Management** | N/A | Admin Portal (`/admin`) | Manage court clerk accounts, provision new intake staff, and view live police referral packets. |

---

## Section 5: Mandatory Declarations (Check All 5)
* [x] We wrote our LinkedIn post ourselves. Only grammar-only tools were used.
* [x] Our project is deployed on Alternate Clouds.
* [x] No API keys or personal passwords appear in our repository, video, or screenshots.
* [x] We have credited third-party code and templates.
* [x] We will not change our code or deployment after 12:45 PM PKT on 17 October.

---

## Section 6: 2.5-Minute Pitch & Video Script

* **0:00 – 0:30 (Problem & The "Better Together" Hook):**  
  *"Judicial systems are drowning in administrative backlog. Over 39% of traffic and civil citations result in default arrest warrants simply because respondents never understood their paper notices. Today we present LawFlow—combining the speed of autonomous agentic AI with the unyielding safety of Human-in-the-Loop oversight."*
* **0:30 – 1:00 (Intake & Gate 1 Clerk Sign-Off):**  
  *Showcase `/clerk`.* Pick a citation preset, file intake in 2 seconds. Point to the AI Precedent Brief citing relevant case law and the AI Reasoning Card showing judge workload. Click **"Approve & Dispatch Summons"**. Show Fastn scheduling the hearing on Google Calendar and logging the docket row in Google Sheets in real-time.
* **1:00 – 1:35 (Citizen Portal & Plain-Language Rights):**  
  *Showcase `/verify`.* Switch language to Urdu/Spanish, play the Web Speech audio reader, and show the AI Plain-Language Breakdown and Rights Checklist. Enter the last 4 digits (`3054`) and click **"Confirm Court Appearance"**. Show the instant confirmation and Islamabad Judicial Complex G-10/4 transit route.
* **1:35 – 2:05 (Time Travel & Gate 2 Police Authorization):**  
  *Showcase Time Travel.* Fast-forward to +72 hours without response. The system halts, flagging the case for human review. Open the Gate 2 review modal. Show that AI cannot arrest anyone—only the human clerk can sign off. Click **"Authorize Police Escalation"** and reveal the generated Google Doc and Google Drive dossier.
* **2:05 – 2:30 (Admin Panel & Conclusion):**  
  *Showcase `/admin`.* Show clerk account provisioning and master audit logging. Wrap up with the core takeaway: *"LawFlow proves that AI and human clerks are truly better together—protecting constitutional due process while supercharging judicial speed."*
