import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Cpu, CheckCircle2, ArrowRight, Code, Terminal, Layers, FileCode, Play, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

export default function DependencyDetailsModal({ dependency, onClose, onRefreshDependency }) {
  const [activeTab, setActiveTab] = useState('evidence'); // 'evidence', 'usages', 'gemma', 'migration', 'verify'
  const [gemmaData, setGemmaData] = useState(null);
  const [migrationPlan, setMigrationPlan] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [isLoadingGemma, setIsLoadingGemma] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!dependency) return;
    setActiveTab('evidence');
    setGemmaData(null);
    setMigrationPlan(null);
    setVerifyResult(null);

    // Fetch Gemma 4 Risk Assessment automatically
    setIsLoadingGemma(true);
    api.getDependencyRisks(dependency.id)
      .then((data) => {
        setGemmaData(data.gemma_assessment);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoadingGemma(false));
  }, [dependency?.id]);

  if (!dependency) return null;

  const handleFetchMigrationPlan = async () => {
    try {
      const plan = await api.getMigrationPlan(dependency.id);
      setMigrationPlan(plan.migration_plan);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunVerification = async () => {
    setIsVerifying(true);
    try {
      const res = await api.verifyDependency(dependency.id);
      setVerifyResult(res);
      if (onRefreshDependency) onRefreshDependency(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-[#5C8374]/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#5C8374]/20 bg-[#F0F7F4] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#1B4242] text-white flex items-center justify-center font-bold text-lg shadow-xs">
              {dependency.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="heading-font text-xl font-bold text-[#092635]">
                  {dependency.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-white border border-[#5C8374]/30 text-[#1B4242] font-semibold">
                  {dependency.declared_version}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    dependency.risk_level === 'high'
                      ? 'bg-red-100 text-red-800'
                      : dependency.risk_level === 'moderate'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {dependency.risk_level}
                </span>
              </div>
              <p className="text-xs text-[#1B4242] body-font mt-0.5">
                {dependency.ecosystem.toUpperCase()} &bull; Declared in <code className="text-[#1B4242] font-bold">{dependency.manifest_path}</code> &bull; {dependency.usage_count} import sites discovered
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-[#5C8374]/20 bg-white px-5 pt-2 text-xs font-medium space-x-4">
          <button
            onClick={() => setActiveTab('evidence')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'evidence' ? 'border-[#1B4242] text-[#1B4242] font-bold' : 'border-transparent text-[#5C8374] hover:text-[#092635]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Risk Evidence ({dependency.risk_findings?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('usages')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'usages' ? 'border-[#1B4242] text-[#1B4242] font-bold' : 'border-transparent text-[#5C8374] hover:text-[#092635]'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Source Usages ({dependency.source_usages?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('gemma')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'gemma' ? 'border-[#1B4242] text-[#1B4242] font-bold' : 'border-transparent text-[#5C8374] hover:text-[#092635]'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>AI Resilience Assessment</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('migration');
              if (!migrationPlan) handleFetchMigrationPlan();
            }}
            className={`pb-2.5 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'migration' ? 'border-[#1B4242] text-[#1B4242] font-bold' : 'border-transparent text-[#5C8374] hover:text-[#092635]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Migration Plan</span>
          </button>

          <button
            onClick={() => setActiveTab('verify')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'verify' ? 'border-[#1B4242] text-[#1B4242] font-bold' : 'border-transparent text-[#5C8374] hover:text-[#092635]'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>Isolated Verification</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-sm text-[#092635] space-y-4">
          {/* TAB 1: RISK EVIDENCE */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <h4 className="heading-font text-base font-bold text-[#092635]">
                Identified Risk Findings & Concrete Evidence
              </h4>
              {dependency.risk_findings && dependency.risk_findings.length > 0 ? (
                dependency.risk_findings.map((f, i) => (
                  <div key={i} className="p-4 rounded-xl border border-[#5C8374]/30 bg-[#F0F7F4] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#092635] flex items-center space-x-2">
                        <AlertCircle className={`w-4 h-4 ${f.risk_level === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
                        <span>{f.title}</span>
                      </span>
                      <span className="text-xs uppercase px-2 py-0.5 rounded bg-white border border-[#5C8374]/30 font-semibold text-[#1B4242]">
                        {f.category}
                      </span>
                    </div>
                    <div className="text-xs text-[#1B4242]">
                      <strong>Evidence:</strong> {f.evidence}
                    </div>
                    <div className="text-xs text-[#092635] bg-white p-2.5 rounded-lg border border-[#5C8374]/20">
                      <strong>Explanation:</strong> {f.explanation}
                    </div>
                    {f.recommendation && (
                      <div className="text-xs text-[#1B4242] font-medium bg-[#9EC8B9]/30 p-2 rounded border border-[#5C8374]/40">
                        <strong>Recommendation:</strong> {f.recommendation}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
                  No critical risks identified. Manifest syntax and version constraints meet resilience standards.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SOURCE CODE USAGES */}
          {activeTab === 'usages' && (
            <div className="space-y-3">
              <h4 className="heading-font text-base font-bold text-[#092635]">
                Discovered Import Sites in Source Code ({dependency.source_usages?.length || 0})
              </h4>
              <p className="text-xs text-[#1B4242]">
                Real import and invocation lines discovered by the AST repository scanner:
              </p>
              {dependency.source_usages && dependency.source_usages.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {dependency.source_usages.map((u, i) => (
                    <div key={i} className="p-3 rounded-lg border border-[#5C8374]/30 bg-[#F0F7F4] font-mono text-xs">
                      <div className="flex items-center justify-between text-[#1B4242] font-semibold text-[11px] mb-1">
                        <span>{u.file_path}</span>
                        <span className="text-gray-500">Line {u.line_number}</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-gray-200 text-[#092635] overflow-x-auto">
                        <code>{u.code_snippet}</code>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 text-amber-800 text-xs border border-amber-200">
                  No direct import statements found in scanned source files. The dependency may be unreferenced, an indirect build dependency, or invoked via dynamic imports.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GEMMA ASSESSMENT */}
          {activeTab === 'gemma' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="heading-font text-base font-bold text-[#092635] flex items-center space-x-2">
                  <Cpu className="w-5 h-5 text-[#1B4242]" />
                  <span>Architectural Resilience Assessment</span>
                </h4>
                {gemmaData && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#9EC8B9]/40 border border-[#5C8374]/30 font-semibold text-[#092635]">
                    {gemmaData.source}
                  </span>
                )}
              </div>

              {isLoadingGemma ? (
                <div className="p-8 text-center text-[#1B4242] text-xs flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#1B4242]" />
                  <span>Synthesizing repository evidence with resilience engine...</span>
                </div>
              ) : gemmaData ? (
                <div className="p-4 rounded-xl bg-[#F0F7F4] border border-[#5C8374]/30 text-xs text-[#092635] space-y-3 leading-relaxed">
                  <div className="space-y-2">
                    {gemmaData.explanation.split('\n\n').map((paragraph, pIdx) => (
                      <p key={pIdx}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  {gemmaData.api_status && (
                    <div className="text-[11px] text-[#5C8374] italic pt-2 border-t border-[#5C8374]/20">
                      {gemmaData.api_status}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500">No assessment data returned.</div>
              )}
            </div>
          )}

          {/* TAB 4: MIGRATION PLAN */}
          {activeTab === 'migration' && (
            <div className="space-y-4">
              <h4 className="heading-font text-base font-bold text-[#092635]">
                Proposed Migration Strategy
              </h4>

              {dependency.replacement_suggestion ? (
                <div className="p-4 rounded-xl bg-[#F0F7F4] border border-[#5C8374]/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1B4242]">
                    <span>Proposed Target Package:</span>
                    <span className="text-base font-bold text-[#092635]">
                      {dependency.replacement_suggestion.proposed_package} ({dependency.replacement_suggestion.proposed_version})
                    </span>
                  </div>
                  <p className="text-xs text-[#1B4242]">
                    <strong>Rationale:</strong> {dependency.replacement_suggestion.rationale}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-gray-50 text-gray-600 text-xs">
                  No replacement required. Current package satisfies maintenance standards.
                </div>
              )}

              {migrationPlan && (
                <div className="space-y-3">
                  <div className="font-semibold text-xs text-[#092635]">Step-by-Step Procedure:</div>
                  <ol className="list-decimal list-inside text-xs text-[#1B4242] space-y-1.5">
                    {migrationPlan.steps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ol>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div>
                      <div className="text-xs font-semibold text-[#092635] mb-1">Manifest Changes:</div>
                      <pre className="p-2.5 rounded-lg bg-[#092635] text-[#9EC8B9] font-mono text-[11px] overflow-x-auto">
                        {migrationPlan.manifest_changes}
                      </pre>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#092635] mb-1">Code Refactoring Diff:</div>
                      <pre className="p-2.5 rounded-lg bg-[#092635] text-cyan-300 font-mono text-[11px] overflow-x-auto">
                        {migrationPlan.code_changes}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ISOLATED VERIFICATION */}
          {activeTab === 'verify' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="heading-font text-base font-bold text-[#092635]">
                    Isolated Sandbox Verification
                  </h4>
                  <p className="text-xs text-[#1B4242]">
                    Executes baseline syntax checks and tests proposed replacement in a safe sandbox.
                  </p>
                </div>
                <button
                  onClick={handleRunVerification}
                  disabled={isVerifying}
                  className="px-4 py-2 rounded-xl bg-[#1B4242] hover:bg-[#5C8374] text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-2 cursor-pointer disabled:bg-gray-400"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Verifying in Sandbox...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Execute Sandbox Test</span>
                    </>
                  )}
                </button>
              </div>

              {verifyResult ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-[#5C8374]/30 bg-[#F0F7F4] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#1B4242] text-sm">
                        Status: {verifyResult.status}
                      </div>
                      <p className="text-xs text-[#1B4242] mt-0.5">
                        {verifyResult.compatibility_notes}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-semibold text-[#092635]">
                        Duration: {verifyResult.execution_time_seconds}s
                      </div>
                      <div className="text-emerald-700 font-medium">Exit Code: {verifyResult.exit_code}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-[#092635] mb-1">Sandbox Execution Logs:</div>
                    <pre className="p-3 rounded-xl bg-[#092635] text-gray-200 font-mono text-xs overflow-x-auto max-h-56">
                      {verifyResult.logs}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#1B4242] border border-dashed border-[#5C8374]/40 rounded-xl bg-[#F0F7F4]">
                  Click &ldquo;Execute Sandbox Test&rdquo; to launch isolated verification in a temporary workspace.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#5C8374]/20 bg-[#F0F7F4] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1B4242] text-white text-xs font-semibold hover:bg-[#5C8374] transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
