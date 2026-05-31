# 🚢 Production Deployment Guide

This guide provides step-by-step instructions for deploying the **Support Copilot RAG** platform in production using **Render** for the FastAPI backend, **Vercel** for the React frontend, and **Supabase** for PostgreSQL database hosting.

---

## 🏗 System Architecture & Setup Order

To ensure correct configuration, follow this deployment order:
1. **Database Setup** (Supabase PostgreSQL)
2. **Backend Deployment** (Render Web Service)
3. **Frontend Deployment** (Vercel)

---

## 🗄 Step 1: Database Setup (Supabase)

1. Sign up or log in to [Supabase](https://supabase.com).
2. Create a new project and set up a secure database password.
3. Under **Project Settings > Database > Connection String**, copy the **URI** connection string. 
   * *Note: Replace the password placeholder with your actual database password.*
4. From your local environment, run the database migrations using Alembic to initialize the schema:
   ```bash
   cd backend
   # Set the database URL temporarily in your terminal environment
   $env:DATABASE_URL="your-supabase-connection-uri"
   # Run migrations
   .\venv\Scripts\python.exe -m alembic upgrade head
   ```

---

## 🐍 Step 2: Backend Deployment (Render)

Deploy the Python FastAPI application as a **Web Service** on Render.

### 1. Configure the Render Web Service
1. Create an account on [Render](https://render.com).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository (`support-copilot-rag`).
4. Set the following configuration parameters:
   * **Name:** `support-copilot-rag` (or custom name)
   * **Language:** `Python 3`
   * **Root Directory:** `backend` *(Crucial: pointing to the subfolder)*
   * **Build Command:** `chmod +x render-build.sh && ./render-build.sh`
   * **Start Command:** `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`

   > **Why a custom build script?**  
   > Render's Free Tier has only **512MB RAM**. Installing `sentence-transformers` pulls in PyTorch + CUDA libraries (~600MB–1.2GB), causing OOM crashes during startup. `render-build.sh` installs a **CPU-only** PyTorch wheel first, then the lean `requirements.txt` (which deliberately excludes `sentence-transformers`). Embeddings run via ONNX Runtime and the CrossEncoder reranker is disabled on Render.

### 2. Configure Environment Variables
Navigate to the **Environment** tab of your Render Web Service and add the following keys:

| Key | Description | Example Value |
|---|---|---|
| `DATABASE_URL` | Supabase PostgreSQL Connection URI | `postgresql://postgres:[password]@...` |
| `GROQ_API_KEY` | Groq Developer API Key | `gsk_...` |
| `PYTHON_VERSION` | Python Runtime version | `3.13.0` (or similar) |
| `USE_ONNX` | Enable ONNX Runtime for embeddings (required on Render) | `true` |
| `RENDER` | Signals Render environment; disables CrossEncoder reranker | `true` |

### ⚠️ Render Free Tier Limitations to Keep in Mind:
* **Spin-Down:** Render's free tier web services spin down (go to sleep) after 15 minutes of inactivity. When a new request arrives, Render will spin it back up, which can cause a delay of **50–90 seconds** on the initial page load.
* **Ephemeral Disk:** Disk writes are temporary. The pre-built FAISS index (`vectorstore/index.faiss` and `meta.pkl`) is checked into Git, so it is safely loaded on startup. However, any new document uploads or scrapes done in production will be lost if the Render container restarts.

---

## 💻 Step 3: Frontend Deployment (Vercel)

Deploy the React Vite SPA to Vercel and connect it to your Render backend.

### 1. Configure the Vercel Project
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** and select **Project**.
3. Import your GitHub repository (`support-copilot-rag`).
4. Set the following configuration:
   * **Framework Preset:** `Vite`
   * **Root Directory:** `frontend` *(Crucial: pointing to the subfolder)*
   * **Build Command:** `npm run build`
   * **Output Directory:** `build`

### 2. Configure Environment Variables
Add the following key in the Vercel Environment Variables configuration screen:

| Key | Description | Example Value |
|---|---|---|
| `VITE_BACKEND_URL` | The public URL of your Render Web Service | `https://support-copilot-rag.onrender.com` |

### 3. API Proxying (`vercel.json`)
The frontend contains a [vercel.json](file:///d:/CodingProjects/React%20Project/Atlan-AI/frontend/vercel.json) file that handles proxy redirects so that `/api/` calls are automatically forwarded to the backend. Ensure the destination URL in `vercel.json` matches your Render URL:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://support-copilot-rag.onrender.com/api/:path*"
    },
    {
      "source": "/stats",
      "destination": "https://support-copilot-rag.onrender.com/stats"
    },
    {
      "source": "/rag",
      "destination": "https://support-copilot-rag.onrender.com/rag"
    },
    {
      "source": "/rag/stream",
      "destination": "https://support-copilot-rag.onrender.com/rag/stream"
    },
    {
      "source": "/upload",
      "destination": "https://support-copilot-rag.onrender.com/upload"
    }
  ]
}
```

---

## 🔍 Verification & Troubleshooting

1. **Verify Backend health:** Once Render deployment is complete, navigate to `https://your-backend.onrender.com/health` in your browser. It should return a JSON containing database, vector index, and cache status:
   ```json
   {
     "status": "healthy",
     "db": "connected",
     "index_docs": 2142,
     "index_loaded": true,
     "cache": { "size": 0, "keys": [] }
   }
   ```
2. **Verify CORS Settings:** If you experience connection errors between the frontend and backend, verify that CORS middleware in `backend/main.py` allows requests from your Vercel deployment domain.
