# LawFlow: Master Product, Architecture & Implementation Blueprint
**Project Title:** LawFlow — Autonomous Judicial Intake, Scheduling & Human-in-the-Loop Case Management System  
**Hackathon Target:** Agentika 2.0 @ NaSCon 2026 (FAST NUCES Islamabad)  
**Theme:** "Human + AI: Better Together"  
**Target Deployment Platform:** Clouds by Alternate Futures (`clouds.alternatefutures.ai`)  

---

## Executive Summary & Strategic Fit

LawFlow is an enterprise-grade legal technology platform designed to automate administrative judicial backlogs while enforcing strict Human-in-the-Loop (HITL) safeguards. Built specifically for the **Agentika 2.0** hackathon, LawFlow orchestrates specialized AI micro-agents (Precedent Retrieval, Calendar Scheduling, Judge Matching, and Encrypted Notice Dispatch) while keeping legal clerks in full decision-making control at critical civil rights checkpoints.

By addressing universal court delays and failure-to-appear rates across civil infractions, misdemeanors, and criminal dual-party cases, LawFlow delivers international real-world utility and directly aligns with the 100-point Agentika 2.0 judging rubric.

---

## 1. Hackathon Blueprint & Strategic Execution

### 1.1 Key Event Parameters & Rules
* **Event & Theme:** Agentika 2.0 at NaSCon 2026, hosted at FAST University Islamabad by Grayhat Developers and Alternate Futures. Theme: *"Human + AI: Better Together"*.
* **Team Structure:** Teams of 2 students.
* **Prize Pool:** PKR 80,000 Total (Winning Team: PKR 50,000 | Runner-Up: PKR 30,000).
* **Mandatory Deployment:** Deployment on **Clouds by Alternate Futures** (`clouds.alternatefutures.ai`). Local-only demos or external hosting result in immediate disqualification.
* **Mandatory Disqualification Rules:**
  1. **Self-Written LinkedIn Post:** One teammate writes an original English LinkedIn post using hashtags `#AgentikaAIHackathon #AIAutomation #AIHackathon #BuildInPublic`; the other reshares. AI-generated text is strictly forbidden (grammar checkers allowed).
  2. **English-Only Communication:** All interactions and verbal presentations observed by moderators must be in English.
  3. **Submission Deadline:** 17 October 2026, 12:45 PM PKT. No code or deployment changes permitted after the deadline.
  4. **1-PDF Submission Package:** Must include Team Info, Live Deployment URL, GitHub/n8n JSON link, 2–3 min Unlisted Video, Proof Screenshots (Discord & Alternate Clouds Dashboard), and test credentials.

### 1.2 Official Rubric Audit & LawFlow Score Allocation

| Rubric Criterion | Max Points | LawFlow Strategic Strategy & Score Target |
| :--- | :--- | :--- |
| **Technical Execution & Reliability** | **25 pts** | **25/25**: End-to-end multi-agent state machine, zero-downtime error handling, exponential backoff for API limits, and 502/KeyError container safeguards. |
| **Usefulness & Real-World Impact** | **20 pts** | **20/20**: Solves global court backlogs and reduces failure-to-appear rates across infractions, violations, and criminal dual-party summons. |
| **Theme Alignment** | **15 pts** | **15/15**: Direct embodiment of "Human + AI: Better Together" via mandatory Clerk Approval Gates before judge assignment and police escalation. |
| **Creativity & Uniqueness** | **15 pts** | **15/15**: Transcends basic chatbots with automated 48h/72h escalation ladders, AI Reasoning Cards, and 3D legal analytics visualizers. |
| **Automation Depth & Integration** | **15 pts** | **15/15**: Orchestrates 5 specialized sub-agents, tool-calling/MCP protocols, SQLite state tracking, and secure encrypted token generation. |
| **User Experience & Presentation** | **10 pts** | **10/10**: Glassmorphic UI with Three.js 3D elements, Framer Motion animations, dual-party portal, and a fast-forward time simulation engine for live demos. |

---

## 2. Product Architecture & System Workflow

### 2.1 Complete End-to-End Workflow Diagram

