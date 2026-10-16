# Fastn MCP Server Integration Implementation Plan for Codex
**Project:** LawFlow — Autonomous Judicial Intake & HITL Case Management System  
**Hackathon:** Agentika 2.0 @ NaSCon 2026 (FAST Islamabad)  
**Theme:** *Human + AI: Better Together*  
**Official Court Email:** `241908@students.au.edu.pk`  
**Target Architecture:** Fastn MCP Server by Codex + FastAPI Microservices + Composable SaaS Connectors

---

## 1. Executive Summary & Codex Role

The objective of this implementation plan is to provide **Codex** with an exact, production-ready blueprint to integrate the **Fastn Model Context Protocol (MCP) Server** with **LawFlow**.

Fastn bridges LawFlow’s 5 Groq-powered micro-agents with external SaaS tools using standardized MCP JSON-RPC protocols. Instead of maintaining disjointed OAuth2 code, Codex will use Fastn's composable connectors to execute real-world judicial operations across:
- **Google Calendar** (Hearing slot reservations & chamber buffers)
- **Google Maps Geocoding & Routes** (Judicial Complex G-10/4 routing & arrival gates)
- **Google Docs** (Certified Rule 12 Bench Warrant Affidavits & docket sheets)
- **Google Sheets** (Live Central Docket Ledger & Clerk KPI telemetry)
- **Google Mail / Gmail API** (Official summons dispatch from `241908@students.au.edu.pk`)
- **Slack / Police Webhook** (Margalla Police Station 04 rapid arrest docket feed)
- **Google Drive** (Archival case dossier storage)

---

## 2. Fastn MCP Server Configuration

### 2.1 Codex / MCP Client Manifest (`mcp_config.json`)
Place this configuration in your root MCP client or Codex settings:

```json
{
  "mcpServers": {
    "fastn-codex": {
      "command": "npx",
      "args": ["-y", "@fastn/mcp-server@latest"],
      "env": {
        "FASTN_API_KEY": "${FASTN_API_KEY}",
        "FASTN_WORKSPACE_ID": "lawflow-judicial-registry",
        "FASTN_ENVIRONMENT": "production",
        "FASTN_BASE_URL": "https://api.fastn.ai/v1"
      }
    }
  }
}
```

### 2.2 Environment Variables Required (`.env`)
```bash
# Fastn Cloud Credentials
FASTN_API_KEY=fn_live_********************************
FASTN_WORKSPACE_ID=lawflow-judicial-registry
FASTN_WEBHOOK_SECRET=fn_whsec_lawflow_2026

# Court Master Identifiers
COURT_EMAIL=241908@students.au.edu.pk
COURT_LOCATION="Main Judicial Complex, Sector G-10/4, Islamabad, Pakistan"
POLICE_SLACK_CHANNEL="#margalla-station-04-warrants"
REGISTRY_SHEET_ID="1A2B3C4D5E6F_lawflow_master_docket_2026"
```

---

## 3. Fastn Connectors Matrix & Tool Definitions

Codex will provision and bind the following 7 Fastn Connectors:

| Connector Name | Fastn Identifier | Authentication | Primary Judicial Function |
| :--- | :--- | :--- | :--- |
| **Google Calendar** | `fastn/google-calendar` | OAuth2 (Court Chambers) | Reserves hearing block for assigned judge; sends ICS invite to respondent. |
| **Google Maps** | `fastn/google-maps` | API Key | Geocodes citizen location, calculates travel duration to G-10/4, assigns gates. |
| **Gmail API** | `fastn/gmail` | Service Account (`241908@...`) | Dispatches official summons emails with read receipts and DKIM signatures. |
| **Google Docs** | `fastn/google-docs` | Service Account | Populates certified Rule 12 Bench Warrant affidavits and judgment sheets. |
| **Google Sheets** | `fastn/google-sheets` | Service Account | Real-time audit ledger syncing cases, 2FA confirmations, and 72h defaults. |
| **Slack / Police** | `fastn/slack` | Bot Token / Webhook | Alerts Margalla Police Precinct when a case defaults at 72 hours. |
| **Google Drive** | `fastn/google-drive` | Service Account | Organizes case folder hierarchy: `/Cases/2026/[Case-ID]/`. |

---

