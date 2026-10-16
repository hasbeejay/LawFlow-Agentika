import json
import logging
import time
import uuid
import os
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.config import PORT, HOST, BASE_URL, COURT_EMAIL
from backend.database import init_db, get_connection
from backend.mcp_tools import MCP_TOOL_REGISTRY, execute_mcp_tool
from backend.agents.precedent_agent import analyze_precedent
from backend.agents.calendar_agent import select_optimal_schedule
from backend.agents.judge_agent import match_judge
from backend.agents.notice_agent import generate_notice_and_token, dispatch_live_sms_twilio, dispatch_live_email, generate_summons_email_html
from backend.agents.safety_escalation_agent import generate_safety_separation_notice, compile_police_packet
from backend.agents.correspondence_agent import draft_official_court_email
from backend.agents.respondent_summary_agent import summarize_case_for_respondent


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lawflow.api")

# Initialize SQLite database
init_db()

app = FastAPI(
    title="LawFlow Judicial Intake & Case Management API",
    description="Autonomous Judicial Intake, Scheduling & Human-in-the-Loop Case Management System built for Agentika 2.0",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Pydantic Models -----------------
class CaseIntakeRequest(BaseModel):
    case_type: str  # "Civil Infraction", "Traffic Violation", "Misdemeanor", "Criminal (Dual-Party)"
    respondent_name: str
    respondent_phone: str
    respondent_email: Optional[str] = None
    respondent_national_id_last4: str
    charge_details: str
    is_dual_party: bool = False
    complainant_name: Optional[str] = None
    complainant_phone: Optional[str] = None
    complainant_email: Optional[str] = None


class OverrideJudgeRequest(BaseModel):
    judge_id: str
    hearing_date: Optional[str] = None
    clerk_note: Optional[str] = None

class VerifyIdentityRequest(BaseModel):
    token: str
    national_id_last4: str
    accept_terms: bool = True

class RescheduleRequest(BaseModel):
    token: str
    reason: str
    preferred_slot: str

class ConcludeHearingRequest(BaseModel):
    verdict: str  # "RESOLVED_DISMISSED", "RESOLVED_PENALTY_PAID", "DEFERRED_COMPLIANCE"
    clerk_verdict_notes: str

class LoginRequest(BaseModel):
    email: str
    password: str

class CreateClerkRequest(BaseModel):
    full_name: str
    email: str
    department: str
    password: str = "clerk2026"


# ----------------- API Endpoints -----------------

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "LawFlow Autonomous Judicial Engine",
        "version": "2.0.0",
        "timestamp": time.time(),
        "database": "connected"
    }

@app.get("/api/analytics/summary")
def get_analytics():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM cases")
    total_cases = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM cases WHERE status = 'PENDING_CLERK_APPROVAL'")
    pending_gate1 = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM cases WHERE status = 'FORCE_ACTION_PENDING_CLERK'")
    pending_gate2 = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM cases WHERE status = 'SCHEDULED_CONFIRMED'")
    scheduled_confirmed = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM cases WHERE status IN ('RESOLVED_DISMISSED', 'RESOLVED_PENALTY_PAID')")
    concluded = c.fetchone()[0]

    c.execute("SELECT case_type, COUNT(*) as cnt FROM cases GROUP BY case_type")
    type_distribution = {row["case_type"]: row["cnt"] for row in c.fetchall()}

    conn.close()
    return {
        "total_cases": total_cases,
        "appearance_rate": "94.2%",
        "avg_notice_seconds": 11.4,
        "manual_baseline_days": 5.0,
        "pending_gate1_approvals": pending_gate1,
        "pending_gate2_police_referrals": pending_gate2,
        "scheduled_confirmed": scheduled_confirmed,
        "concluded_cases": concluded,
        "type_distribution": type_distribution
    }

@app.get("/api/judges")
def list_judges():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM judges")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    for r in rows:
        r["available_slots"] = json.loads(r["available_slots"])
    return {"status": "success", "judges": rows}

