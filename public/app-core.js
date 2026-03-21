/**
 * app-core.js — Módulo centralizado de config, auth, CRUD, navegação e UI
 * Usado por: dashboard.html, ds160-form.html, portal.html
 */
(function () {
    'use strict';

    // ==========================================
    // SUPABASE CONFIG
    // ==========================================
    const SUPABASE_URL = 'https://zcpvknzktfmotvrybxdf.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcHZrbnprdGZtb3R2cnlieGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDk2MjIsImV4cCI6MjA4NjM4NTYyMn0.XaJG4V6NsQTYoU8I_wxHLyDEkVdPosqfJNm8nRHVjxg';
    const PUBLIC_APP_BASE_URL = 'https://viniciussouzax.github.io/visa/';

    // ==========================================
    // SESSION MANAGEMENT (sessionStorage)
    // ==========================================
    const STORAGE_AUTH = 'ds160_auth';
    const STORAGE_ORG = 'ds160_org';
    const STORAGE_PORTAL_ORG = 'portal_org';
    const STORAGE_PORTAL_COMPANY = 'portal_company_id';

    function _readParam(key) {
        const params = new URLSearchParams(location.search);
        return params.get(key);
    }

    /** Get auth token: URL param > sessionStorage > null */
    function getAuth() {
        let token = _readParam('auth');
        if (token) {
            sessionStorage.setItem(STORAGE_AUTH, token);
            return token;
        }
        return sessionStorage.getItem(STORAGE_AUTH);
    }

    /** Get org: URL param > sessionStorage > null */
    function getOrg() {
        let org = _readParam('org');
        if (org) {
            sessionStorage.setItem(STORAGE_ORG, org);
            return org;
        }
        return sessionStorage.getItem(STORAGE_ORG);
    }

    /** Save session explicitly */
    function setSession(auth, org) {
        if (auth) sessionStorage.setItem(STORAGE_AUTH, auth);
        if (org) sessionStorage.setItem(STORAGE_ORG, org);
    }

    function setPortalContext(org, companyId) {
        if (org) sessionStorage.setItem(STORAGE_PORTAL_ORG, org);
        if (companyId) sessionStorage.setItem(STORAGE_PORTAL_COMPANY, companyId);
    }

    function clearPortalContext() {
        sessionStorage.removeItem(STORAGE_PORTAL_ORG);
        sessionStorage.removeItem(STORAGE_PORTAL_COMPANY);
    }

    /** Clear session (logout) */
    function clearSession() {
        sessionStorage.removeItem(STORAGE_AUTH);
        sessionStorage.removeItem(STORAGE_ORG);
    }

    /** Check if user has auth */
    function isLoggedIn() {
        return !!getAuth();
    }

    function _isAssessorForm() {
        const path = (location.pathname || '').toLowerCase();
        const tab = (_readParam('tab') || '').toLowerCase();
        return path.endsWith('ds160-form.html') && (tab === 'editar' || tab === 'assessor');
    }

    function _buildLoginRedirectUrl() {
        const org = getOrg();
        const path = (location.pathname || '').toLowerCase();
        if (path.endsWith('ds160-form.html') && !_isAssessorForm()) {
            return org ? 'portal.html?org=' + encodeURIComponent(org) : 'portal.html';
        }
        return org ? 'dashboard.html?org=' + encodeURIComponent(org) : 'dashboard.html';
    }

    function _isLocalhostHost(hostname) {
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    }

    function getPublicBaseUrl() {
        const hostname = (location.hostname || '').toLowerCase();
        if (_isLocalhostHost(hostname)) return PUBLIC_APP_BASE_URL;

        const pathname = location.pathname || '/';
        const basePath = pathname.endsWith('/') ? pathname : pathname.replace(/\/[^/]*$/, '/');
        return new URL(basePath, location.origin).toString();
    }

    function buildPublicUrl(page, params = {}) {
        return new URL(buildUrl(page, params), getPublicBaseUrl()).toString();
    }

    function handleAuthFailure(reason = 'unauthorized') {
        console.warn('[AppCore] Auth failure:', reason);
        clearSession();
        window._sessionToken = null;
        sessionStorage.removeItem('client_app_id');

        const target = _buildLoginRedirectUrl();
        if ((location.pathname || '').toLowerCase().endsWith('dashboard.html')) {
            const overlay = document.getElementById('loginOverlay');
            if (overlay) overlay.style.display = 'flex';
            const sidebar = document.querySelector('.sidebar');
            const main = document.querySelector('.main');
            if (sidebar) sidebar.style.display = 'none';
            if (main) main.style.display = 'none';
        }

        if (location.href !== new URL(target, location.href).href) {
            window.location.href = target;
        }
    }

    function shouldRedirectOnAuthFailure() {
        const path = (location.pathname || '').toLowerCase();
        if (path.endsWith('dashboard.html')) return true;
        if (_isAssessorForm()) return true;
        return false;
    }

    // ==========================================
    // CRUD HELPERS
    // ==========================================
    /** Bearer token: session token > auth param > anon key */
    function _bearer() {
        return window._sessionToken || getAuth() || SUPABASE_KEY;
    }

    function _restHeaders(extra = {}) {
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + _bearer(),
            ...extra
        };

        const portalOrg = sessionStorage.getItem(STORAGE_PORTAL_ORG) || getOrg();
        const portalCompanyId = sessionStorage.getItem(STORAGE_PORTAL_COMPANY);
        if (portalOrg) headers['X-Portal-Org'] = portalOrg;
        if (portalCompanyId) headers['X-Portal-Company-Id'] = portalCompanyId;
        return headers;
    }

    async function sbFetch(path, method, body) {
        const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
            method,
            headers: _restHeaders({
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }),
            body: body ? JSON.stringify(body) : undefined,
        });
        if (res.status === 401 || res.status === 403) {
            if (shouldRedirectOnAuthFailure()) handleAuthFailure('rest:' + res.status);
            throw new Error(res.status + ': auth required');
        }
        if (!res.ok) {
            const err = await res.text();
            throw new Error(res.status + ': ' + err);
        }
        const text = await res.text();
        if (!text) return null;
        try { return JSON.parse(text); } catch { return null; }
    }

    async function sbGet(path) {
        const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
            headers: _restHeaders(),
        });
        if (res.status === 401 || res.status === 403) {
            if (shouldRedirectOnAuthFailure()) handleAuthFailure('rest:' + res.status);
            throw new Error(res.status + ': auth required');
        }
        if (!res.ok) return [];
        return res.json();
    }

    // ==========================================
    // NAVIGATION
    // ==========================================
    function buildUrl(page, params = {}) {
        let url = page;
        const org = getOrg();
        const allParams = { ...params };
        if (org && !allParams.org) allParams.org = org;

        const qs = Object.entries(allParams)
            .filter(([, v]) => v != null && v !== '')
            .map(([k, v]) => k + '=' + encodeURIComponent(v))
            .join('&');
        return qs ? url + '?' + qs : url;
    }

    function navigate(page, params = {}) {
        window.location.href = buildUrl(page, params);
    }

    function goToDashboard(page) {
        let url = buildUrl('dashboard.html');
        if (page) url += '#' + page;
        window.location.href = url;
    }

    function goToForm(id, tab) {
        const params = { id };
        if (tab) params.tab = tab;
        navigate('ds160-form.html', params);
    }


    // ==========================================
    // LOADING SCREEN
    // ==========================================
    let _loadingSafetyTimer = null;

    function _scheduleLoadingSafety() {
        clearTimeout(_loadingSafetyTimer);
        _loadingSafetyTimer = setTimeout(hideLoading, 15000);
    }

    function _injectLoading() {
        if (document.getElementById('appLoadingScreen')) return;
        // Use org branding from sessionStorage if available
        var logo = 'logo-azul.png';
        var bg = '#f0f2f5';
        var logoMaxW = '120px'; // Platform default
        var orgLogo = sessionStorage.getItem('client_org_logo');
        var orgUseLogo = sessionStorage.getItem('client_org_use_logo');
        var orgBg = sessionStorage.getItem('client_org_bg_color');
        var orgLogoW = sessionStorage.getItem('client_org_logo_width');
        if (orgUseLogo === '1' && orgLogo) {
            logo = orgLogo;
            logoMaxW = (orgLogoW || '150') + 'px'; // Custom org size
        }
        if (orgBg) bg = orgBg;

        const div = document.createElement('div');
        div.id = 'appLoadingScreen';
        div.style.cssText = 'position:fixed;inset:0;background:' + bg + ';display:flex;align-items:center;justify-content:center;z-index:99999;transition:opacity .3s';
        div.innerHTML = '<img src="' + logo + '" alt="Carregando" style="max-width:' + logoMaxW + ';height:auto;opacity:.7;animation:appPulse 1.5s ease-in-out infinite">';
        // Inject pulse animation
        if (!document.getElementById('appPulseStyle')) {
            const style = document.createElement('style');
            style.id = 'appPulseStyle';
            style.textContent = '@keyframes appPulse{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:.3;transform:scale(.92)}}';
            document.head.appendChild(style);
        }
        document.body.insertBefore(div, document.body.firstChild);
        _scheduleLoadingSafety();
    }

    function showLoading() {
        _injectLoading();
        const el = document.getElementById('appLoadingScreen');
        if (el) { el.style.display = 'flex'; el.style.opacity = '1'; }
        _scheduleLoadingSafety();
    }

    function hideLoading() {
        clearTimeout(_loadingSafetyTimer);
        const el = document.getElementById('appLoadingScreen');
        if (el) {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }
    }

    // ==========================================
    // TOAST
    // ==========================================
    function toast(msg, type = 'success') {
        let t = document.getElementById('toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'toast';
            t.className = 'app-toast';
            document.body.appendChild(t);
        }
        t.className = 'app-toast ' + (type === 'error' ? 'toast-error' : 'toast-success') + ' show';
        t.textContent = msg;
        clearTimeout(t._timeout);
        t._timeout = setTimeout(() => { t.classList.remove('show'); }, 2500);
    }

    // ==========================================
    // EXPOSE PUBLIC API
    // ==========================================
    window.AppCore = {
        // Config
        SUPABASE_URL,
        SUPABASE_KEY,

        // Session
        getAuth,
        getOrg,
        setSession,
        clearSession,
        setPortalContext,
        clearPortalContext,
        isLoggedIn,
        handleAuthFailure,

        // CRUD
        sbFetch,
        sbGet,

        // Navigation
        buildUrl,
        buildPublicUrl,
        navigate,
        goToDashboard,
        goToForm,

        // Edge Functions
        callEdgeFunction,

        // UI
        showLoading,
        hideLoading,
        toast,
    };

    async function callEdgeFunction(name, body) {
        const res = await fetch(SUPABASE_URL + '/functions/v1/' + name, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + _bearer(),
                'apikey': SUPABASE_KEY
            },
            body: JSON.stringify(body)
        });
        if (res.status === 401 || res.status === 403) {
            if (shouldRedirectOnAuthFailure()) handleAuthFailure('edge:' + res.status);
            throw new Error(res.status + ': auth required');
        }
        if (!res.ok) {
            const err = await res.text();
            throw new Error(res.status + ': ' + err);
        }
        return res.json();
    }

    // Auto-show loading on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _injectLoading);
    } else {
        _injectLoading();
    }

    // Safety timeout: auto-hide loading after a longer window in case startup fails
    _scheduleLoadingSafety();

})();
