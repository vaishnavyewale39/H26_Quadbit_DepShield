import React, { useState } from 'react';
import { Shield, RefreshCw, GitBranch, AlertTriangle, FileText, BarChart3, Download, Menu, X, Loader2 } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, analysis, onExportReport, isExporting }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'scanner', label: 'Scanner', icon: RefreshCw },
    { id: 'graph', label: '3D Explorer', icon: GitBranch, disabled: false },
    { id: 'inventory', label: 'Dependencies & Risks', icon: AlertTriangle, disabled: !analysis },
    { id: 'readme', label: 'README Improver', icon: FileText, disabled: !analysis },
    { id: 'comparison', label: 'Before vs After', icon: BarChart3, disabled: !analysis },
  ];

  const handleNavClick = (id, disabled) => {
    if (disabled) return;
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#1B4242] border-b border-[#5C8374]/40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Only (No subtitle, no badge) */}
        <div
          className="flex items-center space-x-2.5 cursor-pointer shrink-0"
          onClick={() => setActiveTab('scanner')}
        >
          <div className="w-9 h-9 rounded-lg bg-[#5C8374] flex items-center justify-center text-white shadow-xs">
            <Shield className="w-5 h-5" />
          </div>
          <span className="roboto-brand text-2xl font-bold tracking-tight text-white select-none">
            DepShield
          </span>
        </div>

        {/* Middle: Clean, Spacious Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-1.5 xl:space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onClick={() => handleNavClick(item.id, item.disabled)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm transition-all duration-150 whitespace-nowrap ${
                  item.disabled
                    ? 'text-[#9EC8B9]/40 cursor-not-allowed opacity-50'
                    : isActive
                    ? 'bg-[#5C8374] text-white font-medium shadow-xs'
                    : 'text-[#9EC8B9] hover:bg-[#5C8374]/25 hover:text-white font-normal'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#9EC8B9]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Dedicated Export Report Action Area */}
        <div className="hidden sm:flex items-center shrink-0">
          <button
            type="button"
            onClick={onExportReport}
            disabled={isExporting}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition-all shadow-xs cursor-pointer ${
              analysis
                ? 'bg-[#5C8374] hover:bg-[#4d7062] text-white border border-[#9EC8B9]/30 active:scale-[0.98]'
                : 'bg-[#5C8374]/40 hover:bg-[#5C8374]/60 text-white/80 border border-transparent'
            }`}
            title={analysis ? 'Export full PDF resilience report' : 'Run a scan to export report'}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span className="whitespace-nowrap">Exporting PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-white" />
                <span className="whitespace-nowrap">Export Report</span>
              </>
            )}
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex lg:hidden items-center space-x-2">
          <button
            type="button"
            onClick={onExportReport}
            disabled={isExporting}
            className="sm:hidden p-2 rounded-lg bg-[#5C8374] text-white text-xs"
            title="Export Report"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#9EC8B9] hover:text-white hover:bg-[#5C8374]/30"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Responsive Collapsible Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#5C8374]/40 bg-[#1B4242] px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onClick={() => handleNavClick(item.id, item.disabled)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                  item.disabled
                    ? 'text-[#9EC8B9]/40 opacity-50 cursor-not-allowed'
                    : isActive
                    ? 'bg-[#5C8374] text-white font-medium'
                    : 'text-[#9EC8B9] hover:bg-[#5C8374]/20 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