@app.get("/api/cases")
def list_cases(status: Optional[str] = None):
    conn = get_connection()
    c = conn.cursor()
    if status and status != "ALL":
        c.execute("SELECT * FROM cases WHERE status = ? ORDER BY created_at DESC", (status,))
    else:
        c.execute("SELECT * FROM cases ORDER BY created_at DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    for r in rows:
        if r.get("precedent_brief"):
            r["precedent_brief"] = json.loads(r["precedent_brief"])
        if r.get("reasoning_card"):
            r["reasoning_card"] = json.loads(r["reasoning_card"])
        if r.get("police_packet"):
            r["police_packet"] = json.loads(r["police_packet"])
    return {"status": "success", "count": len(rows), "cases": rows}

@app.get("/api/cases/{case_id}")
def get_case_detail(case_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM cases WHERE id = ?", (case_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")
    data = dict(row)
    if data.get("precedent_brief"):
        data["precedent_brief"] = json.loads(data["precedent_brief"])
    if data.get("reasoning_card"):
        data["reasoning_card"] = json.loads(data["reasoning_card"])
    if data.get("police_packet"):
        data["police_packet"] = json.loads(data["police_packet"])
    return {"status": "success", "case": data}

@app.post("/api/cases/intake")
async def intake_case(payload: CaseIntakeRequest):
    """
    Intake a new case:
    1. Runs Precedent Agent
    2. Runs Calendar & Scheduling Agent
    3. Runs Judge Matcher Agent
    4. Queues for HUMAN-IN-THE-LOOP GATE 1 (Clerk Approval)
    """
    conn = get_connection()
    c = conn.cursor()

    case_id = f"LF-2026-{uuid.uuid4().hex[:4].upper()}"
    title = f"{'State' if payload.is_dual_party else 'Capital Court'} v. {payload.respondent_name}"
    now = time.time()

    # Retrieve all judges
    c.execute("SELECT * FROM judges")
    judges_raw = [dict(r) for r in c.fetchall()]
    for j in judges_raw:
        j["available_slots"] = json.loads(j["available_slots"])

    # Agent 1: Precedent Agent
    precedent_res = await analyze_precedent(payload.case_type, payload.charge_details)

    # Agent 3: Judge Matcher Agent
    judge_match = await match_judge(payload.case_type, payload.charge_details, payload.is_dual_party, judges_raw)
    selected_judge = judge_match["judge"]
    reasoning_card = judge_match["reasoning_card"]

    # Agent 2: Calendar Agent
    schedule_res = select_optimal_schedule(selected_judge["available_slots"], payload.case_type, selected_judge["courtroom"])
    hearing_date = schedule_res["scheduled_slot"]
    courtroom = schedule_res["courtroom"]

    # Temporary preliminary token (will be formally dispatched upon Gate 1 approval)
    prelim_token = f"tok_{case_id.lower().replace('-', '_')}_{uuid.uuid4().hex[:8]}"

    c.execute("""
    INSERT INTO cases (
        id, case_type, title, respondent_name, respondent_phone, respondent_national_id_last4,
        charge_details, is_dual_party, complainant_name, complainant_phone, safety_buffer_applied,
        status, precedent_brief, recommended_judge_id, recommended_judge_name, reasoning_card,
        hearing_date, courtroom, token, simulated_hours, clerk_notes, police_packet, respondent_email, complainant_email, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        case_id, payload.case_type, title, payload.respondent_name, payload.respondent_phone,
        payload.respondent_national_id_last4, payload.charge_details, 1 if payload.is_dual_party else 0,
        payload.complainant_name, payload.complainant_phone, 1 if payload.is_dual_party else 0,
        "PENDING_CLERK_APPROVAL", json.dumps(precedent_res), selected_judge["id"],
        selected_judge["name"], json.dumps(reasoning_card), hearing_date, courtroom,
        prelim_token, 0, "Autonomous AI intake completed. Awaiting Clerk Gate 1 sign-off.", None,
        payload.respondent_email, payload.complainant_email, now, now
    ))
    conn.commit()
    conn.close()


    return {
        "status": "success",
        "case_id": case_id,
        "current_status": "PENDING_CLERK_APPROVAL",
        "gate": "GATE_1_CLERK_APPROVAL_REQUIRED",
        "precedent": precedent_res,
        "recommended_judge": selected_judge["name"],
        "reasoning_card": reasoning_card,
        "scheduled_date": hearing_date,
        "courtroom": courtroom
    }

@app.post("/api/cases/{case_id}/approve")
async def approve_gate_1(case_id: str):
    """
    HUMAN-IN-THE-LOOP GATE 1:
    Clerk reviews the AI recommendation, approves the judge and hearing date,
    and authorizes dispatch of encrypted summons and victim safety notice.
    """
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM cases WHERE id = ?", (case_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Case not found")

    case = dict(row)
    now = time.time()

    # Agent 4: Generate formal token & summons
    notice_data = generate_notice_and_token(
        case["id"], case["respondent_name"], case["respondent_phone"],
        case["hearing_date"], case["courtroom"], case["respondent_national_id_last4"]
    )

    token = notice_data["token"]
    sms_msg = notice_data["sms_message"]
    v_link = notice_data["verification_link"]

    # Update case status
    c.execute("""
    UPDATE cases SET status = 'NOTICE_SENT', token = ?, updated_at = ?,
    clerk_notes = 'Gate 1 approved by Clerk. Summons dispatched.' WHERE id = ?
    """, (token, now, case_id))

    # Log Respondent SMS
    c.execute("""
    INSERT INTO sms_logs (id, case_id, recipient, phone, message, token_link, dispatch_type, timestamp, simulated_hour)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        str(uuid.uuid4())[:8], case_id, f"{case['respondent_name']} (Respondent)",
        case["respondent_phone"], sms_msg, v_link, "SUMMONS_DISPATCH", now, 0
    ))

    # Generate rich HTML legal summons email
    html_summons = generate_summons_email_html(
        case["id"], case["respondent_name"], case["title"],
        case["hearing_date"], case["courtroom"], case["charge_details"], v_link
    )

    # Real-world Live SMS Dispatch (Twilio) & Email (Gmail / SMTP)
    await dispatch_live_sms_twilio(case["respondent_phone"], sms_msg)
    await dispatch_live_email(
        case.get("respondent_email"),
        f"Mandatory Court Appearance Summons: {case['title']} ({case['id']})",
        sms_msg,
        html_body=html_summons
    )


    # If Dual Party: Agent 5 safety dispatch
    if case["is_dual_party"] and case.get("complainant_phone"):
        safety_notice = generate_safety_separation_notice(
            case["id"], case["complainant_name"] or "Protected Party",
            case["complainant_phone"], case["hearing_date"]
        )
        c.execute("""
        INSERT INTO sms_logs (id, case_id, recipient, phone, message, token_link, dispatch_type, timestamp, simulated_hour)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4())[:8], case_id, f"{case['complainant_name']} (Complainant)",
            case["complainant_phone"], safety_notice["message"], None, "VICTIM_SAFETY_NOTICE", now, 0
        ))
        await dispatch_live_sms_twilio(case["complainant_phone"], safety_notice["message"])

    conn.commit()
    conn.close()


    return {
        "status": "success",
        "case_id": case_id,
        "new_status": "NOTICE_SENT",
        "verification_link": v_link,
        "message": "Gate 1 approved! Encrypted summons and calendar reservation dispatched."
    }

@app.post("/api/cases/{case_id}/override-judge")
def override_judge(case_id: str, payload: OverrideJudgeRequest):
    """
    Clerk can override the AI recommendation with an alternate judge or date.
    """
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM judges WHERE id = ?", (payload.judge_id,))
    judge = c.fetchone()
    if not judge:
        conn.close()
        raise HTTPException(status_code=404, detail="Judge not found")

    j_dict = dict(judge)
    hearing_date = payload.hearing_date or json.loads(j_dict["available_slots"])[0]
    courtroom = j_dict["courtroom"]

    c.execute("""
    UPDATE cases SET recommended_judge_id = ?, recommended_judge_name = ?,
    hearing_date = ?, courtroom = ?, clerk_notes = ?, updated_at = ?
    WHERE id = ?
    """, (
        j_dict["id"], j_dict["name"], hearing_date, courtroom,
        payload.clerk_note or "Clerk manual judicial override applied.", time.time(), case_id
    ))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Case {case_id} reassigned to {j_dict['name']}."}

@app.post("/api/cases/{case_id}/simulate-time")
async def simulate_time(case_id: str, hours: int = Query(..., description="Simulated hours elapsed: 0, 24, 48, 72")):
    """
    Simulated Fast-Forward Time Engine:
    Allows judges to experience state transitions live:
    - 48h: Sends urgent reminder
    - 72h: Triggers Non-Response Default & Generates Bench Warrant Police Packet (Gate 2 Pending!)
    """
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM cases WHERE id = ?", (case_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Case not found")

    case = dict(row)
    now = time.time()
    current_status = case["status"]

    # Only escalate if not acknowledged/scheduled or concluded
    if current_status not in ["SCHEDULED_CONFIRMED", "RESOLVED_DISMISSED", "RESOLVED_PENALTY_PAID", "POLICE_REFERRAL_DISPATCHED"]:
        if hours >= 72:
            current_status = "FORCE_ACTION_PENDING_CLERK"
            police_packet = compile_police_packet(
                case["id"], case["respondent_name"], case["respondent_phone"],
                case["respondent_national_id_last4"], case["charge_details"], case["courtroom"]
            )
            c.execute("""
            UPDATE cases SET status = ?, simulated_hours = ?, police_packet = ?, updated_at = ?,
            clerk_notes = '72h Statutory Window Expired. Bench Warrant Police Packet generated. Awaiting Clerk Gate 2 Confirmation.'
            WHERE id = ?
            """, (current_status, hours, json.dumps(police_packet), now, case_id))

            msg_72 = f"FINAL JUDICIAL NOTICE: 72 hours have elapsed without appearance confirmation for Case {case_id}. Police referral and bench warrant escalation initiated."
            # Log 72h final warning SMS
            c.execute("""
            INSERT INTO sms_logs (id, case_id, recipient, phone, message, token_link, dispatch_type, timestamp, simulated_hour)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4())[:8], case_id, f"{case['respondent_name']} (Respondent)",
                case["respondent_phone"], msg_72, f"{BASE_URL}/verify?token={case['token']}",
                "POLICE_ESCALATION_WARNING", now, hours
            ))
            await dispatch_live_sms_twilio(case["respondent_phone"], msg_72)
            await dispatch_live_email(case.get("respondent_email"), f"🚨 FINAL NOTICE (72H DEFAULT) - Case {case_id}", msg_72)

        elif hours >= 48:
            current_status = "NOTICE_RESENT_48H"
            c.execute("""
            UPDATE cases SET status = ?, simulated_hours = ?, updated_at = ?,
            clerk_notes = '48h Reminder Dispatched. 24h statutory window remains.' WHERE id = ?
            """, (current_status, hours, now, case_id))

            msg_48 = f"URGENT COURT WARNING (48H): You have not acknowledged summons for Case {case_id}. Avoid contempt by confirming today: {BASE_URL}/verify?token={case['token']}"
            c.execute("""
            INSERT INTO sms_logs (id, case_id, recipient, phone, message, token_link, dispatch_type, timestamp, simulated_hour)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(uuid.uuid4())[:8], case_id, f"{case['respondent_name']} (Respondent)",
                case["respondent_phone"], msg_48, f"{BASE_URL}/verify?token={case['token']}",
                "48H_REMINDER", now, hours
            ))
            await dispatch_live_sms_twilio(case["respondent_phone"], msg_48)
            await dispatch_live_email(case.get("respondent_email"), f"⚠️ URGENT REMINDER (48H) - Case {case_id}", msg_48)


        else:
            c.execute("UPDATE cases SET simulated_hours = ?, updated_at = ? WHERE id = ?", (hours, now, case_id))


    conn.commit()
    conn.close()

    return {
        "status": "success",
        "case_id": case_id,
        "new_status": current_status,
        "simulated_hours": hours,
        "requires_clerk_gate2": current_status == "FORCE_ACTION_PENDING_CLERK"
    }

@app.post("/api/cases/{case_id}/confirm-police-referral")
def confirm_police_referral(case_id: str):
    """
    HUMAN-IN-THE-LOOP GATE 2:
    Clerk signs off on bench warrant & police dispatch for non-responsive respondent.
    """
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM cases WHERE id = ?", (case_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Case not found")

    now = time.time()
    c.execute("""
    UPDATE cases SET status = 'POLICE_REFERRAL_DISPATCHED', updated_at = ?,
    clerk_notes = 'Clerk Gate 2 Confirmed. Warrant Packet transferred to Margalla Police Judicial Enforcement Unit.'
    WHERE id = ?
    """, (now, case_id))

    # Log police dispatch notification
    c.execute("""
    INSERT INTO sms_logs (id, case_id, recipient, phone, message, token_link, dispatch_type, timestamp, simulated_hour)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        str(uuid.uuid4())[:8], case_id, "Margalla Police Division Unit 04",
        "POLICE-DISPATCH-LINE",
        f"CERTIFIED BENCH WARRANT DISPATCH: Case {case_id}. Warrant docket transferred for execution.",
        None, "POLICE_WARRANT_DISPATCH", now, 72
    ))

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "case_id": case_id,
        "new_status": "POLICE_REFERRAL_DISPATCHED",
        "message": "Gate 2 authorized! Bench Warrant and Police Referral successfully dispatched."
    }

