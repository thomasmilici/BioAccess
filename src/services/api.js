const API_BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(status, body) {
    super(`API Error ${status}: ${body?.detail || 'Unknown'}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

class ApiService {
  constructor() {
    this._available = null; // null=unknown, true=live, false=offline
    this._healthCheckPromise = null;
  }

  get available() {
    return this._available;
  }

  // -----------------------------------------------------------------------
  // Health Check
  // -----------------------------------------------------------------------
  async checkHealth() {
    if (this._healthCheckPromise) return this._healthCheckPromise;

    this._healthCheckPromise = this._fetch('/api/health')
      .then(res => {
        this._available = true;
        return res;
      })
      .catch(() => {
        this._available = false;
        return null;
      })
      .finally(() => {
        this._healthCheckPromise = null;
      });

    return this._healthCheckPromise;
  }

  // -----------------------------------------------------------------------
  // Full Pipeline
  // -----------------------------------------------------------------------
  async analyze(imageFile, turnstileType = 'stable', userId = null, turnstileId = null) {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('turnstile_type', turnstileType);
    if (userId) formData.append('user_id', userId);
    if (turnstileId) formData.append('turnstile_id', turnstileId);

    const result = await this._fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    });

    this._available = true;
    return result;
  }

  // -----------------------------------------------------------------------
  // Individual Endpoints
  // -----------------------------------------------------------------------
  async detectFace(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    return this._fetch('/api/detect-face', { method: 'POST', body: formData });
  }

  async extractLandmarks(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    return this._fetch('/api/extract-landmarks', { method: 'POST', body: formData });
  }

  async checkLiveness(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    return this._fetch('/api/check-liveness', { method: 'POST', body: formData });
  }

  async verifyFace(imageFile, userId = null) {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (userId) formData.append('user_id', userId);
    return this._fetch('/api/verify-face', { method: 'POST', body: formData });
  }

  async getStats() {
    return this._fetch('/api/stats');
  }

  async updateStats(confidence, decision, turnstileType) {
    return this._fetch('/api/stats/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confidence,
        decision,
        turnstile_type: turnstileType,
      }),
    });
  }

  async registerEmbedding(imageFile, userId) {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('user_id', userId);
    return this._fetch('/api/register-embedding', { method: 'POST', body: formData });
  }

  async resolveSupervision(turnstileId, approved, notes = '') {
    return this._fetch('/api/resolve-supervision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        turnstile_id: turnstileId,
        operator_decision: approved ? 'approved' : 'denied',
        operator_notes: notes,
      }),
    });
  }

  // -----------------------------------------------------------------------
  // Internal fetch with timeout
  // -----------------------------------------------------------------------
  async _fetch(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new ApiError(response.status, body);
      }

      return response.json();
    } catch (err) {
      if (err.name === 'ApiError') throw err;
      this._available = false;
      throw new ApiError(0, { detail: err.message || 'Network error' });
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const api = new ApiService();
