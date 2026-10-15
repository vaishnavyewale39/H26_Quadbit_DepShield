// Use relative path when running under Vite dev server (proxy configured),
// otherwise fall back to absolute backend URL
const API_BASE = window.location.port === '5173' ? '/api' : 'http://127.0.0.1:8000/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async analyzeRepository(repoUrl) {
    const res = await fetch(`${API_BASE}/repositories/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: repoUrl }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Repository analysis failed');
    }
    return res.json();
  },

  async getAnalysis(analysisId) {
    const res = await fetch(`${API_BASE}/analyses/${analysisId}`);
    if (!res.ok) throw new Error('Failed to retrieve analysis');
    return res.json();
  },

  async getDependencyRisks(dependencyId) {
    const res = await fetch(`${API_BASE}/dependencies/${dependencyId}/risks`);
    if (!res.ok) throw new Error('Failed to load dependency risk assessment');
    return res.json();
  },

  async getMigrationPlan(dependencyId) {
    const res = await fetch(`${API_BASE}/dependencies/${dependencyId}/migration-plan`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to generate migration plan');
    return res.json();
  },

  async verifyDependency(dependencyId) {
    const res = await fetch(`${API_BASE}/dependencies/${dependencyId}/verify`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to execute isolated verification');
    return res.json();
  },

  async improveReadme(analysisId) {
    const res = await fetch(`${API_BASE}/readme/improve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis_id: analysisId }),
    });
    if (!res.ok) throw new Error('Failed to improve README');
    return res.json();
  },

  async getComparison(comparisonId) {
    const res = await fetch(`${API_BASE}/comparisons/${comparisonId}`);
    if (!res.ok) throw new Error('Failed to load comparison data');
    return res.json();
  },

  async exportComparisonMarkdown(comparisonId) {
    const res = await fetch(`${API_BASE}/comparisons/${comparisonId}/export?format=markdown`);
    if (!res.ok) throw new Error('Failed to export markdown');
    return res.text();
  },

  async downloadPdfReport(analysisId, comparisonId) {
    const res = await fetch(`${API_BASE}/reports/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis_id: analysisId, comparison_id: comparisonId }),
    });
    if (!res.ok) {
      let msg = 'Failed to generate PDF report';
      try {
        const errJson = await res.json();
        msg = errJson.detail || msg;
      } catch (e) {}
      throw new Error(msg);
    }
    const blob = await res.blob();
    if (!blob || blob.size === 0) {
      throw new Error('Received empty PDF document from server');
    }
    return blob;
  }
};
