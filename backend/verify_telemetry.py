# backend/verify_telemetry.py
import sys
from database import SessionLocal
from models.ticket import Ticket
from models.metrics import TicketEvaluationMetric, RetrievedChunkSource

def verify():
    db = SessionLocal()
    try:
        # Fetch the latest ticket
        ticket = db.query(Ticket).order_by(Ticket.id.desc()).first()
        if not ticket:
            print("[INFO] No tickets found in the database.")
            return

        print("="*60)
        print("              LATEST TICKET FROM SUPABASE")
        print("="*60)
        print(f"Ticket Number  : {ticket.ticket_number} (ID: {ticket.id})")
        print(f"Created At     : {ticket.created_at}")
        print(f"Query          : {ticket.query}")
        print(f"AI Response    : {ticket.ai_response[:120]}...")
        print(f"Topic          : {ticket.topic}")
        print(f"Priority       : {ticket.priority}")
        print(f"Sentiment      : {ticket.sentiment}")
        print(f"Metadata Scope : {ticket.metadata_scope}")

        # Fetch evaluation metrics
        metric = db.query(TicketEvaluationMetric).filter(TicketEvaluationMetric.ticket_id == ticket.id).first()
        if not metric:
            print("\n[INFO] No evaluation metrics found for this ticket.")
            print("(Note: Evaluation metrics are logged only for RAG-topic queries, and they are processed asynchronously.)")
            return

        print("\n" + "="*60)
        print("              EVALUATION TELEMETRY METRICS")
        print("="*60)
        print(f"Metric Log ID      : {metric.id}")
        print(f"Retrieval Latency  : {metric.retrieval_latency_ms} ms")
        print(f"Generation Latency : {metric.generation_latency_ms} ms")
        print(f"Faithfulness Score : {metric.faithfulness} (Grounding)")
        print(f"Answer Relevance   : {metric.answer_relevance} (Semantic)")

        # Fetch retrieved chunks
        chunks = db.query(RetrievedChunkSource).filter(RetrievedChunkSource.metric_id == metric.id).order_by(RetrievedChunkSource.chunk_index).all()
        print("\n" + "="*60)
        print(f"              RETRIEVED CHUNK SOURCES ({len(chunks)})")
        print("="*60)
        for chunk in chunks:
            print(f"[*] Chunk Index {chunk.chunk_index} (Rerank Score: {chunk.rerank_score})")
            print(f"   Provenance ID : {chunk.vector_database_uuid}")
            print(f"   Content Snippet: \"{chunk.text_content[:150].strip()}...\"")
            print("-" * 50)

    except Exception as e:
        print(f"[ERROR] Error during database query: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify()