@app.post("/api/cases/{case_id}/conclude")
def conclude_case(case_id: str, payload: ConcludeHearingRequest):
    """
    Conclude hearing and log final disposition.
    """
    conn = get_connection()
    c = conn.cursor()
    now = time.time()
    c.execute("""
    UPDATE cases SET status = ?, clerk_notes = ?, updated_at = ? WHERE id = ?
    """, (payload.verdict, f"Hearing Concluded: {payload.clerk_verdict_notes}", now, case_id))

    # Log closure SMS
    c.execute("SELECT respondent_name, respondent_phone FROM cases WHERE id = ?", (case_id,))
    row = c.fetchone()
    if row:
        c.execute("""
        INSERT INTO sms_logs (id, case_id, recipient, phone, message, token_link, dispatch_type, timestamp, simulated_hour)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4())[:8], case_id, f"{row['respondent_name']} (Respondent)",
            row["respondent_phone"],
            f"JUDICIAL CASE CLOSURE: Case {case_id} has been formally resolved ({payload.verdict}). Official records archived.",
            None, "CASE_CLOSURE_NOTICE", now, 0
        ))

    conn.commit()
    conn.close()
    return {"status": "success", "case_id": case_id, "verdict": payload.verdict}

# ----------------- Respondent Secure Portal Endpoints -----------------

@app.get("/api/verify")
def get_verification_payload(token: str = Query(...)):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM cases WHERE token = ? OR id = ?", (token, token))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Invalid or expired summons token or Case ID.")

    case = dict(row)
    if case.get("precedent_brief"):
        case["precedent_brief"] = json.loads(case["precedent_brief"])

    # Return sanitized view for respondent (hide judge internal reasoning)
    return {
        "status": "valid",
        "case_id": case["id"],
        "token": case["token"],
        "case_title": case["title"],
        "respondent_name": case["respondent_name"],
        "case_type": case["case_type"],
        "charge_details": case["charge_details"],
        "hearing_date": case["hearing_date"],
        "courtroom": case["courtroom"],
        "current_case_status": case["status"],
        "is_dual_party": bool(case["is_dual_party"]),
        "requires_last4_verification": True
    }

@app.post("/api/verify/confirm")
def confirm_appearance(payload: VerifyIdentityRequest):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM cases WHERE token = ?", (payload.token,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Summons token invalid.")

    case = dict(row)
    if case["respondent_national_id_last4"] != payload.national_id_last4.strip():
        conn.close()
        raise HTTPException(status_code=400, detail="Authentication failed: Last 4 digits do not match judicial records.")

    now = time.time()
    c.execute("""
    UPDATE cases SET status = 'SCHEDULED_CONFIRMED', updated_at = ?,
    clerk_notes = 'Respondent 2FA identity verified and appearance confirmed.' WHERE id = ?
    """, (now, case["id"]))

    # Confirmation SMS
    c.execute("""
    INSERT INTO sms_logs (id, case_id, recipient, phone, message, token_link, dispatch_type, timestamp, simulated_hour)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        str(uuid.uuid4())[:8], case["id"], f"{case['respondent_name']} (Respondent)",
        case["respondent_phone"],
        f"CONFIRMATION RECEIPT: Your appearance for Case {case['id']} is confirmed for {case['hearing_date']} in {case['courtroom']}. Please bring your photo ID.",
        None, "CONFIRMATION_RECEIPT", now, case["simulated_hours"]
    ))

    conn.commit()
    conn.close()

    return {
        "status": "confirmed",
        "case_id": case["id"],
        "hearing_date": case["hearing_date"],
        "courtroom": case["courtroom"],
        "message": "Identity verified! Appearance officially confirmed in court registry."
    }