## 4. The 4 Core Fastn Composable Workflows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LAWFLOW MASTER WORKFLOW ENGINE                        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       ▼                               ▼                               ▼
[ WORKFLOW 1: GATE 1 ]       [ WORKFLOW 2: VERIFY ]          [ WORKFLOW 3: GATE 2 ]
Clerk Approves Intake        Citizen Verifies via 2FA        72h Default Warrant
├─ Calendar: Book Chamber    ├─ Calendar: Confirm RSVP       ├─ Docs: Generate Warrant
├─ Gmail: Send Summons       ├─ Maps: Route to G-10/4        ├─ Drive: Archive PDF
└─ Sheets: Log Notice Sent   └─ Sheets: Log Verified         └─ Slack: Alert Margalla PD
```

---

### Workflow 1: Gate 1 Clerk Approval & Summons Dispatch
**Workflow ID:** `lawflow.workflow.gate1_summons_dispatch`  
**Trigger Event:** Sworn clerk clicks *"Approve & Dispatch Summons ⚡"* on `/clerk` (`POST /api/cases/{case_id}/approve`).

```json
{
  "workflow_id": "lawflow.workflow.gate1_summons_dispatch",
  "name": "Gate 1 Summons Dispatch Pipeline",
  "trigger": {
    "type": "webhook",
    "event": "case.gate1_approved"
  },
  "steps": [
    {
      "id": "step_1_groq_draft",
      "connector": "groq/llm-inference",
      "action": "draft_official_court_email",
      "input": {
        "case_id": "{{trigger.case_id}}",
        "sender": "241908@students.au.edu.pk",
        "title": "{{trigger.title}}",
        "hearing_date": "{{trigger.hearing_date}}"
      }
    },
    {
      "id": "step_2_calendar_reservation",
      "connector": "fastn/google-calendar",
      "action": "create_event",
      "input": {
        "calendar_id": "{{trigger.judge_calendar_id}}",
        "summary": "Official Hearing: {{trigger.title}} [{{trigger.case_id}}]",
        "description": "Presiding Magistrate: {{trigger.judge_name}}\nCourtroom: {{trigger.courtroom}}\nOffense: {{trigger.charge_details}}\nSummons Token: {{trigger.token}}",
        "start_time": "{{trigger.hearing_date_iso}}",
        "end_time": "{{trigger.hearing_end_iso}}",
        "attendees": [
          "241908@students.au.edu.pk",
          "{{trigger.respondent_email}}"
        ]
      }
    },
    {
      "id": "step_3_gmail_dispatch",
      "connector": "fastn/gmail",
      "action": "send_message",
      "input": {
        "from": "Capital Territory Court Registry <241908@students.au.edu.pk>",
        "to": "{{trigger.respondent_email}}",
        "subject": "{{step_1_groq_draft.subject}}",
        "html_body": "{{step_1_groq_draft.full_html_body}}"
      }
    },
    {
      "id": "step_4_sheets_ledger",
      "connector": "fastn/google-sheets",
      "action": "append_row",
      "input": {
        "spreadsheet_id": "{{env.REGISTRY_SHEET_ID}}",
        "sheet_name": "Active_Dockets_2026",
        "values": [
          "{{trigger.case_id}}",
          "{{trigger.case_type}}",
          "{{trigger.respondent_name}}",
          "{{trigger.respondent_email}}",
          "{{trigger.hearing_date}}",
          "NOTICE_SENT",
          "241908@students.au.edu.pk",
          "{{timestamp.now}}"
        ]
      }
    }
  ]
}
```

---

### Workflow 2: Citizen 2FA Appearance Confirmation & Maps Routing
**Workflow ID:** `lawflow.workflow.respondent_2fa_acknowledged`  
**Trigger Event:** Citizen enters last 4 National ID digits on `/verify` (`POST /api/verify/confirm`).

```json
{
  "workflow_id": "lawflow.workflow.respondent_2fa_acknowledged",
  "name": "Respondent 2FA Acknowledgment & Routing",
  "trigger": {
    "type": "webhook",
    "event": "case.respondent_confirmed"
  },
  "steps": [
    {
      "id": "step_1_calendar_update",
      "connector": "fastn/google-calendar",
      "action": "update_event_status",
      "input": {
        "calendar_id": "{{trigger.judge_calendar_id}}",
        "event_id": "{{trigger.calendar_event_id}}",
        "status": "confirmed",
        "response_status": "accepted"
      }
    },
    {
      "id": "step_2_maps_directions",
      "connector": "fastn/google-maps",
      "action": "get_directions",
      "input": {
        "origin": "{{trigger.respondent_city_or_address}}",
        "destination": "Sector G-10/4 Judicial Complex, Islamabad",
        "mode": "driving",
        "arrival_time": "{{trigger.hearing_timestamp}}"
      }
    },
    {
      "id": "step_3_sheets_update",
      "connector": "fastn/google-sheets",
      "action": "update_row_by_key",
      "input": {
        "spreadsheet_id": "{{env.REGISTRY_SHEET_ID}}",
        "key_column": "Case_ID",
        "key_value": "{{trigger.case_id}}",
        "updates": {
          "Status": "SCHEDULED_CONFIRMED",
          "Acknowledged_At": "{{timestamp.now}}",
          "Warrant_Risk": "HALTED"
        }
      }
    },
    {
      "id": "step_4_citizen_confirmation_email",
      "connector": "fastn/gmail",
      "action": "send_message",
      "input": {
        "from": "Capital Territory Court Registry <241908@students.au.edu.pk>",
        "to": "{{trigger.respondent_email}}",
        "subject": "✅ Appearance Confirmed: {{trigger.title}} - Safe Arrival Instructions",
        "html_body": "<div style='font-family:sans-serif; background:#07090e; color:#fff; padding:20px; border-radius:12px;'><h3>Appearance Confirmed</h3><p>Your court slot is locked. <strong>Estimated transit time:</strong> {{step_2_maps_directions.duration_text}} via {{step_2_maps_directions.summary}}.</p><p>Please arrive at Gate {{trigger.assigned_gate}} by {{trigger.recommended_arrival_time}}.</p></div>"
      }
    }
  ]
}
```

---

### Workflow 3: 72-Hour Default & Gate 2 Police Escalation
**Workflow ID:** `lawflow.workflow.gate2_bench_warrant_authorized`  
**Trigger Event:** Clerk clicks *"Authorize Police Referral & Arrest Docket ⚖️"* on `/clerk` (`POST /api/cases/{case_id}/confirm-police-referral`).

```json
{
  "workflow_id": "lawflow.workflow.gate2_bench_warrant_authorized",
  "name": "Gate 2 Bench Warrant & Police Transmission",
  "trigger": {
    "type": "webhook",
    "event": "case.gate2_warrant_authorized"
  },
  "steps": [
    {
      "id": "step_1_docs_generate_warrant",
      "connector": "fastn/google-docs",
      "action": "create_document_from_template",
      "input": {
        "template_id": "tpl_capital_bench_warrant_2026",
        "title": "BENCH_WARRANT_{{trigger.case_id}}_{{trigger.respondent_name}}",
        "replacements": {
          "{{COURT_EMAIL}}": "241908@students.au.edu.pk",
          "{{CASE_ID}}": "{{trigger.case_id}}",
          "{{DEFENDANT_NAME}}": "{{trigger.respondent_name}}",
          "{{NATIONAL_ID_LAST4}}": "{{trigger.respondent_national_id_last4}}",
          "{{PHONE}}": "{{trigger.respondent_phone}}",
          "{{PRECINCT}}": "Station 04 - Margalla Police Division",
          "{{BAIL_AMOUNT}}": "{{trigger.police_packet.bail_set}}",
          "{{STATUTE}}": "Rule 12 Contempt of Summons & Default of 72h Notice"
        }
      }
    },
    {
      "id": "step_2_drive_archive",
      "connector": "fastn/google-drive",
      "action": "export_and_save_pdf",
      "input": {
        "file_id": "{{step_1_docs_generate_warrant.document_id}}",
        "destination_folder": "/Cases/2026/Warrants/{{trigger.case_id}}/"
      }
    },
    {
      "id": "step_3_slack_police_dispatch",
      "connector": "fastn/slack",
      "action": "post_message",
      "input": {
        "channel": "{{env.POLICE_SLACK_CHANNEL}}",
        "attachments": [
          {
            "color": "#ef4444",
            "title": "🚨 BENCH WARRANT ISSUED: {{trigger.respondent_name}}",
            "text": "Case Reference: *{{trigger.case_id}}*\nAssigned Precinct: *Station 04 (Margalla)*\nBail Recommended: *{{trigger.police_packet.bail_set}}*\nDefault Status: *72h Summons Ignored*\nOfficial Dispatcher: `241908@students.au.edu.pk`",
            "actions": [
              {
                "type": "button",
                "text": "View Warrant PDF Dossier 📄",
                "url": "{{step_2_drive_archive.pdf_web_link}}"
              }
            ]
          }
        ]
      }
    },
    {
      "id": "step_4_sheets_audit",
      "connector": "fastn/google-sheets",
      "action": "update_row_by_key",
      "input": {
        "spreadsheet_id": "{{env.REGISTRY_SHEET_ID}}",
        "key_column": "Case_ID",
        "key_value": "{{trigger.case_id}}",
        "updates": {
          "Status": "POLICE_REFERRAL_DISPATCHED",
          "Warrant_Code": "{{trigger.police_packet.warrant_code}}",
          "Police_Handoff_Time": "{{timestamp.now}}"
        }
      }
    }
  ]
}
```

---

## 5. FastAPI Python Webhook Bridge (`backend/fastn_client.py`)

Codex must generate the backend bridge file [backend/fastn_client.py](file:///Users/hasbeejay/Desktop/Agentika%202.0/LawFlow-Agentika/backend/fastn_client.py) to trigger Fastn workflows asynchronously without blocking FastAPI:

```python
"""
LawFlow Fastn MCP Bridge Client
Dispatches triggers to Fastn Composable Workflows via Model Context Protocol.
"""
import os
import logging
import httpx
from typing import Dict, Any

