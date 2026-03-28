import asyncio
import json
import logging
import os
from datetime import datetime

import httpx

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
REPORT_DIR = "/tmp/incident_reports"


def _build_prompt(incident: dict) -> str:
    return f"""You are an SRE writing a blameless postmortem report.

Incident data:
{json.dumps(incident, indent=2)}

Write a concise incident report with these sections:
1. Summary (2 sentences)
2. Timeline (injected → detected → remediated → recovered, with durations in seconds)
3. Root Cause (what failed and why, based on metric deltas)
4. Impact (which services were affected, metric deltas vs baseline)
5. Remediation Taken
6. SLA Status (SLA was {incident.get('sla_seconds', 15)}s — state whether it was met or breached)
7. Follow-up Actions (2-3 bullet points)

Keep it factual. No blame. Use the exact numbers from the incident data."""


async def generate_incident_report(incident: dict) -> str:
    """
    Call Anthropic Claude to generate a blameless postmortem, then save as PDF.
    Returns the path to the generated PDF file.
    Falls back gracefully if the API key is missing or the call fails.
    """
    os.makedirs(REPORT_DIR, exist_ok=True)
    incident_id = incident.get("incident_id", f"inc-{datetime.utcnow().isoformat()}")
    pdf_path = f"{REPORT_DIR}/{incident_id}.pdf"

    # ── 1. Generate text via LLM ──────────────────────────────────────────────
    report_text = None

    if ANTHROPIC_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(
                    ANTHROPIC_URL,
                    headers={
                        "x-api-key": ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-opus-4-5",
                        "max_tokens": 1200,
                        "messages": [{"role": "user", "content": _build_prompt(incident)}],
                    },
                )
                r.raise_for_status()
                report_text = r.json()["content"][0]["text"]
                logger.info(f"LLM report generated for {incident_id}")
        except Exception as e:
            logger.error(f"Anthropic call failed: {e}")

    # Fallback: build a plain-text report from the incident JSON
    if not report_text:
        logger.warning("Using fallback plain-text report (no LLM)")
        root = incident.get("root_service", "unknown")
        affected = ", ".join(incident.get("affected_services", []))
        actual = incident.get("actual_seconds", "?")
        sla = incident.get("sla_seconds", 15)
        sla_status = "MET" if isinstance(actual, (int, float)) and actual <= sla else "BREACHED"

        report_text = f"""1. Summary
Anomaly detected in {root}. Automated remediation applied and system recovered in {actual}s.

2. Timeline
- Injected:      {incident.get('injected_at', 'N/A')}
- Detected:      {incident.get('detected_at', 'N/A')}
- RCA complete:  {incident.get('rca_completed_at', 'N/A')}
- Remediation:   {incident.get('remediation_started_at', 'N/A')}
- Recovered:     {incident.get('recovered_at', 'N/A')}
- Total:         {actual}s

3. Root Cause
{root} exhibited elevated latency and error rate beyond normal thresholds.

4. Impact
Root service: {root}
Affected services: {affected}
Metrics: {json.dumps(incident.get('metrics', {}), indent=2)}

5. Remediation Taken
{incident.get('remediation_detail', 'N/A')}

6. SLA Status
SLA: {sla}s | Actual: {actual}s | Status: {sla_status}

7. Follow-up Actions
- Review alert thresholds for {root}
- Add canary deployment checks before rollout
- Investigate replica scaling policy
"""

    # ── 2. Write PDF ──────────────────────────────────────────────────────────
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
        from reportlab.lib import colors

        doc = SimpleDocTemplate(
            pdf_path,
            pagesize=A4,
            leftMargin=20 * mm,
            rightMargin=20 * mm,
            topMargin=20 * mm,
            bottomMargin=20 * mm,
        )
        styles = getSampleStyleSheet()
        heading_style = ParagraphStyle(
            "SectionHead",
            parent=styles["Heading2"],
            textColor=colors.HexColor("#1a1a2e"),
            spaceBefore=10,
        )
        normal_style = styles["Normal"]
        normal_style.leading = 16

        story = []
        story.append(Paragraph(f"Incident Postmortem — {incident_id}", styles["Title"]))
        story.append(Paragraph(
            f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            styles["Italic"],
        ))
        story.append(Spacer(1, 6))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cccccc")))
        story.append(Spacer(1, 8))

        for line in report_text.split("\n"):
            stripped = line.strip()
            if not stripped:
                story.append(Spacer(1, 4))
                continue
            # Lines starting with a digit + dot are section headers
            if len(stripped) > 2 and stripped[0].isdigit() and stripped[1] == ".":
                story.append(Paragraph(stripped, heading_style))
            else:
                story.append(Paragraph(stripped, normal_style))

        doc.build(story)
        logger.info(f"PDF saved: {pdf_path}")

    except ImportError:
        # reportlab not installed — write plain text as fallback
        txt_path = pdf_path.replace(".pdf", ".txt")
        with open(txt_path, "w") as f:
            f.write(report_text)
        logger.warning(f"reportlab not found. Plain text saved: {txt_path}")
        return txt_path

    return pdf_path
