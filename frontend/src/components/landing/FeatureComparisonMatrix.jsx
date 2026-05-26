import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Cpu, HelpCircle, Layers, FileText, Database } from "lucide-react";

// Local Spotlight Card Component for Aceternity spotlight hover effects
const SpotlightCard = ({ children, className = "", isPrimary = false }) => {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const glowColor = isPrimary ? "rgba(99, 102, 241, 0.15)" : "rgba(239, 68, 68, 0.05)";
  const borderColor = isPrimary ? "group-hover:border-indigo-500/40" : "group-hover:border-red-500/20";

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative overflow-hidden rounded-2xl border bg-zinc-900/35 backdrop-blur-md p-6 sm:p-8 transition-all duration-300 ${
        isPrimary ? "border-zinc-800/80 shadow-md shadow-indigo-500/2" : "border-zinc-900/60"
      } ${borderColor} ${className}`}
    >
      {isHovered && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(350px circle at ${coords.x}px ${coords.y}px, ${glowColor}, transparent 85%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default function FeatureComparisonMatrix() {
  const comparisonData = [
    {
      title: "Retrieval Strategy",
      icon: <Database className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />,
      naive: {
        title: "Naive Vector-Only Search",
        desc: "Uses cosine similarity alone. Suffers from keyword matching failures and lacks exact term indexing (typos/specific IDs are completely missed).",
      },
      advanced: {
        title: "Dense + Sparse Hybrid (FAISS + BM25)",
        desc: "Combines semantic density embeddings with lexical BM25 token frequencies, fused using Reciprocal Rank Fusion (RRF, k=60) for high recall accuracy.",
        tags: ["FAISS", "BM25", "RRF Fusion"],
      },
    },
    {
      title: "Context Optimization",
      icon: <Layers className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />,
      naive: {
        title: "Blind Context Splitting",
        desc: "Pipes the raw top-20 retrieved text chunks directly into the LLM context, bloating payload sizes and triggering 'lost in the middle' attention lapses.",
      },
      advanced: {
        title: "Cross-Encoder Context Reranking",
        desc: "Leverages a local ms-marco-MiniLM reranker to compute exact query-passage relationships, trimming payload to the top 5 chunks. Cuts tokens by ~60%.",
        tags: ["ms-marco", "Reranker", "Token Compression"],
      },
    },
    {
      title: "Document Ingestion Quality",
      icon: <FileText className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />,
      naive: {
        title: "Linear Plain-Text OCR Parsing",
        desc: "Scrapes images and documents line-by-line. Scrambles structured data sheets and tables into unreadable strings, breaking database rows.",
      },
      advanced: {
        title: "Layout-Aware Spatial OCR Fusing",
        desc: "Clusters text boxes dynamically via vertical/horizontal coordinates. Programmatically rebuilds markdown table borders and code blocks.",
        tags: ["Spatial Grouping", "Markdown Reconstruction"],
      },
    },
    {
      title: "Quality Assurance & Evaluation",
      icon: <Cpu className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />,
      naive: {
        title: "Zero Production Monitoring",
        desc: "Queries are processed blindly. No evaluation metrics are logged, leaving support teams unaware of hallucinations or irrelevant responses.",
      },
      advanced: {
        title: "Async LLM-as-a-Judge Telemetry",
        desc: "Evaluates every session asynchronously in a background thread for Faithfulness and Relevance. Logs metrics and block provenances to Supabase.",
        tags: ["LLM-as-a-Judge", "Supabase Logging", "Async Telemetry"],
      },
    },
  ];

  return (
    <section id="feature-matrix" className="py-24 bg-zinc-950 px-6 max-w-7xl mx-auto border-b border-zinc-900">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-zinc-50 via-zinc-100 to-zinc-400 bg-clip-text text-transparent mb-4 tracking-tight">
          How Atlan-AI Solves RAG Challenges
        </h2>
        <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto">
          A side-by-side technical breakdown showing how custom context architecture compares to average API wrappers.
        </p>
      </div>

      <div className="space-y-12">
        {comparisonData.map((item, index) => (
          <div key={index} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Category Header */}
            <div className="lg:col-span-3 flex lg:flex-col items-center lg:items-start gap-3">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                {item.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-200">{item.title}</h3>
                <span className="text-xs text-zinc-500 font-medium">Core Component {index + 1}</span>
              </div>
            </div>

            {/* Comparison Cards Grid */}
            <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Naive Card */}
              <SpotlightCard>
                <div className="flex items-start space-x-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500/80 shrink-0 mt-0.5" />
                  <h4 className="text-md font-bold text-zinc-300">{item.naive.title}</h4>
                </div>
                <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed">{item.naive.desc}</p>
              </SpotlightCard>

              {/* Advanced Card */}
              <SpotlightCard isPrimary={true}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <h4 className="text-md font-bold text-zinc-100">{item.advanced.title}</h4>
                  </div>
                </div>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-5">{item.advanced.desc}</p>
                {/* Tech tags */}
                <div className="flex flex-wrap gap-1.5">
                  {item.advanced.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="text-[10px] font-semibold bg-indigo-500/5 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/10 tracking-wide"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </SpotlightCard>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
