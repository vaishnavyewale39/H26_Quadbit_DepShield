import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Response
from fastapi.responses import FileResponse, JSONResponse

from app.schemas.models import (
    RepoAnalyzeRequest,
    RepoAnalysis,
    DependencyItem,
    SourceUsage,
    RiskFinding,
    ReplacementSuggestion,
    MigrationPlan,
    VerificationResult,
    ReadmeImproveRequest,
    ReadmeComparison,
    RepoComparison,
    PDFReportRequest
)
from app.services.repo_service import repo_service
from app.services.risk_engine import risk_engine
from app.services.gemma_service import gemma_service
from app.services.readme_service import readme_service
from app.services.comparison_service import comparison_service
from app.services.verification_service import verification_service
from app.services.pdf_service import pdf_service

router = APIRouter()

# In-memory storage for active session jobs
analyses_db: Dict[str, RepoAnalysis] = {}
repo_paths_db: Dict[str, Path] = {}
comparisons_db: Dict[str, RepoComparison] = {}
readme_comparisons_db: Dict[str, ReadmeComparison] = {}
progress_db: Dict[str, Dict[str, Any]] = {}

@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": "DepShield AI Dependency Resilience Engine",
        "version": "1.0.0",
        "gemma_live_api": gemma_service.is_api_configured(),
        "model": gemma_service.model
    }

