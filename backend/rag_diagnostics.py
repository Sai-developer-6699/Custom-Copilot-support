import json
import os
import random
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np


def set_deterministic(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)


def _normalize_text(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip().lower()


def _document_key(doc: dict[str, Any]) -> str:
    for field in ("url", "source", "title"):
        value = doc.get(field)
        if value:
            return str(value)
    return str(doc.get("index", "unknown"))


def retrieval_metrics(retrieved: list[dict[str, Any]], ground_truth: str, top_k: int = 5) -> dict[str, Any]:
    normalized_ground_truth = _normalize_text(ground_truth)
    matched_rank = None

    for rank, doc in enumerate(retrieved, start=1):
        text = _normalize_text(doc.get("text", ""))
        if normalized_ground_truth and (normalized_ground_truth in text or text in normalized_ground_truth):
            matched_rank = rank
            break

    hit_at_k = 1 if matched_rank is not None and matched_rank <= top_k else 0
    recall_at_k = hit_at_k
    mrr = 1.0 / matched_rank if matched_rank else 0.0
    top1_source_accuracy = 1 if matched_rank == 1 else 0

    return {
        "matched_rank": matched_rank,
        "hit_at_k": hit_at_k,
        "recall_at_k": recall_at_k,
        "mrr": round(mrr, 4),
        "top1_source_accuracy": top1_source_accuracy,
    }


def snapshot_chunk(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "chunk_id": doc.get("index"),
        "chunk_index": doc.get("chunk_index"),
        "chunk_count": doc.get("chunk_count"),
        "source": doc.get("source"),
        "parent_source": doc.get("parent_source"),
        "title": doc.get("title"),
        "url": doc.get("url"),
        "semantic_score": doc.get("semantic_score"),
        "lexical_score": doc.get("lexical_score"),
        "rrf_score": doc.get("rrf_score"),
        "rerank_score": doc.get("rerank_score"),
        "text": doc.get("text", ""),
    }


def source_signature(doc: dict[str, Any]) -> str:
    return _document_key(doc)


def cluster_failure(record: dict[str, Any]) -> str:
    retrieval = record.get("retrieval_metrics", {})
    matched_rank = retrieval.get("matched_rank")
    pre_rerank_rank = record.get("pre_rerank_match_rank")
    final_rank = record.get("final_match_rank")
    rerank_enabled = record.get("config", {}).get("enable_rerank", True)
    faithfulness = record.get("faithfulness")
    answer_relevance = record.get("answer_relevance")

    if matched_rank is None:
        return "wrong source retrieved"

    if rerank_enabled and pre_rerank_rank == 1 and final_rank != 1:
        return "reranker demotion"

    if final_rank and final_rank > 1:
        return "correct source low-ranked"

    if faithfulness is not None and faithfulness < 0.8 and answer_relevance is not None and answer_relevance >= 0.8:
        return "hallucinated generation despite correct retrieval"

    return "retrieval successful"


def summarize_clusters(records: list[dict[str, Any]]) -> dict[str, int]:
    summary: dict[str, int] = defaultdict(int)
    for record in records:
        summary[cluster_failure(record)] += 1
    return dict(summary)


def aggregate_query_runs(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        grouped[record["query"]].append(record)

    summaries: list[dict[str, Any]] = []
    for query, runs in grouped.items():
        top1_sources = [source_signature(run["retrieved"][0]) for run in runs if run.get("retrieved")]
        answers = [run.get("answer", "") for run in runs]
        faithfulness_values = [run.get("faithfulness") for run in runs if run.get("faithfulness") is not None]
        relevance_values = [run.get("answer_relevance") for run in runs if run.get("answer_relevance") is not None]
        summaries.append({
            "query": query,
            "run_count": len(runs),
            "unique_top1_sources": len(set(top1_sources)),
            "top1_source_churn": round(len(set(top1_sources)) / max(1, len(runs)), 4),
            "unique_answers": len(set(answers)),
            "faithfulness_mean": round(float(np.mean(faithfulness_values)), 4) if faithfulness_values else None,
            "answer_relevance_mean": round(float(np.mean(relevance_values)), 4) if relevance_values else None,
        })

    return summaries


def dump_jsonl(path: str | Path, records: list[dict[str, Any]]) -> Path:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    return output_path


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()