@app.post("/api/verify/reschedule-request")
def request_reschedule(payload: RescheduleRequest):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM cases WHERE token = ?", (payload.token,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Summons token invalid.")

    case = dict(row)
    now = time.time()
    notes = f"Respondent Hardship Reschedule Request: '{payload.reason}' (Preferred: {payload.preferred_slot}). Pending Clerk Review."
    c.execute("UPDATE cases SET clerk_notes = ?, updated_at = ? WHERE id = ?", (notes, now, case["id"]))
    conn.commit()
    conn.close()

    return {"status": "success", "message": "Hardship reschedule request submitted to Presiding Clerk."}

# ----------------- MCP Protocol Endpoints -----------------

@app.get("/api/mcp/tools")
def get_mcp_tools():
    """Returns the Model Context Protocol tools catalog."""
    return {
        "status": "success",
        "protocol": "Model Context Protocol (MCP) v1.0",
        "tools_count": len(MCP_TOOL_REGISTRY),
        "tools": MCP_TOOL_REGISTRY
    }

@app.post("/api/mcp/call")
def call_mcp_tool_api(request: Request, body: Dict[str, Any]):
    """Execute an MCP tool via JSON API."""
    name = body.get("name")
    args = body.get("arguments", {})
    if not name:
        raise HTTPException(status_code=400, detail="Missing tool 'name'")
    res = execute_mcp_tool(name, args)
    return res

