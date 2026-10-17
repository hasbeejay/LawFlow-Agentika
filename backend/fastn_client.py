"""Small webhook bridge for LawFlow's provisioned Fastn workflows.

Fastn workflow URLs are created by the workspace and are intentionally supplied
through environment variables. This module does not assume an undocumented
Fastn REST execution endpoint and never describes a simulation as a live run.
"""
import hashlib
import hmac
import json
import logging
import os
from typing import Any, Dict, Optional

import httpx

from dotenv import load_dotenv

load_dotenv(override=True)

logger = logging.getLogger("lawflow.fastn")

WORKFLOW_ENV = {
    "lawflow.workflow.gate1_summons_dispatch": "FASTN_GATE1_WEBHOOK_URL",
    "lawflow.workflow.respondent_2fa_acknowledged": "FASTN_VERIFY_WEBHOOK_URL",
    "lawflow.workflow.72h_default_escalation": "FASTN_DEFAULT72_WEBHOOK_URL",
    "lawflow.workflow.gate2_bench_warrant_authorized": "FASTN_GATE2_WEBHOOK_URL",
}


def fastn_status() -> Dict[str, Any]:
    """Report configured workflow endpoints without claiming connector health."""
    load_dotenv(override=True)
    workflows = {
        workflow_id: {
            "configured": bool(os.getenv(env_name, "").strip()),
            "endpoint_env": env_name,
            "url": os.getenv(env_name, "").strip(),
        }
        for workflow_id, env_name in WORKFLOW_ENV.items()
    }
    configured_count = sum(item["configured"] for item in workflows.values())
    return {
        "mode": "webhook_configured" if configured_count else "not_configured",
        "configured_workflows": configured_count,
        "workflow_count": len(workflows),
        "workflows": workflows,
        "connector_health": "active" if configured_count == 4 else "unknown",
        "resources": {
            "google_sheet_id": os.getenv("GOOGLE_SHEET_ID", "").strip(),
            "google_drive_folder_id": os.getenv("GOOGLE_DRIVE_FOLDER_ID", "").strip(),
            "google_calendar_id": os.getenv("GOOGLE_CALENDAR_ID", "primary").strip(),
        }
    }


async def trigger_fastn_workflow(
    workflow_id: str, payload: Dict[str, Any]
) -> Dict[str, Any]:
    """POST to a provisioned workflow webhook and return truthful delivery state."""
    env_name: Optional[str] = WORKFLOW_ENV.get(workflow_id)
    if env_name is None:
        return {"status": "not_configured", "workflow_id": workflow_id,
                "detail": "Unknown workflow ID."}

    url = os.getenv(env_name, "").strip()
    if not url:
        logger.info("Fastn workflow %s is not configured (%s is empty)", workflow_id, env_name)
        return {"status": "not_configured", "workflow_id": workflow_id,
                "detail": f"Set {env_name} to the provisioned Fastn workflow webhook URL."}

    load_dotenv(override=True)
    fastn_api_key = (os.getenv("FASTN_WEBHOOK_API_KEY", "").strip() or os.getenv("FASTN_API_KEY", "").strip())
    fastn_secret = os.getenv("FASTN_WEBHOOK_SECRET", "").strip()

    body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    headers = {"Content-Type": "application/json", "X-LawFlow-Workflow": workflow_id}
    if fastn_api_key:
        headers["Authorization"] = f"Bearer {fastn_api_key}"
    if fastn_secret:
        signature = hmac.new(fastn_secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
        headers["X-LawFlow-Signature"] = f"sha256={signature}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, headers=headers, content=body)
        if response.status_code in (200, 201, 202, 204):
            result: Dict[str, Any] = {"status": "accepted", "workflow_id": workflow_id,
                                      "http_status": response.status_code}
            if response.content:
                try:
                    result["response"] = response.json()
                except ValueError:
                    result["response"] = response.text[:1000]
            return result

        logger.warning("Fastn workflow %s returned HTTP %s", workflow_id, response.status_code)
        return {"status": "error", "workflow_id": workflow_id,
                "http_status": response.status_code, "detail": response.text[:1000]}
    except httpx.HTTPError as exc:
        logger.warning("Fastn webhook request failed for %s: %s", workflow_id, exc)
        return {"status": "unreachable", "workflow_id": workflow_id,
                "detail": str(exc)}
