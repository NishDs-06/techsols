import httpx, asyncio, json, logging, os
logger = logging.getLogger(__name__)

_generated_ids = set()  # track which incidents already have PDFs

async def generate_incident_report(incident: dict) -> str:
    inc_id = incident.get("incident_id", "")
    if inc_id in _generated_ids:
        logger.info(f"Report already generated for {inc_id} — skipping")
        return None
    _generated_ids.add(inc_id)

    prompt = f"""Write a short SRE postmortem report for this incident:
{json.dumps(incident, indent=2)}

Sections: Summary, Timeline, Root Cause, Impact, Remediation, SLA Status, Follow-up Actions.
Be concise. Use exact numbers from the data."""

    try:
        logger.info("Calling Ollama llama3.1:8b for report — this may take a few minutes...")
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "http://100.109.131.90:11434/api/generate",
                json={
                    "model": "llama3.1:8b",
                    "prompt": prompt,
                    "stream": False
                },
                timeout=300  # 5 min timeout for slow laptop
            )
            text = r.json()["response"]

        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet

        docs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "docs")
        os.makedirs(docs_dir, exist_ok=True)
        filename = os.path.join(docs_dir, f"incident_{incident['incident_id'].replace(':', '-')}.pdf")
        doc = SimpleDocTemplate(filename, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        story.append(Paragraph("Incident Postmortem Report", styles['Title']))
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
        logger.info(f"PDF saved: {filename}")
        return filename

    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        return None