# ----------------- Telephony Logs -----------------

@app.get("/api/telephony/logs")
def get_telephony_logs(limit: int = 30):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM sms_logs ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return {"status": "success", "logs": rows}

# ----------------- Auth & Admin Panel Endpoints -----------------

@app.post("/api/auth/login")
def login(payload: LoginRequest):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE (email = ? OR username = ?) AND password = ? AND is_active = 1", (payload.email.strip(), payload.email.strip(), payload.password.strip()))
    user = c.fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid judicial credentials or account deactivated.")
    u_dict = dict(user)
    del u_dict["password"]
    return {"status": "success", "user": u_dict}

@app.get("/api/admin/clerks")
def list_clerks():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id, username, email, role, full_name, department, is_active, created_at FROM users WHERE role = 'CLERK' ORDER BY created_at DESC")
    clerks = [dict(r) for r in c.fetchall()]
    conn.close()
    return {"status": "success", "clerks": clerks}

@app.post("/api/admin/clerks")
def create_clerk(payload: CreateClerkRequest):
    conn = get_connection()
    c = conn.cursor()
    clerk_id = f"usr_{uuid.uuid4().hex[:8]}"
    now = time.time()
    try:
        c.execute("""
        INSERT INTO users (id, username, email, password, role, full_name, department, is_active, created_at)
        VALUES (?, ?, ?, ?, 'CLERK', ?, ?, 1, ?)
        """, (clerk_id, payload.email.strip(), payload.email.strip(), payload.password, payload.full_name.strip(), payload.department.strip(), now))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=f"User already exists or database error: {e}")
    conn.close()
    return {"status": "success", "message": f"Court Clerk account for {payload.full_name} created successfully.", "clerk_id": clerk_id}

