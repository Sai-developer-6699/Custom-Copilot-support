# 🛠️ Deployment Challenges & Solutions: Atlas Copilot

This document outlines the major technical challenges encountered while deploying the **Atlas Copilot** backend to production on **Render's Free Tier** (512MB RAM, shared single-core CPU), and the architectural solutions implemented to solve them.

---

## 📋 Summary of Engineering Upgrades

| Challenge | Impact | Root Cause | Solution |
| :--- | :--- | :--- | :--- |
| **1. Startup RAM Crash (OOM)** | Container killed on boot | PyTorch & `sentence-transformers` size (~1.2GB) exceeded **512MB** limit | Custom `render-build.sh` installing CPU-only PyTorch + embedding engine replaced with lightweight **ONNX Runtime** |
| **2. Startup Port Scan Timeout** | Deployment failed (no port bind) | Pre-loading index and model weights took 10-20 seconds, blocking Uvicorn startup | Deferred model loading to an asynchronous background task (`anyio.to_thread`), allowing instant port binding (< 1s) |
| **3. CPU Spin-Lock Hangs** | API requests hung / timed out | ONNX/PyTorch multi-threading caused thread contention and CPU starvation on single-core containers | Explicitly restricted thread allocation (`OMP_NUM_THREADS=1`) and disabled ONNX thread spinning |
| **4. Streaming Proxy Disconnects** | SSE Stream terminated prematurely | Vercel proxy closed connections due to latency before Groq returned the first token | Added an **Immediate Keepalive event** chunk as the very first byte of the stream to reset proxy timeouts |
| **5. Windows Unicode Logs** | Telemetry db rollback & print failures | Logging unicode symbols (like `✅`) in threads triggered `UnicodeEncodeError` on `cp1252` terminals | Replaced all terminal print emojis with safe, standardized ASCII log tags (e.g., `[SUCCESS]`) |

---

## 🔍 Detailed Analysis of Challenges & Solutions

### 1. Overcoming the 512MB Memory (OOM) Barrier

#### The Problem
Render's Free Tier limits containers to **512MB RAM**. Deploying a standard Python RAG pipeline using `sentence-transformers` automatically pulls in the full PyTorch framework and CUDA runtimes. This exceeds **1.2GB** of disk and RAM space, causing the container to be instantly killed by Render's kernel out-of-memory reaper on startup.

#### The Solution
1. **Lightweight CPU-Only Builds:** Designed [render-build.sh](file:///d:/CodingProjects/React%20Project/Atlan-AI/backend/render-build.sh) to explicitly install the CPU-only wheel of PyTorch:
   ```bash
   pip install torch==2.5.0+cpu --index-url https://download.pytorch.org/whl/cpu
   ```
   This reduced the PyTorch footprint from ~1.2GB to under ~200MB.
2. **ONNX Runtime Engine for Embeddings:** Built a custom, PyTorch-free wrapper [ONNXEmbeddingModel](file:///d:/CodingProjects/React%20Project/Atlan-AI/backend/rag_pipeline.py#L180-L245) that performs text tokenization via `transformers` and processes embeddings using `onnxruntime`. The model weights (`all-MiniLM-L6-v2`) are stored as a lean 90MB ONNX format, reducing inference memory to a few megabytes.
3. **Dynamic Reranker Fallback:** The backend detects if it is running in production (`os.getenv("RENDER") == "true"`) and disables the heavy PyTorch-based Cross-Encoder model. The system falls back to using the combined dense/sparse Reciprocal Rank Fusion (RRF) scores as a proxy, maintaining quality retrieval without risking OOM crashes.

---

### 2. Solving Startup Port Scan Timeouts

#### The Problem
Render monitors the container's designated port on boot. If the application does not bind to the `$PORT` and respond to readiness probes within a tight threshold (usually 60 seconds), Render aborts the deployment. Loading the local FAISS index, importing ML packages, and compiling code on startup took roughly 15-20 seconds on the slow shared CPU, which frequently triggered deployment timeout terminations.

#### The Solution
We shifted the eager model loading routines to run in an asynchronous background task at startup:
```python
@app.on_event("startup")
async def startup():
    # Instant bind
    await to_thread.run_sync(Base.metadata.create_all, engine)
    print("[SUCCESS] Database tables ready")
    
    # Offload compilation & model loading to a background thread
    import asyncio
    asyncio.create_task(eager_load_models_async())
```
This lets Uvicorn bind to the port and respond `200 OK` in **under 1 second**. Thread-safe locks (`threading.Lock`) were wrapped around singletons to prevent race conditions if a request hit the server while background compilation was still finishing.

---

### 3. Resolving CPU Starvation & Spin-Locks

#### The Problem
Render Free Tier instances run on a shared, single-core CPU. By default, ONNX Runtime and PyTorch attempt to optimize matrix multiplication by spawning multiple parallel worker threads. On a single-core host, this results in extreme thread contention, high CPU spin-locks, and container lockups. The API would hang permanently, and subsequent health checks would time out.

#### The Solution
1. **Restrict Worker Threads:** Explicitly set single-thread restrictions and passive wait policies globally at the very top of `main.py` before other modules load:
   ```python
   import os
   os.environ["OMP_NUM_THREADS"] = "1"
   os.environ["MKL_NUM_THREADS"] = "1"
   os.environ["OMP_WAIT_POLICY"] = "PASSIVE"
   ```
2. **Disable Thread Spinning in ONNX:** Configured ONNX session options to prevent idle threads from spinning in a busy loop waiting for work, forcing them to yield the CPU immediately:
   ```python
   sess_options = ort.SessionOptions()
   sess_options.add_session_config_entry('session.intra_op.allow_spinning', '0')
   sess_options.add_session_config_entry('session.inter_op.allow_spinning', '0')
   ```

---

### 4. Preventing Vercel Router / Proxy Disconnects

#### The Problem
Vercel's routing proxy enforces a strict connection timeout limit. Because RAG retrieval, ranking, and Groq reasoning take 1–3 seconds before generating the first streaming token, Vercel would assume the backend was dead and drop the connection, throwing:
`Streamed RAG response failed: Stream completed without a final response`

#### The Solution
Added an immediate, low-latency keepalive chunk to the Server-Sent Events (SSE) generator loop at the very top of the streaming route:
```python
async def stream_generator():
    # Write immediate headers & data chunk to HTTP stream
    yield _emit_ndjson({"type": "info", "status": "initializing", "message": "Connecting to knowledge base..."})
    
    # Process RAG search and Groq synthesis afterward...
    ...
```
This immediately starts writing bytes to the HTTP response, resetting Vercel's timeout counter and keeping the stream alive while backend processing executes.

---

### 5. Fixing Windows Console Unicode Crashes

#### The Problem
In testing and local runs on Windows, the console terminal uses the `cp1252` encoding by default. When background threads logged metrics using checkmark emojis (`✅`), Python threw a `UnicodeEncodeError`. Because this print statement occurred inside the database logging `try` block, it caused a database `rollback()`, losing telemetry logs entirely and throwing unhelpful errors:
`'charmap' codec can't encode character '\u2705' in position 0`

#### The Solution
Standardized all print calls to use ASCII-safe identifiers (e.g. `[SUCCESS]`, `[INFO]`, `[ERROR]`) instead of emoji characters, avoiding platform-specific logging crashes.
