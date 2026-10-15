from typing import List, Dict, Any, Optional
from app.schemas.models import RiskFinding, ReplacementSuggestion, SourceUsage

KNOWN_REPLACEMENTS = {
    # Python
    "requests": {
        "replacement": "httpx",
        "version": "^0.28.1",
        "rationale": "HTTPX provides modern async/await support, HTTP/2 transport, strict timeouts, and type annotations while retaining a familiar requests-compatible API.",
        "complexity": "low",
        "breaking_changes": ["Session is replaced by httpx.Client or httpx.AsyncClient", "Response encoding defaults may differ slightly", "Params serialization conforms strictly to RFC 3986"]
    },
    "pycrypto": {
        "replacement": "cryptography",
        "version": "^43.0.0",
        "rationale": "pycrypto has been unmaintained since 2013 with unresolved CVEs. 'cryptography' is the standard, actively audited cryptographic recipe library.",
        "complexity": "medium",
        "breaking_changes": ["API paradigm shift: requires modern Fernet / Cipher interfaces rather than legacy raw ciphers"]
    },
    "nose": {
        "replacement": "pytest",
        "version": "^8.3.0",
        "rationale": "nose is unmaintained and incompatible with modern Python (3.12+). pytest is the Python ecosystem gold standard with rich fixture support.",
        "complexity": "low",
        "breaking_changes": ["Replace nose test runners with pytest command", "Migrate nose.tools assertions to standard assert statements"]
    },
    "urllib3": {
        "replacement": "urllib3",
        "version": ">=2.2.0,<3.0.0",
        "rationale": "Urllib3 v1.x has reached EOL with deprecations in modern Python TLS handshakes. Upgrade to urllib3 v2.x for OpenSSL 1.1.1+ and Python 3.10+ security.",
        "complexity": "low",
        "breaking_changes": ["Requires OpenSSL 1.1.1+", "Deprecated method signatures removed"]
    },
    # JavaScript
    "moment": {
        "replacement": "date-fns",
        "version": "^4.1.0",
        "rationale": "Moment.js is in official maintenance mode and has heavy bundle weight due to mutable OOP design. date-fns provides modular, tree-shakeable, immutable date utilities.",
        "complexity": "medium",
        "breaking_changes": ["Replace method chaining `moment().add(1, 'd')` with pure functions `addDays(new Date(), 1)`", "Dates remain immutable native JS Date objects"]
    },
    "request": {
        "replacement": "axios",
        "version": "^1.7.0",
        "rationale": "The 'request' npm package was officially deprecated in 2020. Axios offers modern Promise/async support, interceptors, and active maintenance.",
        "complexity": "medium",
        "breaking_changes": ["Replace callback signature `request(url, (err, res, body) => ...)` with `const res = await axios.get(url)`"]
    }
}

