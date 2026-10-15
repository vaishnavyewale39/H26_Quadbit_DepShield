import React, { useState, useEffect } from 'react';
import { FileText, Copy, Download, GitCompare, Eye, Check, AlertCircle, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';

export default function ReadmeComparisonView({ analysisId, repoName }) {
  const [comparison, setComparison] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side', 'diff', 'preview'
  const [copied, setCopied] = useState(false);

  const fetchReadmeComparison = async () => {
    if (!analysisId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.improveReadme(analysisId);
      setComparison(data);
    } catch (err) {
      setError(err.message || 'Failed to generate improved README');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReadmeComparison();
  }, [analysisId]);

  const handleCopy = () => {
    if (!comparison?.proposed_readme) return;
    navigator.clipboard.writeText(comparison.proposed_readme);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!comparison?.proposed_readme) return;
    const blob = new Blob([comparison.proposed_readme], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#5C8374]/30 shadow-sm overflow-hidden mb-8">
      {/* Top Banner and Actions */}
      <div className="p-5 border-b border-[#5C8374]/20 bg-[#F0F7F4] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#1B4242] text-white flex items-center justify-center shadow-xs">
            <FileText className="w-5 h-5 text-[#9EC8B9]" />
          </div>
          <div>
            <h2 className="heading-font text-lg font-bold text-[#092635]">
              AI-Powered README Improvement Workflow
            </h2>
            <p className="text-xs text-[#1B4242] body-font">
              Grounded in discovered entrypoints, manifests, and environment variables
            </p>
          </div>
        </div>

        {/* View Controls & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-white p-1 rounded-lg border border-[#5C8374]/30 text-xs">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'side-by-side' ? 'bg-[#1B4242] text-white' : 'text-[#1B4242] hover:bg-[#9EC8B9]/30'
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setViewMode('diff')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'diff' ? 'bg-[#1B4242] text-white' : 'text-[#1B4242] hover:bg-[#9EC8B9]/30'
              }`}
            >
              Unified Diff
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'preview' ? 'bg-[#1B4242] text-white' : 'text-[#1B4242] hover:bg-[#9EC8B9]/30'
              }`}
            >
              Markdown Preview
            </button>
          </div>

          {/* Regenerate Button */}
          <button
            onClick={fetchReadmeComparison}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg border border-[#5C8374]/30 bg-white hover:bg-[#F0F7F4] text-[#1B4242] text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            disabled={!comparison}
            className="px-3 py-1.5 rounded-lg border border-[#5C8374]/30 bg-white hover:bg-[#F0F7F4] text-[#092635] text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          {/* Download README.md */}
          <button
            onClick={handleDownload}
            disabled={!comparison}
            className="px-3.5 py-1.5 rounded-lg bg-[#1B4242] hover:bg-[#5C8374] text-white text-xs font-medium shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download README.md</span>
          </button>
        </div>
      </div>

      {/* Summary of Improvements Callout */}
      {comparison && (
        <div className="p-4 bg-[#F0F7F4] border-b border-[#5C8374]/20 text-xs space-y-2">
          <div className="flex items-center space-x-2 text-[#1B4242] font-bold">
            <FileText className="w-4 h-4 text-[#5C8374]" />
            <span>Documentation Enhancements Summary:</span>
          </div>
          <p className="text-[#1B4242] leading-relaxed">
            {comparison.summary_of_improvements}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <span className="font-semibold text-[#092635]">Sections Added:</span>
            {comparison.sections_added.map((sec, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded bg-white text-[#1B4242] font-medium border border-[#5C8374]/30">
                + {sec}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-red-50 text-red-800 text-xs border-b border-red-200">
          {error}
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        <div className="p-16 text-center text-[#1B4242] text-sm flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B4242]" />
          <span className="font-semibold text-[#092635]">Synthesizing repository evidence into a production README...</span>
          <span className="text-xs">Inspecting entry points, environment variables, tests, and dependencies</span>
        </div>
      ) : !comparison ? (
        <div className="p-12 text-center text-xs text-[#1B4242]">
          Click &ldquo;Regenerate&rdquo; to improve this repository&apos;s documentation.
        </div>
      ) : (
        <div className="p-5">
          {/* MODE 1: SIDE-BY-SIDE */}
          {viewMode === 'side-by-side' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Original README */}
              <div className="rounded-xl border border-[#5C8374]/30 bg-[#F0F7F4] overflow-hidden flex flex-col">
                <div className="p-3 bg-gray-100 border-b border-gray-200 text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span>Original Repository README</span>
                  <span className="text-gray-500 font-normal">Read-only baseline</span>
                </div>
                <div className="p-4 overflow-y-auto max-h-[550px] font-mono text-xs text-[#092635] whitespace-pre-wrap leading-relaxed">
                  {comparison.original_readme}
                </div>
              </div>

              {/* Right: Proposed Improved README */}
              <div className="rounded-xl border border-[#5C8374]/40 bg-white overflow-hidden flex flex-col shadow-xs">
                <div className="p-3 bg-[#F0F7F4] border-b border-[#5C8374]/30 text-xs font-bold text-[#1B4242] flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#1B4242]" />
                    <span>Proposed Improved README.md</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-white text-[#1B4242] font-semibold border border-[#5C8374]/30">
                    Ready to Export
                  </span>
                </div>
                <div className="p-4 overflow-y-auto max-h-[550px] font-mono text-xs text-[#092635] whitespace-pre-wrap leading-relaxed">
                  {comparison.proposed_readme}
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: UNIFIED DIFF */}
          {viewMode === 'diff' && (
            <div className="rounded-xl border border-[#5C8374]/30 bg-[#092635] text-gray-200 overflow-hidden font-mono text-xs">
              <div className="p-3 bg-[#1B4242] border-b border-[#5C8374]/40 text-xs font-semibold text-gray-300 flex items-center justify-between">
                <span>Unified Git Diff (Original vs Proposed)</span>
                <span className="text-[#9EC8B9] font-normal">+ additions in mint, - removals in red</span>
              </div>
              <div className="p-4 overflow-y-auto max-h-[550px] whitespace-pre-wrap leading-relaxed">
                {comparison.diff_text.split('\n').map((line, idx) => {
                  let colorClass = 'text-gray-300';
                  let bgClass = '';
                  if (line.startsWith('+')) {
                    colorClass = 'text-[#9EC8B9] font-semibold';
                    bgClass = 'bg-[#1B4242]/40 px-1 rounded-xs';
                  } else if (line.startsWith('-')) {
                    colorClass = 'text-red-300 font-semibold';
                    bgClass = 'bg-red-950/40 px-1 rounded-xs';
                  } else if (line.startsWith('@@')) {
                    colorClass = 'text-yellow-300 font-bold';
                  }
                  return (
                    <div key={idx} className={`${colorClass} ${bgClass} py-0.5`}>
                      {line || ' '}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODE 3: MARKDOWN PREVIEW */}
          {viewMode === 'preview' && (
            <div className="rounded-xl border border-[#5C8374]/30 bg-white p-6 overflow-y-auto max-h-[550px] text-[#092635]">
              <div className="p-3 mb-4 rounded-lg bg-[#F0F7F4] text-xs text-[#1B4242] font-medium border border-[#5C8374]/30">
                Rendered live preview of the proposed README documentation.
              </div>
              <div className="space-y-4">
                {comparison.proposed_readme.split('\n\n').map((block, bIdx) => {
                  if (block.startsWith('# ')) {
                    return <h1 key={bIdx} className="heading-font text-2xl font-bold text-[#1B4242] pb-2 border-b border-[#5C8374]/20">{block.replace('# ', '')}</h1>;
                  }
                  if (block.startsWith('## ')) {
                    return <h2 key={bIdx} className="heading-font text-lg font-bold text-[#092635] pt-2">{block.replace('## ', '')}</h2>;
                  }
                  if (block.startsWith('```')) {
                    return (
                      <pre key={bIdx} className="p-3 bg-[#092635] text-gray-100 rounded-lg text-xs overflow-x-auto font-mono">
                        {block.replace(/```[a-z]*/g, '')}
                      </pre>
                    );
                  }
                  return <p key={bIdx} className="text-xs text-[#1B4242] leading-relaxed">{block}</p>;
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
