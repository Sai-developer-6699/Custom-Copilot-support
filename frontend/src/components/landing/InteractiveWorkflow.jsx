import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Scan, Database, MessageSquare, 
  Layers, Filter, Cpu, Play, Terminal, HelpCircle
} from "lucide-react";

export default function InteractiveWorkflow() {
  const [selectedNode, setSelectedNode] = useState(null);

  const nodes = [
    // Ingestion Path
    {
      id: "ingest-1",
      path: "ingestion",
      title: "Document Input",
      subtitle: "Ingestion - Phase 1",
      icon: <FileText className="w-5 h-5 text-indigo-400" />,
      shortDesc: "Receives raw PDF manuals, scrapes company doc websites, or accepts uploaded images.",
      details: {
        title: "Ingestion Pipeline: Document Input",
        math: "Format Support: PDF (text-based), PNG/JPG/WebP (image-based OCR assets), JSON scrapes.",
        code: `# Raw document loading
raw_doc = data_loader.load_file(uploaded_path)
# Check document metadata and layout structure
is_image = is_image_content_type(raw_doc.content_type)`,
        desc: "Ingestion parses document types to determine extraction pathways. Image uploads are routed directly to the Spatial OCR pipeline, while standard text documents undergo layout parsing before chunking."
      }
    },
    {
      id: "ingest-2",
      path: "ingestion",
      title: "Layout-Aware OCR",
      subtitle: "Ingestion - Phase 2",
      icon: <Scan className="w-5 h-5 text-indigo-400" />,
      shortDesc: "Clusters extracted text blocks horizontally and vertically to reconstruct tables and code blocks.",
      details: {
        title: "Layout-Aware Spatial OCR Engine",
        math: "Spatial Clustering Rule:\nBoxes b1, b2 are merged if y_distance(b1, b2) < threshold_y AND x_overlap(b1, b2) > threshold_x",
        code: `# coordinate-based grouping inside ocr_service.py
grouped_lines = []
for line in sorted_raw_ocr_lines:
    if abs(line.y - current_line.y) < LINE_HEIGHT_THRESHOLD:
        current_line.add_word(line)
# Reconstruct markdown representations
table_md = rebuild_markdown_table(grouped_lines)`,
        desc: "Avoids naive OCR parsers which scrape text line-by-line across multi-column pages. Grouping characters into logical spatial bounding boxes ensures code blocks are grouped together and markdown tables retain column-row relationships before indexing."
      }
    },
    {
      id: "ingest-3",
      path: "ingestion",
      title: "Dual-Index Storage",
      subtitle: "Ingestion - Phase 3",
      icon: <Database className="w-5 h-5 text-indigo-400" />,
      shortDesc: "Embeds chunks into FAISS vector database while indexing lexical tokens in a BM25 sparse index.",
      details: {
        title: "Dual-Indexing: Dense FAISS & Sparse BM25",
        math: "Sparse BM25 Index:\nIDF(q_i) = ln( (N - n(q_i) + 0.5) / (n(q_i) + 0.5) + 1 )\nDense Embeddings:\nall-MiniLM-L6-v2 model mapping text to R^384 vectors.",
        code: `# Build both indices in rag_pipeline.py
self.index = faiss.IndexFlatL2(384) # Dense FAISS
self.bm25 = BM25Indexer(chunks)     # Sparse Lexical`,
        desc: "Indexing documents twice. FAISS handles high-level semantic matching and concept mapping. The BM25 lexical index indexes specific codes, serial numbers, command parameters, and tokens, overcoming standard vector matching limits."
      }
    },

    // Query Path
    {
      id: "query-1",
      path: "query",
      title: "Input Ticket Query",
      subtitle: "Runtime - Phase 1",
      icon: <MessageSquare className="w-5 h-5 text-emerald-400" />,
      shortDesc: "Captures support tickets or live queries, evaluating ticket priorities and sentiments.",
      details: {
        title: "Runtime Query Capture",
        math: "Sentiment Metrics: Categorizes input as POSITIVE, NEUTRAL, or FRUSTRATED\nPriority Routing: P0 (high-risk), P1, or P2.",
        code: `# Ticket routing in main.py
ticket_data = classify_ticket(query)
if ticket_data.priority == "P0":
    escalate_to_human_agents()
# Fire RAG execution pipeline
response = rag_pipeline.generate_answer(query)`,
        desc: "Incoming support tickets are parsed. If a query matches technical documentation topics, the hybrid search engine fires. Otherwise, standard classification routes the ticket to relevant team queues."
      }
    },
    {
      id: "query-2",
      path: "query",
      title: "Hybrid RRF Fusion",
      subtitle: "Runtime - Phase 2",
      icon: <Layers className="w-5 h-5 text-emerald-400" />,
      shortDesc: "Executes dense and sparse searches in parallel, merging candidate lists using Reciprocal Rank Fusion.",
      details: {
        title: "Reciprocal Rank Fusion (RRF)",
        math: "RRF Score Formula:\nRRF(d) = sum( 1 / (60 + rank_retriever(d)) for retriever in [Dense, Sparse] )",
        code: `# Rank merging loop in rag_pipeline.py
rrf_scores = {}
for rank, doc in enumerate(dense_results):
    rrf_scores[doc.id] = rrf_scores.get(doc.id, 0) + 1.0 / (60 + rank)
for rank, doc in enumerate(sparse_results):
    rrf_scores[doc.id] = rrf_scores.get(doc.id, 0) + 1.0 / (60 + rank)
top_candidates = sort_by_score(rrf_scores)[:20]`,
        desc: "Executes L2 flat dense retrieval and BM25 token searches concurrently, returning the top 20 documents from each. It merges ranks using RRF (constant k=60), ensuring that chunks scoring well across both semantic and exact keyword indices float to the top."
      }
    },
    {
      id: "query-3",
      path: "query",
      title: "Cross-Encoder Rerank",
      subtitle: "Runtime - Phase 3",
      icon: <Filter className="w-5 h-5 text-emerald-400" />,
      shortDesc: "Applies a local ms-marco Cross-Encoder model to prune ambient context noise down to 5 chunks.",
      details: {
        title: "Cross-Encoder Context Reranking",
        math: "Attention Matrix: Cross-Attention over Joint Query-Passage Tokens\nPayload Reduction: 20 raw chunks compressed to top 5 (Token savings: ~60%)",
        code: `# Compute joint scores in rag_pipeline.py
pairs = [[query, doc.text] for doc in top_candidates]
scores = cross_encoder_model.predict(pairs)
# Re-order and slice down to top 5
reranked = [d for _, d in sorted(zip(scores, top_candidates), reverse=True)]
final_context = reranked[:5]`,
        desc: "Vector encoders encode queries and documents independently (Bi-Encoders). A Cross-Encoder feeds the query and retrieved document chunk into the transformer network simultaneously, capturing deep attention weights. This rejects false positives and ensures the LLM receives the most relevant information."
      }
    },
    {
      id: "query-4",
      path: "query",
      title: "LLM Generation",
      subtitle: "Runtime - Phase 4",
      icon: <Cpu className="w-5 h-5 text-emerald-400" />,
      shortDesc: "Generates technical answers using cached Groq Llama-3 endpoints populated with reranked context.",
      details: {
        title: "LLM Synthesis with Groq Llama-3",
        math: "Context Window: ~3,000 tokens\nGeneration Target: Markdown response with Python code blocks and tabular output.",
        code: `# LLM call inside generate_answer
system_prompt = "You are a support engineer. Reply using context..."
completion = groq_client.chat.completions.create(
    model="llama-3.1-8b-instant",
    messages=[{"role": "system", "content": system_prompt},
              {"role": "user", "content": f"Context: {context}\\nQuery: {query}"}],
    temperature=0.0
)`,
        desc: "Fuses the filtered top 5 context chunks with the user's support ticket, prompting Llama-3 on Groq's high-speed inference engine. Temperature is set to 0.0 to prevent creative drift and guarantee factual, deterministic troubleshooting steps."
      }
    },
    {
      id: "query-5",
      path: "query",
      title: "Async Telemetry",
      subtitle: "Runtime - Phase 5",
      icon: <Terminal className="w-5 h-5 text-emerald-400" />,
      shortDesc: "Evaluates faithfulness and relevance via background thread LLM-as-a-Judge, saving logs to Supabase.",
      details: {
        title: "Background Evaluation & DB Telemetry",
        math: "Metrics Measured:\nFaithfulness (grounded statement check) [0.0 - 1.0]\nAnswer Relevance (semantic intent overlap) [0.0 - 1.0]",
        code: `# Async dispatch in main.py
def _run_async_evaluation(ticket_id, query, response_data):
    def evaluate_task():
        scores = calculate_system_metrics(context, answer, query)
        save_metrics_to_supabase(ticket_id, scores)
    threading.Thread(target=evaluate_task).start()`,
        desc: "To prevent evaluations from blocking API responses, queries are immediately answered. A background thread is dispatched to perform LLM-as-a-judge evaluations for hallucinations and intent matches, recording results and chunk provenances to Supabase tables."
      }
    }
  ];

  return (
    <section id="workflow-visualizer" className="py-24 bg-zinc-950 px-6 max-w-7xl mx-auto border-b border-zinc-900">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-zinc-50 via-zinc-100 to-zinc-400 bg-clip-text text-transparent mb-4 tracking-tight">
          System Architecture Pipeline
        </h2>
        <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto">
          Trace how technical queries are processed, from ingestion document parsing to runtime RRF scoring and asynchronous evaluation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left/Middle Column: Pipelines Visualizer */}
        <div className="lg:col-span-7 space-y-12 relative">
          
          {/* Ingestion Path */}
          <div>
            <h3 className="text-sm font-bold text-indigo-400 tracking-wider uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              1. Document Ingestion Flow
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
              {nodes
                .filter((n) => n.path === "ingestion")
                .map((node, index) => (
                  <motion.div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    whileHover={{ scale: 1.02 }}
                    className={`relative p-5 rounded-xl border bg-zinc-900/50 cursor-pointer transition-all duration-200 ${
                      selectedNode?.id === node.id 
                        ? "border-indigo-500 shadow-md shadow-indigo-500/5 bg-zinc-900/90" 
                        : "border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/70"
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2.5">
                      <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800 shrink-0">
                        {node.icon}
                      </div>
                      <h4 className="text-sm font-bold text-zinc-100">{node.title}</h4>
                    </div>
                    <p className="text-zinc-400 text-[11px] leading-relaxed line-clamp-3">{node.shortDesc}</p>
                  </motion.div>
                ))}
            </div>
          </div>

          {/* Central Connecting SVG Visualizer (for larger screens) */}
          <div className="hidden md:block h-6 relative py-2 overflow-visible">
            <svg className="w-full h-full absolute inset-0 overflow-visible pointer-events-none" viewBox="0 0 100 20" preserveAspectRatio="none">
              {/* Connecting line between Ingestion and Querying */}
              <line 
                x1="83%" y1="0" x2="17%" y2="20" 
                stroke="#4f46e5" strokeWidth="1.5" strokeOpacity="0.25"
                strokeDasharray="4 4"
              />
            </svg>
          </div>

          {/* Querying Path */}
          <div>
            <h3 className="text-sm font-bold text-emerald-400 tracking-wider uppercase mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              2. Query Processing Flow
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {nodes
                .filter((n) => n.path === "query")
                .map((node, index) => (
                  <motion.div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    whileHover={{ scale: 1.02 }}
                    className={`relative p-3.5 rounded-xl border bg-zinc-900/50 cursor-pointer transition-all duration-200 ${
                      selectedNode?.id === node.id 
                        ? "border-emerald-500 shadow-md shadow-emerald-500/5 bg-zinc-900/90" 
                        : "border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/70"
                    }`}
                  >
                    <div className="flex flex-col items-start gap-2.5 mb-2">
                      <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                        {node.icon}
                      </div>
                      <h4 className="text-[12px] font-bold text-zinc-100 leading-tight">{node.title}</h4>
                    </div>
                    <p className="text-zinc-400 text-[10px] leading-relaxed line-clamp-4">{node.shortDesc}</p>
                  </motion.div>
                ))}
            </div>
          </div>

        </div>

        {/* Right Column: Code & Mathematics Detailed Drawer */}
        <div className="lg:col-span-5">
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md p-6 sm:p-8 space-y-6"
              >
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">{selectedNode.subtitle}</span>
                  <h3 className="text-xl font-bold text-zinc-50 mb-3">{selectedNode.details.title}</h3>
                  <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">{selectedNode.details.desc}</p>
                </div>

                {/* Mathematical Equation Block */}
                <div className="bg-zinc-950/70 rounded-xl p-4 border border-zinc-800/60">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-2">Algorithm & Concept Details</h4>
                  <div className="text-xs font-mono text-zinc-300 whitespace-pre-line leading-relaxed overflow-x-auto">
                    {selectedNode.details.math}
                  </div>
                </div>

                {/* Code Snippet Block */}
                <div className="bg-zinc-950/90 rounded-xl p-4 border border-zinc-900 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Implementation Snippet</h4>
                    <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">python</span>
                  </div>
                  <pre className="text-[10px] font-mono text-emerald-400/90 overflow-x-auto leading-relaxed max-h-56 select-text whitespace-pre">
                    <code>{selectedNode.details.code}</code>
                  </pre>
                </div>
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-12 text-center text-zinc-500 flex flex-col items-center justify-center min-h-[350px]">
                <HelpCircle className="w-12 h-12 text-zinc-800 mb-4 animate-bounce" />
                <h3 className="text-md font-bold text-zinc-400 mb-1">Click a Processing Node</h3>
                <p className="text-zinc-600 text-xs max-w-xs leading-relaxed">
                  Select any step in the ingestion or querying pipeline to inspect formulas, algorithms, and actual backend Python parameters.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
