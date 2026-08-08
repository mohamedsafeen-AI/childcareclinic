const API_BASE = 'https://childcareclinic.vercel.app';

export async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    const config = {
        ...options,
        headers,
        body: options.body && typeof options.body === 'object' ? JSON.stringify(options.body) : options.body
    };

    const res = await fetch(`${API_BASE}${endpoint}`, config);

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error! status: ${res.status}`);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
}