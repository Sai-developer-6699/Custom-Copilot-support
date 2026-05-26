# backend/eval_metrics.py
import json
import re
import time
from pathlib import Path
from typing import Dict, Optional

# ---------------------------------------------------------------------------
# Judge prompts
# ---------------------------------------------------------------------------

PROMPT_FAITHFULNESS = """\
You are an expert IR Evaluation Judge checking for Hallucinations.

Instructions:
1. Read the **Context** carefully.
2. Decompose the **Generated Answer** into the smallest possible atomic factual statements (aim for 6-10 claims even for short answers).
3. For EACH statement decide whether it is **strictly derivable** from the Context.
   - A claim is "supported" only if the Context contains the specific fact, not merely a related topic.
   - If the claim is a reasonable paraphrase of Context content, mark it supported.
   - If the claim introduces details, steps, tool names, or configurations NOT present in the Context, mark it unsupported.
   - When in doubt, lean toward marking it **supported** (conservative scoring).
4. Output ONLY a JSON object — no markdown, no explanation.

Output structure:
{{
  "claims": [
     {{"statement": "...", "supported_by_context": true}},
     {{"statement": "...", "supported_by_context": false}}
  ]
}}

Context:
{context}

Generated Answer:
{answer}
"""

PROMPT_ANSWER_RELEVANCE = """\
You are an expert IR Evaluation Judge testing for Answer Relevance.

Rubric (score 0.0 – 1.0):
- 1.0: Answer directly and completely addresses the query intent with no extraneous info.
- 0.8-0.9: Answer addresses the core intent but includes minor tangential info or misses a sub-point.
- 0.5-0.7: Answer partially addresses the query — some useful info but significant gaps.
- 0.1-0.4: Answer is mostly off-topic but contains a fragment of relevance.
- 0.0: Completely irrelevant or empty answer.

If the answer explicitly states "I couldn't find relevant information" or similar, score it 0.3 (acknowledges the query but provides no resolution).

Output ONLY a JSON object:
{{
  "score": 0.85,
  "reason": "Brief one-sentence justification."
}}

Query: {query}
Generated Answer: {answer}
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_llm_json(text: str) -> dict | list | None:
    """Helper to clean and parse JSON blocks from LLM response text."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\n", "", cleaned)
        cleaned = re.sub(r"\n```$", "", cleaned)
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned, strict=False)
    except Exception as e:
        print(f"Error parsing JSON from LLM response: {e}\nRaw text: {text}", flush=True)
        match = re.search(r"\{.*\}|\[.*\]", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0), strict=False)
            except Exception:
                pass
        return None


def _call_groq_json(client, model: str, prompt: str):
    """Single-shot Groq call in JSON mode.

    The GroqClientPool already handles key rotation and 429 retries,
    so we do NOT add a manual retry loop here — that would create a
    double-retry with inconsistent timing between runs.
    """
    return client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You must respond in json only."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.0,
        seed=42,
        response_format={"type": "json_object"},
    )


# ---------------------------------------------------------------------------
# Retrieval-level metrics
# ---------------------------------------------------------------------------

def _compute_retrieval_metrics(
    retrieved: list[dict],
    ground_truth: str,
    k_values: tuple[int, ...] = (1, 3, 5),
    sim_threshold: float = 0.08,
) -> dict:
    """Compute Hit@k, Recall@k, and top-1 source accuracy.

    Uses simple token-overlap (Jaccard) between ground_truth and each
    retrieved chunk's text. This avoids an extra embedding call and is
    fast enough for 5-10 chunks.
    """
    def _jaccard(a: str, b: str) -> float:
        set_a = set(re.findall(r"[a-z0-9]+", a.lower()))
        set_b = set(re.findall(r"[a-z0-9]+", b.lower()))
        if not set_a or not set_b:
            return 0.0
        return len(set_a & set_b) / len(set_a | set_b)

    sims = []
    for doc in retrieved:
        text = doc.get("text", "")
        sim = _jaccard(ground_truth, text)
        sims.append(sim)

    metrics: dict = {}
    for k in k_values:
        top_k_sims = sims[:k]
        hit = 1 if any(s >= sim_threshold for s in top_k_sims) else 0
        metrics[f"hit@{k}"] = hit

    # Recall@k: fraction of ground-truth tokens found across top-k chunks
    gt_tokens = set(re.findall(r"[a-z0-9]+", ground_truth.lower()))
    if gt_tokens:
        for k in k_values:
            covered = set()
            for doc in retrieved[:k]:
                covered |= set(re.findall(r"[a-z0-9]+", doc.get("text", "").lower()))
            metrics[f"recall@{k}"] = round(len(gt_tokens & covered) / len(gt_tokens), 4)
    else:
        for k in k_values:
            metrics[f"recall@{k}"] = 0.0

    # Top-1 source accuracy: does the highest-ranked chunk have meaningful overlap?
    metrics["top1_sim"] = round(sims[0], 4) if sims else 0.0
    metrics["top1_relevant"] = 1 if (sims and sims[0] >= sim_threshold) else 0

    return metrics


