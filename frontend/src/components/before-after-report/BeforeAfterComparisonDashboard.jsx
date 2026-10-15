import React, { useState, useEffect } from 'react';
import { BarChart3, Download, FileText, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Loader2, Code2, Layers } from 'lucide-react';
import { api } from '../../services/api';

export default function BeforeAfterComparisonDashboard({ analysisId, comparisonId, repoName, onSelectCandidate }) {
  const [comparison, setComparison] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!analysisId) return;
    setIsLoading(true);
    api.getComparison(comparisonId || analysisId)
      .then((data) => setComparison(data))
      .catch((err) => {
        api.improveReadme(analysisId)
          .then(() => api.getComparison(analysisId))
          .then((d) => setComparison(d))
          .catch((e) => setError(e.message));
      })
      .finally(() => setIsLoading(false));
  }, [analysisId, comparisonId]);

  const handleDownloadPdf = async () => {
    if (!analysisId) return;
    setIsDownloadingPdf(true);
    try {
      const blob = await api.downloadPdfReport(analysisId, comparison?.comparison_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DepShield_Assessment_${repoName?.replace('/', '_') || 'Report'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`PDF download failed: ${err.message}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleExportMarkdown = async () => {
    if (!comparison) return;
    try {
      const md = await api.exportComparisonMarkdown(comparison.comparison_id);
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DepShield_Comparison_${repoName?.replace('/', '_') || 'Report'}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[#5C8374]/30 p-16 text-center shadow-xs">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B4242] mx-auto mb-3" />
        <h3 className="heading-font text-base font-bold text-[#092635]">
          Computing Empirical Before vs After Metrics...
        </h3>
        <p className="text-xs text-[#1B4242] mt-1">
          Evaluating proposed modernizations and sandbox verification logs
        </p>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="bg-white rounded-2xl border border-[#5C8374]/30 p-8 text-center text-xs text-[#1B4242]">
        No comparison data available yet. Please complete a repository scan first.
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Executive Comparison Banner */}
      <div className="bg-white rounded-2xl border border-[#5C8374]/30 shadow-xs p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#5C8374]/20">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-[#1B4242] text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-6 h-6 text-[#9EC8B9]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="heading-font text-xl font-bold text-[#092635]">
                  Before vs Proposed After Comparison
                </h2>
              </div>
              <p className="text-xs text-[#1B4242] body-font mt-0.5">
                Target: <span className="font-semibold text-[#092635]">{comparison.repo_url}</span> &bull; Commit: <code className="text-[#1B4242] font-bold">{comparison.commit_hash?.slice(0, 8)}</code>
              </p>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportMarkdown}
              className="px-3.5 py-2 rounded-xl border border-[#5C8374]/30 bg-white hover:bg-[#F0F7F4] text-[#092635] text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#5C8374]" />
              <span>Export Markdown</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-5 py-2 rounded-xl bg-[#1B4242] hover:bg-[#5C8374] text-white text-xs font-medium shadow-xs transition-all flex items-center space-x-2 cursor-pointer disabled:bg-gray-400"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Compiling PDF Report...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Generate PDF Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Executive Resilience Analysis Quote */}
        <div className="mt-5 p-4 rounded-xl bg-[#F0F7F4] border border-[#5C8374]/30 text-xs leading-relaxed space-y-2">
          <div className="flex items-center space-x-2 text-[#1B4242] font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-[#1B4242]" />
            <span>Executive Resilience Synthesis</span>
          </div>
          <div className="text-[#092635] space-y-2">
            {comparison.gemma_summary?.split('\n\n').map((para, i) => (
              <p key={i}>{para.replace('### ', '').replace(/\*\*/g, '')}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Comparison Table */}
      <div className="bg-white rounded-2xl border border-[#5C8374]/30 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#5C8374]/20 bg-[#F0F7F4]">
          <h3 className="heading-font text-base font-bold text-[#092635]">
            Comprehensive Resilience Metrics Matrix
          </h3>
          <p className="text-xs text-[#1B4242] body-font">
            Measured differences between the original repository baseline and the proposed resilient configuration
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#1B4242] text-white border-b border-[#1B4242]">
                <th className="py-3 px-4 font-bold">Metric Dimension</th>
                <th className="py-3 px-4 font-bold">Original Baseline (Before)</th>
                <th className="py-3 px-4 font-bold">Proposed State (After)</th>
                <th className="py-3 px-4 font-bold">Net Change</th>
                <th className="py-3 px-4 font-bold">Measurement Methodology</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#5C8374]/20">
              {comparison.metrics?.map((m, idx) => (
                <tr key={idx} className="hover:bg-[#F0F7F4] transition-colors">
                  <td className="py-3 px-4 font-bold text-[#092635]">
                    {m.metric}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#D9534F] font-medium">
                    {m.before}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#1B4242] font-bold">
                    {m.after}
                  </td>
                  <td className="py-3 px-4 font-bold text-[#1B4242]">
                    <span className="px-2 py-0.5 rounded bg-[#9EC8B9]/30 text-[#1B4242] border border-[#5C8374]/30">
                      {m.change}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#1B4242]">
                    {m.explanation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Migration Candidates Breakdown */}
      <div className="bg-white rounded-2xl border border-[#5C8374]/30 shadow-xs p-6 space-y-4">
        <div>
          <h3 className="heading-font text-base font-bold text-[#092635]">
            Modernization Candidates & Isolated Verification Status
          </h3>
          <p className="text-xs text-[#1B4242] body-font">
            Proposed package replacements evaluated in isolated temporary work environments
          </p>
        </div>

        {comparison.candidates && comparison.candidates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comparison.candidates.map((c, i) => (
              <div key={i} className="p-4 rounded-xl border border-[#5C8374]/20 bg-[#F0F7F4] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-[#092635] flex items-center space-x-1.5">
                    <span>{c.package_name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#5C8374]" />
                    <span className="text-[#1B4242]">{c.proposed_replacement}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white text-[#1B4242] border border-[#5C8374]/30">
                    {c.status}
                  </span>
                </div>

                <div className="text-xs text-[#1B4242] space-y-1">
                  <div><strong>Identified Risk:</strong> {c.identified_concern}</div>
                  <div><strong>Usage Sites:</strong> {c.usage_count} import locations in scanned code</div>
                  <div><strong>Baseline Check:</strong> {c.baseline_check_result}</div>
                  <div><strong>Sandbox Check:</strong> {c.replacement_check_result}</div>
                </div>

                {/* Diffs snippet */}
                <div className="pt-2 border-t border-[#5C8374]/20">
                  <div className="text-[11px] font-semibold text-[#092635] mb-1">Manifest Diff:</div>
                  <pre className="p-2 rounded bg-[#092635] text-[#9EC8B9] font-mono text-[11px] overflow-x-auto">
                    {c.required_manifest_change}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-[#1B4242] bg-[#F0F7F4] rounded-xl border border-[#5C8374]/30">
            All scanned dependencies comply with modern maintenance resilience standards. No package substitutions required.
          </div>
        )}
      </div>
    </div>
  );
}
