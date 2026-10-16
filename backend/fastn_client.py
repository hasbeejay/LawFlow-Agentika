"""
LawFlow Fastn MCP Bridge Client
Dispatches triggers to Fastn Composable Workflows via Model Context Protocol.
"""
import os
import logging
import httpx
from typing import Dict, Any

logger = logging.getLogger("lawflow.fastn")

FASTN_API_KEY = os.getenv("FASTN_API_KEY", "").strip()
FASTN_BASE_URL = os.getenv("FASTN_BASE_URL", "https://api.fastn.ai/v1").rstrip("/")
COURT_EMAIL = os.getenv("COURT_EMAIL", "241908@students.au.edu.pk").strip()

async def trigger_fastn_workflow(workflow_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes a composable Fastn workflow with safe offline fallbacks.
    If FASTN_API_KEY is not yet configured, runs in high-fidelity simulated mode.
    """
    case_id = payload.get("case_id") or payload.get("id", "UNKNOWN")

    if not FASTN_API_KEY:
        logger.info(f"[Fastn-Simulation] Executing composable workflow '{workflow_id}' for Case {case_id}")
        simulated_actions = []

        if workflow_id == "lawflow.workflow.gate1_summons_dispatch":
            simulated_actions = [
                {"connector": "fastn/google-calendar", "status": "event_booked", "details": f"Reserved slot on magistrate chamber calendar for {case_id}"},
                {"connector": "fastn/gmail", "status": "dispatched", "details": f"Sent DKIM notice from {COURT_EMAIL} to {payload.get('respondent_email')}"},
                {"connector": "fastn/google-sheets", "status": "row_appended", "details": f"Docket row recorded in Central Registry 2026"}
            ]
        elif workflow_id == "lawflow.workflow.respondent_2fa_acknowledged":
            simulated_actions = [
                {"connector": "fastn/google-calendar", "status": "rsvp_confirmed", "details": f"Appearance confirmed for {case_id}"},
                {"connector": "fastn/google-maps", "status": "route_calculated", "details": "Transit buffer to Sector G-10/4 Islamabad generated"},
                {"connector": "fastn/google-sheets", "status": "row_updated", "details": f"Status updated to SCHEDULED_CONFIRMED"}
            ]
        elif workflow_id == "lawflow.workflow.gate2_bench_warrant_authorized":
            simulated_actions = [
                {"connector": "fastn/google-docs", "status": "doc_generated", "details": f"Rule 12 Bench Warrant Affidavit created for {case_id}"},
                {"connector": "fastn/slack", "status": "police_alerted", "details": "Priority arrest packet posted to Margalla Police Station 04 channel"},
                {"connector": "fastn/google-drive", "status": "archived", "details": f"Warrant PDF archived in /Cases/2026/Warrants/{case_id}/"}
            ]

        return {
            "status": "success",
            "mode": "simulated",
            "workflow_id": workflow_id,
            "case_id": case_id,
            "actions_executed": simulated_actions
        }

    # Live Fastn Execution
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
