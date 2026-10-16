import json
import logging
from typing import Dict, Any
from backend.llm_service import call_llm

logger = logging.getLogger("lawflow.agent.respondent_summary")

async def summarize_case_for_respondent(
    case_id: str,
    case_type: str,
    charge_details: str,
    hearing_date: str,
    courtroom: str,
    is_dual_party: bool = False
) -> Dict[str, Any]:
    """
    Specialized Micro-Agent: AI Respondent Case Summarizer & Rights Agent
    Translates complex judicial charges into plain language, explains rights, and guides the citizen.
    """
    system_prompt = """You are LawFlow's Citizen Legal Rights & Case Summarizer AI.
Your mission is to demystify judicial summons for everyday citizens, reduce anxiety, explain their rights in plain English, and show why confirming attendance prevents arrest warrants.

Respond in strict JSON format:
{
  "plain_english_explanation": "2-3 clear sentences explaining what this citation or case means in simple everyday terms without confusing legalese",
  "why_confirm_now": "Clear explanation of why confirming your appearance protects your driver license, credit, and prevents police bench warrant escalation",
  "your_statutory_rights": [
    "Right 1: Presumption of innocence until proven guilty",
    "Right 2: Right to present evidence and examine telemetry/officer notes",
    "Right 3: Right to apply for fine reduction or community service diversion"
  ],
  "what_to_bring_checklist": [
    "Original National Identity Card (CNIC / Passport)",
    "Copy of citation or electronic notice confirmation",
    "Any receipts, vehicle registration, or proof of compliance"
  ],
  "faq": [
    {"q": "Can I request a different date if I have an emergency?", "a": "Yes, use the 'Request Hardship Reschedule' button on this portal to submit a formal deferral request."},
    {"q": "Will an arrest warrant be issued if I confirm today?", "a": "No. Confirming your appearance formally pauses all warrant referrals and reserves your hearing slot."}
  ]
}"""

    user_prompt = f"""
Case ID: {case_id}
Case Type: {case_type}
Offense Details: {charge_details}
Hearing Date: {hearing_date}
Courtroom: {courtroom}
Is Dual-Party Criminal: {is_dual_party}
"""

    llm_output = await call_llm(system_prompt, user_prompt, temperature=0.15)
    if llm_output:
        try:
            parsed = json.loads(llm_output)
            if "plain_english_explanation" in parsed and "your_statutory_rights" in parsed:
                return parsed
        except Exception as e:
            logger.warning(f"Failed to parse LLM respondent summary: {e}")

    # High-Quality Deterministic Fallback
    return {
        "plain_english_explanation": f"You have been officially scheduled to address a {case_type} citation concerning: '{charge_details}'. The court requires an administrative check-in to resolve this matter fairly.",
        "why_confirm_now": "Confirming your appearance today protects your legal standing, pauses automated law enforcement referrals, and keeps your driving privileges in good standing.",
        "your_statutory_rights": [
            "Presumption of innocence: You have the right to contest citations and examine evidence presented by the reporting officer.",
            "Right to request alternative payment plans or judicial fine reduction based on documented hardship.",
            "Right to bring legal counsel or speak directly before the presiding magistrate in open court."
        ],
        "what_to_bring_checklist": [
            "Original National Identity Card (CNIC / Passport)",
            "Vehicle Registration or Commercial License (if applicable)",
            "Evidence or photos supporting your defense or compliance"
        ],
        "faq": [
            {"q": "What happens when I click Confirm?", "a": "Your attendance is instantly confirmed in the court docket, halting all 48h and 72h police escalation warnings."},
            {"q": "Can I reschedule if I am traveling or ill?", "a": "Yes! You can file an instant hardship reschedule request directly from this screen before the hearing."}
        ]
    }