class RiskEngine:
    def analyze_dependency(self, dep_dict: Dict[str, Any], usages: List[SourceUsage]) -> Dict[str, Any]:
        name = dep_dict["name"]
        ecosystem = dep_dict.get("ecosystem", "generic")
        declared = dep_dict.get("declared_version", "*")
        resolved = dep_dict.get("resolved_version")
        manifest = dep_dict.get("manifest_path", "")
        dep_type = dep_dict.get("dependency_type", "runtime")

        findings: List[RiskFinding] = []
        risk_score = 10
        risk_level = "passed"
        name_lower = name.lower()

        # 1. Check known deprecated/problematic packages
        if name_lower in ["pycrypto", "nose", "pep8", "requests-async", "optparse", "distutils", "imp"]:
            risk_level = "high"
            risk_score = 90
            findings.append(RiskFinding(
                risk_level="high",
                category="deprecation",
                title=f"Package '{name}' is Deprecated or Abandoned",
                evidence=f"Identified in manifest '{manifest}' with declared specifier '{declared}'.",
                explanation=f"Upstream maintainers have archived or abandoned '{name}'. It lacks support for modern runtimes (Python 3.12+) and may contain unpatched security flaws.",
                recommendation=f"Replace with modern maintained alternative such as {KNOWN_REPLACEMENTS.get(name_lower, {}).get('replacement', 'active replacement')}."
            ))
        elif name_lower in ["moment", "request"]:
            risk_level = "high"
            risk_score = 85
            findings.append(RiskFinding(
                risk_level="high",
                category="deprecation",
                title=f"Package '{name}' is in Maintenance Mode / Deprecated",
                evidence=f"Declared in '{manifest}' as '{declared}'.",
                explanation=f"'{name}' was officially marked deprecated by maintainers and no longer receives performance or architectural updates.",
                recommendation=f"Migrate to '{KNOWN_REPLACEMENTS.get(name_lower, {}).get('replacement', 'modern package')}'."
            ))

        # 2. Check version constraint hygiene
        if declared in ["*", "", "latest"]:
            if risk_level != "high":
                risk_level = "moderate"
                risk_score = max(risk_score, 55)
            findings.append(RiskFinding(
                risk_level="moderate",
                category="constraint",
                title="Unpinned Wildcard Dependency Constraint",
                evidence=f"Declared version constraint is '{declared}'.",
                explanation="Wildcard or unconstrained dependencies make builds non-deterministic and allow breaking upstream releases to cause sudden runtime failures.",
                recommendation="Pin to a compatible semantic version range (e.g. ^x.y or ~=x.y) with lockfile verification."
            ))
        elif declared.startswith("==") and dep_type == "runtime":
            # Strict pinning without lockfile
            if not resolved and risk_score < 40:
                findings.append(RiskFinding(
                    risk_level="informational",
                    category="constraint",
                    title="Exact Version Pinning Without Resolution Lock",
                    evidence=f"Strictly pinned to '{declared}'.",
                    explanation="Exact version pins on runtime libraries prevent receiving automated critical patch updates unless governed by a dedicated lockfile.",
                    recommendation="Ensure a companion lockfile or automated dependency bump mechanism (Dependabot/Renovate) is active."
                ))

        # 3. Check Python 3.12 / 3.13 runtime compatibility
        if ecosystem == "python":
            if name_lower == "pydantic" and declared.startswith(("==1.", "<2", "~=1.")):
                risk_level = "moderate" if risk_level != "high" else risk_level
                risk_score = max(risk_score, 60)
                findings.append(RiskFinding(
                    risk_level="moderate",
                    category="compatibility",
                    title="Legacy Pydantic v1.x Constraint",
                    evidence=f"Found constraint '{declared}'.",
                    explanation="Pydantic V1 has entered maintenance mode. It has significant performance overhead compared to V2 (compiled in Rust) and lacks native Python 3.12/3.13 typing optimizations.",
                    recommendation="Migrate to Pydantic v2 using pydantic.v1 compatibility shims and migrate models to model_validate()."
                ))
            elif name_lower == "urllib3" and ("1." in declared or "<2" in declared):
                risk_level = "moderate" if risk_level != "high" else risk_level
                risk_score = max(risk_score, 50)
                findings.append(RiskFinding(
                    risk_level="moderate",
                    category="compatibility",
                    title="Legacy urllib3 v1.x Dependency",
                    evidence=f"Declared version: '{declared}'.",
                    explanation="urllib3 v1.x does not support modern TLS features and is deprecated on modern Python distributions.",
                    recommendation="Upgrade to urllib3 >=2.0.0."
                ))

        # 4. Check source code usage evidence
        usage_count = len(usages)
        if usage_count == 0:
            findings.append(RiskFinding(
                risk_level="informational",
                category="maintenance",
                title="Unused or Indirect Dependency in Source Code",
                evidence=f"No direct 'import' or 'require' statements discovered across scanned repository source files.",
                explanation="The package is declared in manifests but not directly imported in scanned source files. It may be an indirect build dependency, a CLI plugin, or dead code.",
                recommendation="Review whether this dependency is actively required or can be removed to reduce dependency surface area."
            ))
        elif usage_count >= 5:
            if risk_level in ["high", "moderate"]:
                risk_score = min(100, risk_score + 10)
                findings.append(RiskFinding(
                    risk_level="informational",
                    category="maintenance",
                    title=f"High Architectural Coupling ({usage_count} Import Sites)",
                    evidence=f"Imported across {usage_count} distinct locations in the repository.",
                    explanation=f"Because this dependency is heavily utilized across the codebase, any unaddressed maintenance risk directly impacts multiple modules.",
                    recommendation="Ensure migration plans include regression tests across all consumer modules."
                ))

        # 5. Passed check fallback
        if not findings:
            findings.append(RiskFinding(
                risk_level="passed",
                category="maintenance",
                title="Dependency Constraint and Evidence Verified",
                evidence=f"Declared as '{declared}' with {usage_count} active source code imports.",
                explanation="The dependency uses standard versioning, has direct source usage, and shows no known architectural deprecation flags.",
                recommendation="Continue regular dependency audits."
            ))

        # Determine replacement suggestion if available
        replacement = None
        if name_lower in KNOWN_REPLACEMENTS:
            r = KNOWN_REPLACEMENTS[name_lower]
            replacement = ReplacementSuggestion(
                original_package=name,
                proposed_package=r["replacement"],
                proposed_version=r["version"],
                rationale=r["rationale"],
                migration_complexity=r["complexity"],
                breaking_changes=r["breaking_changes"],
                confidence=0.96
            )
        elif risk_level in ["high", "moderate"]:
            # Generic proposed replacement / modernization
            replacement = ReplacementSuggestion(
                original_package=name,
                proposed_package=name,
                proposed_version=f">={resolved or 'latest'}",
                rationale=f"Upgrade {name} to the latest maintained LTS release to mitigate constraint/deprecation concerns.",
                migration_complexity="low",
                breaking_changes=["Review semantic version changelog for potential signature updates."],
                confidence=0.88
            )

        return {
            "risk_level": risk_level,
            "risk_score": risk_score,
            "risk_findings": findings,
            "replacement_suggestion": replacement
        }

risk_engine = RiskEngine()