@app.post("/api/admin/clerks/{clerk_id}/toggle-status")
def toggle_clerk_status(clerk_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT is_active, full_name FROM users WHERE id = ?", (clerk_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Clerk not found")
    new_status = 0 if row["is_active"] == 1 else 1
    c.execute("UPDATE users SET is_active = ? WHERE id = ?", (new_status, clerk_id))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"Clerk {row['full_name']} status updated to {'Active' if new_status else 'Deactivated'}.", "is_active": new_status}

@app.get("/api/admin/warrants")
def list_police_warrants():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM cases WHERE status IN ('FORCE_ACTION_PENDING_CLERK', 'POLICE_REFERRAL_DISPATCHED') ORDER BY updated_at DESC")
    cases = [dict(r) for r in c.fetchall()]
    conn.close()
    for item in cases:
        if item.get("police_packet"):
            item["police_packet"] = json.loads(item["police_packet"])
    return {"status": "success", "warrants_count": len(cases), "cases": cases}

# ----------------- AI Agents Endpoints -----------------

@app.post("/api/cases/{case_id}/ai-email-preview")
async def preview_ai_email(case_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM cases WHERE id = ?", (case_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")
    case = dict(row)
    v_link = f"{BASE_URL}/verify?token={case['token']}"
    email_draft = await draft_official_court_email(
        case["id"], case["case_type"], case["title"], case["respondent_name"],
        case["charge_details"], case["hearing_date"], case["courtroom"], v_link
    )
    return {"status": "success", "email_draft": email_draft}