```
[ Clerk: Case Filing Intake ]
         │
         ▼
[ Agent 1: Precedent & Case Brief Agent ] ──> Generates 1-page Judicial Summary
         │
         ▼
[ Agent 2: Calendar & Scheduling Agent ] ──> Enforces min notice window (7–14 days)
         │
         ▼
[ Agent 3: Judge Matcher Agent ] ──────────> Ranks judges & generates AI Reasoning Card
         │
         ▼
 🧑 【HUMAN-IN-THE-LOOP GATE 1】Clerk One-Click Review & Approval
         │
         ├── Approved ──> [ Agent 4: Notice & Token Generation Agent ]
         └── Declined ──> Triggers Re-Match Fallback Loop
         │
         ▼
[ Defendant / Respondent Portal ] ──> 2FA Auth (Last 4 SSN/ID) & Schedule Confirmation
         │
         ├── Acknowledged ────────> Case Scheduled Status
         └── Non-Responsive ─────> [ Simulated Time Fast-Forward Engine ]
                                      ├── +48 Hours: Auto-Resend Encrypted SMS
                                      └── +72 Hours: Auto-Flag "Force Action" + Generate Police Packet
                                                │
                                                ▼
                                   🧑 【HUMAN-IN-THE-LOOP GATE 2】Clerk Police Referral Confirmation
                                                │
                                                ▼
                                   [ Police Referral Packet Dispatched ]
         │
         ▼
[ Hearing Concluded ] ──> Clerk inputs verdict ──> Agent 5 sends Closure SMS & archives case.
```

### 2.2 Criminal Case Extension (Dual-Party Notice Engine)
For felony and misdemeanor criminal offenses involving a victim and an accused:
1. **Accused / Defendant Stream:** Receives encrypted summons, court appearance dates, bail conditions, and public defender assistance links.
2. **Victim / Complainant Stream:** Receives victim rights notice, court date, protective order information, and real-time status updates upon case resolution.
3. **Safety & Separation Agent:** Verifies no-contact order flags and ensures separate calendar check-in buffers to prevent courtroom corridor conflict.

---

## 3. UI/UX Architecture & Page Specifications

LawFlow features a single-page application (SPA) architecture with 4 distinct views:

### View 1: Command & Analytics Dashboard (`/analytics`)
- **3D Scale / Globe Visualizer:** Three.js / Spline canvas showing interactive global legal nodes.
- **Key Metric Cards:** Total Cases Handled, Appearance Success Rate (e.g., 94.2%), Average Time-to-Notice (< 12 seconds vs 5 days manual).
- **Offense Breakdown Charts:** Interactive charts categorizing Violations, Infractions, Misdemeanors, and Criminal Cases.

### View 2: Clerk Intake & Case Management Hub (`/clerk`)
- **Filing Form:** Offense selector, party contacts, dual-party details for criminal cases.
- **AI Brief & Match Panel:** 1-page precedent summary alongside the **AI Reasoning Card** (*Score, Disposition %, Slot Availability, Conflict Check*).
- **Pending Action Queue:** Gate 1 (Approve Match) and Gate 2 (Confirm Police Referral) action cards.
- **Simulated Time Engine:** Control bar (+0h, +48h, +72h) to fast-forward state transitions during live judging.

### View 3: Judicial Hearing Calendar (`/judge`)
- View pending cases, accept/decline hearing proposals, and review AI precedent summaries.

### View 4: Respondent Secure Portal (`/verify?token=...`)
- Mobile-optimized view with 2FA verification (Last 4 digits of ID/DOB).
- **Accessibility Toolbar:** 1-click Language Switcher (English, Urdu, Spanish) and Text-to-Speech audio reader.
- Interactive court location map and "Confirm Appearance" button.

---

## 4. 100% Free Technical Stack & Deployment Blueprint

### 4.1 Technology Stack
* **LLM Engine:** Groq Console (`console.groq.com/keys`) for high-speed Llama-3 inference, with Google Gemini 1.5 Flash API as secondary fallback.
* **Backend Framework:** Python 3.11 + FastAPI + SQLite in-memory state engine.
* **Frontend Framework:** React + Tailwind CSS + Framer Motion + `@react-three/fiber` / Spline.
* **SMS & Notice Simulation:** Twilio Free Trial API + In-App Live SMS Console log.
* **Hosting Platform:** Clouds by Alternate Futures (Docker container exposed on Port 8000).

