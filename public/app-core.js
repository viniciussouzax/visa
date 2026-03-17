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

    // ==========================================
    // SESSION MANAGEMENT (sessionStorage)
    // ==========================================
    const STORAGE_AUTH = 'ds160_auth';
    const STORAGE_ORG = 'ds160_org';

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

    /** Clear session (logout) */
    function clearSession() {
        sessionStorage.removeItem(STORAGE_AUTH);
        sessionStorage.removeItem(STORAGE_ORG);
    }

    /** Check if user has auth */
    function isLoggedIn() {
        return !!getAuth();
    }

    // ==========================================
    // CRUD HELPERS
    // ==========================================
    /** Bearer token: session token > auth param > anon key */
    function _bearer() {
        return window._sessionToken || getAuth() || SUPABASE_KEY;
    }

    async function sbFetch(path, method, body) {
        const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + _bearer(),
                'Prefer': 'return=representation'
            },
            body: body ? JSON.stringify(body) : undefined,
        });
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
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + _bearer()
            },
        });
        if (!res.ok) return [];
        return res.json();
    }

    // ==========================================
    // NAVIGATION
    // ==========================================
    function buildUrl(page, params = {}) {
        let url = page;
        const auth = getAuth();
        const org = getOrg();
        const allParams = { ...params };
        if (auth && !allParams.auth) allParams.auth = auth;
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
    }

    function showLoading() {
        _injectLoading();
        const el = document.getElementById('appLoadingScreen');
        if (el) { el.style.display = 'flex'; el.style.opacity = '1'; }
    }

    function hideLoading() {
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
        isLoggedIn,

        // CRUD
        sbFetch,
        sbGet,

        // Navigation
        buildUrl,
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

    // Safety timeout: auto-hide loading after 4s in case startup fails
    setTimeout(hideLoading, 4000);

})();
