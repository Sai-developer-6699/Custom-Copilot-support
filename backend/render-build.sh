#!/usr/bin/env bash
# render-build.sh — Render build script for the FastAPI backend.
#
# WHY THIS SCRIPT EXISTS:
#   Render Free Tier has a 512MB RAM limit. Installing sentence-transformers
#   pulls in full PyTorch + CUDA libraries (~600MB-1.2GB), causing OOM crashes.
#   This script installs a CPU-only PyTorch wheel first so that if any transitive
#   dependency tries to resolve torch, it picks up the lightweight CPU build.
#   The embeddings use ONNX Runtime (USE_ONNX=true), so PyTorch is not needed
#   at runtime. The CrossEncoder reranker is disabled via RENDER=true.

set -e

echo "==> Installing CPU-only PyTorch (lightweight, ~200MB vs ~1.2GB GPU)..."
pip install --no-cache-dir \
    torch \
    --index-url https://download.pytorch.org/whl/cpu

echo "==> Installing remaining dependencies (requirements.txt)..."
pip install --no-cache-dir -r requirements.txt

echo "==> Build complete."
