"""Semantic-match evaluation for diagnostics replay records.

Loads diagnostics_3run_logs/golden_replay_records.jsonl and computes semantic
matches between the ground-truth answer and retrieved candidate texts using
the same local embedding model used by the pipeline (all-MiniLM-L6-v2).

Outputs:
 - diagnostics_3run_logs/stability_semantic_eval.json
 - diagnostics_3run_logs/stability_semantic_details.jsonl (per-record detail)
"""
import json
from pathlib import Path
from collections import defaultdict

from sentence_transformers import SentenceTransformer

THRESHOLD = 0.72  # cosine similarity threshold to consider a semantic match
RECORDS = Path('diagnostics_3run_logs/golden_replay_records.jsonl')
OUT_SUM = Path('diagnostics_3run_logs/stability_semantic_eval.json')
OUT_DETAIL = Path('diagnostics_3run_logs/stability_semantic_details.jsonl')

if not RECORDS.exists():
    print('Missing records:', RECORDS)
    raise SystemExit(1)

# use local sentence-transformers model directly to avoid importing other modules
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
model = SentenceTransformer(EMBED_MODEL_NAME)

# read records
records = []
with RECORDS.open(encoding='utf-8') as f:
    for line in f:
        line=line.strip()
        if not line: continue
        records.append(json.loads(line))

runs = sorted({r.get('run_index', 0) for r in records})

# helper
def embed_texts(texts):
    safe = [t if isinstance(t, str) else str(t) for t in texts]
    embs = model.encode(safe, normalize_embeddings=True, batch_size=32)
    return embs

# evaluate per-record
per_run_metrics = defaultdict(lambda: {'hit1':0,'hit3':0,'hit5':0,'mrr_sum':0.0,'top1_acc':0,'count':0})
per_record_details = []

# process grouped by eval_id/run
from collections import defaultdict
by_eval_run = defaultdict(list)
for rec in records:
    eval_id = rec.get('eval_id') or rec.get('query')
    run = rec.get('run_index',0)
    by_eval_run[(eval_id, run)].append(rec)

# iterate original records (one per query per run expected)
for rec in records:
    eval_id = rec.get('eval_id') or rec.get('query')
    run = rec.get('run_index',0)
    gt = rec.get('ground_truth') or ''
    final = rec.get('final_results') or []
    # gather candidate texts
    cand_texts = []
    for c in final:
        if isinstance(c, dict):
            cand_texts.append(c.get('text') or c.get('chunk') or '')
        else:
            cand_texts.append(str(c))
    # embed ground truth + candidates
    if not gt:
        gt_emb = None
    else:
        gt_emb = embed_texts([gt])[0]
    cand_embs = embed_texts(cand_texts) if cand_texts else []

    sims = []
    if gt_emb is None:
        sims = [0.0 for _ in cand_embs]
    else:
        # Since embeddings are normalized, dot product equals cosine similarity
        import numpy as np
        sims = (cand_embs @ gt_emb).tolist() if len(cand_embs)>0 else []

    # compute hit@k and rank
    def first_match_rank(thresh):
        for i,s in enumerate(sims):
            if s >= thresh:
                return i+1
        return None

    rank1 = first_match_rank(THRESHOLD)
    hit1 = 1 if rank1==1 else 0
    rank3 = first_match_rank(THRESHOLD)
    hit3 = 1 if (rank3 is not None and rank3 <=3) else 0
    rank5 = first_match_rank(THRESHOLD)
    hit5 = 1 if (rank5 is not None and rank5 <=5) else 0
    mrr = 0.0
    if rank1 is not None:
        mrr = 1.0 / rank1

    per_run_metrics[run]['hit1'] += hit1
    per_run_metrics[run]['hit3'] += hit3
    per_run_metrics[run]['hit5'] += hit5
    per_run_metrics[run]['mrr_sum'] += mrr
    per_run_metrics[run]['top1_acc'] += (1 if (sims and sims[0] >= THRESHOLD) else 0)
    per_run_metrics[run]['count'] += 1

    per_record_details.append({
        'eval_id': eval_id,
        'run': run,
        'query': rec.get('query'),
        'ground_truth': gt,
        'candidate_texts': cand_texts[:5],
        'candidate_sims': sims[:5],
        'first_match_rank': rank1,
        'hit1': hit1,
        'hit3': hit3,
        'hit5': hit5,
        'mrr': mrr,
    })

# aggregate
summary = {'threshold': THRESHOLD, 'runs': {}, 'total_records': len(records)}
for run in runs:
    stats = per_run_metrics[run]
    cnt = stats['count'] or 1
    summary['runs'][run] = {
        'count': cnt,
        'hit@1': stats['hit1']/cnt,
        'hit@3': stats['hit3']/cnt,
        'hit@5': stats['hit5']/cnt,
        'mrr': stats['mrr_sum']/cnt,
        'top1_source_accuracy': stats['top1_acc']/cnt
    }

# write outputs
OUT_SUM.write_text(json.dumps(summary, indent=2))
with OUT_DETAIL.open('w', encoding='utf-8') as f:
    for d in per_record_details:
        f.write(json.dumps(d) + '\n')

print('WROTE', OUT_SUM, OUT_DETAIL)
print('Summary:', summary)
