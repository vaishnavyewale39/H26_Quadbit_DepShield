import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import DynamicBackground from './components/dynamic-background/DynamicBackground';
import FloatingGithubIcons3D from './components/dynamic-background/FloatingGithubIcons3D';
import Navbar from './components/layout/Navbar';
import LandingHero from './components/dashboard/LandingHero';
import DependencyGraph3D from './components/dependency-graph/DependencyGraph3D';
import DependencyDetailsModal from './components/dependency-explorer/DependencyDetailsModal';
import ReadmeComparisonView from './components/readme-comparison/ReadmeComparisonView';
import BeforeAfterComparisonDashboard from './components/before-after-report/BeforeAfterComparisonDashboard';
import { Shield, CheckCircle, AlertTriangle, ArrowRight, Layers, GitBranch, FileText, Download, Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [analysis, setAnalysis] = useState(null);
  const [selectedDependency, setSelectedDependency] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState({ percent: 0, stage: '' });

  // Handle repository analysis
  const handleAnalyze = async (url) => {
    setIsLoading(true);
    setError(null);
    setAnalysisProgress({ percent: 15, stage: 'Cloning repository & establishing isolated sandbox...' });

    try {
      const res = await api.analyzeRepository(url);
      setAnalysis(res);
      setAnalysisProgress({ percent: 100, stage: 'Repository Analyzed Successfully!' });
      setActiveTab('graph');
    } catch (err) {
      setError(err.message || 'Failed to analyze repository');
    } finally {
      setIsLoading(false);
    }
  };

  // Dedicated PDF Export handler triggered from Navbar or dashboards
  const handleExportPdf = async () => {
    if (!analysis) {
      alert('Please analyze a repository first to export its resilience report.');
      return;
    }
    setIsExporting(true);
    try {
      const blob = await api.downloadPdfReport(analysis.analysis_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DepShield_Report_${analysis.repo_name.replace('/', '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`PDF Report Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpdateDependency = (verifyResult) => {
    if (!analysis) return;
    setAnalysis((prev) => {
      if (!prev) return prev;
      const updatedDeps = prev.dependencies.map((d) => {
        if (d.name === verifyResult.dependency_name) {
          return {
            ...d,
            verification_status: verifyResult.status,
            migration_status: verifyResult.baseline_passed && verifyResult.replacement_passed ? 'Verified' : 'Partially Verified',
          };
        }
        return d;
      });
      return { ...prev, dependencies: updatedDeps };
    });
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-[#9EC8B9] text-[#092635] selection:bg-[#5C8374] selection:text-white">
      {/* Three.js Dynamic Background */}
      <DynamicBackground />

      {/* Floating 3D GitHub Icons Overlay */}
      <FloatingGithubIcons3D />

      {/* Main Redesigned Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        analysis={analysis}
        onExportReport={handleExportPdf}
        isExporting={isExporting}
      />

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8">
        {/* TAB 1: SCANNER / LANDING */}
        {activeTab === 'scanner' && (
          <div>
            <LandingHero
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              error={error}
              analysisProgress={analysisProgress}
            />

            {/* Quick Summary Banner if repository is analyzed */}
            {analysis && (
              <div className="mt-8 bg-white rounded-2xl border border-[#5C8374]/30 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#5C8374]/20">
                  <div>
                    <span className="text-xs uppercase tracking-wide font-bold text-[#1B4242]">
                      Active Repository Analysis
                    </span>
                    <h3 className="heading-font text-xl font-bold text-[#092635] mt-0.5">
                      {analysis.repo_name}
                    </h3>
                    <p className="text-xs text-[#1B4242] body-font mt-0.5">
                      Commit: <code className="text-[#1B4242] font-bold">{analysis.commit_hash?.slice(0, 8)}</code> &bull; Primary Ecosystem: <span className="capitalize font-semibold text-[#092635]">{analysis.ecosystem}</span> &bull; {analysis.total_dependencies} packages
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setActiveTab('graph')}
                      className="px-4 py-2 rounded-xl bg-[#1B4242] hover:bg-[#5C8374] text-white text-xs font-medium shadow-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
                    >
                      <GitBranch className="w-4 h-4" />
                      <span>Open 3D Graph</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('readme')}
                      className="px-4 py-2 rounded-xl bg-[#F0F7F4] border border-[#5C8374]/30 hover:bg-[#5C8374] hover:text-white text-[#092635] text-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-colors"
                    >
                      <FileText className="w-4 h-4 text-[#5C8374]" />
                      <span>README Improver</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('comparison')}
                      className="px-4 py-2 rounded-xl bg-[#5C8374] hover:bg-[#1B4242] text-white text-xs font-medium shadow-xs flex items-center space-x-1.5 cursor-pointer transition-colors"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Before vs After</span>
                    </button>
                  </div>
                </div>

                {/* Stat Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <div className="p-3.5 rounded-xl bg-[#F0F7F4] border border-[#5C8374]/20">
                    <div className="text-xs text-[#5C8374] font-medium">Total Audited</div>
                    <div className="text-2xl font-bold text-[#092635]">{analysis.total_dependencies}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200">
                    <div className="text-xs text-red-700 font-medium">High Risk Concern</div>
                    <div className="text-2xl font-bold text-red-700">{analysis.high_risk_count}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="text-xs text-amber-700 font-medium">Moderate Concern</div>
                    <div className="text-2xl font-bold text-amber-700">{analysis.moderate_risk_count}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="text-xs text-emerald-700 font-medium">Passed Checks</div>
                    <div className="text-2xl font-bold text-emerald-700">{analysis.passed_count}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: 3D GRAPH */}
        {activeTab === 'graph' && (
          <div className="pt-2">
            <DependencyGraph3D
              dependencies={analysis?.dependencies || []}
              repoName={analysis?.repo_name || ''}
              repoUrl={analysis?.repo_url || ''}
              isLoading={isLoading}
              onSelectDependency={(dep) => setSelectedDependency(dep)}
              selectedDependency={selectedDependency}
            />
          </div>
        )}

        {/* TAB 3: INVENTORY & RISKS */}
        {activeTab === 'inventory' && analysis && (
          <div className="pt-2 space-y-6">
            <div className="bg-white rounded-2xl border border-[#5C8374]/30 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#5C8374]/20">
                <div>
                  <h2 className="heading-font text-xl font-bold text-[#092635]">
                    Audited Dependency Inventory ({analysis.total_dependencies} Packages)
                  </h2>
                  <p className="text-xs text-[#1B4242] body-font mt-0.5">
                    Click any dependency to inspect source code imports, risk evidence, and isolated verification tests.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
                {analysis.dependencies.map((dep) => (
                  <div
                    key={dep.id}
                    onClick={() => setSelectedDependency(dep)}
                    className="p-4 rounded-xl border border-[#5C8374]/20 bg-[#F0F7F4] hover:border-[#1B4242] hover:shadow-md transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-[#1B4242] text-base">
                        {dep.name}
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          dep.risk_level === 'high'
                            ? 'bg-red-100 text-red-800'
                            : dep.risk_level === 'moderate'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {dep.risk_level}
                      </span>
                    </div>

                    <div className="text-xs text-[#1B4242] space-y-1 font-mono">
                      <div>Specifier: <span className="text-[#092635] font-bold">{dep.declared_version}</span></div>
                      <div>Manifest: <span className="text-[#092635] font-normal">{dep.manifest_path}</span></div>
                      <div>Import Sites: <span className="text-[#092635] font-bold">{dep.usage_count}</span></div>
                    </div>

                    {dep.replacement_suggestion && (
                      <div className="text-xs text-[#1B4242] font-medium bg-white p-2 rounded-lg border border-[#5C8374]/30">
                        Target: <strong>{dep.replacement_suggestion.proposed_package}</strong> ({dep.replacement_suggestion.proposed_version})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: README IMPROVER */}
        {activeTab === 'readme' && analysis && (
          <div className="pt-2">
            <ReadmeComparisonView
              analysisId={analysis.analysis_id}
              repoName={analysis.repo_name}
            />
          </div>
        )}

        {/* TAB 5: BEFORE VS AFTER COMPARISON */}
        {activeTab === 'comparison' && analysis && (
          <div className="pt-2">
            <BeforeAfterComparisonDashboard
              analysisId={analysis.analysis_id}
              repoName={analysis.repo_name}
              onSelectCandidate={(cand) => {
                const target = analysis.dependencies.find((d) => d.name === cand.package_name);
                if (target) setSelectedDependency(target);
              }}
            />
          </div>
        )}
      </main>

      {/* Synchronized Dependency Details Drawer / Modal */}
      {selectedDependency && (
        <DependencyDetailsModal
          dependency={selectedDependency}
          onClose={() => setSelectedDependency(null)}
          onRefreshDependency={handleUpdateDependency}
        />
      )}
    </div>
  );
}
