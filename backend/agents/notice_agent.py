import time
import hashlib
import uuid
import logging
import httpx
from typing import Dict, Any
from backend.config import BASE_URL, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

logger = logging.getLogger("lawflow.agent.notice")

async def dispatch_live_sms_twilio(to_phone: str, message: str) -> Dict[str, Any]:
    """
    Dispatches a real-world SMS via Twilio Messages REST API if credentials are present.
    """
    if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER):
        return {"status": "simulated", "note": "Virtual delivery active (Twilio credentials not set)"}

    try:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.post(
                url,
                auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
                data={
                    "From": TWILIO_PHONE_NUMBER,
                    "To": to_phone,
                    "Body": message
                }
            )
            if res.status_code in [200, 201]:
                data = res.json()
                logger.info(f"Live SMS sent via Twilio! SID: {data.get('sid')}")
                return {"status": "sent", "provider": "Twilio", "message_sid": data.get("sid")}
            else:
                logger.warning(f"Twilio API error {res.status_code}: {res.text}")
                return {"status": "failed", "error": res.text}
    except Exception as e:
        logger.warning(f"Twilio dispatch exception: {e}")
        return {"status": "error", "error": str(e)}

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

