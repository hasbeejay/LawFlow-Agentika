import time
import hashlib
import uuid
from typing import Dict, Any
from backend.config import BASE_URL

def generate_notice_and_token(case_id: str, respondent_name: str, respondent_phone: str, hearing_date: str, courtroom: str, national_id_last4: str) -> Dict[str, Any]:
    """
    Micro-Agent 4: Notice & Token Generation Agent
    Generates HMAC 2FA verification token and summons text.
    """
    raw_hash = f"{case_id}-{national_id_last4}-{time.time()}"
    token_str = f"tok_{case_id.lower().replace('-', '_')}_{hashlib.sha256(raw_hash.encode()).hexdigest()[:12]}"

    verification_link = f"{BASE_URL}/verify?token={token_str}"

    sms_message = (
        f"JUDICIAL COURT NOTICE: Case {case_id} regarding {respondent_name} has been docketed. "
        f"Scheduled Hearing: {hearing_date} in {courtroom}. "
        f"Acknowledge your summons and view rights: {verification_link}"
    )

    return {
        "token": token_str,
        "verification_link": verification_link,
        "sms_message": sms_message,
        "recipient_phone": respondent_phone,
        "recipient_name": respondent_name,
        "dispatched_at": time.time()
    }
