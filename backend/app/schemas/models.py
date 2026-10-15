from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class RepoAnalyzeRequest(BaseModel):
    repo_url: str = Field(..., description="GitHub repository URL (e.g. https://github.com/rishrek/LinkWatch)")

class SourceUsage(BaseModel):
    file_path: str
    line_number: int
    code_snippet: str
    usage_type: str = "import"

class RiskFinding(BaseModel):
    risk_level: str  # high, moderate, informational, passed, insufficient_evidence
    category: str    # deprecation, maintenance, compatibility, constraint, resolution, metadata
    title: str
    evidence: str
    explanation: str
    recommendation: Optional[str] = None

class ReplacementSuggestion(BaseModel):
    original_package: str
    proposed_package: str
    proposed_version: str
    rationale: str
    migration_complexity: str = "medium"  # low, medium, high
    breaking_changes: List[str] = []
    confidence: float = 0.95

class MigrationPlan(BaseModel):
    original_package: str
    proposed_package: str
    steps: List[str]
    manifest_changes: str
    code_changes: str
    verification_strategy: str

class VerificationResult(BaseModel):
    dependency_name: str
    status: str  # "Verification Passed", "Verification Failed", "Partially Verified", "Blocked", "Inconclusive"
    baseline_passed: bool
    replacement_passed: bool
    logs: str
    exit_code: int
    execution_time_seconds: float
    compatibility_notes: str

class DependencyItem(BaseModel):
    id: str
    name: str
    ecosystem: str
    declared_version: str
    resolved_version: Optional[str] = None
    manifest_path: str
    dependency_type: str = "runtime"  # runtime, dev, build
    risk_level: str = "passed"        # high, moderate, informational, passed, insufficient_evidence
    risk_score: int = 10              # 0-100 scale (100 = critical risk)
    usage_count: int = 0
    source_usages: List[SourceUsage] = []
    risk_findings: List[RiskFinding] = []
    replacement_suggestion: Optional[ReplacementSuggestion] = None
    migration_status: str = "Unchanged"  # Unchanged, Proposed, Applied, Verified
    verification_status: str = "Not Run"

class RepoAnalysis(BaseModel):
    analysis_id: str
    repo_url: str
    repo_name: str
    commit_hash: str
    branch: str
    ecosystem: str
    discovered_manifests: List[str]
    parsed_files: List[str]
    parsing_errors: List[str] = []
    dependencies: List[DependencyItem]
    total_dependencies: int
    high_risk_count: int
    moderate_risk_count: int
    info_risk_count: int
    passed_count: int
    has_readme: bool
    readme_path: Optional[str] = None
    readme_content: Optional[str] = None
    created_at: str
    status: str = "completed"

class ReadmeImproveRequest(BaseModel):
    analysis_id: str

class ReadmeComparison(BaseModel):
    analysis_id: str
    original_readme: str
    proposed_readme: str
    diff_text: str
    sections_added: List[str]
    sections_modified: List[str]
    sections_removed: List[str]
    unverified_claims: List[str]
    summary_of_improvements: str

class ComparisonMetric(BaseModel):
    metric: str
    before: str
    after: str
    change: str
    explanation: str

class ComparisonCandidate(BaseModel):
    package_name: str
    original_version: str
    proposed_replacement: str
    usage_count: int
    identified_concern: str
    status: str  # Proposed, Applied in Isolated Workspace, Verification Passed, Verification Failed, Partially Verified, Blocked
    required_manifest_change: str
    required_code_changes: str
    baseline_check_result: str
    replacement_check_result: str
    compatibility_gap: str

class RepoComparison(BaseModel):
    comparison_id: str
    analysis_id: str
    repo_url: str
    commit_hash: str
    metrics: List[ComparisonMetric]
    candidates: List[ComparisonCandidate]
    before_summary: str
    after_summary: str
    gemma_summary: str
    created_at: str

class PDFReportRequest(BaseModel):
    analysis_id: str
    comparison_id: Optional[str] = None
