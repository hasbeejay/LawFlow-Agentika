import time
import uuid
from typing import Dict, Any, Optional

def generate_safety_separation_notice(case_id: str, complainant_name: str, complainant_phone: str, hearing_date: str) -> Dict[str, Any]:
    """
    Dual-Party Safety Agent:
    Ensures victim protection, staggered entrance buffer, and advocacy contact.
    """
    arrival_time = "08:30 AM (East Escort Entrance)"
    message = (
        f"VICTIM ADVOCACY & SAFETY NOTICE: Case {case_id} has been formally docketed for {hearing_date}. "
        f"Protected corridor protocol active. Please report to {arrival_time} to prevent respondent contact. "
        f"Advocate line: 1099."
    )
    return {
        "case_id": case_id,
        "complainant_name": complainant_name,
        "phone": complainant_phone,
        "message": message,
        "safety_buffer_applied": True,
        "escort_required": True,
        "advocate_assigned": "Margalla Victim Advocacy Unit"
    }

def compile_police_packet(case_id: str, respondent_name: str, phone: str, national_id_last4: str, charge_details: str, courtroom: str) -> Dict[str, Any]:
    """
    Police Escalation Agent:
    Triggered after 72-hour non-response. Prepares full bench warrant dossier for Clerk Gate 2 sign-off.
    """
    warrant_id = f"BW-{time.strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"
    return {
        "warrant_code": warrant_id,
        "target": respondent_name,
        "national_id_last4": national_id_last4,
        "phone": phone,
        "offense": charge_details,
        "assigned_precinct": "Station 04 - Margalla Police Division & Judicial Enforcement Unit",
        "bail_set": "PKR 50,000 / Non-Bailable after 7 calendar days",
        "recommended_action": "Execute physical summons delivery or issue bench arrest warrant on docket failure.",
        "statutory_authority": "Code of Criminal Procedure § 75 / Contempt of Summons Rule 12",
        "packet_timestamp": time.time(),
        "status": "PENDING_CLERK_SIGN_OFF"
    }