@router.post("/repositories/analyze", response_model=RepoAnalysis)
async def analyze_repository(req: RepoAnalyzeRequest):
    try:
        clean_url = repo_service.validate_url(req.repo_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    analysis_id = f"an_{uuid.uuid4().hex[:10]}"
    progress_db[analysis_id] = {"percent": 10, "stage": "Cloning repository...", "status": "running"}

    try:
        # 1. Clone repository
        repo_path, commit_hash, branch = repo_service.clone_repository(clean_url)
        repo_paths_db[analysis_id] = repo_path
        progress_db[analysis_id] = {"percent": 30, "stage": "Discovering dependency manifests...", "status": "running"}

        # 2. Discover manifests & detect ecosystem
        manifests = repo_service.discover_manifests(repo_path)
        ecosystem = repo_service.detect_primary_ecosystem(manifests)
        progress_db[analysis_id] = {"percent": 45, "stage": "Parsing manifests and dependencies...", "status": "running"}

        # 3. Parse manifests
        parsed_deps, parsed_files, parsing_errors = repo_service.parse_manifests(repo_path, manifests)
        progress_db[analysis_id] = {"percent": 60, "stage": "Scanning source code for import statements...", "status": "running"}

        # 4. Scan source code for imports
        usages_map = repo_service.scan_source_code_usages(repo_path, parsed_deps)
        progress_db[analysis_id] = {"percent": 75, "stage": "Evaluating dependency risk evidence...", "status": "running"}

        # 5. Evaluate risk evidence
        dep_items: List[DependencyItem] = []
        high_cnt = 0
        mod_cnt = 0
        info_cnt = 0
        pass_cnt = 0

        for idx, d in enumerate(parsed_deps):
            dep_name = d["name"]
            dep_usages = usages_map.get(dep_name, [])
            risk_res = risk_engine.analyze_dependency(d, dep_usages)

            r_lvl = risk_res["risk_level"]
            if r_lvl == "high":
                high_cnt += 1
            elif r_lvl == "moderate":
                mod_cnt += 1
            elif r_lvl == "informational":
                info_cnt += 1
            else:
                pass_cnt += 1

            dep_items.append(DependencyItem(
                id=f"dep_{analysis_id}_{idx}",
                name=dep_name,
                ecosystem=d["ecosystem"],
                declared_version=d["declared_version"],
                resolved_version=d.get("resolved_version"),
                manifest_path=d["manifest_path"],
                dependency_type=d["dependency_type"],
                risk_level=r_lvl,
                risk_score=risk_res["risk_score"],
                usage_count=len(dep_usages),
                source_usages=dep_usages,
                risk_findings=risk_res["risk_findings"],
                replacement_suggestion=risk_res.get("replacement_suggestion"),
                migration_status="Proposed" if risk_res.get("replacement_suggestion") else "Unchanged",
                verification_status="Not Run"
            ))

        # 6. Read README
        readme_path, readme_content = repo_service.read_readme(repo_path)

        analysis = RepoAnalysis(
            analysis_id=analysis_id,
            repo_url=clean_url,
            repo_name=repo_service.extract_repo_name(clean_url),
            commit_hash=commit_hash,
            branch=branch,
            ecosystem=ecosystem,
            discovered_manifests=manifests,
            parsed_files=parsed_files,
            parsing_errors=parsing_errors,
            dependencies=dep_items,
            total_dependencies=len(dep_items),
            high_risk_count=high_cnt,
            moderate_risk_count=mod_cnt,
            info_risk_count=info_cnt,
            passed_count=pass_cnt,
            has_readme=bool(readme_content),
            readme_path=readme_path,
            readme_content=readme_content,
            created_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            status="completed"
        )

        analyses_db[analysis_id] = analysis
        progress_db[analysis_id] = {"percent": 100, "stage": "Analysis Complete!", "status": "completed"}

        # Pre-build comparison and store
        comp = await comparison_service.build_comparison(analysis)
        comparisons_db[comp.comparison_id] = comp
        comparisons_db[analysis_id] = comp  # also index by analysis_id for convenient lookup

        return analysis

    except Exception as e:
        progress_db[analysis_id] = {"percent": 0, "stage": f"Error: {str(e)}", "status": "failed"}
        raise HTTPException(status_code=500, detail=f"Repository analysis failed: {str(e)}")

@router.get("/analyses/{analysis_id}", response_model=RepoAnalysis)
def get_analysis(analysis_id: str):
    if analysis_id not in analyses_db:
        raise HTTPException(status_code=404, detail="Analysis ID not found.")
    return analyses_db[analysis_id]

@router.get("/analyses/{analysis_id}/progress")
def get_analysis_progress(analysis_id: str):
    if analysis_id not in progress_db:
        return {"percent": 0, "stage": "Not started", "status": "idle"}
    return progress_db[analysis_id]

@router.get("/analyses/{analysis_id}/dependencies", response_model=List[DependencyItem])
def get_analysis_dependencies(analysis_id: str):
    if analysis_id not in analyses_db:
        raise HTTPException(status_code=404, detail="Analysis ID not found.")
    return analyses_db[analysis_id].dependencies

@router.get("/dependencies/{dependency_id}/usage", response_model=List[SourceUsage])
def get_dependency_usage(dependency_id: str):
    for a in analyses_db.values():
        for d in a.dependencies:
            if d.id == dependency_id:
                return d.source_usages
    raise HTTPException(status_code=404, detail="Dependency not found.")

@router.get("/dependencies/{dependency_id}/risks")
async def get_dependency_risks(dependency_id: str):
    for a in analyses_db.values():
        for d in a.dependencies:
            if d.id == dependency_id:
                # Query Gemma 4 for detailed risk explanation
                explanation_data = await gemma_service.explain_dependency_risk(
                    dep_name=d.name,
                    declared_ver=d.declared_version,
                    manifest=d.manifest_path,
                    usages=[u.model_dump() for u in d.source_usages],
                    findings=[f.model_dump() for f in d.risk_findings]
                )
                return {
                    "dependency": d,
                    "findings": d.risk_findings,
                    "gemma_assessment": explanation_data
                }
    raise HTTPException(status_code=404, detail="Dependency not found.")

@router.post("/dependencies/{dependency_id}/replacements", response_model=Optional[ReplacementSuggestion])
def get_dependency_replacements(dependency_id: str):
    for a in analyses_db.values():
        for d in a.dependencies:
            if d.id == dependency_id:
                return d.replacement_suggestion
    raise HTTPException(status_code=404, detail="Dependency not found.")

@router.post("/dependencies/{dependency_id}/migration-plan")
async def get_migration_plan(dependency_id: str):
    for a in analyses_db.values():
        for d in a.dependencies:
            if d.id == dependency_id:
                prop_pkg = d.replacement_suggestion.proposed_package if d.replacement_suggestion else d.name
                plan = await gemma_service.generate_migration_plan(
                    original_pkg=d.name,
                    proposed_pkg=prop_pkg,
                    usages=[u.model_dump() for u in d.source_usages]
                )
                return {
                    "dependency": d.name,
                    "proposed_package": prop_pkg,
                    "migration_plan": plan
                }
    raise HTTPException(status_code=404, detail="Dependency not found.")

@router.post("/dependencies/{dependency_id}/verify", response_model=VerificationResult)
def verify_dependency(dependency_id: str):
    target_dep = None
    target_analysis = None
    for a in analyses_db.values():
        for d in a.dependencies:
            if d.id == dependency_id:
                target_dep = d
                target_analysis = a
                break
        if target_dep:
            break

    if not target_dep or not target_analysis:
        raise HTTPException(status_code=404, detail="Dependency not found.")

    repo_path = repo_paths_db.get(target_analysis.analysis_id)
    if not repo_path or not repo_path.exists():
        raise HTTPException(status_code=400, detail="Repository workspace no longer available in memory.")

    prop_pkg = target_dep.replacement_suggestion.proposed_package if target_dep.replacement_suggestion else target_dep.name

    result = verification_service.verify_migration_candidate(
        repo_path=repo_path,
        original_pkg=target_dep.name,
        proposed_pkg=prop_pkg,
        manifest_path=target_dep.manifest_path,
        ecosystem=target_dep.ecosystem
    )

    # Update dependency state
    target_dep.verification_status = result.status
    target_dep.migration_status = "Verified" if result.baseline_passed and result.replacement_passed else "Partially Verified"

    return result

@router.post("/readme/improve", response_model=ReadmeComparison)
async def improve_readme(req: ReadmeImproveRequest):
    if req.analysis_id not in analyses_db:
        raise HTTPException(status_code=404, detail="Analysis ID not found.")

    analysis = analyses_db[req.analysis_id]
    repo_path = repo_paths_db.get(req.analysis_id)

    comparison_dict = await readme_service.generate_improved_readme(
        repo_name=analysis.repo_name,
        original_readme=analysis.readme_content or "",
        ecosystem=analysis.ecosystem,
        dependencies=[d.model_dump() for d in analysis.dependencies],
        manifests=analysis.discovered_manifests,
        repo_path=repo_path
    )

    result = ReadmeComparison(
        analysis_id=req.analysis_id,
        original_readme=comparison_dict["original_readme"],
        proposed_readme=comparison_dict["proposed_readme"],
        diff_text=comparison_dict["diff_text"],
        sections_added=comparison_dict["sections_added"],
        sections_modified=comparison_dict["sections_modified"],
        sections_removed=comparison_dict["sections_removed"],
        unverified_claims=comparison_dict["unverified_claims"],
        summary_of_improvements=comparison_dict["summary_of_improvements"]
    )

    readme_comparisons_db[req.analysis_id] = result
    return result

@router.get("/readme/compare", response_model=ReadmeComparison)
def get_readme_compare(analysis_id: str):
    if analysis_id in readme_comparisons_db:
        return readme_comparisons_db[analysis_id]
    raise HTTPException(status_code=404, detail="README comparison not yet generated for this analysis.")

@router.post("/comparisons", response_model=RepoComparison)
async def create_comparison(req: ReadmeImproveRequest):
    if req.analysis_id not in analyses_db:
        raise HTTPException(status_code=404, detail="Analysis ID not found.")
    analysis = analyses_db[req.analysis_id]
    comp = await comparison_service.build_comparison(analysis)
    comparisons_db[comp.comparison_id] = comp
    comparisons_db[analysis.analysis_id] = comp
    return comp

@router.get("/comparisons/{comparison_id}", response_model=RepoComparison)
def get_comparison(comparison_id: str):
    if comparison_id in comparisons_db:
        return comparisons_db[comparison_id]
    raise HTTPException(status_code=404, detail="Comparison ID not found.")

@router.get("/comparisons/{comparison_id}/export")
def export_comparison(comparison_id: str, format: str = "json"):
    if comparison_id not in comparisons_db:
        raise HTTPException(status_code=404, detail="Comparison ID not found.")
    comp = comparisons_db[comparison_id]

    if format.lower() == "markdown":
        md_lines = [
            f"# DepShield — Before vs After Comparison Report",
            f"**Repository:** {comp.repo_url} (`{comp.commit_hash[:10]}`)",
            f"**Audit Timestamp:** {comp.created_at}\n",
            f"## Executive Summary",
            f"{comp.gemma_summary}\n",
            f"## Comparison Metrics Table",
            f"| Metric | Before | After | Change | Evaluation Note |",
            f"| :--- | :--- | :--- | :--- | :--- |"
        ]
        for m in comp.metrics:
            md_lines.append(f"| {m.metric} | {m.before} | {m.after} | {m.change} | {m.explanation} |")

        md_lines.append("\n## Modernization Candidates")
        for c in comp.candidates:
            md_lines.append(f"### `{c.package_name}` &rarr; `{c.proposed_replacement}`")
            md_lines.append(f"- **Status:** {c.status}")
            md_lines.append(f"- **Concern:** {c.identified_concern}")
            md_lines.append(f"- **Usage Locations:** {c.usage_count}")
            md_lines.append(f"- **Sandbox Test:** {c.replacement_check_result}\n")

        return Response(content="\n".join(md_lines), media_type="text/markdown")

    return comp.model_dump()

@router.post("/reports/pdf")
async def generate_pdf_report(req: PDFReportRequest):
    if req.analysis_id not in analyses_db:
        raise HTTPException(status_code=404, detail="Analysis ID not found.")

    analysis = analyses_db[req.analysis_id]
    comp = comparisons_db.get(req.comparison_id) or comparisons_db.get(req.analysis_id)
    if not comp:
        comp = await comparison_service.build_comparison(analysis)
        comparisons_db[comp.comparison_id] = comp

    pdf_path = pdf_service.generate_resilience_report(analysis, comp)
    if not pdf_path.exists():
        raise HTTPException(status_code=500, detail="Failed to compile PDF report.")

    safe_filename = f"DepShield_Report_{analysis.repo_name.replace('/', '_')}.pdf"
    return FileResponse(
        path=str(pdf_path),
        filename=safe_filename,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
