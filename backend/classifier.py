# classifier.py
import os, json
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def classify_ticket(text: str):
    """Classify ticket into topic, sentiment, and priority."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are a classifier. "
                "Output ONLY valid JSON with keys: topic, sentiment, priority.\n"
                "Topics: [How-to, Product, API/SDK, SSO, Connector, Lineage, Glossary, Best practices, Sensitive data].\n"
                "Sentiment: [Frustrated, Curious, Angry, Neutral].\n"
                "Priority: [P0 (High), P1 (Medium), P2 (Low)]."
            )
        },
        {"role": "user", "content": f"Ticket: {text}"}
    ]

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.0
    )

    try:
        parsed = json.loads(resp.choices[0].message.content)
    except:
        parsed = {"topic": "Unknown", "sentiment": "Neutral", "priority": "P2"}
    return parsed
