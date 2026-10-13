import os
import json
import urllib.request
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/v1/support", tags=["Support"])

RESEND_API_KEY = os.getenv("RESEND_API_KEY")

class SupportTicketRequest(BaseModel):
    user_email: EmailStr
    subject: str
    message: str

@router.post("/contact")
def submit_support_ticket(ticket: SupportTicketRequest):
    """Dispatches contact tickets to cover0support@299labs.xyz via Resend."""
    if not RESEND_API_KEY:
        print(f"[LOCAL SUPPORT DISPATCH] From: {ticket.user_email} | Subject: {ticket.subject}\nBody: {ticket.message}")
        return {"status": "delivered_local", "message": "Ticket recorded locally."}

    payload = {
        "from": "Cover0 Support Desk <support@299labs.xyz>",
        "to": ["cover0support@299labs.xyz"],
        "reply_to": ticket.user_email,
        "subject": f"[Support Ticket] {ticket.subject}",
        "text": f"Inquiry from: {ticket.user_email}\n\n{ticket.message}",
    }

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "Cover0-Backend/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return {"status": "sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dispatch inquiry: {e}")