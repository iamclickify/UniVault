/**
 * UniVault API Client
 * Centralized logic for backend communication.
 */

const API_CONFIG = {
    // Detect if running locally or on Vercel
    getBaseURL: () => {
        return (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:5000' 
            : ''; // Vercel Proxy (Relative Path)
    }
};

const UniVaultAPI = {
    baseUrl: API_CONFIG.getBaseURL(),

    /**
     * Helper to get clean API URLs
     */
    getEndpoint: (path) => {
        const base = UniVaultAPI.baseUrl.replace(/\/$/, '');
        return `${base}/api/${path.replace(/^\//, '')}`;
    },

    /**
     * Send a chat query to the RAG engine
     */
    async chat(query) {
        try {
            const response = await fetch(this.getEndpoint('chat'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('API Chat Error:', error);
            throw error;
        }
    },

    /**
     * Upload a document for indexing
     */
    async upload(file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch(this.getEndpoint('upload'), {
                method: 'POST',
                body: formData
            });
            if (!response.ok) throw new Error(`Upload Failed: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('API Upload Error:', error);
            throw error;
        }
    },

    /**
     * Check server health
     */
    async checkHealth() {
        try {
            const res = await fetch(`${UniVaultAPI.baseUrl.replace(/\/$/, '')}/health`);
            return await res.json();
        } catch (error) {
            console.warn('Backend currently unreachable (sleeping or offline).', error);
            return null;
        }
    }
};

// Export for use in other scripts
window.UniVaultAPI = UniVaultAPI;