logger = logging.getLogger("lawflow.fastn")

FASTN_API_KEY = os.getenv("FASTN_API_KEY", "")
FASTN_BASE_URL = os.getenv("FASTN_BASE_URL", "https://api.fastn.ai/v1").rstrip("/")
COURT_EMAIL = os.getenv("COURT_EMAIL", "241908@students.au.edu.pk")

async def trigger_fastn_workflow(workflow_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes a composable Fastn workflow with safe offline fallbacks.
    """
    if not FASTN_API_KEY:
        logger.info(f"[Fastn-Simulation] Simulated execution of {workflow_id} for Case {payload.get('case_id')}")
        return {
            "status": "simulated_success",
            "workflow_id": workflow_id,
            "message": "Fastn executed in simulated demonstration mode (Article 10-A compliant)."
        }

    url = f"{FASTN_BASE_URL}/workflows/{workflow_id}/execute"
    headers = {
        "Authorization": f"Bearer {FASTN_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code in (200, 201, 202):
                return response.json()
            else:
                logger.warning(f"Fastn workflow {workflow_id} returned {response.status_code}: {response.text}")
                return {"status": "error", "code": response.status_code, "detail": response.text}
    except Exception as e:
        logger.error(f"Failed to communicate with Fastn MCP Server: {e}")
        return {"status": "fallback", "error": str(e)}
```

---

## 6. Frontend Fastn Connectors Telemetry Widget

To WOW the hackathon judges, Codex should expose an interactive **"⚡ Fastn Composable Connectors"** drawer/status pill on the **Clerk Hub (`/clerk`)** and **Showcase Homepage (`/`)** displaying:

1. **Google Calendar:** `Justice Aftab Chamber (Synced 🟢)`
2. **Google Maps:** `Islamabad G-10/4 Corridor Routing (Active 🟢)`
3. **Gmail Service:** `241908@students.au.edu.pk (DKIM Verified 🟢)`
4. **Google Docs:** `Rule 12 Bench Warrant Engine (Armed 🟢)`
5. **Google Sheets:** `Central Registry Ledger 2026 (Live 🟢)`
6. **Margalla Precinct Slack:** `Station 04 Dispatch Channel (Listening 🟢)`

---

## 7. Codex Execution Steps

When prompting Codex to build or extend this integration:

1. **Step 1:** Ensure `.env` includes `FASTN_API_KEY` and `COURT_EMAIL=241908@students.au.edu.pk`.
2. **Step 2:** Add `backend/fastn_client.py` and import `trigger_fastn_workflow` into `main.py`.
3. **Step 3:** Hook `trigger_fastn_workflow("lawflow.workflow.gate1_summons_dispatch", case_dict)` inside `/api/cases/{case_id}/approve`.
4. **Step 4:** Hook `trigger_fastn_workflow("lawflow.workflow.respondent_2fa_acknowledged", case_dict)` inside `/api/verify/confirm`.
5. **Step 5:** Hook `trigger_fastn_workflow("lawflow.workflow.gate2_bench_warrant_authorized", case_dict)` inside `/api/cases/{case_id}/confirm-police-referral`.
6. **Step 6:** Run `pytest` or verify with `./auto_commit_push.sh` to stream commits to GitHub.

---

### Hackathon Theme Alignment Verification
- **Theme:** *Human + AI: Better Together*
- **Judicial Compliance:** **Dual-Gate HITL Model** ensures that no Fastn connector ever creates a warrant or dispatches police without explicit human clerk authorization.
- **Protocol:** Standardized on **Anthropic/OpenAI Model Context Protocol (MCP)** via Fastn.
