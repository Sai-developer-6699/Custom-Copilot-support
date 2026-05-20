import requests

base_url = "http://127.0.0.1:8000"

def test_classify():
    print("Testing /classify endpoint..")
    tickets=[
        "I need help connecting Atlan with Snowflake.",
        "Lineage is not showing up for my BigQuery dataset.",
        "This issue is blocking my production pipeline, fix immediately!",
    ]
    for t in tickets:
        resp = requests.post(f"{base_url}/classify",json={"text":t})
        print(f"Tickets : {t}")
        print("Responses: ", resp.json())

def test_rag():
    print("---Testing /rag endpoint=---")
    tickets = [
        # Normal RAG flow
        "How can I integrate Atlan with Snowflake?",

        # Non-RAG topic (e.g. Connector, Lineage)
        "The connector for dbt Cloud is not working.",

        # High-priority escalation
        "URGENT: Production pipeline is broken, nothing is working!"
    ]
    for t in tickets:
        resp = requests.post(f"{base_url}/rag",json={"text":t})
        print("\nTickets:",t)
        print("Responses:",resp.json())


if __name__ == "__main__":
    test_classify()
    test_rag()