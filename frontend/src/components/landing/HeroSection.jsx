import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Terminal, Shield } from "lucide-react";
import Particles from "../ui/Particles";
import BorderBeam from "../ui/BorderBeam";

export default function HeroSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 },
    },
  };

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-zinc-950 px-6 py-20 bg-radial-glow border-b border-zinc-900">
      {/* Background Scrolling Grid Layer */}
      <div className="absolute inset-0 animate-grid-scroll opacity-40 pointer-events-none" />

      {/* Floating Canvas Particles */}
      <Particles quantity={45} staticity={40} ease={50} color="#6366f1" className="opacity-30" />
      <Particles quantity={30} staticity={30} ease={30} color="#a855f7" className="opacity-20" />

      {/* Mask to fade grid near bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto text-center z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          {/* Subtitle Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center space-x-2 bg-zinc-900/80 backdrop-blur border border-zinc-800/80 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider text-indigo-400 mb-6 uppercase shadow-lg shadow-indigo-500/5"
          >
            <Shield className="w-3.5 h-3.5 animate-pulse" />
            <span>Production-Grade Context Architecture</span>
          </motion.div>

          {/* Headline Title */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-b from-zinc-50 via-zinc-200 to-zinc-500 bg-clip-text text-transparent mb-6 max-w-4xl"
          >
            Beyond Naive RAG API Wrappers
          </motion.h1>

          {/* Supporting Copy */}
          <motion.p
            variants={itemVariants}
            className="text-base sm:text-lg md:text-xl text-zinc-400 font-medium max-w-2xl mb-10 leading-relaxed"
          >
            An advanced Customer Support Copilot engineered with hybrid dense-sparse search, 
            Cross-Encoder context reranking, table-aware OCR, and background LLM-as-a-judge telemetry.
          </motion.p>

          {/* Action CTAs */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4">
            {/* Primary Launch Dashboard Button */}
            <Link
              to="/dashboard"
              className="group relative flex items-center justify-center space-x-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-bold px-8 py-4 rounded-xl border border-zinc-800 shadow-2xl hover:shadow-indigo-500/10 transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
            >
              <span>Launch Support Copilot</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              <BorderBeam size={120} duration={8} borderWidth={1.5} colorFrom="#6366f1" colorTo="#a855f7" />
            </Link>

            {/* Secondary Architecture Button */}
            <button
              onClick={() => {
                document.getElementById("workflow-visualizer")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center space-x-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 font-medium px-6 py-4 rounded-xl border border-zinc-900 hover:border-zinc-800 transition-all"
            >
              <Terminal className="w-4 h-4" />
              <span>Explore Custom Pipeline</span>
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
