import argparse
import json
import time
from pathlib import Path
from typing import List

from classifier import classify_ticket
from eval_metrics import calculate_system_metrics
from rag_diagnostics import (
    aggregate_query_runs,
    cluster_failure,
    dump_jsonl,
    retrieval_metrics,
    set_deterministic,
    snapshot_chunk,
    summarize_clusters,
    utc_now_iso,
)
from rag_pipeline import rag_pipeline


def _load_dataset(path: str = "golden_dataset.json") -> List[dict]:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(path)
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def _rank_of_match(candidates: list[dict], ground_truth: str) -> int | None:
    if not ground_truth:
        return None

    normalized_ground_truth = ground_truth.lower()
    for rank, candidate in enumerate(candidates, start=1):
        text = (candidate.get("text") or "").lower()
        if normalized_ground_truth in text or text in normalized_ground_truth:
            return rank
    return None


def run_replay(
    dataset_path: str = "golden_dataset.json",
    rerank_threshold: float | None = None,
    runs: int = 3,
    seed: int = 42,
    deterministic: bool = True,
    enable_multi_query: bool = False,
    enable_topic_boost: bool = True,
    enable_rerank: bool = True,
    generation_temperature: float = 0.0,
    cache_enabled: bool = False,
    skip_judge: bool = False,
    output_dir: str = "diagnostics",
) -> dict:
    dataset = _load_dataset(dataset_path)
    rag_pipeline.load_index()

    all_records: list[dict] = []
    run_reports: list[dict] = []

    for run_index in range(1, runs + 1):
        if deterministic:
            set_deterministic(seed + run_index - 1)

        run_records: list[dict] = []
        for item in dataset:
            query = item["query"]
            ground_truth = item.get("ground_truth", "")
            cls = classify_ticket(query)
            topic = cls.get("topic")
            trace: dict = {}

            start = time.perf_counter()
            response = rag_pipeline.generate_answer(
                query,
                top_k=5,
                topic=topic,
                trace=trace,
                enable_multi_query=enable_multi_query,
                enable_topic_boost=enable_topic_boost,
                enable_rerank=enable_rerank,
                generation_temperature=generation_temperature,
            )
            total_ms = (time.perf_counter() - start) * 1000

            final_results = trace.get("final_results", [])
            retrieval_stats = retrieval_metrics(final_results, ground_truth, top_k=5)
            pre_rerank_rank = _rank_of_match(trace.get("merged_candidates", []), ground_truth)
            final_rank = retrieval_stats.get("matched_rank")

            context_str = "\n".join(doc.get("text", "") for doc in final_results)
            if skip_judge:
                metrics = {
                    "faithfulness_score": None,
                    "answer_relevance_score": None,
                    "faithfulness_claims": [],
                    "faithfulness_raw": None,
                    "answer_relevance_reason": None,
                    "answer_relevance_raw": None,
                }
            else:
                metrics = calculate_system_metrics(context_str, response.get("answer", ""), query, return_details=True)

            record = {
                "timestamp_utc": utc_now_iso(),
                "run_index": run_index,
                "eval_id": item.get("eval_id"),
                "query": query,
                "ground_truth": ground_truth,
                "classifier": cls,
                "config": {
                    "seed": seed,
                    "deterministic": deterministic,
                    "enable_multi_query": enable_multi_query,
                    "enable_topic_boost": enable_topic_boost,
                    "enable_rerank": enable_rerank,
                    "rerank_threshold": rerank_threshold,
                    "generation_temperature": generation_temperature,
                    "cache_enabled": cache_enabled,
                },
                "retrieval_latency_ms": response.get("retrieval_latency_ms", 0.0),
                "generation_latency_ms": response.get("generation_latency_ms", 0.0),
                "total_latency_ms": round(total_ms, 2),
                "answer": response.get("answer", ""),
                "sources": response.get("sources", []),
                "retrieved": [snapshot_chunk(doc) for doc in final_results],
                "retrieval_metrics": retrieval_stats,
                "pre_rerank_match_rank": pre_rerank_rank,
                "final_match_rank": final_rank,
                "faithfulness": metrics["faithfulness_score"],
                "answer_relevance": metrics["answer_relevance_score"],
                "faithfulness_claims": metrics.get("faithfulness_claims", []),
                "faithfulness_raw": metrics.get("faithfulness_raw"),
                "answer_relevance_reason": metrics.get("answer_relevance_reason"),
                "answer_relevance_raw": metrics.get("answer_relevance_raw"),
                "trace": trace,
            }
            record["failure_cluster"] = cluster_failure(record)
            run_records.append(record)
            all_records.append(record)

        run_summary = {
            "run_index": run_index,
            "count": len(run_records),
            "hit@1": sum(1 for r in run_records if r["retrieval_metrics"]["matched_rank"] == 1) / max(1, len(run_records)),
            "hit@3": sum(1 for r in run_records if r["retrieval_metrics"]["matched_rank"] and r["retrieval_metrics"]["matched_rank"] <= 3) / max(1, len(run_records)),
            "hit@5": sum(1 for r in run_records if r["retrieval_metrics"]["matched_rank"] and r["retrieval_metrics"]["matched_rank"] <= 5) / max(1, len(run_records)),
            "mrr": sum(r["retrieval_metrics"]["mrr"] for r in run_records) / max(1, len(run_records)),
            "top1_source_accuracy": sum(r["retrieval_metrics"]["top1_source_accuracy"] for r in run_records) / max(1, len(run_records)),
            "avg_retrieval_ms": sum(r["retrieval_latency_ms"] for r in run_records) / max(1, len(run_records)),
            "avg_generation_ms": sum(r["generation_latency_ms"] for r in run_records) / max(1, len(run_records)),
            "avg_faithfulness": (
                sum(r["faithfulness"] for r in run_records if r["faithfulness"] is not None) /
                max(1, sum(1 for r in run_records if r["faithfulness"] is not None))
            ),
            "avg_answer_relevance": (
                sum(r["answer_relevance"] for r in run_records if r["answer_relevance"] is not None) /
                max(1, sum(1 for r in run_records if r["answer_relevance"] is not None))
            ),
        }
        run_reports.append({"run_index": run_index, "results": run_records, "summary": run_summary})

    overall_summary = {
        "count": len(all_records),
        "hit@1": sum(1 for r in all_records if r["retrieval_metrics"]["matched_rank"] == 1) / max(1, len(all_records)),
        "hit@3": sum(1 for r in all_records if r["retrieval_metrics"]["matched_rank"] and r["retrieval_metrics"]["matched_rank"] <= 3) / max(1, len(all_records)),
        "hit@5": sum(1 for r in all_records if r["retrieval_metrics"]["matched_rank"] and r["retrieval_metrics"]["matched_rank"] <= 5) / max(1, len(all_records)),
        "mrr": sum(r["retrieval_metrics"]["mrr"] for r in all_records) / max(1, len(all_records)),
        "top1_source_accuracy": sum(r["retrieval_metrics"]["top1_source_accuracy"] for r in all_records) / max(1, len(all_records)),
        "avg_retrieval_ms": sum(r["retrieval_latency_ms"] for r in all_records) / max(1, len(all_records)),
        "avg_generation_ms": sum(r["generation_latency_ms"] for r in all_records) / max(1, len(all_records)),
        "avg_faithfulness": (
            sum(r["faithfulness"] for r in all_records if r["faithfulness"] is not None) /
            max(1, sum(1 for r in all_records if r["faithfulness"] is not None))
        ),
        "avg_answer_relevance": (
            sum(r["answer_relevance"] for r in all_records if r["answer_relevance"] is not None) /
            max(1, sum(1 for r in all_records if r["answer_relevance"] is not None))
        ),
    }

    report = {
        "config": {
            "dataset_path": dataset_path,
            "runs": runs,
            "seed": seed,
            "deterministic": deterministic,
            "enable_multi_query": enable_multi_query,
            "enable_topic_boost": enable_topic_boost,
            "enable_rerank": enable_rerank,
            "rerank_threshold": rerank_threshold,
            "generation_temperature": generation_temperature,
            "cache_enabled": cache_enabled,
            "skip_judge": skip_judge,
        },
        "summary": overall_summary,
        "runs": run_reports,
        "clusters": summarize_clusters(all_records),
        "query_summaries": aggregate_query_runs(all_records),
        "records": all_records,
    }

    output_root = Path(output_dir)
    output_root.mkdir(parents=True, exist_ok=True)
    with open(output_root / "golden_replay_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    dump_jsonl(output_root / "golden_replay_records.jsonl", all_records)

    return report


def run_baseline(dataset_path: str = "golden_dataset.json", rerank_threshold: float | None = None) -> dict:
    replay = run_replay(
        dataset_path=dataset_path,
        rerank_threshold=rerank_threshold,
        runs=1,
        seed=42,
        deterministic=True,
        enable_multi_query=False,
        enable_topic_boost=False,
        enable_rerank=True,
        generation_temperature=0.0,
        cache_enabled=False,
    )
    return {
        "summary": replay["summary"],
        "results": replay["runs"][0]["results"],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run retrieval replay against the golden dataset")
    parser.add_argument("--dataset", default="golden_dataset.json")
    parser.add_argument("--runs", type=int, default=3)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output-dir", default="diagnostics")
    parser.add_argument("--generation-temperature", type=float, default=0.0)
    parser.add_argument("--rerank-threshold", type=float, default=None)
    parser.add_argument("--multi-query", action="store_true")
    parser.add_argument("--no-topic-boost", action="store_true")
    parser.add_argument("--no-rerank", action="store_true")
    parser.add_argument("--deterministic", action="store_true", default=True)
    parser.add_argument("--no-deterministic", dest="deterministic", action="store_false")
    parser.add_argument("--cache-enabled", action="store_true")
    parser.add_argument("--skip-judge", action="store_true")
    parser.add_argument(
        "--thresholds",
        default=None,
        help="Comma-separated list of rerank thresholds to evaluate (e.g. -3.0,-1.5,-1.0)",
    )
    args = parser.parse_args()

    if args.thresholds:
        thresholds = [float(item) for item in args.thresholds.split(",")]
        all_summaries = {}
        for threshold in thresholds:
            out = run_replay(
                dataset_path=args.dataset,
                rerank_threshold=threshold,
                runs=args.runs,
                seed=args.seed,
                deterministic=args.deterministic,
                enable_multi_query=args.multi_query,
                enable_topic_boost=not args.no_topic_boost,
                enable_rerank=not args.no_rerank,
                generation_temperature=args.generation_temperature,
                cache_enabled=args.cache_enabled,
                skip_judge=args.skip_judge,
                output_dir=args.output_dir,
            )
            all_summaries[str(threshold)] = out["summary"]
        print(json.dumps(all_summaries, indent=2))
        with open("validation_sweep.json", "w", encoding="utf-8") as f:
            json.dump(all_summaries, f, indent=2)
    else:
        out = run_replay(
            dataset_path=args.dataset,
            rerank_threshold=args.rerank_threshold,
            runs=args.runs,
            seed=args.seed,
            deterministic=args.deterministic,
            enable_multi_query=args.multi_query,
            enable_topic_boost=not args.no_topic_boost,
            enable_rerank=not args.no_rerank,
            generation_temperature=args.generation_temperature,
            cache_enabled=args.cache_enabled,
            skip_judge=args.skip_judge,
            output_dir=args.output_dir,
        )
        print(json.dumps(out["summary"], indent=2))