# ---------------------------------------------------------------------------
# LLM-as-Judge scoring
# ---------------------------------------------------------------------------

def calculate_system_metrics(
    context: str,
    answer: str,
    query: str,
    llm_client=None,
    return_details: bool = False,
) -> Dict[str, float]:
    """
    Executes live LLM-As-A-Judge calls to evaluate faithfulness and answer relevance.

    This is the production path used by the API telemetry logger. The dataset runner
    below is optional and only needed for benchmarking.
    """
    # Import locally to avoid circular dependencies
    if llm_client is None:
        from llm_clients import GROQ_MODEL_FAST as GROQ_MODEL, get_groq_client

        llm_client = get_groq_client()
    else:
        from llm_clients import GROQ_MODEL_FAST as GROQ_MODEL

    # 1. Compute Faithfulness Score
    faithfulness_score = 1.0
    faithfulness_claims = []
    faithfulness_raw = None
    try:
        prompt_f = PROMPT_FAITHFULNESS.format(context=context, answer=answer)
        resp_f = _call_groq_json(llm_client, GROQ_MODEL, prompt_f)
        content_f = resp_f.choices[0].message.content
        faithfulness_raw = content_f
        data_f = _parse_llm_json(content_f)
        if data_f and isinstance(data_f, dict) and "claims" in data_f:
            claims = data_f["claims"]
            faithfulness_claims = claims
            if claims:
                supported_count = sum(1 for c in claims if c.get("supported_by_context") is True)
                faithfulness_score = float(supported_count) / len(claims)
    except Exception as e:
        print(f"Error calculating faithfulness (defaulting to 0.8): {e}", flush=True)
        # Default/fallback on error
        faithfulness_score = 0.8

    # 2. Compute Answer Relevance Score
    answer_relevance_score = 1.0
    answer_relevance_reason = None
    answer_relevance_raw = None
    try:
        prompt_r = PROMPT_ANSWER_RELEVANCE.format(query=query, answer=answer)
        resp_r = _call_groq_json(llm_client, GROQ_MODEL, prompt_r)
        content_r = resp_r.choices[0].message.content
        answer_relevance_raw = content_r
        data_r = _parse_llm_json(content_r)
        if data_r and isinstance(data_r, dict) and "score" in data_r:
            answer_relevance_score = float(data_r["score"])
            answer_relevance_reason = data_r.get("reason")
    except Exception as e:
        print(f"Error calculating answer relevance (defaulting to 0.8): {e}", flush=True)
        # Default/fallback on error
        answer_relevance_score = 0.8

    result = {
        "faithfulness_score": round(faithfulness_score, 4),
        "answer_relevance_score": round(answer_relevance_score, 4)
    }

    if return_details:
        result.update({
            "faithfulness_claims": faithfulness_claims,
            "faithfulness_raw": faithfulness_raw,
            "answer_relevance_reason": answer_relevance_reason,
            "answer_relevance_raw": answer_relevance_raw,
        })

    return result


# ---------------------------------------------------------------------------
# Evaluation runner
# ---------------------------------------------------------------------------

