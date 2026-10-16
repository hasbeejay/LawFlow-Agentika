import sqlite3
import json
import time
import uuid
from typing import List, Dict, Any, Optional

DB_FILE = "lawflow.db"

def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Cases Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        case_type TEXT NOT NULL,
        title TEXT NOT NULL,
        respondent_name TEXT NOT NULL,
        respondent_phone TEXT NOT NULL,
        respondent_national_id_last4 TEXT NOT NULL,
        charge_details TEXT NOT NULL,
        is_dual_party INTEGER DEFAULT 0,
        complainant_name TEXT,
        complainant_phone TEXT,
        safety_buffer_applied INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        precedent_brief TEXT,
        recommended_judge_id TEXT,
        recommended_judge_name TEXT,
        reasoning_card TEXT,
        hearing_date TEXT,
        courtroom TEXT,
        token TEXT UNIQUE NOT NULL,
        simulated_hours INTEGER DEFAULT 0,
        clerk_notes TEXT,
        police_packet TEXT,
        created_at REAL,
        updated_at REAL
    )
    """)

    # Judges Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS judges (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        specialization TEXT NOT NULL,
        disposition_rate TEXT NOT NULL,
        current_active_cases INTEGER DEFAULT 0,
        courtroom TEXT NOT NULL,
        available_slots TEXT NOT NULL
    )
    """)

    # SMS Dispatch Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sms_logs (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        recipient TEXT NOT NULL,
        phone TEXT NOT NULL,
        message TEXT NOT NULL,
        token_link TEXT,
        dispatch_type TEXT NOT NULL,
        timestamp REAL,
        simulated_hour INTEGER DEFAULT 0
    )
    """)

    conn.commit()

    # Seed Judges if empty
    cursor.execute("SELECT COUNT(*) FROM judges")
    if cursor.fetchone()[0] == 0:
        seed_judges(cursor)

    # Seed Cases if empty
    cursor.execute("SELECT COUNT(*) FROM cases")
    if cursor.fetchone()[0] == 0:
        seed_cases(cursor)

    conn.commit()
    conn.close()

def seed_judges(cursor):
    judges = [
        (
            "j1",
            "Hon. Justice Sarah Jenkins",
            "Presiding Municipal Magistrate",
            "Traffic & Municipal Infractions",
            "94.2%",
            14,
            "Courtroom 3B (Floor 3)",
            json.dumps(["2026-10-24 09:30", "2026-10-24 14:00", "2026-10-25 10:30", "2026-10-26 11:00"])
        ),
        (
            "j2",
            "Hon. Justice Michael Chang",
            "Senior District Magistrate",
            "Misdemeanors & Commercial Law",
            "89.5%",
            19,
            "Courtroom 4A (Floor 4)",
            json.dumps(["2026-10-25 09:00", "2026-10-25 13:30", "2026-10-27 10:00", "2026-10-27 15:00"])
        ),
        (
            "j3",
            "Hon. Justice Ayla Tariq",
            "Specialized Criminal & Safety Magistrate",
            "Criminal Dual-Party & Domestic Safety",
            "92.8%",
            11,
            "Courtroom 1C (High-Security Wing)",
            json.dumps(["2026-10-26 09:00", "2026-10-26 11:30", "2026-10-28 10:00", "2026-10-28 14:00"])
        ),
        (
            "j4",
            "Hon. Justice David Vance",
            "Senior Circuit Judge",
            "General Docket & Public Safety",
            "87.3%",
            23,
            "Courtroom 2D (Floor 2)",
            json.dumps(["2026-10-27 09:30", "2026-10-27 14:00", "2026-10-29 11:00"])
        )
    ]
    cursor.executemany("""
    INSERT INTO judges (id, name, title, specialization, disposition_rate, current_active_cases, courtroom, available_slots)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, judges)

