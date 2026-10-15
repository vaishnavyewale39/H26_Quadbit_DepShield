import React, { useState } from 'react';
import { ShieldAlert, ArrowRight, Loader2, GitFork, BookOpen, Layers, Cpu, CheckCircle2 } from 'lucide-react';

export default function LandingHero({ onAnalyze, isLoading, error, analysisProgress }) {
  const [repoUrl, setRepoUrl] = useState('https://github.com/rishrek/LinkWatch');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    onAnalyze(repoUrl.trim());
  };

  const sampleRepos = [
    { name: 'This Workspace (Local)', url: 'local' },
    { name: 'rishrek/LinkWatch (Python)', url: 'https://github.com/rishrek/LinkWatch' },
    { name: 'psf/requests (Python)', url: 'https://github.com/psf/requests' },
    { name: 'expressjs/express (Node.js)', url: 'https://github.com/expressjs/express' }
  ];

  return (
    <div className="relative pt-6 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Main Headline */}
      <div className="text-center max-w-4xl mx-auto mb-8">
        <h1 className="heading-font text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#092635] tracking-tight leading-tight">
          Your Dependencies. <br className="hidden sm:inline" />
          <span className="text-[#1B4242] underline decoration-[#5C8374] decoration-4 underline-offset-6">
            Under Control.
          </span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-[#1B4242] body-font max-w-2xl mx-auto leading-relaxed">
          Analyze real repositories, uncover dependency risks, and evaluate migration outcomes with AI-guided resilience.
        </p>
      </div>

      {/* Repository Input Box */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl p-3 sm:p-4 shadow-lg shadow-[#092635]/5 border border-[#5C8374]/30">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <GitFork className="h-5 w-5 text-[#5C8374]" />
            </div>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="e.g. owner/repo, https://github.com/owner/repo, or 'local'"
              required
              disabled={isLoading}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#F0F7F4] border border-[#5C8374]/30 text-[#092635] placeholder-[#5C8374]/60 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-[#1B4242] focus:bg-white transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !repoUrl.trim()}
            className="px-6 py-3 rounded-xl bg-[#1B4242] hover:bg-[#5C8374] disabled:bg-gray-300 text-white font-medium text-sm shadow-md transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Analyzing Repo...</span>
              </>
            ) : (
              <>
                <span>Analyze Repository</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Sample Selector */}
        <div className="mt-3 pt-3 border-t border-[#5C8374]/20 flex flex-wrap items-center justify-between gap-2 text-xs text-[#1B4242]">
          <span className="font-medium">Try public repositories:</span>
          <div className="flex flex-wrap gap-2">
            {sampleRepos.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setRepoUrl(s.url)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-md bg-[#F0F7F4] hover:bg-[#5C8374] hover:text-white text-[#1B4242] font-normal border border-[#5C8374]/40 transition-colors cursor-pointer"
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Loading Progress Bar */}
      {isLoading && (
        <div className="max-w-xl mx-auto mt-6 bg-white rounded-xl p-4 border border-[#5C8374]/40 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-[#1B4242] mb-2">
            <span>{analysisProgress?.stage || 'Cloning repository & inspecting AST...'}</span>
            <span>{analysisProgress?.percent || 30}%</span>
          </div>
          <div className="w-full bg-[#9EC8B9]/30 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#1B4242] h-2 rounded-full transition-all duration-300"
              style={{ width: `${analysisProgress?.percent || 35}%` }}
            />
          </div>
          <p className="text-[11px] text-[#5C8374] mt-2 text-center">
            Parsing manifests &bull; Scanning import sites &bull; Synthesizing resilience recommendations
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="max-w-2xl mx-auto mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm flex items-start space-x-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Analysis Failed</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Feature Showcase Grid */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-5 max-w-6xl mx-auto">
        <div className="bg-white rounded-xl p-5 border border-[#5C8374]/30 shadow-xs hover:border-[#1B4242] transition-all">
          <div className="w-9 h-9 rounded-lg bg-[#9EC8B9]/30 text-[#1B4242] flex items-center justify-center mb-3">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="heading-font text-sm font-bold text-[#092635] mb-1">
            AST & Manifest Scanner
          </h3>
          <p className="text-xs text-[#1B4242]/80 body-font leading-relaxed">
            Discovers pyproject.toml, package.json, Cargo.toml, and go.mod. Scans actual source code files for live import sites.
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#5C8374]/30 shadow-xs hover:border-[#1B4242] transition-all">
          <div className="w-9 h-9 rounded-lg bg-[#9EC8B9]/30 text-[#1B4242] flex items-center justify-center mb-3">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="heading-font text-sm font-bold text-[#092635] mb-1">
            Resilience Engine
          </h3>
          <p className="text-xs text-[#1B4242]/80 body-font leading-relaxed">
            Explains maintenance risks using repository evidence, proposes modern battle-tested replacements, and drafts code diffs.
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#5C8374]/30 shadow-xs hover:border-[#1B4242] transition-all">
          <div className="w-9 h-9 rounded-lg bg-[#9EC8B9]/30 text-[#1B4242] flex items-center justify-center mb-3">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="heading-font text-sm font-bold text-[#092635] mb-1">
            Sandbox Verification
          </h3>
          <p className="text-xs text-[#1B4242]/80 body-font leading-relaxed">
            Applies proposed migrations inside safe temporary sandboxes. Proves syntax, manifest compatibility, and import health.
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#5C8374]/30 shadow-xs hover:border-[#1B4242] transition-all">
          <div className="w-9 h-9 rounded-lg bg-[#9EC8B9]/30 text-[#1B4242] flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="heading-font text-sm font-bold text-[#092635] mb-1">
            README & Report Export
          </h3>
          <p className="text-xs text-[#1B4242]/80 body-font leading-relaxed">
            Generates side-by-side README documentation diffs and compiles publication-ready ReportLab Platypus PDFs.
          </p>
        </div>
      </div>
    </div>
  );
}
