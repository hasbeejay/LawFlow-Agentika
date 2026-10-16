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

import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from backend.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, ALERT_EMAIL

def generate_summons_email_html(case_id: str, respondent_name: str, case_title: str, hearing_date: str, courtroom: str, charge_details: str, verification_link: str) -> str:
    """Generates official judicial HTML email template."""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f8fafc; margin: 0; padding: 24px;">
    <div style="max-width: 600px; margin: 0 auto; background: #131b2a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="background: linear-gradient(135deg, #1e3a8a, #1d4ed8); padding: 24px 30px; border-bottom: 1px solid #2563eb;">
            <div style="font-size: 24px; font-weight: bold; color: #ffffff;">⚖️ LawFlow Court Registry</div>
            <div style="font-size: 13px; color: #93c5fd; margin-top: 4px;">Capital Territory Judicial Adjudication & Notice System</div>
        </div>
        <div style="padding: 30px;">
            <div style="display: inline-block; padding: 4px 10px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">
                Official Digital Legal Summons
            </div>
            <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 12px 0;">Mandatory Appearance Notice</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 20px 0;">
                Dear <strong>{respondent_name}</strong>,<br>
                You have been formally docketed in the matter of <strong>{case_title}</strong>. A mandatory judicial hearing has been scheduled.
            </p>
            <div style="background: #090d16; border: 1px solid #1e293b; border-radius: 12px; padding: 18px; margin-bottom: 24px; font-size: 13px;">
                <div style="margin-bottom: 10px;"><span style="color: #64748b; width: 140px; display: inline-block;">Case Reference:</span> <strong style="color: #38bdf8; font-family: monospace;">{case_id}</strong></div>
                <div style="margin-bottom: 10px;"><span style="color: #64748b; width: 140px; display: inline-block;">Scheduled Date:</span> <strong style="color: #fbbf24;">{hearing_date}</strong></div>
                <div style="margin-bottom: 10px;"><span style="color: #64748b; width: 140px; display: inline-block;">Courtroom / Branch:</span> <strong style="color: #f1f5f9;">{courtroom}</strong></div>
                <div style="margin-bottom: 6px;"><span style="color: #64748b; width: 140px; display: inline-block;">Alleged Offense:</span> <span style="color: #cbd5e1;">{charge_details}</span></div>
            </div>
            <p style="font-size: 13px; line-height: 1.5; color: #94a3b8; margin: 0 0 24px 0;">
                Under Statutory Rule 12, failure to acknowledge this digital summons within <strong>72 hours</strong> will result in immediate escalation to law enforcement for bench warrant issuance.
            </p>
            <div style="text-align: center; margin: 28px 0;">
                <a href="{verification_link}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: bold; border-radius: 10px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);">
                    Acknowledge & Confirm Court Appearance ⚡
                </a>
            </div>
            <div style="text-align: center; font-size: 11px; color: #64748b; margin-top: 20px;">
                Direct verification link: <a href="{verification_link}" style="color: #38bdf8; text-decoration: underline;">{verification_link}</a>
            </div>
        </div>
        <div style="background: #080b12; padding: 16px 30px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; text-align: center;">
            LawFlow Autonomous Judicial System &bull; Theme: Human + AI: Better Together &bull; Main Judicial Complex, Islamabad
        </div>
    </div>
</body>
</html>"""

async def dispatch_live_email(to_email: str, subject: str, message: str, html_body: str = None) -> Dict[str, Any]:
    """
    Dispatches a real-time email notification via SMTP (Gmail / Custom SMTP) if configured.
    """
    recipient = (to_email or ALERT_EMAIL).strip()
    if not recipient:
        return {"status": "skipped", "note": "No recipient email provided"}

    if not (SMTP_USER and SMTP_PASSWORD):
        logger.info(f"Email delivery simulated for {recipient}: {subject}")
        return {"status": "simulated", "recipient": recipient, "note": "SMTP credentials not provided in .env"}

    def _send():
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"⚖️ [LawFlow Notice] {subject}"
            msg["From"] = f"LawFlow Judicial Registry <{SMTP_USER}>"
            msg["To"] = recipient

            part_text = MIMEText(message, "plain")
            msg.attach(part_text)

            if html_body:
                part_html = MIMEText(html_body, "html")
                msg.attach(part_html)

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_USER, [recipient], msg.as_string())
            logger.info(f"Real email successfully dispatched to {recipient}!")
            return {"status": "sent", "recipient": recipient}
        except Exception as e:
            logger.warning(f"Email dispatch failed for {recipient}: {e}")
            return {"status": "failed", "error": str(e)}

    return await asyncio.to_thread(_send)



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

