import httpx, asyncio, json, logging
logger = logging.getLogger(__name__)

GEMINI_API_KEY = "your-gemini-key-here"

async def generate_incident_report(incident: dict) -> str:
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
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=30
            )
            text = r.json()["candidates"][0]["content"]["parts"][0]["text"]

        # Save as PDF
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet

        filename = f"/tmp/incident_{incident['incident_id'].replace(':', '-')}.pdf"
        doc = SimpleDocTemplate(filename, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []

        story.append(Paragraph(f"Incident Report", styles['Title']))
        story.append(Paragraph(incident['incident_id'], styles['Normal']))
        story.append(Spacer(1, 12))

        for line in text.split('\n'):
            if line.strip():
                if line.strip()[0].isdigit() and '.' in line[:3]:
                    story.append(Spacer(1, 8))
                    story.append(Paragraph(line.strip(), styles['Heading2']))
                else:
                    story.append(Paragraph(line.strip(), styles['Normal']))
                story.append(Spacer(1, 4))

        doc.build(story)
        logger.info(f"PDF report saved: {filename}")
        return filename

    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        return None
