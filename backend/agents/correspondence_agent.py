import json
import logging
from typing import Dict, Any
from backend.llm_service import call_llm
from backend.config import COURT_EMAIL, BASE_URL

logger = logging.getLogger("lawflow.agent.correspondence")

async def draft_official_court_email(
    case_id: str,
    case_type: str,
    title: str,
    respondent_name: str,
    charge_details: str,
    hearing_date: str,
    courtroom: str,
    verification_link: str
) -> Dict[str, Any]:
    """
    Specialized Micro-Agent: AI Legal Correspondence Drafter
    Drafts a fully formatted, authoritative judicial notice from the official court email.
    """
    system_prompt = f"""You are LawFlow's Senior Judicial Correspondence Drafter for the Capital Territory Court Registry.
Official Court Sender: {COURT_EMAIL}

Draft an official, highly authoritative yet clear Legal Summons Email in strict JSON format:
{{
  "subject": "Mandatory Court Appearance Summons: [Case Title] - [Case ID]",
  "sender_display": "Capital Territory Court Registry <{COURT_EMAIL}>",
  "opening_salutation": "Official Legal Summons for [Respondent Name]",
  "case_statement": "Formal legal description of charges and statutory requirement to appear",
  "hearing_advisory": "Explicit date, courtroom, and time details",
  "legal_consequences": "Explicit warning regarding Rule 12 Bench Warrant and Law Enforcement dispatch upon 72h default",
  "action_instructions": "Step-by-step instructions for 2FA identity confirmation via the secure portal",
  "full_plain_text": "Complete, impeccably formatted plain-text email with official headers and footer",
  "full_html_body": "Clean, modern responsive HTML email body with court header, dark accents, and call-to-action button"
}}"""

    user_prompt = f"""
Case ID: {case_id}
Case Type: {case_type}
Case Title: {title}
Respondent: {respondent_name}
Charges: {charge_details}
Hearing Date: {hearing_date}
Courtroom: {courtroom}
Verification Link: {verification_link}
Official Sender Email: {COURT_EMAIL}
"""

    llm_output = await call_llm(system_prompt, user_prompt, temperature=0.1)
    if llm_output:
        try:
            parsed = json.loads(llm_output)
            if "subject" in parsed and "full_html_body" in parsed:
                return parsed
        except Exception as e:
            logger.warning(f"Failed to parse LLM correspondence draft: {e}")

    # Deterministic High-Quality Fallback Template
    subject = f"⚖️ OFFICIAL JUDICIAL SUMMONS: {title} ({case_id})"
    plain_text = f"""OFFICIAL LEGAL NOTICE & SUMMONS TO APPEAR
Capital Territory Judicial Registry
Official Dispatch: {COURT_EMAIL}
--------------------------------------------------------------------------------

CASE REFERENCE: {case_id}
MATTER: {title}
RESPONDENT: {respondent_name}

MANDATORY HEARING DETAILS:
Date & Time: {hearing_date}
Courtroom: {courtroom}
Alleged Offense: {charge_details}

LEGAL ADVISORY & STATUTORY NOTICE:
You are hereby commanded to acknowledge receipt of this official summons. Failure to confirm your attendance within 72 hours of notice dispatch will result in immediate issuance of a Bench Warrant and referral to the Margalla Police Judicial Enforcement Unit under Contempt of Summons Rule 12.

ONLINE 2FA ACKNOWLEDGMENT:
Please verify your identity using the last 4 digits of your National Identity Document at the following secure URL:
{verification_link}

By Order of the Presiding Clerk,
Capital Territory Judicial Adjudication Complex
Sender: {COURT_EMAIL}
"""

    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #07090e; color: #f8fafc; margin: 0; padding: 24px;">
    <div style="max-width: 620px; margin: 0 auto; background: #0f1523; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.6);">
        <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 24px 32px; border-bottom: 2px solid #3b82f6;">
            <div style="font-size: 22px; font-weight: 800; color: #ffffff;">⚖️ Capital Territory Court Registry</div>
            <div style="font-size: 13px; color: #bfdbfe; margin-top: 4px;">Official Judicial Adjudication & Notice Service &bull; <span style="font-family: monospace;">{COURT_EMAIL}</span></div>
        </div>
        <div style="padding: 32px;">
            <div style="display: inline-block; padding: 4px 12px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 18px;">
                Official Digital Legal Summons
            </div>
            <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 14px 0;">Mandatory Appearance Summons</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 20px 0;">
                Dear <strong>{respondent_name}</strong>,<br>
                Formal judicial proceedings have been docketed regarding <strong>{title}</strong>. You are required by law to appear before the presiding magistrate.
            </p>
            <div style="background: #080c14; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 24px; font-size: 13px;">
                <div style="margin-bottom: 10px;"><span style="color: #64748b; width: 140px; display: inline-block;">Case Reference:</span> <strong style="color: #38bdf8; font-family: monospace;">{case_id}</strong></div>
                <div style="margin-bottom: 10px;"><span style="color: #64748b; width: 140px; display: inline-block;">Scheduled Date:</span> <strong style="color: #fbbf24;">{hearing_date}</strong></div>
                <div style="margin-bottom: 10px;"><span style="color: #64748b; width: 140px; display: inline-block;">Assigned Chamber:</span> <strong style="color: #f1f5f9;">{courtroom}</strong></div>
                <div style="margin-bottom: 6px;"><span style="color: #64748b; width: 140px; display: inline-block;">Charge Details:</span> <span style="color: #cbd5e1;">{charge_details}</span></div>
            </div>
            <div style="background: rgba(244, 63, 94, 0.1); border-left: 4px solid #f43f5e; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; font-size: 12px; color: #fecdd3; line-height: 1.5;">
                <strong>Statutory Notice:</strong> Under Court Rule 12, failure to acknowledge this summons within 72 hours triggers automated Bench Warrant generation and referral to police enforcement units.
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verification_link}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: bold; border-radius: 10px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);">
                    Acknowledge & Confirm Court Appearance ⚡
                </a>
            </div>
            <div style="text-align: center; font-size: 11px; color: #64748b; margin-top: 20px;">
                Secure link: <a href="{verification_link}" style="color: #38bdf8; text-decoration: underline;">{verification_link}</a>
            </div>
        </div>
        <div style="background: #080c14; padding: 16px 32px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; text-align: center;">
            Capital Territory Judicial Complex &bull; Official Dispatch: {COURT_EMAIL} &bull; Human + AI: Better Together
        </div>
    </div>
</body>
</html>"""

    return {
        "subject": subject,
        "sender_display": f"Capital Territory Court Registry <{COURT_EMAIL}>",
        "opening_salutation": f"Official Legal Summons for {respondent_name}",
        "case_statement": f"Formal legal proceedings docketed for {case_type}: {charge_details}",
        "hearing_advisory": f"Scheduled for {hearing_date} in {courtroom}",
        "legal_consequences": "72-hour default triggers automated Bench Warrant referral to Margalla Police Division.",
        "action_instructions": "Verify identity via 2FA using last 4 digits of National ID/CNIC.",
        "full_plain_text": plain_text,
        "full_html_body": html_body
    }
