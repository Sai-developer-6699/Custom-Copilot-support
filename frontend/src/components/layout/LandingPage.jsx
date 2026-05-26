import React from "react";
import Header from "./Header";
import HeroSection from "../landing/HeroSection";
import FeatureComparisonMatrix from "../landing/FeatureComparisonMatrix";
import InteractiveWorkflow from "../landing/InteractiveWorkflow";
import MetricsDashboard from "../landing/MetricsDashboard";
import { Link } from "react-router-dom";
import { ArrowRight, Github, ExternalLink } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Shared Header Navigation */}
      <Header />

      {/* Hero Zone */}
      <HeroSection />

      {/* Performance & Metrics Dashboard */}
      <MetricsDashboard />

      {/* Pipeline Dataflow Visualizer */}
      <InteractiveWorkflow />

      {/* Feature Bento Grid Comparison */}
      <FeatureComparisonMatrix />

      {/* Call to Action Footer */}
      <footer className="relative bg-zinc-950 px-6 py-20 border-t border-zinc-900 overflow-hidden">
        {/* Glow decorative block */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative max-w-4xl mx-auto text-center space-y-8 z-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent tracking-tight">
            Ready to test the Copilot Dashboard?
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Interact with customer tickets, trace context embeddings, clear caches, and upload files to inspect real-time classification and response flows.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center space-x-2 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-7 py-3.5 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5"
            >
              <span>Launch Live Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://github.com/Sai-developer-6699/Custom-Copilot-support"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold px-6 py-3.5 rounded-xl border border-zinc-800 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>Explore Codebase</span>
            </a>
          </div>

          <div className="pt-16 border-t border-zinc-900 text-zinc-600 text-[10px] tracking-wide flex flex-col sm:flex-row items-center justify-between gap-4">
            <span>© 2026 Atlan-AI Support Copilot Portfolio. Built for LinkedIn Showcase.</span>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-zinc-400 transition-colors">Documentation</a>
              <a href="#" className="hover:text-zinc-400 transition-colors flex items-center gap-1">
                Portfolio Home <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
