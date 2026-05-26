# classifier.py
import json
from dotenv import load_dotenv

from llm_clients import GROQ_MODEL_FAST as GROQ_MODEL, get_groq_client

load_dotenv()

# Groq client — fast LLM, generous free tier
_client = get_groq_client()

# ---- Few-shot examples for reliable classification ----
FEW_SHOT_EXAMPLES = """
Example 1:
Ticket: "How do I connect Atlan to Snowflake?"
Output: {"topic": "Connector", "sentiment": "Curious", "priority": "P2"}

Example 2:
Ticket: "Your SSO login is BROKEN and I cannot access any data assets! My entire team is blocked!"
Output: {"topic": "SSO", "sentiment": "Angry", "priority": "P0"}

Example 3:
Ticket: "What is the difference between a term and a category in the Business Glossary?"
Output: {"topic": "Glossary", "sentiment": "Curious", "priority": "P2"}

Example 4:
Ticket: "The API is returning a 403 error when I call the /assets endpoint with my token."
Output: {"topic": "API/SDK", "sentiment": "Frustrated", "priority": "P1"}

Example 5:
Ticket: "How do I mask PII columns in Atlan for GDPR compliance?"
Output: {"topic": "Sensitive data", "sentiment": "Neutral", "priority": "P1"}
"""

SYSTEM_PROMPT = f"""You are a senior support triage specialist for Atlan, a data catalog platform.
Your job is to classify incoming support tickets into structured metadata.

Classification Rules:

TOPIC (choose exactly one):
- How-to: User asking how to do something step-by-step
- Product: General product questions, feature requests, or feedback
- API/SDK: Errors or questions about REST APIs, Python SDK, or webhooks
- SSO: Authentication, login, SAML, OAuth, or access issues
- Connector: Data source connections (Snowflake, BigQuery, dbt, etc.)
- Lineage: Data lineage graph, upstream/downstream, impact analysis
- Glossary: Business glossary, terms, categories, definitions
- Best practices: Architecture advice, governance, team workflows
- Sensitive data: PII masking, GDPR, data classification, policies
- General Inquiry: Anything that doesn't fit above

SENTIMENT (choose exactly one):
- Frustrated: User is struggling but not overtly angry
- Curious: User is asking a neutral question
- Angry: User is clearly upset, using caps or exclamation marks
- Neutral: Professional tone, no strong emotion

PRIORITY (choose exactly one):
- P0: Production down, entire team blocked, data breach risk, login completely broken
- P1: Significant feature broken, single user blocked, workaround exists
- P2: General question, feature request, how-to, best practice inquiry

Output ONLY a valid JSON object with exactly these keys: topic, sentiment, priority.
No explanation, no markdown, no extra text.

{FEW_SHOT_EXAMPLES}"""


def classify_ticket(text: str) -> dict:
    """Classify a support ticket using Groq (llama-3.1-8b-instant).
    Returns topic, sentiment, and priority."""
    try:
        resp = _client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": f"Ticket: {text}"}
            ],
            temperature=0.0,
            max_tokens=60,
            response_format={"type": "json_object"},   # guaranteed valid JSON
        )
        parsed = json.loads(resp.choices[0].message.content)
        return {
            "topic":     parsed.get("topic",     "General Inquiry"),
            "sentiment": parsed.get("sentiment", "Neutral"),
            "priority":  parsed.get("priority",  "P2"),
        }
    except Exception as e:
        print(f"[classifier] Groq error: {e}")
        return {"topic": "General Inquiry", "sentiment": "Neutral", "priority": "P2"}