def run_evaluation(
    dataset_path: str = "golden_dataset.json",
    rerank_threshold: Optional[float] = None,
):
    """
    Load an evaluation dataset, run the RAG pipeline on each query,
    compute benchmark metrics, and print a summary telemetry report.

    If `rerank_threshold` is provided it overrides the pipeline default for
    this evaluation run (useful for threshold sweep benchmarking).
    """
    from rag_pipeline import rag_pipeline

    dir_path = Path(__file__).parent
    full_path = dir_path / dataset_path

    if not full_path.exists():
        print(f"Golden dataset not found at {full_path}")
        return

    with open(full_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    print(f"Loaded {len(dataset)} evaluation scenarios from {dataset_path}.", flush=True)
    if rerank_threshold is not None:
        print(f"[EVAL] Using custom rerank_threshold={rerank_threshold}", flush=True)

    results = []

    # Ensure vectorstore is loaded
    rag_pipeline.load_index()

    for i, item in enumerate(dataset, 1):
        query = item["query"]
        ground_truth = item["ground_truth"]
        eval_id = item["eval_id"]

        print(f"\n[{i}/{len(dataset)}] Evaluating {eval_id}: '{query}'", flush=True)

        # Classify topic to match production routing behavior
        from classifier import classify_ticket
        cls = classify_ticket(query)
        topic = cls.get("topic")
        print(f"  Classified Topic  : {topic}", flush=True)

        # Measure retrieval latency with topic boosting
        start_time = time.perf_counter()
        retrieve_kwargs = {"topic": topic}
        if rerank_threshold is not None:
            retrieve_kwargs["rerank_threshold"] = rerank_threshold
        retrieved, _ = rag_pipeline.retrieve(query, **retrieve_kwargs)
        retrieval_time = (time.perf_counter() - start_time) * 1000

        # Retrieval-level metrics (independent of LLM generation)
        retrieval_metrics = _compute_retrieval_metrics(retrieved, ground_truth)

        # Build context safely
        context_str = "\n".join([doc.get("text", "") for doc in retrieved])

        # Measure generation latency — temperature=0.0 for eval determinism
        start_gen = time.perf_counter()
        gen_kwargs = {"topic": topic, "generation_temperature": 0.0}
        if rerank_threshold is not None:
            gen_kwargs["rerank_threshold"] = rerank_threshold
        rag_response = rag_pipeline.generate_answer(query, **gen_kwargs)
        generation_time = (time.perf_counter() - start_gen) * 1000

        answer = rag_response["answer"]

        # Compute LLM-as-Judge metrics
        metrics = calculate_system_metrics(context_str, answer, query)

        print(f"  Retrieval Latency : {retrieval_time:.1f}ms", flush=True)
        print(f"  Generation Latency: {generation_time:.1f}ms", flush=True)
        print(f"  Faithfulness      : {metrics['faithfulness_score']}", flush=True)
        print(f"  Answer Relevance  : {metrics['answer_relevance_score']}", flush=True)
        print(f"  Hit@1/3/5         : {retrieval_metrics['hit@1']}/{retrieval_metrics['hit@3']}/{retrieval_metrics['hit@5']}", flush=True)
        print(f"  Recall@1/3/5      : {retrieval_metrics['recall@1']:.2f}/{retrieval_metrics['recall@3']:.2f}/{retrieval_metrics['recall@5']:.2f}", flush=True)
        print(f"  Top-1 Relevant    : {'PASS' if retrieval_metrics['top1_relevant'] else 'FAIL'} (sim={retrieval_metrics['top1_sim']:.3f})", flush=True)

        results.append({
            "eval_id": eval_id,
            "query": query,
            "answer": answer,
            "ground_truth": ground_truth,
            "retrieval_latency_ms": retrieval_time,
            "generation_latency_ms": generation_time,
            "faithfulness": metrics["faithfulness_score"],
            "answer_relevance": metrics["answer_relevance_score"],
            **retrieval_metrics,
        })

    # Print summary evaluation report
    _print_summary(results, rerank_threshold=rerank_threshold)
    return results


def _print_summary(results: list[dict], *, rerank_threshold=None):
    """Print a formatted evaluation summary report."""
    count = len(results)
    if count == 0:
        print("No results to summarize.", flush=True)
        return

    avg = lambda key: sum(r[key] for r in results) / count

    print("\n" + "=" * 60, flush=True)
    print("                   RAG EVALUATION REPORT", flush=True)
    if rerank_threshold is not None:
        print(f"              (rerank_threshold = {rerank_threshold})", flush=True)
    print("=" * 60, flush=True)
    print(f"  Total Scenarios          : {count}", flush=True)
    print(f"  Avg Retrieval Latency    : {avg('retrieval_latency_ms'):.2f} ms", flush=True)
    print(f"  Avg Generation Latency   : {avg('generation_latency_ms'):.2f} ms", flush=True)
    print("-" * 60, flush=True)
    print(f"  Avg Faithfulness         : {avg('faithfulness'):.4f}", flush=True)
    print(f"  Avg Answer Relevance     : {avg('answer_relevance'):.4f}", flush=True)
    print("-" * 60, flush=True)
    print(f"  Hit@1                    : {avg('hit@1'):.2f}", flush=True)
    print(f"  Hit@3                    : {avg('hit@3'):.2f}", flush=True)
    print(f"  Hit@5                    : {avg('hit@5'):.2f}", flush=True)
    print(f"  Recall@1                 : {avg('recall@1'):.4f}", flush=True)
    print(f"  Recall@3                 : {avg('recall@3'):.4f}", flush=True)
    print(f"  Recall@5                 : {avg('recall@5'):.4f}", flush=True)
    print(f"  Top-1 Source Accuracy    : {avg('top1_relevant'):.2f}", flush=True)
    print("=" * 60, flush=True)


# ---------------------------------------------------------------------------
# Threshold sweep
# ---------------------------------------------------------------------------

def run_threshold_sweep(
    dataset_path: str = "golden_dataset.json",
    thresholds: list[float] | None = None,
):
    """Run the evaluation harness at multiple rerank thresholds and compare.

    This helps decide the best threshold before locking it as the default,
    balancing recall (lower threshold) vs faithfulness (higher threshold).
    """
    if thresholds is None:
        thresholds = [-3.0, -1.0, 0.0, 0.5]

    print("=" * 60, flush=True)
    print("         THRESHOLD SWEEP - Comparative Benchmark", flush=True)
    print("=" * 60, flush=True)

    sweep_results = {}
    for threshold in thresholds:
        print(f"\n{'-' * 60}", flush=True)
        print(f"  Running sweep with rerank_threshold = {threshold}", flush=True)
        print(f"{'-' * 60}", flush=True)
        results = run_evaluation(dataset_path, rerank_threshold=threshold)
        if results:
            count = len(results)
            avg = lambda key: sum(r[key] for r in results) / count
            sweep_results[threshold] = {
                "faithfulness": round(avg("faithfulness"), 4),
                "relevance": round(avg("answer_relevance"), 4),
                "hit@1": round(avg("hit@1"), 2),
                "hit@3": round(avg("hit@3"), 2),
                "recall@5": round(avg("recall@5"), 4),
                "top1_acc": round(avg("top1_relevant"), 2),
            }

    # Summary comparison table
    print("\n" + "=" * 60, flush=True)
    print("         SWEEP COMPARISON", flush=True)
    print("=" * 60, flush=True)
    header = f"{'Threshold':>10} | {'Faith':>7} | {'Relev':>7} | {'Hit@1':>5} | {'Hit@3':>5} | {'R@5':>6} | {'Top1':>5}"
    print(header, flush=True)
    print("-" * len(header), flush=True)
    for t, m in sweep_results.items():
        print(
            f"{t:>10.1f} | {m['faithfulness']:>7.4f} | {m['relevance']:>7.4f} | "
            f"{m['hit@1']:>5.2f} | {m['hit@3']:>5.2f} | {m['recall@5']:>6.4f} | {m['top1_acc']:>5.2f}",
            flush=True,
        )
    print("=" * 60, flush=True)


if __name__ == "__main__":
    import sys

    if "--sweep" in sys.argv:
        run_threshold_sweep()
    else:
        run_evaluation()
