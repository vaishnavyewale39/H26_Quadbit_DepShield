import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Info, ExternalLink, ArrowRight, Layers, FileCode, Cpu, ShieldCheck } from 'lucide-react';

export default function EvidencePanel({ selectedDependency, onInspectFull }) {
  if (!selectedDependency) {
    return (
      <div className="h-full flex flex-col justify-center items-center p-6 text-center text-xs text-[#1B4242] bg-[#F0F7F4] rounded-xl border border-dashed border-[#5C8374]/40">
        <Layers className="w-8 h-8 text-[#5C8374] mb-2 opacity-70" />
        <p className="font-semibold text-sm text-[#092635] mb-1">No Dependency Selected</p>
        <p className="text-[11px] leading-relaxed max-w-xs text-[#1B4242]">
          Click any 3D node or floating GitHub badge in the graph to inspect its evidence trace, relationship layer, and risk rationale.
        </p>
      </div>
    );
  }

  const dep = selectedDependency;
  const primaryFinding = dep.risk_findings?.[0] || {
    title: 'Standard Dependency Compliance',
    category: 'compliance',
    evidence: `Declared as ${dep.declared_version} in ${dep.manifest_path}.`,
    explanation: 'Version constraints adhere to ecosystem resilience standards.',
    recommendation: 'Continue regular dependency audits.'
  };

  const getSeverityBadge = (level) => {
    switch (level) {
      case 'high':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">HIGH SEVERITY</span>;
      case 'moderate':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">MODERATE SEVERITY</span>;
      case 'informational':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">INFORMATIONAL</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">PASSED</span>;
    }
  };

  const verificationStatusBadge = () => {
    if (dep.verification_status === 'Verification Passed') {
      return <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Verified via Sandbox Test</span>;
    }
    if (dep.usage_count > 0) {
      return <span className="text-[10px] font-semibold text-[#1B4242] bg-[#9EC8B9]/30 px-2 py-0.5 rounded border border-[#5C8374]/30">Confirmed via AST Source Scan</span>;
    }
    return <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Inferred Maintenance Rule</span>;
  };

  return (
    <div className="flex flex-col h-full space-y-4 text-xs overflow-y-auto pr-1">
      {/* 1. Header & Severity */}
      <div className="pb-3 border-b border-[#5C8374]/20">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="heading-font text-base font-bold text-[#092635] flex items-center space-x-1.5">
              <span>{dep.name}</span>
              <span className="text-xs font-mono font-normal text-[#1B4242]">@{dep.declared_version}</span>
            </h3>
            <p className="text-[11px] text-[#5C8374] mt-0.5">
              Relationship: <span className="font-semibold text-[#092635]">{dep.dependency_type === 'dev' ? 'Dev / Build (Outer Ring)' : 'Direct Runtime (Inner Ring)'}</span>
            </p>
          </div>
          <div>{getSeverityBadge(dep.risk_level)}</div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {verificationStatusBadge()}
        </div>
      </div>

      {/* 2. Primary Finding & Source */}
      <div className="p-3 rounded-xl bg-[#F0F7F4] border border-[#5C8374]/30 space-y-2">
        <div className="flex items-center space-x-1.5 font-bold text-[#092635]">
          <ShieldAlert className={`w-4 h-4 shrink-0 ${dep.risk_level === 'high' ? 'text-red-600' : 'text-[#1B4242]'}`} />
          <span>{primaryFinding.title}</span>
        </div>
        <div className="text-[11px] text-[#1B4242]">
          <strong>Source Manifest:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-[#5C8374]/30 text-[#092635]">{dep.manifest_path}</code>
        </div>
        <div className="text-[11px] text-[#1B4242]">
          <strong>AST Code Trace:</strong> Discovered in <span className="font-bold text-[#092635]">{dep.usage_count}</span> import sites across repository.
        </div>
      </div>

      {/* 3. Evidence & Rationale */}
      <div className="space-y-1.5">
        <div className="font-bold text-[#092635]">Supporting Evidence:</div>
        <div className="p-2.5 rounded-lg bg-white border border-[#5C8374]/20 text-[11px] text-[#1B4242] leading-relaxed">
          {primaryFinding.evidence}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="font-bold text-[#092635]">Classification Rationale:</div>
        <div className="p-2.5 rounded-lg bg-white border border-[#5C8374]/20 text-[11px] text-[#1B4242] leading-relaxed">
          {primaryFinding.explanation}
        </div>
      </div>

      {/* 4. Recommended Action */}
      {dep.replacement_suggestion && (
        <div className="p-3 rounded-xl bg-[#9EC8B9]/30 border border-[#5C8374]/40 space-y-1.5">
          <div className="font-bold text-[#092635] text-[11px]">Recommended Modernization:</div>
          <div className="text-xs font-semibold text-[#1B4242]">
            {dep.name} &rarr; {dep.replacement_suggestion.proposed_package} ({dep.replacement_suggestion.proposed_version})
          </div>
          <p className="text-[11px] text-[#1B4242] leading-relaxed">
            {dep.replacement_suggestion.rationale}
          </p>
        </div>
      )}

      {/* 5. Limitation Notice */}
      <div className="p-2.5 rounded-lg bg-white border border-[#5C8374]/20 text-[10px] text-[#5C8374] leading-relaxed">
        <strong>Advisory Source Note:</strong> Findings derived from deterministic AST import tracing and Python/Node ecosystem lifecycle rules. External live CVE databases are not queried.
      </div>

      {/* 6. Action Button */}
      {onInspectFull && (
        <button
          type="button"
          onClick={() => onInspectFull(dep)}
          className="w-full py-2.5 rounded-xl bg-[#1B4242] hover:bg-[#5C8374] text-white text-xs font-medium transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs active:scale-[0.99]"
        >
          <span>Open Full Inspection &amp; Sandbox Test</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