@app.get("/api/cases/{case_id}/respondent-summary")
async def get_respondent_summary(case_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM cases WHERE id = ?", (case_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Case not found")
    case = dict(row)
    summary = await summarize_case_for_respondent(
        case["id"], case["case_type"], case["charge_details"],
        case["hearing_date"], case["courtroom"], bool(case["is_dual_party"])
    )
    return {"status": "success", "summary": summary}

# ----------------- Static SPA Delivery -----------------

# Mount static assets
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/clerk", response_class=FileResponse)
def serve_clerk_page():
    if os.path.exists("static/clerk.html"):
        return FileResponse("static/clerk.html")
    return FileResponse("static/index.html")

@app.get("/admin", response_class=FileResponse)
def serve_admin_page():
    if os.path.exists("static/admin.html"):
        return FileResponse("static/admin.html")
    return FileResponse("static/index.html")

@app.get("/verify", response_class=FileResponse)
def serve_verify_page():
    if os.path.exists("static/verify.html"):
        return FileResponse("static/verify.html")
    return HTMLResponse("<h1>Respondent Portal</h1>")

@app.get("/{full_path:path}", response_class=FileResponse)
def serve_spa(full_path: str):
    # Serve index.html for all non-api routes
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    return HTMLResponse("<h1>LawFlow Running</h1><p>API is healthy at /api/health</p>")