### 4.2 Error Handling & Resilience Matrix

| Edge Case / Potential Bug | Architectural Defense & Fallback Strategy |
| :--- | :--- |
| **Groq API Rate Limit (429)** | Automatic exponential backoff with instant fallback to Gemini 1.5 Flash API. |
| **Judge Decline** | Matcher agent automatically picks secondary candidate and alerts clerk. |
| **Invalid Phone / Delivery Fail** | State machine flags number, logs error, and halts 72h timer pending clerk phone update. |
| **Cloudflare 502 Bad Gateway** | Ensured `EXPOSE 8000` in Dockerfile strictly matches Alternate Clouds `PORT=8000` variable. |
| **Startup KeyError** | All env keys defined with safe fallbacks (`os.environ.get('KEY', 'default')`). |

---

## 5. Developer Master Implementation Code & Specs

### 5.1 Dockerfile (`/Dockerfile`)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
ENV PORT=8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 5.2 FastAPI Agent Server (`/main.py`)
```python
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import os, time, uuid

app = FastAPI(title="LawFlow API")

# Mock Database Store
cases_db = {}
judges_db = [
    {"id": "j1", "name": "Judge Sarah Jenkins", "disposition_rate": "94%", "slots": ["2026-10-24 09:00", "2026-10-25 11:00"]},
    {"id": "j2", "name": "Judge Michael Chang", "disposition_rate": "89%", "slots": ["2026-10-24 14:00", "2026-10-26 10:00"]}
]

class CaseIntake(BaseModel):
    respondent_name: str
    phone: str
    national_id_last4: str
    case_type: str  # Infraction, Violation, Felony, Criminal
    charge_details: str

@app.post("/api/cases/intake")
def intake_case(payload: CaseIntake):
    case_id = str(uuid.uuid4())[:8]
    token = str(uuid.uuid4())
    
    # AI Precedent Brief (Simulated LLM response for speed)
    precedent_summary = f"Precedent Search for {payload.case_type}: Relevant case State v. Miller (2024). Standard disposition rate 91%."
    
    # Judge Matcher Logic
    recommended_judge = judges_db[0]
    
    cases_db[case_id] = {
        "id": case_id,
        "payload": payload.dict(),
        "status": "PENDING_CLERK_APPROVAL",
        "precedent": precedent_summary,
        "recommended_judge": recommended_judge,
        "token": token,
        "created_at": time.time(),
        "simulated_hours": 0
    }
    return {"status": "success", "case_id": case_id, "case": cases_db[case_id]}

@app.post("/api/cases/{case_id}/approve")
def approve_case(case_id: str):
    if case_id not in cases_db:
        raise HTTPException(status_code=404, detail="Case not found")
    cases_db[case_id]["status"] = "NOTICE_SENT"
    return {"status": "success", "new_status": "NOTICE_SENT", "sms_link": f"/verify?token={cases_db[case_id]['token']}"}

@app.post("/api/cases/{case_id}/simulate-time")
def simulate_time(case_id: str, hours: int = Query(...)):
    if case_id not in cases_db:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case = cases_db[case_id]
    case["simulated_hours"] += hours
    
    if case["simulated_hours"] >= 72 and case["status"] != "ACKNOWLEDGED":
        case["status"] = "FORCE_ACTION_PENDING_CLERK"
    elif case["simulated_hours"] >= 48 and case["status"] != "ACKNOWLEDGED":
        case["status"] = "NOTICE_RESENT_48H"
        
    return {"status": "success", "case_status": case["status"], "simulated_hours": case["simulated_hours"]}
```

---

## 6. Pre-Submission Verification Checklist

1. **Deploy Early on Alternate Clouds:** Container builds take 10–15 minutes. Deploy a working base on Day 1.
2. **Rebuild & Deploy Command Flow:** Push to GitHub -> Click **Rebuild** on Alternate Clouds dashboard -> Wait for green status -> Click **Deploy**.
3. **Double-Check Disqualification Rules:**
   - English communication maintained at all times.
   - LinkedIn original post + reshare links verified.
   - Submission PDF compiled with deployment link, GitHub link, 2-min demo video, and proof screenshots.
