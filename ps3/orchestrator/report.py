import httpx, json, logging, os
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
_done = False  # only ONE Gemini call ever, for the whole process lifetime

async def generate_incident_report(incident: dict) -> str:
    global _done
    if _done:
        logger.info("Report already generated this session — skipping")
        return None
    _done = True  # set immediately so no parallel task can slip through

    prompt = f"""You are an SRE writing a blameless postmortem report.

Incident data:
{json.dumps(incident, indent=2)}

Write a concise incident report with these sections:
1. Summary (2 sentences)
2. Timeline (injected to detected to remediated to recovered, with durations)
3. Root Cause (what failed and why)
4. Impact (which services, metric deltas)
5. Remediation Taken
6. SLA Status (met or breached)
7. Follow-up Actions (2-3 bullet points)

Keep it factual. No blame. Use the exact numbers from the incident data."""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
        r.raise_for_status()
        text = r.json()["candidates"][0]["content"]["parts"][0]["text"]

        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet

        filename = f"/tmp/incident_{incident['incident_id'].replace(':', '-')}.pdf"
        doc = SimpleDocTemplate(filename, pagesize=A4)
        styles = getSampleStyleSheet()
        story = [
            Paragraph("Incident Report", styles['Title']),
            Paragraph(incident['incident_id'], styles['Normal']),
            Spacer(1, 12),
        ]
        for line in text.split('\n'):
            if line.strip():
                style = styles['Heading2'] if (line.strip()[0].isdigit() and '.' in line[:3]) else styles['Normal']
                story += [Paragraph(line.strip(), style), Spacer(1, 4)]

        doc.build(story)
        logger.info(f"PDF saved: {filename}")
        return filename

    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        return None