def seed_cases(cursor):
    now = time.time()
    
    # Precedent briefs & reasoning cards
    brief_1 = {
        "statutory_basis": "Motor Vehicle Act § 128-B: Extreme Speed Infraction (Exceeding 45mph over posted zone).",
        "citation": "Capital Territory v. Malik (2024) 3 SLR 412.",
        "analysis": "Standard civil penalty applies ($250-$400). First offense with clear telemetry evidence. Mandatory safety appearance required.",
        "confidence_score": 96.5,
        "recommended_resolution": "Expedited Pre-Trial Diversion or Fine with 30-day compliance window."
    }
    
    reasoning_1 = {
        "match_score": 95,
        "primary_factors": [
            {"factor": "Specialization Match", "weight": "35%", "score": 98, "detail": "Directly matches Traffic & Municipal Infraction docket."},
            {"factor": "Disposition Efficiency", "weight": "25%", "score": 94, "detail": "Justice Jenkins averages 11.2 days to resolution (Court avg: 24 days)."},
            {"factor": "Workload Balance", "weight": "20%", "score": 91, "detail": "Lowest active caseload in municipal division (14 cases)."},
            {"factor": "Conflict Check", "weight": "20%", "score": 100, "detail": "No recusals or party conflicts discovered."}
        ],
        "rationale": "Recommended Justice Jenkins due to superior disposition speed in rapid-traffic adjudication and immediate slot availability."
    }

    brief_2 = {
        "statutory_basis": "Penal Code § 243(e)(1): Dual-Party Domestic Altercation with Civil Restraining Protective Flag.",
        "citation": "State v. Arshad & Parveen (2025) 2 PLD 180.",
        "analysis": "Dual-party criminal stream detected. Mandatory safety protocols apply. Complainant requires automated protective order rights notice.",
        "confidence_score": 94.0,
        "recommended_resolution": "In-person evidentiary hearing with 45-minute staggered arrival corridor buffer."
    }

    reasoning_2 = {
        "match_score": 97,
        "primary_factors": [
            {"factor": "Safety & Protocol Clearance", "weight": "40%", "score": 99, "detail": "Justice Tariq leads High-Security Criminal Wing with automated victim escort protocols."},
            {"factor": "Corridor Buffer Enforcement", "weight": "30%", "score": 96, "detail": "Courtroom 1C features dual separate waiting holding areas."},
            {"factor": "Workload Balance", "weight": "15%", "score": 92, "detail": "11 active matters."},
            {"factor": "Conflict Check", "weight": "15%", "score": 100, "detail": "Clean clearance."}
        ],
        "rationale": "High-security courtroom allocation required. Justice Tariq possesses active clearance for protective orders."
    }

    brief_3 = {
        "statutory_basis": "Municipal Health Code § 44-A: Commercial Waste Discharge Violation.",
        "citation": "Metropolitan Board v. Apex Logistics (2023) 1 KLR 98.",
        "analysis": "Secondary commercial offense. Fines double after 72 hours of unverified service.",
        "confidence_score": 91.0,
        "recommended_resolution": "Conditional settlement upon certified sanitation audit."
    }

    reasoning_3 = {
        "match_score": 90,
        "primary_factors": [
            {"factor": "Specialization Match", "weight": "35%", "score": 92, "detail": "Commercial code violation expertise."},
            {"factor": "Disposition Efficiency", "weight": "25%", "score": 89, "detail": "High resolution rate on corporate citations."},
            {"factor": "Workload Balance", "weight": "20%", "score": 88, "detail": "Acceptable active calendar."},
            {"factor": "Conflict Check", "weight": "20%", "score": 100, "detail": "Clean."}
        ],
        "rationale": "Justice Chang handles municipal compliance disputes with standard corporate pre-trial conferences."
    }

    brief_4 = {
        "statutory_basis": "Penal Code § 602: Criminal Trespass & Property Non-Compliance.",
        "citation": "People v. Brennan (2024) 47 CR 502.",
        "analysis": "Repeat citation with non-appearance on initial summons. Immediate warrant referral authorized upon 72-hour notice default.",
        "confidence_score": 93.5,
        "recommended_resolution": "Law Enforcement Bench Warrant Package."
    }

    reasoning_4 = {
        "match_score": 91,
        "primary_factors": [
            {"factor": "Specialization Match", "weight": "35%", "score": 90, "detail": "Criminal misdemeanor docket."},
            {"factor": "Workload", "weight": "30%", "score": 89, "detail": "Slot availability within 10 days."},
            {"factor": "Warrant Jurisdiction", "weight": "20%", "score": 95, "detail": "Active magistrate signature authority."},
            {"factor": "Conflict Check", "weight": "15%", "score": 100, "detail": "Clean."}
        ],
        "rationale": "Justice Vance assigned for expedited warrant signing jurisdiction."
    }

    cases = [
        # Case 1: Ready for Clerk Gate 1 Approval
        (
            "LF-2026-1042",
            "Traffic Violation",
            "Capital Territory v. Tariq Rehman",
            "Tariq Rehman",
            "+92 300 555 1823",
            "4821",
            "Excessive speed detected via electronic radar on Kashmir Highway (115 km/h in 65 km/h zone). Failure to pay roadside fine within 7-day citation grace window.",
            0, None, None, 0,
            "PENDING_CLERK_APPROVAL",
            json.dumps(brief_1),
            "j1", "Hon. Justice Sarah Jenkins",
            json.dumps(reasoning_1),
            "2026-10-24 09:30",
            "Courtroom 3B (Floor 3)",
            "tok_rehman_1042",
            0,
            "Radar telemetry verified by Traffic Warden Unit 4. Awaiting Clerk Gate 1 confirmation to dispatch encrypted summons.",
            None,
            now - 3600,
            now
        ),
        # Case 2: Dual-Party Criminal Case, Approved, Notice Sent (+0h)
        (
            "LF-2026-2095",
            "Criminal (Dual-Party)",
            "State v. Kamran Sheikh [Complainant: Zoya Sheikh]",
            "Kamran Sheikh",
            "+92 333 991 4421",
            "7190",
            "Allegation of verbal harassment and physical intimidation under Penal Code § 243(e)(1). Complainant filed emergency protective petition.",
            1, "Zoya Sheikh", "+92 321 883 1190", 1,
            "NOTICE_SENT",
            json.dumps(brief_2),
            "j3", "Hon. Justice Ayla Tariq",
            json.dumps(reasoning_2),
            "2026-10-26 09:00",
            "Courtroom 1C (High-Security Wing)",
            "tok_sheikh_2095",
            0,
            "Approved by Senior Clerk. Victim safety notice dispatched. Staggered arrival window enforced: Complainant 08:30, Respondent 09:00.",
            None,
            now - 7200,
            now
        ),
        # Case 3: Notice sent, +48h elapsed, reminder resent
        (
            "LF-2026-3180",
            "Civil Infraction",
            "Municipal Corporation v. Apex Freight Ltd",
            "Haris Bilal (Fleet Director)",
            "+92 345 112 9901",
            "3054",
            "Commercial hazardous container storage without municipal containment berms. Environmental hazard citation #44-A.",
            0, None, None, 0,
            "NOTICE_RESENT_48H",
            json.dumps(brief_3),
            "j2", "Hon. Justice Michael Chang",
            json.dumps(reasoning_3),
            "2026-10-25 13:30",
            "Courtroom 4A (Floor 4)",
            "tok_apex_3180",
            48,
            "Initial summons sent 48h ago. Automated reminder dispatched. 24 hours remain until police escalation gate.",
            None,
            now - 172800,
            now
        ),
        # Case 4: Non-responsive, +72h elapsed! Ready for Clerk Gate 2 Police Referral Approval
        (
            "LF-2026-4412",
            "Misdemeanor",
            "City Administration v. Bilal Qureshi",
            "Bilal Qureshi",
            "+92 312 449 0082",
            "8832",
            "Repeated unauthorized commercial trespassing in restricted public water reservoir boundary. Refusal to vacate after two written warnings.",
            0, None, None, 0,
            "FORCE_ACTION_PENDING_CLERK",
            json.dumps(brief_4),
            "j4", "Hon. Justice David Vance",
            json.dumps(reasoning_4),
            "2026-10-27 14:00",
            "Courtroom 2D (Floor 2)",
            "tok_qureshi_4412",
            72,
            "Respondent failed to acknowledge summons within mandatory 72-hour statutory window. Police bench warrant packet compiled. Awaiting Clerk Gate 2 sign-off.",
            json.dumps({
                "warrant_code": "BW-2026-9931",
                "target": "Bilal Qureshi",
                "national_id_last4": "8832",
                "phone": "+92 312 449 0082",
                "offense": "Penal Code § 602 (Criminal Trespass)",
                "assigned_precinct": "Station 04 - Margalla Police Division",
                "bail_set": "PKR 50,000 / Non-Bailable after 7 days",
                "recommended_action": "Execute summons delivery in person or dispatch arrest warrant to registered domicile."
            }),
            now - 259200,
            now
        )
    ]

    cursor.executemany("""
    INSERT INTO cases (
        id, case_type, title, respondent_name, respondent_phone, respondent_national_id_last4,
        charge_details, is_dual_party, complainant_name, complainant_phone, safety_buffer_applied,
        status, precedent_brief, recommended_judge_id, recommended_judge_name, reasoning_card,
        hearing_date, courtroom, token, simulated_hours, clerk_notes, police_packet, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, cases)

    # Initial SMS Logs
    sms_entries = [
        (
            str(uuid.uuid4())[:8],
            "LF-2026-2095",
            "Kamran Sheikh (Respondent)",
            "+92 333 991 4421",
            "OFFICIAL COURT SUMMONS: Case LF-2026-2095. Acknowledge your scheduled hearing at Courtroom 1C by verifying your identity: http://localhost:8000/verify?token=tok_sheikh_2095",
            "http://localhost:8000/verify?token=tok_sheikh_2095",
            "SUMMONS_DISPATCH",
            now - 7200,
            0
        ),
        (
            str(uuid.uuid4())[:8],
            "LF-2026-2095",
            "Zoya Sheikh (Complainant)",
            "+92 321 883 1190",
            "VICTIM ADVOCACY UPDATE: State v. Kamran Sheikh has been scheduled. Your safety buffer is active. Arrive at 08:30 (separate gate). Support hotline: 1099.",
            None,
            "VICTIM_SAFETY_NOTICE",
            now - 7190,
            0
        ),
        (
            str(uuid.uuid4())[:8],
            "LF-2026-3180",
            "Haris Bilal (Respondent)",
            "+92 345 112 9901",
            "URGENT COURT NOTICE (48H WARNING): Citation LF-2026-3180 remains unacknowledged. You have 24 hours before referral to law enforcement: http://localhost:8000/verify?token=tok_apex_3180",
            "http://localhost:8000/verify?token=tok_apex_3180",
            "48H_REMINDER",
            now - 86400,
            48
        ),
        (
            str(uuid.uuid4())[:8],
            "LF-2026-4412",
            "Bilal Qureshi (Respondent)",
            "+92 312 449 0082",
            "FINAL JUDICIAL NOTICE (72H DEFAULT): You have failed to acknowledge Case LF-2026-4412. Your case is being escalated for Police Referral / Bench Warrant.",
            "http://localhost:8000/verify?token=tok_qureshi_4412",
            "POLICE_ESCALATION_WARNING",
            now - 3600,
            72
        )
    ]
    cursor.executemany("""
    INSERT INTO sms_logs (id, case_id, recipient, phone, message, token_link, dispatch_type, timestamp, simulated_hour)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sms_entries)
