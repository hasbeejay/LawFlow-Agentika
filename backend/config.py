import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.environ.get("PORT", 8000))
HOST = os.environ.get("HOST", "0.0.0.0")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "").strip()

SECRET_KEY = os.environ.get("SECRET_KEY", "lawflow-default-secret-salt-2026")
BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000").rstrip("/")

# Email / Gmail Dispatch Configuration
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com").strip()
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER", "").strip()
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "").strip()
ALERT_EMAIL = os.environ.get("ALERT_EMAIL", "hasbeejayleo@gmail.com").strip()

