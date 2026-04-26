// ===== DATA STORE =====
const STORAGE_KEY = 'vanessa_despesas';
const INCOME_KEY = 'vanessa_receitas';
const FIXED_KEY = 'vanessa_fixas';
const FIXED_STATUS_KEY = 'vanessa_fixas_status';
const CUSTOM_CAT_KEY = 'vanessa_cat_despesas';
const CUSTOM_INC_CAT_KEY = 'vanessa_cat_receitas';
const CHILDREN_KEY = 'vanessa_filhos';
const FIXED_INCOME_KEY = 'vanessa_fixas_receitas';
const FIXED_INCOME_STATUS_KEY = 'vanessa_fixas_receitas_status';
let salaryDay = null;
// 'fixed-day' | 'last-working-day' | 'working-day-after'. Controls how the
// salary date for each month is computed — useful for salaries that arrive
// on a weekend-shifted schedule.
let salaryMode = 'fixed-day';
let expenses = [];
let incomes = [];
let fixedExpenses = [];      // recurring templates { id, description, amount, dayOfMonth, category, type, startDate, endDate, notes, split, isVariable }
let fixedStatus = [];        // monthly instances { fixedId, month, status, amount?, paidByFather? }
let fixedIncomes = [];       // fixed income templates { id, description, amount, dayOfMonth, category, startDate, endDate, notes }
let fixedIncomeStatus = [];  // monthly instances { fixedIncomeId, month, status }
let customCategories = [];
let customIncCategories = [];
let children = [];           // { id, name, coParentName, splitPct }
let activeChildId = null;
let currentDate = new Date();
let pendingAttachment = null;
let pendingIncomeAttachment = null;
const LAST_CAT_KEY = 'vanessa_last_category';
const USER_NAME_KEY = 'vanessa_user_name';
const USER_NIF_KEY = 'vanessa_user_nif';
const APP_TITLE_KEY = 'vanessa_app_title';
const HOUSEHOLD_MODE_KEY = 'vanessa_household_mode';
const SPOUSE_NAME_KEY = 'vanessa_spouse_name';
const SPOUSE_PCT_KEY = 'vanessa_spouse_pct';
const PARTNER_NAME_KEY = 'vanessa_partner_name';
const PARTNER_PCT_KEY = 'vanessa_partner_pct';

function getPartnerName() {
    return (localStorage.getItem(PARTNER_NAME_KEY) || '').trim();
}
function getPartnerPct() {
    const raw = parseInt(localStorage.getItem(PARTNER_PCT_KEY));
    return isNaN(raw) ? 50 : Math.max(0, Math.min(100, raw));
}

// 'separated' (default): track co-parent splits; 'married': spouse split
function getHouseholdMode() {
    return localStorage.getItem(HOUSEHOLD_MODE_KEY) || 'separated';
}

function isMarriedMode() {
    return getHouseholdMode() === 'married';
}

function getSpouseName() {
    return localStorage.getItem(SPOUSE_NAME_KEY) || 'Conjuge';
}

function getSpousePct() {
    const v = parseInt(localStorage.getItem(SPOUSE_PCT_KEY) || '50');
    return isNaN(v) ? 50 : Math.max(0, Math.min(100, v));
}
const TEMPLATES_KEY = 'vanessa_templates';
const PREPAID_KEY = 'vanessa_prepaid_cards';
const GOALS_KEY = 'vanessa_savings_goals';
const NETWORTH_KEY = 'vanessa_net_worth';
const BUDGETS_KEY = 'vanessa_budgets';
let expenseTemplates = [];   // { id, description, amount, category, type, split, essential, icon }
let categoryBudgets = {};    // { category: maxAmount }
let prepaidCards = [];       // { id, name, icon, color, createdAt, transactions: [{id, type:'topup'|'spend', amount, description, date, expenseId?}] }
let savingsGoals = [];       // { id, name, target, deadline, savedSoFar, createdAt, color }
let netWorth = { assets: [], liabilities: [], updatedAt: null }; // { assets: [{name, amount}], liabilities: [{name, amount}] }

function getUserName() {
    return localStorage.getItem(USER_NAME_KEY) || '';
}

function getUserNif() {
    const s = (localStorage.getItem(USER_NIF_KEY) || '').replace(/\D+/g, '');
    return /^\d{9}$/.test(s) ? s : '';
}

function getUserNameOrDefault() {
    const n = getUserName();
    return n || 'Eu';
}

function getAppTitle() {
    return localStorage.getItem(APP_TITLE_KEY) || 'Despesas';
}

function applyAppTitle() {
    const title = getAppTitle();
    document.title = title;
    const headerEl = document.getElementById('header-title');
    if (headerEl) headerEl.textContent = title;
}

// ===== CATEGORY CONFIG =====
const CATEGORIES = {
    supermercado: { label: 'Supermercado', icon: 'fa-cart-shopping', color: '#8BC34A' },
    alimentacao: { label: 'Alimentacao', icon: 'fa-utensils', color: '#FFC107' },
    restaurantes: { label: 'Restaurantes', icon: 'fa-burger', color: '#FF9800' },
    transportes: { label: 'Transportes', icon: 'fa-bus', color: '#03A9F4' },
    combustivel: { label: 'Combustivel', icon: 'fa-gas-pump', color: '#9C27B0' },
    saude: { label: 'Saude', icon: 'fa-heart-pulse', color: '#F44336' },
    farmacia: { label: 'Farmacia', icon: 'fa-pills', color: '#E91E63' },
    educacao: { label: 'Educacao', icon: 'fa-graduation-cap', color: '#3F51B5' },
    roupa: { label: 'Roupa', icon: 'fa-shirt', color: '#673AB7' },
    casa: { label: 'Casa/Renda', icon: 'fa-house', color: '#2196F3' },
    contas: { label: 'Contas', icon: 'fa-file-invoice', color: '#009688' },
    telecomunicacoes: { label: 'Telecomunicacoes', icon: 'fa-wifi', color: '#00BCD4' },
    lazer: { label: 'Lazer', icon: 'fa-gamepad', color: '#CDDC39' },
    beleza: { label: 'Beleza', icon: 'fa-spa', color: '#E91E63' },
    subscricoes: { label: 'Subscricoes', icon: 'fa-rotate', color: '#7B1FA2' },
    presentes: { label: 'Presentes', icon: 'fa-gift', color: '#FF5722' },
    outros: { label: 'Outros', icon: 'fa-ellipsis', color: '#607D8B' }
};

const INCOME_CATEGORIES = {
    ordenado: { label: 'Ordenado', icon: 'fa-briefcase' },
    subsidio: { label: 'Subsidio', icon: 'fa-gift' },
    freelance: { label: 'Freelance / Extra', icon: 'fa-laptop' },
    reembolso: { label: 'Reembolso', icon: 'fa-rotate-left' },
    pagamento_coparent: { label: 'Pagamento Co-progenitor', icon: 'fa-hand-holding-dollar' },
    ajuda_familiar: { label: 'Ajuda Familiar', icon: 'fa-people-arrows' },
    venda: { label: 'Venda', icon: 'fa-tag' },
    transicao: { label: 'Saldo Transitado', icon: 'fa-arrow-right-arrow-left' },
    outros_receita: { label: 'Outros', icon: 'fa-ellipsis' }
};

// ===== AI SYNC MODULE (Gemini + Gmail) =====
let pendingExpenses = [];
const PENDING_KEY = 'vanessa_pending_ai';
const AI_CFG_KEY = 'vanessa_ai_cfg';

let aiCfg = { geminiKey: '', grokKey: '', grokModel: 'grok-4-fast', groqKey: '', groqModel: 'llama-3.3-70b-versatile', mistralKey: '', mistralModel: 'mistral-small-latest', aiProvider: 'gemini', googleClientId: '', autoSync: false, lastSyncDate: null, ownContacts: '' };
let _googleTokenClient = null;
let _googleAccessToken = null;

function loadAiData() {
    const s = localStorage.getItem(AI_CFG_KEY);
    if (s) aiCfg = { ...aiCfg, ...JSON.parse(s) };
    const p = localStorage.getItem(PENDING_KEY);
    pendingExpenses = p ? JSON.parse(p) : [];
}

function saveAiSettings() {
    const key = document.getElementById('ai-gemini-key')?.value.trim();
    const grokKey = document.getElementById('ai-grok-key')?.value.trim();
    const grokModel = document.getElementById('ai-grok-model')?.value.trim();
    const groqKey = document.getElementById('ai-groq-key')?.value.trim();
    const groqModel = document.getElementById('ai-groq-model')?.value.trim();
    const mistralKey = document.getElementById('ai-mistral-key')?.value.trim();
    const mistralModel = document.getElementById('ai-mistral-model')?.value.trim();
    const provider = document.querySelector('input[name="ai-provider"]:checked')?.value;
    const cid = document.getElementById('ai-google-client-id')?.value.trim();
    const ownContactsEl = document.getElementById('ai-own-contacts');
    if (key) aiCfg.geminiKey = key;
    if (grokKey) aiCfg.grokKey = grokKey;
    if (grokModel) aiCfg.grokModel = grokModel;
    if (groqKey) aiCfg.groqKey = groqKey;
    if (groqModel) aiCfg.groqModel = groqModel;
    if (mistralKey) aiCfg.mistralKey = mistralKey;
    if (mistralModel) aiCfg.mistralModel = mistralModel;
    if (provider) aiCfg.aiProvider = provider;
    if (ownContactsEl) aiCfg.ownContacts = ownContactsEl.value.trim();
    if (cid) aiCfg.googleClientId = cid;
    localStorage.setItem(AI_CFG_KEY, JSON.stringify(aiCfg));
    _googleTokenClient = null; // reset so it re-initializes with new client ID
    showToast('Configuracao IA guardada!');
    renderAiSettingsUI();
}

function toggleAutoSync() {
    aiCfg.autoSync = document.getElementById('ai-auto-sync')?.checked || false;
    localStorage.setItem(AI_CFG_KEY, JSON.stringify(aiCfg));
}

function renderAiSettingsUI() {
    const keyEl = document.getElementById('ai-gemini-key');
    const grokKeyEl = document.getElementById('ai-grok-key');
    const grokModelEl = document.getElementById('ai-grok-model');
    const groqKeyEl = document.getElementById('ai-groq-key');
    const groqModelEl = document.getElementById('ai-groq-model');
    const mistralKeyEl = document.getElementById('ai-mistral-key');
    const mistralModelEl = document.getElementById('ai-mistral-model');
    const cidEl = document.getElementById('ai-google-client-id');
    const autoEl = document.getElementById('ai-auto-sync');
    const fromEl = document.getElementById('ai-sync-from');
    const toEl = document.getElementById('ai-sync-to');
    if (keyEl && aiCfg.geminiKey) keyEl.value = aiCfg.geminiKey;
    if (grokKeyEl && aiCfg.grokKey) grokKeyEl.value = aiCfg.grokKey;
    if (grokModelEl) grokModelEl.value = aiCfg.grokModel || 'grok-4-fast';
    if (groqKeyEl && aiCfg.groqKey) groqKeyEl.value = aiCfg.groqKey;
    if (groqModelEl) groqModelEl.value = aiCfg.groqModel || 'llama-3.3-70b-versatile';
    if (mistralKeyEl && aiCfg.mistralKey) mistralKeyEl.value = aiCfg.mistralKey;
    if (mistralModelEl) mistralModelEl.value = aiCfg.mistralModel || 'mistral-small-latest';
    const providerEl = document.querySelector(`input[name="ai-provider"][value="${aiCfg.aiProvider || 'gemini'}"]`);
    if (providerEl) providerEl.checked = true;
    // Toggle provider-specific blocks. If the wrapper IDs aren't in the DOM
    // (stale HTML cache), fall back to walking up from the known input IDs.
    const provider = aiCfg.aiProvider || 'gemini';
    const showBlock = (blockId, inputId, visible) => {
        const byId = document.getElementById(blockId);
        if (byId) { byId.style.display = visible ? '' : 'none'; return; }
        const input = document.getElementById(inputId);
        const group = input?.closest('.form-group');
        if (group) group.style.display = visible ? '' : 'none';
    };
    showBlock('ai-gemini-block', 'ai-gemini-key', provider === 'gemini');
    showBlock('ai-grok-block', 'ai-grok-key', provider === 'grok');
    showBlock('ai-groq-block', 'ai-groq-key', provider === 'groq');
    showBlock('ai-mistral-block', 'ai-mistral-key', provider === 'mistral');
    if (cidEl && aiCfg.googleClientId) cidEl.value = aiCfg.googleClientId;
    const ownEl = document.getElementById('ai-own-contacts');
    if (ownEl && aiCfg.ownContacts !== undefined) ownEl.value = aiCfg.ownContacts;
    if (autoEl) autoEl.checked = aiCfg.autoSync;
    const today = new Date().toISOString().slice(0, 10);
    if (fromEl && !fromEl.value) fromEl.value = today;
    if (toEl && !toEl.value) toEl.value = today;
    // Gmail status
    const gmailEl = document.getElementById('gmail-status');
    if (gmailEl) gmailEl.innerHTML = _googleAccessToken
        ? '<span style="color:var(--success)"><i class="fas fa-check-circle"></i> Gmail ligado</span>'
        : '<span style="color:var(--text-light)"><i class="fas fa-times-circle"></i> Nao ligado</span>';
    // Last sync
    const lsEl = document.getElementById('last-sync-date');
    if (lsEl) lsEl.textContent = aiCfg.lastSyncDate ? 'Ultima sincronizacao: ' + aiCfg.lastSyncDate : 'Nunca sincronizado';
}

function initGoogleTokenClient() {
    if (!aiCfg.googleClientId || !window.google?.accounts?.oauth2) return;
    _googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: aiCfg.googleClientId,
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        callback: (resp) => {
            if (resp.error) { showToast('Erro Google Auth: ' + resp.error); return; }
            _googleAccessToken = resp.access_token;
            showToast('Gmail ligado!');
            renderAiSettingsUI();
            // check if there was a pending sync waiting for auth
            if (window._pendingSyncAfterAuth) { window._pendingSyncAfterAuth = false; triggerManualSync(); }
        }
    });
}

function signInGoogle() {
    if (!aiCfg.googleClientId) { showToast('Configura o Google Client ID primeiro'); return; }
    if (!window.google?.accounts?.oauth2) { showToast('A carregar biblioteca Google...'); return; }
    if (!_googleTokenClient) initGoogleTokenClient();
    _googleTokenClient?.requestAccessToken();
}

// Payment-related keywords for subject line pre-filtering
const PAYMENT_KEYWORDS = [
    'debit','debito','pagamento','fatura','factura','compra','transac','transferen',
    'movimento','recibo','banco','mbway','multibanco','visa','mastercard','sepa',
    'direct debit','payment','purchase','withdrawal','atm','pos ','ref ','iban','swift',
    'cobranca','vencimento','subscric',
    // Common PT billers — catches invoice emails even when subject lacks a generic term
    'edp','galp','vodafone',' nos ','nos.pt','meo','altice','nowo','lidl','continente',
    'worten','zara','mango','hm','netflix','spotify','amazon','uber','bolt','glovo',
    'ifood','zomato','booking','tap','ryanair','ctt','fidelidade','tranquilidade',
    'ageas','allianz','santander','novobanco','millennium','cgd','bpi','montepio',
    'revolut','wise','paypal','openbank','activobank'
];

function isProbablyPaymentEmail(subject, from) {
    const text = (subject + ' ' + from).toLowerCase();
    return PAYMENT_KEYWORDS.some(k => text.includes(k));
}

async function fetchGmailForPeriod(from, to) {
    const fromStr = from.toISOString().slice(0, 10).replace(/-/g, '/');
    const toDate = new Date(to); toDate.setDate(toDate.getDate() + 1);
    const toStr = toDate.toISOString().slice(0, 10).replace(/-/g, '/');
    // Broader keyword set so EDP/Galp/telco invoice notifications aren't filtered out.
    const q = `after:${fromStr} before:${toStr} (debito OR pagamento OR fatura OR factura OR compra OR transacao OR mbway OR multibanco OR movimentos OR recibo OR cobranca OR EDP OR Galp OR Vodafone OR NOS OR MEO OR Nowo OR seguro OR renda OR subscricao)`;
    // Step 1: fetch metadata only (no body) — free and fast
    const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=150`,
        { headers: { Authorization: 'Bearer ' + _googleAccessToken } }
    );
    if (!listRes.ok) throw new Error('Erro Gmail API: ' + listRes.status);
    const listData = await listRes.json();
    if (!listData.messages?.length) return [];

    // Load already-seen email IDs to avoid re-analysis
    const seenIds = new Set(aiCfg.analyzedEmailIds || []);

    // Step 2: fetch metadata headers for a wider slice so older emails in the
    // period aren't dropped just because many recent ones match the query.
    const candidates = listData.messages.slice(0, 80);
    const metaResults = await Promise.all(candidates.map(m =>
        fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            { headers: { Authorization: 'Bearer ' + _googleAccessToken } }
        ).then(r => r.json())
    ));

    // Step 3: rank candidates by how "expense-y" their headers look, then take top N.
    // Without ranking, wide date ranges get swamped by marketing emails that also
    // contain "fatura"/"débito" in the subject — actual bills get pushed out.
    const getHeader = (msg, name) => (msg.payload?.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    const scoreCandidate = (msg) => {
        const subj = getHeader(msg, 'Subject').toLowerCase();
        const from = getHeader(msg, 'From').toLowerCase();
        let s = 0;
        const strong = ['débito', 'debito', 'recibo', 'pagamento', 'fatura', 'factura', 'cobran', 'aviso de pagamento', 'mbway', 'multibanco', 'sepa', 'direct debit', 'compra confirmada', 'order confirmation', 'receipt'];
        if (strong.some(w => subj.includes(w))) s += 3;
        if (/\d+[.,]\d{2}/.test(subj)) s += 3; // amount-like pattern in subject
        if (/€|\beur\b|\bvalor\b|\bmontante\b|\btotal\b/i.test(subj)) s += 1;
        const billers = ['edp', 'galp', 'vodafone', 'meo', 'altice', 'nowo', ' nos ', 'nos.pt', 'netflix', 'spotify', 'amazon', 'apple', 'seguro', 'fidelidade', 'tranquilidade', 'ageas', 'allianz', 'revolut', 'paypal', 'wise', 'santander', 'millennium', 'bpi', 'cgd', 'novobanco', 'montepio', 'activobank', 'beliani', 'ctt', 'worten', 'lidl', 'continente', 'pingo doce', 'auchan', 'ikea', 'ginasio', 'fitness'];
        if (billers.some(b => from.includes(b) || subj.includes(b))) s += 2;
        const noise = ['newsletter', 'webinar', 'promo', 'desconto', 'super preço', 'oferta exclusiva', 'poupa já', 'black friday', 'não perca'];
        if (noise.some(n => subj.includes(n))) s -= 2;
        return s;
    };
    const relevant = metaResults
        .filter(m => m.id && !seenIds.has(m.id) && isProbablyPaymentEmail(getHeader(m, 'Subject'), getHeader(m, 'From')))
        .map(m => ({ m, score: scoreCandidate(m) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 25)
        .map(x => x.m);

    if (!relevant.length) return [];

    // Step 4: fetch full content only for relevant emails
    const msgs = await Promise.all(relevant.map(m =>
        fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
            { headers: { Authorization: 'Bearer ' + _googleAccessToken } }
        ).then(r => r.json())
    ));
    return msgs;
}

// Base64url → string. Gmail wraps lines; atob handles that fine.
function decodeBase64Url(data) {
    try { return atob(data.replace(/-/g, '+').replace(/_/g, '/')); } catch { return ''; }
}

// Walks all parts and collects text. Returns the text/plain variant when available —
// HTML parts from rich senders (EDP, telco) are mostly CSS/markup and drown out the
// real content when we only look at the first 900 chars.
function findPartByMime(payload, mime) {
    if (!payload) return null;
    if (payload.mimeType === mime && payload.body?.data) return payload;
    if (payload.parts) {
        for (const p of payload.parts) {
            const found = findPartByMime(p, mime);
            if (found) return found;
        }
    }
    return null;
}

function decodeEmailBody(payload) {
    const plain = findPartByMime(payload, 'text/plain');
    if (plain) return decodeBase64Url(plain.body.data);
    const html = findPartByMime(payload, 'text/html');
    if (html) return decodeBase64Url(html.body.data);
    if (payload?.body?.data) return decodeBase64Url(payload.body.data);
    return '';
}

function emailToText(msg) {
    const headers = msg.payload?.headers || [];
    const get = n => headers.find(h => h.name.toLowerCase() === n.toLowerCase())?.value || '';
    // Strip style/script contents (not just tags) before removing the remaining tags —
    // otherwise inline CSS fills the first 900 chars of HTML-only emails.
    let body = decodeEmailBody(msg.payload || {})
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&euro;/g, '€')
        .replace(/&#8364;/g, '€')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1200);
    return `ID:${msg.id}\nAssunto: ${get('Subject')}\nDe: ${get('From')}\nData: ${get('Date')}\n${body}`;
}

async function callGeminiOnce(prompt) {
    // Try primary model first, fall back to lite variant
    const models = ['gemini-2.0-flash-lite', 'gemini-2.0-flash'];
    let lastErr = null;
    for (const model of models) {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiCfg.geminiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
                })
            }
        );
        const data = await res.json();
        if (!data.error) return data;
        const msg = data.error.message || '';
        lastErr = msg;
        // If rate-limited on this model, try next; if quota exhausted stop early
        if (msg.toLowerCase().includes('quota') && !msg.toLowerCase().includes('per minute')) {
            throw new Error('Quota diária esgotada. A chave Gemini tem um limite gratuito por dia. Tenta novamente amanhã.');
        }
        // Per-minute rate limit: wait and retry same model
        if (res.status === 429 || msg.includes('429')) {
            const retryMatch = msg.match(/retry in ([\d.]+)s/i);
            const wait = retryMatch ? parseFloat(retryMatch[1]) * 1000 + 1000 : 65000;
            const statusEl = document.getElementById('ai-sync-status');
            if (statusEl) statusEl.textContent = `Limite por minuto atingido. A aguardar ${Math.round(wait/1000)}s...`;
            await new Promise(r => setTimeout(r, wait));
            // Retry same model after wait
            const res2 = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiCfg.geminiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
                    })
                }
            );
            const data2 = await res2.json();
            if (!data2.error) return data2;
            lastErr = data2.error.message || '';
        }
        // Model not available — try next model
    }
    throw new Error(lastErr || 'Erro Gemini');
}

// Generic call for OpenAI-compatible providers (xAI/Grok, Groq).
// Returns the parsed response body or throws with a provider-prefixed message.
async function callOpenAICompatibleOnce(label, url, key, model, prompt) {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + key
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 2000
        })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.error?.message || data?.error || res.statusText || `Erro ${label}`;
        if (res.status === 401) throw new Error(`Chave ${label} inválida (401)`);
        if (res.status === 429) throw new Error(`${label}: limite de pedidos atingido. Tenta em breve.`);
        throw new Error(`${label}: ${msg}`);
    }
    return data;
}

function callGrokOnce(prompt) {
    return callOpenAICompatibleOnce('Grok', 'https://api.x.ai/v1/chat/completions', aiCfg.grokKey, aiCfg.grokModel || 'grok-4-fast', prompt);
}
function callGroqOnce(prompt) {
    return callOpenAICompatibleOnce('Groq', 'https://api.groq.com/openai/v1/chat/completions', aiCfg.groqKey, aiCfg.groqModel || 'llama-3.3-70b-versatile', prompt);
}
function callMistralOnce(prompt) {
    return callOpenAICompatibleOnce('Mistral', 'https://api.mistral.ai/v1/chat/completions', aiCfg.mistralKey, aiCfg.mistralModel || 'mistral-small-latest', prompt);
}

const CATEGORY_HINTS_BLOCK = `Categorias possíveis e merchants típicos (usa a mais específica):
- supermercado: Auchan, Mercadona, Lidl, Continente, Pingo Doce, Intermarché, Aldi, Minipreço, Jumbo
- restaurantes: McDonalds, Burger King, KFC, Starbucks, Pizza Hut, Uber Eats, Glovo, BOLT Food, restaurantes locais
- alimentacao: talhos, padarias, mercearias
- transportes: Carris, Metro, CP, Comboios, Uber, Bolt, Cabify, Via Verde, Ascendi, parques de estacionamento
- combustivel: Galp, BP, Repsol, Cepsa, Prio, Intermarché combustível
- saude: hospitais, clínicas, análises, dentista, fisioterapia, Luz Saúde, Lusíadas
- farmacia: Farmácia, Wells, Holon
- educacao: colégios, universidades, cursos, livros, material escolar
- roupa: Zara, H&M, Mango, Primark, Nike, Adidas, Pull&Bear, Bershka, Decathlon (para roupa)
- casa: prestação casa, hipoteca, renda, manutenção habitação, IKEA, bricomarché
- contas: EDP, Galp Gás, Águas, IMI, seguros (Fidelidade, Tranquilidade, Ageas, Allianz, Zurich), manutenção conta bancária, impostos
- telecomunicacoes: Vodafone, NOS, MEO, Altice, Nowo, internet, telefone
- lazer: cinemas, teatros, concertos, eventos, jogos, ginásios
- beleza: cabeleireiros, estética, cosmética, Sephora
- subscricoes: Netflix, Spotify, Apple (iCloud/Music), Amazon Prime, HBO, Disney+, YouTube Premium, ChatGPT, jornais digitais
- presentes: (quando claramente identificável como presente)
- outros: tudo o resto (incluindo transferências MBway/IPS para pessoas sem contexto claro)`;

const EMAIL_EXTRACT_PROMPT = (texts) => `Extrai despesas/pagamentos destes emails em Português de Portugal. Inclui:
- Débitos em conta (bancos, MB Way, SEPA)
- Faturas emitidas a pagar (EDP, Galp, Vodafone, NOS, MEO, seguros, rendas, ginásios, etc.) — conta a despesa quando a fatura chega
- Compras online / cartão
- Subscrições renovadas (Netflix, Spotify, etc.)

Ignora apenas: transferências entre contas próprias, depósitos/créditos recebidos, publicidade/promoções sem valor concreto, newsletters, notificações de saldo, emails de marketing.

Para cada despesa devolve um objeto JSON com TODOS os campos que conseguires identificar (usa null quando não está claro). Estabelecimentos como EDP, Galp, Vodafone, MEO, NOS, EPAL, Águas, costumam trazer NIF, IVA, ATCUD e período — extrai-os.

Schema completo:
{
  "id": "valor após 'ID:' no email, se existir",
  "description": "empresa/serviço curto (ex: 'EDP', 'Netflix')",
  "amount": numero em euros,
  "date": "YYYY-MM-DD (débito > vencimento > emissão)",
  "category": "id da lista de categorias",
  "merchant": "nome do estabelecimento se diferente da description",
  "isRecurring": true|false,            // verdadeiro para utilities/subscrições mensais
  "fixedHint": true|false,              // verdadeiro se claramente é factura recorrente que valeria a pena ser fixa
  "atcud": "código ATCUD se presente" | null,
  "docNumber": "nº de fatura/ref. ex: 'FT 2024/12345'" | null,
  "sellerNif": "NIF do vendedor (9 dígitos)" | null,
  "buyerNif": "NIF na fatura (9 dígitos) se aparece" | null,
  "vatBase": numero | null,
  "vatAmount": numero | null,
  "vatRate": 6|13|23 | null,
  "paymentMethod": "cartao"|"mbway"|"dinheiro"|"transferencia"|"debito-direto"|"cheque"|"outro"|null,
  "documentType": "fatura"|"fatura-recibo"|"recibo"|"nota-credito"|null,
  "purchaseChannel": "online"|"fisico"|"telefone"|"recorrente"|null,
  "utility": {                          // só preencher para EDP/Galp/águas/gás/telecom
    "tipo": "eletricidade"|"agua"|"gas"|"telecom"|null,
    "periodoInicio": "YYYY-MM-DD"|null,
    "periodoFim": "YYYY-MM-DD"|null,
    "consumoKwh": numero|null,
    "consumoM3": numero|null,
    "potenciaKva": numero|null,
    "tarifa": "simples"|"bi-horaria"|"tri-horaria"|null
  } | null
}

${CATEGORY_HINTS_BLOCK}
${ownContactsPromptBlock()}
Responde APENAS com um JSON array (sem texto antes/depois, sem markdown).
Se um email não tem despesa, omite-o. Se nenhum tem, responde [].

EMAILS:
${texts.join('\n===\n')}`;

function extractJsonArray(text) {
    const m = (text || '').match(/\[[\s\S]*?\]/);
    if (!m) return [];
    try { return JSON.parse(m[0]); } catch { return []; }
}

// Returns the user's "own contacts" list as trimmed lowercase tokens.
// Used to skip self-transfers (MBway/IPS to the user's own numbers, their own
// name, their bank account references) that would otherwise be imported as
// expenses.
function getOwnContactTokens() {
    return (aiCfg.ownContacts || '')
        .split(/[\n,;]+/)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length >= 3);
}

function descriptionMatchesOwnContact(description) {
    const tokens = getOwnContactTokens();
    if (!tokens.length) return false;
    const d = (description || '').toLowerCase();
    return tokens.some(t => {
        if (d.includes(t)) return true;
        // Wildcard: "932XXX720" matches "932000720" etc.
        if (/[x*]/i.test(t)) {
            try {
                const re = new RegExp(t.replace(/[xX*]+/g, '\\d*'));
                return re.test(d);
            } catch { return false; }
        }
        return false;
    });
}

function ownContactsPromptBlock() {
    const tokens = getOwnContactTokens();
    if (!tokens.length) return '';
    return `\nATENÇÃO — IGNORA qualquer movimento cuja descrição contenha um destes identificadores (são contas/contactos do próprio utilizador, transferências para si mesmo):\n${tokens.map(t => `- ${t}`).join('\n')}\n`;
}

// Dispatcher: routes to whichever provider is configured.
async function callAI(emailTexts) {
    if (!emailTexts.length) return [];
    const prompt = EMAIL_EXTRACT_PROMPT(emailTexts);
    // Reuse the unified dispatcher so Gmail sync respects the same
    // provider-preference + automatic fallback as every other AI feature.
    // If the preferred provider runs out of quota, the next one takes over.
    const raw = await callAIText(prompt);
    return extractJsonArray(raw);
}

// Kept as an alias for any older callers.
const callGemini = callAI;

async function runSync(fromDate, toDate) {
    const btn = document.getElementById('ai-sync-btn');
    const status = document.getElementById('ai-sync-status');
    const setStatus = t => { if (status) status.textContent = t; };
    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A sincronizar...'; }
        if (!_googleAccessToken) {
            setStatus('A autenticar no Google...');
            window._pendingSyncAfterAuth = true;
            signInGoogle();
            return;
        }
        setStatus('A procurar emails relevantes...');
        const msgs = await fetchGmailForPeriod(fromDate, toDate);
        if (!msgs.length) {
            setStatus('Nenhum email de pagamento novo encontrado.');
            showToast('Sem emails novos');
            // Still update lastSyncDate so auto-sync doesn't retry today
            aiCfg.lastSyncDate = new Date().toISOString().slice(0, 10);
            localStorage.setItem(AI_CFG_KEY, JSON.stringify(aiCfg));
            return;
        }
        const providerLabel = aiCfg.aiProvider === 'grok' ? 'Grok' : aiCfg.aiProvider === 'groq' ? 'Groq' : 'Gemini';
        setStatus(`A analisar ${msgs.length} email(s) — 1 pedido ${providerLabel}...`);
        const texts = msgs.map(emailToText);
        const extracted = await callAI(texts);

        // Mark these email IDs as seen (so we never re-analyse them)
        const seenIds = new Set(aiCfg.analyzedEmailIds || []);
        msgs.forEach(m => seenIds.add(m.id));
        // Keep at most 500 IDs to avoid bloating localStorage
        aiCfg.analyzedEmailIds = [...seenIds].slice(-500);

        if (!extracted.length) {
            setStatus('Nenhuma despesa encontrada nos emails analisados.');
            showToast('Sem despesas detetadas');
            aiCfg.lastSyncDate = new Date().toISOString().slice(0, 10);
            localStorage.setItem(AI_CFG_KEY, JSON.stringify(aiCfg));
            return;
        }
        // Deduplicate against existing pending + filter out self-transfers
        const newItems = extracted
            .filter(e => e.amount > 0 && e.date)
            .filter(e => !descriptionMatchesOwnContact(e.description))
            .map(({ id: _gemId, ...e }) => ({ id: generateId(), ...e, syncedAt: new Date().toISOString() }))
            .filter(e => !pendingExpenses.some(p => p.description === e.description && p.amount === e.amount && p.date === e.date));
        pendingExpenses = [...pendingExpenses, ...newItems];
        localStorage.setItem(PENDING_KEY, JSON.stringify(pendingExpenses));
        aiCfg.lastSyncDate = new Date().toISOString().slice(0, 10);
        localStorage.setItem(AI_CFG_KEY, JSON.stringify(aiCfg));
        setStatus(`✓ ${newItems.length} despesa(s) nova(s) aguardam aprovação.`);
        showToast(newItems.length ? `${newItems.length} despesas para aprovar!` : 'Sem despesas novas');
        renderPendingExpenses();
        renderAiSettingsUI();
    } catch (e) {
        setStatus('⚠ ' + e.message);
        showToast('Erro: ' + e.message.slice(0, 60));
        if (e.message.includes('401') || e.message.includes('403')) { _googleAccessToken = null; renderAiSettingsUI(); }
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync"></i> Sincronizar agora'; }
    }
}

function triggerManualSync() {
    const fromVal = document.getElementById('ai-sync-from')?.value;
    const toVal = document.getElementById('ai-sync-to')?.value;
    const from = fromVal ? new Date(fromVal + 'T00:00:00') : new Date();
    const to = toVal ? new Date(toVal + 'T23:59:59') : new Date();
    runSync(from, to);
}

function formatDateInput(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Populates the email-sync "De / Até" pickers with the last `days` days, inclusive of today.
function setSyncRange(days) {
    const to = new Date();
    const from = new Date(); from.setDate(from.getDate() - (days - 1));
    const fromEl = document.getElementById('ai-sync-from');
    const toEl = document.getElementById('ai-sync-to');
    if (fromEl) fromEl.value = formatDateInput(from);
    if (toEl) toEl.value = formatDateInput(to);
}

// Current ISO week (Monday to Sunday).
function setSyncRangeThisWeek() {
    const today = new Date();
    const dow = today.getDay() || 7; // Monday=1..Sunday=7
    const monday = new Date(today); monday.setDate(today.getDate() - (dow - 1));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const fromEl = document.getElementById('ai-sync-from');
    const toEl = document.getElementById('ai-sync-to');
    if (fromEl) fromEl.value = formatDateInput(monday);
    if (toEl) toEl.value = formatDateInput(sunday);
}

function setSyncRangeLastWeek() {
    const today = new Date();
    const dow = today.getDay() || 7;
    const thisMonday = new Date(today); thisMonday.setDate(today.getDate() - (dow - 1));
    const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(lastMonday); lastSunday.setDate(lastMonday.getDate() + 6);
    const fromEl = document.getElementById('ai-sync-from');
    const toEl = document.getElementById('ai-sync-to');
    if (fromEl) fromEl.value = formatDateInput(lastMonday);
    if (toEl) toEl.value = formatDateInput(lastSunday);
}

function clearAnalyzedEmailCache() {
    aiCfg.analyzedEmailIds = [];
    aiCfg.lastSyncDate = null;
    localStorage.setItem(AI_CFG_KEY, JSON.stringify(aiCfg));
    const statusEl = document.getElementById('ai-sync-status');
    if (statusEl) statusEl.textContent = 'Cache limpo. Próxima sincronização reanalisará todos os emails.';
    renderAiSettingsUI();
    showToast('Cache de emails limpo');
}

function checkAutoSync() {
    const hasKey = aiCfg.aiProvider === 'grok' ? !!aiCfg.grokKey
        : aiCfg.aiProvider === 'groq' ? !!aiCfg.groqKey
        : !!aiCfg.geminiKey;
    if (!aiCfg.autoSync || !hasKey) return;
    const today = new Date().toISOString().slice(0, 10);
    if (aiCfg.lastSyncDate === today) return;
    const from = aiCfg.lastSyncDate ? new Date(aiCfg.lastSyncDate) : new Date(Date.now() - 86400000);
    const to = new Date();
    setTimeout(() => runSync(from, to), 3000);
}

// ===== PDF BANK STATEMENT SYNC =====
async function waitForPdfLib(timeoutMs = 8000) {
    const start = Date.now();
    while (!window.pdfjsLib && Date.now() - start < timeoutMs) {
        await new Promise(r => setTimeout(r, 200));
    }
    if (!window.pdfjsLib) throw new Error('Biblioteca PDF não carregou. Verifica ligação à internet e tenta de novo.');
}

async function extractPdfText(file) {
    await waitForPdfLib();
    const buf = await file.arrayBuffer();
    let pdf;
    try {
        pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    } catch (e) {
        throw new Error('Não consegui abrir o PDF: ' + (e.message || e));
    }
    const chunks = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // Preserve line breaks where text items jump to a new Y position.
        let prevY = null;
        const line = [];
        const out = [];
        for (const it of content.items) {
            const y = it.transform?.[5];
            if (prevY !== null && Math.abs(y - prevY) > 3) {
                out.push(line.join(' '));
                line.length = 0;
            }
            line.push(it.str);
            prevY = y;
        }
        if (line.length) out.push(line.join(' '));
        chunks.push(out.join('\n'));
    }
    return chunks.join('\n\n');
}

const PDF_EXTRACT_PROMPT = (text) => `Este é texto extraído de um extrato bancário português (CGD, Moey/Crédito Agrícola, Millennium, Novobanco, BPI, Santander, Revolut, etc.). Extrai TODAS as despesas (débitos / saídas de dinheiro) em euros.

CONVENÇÕES DE SINAL (importante):
- O sinal pode aparecer ANTES do valor (-500,00) ou APÓS (8,87 - ou 107,20 -). Ambos significam DÉBITO (saída).
- Um "+" ou ausência de sinal significa CRÉDITO (entrada) — IGNORA.
- Colunas IN/OUT ou Montante negativo = débito.

DATAS:
- Converte DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY para YYYY-MM-DD.
- Se houver duas datas por linha (ex: "data lançamento / data valor"), usa a PRIMEIRA (data de lançamento).

DESCRIÇÕES — limpa e simplifica:
- "COMPRA NETFLIX.COMAMS 7199756" → "Netflix"
- "COMPRA AUCHAN SANTO T 7199756" → "Auchan"
- "COMPRA MERCADONAPORTO 7199756" → "Mercadona"
- "DD-16010014760143-EDP COMERC" → "EDP"
- "DD-00000371733-Decada Vig" → "Decada Vig"
- "Trf imediata JAIME SOUSA DIAS" → "Transferência Jaime Sousa Dias"
- "COBRANCA PRESTACAO" → "Prestação casa"
- "FIDELIDADE COMPANHI" → "Fidelidade"
- "MANUT CONTA PACOTE CA" → "Manutenção conta"
- "COMPRA APPLE.COM/BILL" → "Apple"
- "Trf MB WAY 935519758" → "MBway"

INCLUI:
- Débitos diretos (DD-...): prestações, seguros, rendas, telecomunicações, energia, subscrições.
- COMPRA / purchases com cartão.
- Trf MBway, IPS para terceiros (sinal negativo).
- Levantamentos ATM, comissões bancárias, manutenção de conta, imposto selo.

IGNORA:
- Entradas com sinal "+" (salário, reembolsos, transferências recebidas, IPS recebidos).
- Transferências entre contas próprias do utilizador.
- Linhas de saldo, cabeçalho, totais, rodapé do banco.

Para cada despesa devolve:
- description: curta e clara (ver exemplos acima)
- amount: valor em euros (número POSITIVO sempre, ex: 612.36)
- date: YYYY-MM-DD
- category: (ver lista abaixo)

${CATEGORY_HINTS_BLOCK}
${ownContactsPromptBlock()}
Responde APENAS com um JSON array (sem markdown, sem texto antes/depois, sem backticks).
Se nenhum movimento for despesa, responde [].

EXTRATO:
${text}`;

async function callAIForPdf(text) {
    // Unified dispatcher: same provider-preference + automatic fallback as
    // the rest of the app. If Gemini free tier runs out, Mistral/Groq/Grok
    // take over without the user having to reconfigure anything.
    const prompt = PDF_EXTRACT_PROMPT(text);
    const raw = await callAIText(prompt);
    return extractJsonArray(raw);
}

async function handlePdfSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = ''; // allow re-selecting same file
    const status = document.getElementById('ai-pdf-status');
    const setStatus = t => { if (status) status.textContent = t; };
    try {
        setStatus(`A ler ${file.name}...`);
        const text = await extractPdfText(file);
        if (!text || text.length < 50) { setStatus('Nao consegui extrair texto do PDF (pode ser uma imagem).'); return; }
        const providerLabel = aiCfg.aiProvider === 'grok' ? 'Grok' : aiCfg.aiProvider === 'groq' ? 'Groq' : 'Gemini';
        setStatus(`Texto extraído (${text.length} caracteres). A analisar com ${providerLabel}...`);
        const extracted = await callAIForPdf(text);
        if (!extracted.length) { setStatus('Nenhuma despesa detetada no extrato.'); showToast('Sem despesas detetadas'); return; }
        const newItems = extracted
            .filter(e => e.amount > 0 && e.date && e.description)
            .filter(e => !descriptionMatchesOwnContact(e.description))
            .map(e => ({ id: generateId(), ...e, syncedAt: new Date().toISOString(), source: 'pdf' }))
            // Dedup: against pending AND already-approved expenses with same date+amount+description
            .filter(e => !pendingExpenses.some(p => p.description === e.description && Math.abs(p.amount - e.amount) < 0.01 && p.date === e.date))
            .filter(e => !expenses.some(x => Math.abs(x.amount - e.amount) < 0.01 && x.date === e.date && (x.description || '').toLowerCase().slice(0, 10) === (e.description || '').toLowerCase().slice(0, 10)));
        if (!newItems.length) {
            setStatus(`${extracted.length} despesa(s) detetada(s) mas todas já existiam.`);
            showToast('Sem novidades');
            return;
        }
        pendingExpenses = [...pendingExpenses, ...newItems];
        localStorage.setItem(PENDING_KEY, JSON.stringify(pendingExpenses));
        setStatus(`✓ ${newItems.length} despesa(s) nova(s) aguardam aprovação (de ${extracted.length} detetadas).`);
        showToast(`${newItems.length} despesas para aprovar!`);
        renderPendingExpenses();
    } catch (e) {
        console.error('PDF sync error', e);
        const msg = e.message || String(e);
        setStatus('⚠ ' + msg);
        showToast('Erro: ' + msg.slice(0, 80));
    }
}

function renderPendingExpenses() {
    const section = document.getElementById('pending-expenses-section');
    const list = document.getElementById('pending-expenses-list');
    const badge = document.getElementById('pending-count-badge');
    if (badge) badge.textContent = pendingExpenses.length || '';
    if (!section || !list) return;
    if (!pendingExpenses.length) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    const groupBtn = document.getElementById('pending-group-btn');
    if (groupBtn) {
        const clusters = findGroupableClusters();
        groupBtn.style.display = clusters.length ? '' : 'none';
        if (clusters.length) {
            const totalItems = clusters.reduce((s, c) => s + c.items.length, 0);
            groupBtn.title = `${clusters.length} grupo(s), ${totalItems} itens similares`;
        }
    }
    const cats = getEffectiveCategories();
    const confColor = c => c === 'high' ? 'var(--success)' : c === 'medium' ? '#FF8F00' : 'var(--danger)';

    // Group by category so similar items (all supermarket, all telco) show together
    const groups = {};
    pendingExpenses.forEach(e => {
        const key = e.category || 'outros';
        (groups[key] = groups[key] || []).push(e);
    });
    const groupOrder = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

    const renderItem = (e) => {
        const cat = cats[e.category] || cats.outros;
        const match = findMatchingFixedForPending(e);
        // When there's no exact fixed match but the AI flagged this email
        // as a recurring bill (EDP, MEO, água…), surface a purple "Promover"
        // chip instead of the small icon-only button so the user notices.
        const fixedHint = !match && (e.fixedHint || e.isRecurring);
        const matchBtn = match
            ? `<button onclick="approvePendingAsFixedMatch('${e.id}','${match.id}')" title="Encaixar em ${match.description} (fixa)" style="background:#E3F2FD;color:#1565C0;border:none;border-radius:8px;padding:6px 9px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;gap:4px;font-size:0.7rem"><i class="fas fa-link"></i> ${match.description.slice(0, 10)}</button>`
            : fixedHint
                ? `<button onclick="approvePendingAsFixed('${e.id}')" title="Esta parece uma fatura recorrente — promover a fixa" style="background:#EEE7FF;color:#5A3BD8;border:1px solid #B9A4F0;border-radius:8px;padding:6px 9px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;gap:4px;font-size:0.7rem"><i class="fas fa-rotate"></i> Fixa?</button>`
                : `<button onclick="approvePendingAsFixed('${e.id}')" title="Promover a despesa fixa" style="background:#EDE7F6;color:var(--primary);border:none;border-radius:8px;padding:6px 9px;cursor:pointer;flex-shrink:0"><i class="fas fa-rotate"></i></button>`;
        return `<div style="background:white;border-radius:10px;padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
                <div style="width:30px;height:30px;border-radius:8px;background:#EDE7F6;display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0;font-size:0.8rem"><i class="fas ${cat.icon}"></i></div>
                <div style="flex:1;min-width:0">
                    <div style="font-size:0.83rem;font-weight:600">${e.description}${e.merchant && e.merchant !== e.description ? ` <span style="font-weight:400;color:var(--text-light);font-size:0.75rem">(${e.merchant})</span>` : ''}</div>
                    <div style="font-size:0.7rem;color:var(--text-light)">${e.date}${e.confidence ? ` &middot; <span style="color:${confColor(e.confidence)}">${e.confidence === 'high' ? 'alta' : e.confidence === 'medium' ? 'media' : 'baixa'} conf.</span>` : ''}${fixedHint ? ' &middot; <span style="color:#5A3BD8;font-weight:600">recorrente</span>' : ''}</div>
                </div>
                <div style="font-size:0.85rem;font-weight:700;color:var(--danger);white-space:nowrap">-${formatCurrency(e.amount)}</div>
            </div>
            <div style="display:flex;gap:4px;margin-left:auto">
                <button onclick="editPending('${e.id}')" title="Ver/editar detalhes" style="background:#FFF3E0;color:#E65100;border:none;border-radius:8px;padding:6px 9px;cursor:pointer"><i class="fas fa-pen"></i></button>
                ${matchBtn}
                <button onclick="approvePending('${e.id}')" title="Aprovar como despesa única" style="background:var(--success);color:white;border:none;border-radius:8px;padding:6px 9px;cursor:pointer"><i class="fas fa-check"></i></button>
                <button onclick="dismissPending('${e.id}')" title="Descartar" style="background:#F5F5F5;color:#999;border:none;border-radius:8px;padding:6px 9px;cursor:pointer"><i class="fas fa-times"></i></button>
            </div>
        </div>`;
    };

    list.innerHTML = groupOrder.map(catKey => {
        const cat = cats[catKey] || cats.outros;
        const items = groups[catKey];
        const total = items.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        return `<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding:0 4px">
                <span style="font-size:0.72rem;font-weight:700;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px"><i class="fas ${cat.icon}" style="color:var(--primary);margin-right:4px"></i> ${cat.label} · ${items.length}</span>
                <span style="font-size:0.75rem;color:var(--text-light);font-weight:600">-${formatCurrency(total)}</span>
            </div>
            ${items.map(renderItem).join('')}
        </div>`;
    }).join('');
}

// Opens the fixed-expense modal pre-filled from a pending item. When saved,
// removes the item from the pending list so it doesn't also appear as a
// one-off expense.
// Looks for a fixed expense that likely corresponds to this pending item.
// Heuristics (kept conservative so we only offer the shortcut on confident
// matches; the user can always approve as one-off if we miss):
//   - Active for the pending item's month (startDate <= month <= endDate)
//   - Description keyword overlap (shared token >= 3 chars) OR same brand
//     token on both sides (EDP, Meo, Nos, Vodafone…)
//   - Amount within ±40 % of the fixed's default (utilities vary a lot
//     month to month, rent doesn't, same threshold works for both).
function findMatchingFixedForPending(p) {
    if (!p || !p.date) return null;
    const monthKey = p.date.slice(0, 7);
    const pDesc = (p.description || '').toLowerCase();
    const pMerchant = (p.merchant || '').toLowerCase();
    const pTokens = new Set([pDesc, pMerchant].join(' ').toLowerCase().split(/\W+/).filter(t => t.length >= 3));
    if (!pTokens.size) return null;
    return fixedExpenses.find(f => {
        if (f.startDate && f.startDate > monthKey) return false;
        if (f.endDate && f.endDate < monthKey) return false;
        const fDesc = (f.description || '').toLowerCase();
        const fTokens = fDesc.split(/\W+/).filter(t => t.length >= 3);
        if (!fTokens.length) return false;
        const shared = fTokens.find(t => pTokens.has(t));
        if (!shared) return false;
        const base = parseFloat(f.amount) || 0;
        const pct = base > 0 ? Math.abs(parseFloat(p.amount) - base) / base : 0;
        return pct <= 0.4; // 40 % tolerance absorbs utility variability
    }) || null;
}

// Marks the matched fixed as paid for the pending item's month using the
// actual billed amount (so the amount override reflects reality), then
// drops the pending item. Avoids the user ending up with both a fixed and
// a one-off for the same bill.
function approvePendingAsFixedMatch(pendingId, fixedId) {
    const p = pendingExpenses.find(x => x.id === pendingId);
    const f = fixedExpenses.find(x => x.id === fixedId);
    if (!p || !f) return;
    const monthKey = (p.date || '').slice(0, 7) || getFixedMonthKey(new Date());
    const idx = fixedStatus.findIndex(s => s.fixedId === fixedId && s.month === monthKey);
    const entry = {
        fixedId,
        month: monthKey,
        status: 'paid',
        amount: parseFloat(p.amount),
        updatedAt: new Date().toISOString()
    };
    if (idx >= 0) fixedStatus[idx] = { ...fixedStatus[idx], ...entry }; else fixedStatus.push(entry);
    pendingExpenses = pendingExpenses.filter(x => x.id !== pendingId);
    saveData();
    localStorage.setItem(PENDING_KEY, JSON.stringify(pendingExpenses));
    renderPendingExpenses();
    updateAll();
    showToast(`${f.description} marcada como paga em ${monthKey}`);
}

// Opens the normal expense modal pre-filled from a pending item so the
// user can tweak anything (amount, category, description, notes, fiscal)
// before approving. We drop the pending entry on a successful save via
// _pendingApprovedFromId set here + picked up in saveExpense.
function editPending(id) {
    const e = pendingExpenses.find(x => x.id === id);
    if (!e) return;
    showAddExpense();
    setTimeout(() => {
        document.getElementById('expense-desc').value = e.description || '';
        document.getElementById('expense-amount').value = parseFloat(e.amount) || '';
        if (e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date)) document.getElementById('expense-date').value = e.date;
        const catSel = document.getElementById('expense-category');
        const cats = getEffectiveCategories();
        if (catSel && e.category && cats[e.category]) catSel.value = e.category;
        const notesEl = document.getElementById('expense-notes');
        if (notesEl && e.merchant && e.merchant !== e.description) notesEl.value = `Via: ${e.merchant}`;
        applyFiscalFieldsContext();
    }, 120);
    window._pendingApprovedFromId = id;
}

function approvePendingAsFixed(id) {
    const e = pendingExpenses.find(x => x.id === id);
    if (!e) return;
    const d = new Date(e.date);
    const day = isNaN(d) ? 1 : d.getDate();
    const monthKey = isNaN(d)
        ? (new Date()).toISOString().slice(0, 7)
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    populateCategorySelects();
    populateFixedTypeOptions();
    document.getElementById('fixed-modal-title').textContent = 'Nova Despesa Fixa';
    document.getElementById('fixed-id').value = '';
    document.getElementById('fixed-form').reset();
    document.getElementById('fixed-desc').value = e.description || '';
    document.getElementById('fixed-amount').value = parseFloat(e.amount).toFixed(2);
    document.getElementById('fixed-day').value = day;
    document.getElementById('fixed-start').value = monthKey;
    const catSel = document.getElementById('fixed-category');
    if (catSel) catSel.value = e.category || 'outros';
    const splitGroup = document.getElementById('fixed-split-group');
    if (splitGroup) splitGroup.style.display = 'none';
    // Stash the pending id so saveFixed can drop it after persisting
    window._pendingPromotedToFixed = id;
    document.getElementById('fixed-modal').classList.add('active');
}

function approvePending(id) {
    const e = pendingExpenses.find(x => x.id === id);
    if (!e) return;
    // Carry every fiscal/utility field the email AI managed to extract
    // into the saved expense. The new fields are all optional on the
    // expense object so missing ones harmlessly resolve to null.
    expenses.push({
        id: generateId(),
        description: e.description,
        amount: parseFloat(e.amount),
        date: e.date,
        category: e.category || 'outros',
        type: 'personal',
        split: false,
        notes: e.merchant ? 'Via: ' + e.merchant : '',
        sellerNif:       e.sellerNif || null,
        buyerNif:        e.buyerNif || null,
        vatBase:         typeof e.vatBase === 'number' ? e.vatBase : null,
        vatAmount:       typeof e.vatAmount === 'number' ? e.vatAmount : null,
        vatRate:         [6,13,23].includes(e.vatRate) ? e.vatRate : null,
        paymentMethod:   e.paymentMethod || null,
        documentType:    e.documentType || null,
        atcud:           e.atcud || null,
        docNumber:       e.docNumber || null,
        purchaseChannel: e.purchaseChannel || 'online',
        utility:         e.utility && e.utility.tipo ? e.utility : null,
        createdAt: new Date().toISOString()
    });
    pendingExpenses = pendingExpenses.filter(x => x.id !== id);
    saveData();
    localStorage.setItem(PENDING_KEY, JSON.stringify(pendingExpenses));
    renderPendingExpenses();
    updateAll();
    showToast('Despesa aprovada!');
}

function dismissPending(id) {
    pendingExpenses = pendingExpenses.filter(x => x.id !== id);
    localStorage.setItem(PENDING_KEY, JSON.stringify(pendingExpenses));
    renderPendingExpenses();
}

// First non-trivial word of a description, lowercased. Used to cluster
// similar transactions (e.g. all MBway lines) so they can be merged.
function pendingGroupKey(desc) {
    if (!desc) return '';
    const words = desc
        .replace(/[^A-Za-zÀ-ÿ0-9 ]+/g, ' ')
        .split(/\s+/)
        .map(w => w.toLowerCase())
        .filter(w => w.length >= 3 && !['para', 'com', 'pelo', 'pela', 'transf', 'transferencia', 'transferência', 'trf'].includes(w));
    return words[0] || desc.trim().toLowerCase();
}

// Scans current pending items and returns a list of groups of 2+ items that
// share a normalized description prefix inside the same calendar month.
function findGroupableClusters() {
    const clusters = new Map();
    for (const e of pendingExpenses) {
        const key = pendingGroupKey(e.description);
        if (!key || !e.date) continue;
        const month = e.date.slice(0, 7);
        const k = `${key}|${month}`;
        if (!clusters.has(k)) clusters.set(k, { key, month, items: [] });
        clusters.get(k).items.push(e);
    }
    return [...clusters.values()].filter(c => c.items.length >= 2);
}

// Merges each cluster into a single pending item ("MBway · 5 movimentos — Mar 2026")
// summing the amounts, keeping the most common category, and tagging it so
// the list shows it's a roll-up.
function groupSimilarPending() {
    const clusters = findGroupableClusters();
    if (!clusters.length) { showToast('Nada para agrupar'); return; }
    const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const toRemoveIds = new Set();
    const merged = [];
    for (const c of clusters) {
        const labelBase = (c.items[0].description.match(/^[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?/) || [c.key])[0];
        // Most common category among the items
        const catCounts = {};
        c.items.forEach(i => { catCounts[i.category || 'outros'] = (catCounts[i.category || 'outros'] || 0) + 1; });
        const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0][0];
        const total = c.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
        const [y, m] = c.month.split('-').map(Number);
        // Use the latest date in the cluster so it lands in the same month
        const latestDate = c.items.map(i => i.date).sort().slice(-1)[0];
        merged.push({
            id: generateId(),
            description: `${labelBase} · ${c.items.length} movimentos — ${monthNames[m - 1]} ${y}`,
            amount: Math.round(total * 100) / 100,
            date: latestDate,
            category: topCat,
            syncedAt: new Date().toISOString(),
            source: 'grouped',
            groupedCount: c.items.length
        });
        c.items.forEach(i => toRemoveIds.add(i.id));
    }
    pendingExpenses = pendingExpenses.filter(e => !toRemoveIds.has(e.id)).concat(merged);
    localStorage.setItem(PENDING_KEY, JSON.stringify(pendingExpenses));
    renderPendingExpenses();
    showToast(`${merged.length} grupo(s) criado(s) (${toRemoveIds.size} → ${merged.length})`);
}

function approveAllPending() {
    [...pendingExpenses].forEach(e => {
        expenses.push({
            id: generateId(),
            description: e.description,
            amount: parseFloat(e.amount),
            date: e.date,
            category: e.category || 'outros',
            type: 'personal',
            split: false,
            notes: e.merchant ? 'Via: ' + e.merchant : '',
            createdAt: new Date().toISOString()
        });
    });
    pendingExpenses = [];
    saveData();
    localStorage.setItem(PENDING_KEY, JSON.stringify(pendingExpenses));
    renderPendingExpenses();
    updateAll();
    showToast('Todas aprovadas!');
}

function dismissAllPending() {
    pendingExpenses = [];
    localStorage.setItem(PENDING_KEY, JSON.stringify(pendingExpenses));
    renderPendingExpenses();
}

// ===== CATEGORY DONUT CHART =====
function renderCategoryDonut() {
    const container = document.getElementById('category-donut-container');
    if (!container) return;
    const allExp = getEffectiveMonthExpenses(currentDate).filter(e => !e.isFixedExpense);
    const fixedExp = getActiveFixedForMonth(currentDate)
        .filter(f => !isFixedSkipped(f.id, currentDate))
        .map(f => ({ category: f.category, amount: getEffectiveFixedAmount(f, currentDate) }));
    const all = [...allExp.map(e => ({ category: e.category, amount: e.amount })), ...fixedExp];
    if (!all.length) {
        container.innerHTML = `<div class="donut-empty"><i class="fas fa-chart-pie"></i><p>Sem despesas este mês</p></div>`;
        return;
    }

    const cats = getEffectiveCategories();
    const totals = {};
    all.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const grandTotal = sorted.reduce((s, [, v]) => s + v, 0);

    const COLORS = ['#6C5CE7','#fd79a8','#fdcb6e','#00cec9','#e17055','#74b9ff','#a29bfe','#55efc4'];

    // SVG donut using stroke-dasharray / stroke-dashoffset
    const R = 45, circumference = 2 * Math.PI * R;
    let cumPct = 0;
    const segs = sorted.map(([cat, val], i) => {
        const pct = val / grandTotal;
        const dash = pct * circumference;
        const dashOffset = circumference * (1 - cumPct);
        cumPct += pct;
        return `<circle cx="55" cy="55" r="${R}" fill="none" stroke="${COLORS[i % COLORS.length]}" stroke-width="18" stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}" stroke-dashoffset="${dashOffset.toFixed(2)}"/>`;
    });

    const legend = sorted.map(([cat, val], i) => {
        const label = cats[cat]?.label || cat;
        const pct = ((val / grandTotal) * 100).toFixed(0);
        return `<div class="donut-legend-item">
            <div class="donut-legend-dot" style="background:${COLORS[i % COLORS.length]}"></div>
            <span class="donut-legend-label">${label}</span>
            <span class="donut-legend-pct">${pct}%</span>
        </div>`;
    }).join('');

    container.innerHTML = `
        <div class="donut-title"><i class="fas fa-chart-pie" style="color:var(--primary)"></i> Despesas por Categoria</div>
        <div class="donut-wrapper">
            <div class="donut-chart-container">
                <svg class="donut-svg" viewBox="0 0 110 110" style="transform:rotate(-90deg)">
                    <circle cx="55" cy="55" r="${R}" fill="none" stroke="var(--border)" stroke-width="18"/>
                    ${segs.join('')}
                </svg>
                <div class="donut-center-label">
                    <div class="donut-center-value">${formatCurrency(grandTotal)}</div>
                    <div class="donut-center-sub">total</div>
                </div>
            </div>
            <div class="donut-legend">${legend}</div>
        </div>
    `;
}

// ===== SALARY CYCLE =====
function renderSalaryCycle() {
    const card = document.getElementById('salary-cycle-card');
    if (!card || !isSalaryConfigured()) { if (card) card.style.display = 'none'; return; }

    const today = new Date();
    const viewYear = currentDate.getFullYear();
    const viewMonth = currentDate.getMonth();
    const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

    // Pick the cycle that matches the month currently being viewed.
    // On the current month we show the cycle containing today; otherwise the
    // cycle that starts in the viewed month.
    let cycle;
    if (isCurrentMonth) {
        cycle = getSalaryCycleAt(today) || getSalaryCycleForMonth(viewYear, viewMonth);
    } else {
        cycle = getSalaryCycleForMonth(viewYear, viewMonth);
    }
    if (!cycle) { card.style.display = 'none'; return; }
    const cycleStart = cycle.start;
    const cycleEnd = cycle.end;

    const cycleContainsToday = today >= cycleStart && today <= cycleEnd;
    const refDate = cycleContainsToday ? today : cycleEnd;
    const daysLeft = cycleContainsToday ? Math.max(0, Math.round((cycleEnd - today) / 86400000)) : 0;

    // Period label \u2014 use the real cycle boundaries (may vary per month when
    // salaryMode is "last-working-day" or "working-day-after").
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const periodLabel = `${cycleStart.getDate()} ${months[cycleStart.getMonth()]} \u2192 ${cycleEnd.getDate()} ${months[cycleEnd.getMonth()]}`;

    const b = getSalaryCycleBreakdown(cycleStart, cycleEnd, refDate);
    const spentSinceSalary = b.expPaid;
    const cycleFixed = b.expPending;
    const salaryIncome = b.incReceived;

    // Money committed to savings goals during this cycle. Treated as
    // already-spent for the cycle balance + projection (same accounting
    // as expense outflows). Range is the cycle, not the calendar month,
    // because cycles often span two months.
    const cycleSavings = Math.max(0, getGoalsContributionInRange(cycleStart, cycleEnd));

    const totalBudget = salaryIncome || (spentSinceSalary + cycleFixed + 500);
    const available = totalBudget - spentSinceSalary - cycleFixed - cycleSavings;
    const usedPct = totalBudget > 0 ? Math.min(100, ((spentSinceSalary + cycleFixed + cycleSavings) / totalBudget) * 100) : 0;

    // Day counters — for past/future cycles show the whole cycle as "done"
    const daysTotal = Math.max(1, Math.round((cycleEnd - cycleStart) / 86400000) + 1);
    const daysElapsed = cycleContainsToday
        ? Math.max(1, Math.min(daysTotal, Math.round((today - cycleStart) / 86400000) + 1))
        : daysTotal;

    // Daily spending rate (variable only — fixed doesn't reflect daily behaviour)
    const dailyVarRate = daysElapsed > 0 ? b.expPaidVariable / daysElapsed : 0;
    const projectedVar = dailyVarRate * daysLeft;
    const projectedEndBalance = (b.incReceived + b.incPending) - (b.expPaid + b.expPending + projectedVar + cycleSavings);

    // Top category within the cycle
    const topCat = Object.entries(b.expByCategory).sort((a, b) => b[1] - a[1])[0];
    const cats = getEffectiveCategories();

    card.style.display = 'block';
    document.getElementById('salary-cycle-period').textContent = periodLabel;
    const daysEl = document.getElementById('salary-cycle-days');
    if (daysEl) {
        if (cycleContainsToday) {
            daysEl.textContent = daysLeft + ' dias restantes';
        } else if (today > cycleEnd) {
            daysEl.textContent = 'ciclo fechado';
        } else {
            daysEl.textContent = 'ciclo futuro';
        }
    }
    const dayCountEl = document.getElementById('salary-cycle-daycount');
    if (dayCountEl) dayCountEl.textContent = cycleContainsToday ? `Dia ${daysElapsed}/${daysTotal}` : `${daysTotal} dias`;

    animateNumber(document.getElementById('salary-received'), b.incReceived);
    const recPendEl = document.getElementById('salary-received-pending');
    if (recPendEl) recPendEl.textContent = b.incPending > 0 ? `+ ${formatCurrency(b.incPending)} por receber` : '';

    animateNumber(document.getElementById('salary-spent'), spentSinceSalary);
    const rateEl = document.getElementById('salary-spent-rate');
    // Daily budget = what's left in the cycle / days remaining. This is
    // the reference point for the "X% acima/abaixo do orçamento" tag —
    // it tells the user whether they're spending faster than they can
    // sustain until the next salary. We expose the comparison explicitly
    // ("ritmo X/dia vs orçamento Y/dia") so the user knows where the
    // percentage comes from.
    const dailyBudget = (cycleContainsToday && daysLeft > 0) ? (available / daysLeft) : 0;
    if (rateEl) {
        if (b.expPaidVariable > 0 && dailyBudget > 0) {
            const diffPct = Math.round((dailyVarRate - dailyBudget) / dailyBudget * 100);
            const over = diffPct > 10;
            const under = diffPct < -10;
            const tag = over ? ` · ${diffPct}% acima` : under ? ` · ${Math.abs(diffPct)}% abaixo` : ' · no orçamento';
            rateEl.textContent = `${formatCurrency(dailyVarRate)}/dia (orç. ${formatCurrency(dailyBudget)})${tag}`;
            rateEl.title = `Comparado com o orçamento diário (Disponível ÷ ${daysLeft} dias restantes)`;
            rateEl.style.color = over ? 'var(--danger)' : under ? 'var(--success)' : '';
        } else if (b.expPaidVariable > 0) {
            rateEl.textContent = `${formatCurrency(dailyVarRate)}/dia`;
            rateEl.style.color = '';
        } else {
            rateEl.textContent = '';
        }
    }

    animateNumber(document.getElementById('salary-fixed'), cycleFixed);
    // Surface overdue pendentes inline next to the Cativo label so the user
    // immediately sees what portion of the figure is items already past their
    // scheduled day but still unreconciled — those used to vanish silently.
    const overdueEl = document.getElementById('salary-fixed-overdue');
    if (overdueEl) {
        if (b.expPendingOverdue > 0) {
            overdueEl.style.display = '';
            overdueEl.innerHTML = `<i class="fas fa-triangle-exclamation"></i> ${formatCurrency(b.expPendingOverdue).replace(' EUR', ' €')} em atraso`;
            overdueEl.title = 'Despesas fixas pendentes cuja data já passou. Marca como pagas se já saíram da conta.';
        } else {
            overdueEl.style.display = 'none';
            overdueEl.innerHTML = '';
        }
    }
    animateNumber(document.getElementById('salary-available'), available, formatCurrency, 700);
    document.getElementById('salary-available').style.color = available >= 0 ? 'var(--success)' : 'var(--danger)';

    // Daily budget row — only meaningful inside the current cycle with days left.
    const budgetRow = document.getElementById('salary-daily-budget-row');
    const budgetEl = document.getElementById('salary-daily-budget');
    const budgetHintEl = document.getElementById('salary-daily-budget-hint');
    if (budgetRow && budgetEl) {
        if (cycleContainsToday && daysLeft > 0 && available > 0) {
            budgetRow.style.display = 'flex';
            budgetEl.textContent = `${formatCurrency(dailyBudget)}/dia`;
            const isOver = dailyVarRate > dailyBudget * 1.1;
            const isUnder = dailyBudget > 0 && dailyVarRate > 0 && dailyVarRate < dailyBudget * 0.9;
            budgetEl.style.color = isOver ? 'var(--danger)' : isUnder ? 'var(--success)' : 'var(--warning)';
            if (budgetHintEl) budgetHintEl.textContent = `nos próximos ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`;
        } else if (cycleContainsToday && daysLeft > 0 && available <= 0) {
            budgetRow.style.display = 'flex';
            budgetEl.textContent = '0 €/dia';
            budgetEl.style.color = 'var(--danger)';
            if (budgetHintEl) budgetHintEl.textContent = 'orçamento esgotado';
        } else {
            budgetRow.style.display = 'none';
        }
    }
    const fill = document.getElementById('salary-progress-fill');
    if (fill) {
        fill.style.width = usedPct + '%';
        fill.style.background = usedPct > 90 ? 'var(--danger)' : usedPct > 70 ? 'var(--warning)' : 'var(--success)';
    }

    // Footer: projection (current cycle) or closed balance (past) + top category.
    const footer = document.getElementById('salary-cycle-footer');
    const hasTop = !!topCat;
    const projLabelEl = document.getElementById('salary-projection-label');
    const projEl = document.getElementById('salary-projection');
    const cycleIsPast = today > cycleEnd;
    const cycleIsFuture = today < cycleStart;
    let showProjection = false;
    if (cycleContainsToday && b.expPaidVariable > 0 && daysLeft > 0) {
        if (projLabelEl) projLabelEl.textContent = 'Ao ritmo atual';
        if (projEl) {
            const sign = projectedEndBalance >= 0 ? '+' : '';
            const color = projectedEndBalance >= 0 ? '#69f0ae' : '#ff9f9f';
            // Range projection: optimistic uses 0.7× current rate, pessimistic
            // uses 1.3× — gives the user a quick sense of best/worst case
            // alongside the central estimate.
            const optimisticVar = dailyVarRate * 0.7 * daysLeft;
            const pessimisticVar = dailyVarRate * 1.3 * daysLeft;
            const incTotal = b.incReceived + b.incPending;
            const fixedTotal = b.expPaid + b.expPending;
            const optimistic = incTotal - fixedTotal - optimisticVar;
            const pessimistic = incTotal - fixedTotal - pessimisticVar;
            projEl.innerHTML = `<span style="font-weight:700">${sign}${formatCurrency(projectedEndBalance)}</span><span style="font-size:0.7em;opacity:0.85;margin-left:4px">(${formatCurrency(pessimistic)}…${formatCurrency(optimistic)})</span>`;
            projEl.style.color = color;
        }
        showProjection = true;
    } else if (cycleIsPast) {
        // Past cycle: show the closed balance (income received minus all expenses in-cycle).
        const closed = b.incReceived - b.expPaid;
        if (projLabelEl) projLabelEl.textContent = 'Saldo do ciclo';
        if (projEl) {
            const sign = closed >= 0 ? '+' : '';
            const color = closed >= 0 ? '#69f0ae' : '#ff9f9f';
            projEl.textContent = `${sign}${formatCurrency(closed)}`;
            projEl.style.color = color;
        }
        showProjection = true;
    } else if (cycleIsFuture) {
        if (projLabelEl) projLabelEl.textContent = 'Ciclo ainda não iniciado';
        if (projEl) { projEl.textContent = '—'; projEl.style.color = ''; }
        showProjection = true;
    }
    if (footer) {
        footer.style.display = (showProjection || hasTop) ? 'flex' : 'none';
    }
    const topRow = document.getElementById('salary-topcat-row');
    if (topRow) topRow.style.display = hasTop ? 'flex' : 'none';
    if (hasTop) {
        const topEl = document.getElementById('salary-topcat');
        const cat = cats[topCat[0]];
        if (topEl) topEl.textContent = `${cat?.label || topCat[0]} · ${formatCurrency(topCat[1])}`;
    }
    const aiScenarioRow = document.getElementById('ai-scenario-row');
    if (aiScenarioRow) aiScenarioRow.style.display = (hasAnyAiKey() && cycleContainsToday) ? 'block' : 'none';
}

// ===== APP LOCK (biometric + PIN) =====
const LOCK_KEY = 'app_lock_v1';

function getLockCfg() {
    try { return JSON.parse(localStorage.getItem(LOCK_KEY) || '{}'); } catch { return {}; }
}
function setLockCfg(patch) {
    const next = { ...getLockCfg(), ...patch };
    localStorage.setItem(LOCK_KEY, JSON.stringify(next));
    return next;
}

function b64urlEncode(buf) {
    const bytes = new Uint8Array(buf);
    let str = '';
    bytes.forEach(b => str += String.fromCharCode(b));
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
    str = (str || '').replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const bin = atob(str);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
}

async function hashPin(pin) {
    const buf = new TextEncoder().encode('despesas:v1:' + pin);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return b64urlEncode(hash);
}

function isBiometricSupported() {
    return !!(window.PublicKeyCredential && window.isSecureContext && navigator.credentials);
}

async function setupBiometricLock() {
    if (!isBiometricSupported()) { showToast('Este dispositivo/navegador não suporta biometria'); return false; }
    try {
        const userId = crypto.getRandomValues(new Uint8Array(16));
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const credential = await navigator.credentials.create({
            publicKey: {
                challenge,
                rp: { name: 'Despesas', id: location.hostname },
                user: { id: userId, name: 'user@despesas', displayName: getUserName() || 'Utilizador' },
                pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
                // residentKey: 'discouraged' + requireResidentKey: false keeps
                // this as a classic non-discoverable WebAuthn credential, so
                // iOS doesn't wrap the unlock in the passkey sheet ("Usar
                // chave-passe?") — it goes straight to Face ID / Touch ID.
                authenticatorSelection: {
                    authenticatorAttachment: 'platform',
                    userVerification: 'required',
                    residentKey: 'discouraged',
                    requireResidentKey: false
                },
                timeout: 60000,
                attestation: 'none'
            }
        });
        setLockCfg({ enabled: true, biometricId: b64urlEncode(credential.rawId), autoLockMs: getLockCfg().autoLockMs || 30000, credVersion: 2 });
        showToast('Biometria ativada');
        renderSecuritySettingsUI();
        return true;
    } catch (e) {
        console.warn('Biometric setup failed:', e);
        showToast(`Não foi possível ativar: ${e?.message || 'erro'}`);
        return false;
    }
}

async function verifyBiometric() {
    const cfg = getLockCfg();
    if (!cfg.biometricId) return false;
    try {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        await navigator.credentials.get({
            publicKey: {
                challenge,
                rpId: location.hostname,
                allowCredentials: [{ type: 'public-key', id: b64urlDecode(cfg.biometricId) }],
                userVerification: 'required',
                timeout: 60000
            }
        });
        return true;
    } catch {
        return false;
    }
}

async function setupPinLock() {
    const pin = prompt('Escolhe um PIN de 4 a 6 dígitos:');
    if (pin == null) return false;
    if (!/^\d{4,6}$/.test(pin)) { showToast('PIN inválido — só dígitos, 4 a 6'); return false; }
    const confirmPin = prompt('Confirma o PIN:');
    if (pin !== confirmPin) { showToast('PINs não coincidem'); return false; }
    const hash = await hashPin(pin);
    setLockCfg({ enabled: true, pinHash: hash });
    showToast('PIN ativado');
    renderSecuritySettingsUI();
    return true;
}

async function verifyPin(pin) {
    const cfg = getLockCfg();
    if (!cfg.pinHash) return false;
    const hash = await hashPin(pin);
    return hash === cfg.pinHash;
}

function disablePinOnly() {
    setLockCfg({ pinHash: null });
    const cfg = getLockCfg();
    if (!cfg.biometricId && !cfg.pinHash) { localStorage.removeItem(LOCK_KEY); hideLockScreen(); }
    showToast('PIN removido');
    renderSecuritySettingsUI();
}

function disableBiometricOnly() {
    setLockCfg({ biometricId: null });
    const cfg = getLockCfg();
    if (!cfg.biometricId && !cfg.pinHash) { localStorage.removeItem(LOCK_KEY); hideLockScreen(); }
    showToast('Biometria removida');
    renderSecuritySettingsUI();
}

function ensureLockOverlay() {
    let overlay = document.getElementById('app-lock-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'app-lock-overlay';
    overlay.innerHTML = `
        <div class="app-lock-inner">
            <div class="app-lock-icon"><i class="fas fa-lock"></i></div>
            <div class="app-lock-title">App bloqueada</div>
            <div class="app-lock-sub">Toca em qualquer sítio para desbloquear</div>
            <button id="app-lock-bio" class="btn btn-primary btn-block"><i class="fas fa-fingerprint"></i> Desbloquear</button>
            <div id="app-lock-pin-row" style="margin-top:12px;display:none">
                <input type="password" id="app-lock-pin" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="PIN" autocomplete="off">
                <button id="app-lock-pin-btn" class="btn btn-block" style="margin-top:6px">Entrar</button>
            </div>
            <button id="app-lock-use-pin" class="btn btn-ghost" style="margin-top:10px">Usar PIN</button>
            <div id="app-lock-status" class="app-lock-status"></div>
        </div>
    `;
    document.body.appendChild(overlay);
    // Any tap on the overlay (outside the PIN input or "use PIN" link)
    // counts as a gesture and triggers biometric. Removes the need to aim
    // at the small button on iOS where the cold-start gesture lock forces
    // one initial tap anyway.
    overlay.addEventListener('click', async (ev) => {
        if (ev.target.closest('#app-lock-pin-row') || ev.target.closest('#app-lock-use-pin')) return;
        const cfg = getLockCfg();
        if (!cfg.biometricId) return;
        const ok = await verifyBiometric();
        if (ok) unlockApp();
        else overlay.querySelector('#app-lock-status').textContent = 'Não foi possível verificar';
    });
    overlay.querySelector('#app-lock-use-pin').onclick = () => {
        overlay.querySelector('#app-lock-pin-row').style.display = 'block';
        overlay.querySelector('#app-lock-pin').focus();
    };
    const pinSubmit = async () => {
        const pin = overlay.querySelector('#app-lock-pin').value;
        if (await verifyPin(pin)) unlockApp();
        else {
            overlay.querySelector('#app-lock-status').textContent = 'PIN incorreto';
            overlay.querySelector('#app-lock-pin').value = '';
        }
    };
    overlay.querySelector('#app-lock-pin-btn').onclick = pinSubmit;
    overlay.querySelector('#app-lock-pin').addEventListener('keydown', ev => { if (ev.key === 'Enter') pinSubmit(); });
    return overlay;
}

function showLockScreen() {
    const cfg = getLockCfg();
    const overlay = ensureLockOverlay();
    overlay.style.display = 'flex';
    overlay.querySelector('#app-lock-bio').style.display = cfg.biometricId ? '' : 'none';
    overlay.querySelector('#app-lock-use-pin').style.display = cfg.pinHash ? '' : 'none';
    overlay.querySelector('#app-lock-pin-row').style.display = 'none';
    overlay.querySelector('#app-lock-pin').value = '';
    overlay.querySelector('#app-lock-status').textContent = '';
    if (!cfg.biometricId && cfg.pinHash) {
        overlay.querySelector('#app-lock-pin-row').style.display = 'block';
        setTimeout(() => overlay.querySelector('#app-lock-pin').focus(), 100);
    }

    // Try an immediate biometric prompt. iOS Safari usually blocks WebAuthn
    // without a gesture on cold start (throws NotAllowedError) — we swallow
    // the error silently and let the "tap anywhere to unlock" fallback kick
    // in. On Android / returns-from-background it sometimes works right away.
    if (cfg.biometricId) {
        setTimeout(async () => {
            try {
                const ok = await verifyBiometric();
                if (ok) unlockApp();
            } catch { /* needs user gesture — will fire on first tap */ }
        }, 50);
    }
}

function hideLockScreen() {
    const overlay = document.getElementById('app-lock-overlay');
    if (overlay) overlay.style.display = 'none';
}

function unlockApp() { hideLockScreen(); }

// Auto-lock on return from background past the configured grace period.
function installAppLockVisibilityHandler() {
    let backgroundTs = null;
    document.addEventListener('visibilitychange', () => {
        const cfg = getLockCfg();
        if (!cfg.enabled) return;
        if (document.visibilityState === 'hidden') backgroundTs = Date.now();
        else if (document.visibilityState === 'visible') {
            const away = backgroundTs ? (Date.now() - backgroundTs) : 0;
            if (away > (cfg.autoLockMs || 30000)) showLockScreen();
            backgroundTs = null;
        }
    });
}

function renderSecuritySettingsUI() {
    const cfg = getLockCfg();
    const bioBtn = document.getElementById('security-bio-btn');
    const pinBtn = document.getElementById('security-pin-btn');
    const autoSel = document.getElementById('security-autolock');
    const supported = isBiometricSupported();
    if (bioBtn) {
        if (!supported) {
            bioBtn.textContent = 'Biometria não suportada';
            bioBtn.disabled = true;
        } else if (cfg.biometricId) {
            bioBtn.innerHTML = '<i class="fas fa-check"></i> Biometria ativa — tocar para remover';
            bioBtn.onclick = disableBiometricOnly;
        } else {
            bioBtn.innerHTML = '<i class="fas fa-fingerprint"></i> Ativar Face ID / Touch ID';
            bioBtn.onclick = setupBiometricLock;
        }
    }
    if (pinBtn) {
        if (cfg.pinHash) {
            pinBtn.innerHTML = '<i class="fas fa-check"></i> PIN definido — tocar para remover';
            pinBtn.onclick = disablePinOnly;
        } else {
            pinBtn.innerHTML = '<i class="fas fa-key"></i> Definir PIN de fallback';
            pinBtn.onclick = setupPinLock;
        }
    }
    if (autoSel) {
        autoSel.value = String(cfg.autoLockMs || 30000);
        autoSel.onchange = () => setLockCfg({ autoLockMs: parseInt(autoSel.value) });
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    // Put up the lock overlay before anything else renders, so sensitive
    // data never flashes before the user authenticates.
    if (getLockCfg().enabled) showLockScreen();
    installAppLockVisibilityHandler();
    loadData();
    loadAiData();
    // Kick off a profile build on cold start. Runs async-ish against
    // localStorage-only data — fast enough to not block init.
    try { recomputeUserProfile(); } catch {}
    applyAppTitle();
    applyHouseholdMode();
    setDefaultDate();
    populateCategorySelects();
    populateExpenseTypeOptions();
    populateFixedTypeOptions();
    populateFilterTypes();
    initVariableExpensesState();
    updateAll();
    populateFilterCategories();
    buildIconPicker();
    buildColorPicker();
    initGoogleTokenClient();
    renderAiSettingsUI();
    renderPendingExpenses();
    checkAutoSync();
});

function populateCategorySelects() {
    const cats = getEffectiveCategories();
    const incCats = getEffectiveIncomeCategories();

    // Expense category selects
    ['expense-category', 'fixed-category'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const val = sel.value;
        sel.innerHTML = '<option value="">Selecionar...</option>';
        Object.entries(cats).forEach(([k, v]) => {
            sel.innerHTML += `<option value="${k}">${v.label}</option>`;
        });
        if (val) sel.value = val;
    });

    // Income category selects (regular + fixed income)
    ['income-category', 'fixed-income-category'].forEach(id => {
        const incSel = document.getElementById(id);
        if (!incSel) return;
        const val = incSel.value;
        incSel.innerHTML = '<option value="">Selecionar...</option>';
        Object.entries(incCats).forEach(([k, v]) => {
            incSel.innerHTML += `<option value="${k}">${v.label}</option>`;
        });
        if (val) incSel.value = val;
    });
}

function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    expenses = data ? JSON.parse(data) : [];
    const incData = localStorage.getItem(INCOME_KEY);
    incomes = incData ? JSON.parse(incData) : [];
    const fixData = localStorage.getItem(FIXED_KEY);
    fixedExpenses = fixData ? JSON.parse(fixData) : [];
    const fixSt = localStorage.getItem(FIXED_STATUS_KEY);
    fixedStatus = fixSt ? JSON.parse(fixSt) : [];
    const cc = localStorage.getItem(CUSTOM_CAT_KEY);
    customCategories = cc ? JSON.parse(cc) : [];
    const ci = localStorage.getItem(CUSTOM_INC_CAT_KEY);
    customIncCategories = ci ? JSON.parse(ci) : [];
    const chData = localStorage.getItem(CHILDREN_KEY);
    children = chData ? JSON.parse(chData) : [];
    const fiData = localStorage.getItem(FIXED_INCOME_KEY);
    fixedIncomes = fiData ? JSON.parse(fiData) : [];
    const fiSt = localStorage.getItem(FIXED_INCOME_STATUS_KEY);
    fixedIncomeStatus = fiSt ? JSON.parse(fiSt) : [];
    const tplData = localStorage.getItem(TEMPLATES_KEY);
    expenseTemplates = tplData ? JSON.parse(tplData) : [];
    const budData = localStorage.getItem(BUDGETS_KEY);
    categoryBudgets = budData ? JSON.parse(budData) : {};
    const prepaidData = localStorage.getItem(PREPAID_KEY);
    prepaidCards = prepaidData ? JSON.parse(prepaidData) : [];
    const goalsData = localStorage.getItem(GOALS_KEY);
    savingsGoals = goalsData ? JSON.parse(goalsData) : [];
    // Migrate legacy savedSoFar (single number) to a transactions ledger so
    // the new add/remove/history flow has something to work with.
    savingsGoals.forEach(g => {
        if (!Array.isArray(g.transactions)) {
            g.transactions = [];
            if (typeof g.savedSoFar === 'number' && g.savedSoFar > 0) {
                g.transactions.push({
                    id: generateId(), type: 'add', amount: g.savedSoFar,
                    date: (g.createdAt || new Date().toISOString()).slice(0, 10),
                    note: 'Saldo inicial (migrado)'
                });
            }
            delete g.savedSoFar;
        }
    });
    const netWorthData = localStorage.getItem(NETWORTH_KEY);
    netWorth = netWorthData ? JSON.parse(netWorthData) : { assets: [], liabilities: [], updatedAt: null };
    // Backfill missing top-up expenses. Cards created on older versions
    // pushed top-up transactions straight to the ledger without creating
    // the matching "Carregamento ..." expense — so the saldo never saw
    // the cash out. For each top-up that lacks an expense pair, create
    // one now and stamp the cross-references.
    try {
        const existingPair = new Set();
        expenses.forEach(e => { if (e.isPrepaidTopup && e.prepaidTxId) existingPair.add(e.prepaidTxId); });
        prepaidCards.forEach(card => {
            (card.transactions || []).forEach(t => {
                if (t.type !== 'topup') return;
                if (existingPair.has(t.id)) return;
                if (t.expenseId && expenses.find(e => e.id === t.expenseId && e.isPrepaidTopup)) return;
                const expenseId = generateId();
                expenses.push({
                    id: expenseId,
                    description: `Carregamento ${card.name}`,
                    amount: parseFloat(t.amount) || 0,
                    date: t.date || new Date().toISOString().slice(0, 10),
                    category: 'outros',
                    type: 'personal',
                    essential: true,
                    isPrepaidTopup: true,
                    prepaidCardId: card.id,
                    prepaidTxId: t.id,
                    notes: t.description && t.description !== 'Carregamento' ? t.description : '',
                    createdAt: new Date().toISOString()
                });
                t.expenseId = expenseId;
            });
        });
    } catch {}

    // Repair prepaid linkages corrupted by the legacy duplicateExpense bug
    // (or any historical state where the back-references drifted). The
    // editor resolves spends via the bidirectional "expense.prepaidTxId
    // === tx.id" link, so the data must be 1:1 in both directions or we
    // open the wrong expense.
    try {
        // 1) Drop expense pointers that don't match any tx (orphan links).
        const validTxIds = new Set();
        prepaidCards.forEach(c => (c.transactions || []).forEach(t => validTxIds.add(t.id)));
        // 2) Group expenses by prepaidTxId. Where N>1, clear all so we
        //    don't silently keep the wrong pairing — better orphaned and
        //    visible than wrongly linked.
        const byTx = new Map();
        expenses.forEach(e => {
            if (!e.prepaidTxId) return;
            if (!validTxIds.has(e.prepaidTxId)) {
                e.prepaidCardId = null; e.prepaidTxId = null; return;
            }
            if (!byTx.has(e.prepaidTxId)) byTx.set(e.prepaidTxId, []);
            byTx.get(e.prepaidTxId).push(e);
        });
        byTx.forEach((list) => {
            if (list.length > 1) list.forEach(e => { e.prepaidCardId = null; e.prepaidTxId = null; });
        });
        // 3) Re-stamp tx.expenseId from the surviving back-references so
        //    deleting a tx still finds and removes the matching expense.
        prepaidCards.forEach(c => (c.transactions || []).forEach(t => {
            const back = expenses.find(e => e.prepaidTxId === t.id);
            t.expenseId = back ? back.id : null;
        }));
    } catch {}
    // Migrate grouped expense entries to use stable `eid` (string id) so the
    // X button references a specific entry by identity, not by array index —
    // index-based removal could delete the wrong entry after sort/re-render.
    expenses.forEach(e => {
        if (e.isGrouped && Array.isArray(e.entries)) {
            e.entries.forEach(en => {
                if (!en.eid) en.eid = generateId();
            });
        }
    });
    const savedSalaryDay = localStorage.getItem('vanessa_salary_day');
    salaryDay = savedSalaryDay ? parseInt(savedSalaryDay) : null;
    const savedSalaryMode = localStorage.getItem('vanessa_salary_mode');
    salaryMode = savedSalaryMode || 'fixed-day';
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    localStorage.setItem(INCOME_KEY, JSON.stringify(incomes));
    localStorage.setItem(FIXED_KEY, JSON.stringify(fixedExpenses));
    localStorage.setItem(FIXED_STATUS_KEY, JSON.stringify(fixedStatus));
    localStorage.setItem(CUSTOM_CAT_KEY, JSON.stringify(customCategories));
    localStorage.setItem(CUSTOM_INC_CAT_KEY, JSON.stringify(customIncCategories));
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
    localStorage.setItem(FIXED_INCOME_KEY, JSON.stringify(fixedIncomes));
    localStorage.setItem(FIXED_INCOME_STATUS_KEY, JSON.stringify(fixedIncomeStatus));
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(expenseTemplates));
    localStorage.setItem(BUDGETS_KEY, JSON.stringify(categoryBudgets));
    localStorage.setItem(PREPAID_KEY, JSON.stringify(prepaidCards));
    localStorage.setItem(GOALS_KEY, JSON.stringify(savingsGoals));
    localStorage.setItem(NETWORTH_KEY, JSON.stringify(netWorth));
    // Best-effort: refresh the consumption profile after every save so AI
    // analyses reflect the latest habits on the next call.
    try { recomputeUserProfile(); } catch {}
}

// ===== EFFECTIVE CATEGORIES (default + custom) =====
function getEffectiveCategories() {
    const custom = {};
    customCategories.forEach(c => { custom[c.id] = { label: c.name, icon: c.icon, color: c.color, custom: true }; });
    return { ...CATEGORIES, ...custom };
}

function getEffectiveIncomeCategories() {
    const custom = {};
    customIncCategories.forEach(c => { custom[c.id] = { label: c.name, icon: c.icon, custom: true }; });
    // Dynamic co-parent payment categories
    const coParent = {};
    children.forEach(c => {
        coParent[`pag_${c.id}`] = { label: `Pagamento ${c.coParentName} (${c.name})`, icon: 'fa-hand-holding-dollar' };
    });
    // Include only pai_laura if any income still references it (backward compat, otherwise hidden)
    const hasLegacy = incomes.some(i => i.category === 'pai_laura');
    const legacy = hasLegacy ? { pai_laura: { label: 'Pagamento Pai Laura (legado)', icon: 'fa-hand-holding-dollar' } } : {};
    return { ...INCOME_CATEGORIES, ...legacy, ...coParent, ...custom };
}

// ===== FIXED EXPENSES HELPERS =====
function getFixedMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getActiveFixedForMonth(date) {
    const monthKey = getFixedMonthKey(date);
    const [y, m] = monthKey.split('-').map(Number);
    return fixedExpenses.filter(f => {
        const start = f.startDate; // YYYY-MM
        const end = f.endDate;     // YYYY-MM or null
        const afterStart = start <= monthKey;
        const beforeEnd = !end || end >= monthKey;
        return afterStart && beforeEnd;
    });
}

function getFixedStatusForMonth(fixedId, date) {
    const monthKey = getFixedMonthKey(date);
    return fixedStatus.find(s => s.fixedId === fixedId && s.month === monthKey);
}

// Returns effective status considering auto-pay when day of month has arrived
function getEffectiveFixedStatus(f, date) {
    const explicit = getFixedStatusForMonth(f.id, date);
    if (explicit) return explicit;
    const today = new Date();
    const isCurrentMonth = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    if (isCurrentMonth && today.getDate() >= f.dayOfMonth) {
        return { status: 'pago', auto: true };
    }
    return { status: 'pendente', auto: false };
}

function isFixedSkipped(fixedId, date) {
    const st = getFixedStatusForMonth(fixedId, date);
    return st?.status === 'ignorado';
}

function toggleSkipFixed(fixedId, date) {
    const monthKey = getFixedMonthKey(date);
    const idx = fixedStatus.findIndex(s => s.fixedId === fixedId && s.month === monthKey);
    const skipped = isFixedSkipped(fixedId, date);
    if (idx >= 0) {
        fixedStatus[idx].status = skipped ? 'pendente' : 'ignorado';
    } else {
        fixedStatus.push({ fixedId, month: monthKey, status: 'ignorado' });
    }
    saveData();
    updateAll();
}

// Returns effective amount for a fixed expense in a month (override if variable)
function getEffectiveFixedAmount(f, date) {
    const st = getFixedStatusForMonth(f.id, date);
    const base = st?.amount || f.amount;
    let effective = base;
    const splits = Array.isArray(f.splits) ? f.splits : null;
    if (splits && splits.length) {
        const paidArr = Array.isArray(st?.splitsPaid) ? st.splitsPaid : [];
        const deduction = splits.reduce((sum, s, i) => paidArr[i] ? sum + (parseFloat(s.amount) || 0) : sum, 0);
        effective = Math.max(0, effective - deduction);
    }
    // Mix-partner with the "Dividir" flag on: deduct her attributed share once
    // she pays back for the month. Spent-only ("Gastei") is a tag and leaves
    // the user's effective amount untouched.
    if (f.mixPartnerPct && f.mixPartnerName && f.mixPartnerSplit && st?.mixPartnerPaid) {
        const pct = parseFloat(f.mixPartnerPct) || 0;
        const deduction = base * (pct / 100);
        effective = Math.max(0, effective - deduction);
    }
    return effective;
}

// Flips the mix-partner "paid" state for this specific month of a fixed
// expense, stored on the fixedStatus record.
function toggleFixedMixPartnerPaid(fixedId, date) {
    const f = fixedExpenses.find(x => x.id === fixedId);
    if (!f || !f.mixPartnerPct || !f.mixPartnerSplit) return;
    const monthKey = getFixedMonthKey(date);
    let st = fixedStatus.find(s => s.fixedId === fixedId && s.month === monthKey);
    if (!st) {
        st = { fixedId, month: monthKey, status: 'pendente', mixPartnerPaid: false };
        fixedStatus.push(st);
    }
    st.mixPartnerPaid = !st.mixPartnerPaid;
    saveData();
    updateAll();
    showToast(st.mixPartnerPaid ? 'Parte recebida!' : 'Marcado por receber');
}

// Toggles whether a specific split on a fixed expense has paid its share for
// the given month. Lazily creates/updates a fixedStatus entry for that month.
function toggleFixedSplitPaid(fixedId, date, splitIndex) {
    const f = fixedExpenses.find(x => x.id === fixedId);
    if (!f || !Array.isArray(f.splits) || !f.splits[splitIndex]) return;
    const monthKey = getFixedMonthKey(date);
    let st = fixedStatus.find(s => s.fixedId === fixedId && s.month === monthKey);
    if (!st) {
        st = { fixedId, month: monthKey, status: 'pendente', splitsPaid: [] };
        fixedStatus.push(st);
    }
    const paid = Array.isArray(st.splitsPaid) ? [...st.splitsPaid] : [];
    while (paid.length <= splitIndex) paid.push(false);
    paid[splitIndex] = !paid[splitIndex];
    st.splitsPaid = paid;
    saveData();
    updateAll();
    showToast(paid[splitIndex] ? 'Pago!' : 'Marcado por receber');
}

// Read-only helper for the monthly display.
function getFixedSplitsPaidForMonth(f, date) {
    const st = getFixedStatusForMonth(f.id, date);
    return Array.isArray(st?.splitsPaid) ? st.splitsPaid : [];
}

function getFixedPendingTotal(date) {
    const active = getActiveFixedForMonth(date);
    return active
        .filter(f => {
            const st = getEffectiveFixedStatus(f, date).status;
            return st !== 'pago' && st !== 'ignorado';
        })
        .reduce((s, f) => s + getEffectiveFixedAmount(f, date), 0);
}

function markFixedPaid(fixedId, date, paid) {
    const monthKey = getFixedMonthKey(date);
    const idx = fixedStatus.findIndex(s => s.fixedId === fixedId && s.month === monthKey);
    if (idx >= 0) {
        fixedStatus[idx].status = paid ? 'pago' : 'pendente';
    } else {
        fixedStatus.push({ fixedId, month: monthKey, status: paid ? 'pago' : 'pendente' });
    }
    saveData();
    updateAll();
}

function markFixedCoParentPaid(fixedId, date, paidByCoParent) {
    const monthKey = getFixedMonthKey(date);
    const idx = fixedStatus.findIndex(s => s.fixedId === fixedId && s.month === monthKey);
    if (idx >= 0) {
        fixedStatus[idx].paidByFather = paidByCoParent;
    } else {
        fixedStatus.push({ fixedId, month: monthKey, status: 'pendente', paidByFather: paidByCoParent });
    }
    saveData();
    updateAll();
}

function editFixedAmount(fixedId, date) {
    const f = fixedExpenses.find(x => x.id === fixedId);
    if (!f) return;
    const current = getEffectiveFixedAmount(f, date);
    const input = prompt(`Valor real de "${f.description}" em ${getMonthLabel(date)} (estimativa: ${formatCurrency(f.amount)}):`, current.toFixed(2));
    if (input === null) return;
    const amount = parseFloat(input.replace(',', '.'));
    if (isNaN(amount) || amount < 0) { showToast('Valor invalido'); return; }
    const monthKey = getFixedMonthKey(date);
    const idx = fixedStatus.findIndex(s => s.fixedId === fixedId && s.month === monthKey);
    if (idx >= 0) {
        fixedStatus[idx].amount = amount;
    } else {
        const effSt = getEffectiveFixedStatus(f, date);
        fixedStatus.push({ fixedId, month: monthKey, status: effSt.status, amount });
    }
    saveData();
    updateAll();
    showToast('Valor atualizado!');
}

// ===== FIXED INCOME HELPERS =====
function getActiveFixedIncomesForMonth(date) {
    const monthKey = getFixedMonthKey(date);
    return fixedIncomes.filter(fi => {
        return fi.startDate <= monthKey && (!fi.endDate || fi.endDate >= monthKey);
    });
}

function getFixedIncomeStatusForMonth(fixedIncomeId, date) {
    const monthKey = getFixedMonthKey(date);
    return fixedIncomeStatus.find(s => s.fixedIncomeId === fixedIncomeId && s.month === monthKey);
}

// Returns the actual payment date for a fixed income in the given calendar
// month, honouring its paymentMode (fixed-day / last-working-day /
// working-day-after), same 3 modes as the global salary configuration.
function getFixedIncomePaymentDate(fi, year, month) {
    const mode = fi.paymentMode || 'fixed-day';
    if (mode === 'last-working-day') {
        const lastDay = new Date(year, month + 1, 0);
        return shiftBackwardToWorkingDay(lastDay);
    }
    const maxDay = new Date(year, month + 1, 0).getDate();
    const clampedDay = Math.min(fi.dayOfMonth || 1, maxDay);
    const target = new Date(year, month, clampedDay);
    if (mode === 'working-day-after') return shiftForwardToWorkingDay(target);
    return target;
}

function getEffectiveFixedIncomeStatus(fi, date) {
    const explicit = getFixedIncomeStatusForMonth(fi.id, date);
    if (explicit) return explicit;
    // If the user opted into manual marking, never auto-flip to "recebido" —
    // they have to confirm via the badge in the income tab.
    if (fi.manualMark) return { status: 'pendente', auto: false };
    const today = new Date();
    const isCurrentMonth = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    if (isCurrentMonth) {
        const payDate = getFixedIncomePaymentDate(fi, today.getFullYear(), today.getMonth());
        if (today >= payDate) return { status: 'recebido', auto: true };
    }
    return { status: 'pendente', auto: false };
}

function getEffectiveFixedIncomeAmount(fi, date) {
    const st = getFixedIncomeStatusForMonth(fi.id, date);
    return st?.amount || fi.amount;
}

function markFixedIncomePaid(fixedIncomeId, date, received) {
    const monthKey = getFixedMonthKey(date);
    const idx = fixedIncomeStatus.findIndex(s => s.fixedIncomeId === fixedIncomeId && s.month === monthKey);
    if (idx >= 0) {
        fixedIncomeStatus[idx].status = received ? 'recebido' : 'pendente';
    } else {
        fixedIncomeStatus.push({ fixedIncomeId, month: monthKey, status: received ? 'recebido' : 'pendente' });
    }
    saveData();
    updateAll();
}

function editFixedIncomeAmount(fixedIncomeId, date) {
    const fi = fixedIncomes.find(x => x.id === fixedIncomeId);
    if (!fi) return;
    const current = getEffectiveFixedIncomeAmount(fi, date);
    const input = prompt(`Valor real de "${fi.description}" em ${getMonthLabel(date)} (base: ${formatCurrency(fi.amount)}):`, current.toFixed(2));
    if (input === null) return;
    const amount = parseFloat(input.replace(',', '.'));
    if (isNaN(amount) || amount < 0) { showToast('Valor invalido'); return; }
    const monthKey = getFixedMonthKey(date);
    const idx = fixedIncomeStatus.findIndex(s => s.fixedIncomeId === fixedIncomeId && s.month === monthKey);
    if (idx >= 0) {
        fixedIncomeStatus[idx].amount = amount;
    } else {
        const effSt = getEffectiveFixedIncomeStatus(fi, date);
        fixedIncomeStatus.push({ fixedIncomeId, month: monthKey, status: effSt.status, amount });
    }
    saveData();
    updateAll();
    showToast('Valor atualizado!');
}

// ===== EFFECTIVE MONTH DATA (includes paid fixed) =====
function getPaidFixedAsExpenses(date) {
    const active = getActiveFixedForMonth(date);
    const monthKey = getFixedMonthKey(date);
    const [y, m] = monthKey.split('-').map(Number);
    return active
        .filter(f => getEffectiveFixedStatus(f, date).status === 'pago')
        .map(f => {
            const st = getFixedStatusForMonth(f.id, date);
            const fullAmount = getEffectiveFixedAmount(f, date);
            const paidByFather = st?.paidByFather || false;
            const child = children.find(c => c.id === f.type);
            const splitPct = getEffectiveSplitPct(f, child);
            const netAmount = (f.split && paidByFather) ? fullAmount * (1 - splitPct / 100) : fullAmount;
            const maxDay = new Date(y, m, 0).getDate();
            const day = Math.min(f.dayOfMonth, maxDay);
            return {
                id: `fixed_${f.id}_${monthKey}`,
                description: f.description,
                amount: netAmount,
                fullAmount,
                date: `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
                category: f.category,
                type: f.type || 'personal',
                split: f.split || false,
                paidByFather,
                essential: true,
                isFixedExpense: true,
                fixedId: f.id
            };
        });
}

// Resolve the split percentage to apply: per-expense override (if set in 1-99 range)
// otherwise falls back to the child's default splitPct.
function getEffectiveSplitPct(e, child) {
    const ov = parseFloat(e?.splitPctOverride);
    if (!isNaN(ov) && ov > 0 && ov < 100) return ov;
    return child?.splitPct || 50;
}

function adjustExpenseForCoParent(e) {
    // Generic split-with-other takes precedence — the user explicitly tagged a person.
    if (e.splitWithName) return adjustExpenseForCustomSplit(e);
    // In married mode: apply spouse split
    if (isMarriedMode()) {
        if (e.splitSpouse && e.spousePaid) {
            const pct = getSpousePct();
            const fullAmount = e.fullAmount || e.amount;
            return { ...e, amount: fullAmount * (1 - pct / 100), fullAmount, splitSpouse: true, spousePaid: true };
        }
        return e;
    }
    // Separated mode: apply co-parent split
    if (!e.split || !e.paidByFather) return e;
    const child = children.find(c => c.id === e.type);
    if (!child || child.hasSplit === false) return e;
    const fullAmount = e.fullAmount || e.amount;
    const pct = getEffectiveSplitPct(e, child);
    return { ...e, amount: fullAmount * (1 - pct / 100), fullAmount };
}

// Expand expense with splitAcrossChildren into N virtual expenses (one per child)
function expandSplitAcrossChildren(e) {
    if (!e.splitAcrossChildren || !Array.isArray(e.splitChildrenIds) || e.splitChildrenIds.length < 2) return [e];
    const ids = e.splitChildrenIds.filter(id => children.some(c => c.id === id));
    if (ids.length < 2) return [e];
    const perChild = e.amount / ids.length;
    return ids.map(childId => {
        const child = children.find(c => c.id === childId);
        return {
            ...e,
            id: `${e.id}_${childId}`,
            description: `${e.description} (${child.name})`,
            amount: perChild,
            fullAmount: perChild,
            type: childId,
            split: false,
            paidByFather: false,
            isSplitAcrossChildren: true,
            parentExpenseId: e.id
        };
    });
}

// Expands a mix-split expense (Pessoal + one child with %) into two virtuals so
// reports and totals can account for each side's category and split state.
// The list view still sees the original single expense and shows badges.
function expandMixPersonalChild(e) {
    if (!e.mixChildId || !e.mixChildPct) return [e];
    const pct = parseFloat(e.mixChildPct);
    if (!(pct > 0 && pct < 100)) return [e];
    const total = e.fullAmount || e.amount;
    const childPortion = Math.round(total * (pct / 100) * 100) / 100;
    const personalPortion = Math.round((total - childPortion) * 100) / 100;
    const base = (extra) => ({
        ...e,
        mixChildId: undefined,
        mixChildPct: undefined,
        mixChildSplitCoParent: undefined,
        mixChildPaidByFather: undefined,
        parentExpenseId: e.id,
        isFromMixSplit: true,
        ...extra
    });
    const personalVirtual = base({
        id: `${e.id}_mix_p`,
        amount: personalPortion,
        fullAmount: personalPortion,
        type: 'personal',
        split: false,
        paidByFather: false
    });
    const childVirtual = base({
        id: `${e.id}_mix_c`,
        amount: childPortion,
        fullAmount: childPortion,
        type: e.mixChildId,
        split: !!e.mixChildSplitCoParent,
        paidByFather: !!e.mixChildPaidByFather
    });
    // Apply co-parent split to the child virtual if needed.
    const childAdjusted = adjustExpenseForCoParent(childVirtual);
    return [personalVirtual, childAdjusted];
}

// Same idea as expandMixPersonalChild but for a partner (namorado/a) in
// separated mode. Splits the total into a "personal" virtual and a
// partner-tagged virtual. If the partner sub-split is enabled, the partner
// virtual carries a splits[] entry recording how much the partner owes/paid.
function expandMixPersonalPartner(e) {
    if (!e.mixPartnerPct || !e.mixPartnerName) return [e];
    const pct = parseFloat(e.mixPartnerPct);
    if (!(pct > 0 && pct < 100)) return [e];
    const total = e.fullAmount || e.amount;
    const partnerPortion = Math.round(total * (pct / 100) * 100) / 100;
    const personalPortion = Math.round((total - partnerPortion) * 100) / 100;
    const base = (extra) => ({
        ...e,
        mixPartnerPct: undefined,
        mixPartnerName: undefined,
        mixPartnerSplit: undefined,
        mixPartnerSplitPct: undefined,
        mixPartnerPaid: undefined,
        parentExpenseId: e.id,
        isFromMixPartner: true,
        ...extra
    });
    const personalVirtual = base({
        id: `${e.id}_mix_pp_personal`,
        amount: personalPortion,
        fullAmount: personalPortion,
        type: 'personal'
    });
    const partnerVirtual = base({
        id: `${e.id}_mix_pp_partner`,
        amount: partnerPortion,
        fullAmount: partnerPortion,
        type: 'personal',
        withPeople: [...(e.withPeople || []).filter(p => p.toLowerCase() !== e.mixPartnerName.toLowerCase()), e.mixPartnerName]
    });
    // Apply partner sub-split if enabled: attach a splits[] entry attributed
    // to the partner, so the normal adjust-for-splits logic deducts it when
    // marked paid.
    // Only the "Dividir" flag creates a debt that flows through the splits
    // mechanism (adjusting the virtual's amount when flagged paid). "Gastei"
    // alone is a tag — no amount adjustment.
    if (e.mixPartnerSplit) {
        const partnerShare = Math.round(partnerPortion * 100) / 100;
        partnerVirtual.splits = [{ name: e.mixPartnerName, amount: partnerShare, paid: !!e.mixPartnerPaid }];
    }
    const partnerAdjusted = adjustExpenseForCustomSplit(partnerVirtual);
    return [personalVirtual, partnerAdjusted];
}

function getEffectiveMonthExpenses(date) {
    const real = getMonthExpenses(date).map(adjustExpenseForCoParent);
    const withChildMix = real.flatMap(expandMixPersonalChild);
    const withPartnerMix = withChildMix.flatMap(expandMixPersonalPartner);
    const expanded = withPartnerMix.flatMap(expandSplitAcrossChildren);
    const paidFixed = getPaidFixedAsExpenses(date).flatMap(expandSplitAcrossChildren);
    return [...expanded, ...paidFixed];
}

function getPaidFixedIncomesAsIncome(date) {
    const active = getActiveFixedIncomesForMonth(date);
    const monthKey = getFixedMonthKey(date);
    const today = new Date();
    return active
        .filter(fi => getEffectiveFixedIncomeStatus(fi, date).status === 'recebido')
        .filter(fi => {
            // onlyOnDay = strict gating on the actual calendar date. If the
            // user marked it received early but opted into "Só contar no
            // saldo quando chegar o dia", hide it from balance until then.
            if (!fi.onlyOnDay) return true;
            const payDate = getFixedIncomePaymentDate(fi, date.getFullYear(), date.getMonth());
            return today >= payDate;
        })
        .map(fi => {
            const payDate = getFixedIncomePaymentDate(fi, date.getFullYear(), date.getMonth());
            return {
                id: `fixedinc_${fi.id}_${monthKey}`,
                description: fi.description,
                amount: getEffectiveFixedIncomeAmount(fi, date),
                date: toLocalDateStr(payDate),
                category: fi.category || 'ordenado',
                isFixedIncome: true,
                fixedIncomeId: fi.id
            };
        });
}

function getCarryOver(date) {
    const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    const prevInc = [...getMonthIncomes(prev), ...getPaidFixedIncomesAsIncome(prev)];
    const prevExp = [...getMonthExpenses(prev).map(adjustExpenseForCoParent), ...getPaidFixedAsExpenses(prev)];
    // Recursively include previous carry-over
    const prevCarry = getCarryOverStored(prev);
    const totalInc = prevInc.reduce((s, e) => s + e.amount, 0) + prevCarry;
    const totalExp = prevExp.reduce((s, e) => s + e.amount, 0);
    const balance = totalInc - totalExp;
    return Math.max(0, balance);
}

function getCarryOverStored(date) {
    const key = `vanessa_carryover_${date.getFullYear()}_${date.getMonth()}`;
    const stored = localStorage.getItem(key);
    if (stored !== null) return parseFloat(stored);
    // For current and future months, don't auto-calculate recursively (avoid infinite loop)
    return 0;
}

function saveCarryOver(date, amount) {
    const key = `vanessa_carryover_${date.getFullYear()}_${date.getMonth()}`;
    localStorage.setItem(key, amount.toString());
}

function recalcCarryOver() {
    // Calculate and save carry-over from previous month into current month
    const carryOver = getCarryOver(currentDate);
    saveCarryOver(currentDate, carryOver);
}

function getEffectiveMonthIncomes(date) {
    const base = [...getMonthIncomes(date), ...getPaidFixedIncomesAsIncome(date)];
    const carry = getCarryOverStored(date);
    if (carry > 0) {
        base.unshift({
            id: `carryover_${date.getFullYear()}_${date.getMonth()}`,
            description: 'Saldo transitado',
            amount: carry,
            date: `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-01`,
            category: 'transicao',
            isCarryOver: true
        });
    }
    return base;
}

function setDefaultDate() {
    document.getElementById('expense-date').valueAsDate = new Date();
}

// ===== TAB NAVIGATION =====
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
    updateAll();
}

// ===== MONTH NAVIGATION =====
function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    updateAll();
}

function getMonthLabel(date) {
    return date.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
}

function updateMonthLabels() {
    const label = getMonthLabel(currentDate);
    ['current-month-label', 'expenses-month-label', 'children-month-label', 'reports-month-label', 'income-month-label'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = label;
    });
}

// ===== FILTER BY MONTH =====
function getMonthExpenses(date) {
    const month = date.getMonth();
    const year = date.getFullYear();
    return expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === month && d.getFullYear() === year;
    });
}

function getMonthIncomes(date) {
    const month = date.getMonth();
    const year = date.getFullYear();
    return incomes.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === month && d.getFullYear() === year;
    });
}

function getPrevMonthExpenses() {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    return getEffectiveMonthExpenses(prev);
}

// ===== UPDATE ALL =====
function updateAll() {
    recalcCarryOver();
    updateMonthLabels();
    updateDashboard();
    renderExpenses();
    renderIncomeTab();
    renderChildrenTab();
    renderReports();
}

// ===== DASHBOARD =====
function updateDashboard() {
    const monthExp = getEffectiveMonthExpenses(currentDate);
    const monthInc = getEffectiveMonthIncomes(currentDate);
    const totalExpenses = monthExp.filter(expenseAffectsBalance).reduce((s, e) => s + e.amount, 0);
    const totalIncome = monthInc.reduce((s, e) => s + e.amount, 0);
    // Savings deposits are committed money out, so they shrink the
    // monthly saldo just like any expense. Removals from a goal don't
    // ADD to balance (we cap at zero) — that money was already counted
    // when it was first deposited.
    const monthKeyForBalance = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}`;
    const savingsThisMonth = Math.max(0, getGoalsMonthlyContribution(monthKeyForBalance));
    const balance = totalIncome - totalExpenses - savingsThisMonth;
    const personal = monthExp.filter(e => e.type === 'personal').reduce((s, e) => s + e.amount, 0);
    const childrenTotal = monthExp.filter(e => children.some(c => c.id === e.type)).reduce((s, e) => s + e.amount, 0);
    let splitAmount = 0;
    if (isMarriedMode()) {
        // Spouse splits
        const pct = getSpousePct() / 100;
        splitAmount = monthExp
            .filter(e => e.splitSpouse)
            .reduce((s, e) => {
                const fa = e.fullAmount || e.amount;
                const owed = fa * pct;
                return s + (e.spousePaid ? 0 : owed);
            }, 0);
    } else {
        splitAmount = monthExp
            .filter(e => e.split && children.some(c => c.id === e.type))
            .reduce((s, e) => {
                const child = children.find(c => c.id === e.type);
                const fa = e.fullAmount || e.amount;
                const coParentOwes = fa * ((child?.splitPct || 50) / 100);
                return s + (e.paidByFather ? 0 : coParentOwes);
            }, 0);
    }
    const attachmentCount = monthExp.filter(e => e.attachment).length;

    // Pending/future expenses and incomes (for current and future months)
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const isPastMonth = currentDate.getFullYear() < today.getFullYear() ||
        (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() < today.getMonth());

    // Pending fixed expenses
    const activeFixed = getActiveFixedForMonth(currentDate);
    const fixedPending = isPastMonth ? 0 : activeFixed.filter(f => {
        const st = getEffectiveFixedStatus(f, currentDate).status;
        return st !== 'pago' && st !== 'ignorado';
    }).reduce((s, f) => s + getEffectiveFixedAmount(f, currentDate), 0);

    // Future-dated regular expenses (current/future month only)
    const futureRegularExp = isPastMonth ? 0 :
        getMonthExpenses(currentDate).filter(e => e.date > todayStr).reduce((s, e) => s + e.amount, 0);

    const pendingExpenses = fixedPending + futureRegularExp;

    // Pending fixed incomes (not yet received) + future regular incomes
    const activeFixedInc = getActiveFixedIncomesForMonth(currentDate);
    const todayDay = today.getDate();
    const fixedIncPending = isPastMonth ? 0 : activeFixedInc.filter(fi => {
        // If "only count on day", don't project before the actual pay date arrives.
        if (fi.onlyOnDay) {
            const payDate = getFixedIncomePaymentDate(fi, today.getFullYear(), today.getMonth());
            if (today < payDate) return false;
        }
        return getEffectiveFixedIncomeStatus(fi, currentDate).status !== 'recebido';
    }).reduce((s, fi) => s + getEffectiveFixedIncomeAmount(fi, currentDate), 0);

    const futureRegularInc = isPastMonth ? 0 :
        getMonthIncomes(currentDate).filter(i => i.date > todayStr).reduce((s, i) => s + i.amount, 0);

    const pendingIncomes = fixedIncPending + futureRegularInc;

    // Projected totals reuse the same savingsThisMonth computed earlier
    // so the saldo, the projected saldo and the savings pill all agree.
    const projectedIncome = totalIncome + pendingIncomes;
    const projectedExpenses = totalExpenses + pendingExpenses;
    const projectedBalance = projectedIncome - projectedExpenses - savingsThisMonth;
    const available = projectedBalance;

    // Balance KPI
    animateNumber(document.getElementById('kpi-income'), totalIncome);
    animateNumber(document.getElementById('kpi-expenses'), totalExpenses);
    // Net contribution to savings goals this month (adds − removes). Only
    // shows up as a hero pill when the user actually moved money in/out
    // this month so the dashboard isn't cluttered for non-users. Uses
    // the SIGNED contribution (negative on net removal) so the pill
    // can show "+ 200" or "− 50". The balance deduction stays clamped
    // at zero (savingsThisMonth above), but the pill is informational.
    const savingsPillValue = getGoalsMonthlyContribution(monthKeyForBalance);
    const savingsPill = document.getElementById('kpi-savings-pill');
    const savingsEl = document.getElementById('kpi-savings');
    if (savingsPill && savingsEl) {
        if (savingsPillValue !== 0) {
            savingsPill.style.display = '';
            savingsEl.textContent = `${savingsPillValue > 0 ? '+' : ''}${formatCurrency(savingsPillValue)}`;
        } else {
            savingsPill.style.display = 'none';
        }
    }
    const balanceEl = document.getElementById('kpi-balance');
    animateNumber(balanceEl, balance, formatCurrency, 700);
    balanceEl.className = 'balance-hero-amount' + (balance < 0 ? ' negative' : '');
    // Also update hero amount class
    const heroAmountEl = document.querySelector('.balance-hero-amount');
    if (heroAmountEl) heroAmountEl.classList.toggle('negative', balance < 0);

    // Balance hero label: show days left for current month
    const heroLabelEl = document.querySelector('.balance-hero-label');
    if (heroLabelEl) {
        const isCurrentMonth2 = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
        if (isCurrentMonth2) {
            const daysInMonth2 = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            const daysLeft2 = daysInMonth2 - today.getDate();
            const healthIcon = balance >= 0 ? '✦' : '⚠';
            heroLabelEl.innerHTML = `Saldo do Mês <span style="background:rgba(255,255,255,0.2);border-radius:10px;padding:2px 8px;font-size:0.7rem;margin-left:6px">${healthIcon} ${daysLeft2}d restantes</span>`;
        } else {
            heroLabelEl.textContent = 'Saldo do Mês';
        }
    }

    // Forecast chips: por receber, por pagar, saldo projetado
    const fixedRow = document.getElementById('balance-fixed-row');
    if (pendingExpenses > 0 || pendingIncomes > 0) {
        fixedRow.style.display = 'grid';
        document.getElementById('kpi-fixed-pending').textContent = formatCurrency(pendingExpenses);
        document.getElementById('kpi-income-pending').textContent = formatCurrency(pendingIncomes);
        document.getElementById('kpi-available').textContent = (available >= 0 ? '' : '') + formatCurrency(available);
        const balanceChip = document.getElementById('forecast-chip-balance');
        if (balanceChip) balanceChip.classList.toggle('is-negative', available < 0);
    } else {
        fixedRow.style.display = 'none';
    }

    // Balance bar (based on projected income)
    const refIncome = projectedIncome > 0 ? projectedIncome : totalIncome;
    const spentPct = refIncome > 0 ? Math.min((totalExpenses / refIncome) * 100, 100) : 0;
    const fixedPct = refIncome > 0 ? Math.min((pendingExpenses / refIncome) * 100, 100 - spentPct) : 0;
    const barEl = document.getElementById('balance-bar-spent');
    barEl.style.width = spentPct + '%';
    barEl.style.background = spentPct > 90 ? 'linear-gradient(90deg, #EF9A9A, #E53935)' : spentPct > 70 ? 'linear-gradient(90deg, #FFE082, #FFA000)' : 'linear-gradient(90deg, #A5D6A7, #4CAF50)';
    const fixedBarEl = document.getElementById('balance-bar-fixed');
    if (fixedBarEl) fixedBarEl.style.width = fixedPct + '%';
    document.getElementById('balance-bar-label').textContent = refIncome > 0
        ? `${spentPct.toFixed(0)}% gasto${fixedPct > 0 ? ` + ${fixedPct.toFixed(0)}% cativo` : ''}`
        : 'Sem receitas registadas';

    // Summary cards
    document.getElementById('total-personal').textContent = formatCurrency(personal);
    document.getElementById('total-laura').textContent = formatCurrency(childrenTotal);
    document.getElementById('total-split').textContent = formatCurrency(splitAmount);
    // Update dynamic labels
    const childrenCardLabel = document.getElementById('children-card-label');
    if (childrenCardLabel) childrenCardLabel.textContent = children.length === 1 ? children[0].name : 'Filhos';
    const splitCardLabel = document.getElementById('split-card-label');
    if (splitCardLabel) {
        if (isMarriedMode()) {
            splitCardLabel.textContent = `${getSpouseName()} deve`;
        } else {
            splitCardLabel.textContent = children.length === 1 ? `${children[0].coParentName} deve` : 'Co-prog. devem';
        }
    }
    // Hide split card when no relevant split data
    const splitCardEl = document.querySelector('.split-card');
    if (splitCardEl) {
        const hide = (isMarriedMode() && splitAmount === 0 && !monthExp.some(e => e.splitSpouse)) ||
                     (!isMarriedMode() && children.length === 0);
        splitCardEl.style.display = hide ? 'none' : '';
    }
    document.getElementById('total-attachments').textContent = attachmentCount;

    // Dashboard balance card — sub-section header summaries
    const projSummaryEl = document.getElementById('dash-summary-projecao');
    if (projSummaryEl) {
        if (pendingExpenses > 0 || pendingIncomes > 0) {
            projSummaryEl.textContent = `${available >= 0 ? '+' : ''}${formatCurrency(available)}`;
        } else {
            projSummaryEl.textContent = `${spentPct.toFixed(0)}% gasto`;
        }
    }
    const acertarSummaryEl = document.getElementById('dash-summary-acertar');
    if (acertarSummaryEl) {
        const owedName = isMarriedMode()
            ? getSpouseName()
            : (children.length === 1 ? (children[0].coParentName || 'co-prog.') : 'co-prog.');
        if (splitAmount > 0) {
            acertarSummaryEl.textContent = `${owedName} deve ${formatCurrency(splitAmount)}`;
        } else {
            acertarSummaryEl.textContent = `Pessoal ${formatCurrency(personal)}`;
        }
    }
    const anexosSummaryEl = document.getElementById('dash-summary-anexos');
    if (anexosSummaryEl) {
        anexosSummaryEl.textContent = String(attachmentCount || 0);
    }
    // First-render: if "acertar" has no stored preference and there's nothing
    // owed, default to closed. Otherwise honour the saved/default state.
    if (localStorage.getItem('vanessa_dash_section_acertar') === null && splitAmount === 0) {
        localStorage.setItem('vanessa_dash_section_acertar', '0');
    }
    initDashSections();

    // When the salary cycle is configured the dedicated "Ciclo Salarial" card
    // is the canonical projection view. The month-scoped Projeção sub-section
    // (Por receber / Cativo / Saldo projetado) reports the same three concepts
    // and becomes redundant — hide it and surface a one-line pointer so the
    // user knows where it went. Without salaryDay configured the sub-section
    // is the only place these numbers exist, so leave it untouched.
    const projecaoSection = document.getElementById('dash-section-projecao');
    const cycleNote = document.getElementById('dash-cycle-note');
    const cycleMode = isSalaryConfigured();
    if (projecaoSection) projecaoSection.style.display = cycleMode ? 'none' : '';
    if (cycleNote) cycleNote.style.display = cycleMode ? 'block' : 'none';

    // YTD strip
    renderYTDStrip();
    // Spending pace
    renderSpendingPace(monthExp, totalIncome, totalExpenses);
    // Budget alerts
    renderBudgetAlerts(monthExp);

    renderCategoryChart(monthExp);
    renderMonthComparison(monthExp);
    renderTopExpenses(monthExp);
    renderCategoryDonut();
    renderSalaryCycle();
    renderCycleExpenses();
    renderPartnerSummary();
    renderAiInsightsCard();
    renderSavingsGoals();
    renderNetWorth();
    renderBudgetAlerts();
    // Prepaid cards card always visible so the user can find the entry point
    // and create their first card without going hunting through menus.
    const prepaidCard = document.getElementById('prepaid-cards-card');
    if (prepaidCard) prepaidCard.style.display = 'block';
    renderPrepaidCards();
}

// Compact partner summary on the dashboard. Shows the month's partner-involved
// total, the partner's share and how much of it is still by-receive, plus a
// tiny breakdown by category. Hidden when no partner is configured or in
// married mode.
// Unified partner-involvement helper. Takes an ORIGINAL expense (not an
// expanded virtual) and returns the totals that matter for partner reports:
//   involved   — gross amount of this expense that involved the partner
//   attributed — conceptually "hers" (mix pct · gross, or split entry amount)
//   owed       — still to receive from her
//   paid       — already received from her
// Handles: grouped per-entry withPartner, mix Pessoal+partner, regular splits
// tagged with partner name. An expense that doesn't involve the partner
// returns all-zero.
function getPartnerInvolvement(e, nameLower) {
    const out = { involved: 0, attributed: 0, owed: 0, paid: 0 };
    const gross = e.fullAmount != null ? e.fullAmount : (e.amount || 0);

    // Grouped expense: rules of precedence to avoid double-counting.
    //  - If the whole expense has mixPartnerPct set, that wins: attribute the
    //    configured % of the total. Per-entry flags are ignored.
    //  - Otherwise use per-entry withPartner flags (100% of each tagged entry
    //    is hers).
    if (e.isGrouped && Array.isArray(e.entries)) {
        if (e.mixPartnerName && e.mixPartnerName.toLowerCase() === nameLower && e.mixPartnerPct) {
            const pct = parseFloat(e.mixPartnerPct) || 0;
            const attrAmt = gross * pct / 100;
            out.attributed += attrAmt;
            if (e.mixPartnerSplit) {
                if (e.mixPartnerPaid) out.paid += attrAmt; else out.owed += attrAmt;
            }
        } else {
            const sumPartnerEntries = e.entries
                .filter(en => en.withPartner)
                .reduce((s, en) => s + (parseFloat(en.amount) || 0), 0);
            if (sumPartnerEntries > 0) out.attributed += sumPartnerEntries;
        }
        out.involved = out.attributed;
        return out;
    }

    // Mix Pessoal+partner on this expense — attributing a % always counts as
    // "spent with" for reports. "mixPartnerSplit" adds the debt layer on top.
    if (e.mixPartnerName && e.mixPartnerName.toLowerCase() === nameLower && e.mixPartnerPct) {
        const pct = parseFloat(e.mixPartnerPct) || 0;
        const attrAmt = gross * pct / 100;
        out.attributed += attrAmt;
        if (e.mixPartnerSplit) {
            if (e.mixPartnerPaid) out.paid += attrAmt; else out.owed += attrAmt;
        }
    }

    // Splits array where partner is one of the people — the split entry amount
    // is her share.
    if (Array.isArray(e.splits)) {
        const partnerSplits = e.splits.filter(s => (s.name || '').toLowerCase() === nameLower);
        partnerSplits.forEach(s => {
            const a = parseFloat(s.amount) || 0;
            // Only count as attributed when not already captured by mix above
            if (!(e.mixPartnerName && e.mixPartnerName.toLowerCase() === nameLower)) {
                out.attributed += a;
            }
            if (s.paid) out.paid += a; else out.owed += a;
        });
    }

    // Legacy fallback: if the expense has the partner name in withPeople
    // Legacy fallback: if the expense has the partner name in withPeople
    // without any mix/split info, treat the full expense as attributed.
    // Does NOT apply to grouped expenses — those rely on per-entry withPartner.
    if (!e.isGrouped && out.attributed === 0 && (e.withPeople || []).some(p => p.toLowerCase() === nameLower)) {
        out.attributed += gross;
    }

    // "Involved" = "attributed" now. We kept both keys for backwards compat
    // but they carry the same value — callers can use either.
    out.involved = out.attributed;
    return out;
}

// Aggregates partner involvement across the month's ORIGINAL expenses (no
// virtuals). Returns totals plus the list of involved expenses for rendering.
function getPartnerMonthStats(date, name) {
    const nameLower = (name || '').toLowerCase();
    if (!nameLower) return { totals: { involved: 0, attributed: 0, owed: 0, paid: 0 }, entries: [] };
    const month = getMonthExpenses(date).map(adjustExpenseForCoParent);
    const totals = { involved: 0, attributed: 0, owed: 0, paid: 0 };
    const entries = [];
    month.forEach(e => {
        const r = getPartnerInvolvement(e, nameLower);
        if (r.involved > 0 || r.attributed > 0) {
            totals.involved += r.involved;
            totals.attributed += r.attributed;
            totals.owed += r.owed;
            totals.paid += r.paid;
            entries.push({ expense: e, ...r });
        }
    });
    // Active fixed expenses with mix-partner settings are also "with" the
    // partner — include them so summary/report reflect rent, gym, etc.
    const activeFixed = getActiveFixedForMonth(date);
    activeFixed.forEach(f => {
        if (!f.mixPartnerName || f.mixPartnerName.toLowerCase() !== nameLower) return;
        if (!f.mixPartnerPct) return;
        if (isFixedSkipped(f.id, date)) return;
        const st = getFixedStatusForMonth(f.id, date);
        const base = (st && st.amount) || f.amount;
        const pct = parseFloat(f.mixPartnerPct) || 0;
        if (!(pct > 0 && pct < 100)) return;
        const attributed = base * pct / 100;
        // Attribution always counts as "spent with". "Dividir" (mixPartnerSplit)
        // turns it into a monthly debt tracked via fixedStatus.mixPartnerPaid.
        let owed = 0, paid = 0;
        if (f.mixPartnerSplit) {
            if (st?.mixPartnerPaid) paid = attributed; else owed = attributed;
        }
        // "Envolvido" in the report is the attributed share, not the full base —
        // fixed expenses with 10 % attributed only count 10 % as hers.
        totals.involved += attributed;
        totals.attributed += attributed;
        totals.owed += owed;
        totals.paid += paid;
        // Build a display-friendly pseudo-expense so the detail list can render it
        // without bespoke code paths. Uses the month key for a stable date label.
        const monthKey = getFixedMonthKey(date);
        const [y, m] = monthKey.split('-').map(Number);
        const maxDay = new Date(y, m, 0).getDate();
        const day = Math.min(f.dayOfMonth || 1, maxDay);
        const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        entries.push({
            expense: {
                id: `fixed_${f.id}_${monthKey}`,
                description: f.description + ' (fixa)',
                amount: base,
                fullAmount: base,
                date: dateStr,
                category: f.category,
                mixPartnerName: f.mixPartnerName,
                mixPartnerPct: f.mixPartnerPct,
                mixPartnerSplit: f.mixPartnerSplit,
                mixPartnerPaid: !!st?.mixPartnerPaid,
                isFixedExpense: true
            },
            // Detail row should show what's hers, not the fixed's gross.
            involved: attributed,
            attributed,
            owed,
            paid
        });
    });
    return { totals, entries };
}

function renderPartnerSummary() {
    const card = document.getElementById('partner-summary-card');
    if (!card) return;
    const name = getPartnerName();
    // Always visible in separated mode once a partner name is configured, even
    // when the month has zero involved expenses (renders an empty state).
    if (isMarriedMode() || !name) { card.style.display = 'none'; return; }

    const { totals, entries } = getPartnerMonthStats(currentDate, name);
    const cats = getEffectiveCategories();
    const byCat = {};
    entries.forEach(({ expense, involved }) => {
        const k = expense.category || 'outros';
        byCat[k] = (byCat[k] || 0) + involved;
    });
    const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);

    card.style.display = 'block';
    if (entries.length === 0) {
        card.innerHTML = `
            <h3 style="color:#C2185B"><i class="fas fa-heart"></i> Gasto com ${name}</h3>
            <div style="text-align:center;padding:12px 0;color:var(--text-light);font-size:0.85rem">
                Sem despesas com ${name} este mês.<br>
                <span style="font-size:0.72rem">Marca "Atribuir parte a ${name}" numa despesa ou "Com ${name}" numa entrada agrupada.</span>
            </div>`;
        return;
    }

    const hasSettle = (totals.owed + totals.paid) > 0;
    card.innerHTML = `
        <h3 style="color:#C2185B"><i class="fas fa-heart"></i> Gasto com ${name}</h3>
        <div style="padding:12px;background:#FCE4EC;border-radius:10px;margin-bottom:8px">
            <div style="font-size:0.7rem;color:#880E4F">Envolvido este mês</div>
            <div style="font-size:1.4rem;font-weight:800;color:#C2185B">${formatCurrency(totals.involved)}</div>
            <div style="font-size:0.7rem;color:#AD1457">${entries.length} ${entries.length === 1 ? 'despesa' : 'despesas'}</div>
            ${hasSettle ? `<div style="margin-top:6px;font-size:0.72rem;color:var(--text-light)">Por liquidar: <span style="color:var(--success);font-weight:600">${formatCurrency(totals.paid)} pagos</span> · <span style="color:var(--danger);font-weight:600">${formatCurrency(totals.owed)} por receber</span></div>` : ''}
        </div>
        ${topCats.length ? `
        <div style="font-size:0.68rem;color:var(--text-light);margin-bottom:4px">Onde mais gastaram</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${topCats.map(([catKey, val]) => {
                const c = cats[catKey] || cats.outros;
                return `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:#F5F3FF;color:var(--text);border-radius:10px;font-size:0.72rem"><i class="fas ${c.icon}" style="color:${c.color}"></i> ${c.label} ${formatCurrency(val)}</span>`;
            }).join('')}
        </div>` : ''}
    `;
}

function renderSpendingPace(monthExp, totalIncome, totalExpenses) {
    const container = document.getElementById('spending-pace');
    if (!container) return;

    const today = new Date();
    const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
    if (!isCurrentMonth) {
        container.style.display = 'none';
        return;
    }

    // When salary is configured, the salary-cycle card already shows ritmo
    // (X/dia vs orç. Y/dia · N% acima/abaixo) + daily-budget row + projection
    // footer. The standalone Ritmo card duplicates all of that, so hide it.
    if (isSalaryConfigured()) {
        container.style.display = 'none';
        return;
    }

    // Calendar-month pace (salary not configured — see early return above).
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - dayOfMonth;
    const monthPct = Math.round((dayOfMonth / daysInMonth) * 100);
    const badgeLabel = `Dia ${dayOfMonth}/${daysInMonth}`;
    const progressLabel = `${monthPct}% do mês passou · ${daysRemaining} dias restantes`;

    if (totalExpenses === 0) {
        container.style.display = 'none';
        return;
    }

    const dailyAvg = totalExpenses / dayOfMonth;
    const projected = dailyAvg * daysInMonth;
    const refIncome = totalIncome;
    const dailyBudget = daysRemaining > 0 && refIncome > 0 ? Math.max(0, (refIncome - totalExpenses) / daysRemaining) : 0;

    const projColor = projected > refIncome ? 'var(--danger)' : projected > refIncome * 0.8 ? 'var(--warning)' : 'var(--success)';
    const projBg = projected > refIncome ? '#FFEBEE' : projected > refIncome * 0.8 ? '#FFF8E1' : '#E8F5E9';
    const budgetColor = dailyBudget < 10 ? 'var(--danger)' : dailyBudget < 30 ? 'var(--warning)' : 'var(--success)';
    const budgetBg = dailyBudget < 10 ? '#FFEBEE' : dailyBudget < 30 ? '#FFF8E1' : '#E8F5E9';

    // Standalone Ritmo card — calendar-month only (cycle path early-returned above).
    container.style.display = 'block';
    container.innerHTML = `
        <div class="pace-header">
            <span class="pace-title"><i class="fas fa-gauge-high"></i> Ritmo de Gastos</span>
            <span class="pace-badge">${badgeLabel}</span>
        </div>
        <div class="pace-stats">
            <div class="pace-stat">
                <div class="pace-stat-icon" style="background:#EDE7F6"><i class="fas fa-calendar-day" style="color:var(--primary)"></i></div>
                <div class="pace-stat-body">
                    <div class="pace-stat-label">Média/dia</div>
                    <div class="pace-stat-value">${formatCurrency(dailyAvg)}</div>
                </div>
            </div>
            <div class="pace-stat">
                <div class="pace-stat-icon" style="background:${projBg}"><i class="fas fa-chart-line" style="color:${projColor}"></i></div>
                <div class="pace-stat-body">
                    <div class="pace-stat-label">Projeção</div>
                    <div class="pace-stat-value" style="color:${projColor}">${formatCurrency(projected)}</div>
                </div>
            </div>
            <div class="pace-stat">
                <div class="pace-stat-icon" style="background:${budgetBg}"><i class="fas fa-piggy-bank" style="color:${budgetColor}"></i></div>
                <div class="pace-stat-body">
                    <div class="pace-stat-label">Pode gastar/dia</div>
                    <div class="pace-stat-value" style="color:${budgetColor}">${formatCurrency(dailyBudget)}</div>
                </div>
            </div>
        </div>
        <div class="pace-progress-bar"><div class="pace-progress-fill" style="width:${monthPct}%"></div></div>
        <div class="pace-progress-label">${progressLabel}</div>
    `;
}

// ===== Consolidated dashboard balance card: collapsible sub-sections =====
// Each sub-section's open/closed state persists independently in
// localStorage under vanessa_dash_section_<key>. Defaults: projecao=open,
// acertar=open if any owed > 0 (handled by caller), anexos=closed.
const DASH_SECTION_DEFAULTS = { projecao: true, acertar: true, anexos: false };
function getDashSectionOpen(key) {
    const raw = localStorage.getItem('vanessa_dash_section_' + key);
    if (raw === '1') return true;
    if (raw === '0') return false;
    return DASH_SECTION_DEFAULTS[key] !== false;
}
function applyDashSectionState(key) {
    const body = document.getElementById('dash-body-' + key);
    const chev = document.getElementById('dash-chevron-' + key);
    const open = getDashSectionOpen(key);
    if (body) body.style.display = open ? 'block' : 'none';
    if (chev) chev.classList.toggle('is-open', open);
}
function toggleDashSection(key) {
    const open = getDashSectionOpen(key);
    localStorage.setItem('vanessa_dash_section_' + key, open ? '0' : '1');
    applyDashSectionState(key);
}
function initDashSections() {
    ['projecao', 'acertar', 'anexos'].forEach(applyDashSectionState);
}

// Collapsible "Despesas deste ciclo" section. Lists every expense (variable
// + paid fixed) whose date falls inside the current salary cycle, sorted
// desc. Hidden when no salary is configured. Open/closed state persists in
// localStorage as vanessa_cycle_section_open.
function toggleCycleSection() {
    const body = document.getElementById('cycle-expenses-body');
    const chev = document.getElementById('cycle-section-chevron');
    if (!body) return;
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    if (chev) chev.style.transform = isOpen ? '' : 'rotate(180deg)';
    localStorage.setItem('vanessa_cycle_section_open', isOpen ? '0' : '1');
}

function renderCycleExpenses() {
    const section = document.getElementById('cycle-expenses-section');
    if (!section) return;
    if (!isSalaryConfigured()) { section.style.display = 'none'; return; }

    const today = new Date();
    const viewYear = currentDate.getFullYear();
    const viewMonth = currentDate.getMonth();
    const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
    const cycle = isCurrentMonth
        ? (getSalaryCycleAt(today) || getSalaryCycleForMonth(viewYear, viewMonth))
        : getSalaryCycleForMonth(viewYear, viewMonth);
    if (!cycle) { section.style.display = 'none'; return; }

    const startStr = toLocalDateStr(cycle.start);
    const endStr = toLocalDateStr(cycle.end);
    const cats = getEffectiveCategories();

    // Variable expenses inside the cycle window — co-parent split applied.
    const varRows = expenses
        .map(adjustExpenseForCoParent)
        .filter(e => e.date && e.date >= startStr && e.date <= endStr)
        .map(e => ({
            kind: 'var',
            id: e.id,
            date: e.date,
            description: e.description || '(sem descrição)',
            category: e.category,
            amount: e.amount || 0,
            childId: e.type && e.type !== 'personal' ? e.type : null,
            status: 'pago' // variables are always realised spend
        }));

    // Fixed expenses whose dayOfMonth falls inside the cycle window — both
    // paid and pending (and ignored, marked as such). We synthesize a date
    // from each calendar month the cycle touches and check membership.
    const monthsTouched = [];
    const walker = new Date(cycle.start.getFullYear(), cycle.start.getMonth(), 1);
    const endMonth = new Date(cycle.end.getFullYear(), cycle.end.getMonth(), 1);
    while (walker <= endMonth) {
        monthsTouched.push(new Date(walker.getFullYear(), walker.getMonth(), 1));
        walker.setMonth(walker.getMonth() + 1);
    }
    const fixedRows = [];
    monthsTouched.forEach(monthDate => {
        const y = monthDate.getFullYear();
        const m = monthDate.getMonth();
        const maxDay = new Date(y, m + 1, 0).getDate();
        getActiveFixedForMonth(monthDate).forEach(f => {
            const day = Math.min(f.dayOfMonth, maxDay);
            const dateStr = `${y}-${String(m + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            if (dateStr < startStr || dateStr > endStr) return;
            const eff = getEffectiveFixedStatus(f, monthDate);
            const status = eff.status; // 'pago' | 'pendente' | 'ignorado'
            const amount = status === 'ignorado' ? 0 : getEffectiveFixedAmount(f, monthDate);
            fixedRows.push({
                kind: 'fixed',
                id: f.id,
                date: dateStr,
                description: f.description,
                category: f.category,
                amount,
                childId: f.type && f.type !== 'personal' ? f.type : null,
                status
            });
        });
    });

    const all = [...varRows, ...fixedRows].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Header totals: spent = variables + paid fixed (pending fixed is shown
    // in the list with the pendente badge but does not inflate "spent").
    const spent = all.reduce((s, r) => s + (r.status === 'pago' ? r.amount : 0), 0);
    const committed = all.reduce((s, r) => s + (r.status === 'ignorado' ? 0 : r.amount), 0);

    const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const periodLabel = `${cycle.start.getDate()} ${months[cycle.start.getMonth()]} → ${cycle.end.getDate()} ${months[cycle.end.getMonth()]}`;
    const cycleLength = Math.max(1, Math.round((cycle.end - cycle.start) / 86400000) + 1);
    const inCycle = today >= cycle.start && today <= cycle.end;
    const dayN = inCycle ? Math.max(1, Math.min(cycleLength, Math.round((today - cycle.start) / 86400000) + 1)) : cycleLength;
    const countShown = all.filter(r => r.status !== 'ignorado').length;
    const totalsLbl = committed > spent
        ? `${formatCurrency(spent)} / ${formatCurrency(committed)}`
        : formatCurrency(spent);
    const sub = `📅 ${periodLabel} · Dia ${dayN}/${cycleLength} · ${countShown} ${countShown === 1 ? 'gasto' : 'gastos'} · ${totalsLbl}`;

    section.style.display = 'block';
    const subEl = document.getElementById('cycle-expenses-sub');
    if (subEl) subEl.textContent = sub;

    const isOpen = localStorage.getItem('vanessa_cycle_section_open') === '1';
    const body = document.getElementById('cycle-expenses-body');
    const chev = document.getElementById('cycle-section-chevron');
    if (body) body.style.display = isOpen ? 'block' : 'none';
    if (chev) chev.style.transform = isOpen ? 'rotate(180deg)' : '';

    if (!body) return;
    if (all.length === 0) {
        body.innerHTML = '<div class="empty-state" style="padding:14px 0"><p>Nenhum gasto registado neste ciclo ainda.</p></div>';
        return;
    }

    // Compact row: status badge · date · description · category · amount · jump-to-edit
    body.innerHTML = all.map(r => {
        const c = cats[r.category] || cats.outros || { color: '#9E9E9E', icon: 'fa-circle', label: r.category || 'outros' };
        const child = r.childId ? children.find(ch => ch.id === r.childId) : null;
        const childTag = child ? `<span style="font-size:0.65rem;background:${child.color || 'var(--bg)'}22;color:${child.color || 'var(--text-light)'};padding:1px 6px;border-radius:8px;margin-left:6px">${child.name || child.id}</span>` : '';
        let badge;
        if (r.status === 'pago') badge = '<span title="Pago" style="font-size:0.85rem">✅</span>';
        else if (r.status === 'pendente') badge = '<span title="Pendente" style="font-size:0.85rem">⏳</span>';
        else badge = '<span title="Ignorado" style="font-size:0.85rem;opacity:0.6">⏸</span>';
        const amountColor = r.status === 'ignorado' ? 'var(--text-light)' : 'var(--danger)';
        const amountTxt = r.status === 'ignorado' ? '—' : formatCurrency(r.amount);
        const action = r.kind === 'fixed' ? `editFixed('${r.id}')` : `editExpense('${r.id}')`;
        const opacity = r.status === 'ignorado' ? '0.55' : '1';
        return `
            <div class="cycle-expense-row" style="display:flex;align-items:center;gap:8px;padding:7px 4px;border-bottom:1px solid var(--border);opacity:${opacity}">
                <div style="width:18px;text-align:center;flex-shrink:0">${badge}</div>
                <div style="width:42px;font-size:0.7rem;color:var(--text-light);flex-shrink:0">${formatDate(r.date)}</div>
                <div style="width:24px;height:24px;border-radius:6px;background:${c.color || '#9E9E9E'}22;color:${c.color || '#9E9E9E'};display:flex;align-items:center;justify-content:center;flex-shrink:0" title="${c.label || r.category}"><i class="fas ${c.icon || 'fa-circle'}" style="font-size:0.7rem"></i></div>
                <div style="flex:1;min-width:0;display:flex;flex-direction:column">
                    <div style="display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden">
                        ${r.kind === 'fixed' ? '<i class="fas fa-repeat" title="Despesa fixa" style="color:var(--primary);font-size:0.65rem;flex-shrink:0"></i>' : ''}
                        <span style="font-size:0.78rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;min-width:0">${r.description}${childTag}</span>
                    </div>
                    <div style="font-size:0.62rem;color:var(--text-light)">${c.label || r.category}</div>
                </div>
                <div style="font-weight:700;color:${amountColor};white-space:nowrap;font-size:0.8rem">${amountTxt}</div>
                <button onclick="${action}" class="btn-icon" style="color:var(--text-light);padding:4px 6px;flex-shrink:0" title="Abrir / editar"><i class="fas fa-pen"></i></button>
            </div>
        `;
    }).join('');
}

function renderBudgetAlerts(monthExp) {
    const container = document.getElementById('budget-alerts');
    if (!container) return;

    const budgetKeys = Object.keys(categoryBudgets);
    if (budgetKeys.length === 0) {
        container.style.display = 'none';
        return;
    }

    const cats = getEffectiveCategories();
    const grouped = {};
    monthExp.forEach(e => { grouped[e.category] = (grouped[e.category] || 0) + e.amount; });

    const alerts = budgetKeys
        .map(cat => {
            const spent = grouped[cat] || 0;
            const budget = categoryBudgets[cat];
            const pct = (spent / budget * 100);
            return { cat, spent, budget, pct, label: cats[cat]?.label || cat, color: cats[cat]?.color || '#607D8B', icon: cats[cat]?.icon || 'fa-circle' };
        })
        .filter(a => a.pct > 0)
        .sort((a, b) => b.pct - a.pct);

    if (alerts.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = `
        <h3 class="card-title"><i class="fas fa-bullseye"></i> Limites de Categoria</h3>
        ${alerts.map(a => {
            const barPct = Math.min(a.pct, 100);
            const barColor = a.pct >= 100 ? 'var(--danger)' : a.pct >= 80 ? 'var(--warning)' : 'var(--success)';
            const icon = a.pct >= 100 ? '<i class="fas fa-exclamation-triangle" style="color:var(--danger)"></i> ' : a.pct >= 80 ? '<i class="fas fa-exclamation-circle" style="color:var(--warning)"></i> ' : '';
            return `<div style="margin-bottom:8px">
                <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:2px">
                    <span>${icon}<i class="fas ${a.icon}" style="color:${a.color}"></i> ${a.label}</span>
                    <span style="font-weight:600;color:${barColor}">${formatCurrency(a.spent)} / ${formatCurrency(a.budget)}</span>
                </div>
                <div style="background:var(--border);border-radius:4px;height:6px;overflow:hidden">
                    <div style="width:${barPct}%;height:100%;background:${barColor};border-radius:4px;transition:width 0.3s"></div>
                </div>
            </div>`;
        }).join('')}
    `;
}

// ===== CATEGORY CHART =====
function renderCategoryChart(monthExp) {
    const totals = {};
    monthExp.forEach(e => {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
    });

    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    const chartEl = document.getElementById('category-chart');
    const legendEl = document.getElementById('category-legend');

    if (total === 0) {
        chartEl.innerHTML = '<div style="flex:1;background:#eee;border-radius:12px"></div>';
        legendEl.innerHTML = '<span class="empty-state"><p>Sem despesas este mes</p></span>';
        return;
    }

    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    chartEl.innerHTML = sorted.map(([cat, val]) => {
        const pct = (val / total * 100).toFixed(1);
        const color = getEffectiveCategories()[cat]?.color || '#607D8B';
        return `<div class="chart-segment" style="width:${pct}%;background:${color}" title="${getEffectiveCategories()[cat]?.label}: ${formatCurrency(val)} (${pct}%)"></div>`;
    }).join('');

    legendEl.innerHTML = sorted.map(([cat, val]) => {
        const pct = (val / total * 100).toFixed(0);
        const color = getEffectiveCategories()[cat]?.color || '#607D8B';
        return `<div class="legend-item">
            <div class="legend-dot" style="background:${color}"></div>
            ${getEffectiveCategories()[cat]?.label || cat} ${pct}% (${formatCurrency(val)})
        </div>`;
    }).join('');
}

// ===== MONTH COMPARISON =====
function renderMonthComparison(monthExp) {
    const prevExp = getPrevMonthExpenses();
    const currTotal = monthExp.filter(expenseAffectsBalance).reduce((s, e) => s + e.amount, 0);
    const prevTotal = prevExp.reduce((s, e) => s + e.amount, 0);

    const container = document.getElementById('month-comparison');
    if (prevTotal === 0 && currTotal === 0) {
        container.innerHTML = '<p class="empty-state">Sem dados para comparar</p>';
        return;
    }

    const diff = currTotal - prevTotal;
    const pct = prevTotal > 0 ? ((diff / prevTotal) * 100).toFixed(1) : 0;
    const cls = diff > 0 ? 'change-up' : diff < 0 ? 'change-down' : 'change-same';
    const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '▬';
    const currLabel = currentDate.toLocaleDateString('pt-PT', { month: 'short' });
    const prevLabel = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1).toLocaleDateString('pt-PT', { month: 'short' });
    const maxVal = Math.max(currTotal, prevTotal, 1);
    const currPct = (currTotal / maxVal * 100).toFixed(1);
    const prevPct = (prevTotal / maxVal * 100).toFixed(1);
    const currBarColor = diff > 0 ? 'var(--danger)' : 'var(--success)';

    container.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
            <span class="comparison-change ${cls}" style="font-size:0.78rem">${arrow} ${Math.abs(pct)}% vs mês anterior</span>
        </div>
        <div class="comparison-block">
            <div class="comparison-block-header">
                <span class="comparison-block-label"><i class="fas fa-circle" style="font-size:0.5rem;color:${currBarColor}"></i> ${currLabel} (este mês)</span>
                <span class="comparison-block-value">${formatCurrency(currTotal)}</span>
            </div>
            <div class="comparison-block-bar">
                <div class="comparison-block-fill" style="width:${currPct}%;background:${currBarColor}"></div>
            </div>
        </div>
        <div class="comparison-block" style="margin-top:8px">
            <div class="comparison-block-header">
                <span class="comparison-block-label"><i class="fas fa-circle" style="font-size:0.5rem;color:var(--text-muted)"></i> ${prevLabel} (anterior)</span>
                <span class="comparison-block-value" style="color:var(--text-light)">${formatCurrency(prevTotal)}</span>
            </div>
            <div class="comparison-block-bar">
                <div class="comparison-block-fill" style="width:${prevPct}%;background:var(--border)"></div>
            </div>
        </div>
    `;
}

// ===== TOP EXPENSES =====
function renderTopExpenses(monthExp) {
    const container = document.getElementById('top-expenses');
    if (monthExp.length === 0) {
        container.innerHTML = '<p class="empty-state">Sem despesas este mes</p>';
        return;
    }
    const sorted = [...monthExp].sort((a, b) => b.amount - a.amount).slice(0, 5);
    const maxAmount = sorted[0].amount;
    const rankColors = ['#6C5CE7','#a29bfe','#b8adff','#cec9ff','#e0deff'];
    container.innerHTML = sorted.map((e, i) => {
        const barPct = ((e.amount / maxAmount) * 100).toFixed(0);
        const catColor = getEffectiveCategories()[e.category]?.color || '#6C5CE7';
        return `
        <div class="top-expense-item">
            <div class="top-expense-rank" style="background:${rankColors[i] || '#e0deff'}">${i + 1}</div>
            <div class="top-expense-info">
                <div class="top-expense-desc">${e.description}${e.attachment ? ' <i class="fas fa-paperclip" style="font-size:0.65rem;color:var(--text-muted)"></i>' : ''}</div>
                <div class="top-expense-meta">
                    <span class="top-expense-cat"><i class="fas fa-circle" style="font-size:0.4rem;color:${catColor}"></i> ${getEffectiveCategories()[e.category]?.label || e.category}</span>
                    <span style="color:var(--border)">·</span>
                    <span class="top-expense-cat">${formatDate(e.date)}</span>
                </div>
            </div>
            <div class="top-expense-bar-wrap"><div class="top-expense-bar" style="width:${barPct}%;background:${catColor}"></div></div>
            <div class="top-expense-amount">${formatCurrency(e.amount)}</div>
        </div>`;
    }).join('');
}

// ===== EXPENSES LIST =====
// ===== EXPENSE TEMPLATES (Quick Add) =====
function addFromTemplate(tplId) {
    const tpl = expenseTemplates.find(t => t.id === tplId);
    if (!tpl) return;
    // Pick a date in the currently-viewed month so quick-adds land where the
    // user is looking. Current month → today; other months → same day number
    // clamped to that month's last day.
    const today = new Date();
    const viewYear = currentDate.getFullYear();
    const viewMonth = currentDate.getMonth();
    const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
    const chosenDate = isCurrentMonth
        ? today
        : new Date(viewYear, viewMonth, Math.min(today.getDate(), new Date(viewYear, viewMonth + 1, 0).getDate()));
    const dateStr = `${chosenDate.getFullYear()}-${String(chosenDate.getMonth() + 1).padStart(2, '0')}-${String(chosenDate.getDate()).padStart(2, '0')}`;
    const expense = {
        id: generateId(),
        description: tpl.description,
        amount: tpl.amount,
        date: dateStr,
        category: tpl.category,
        type: tpl.type || 'personal',
        split: tpl.split || false,
        paidByFather: false,
        essential: tpl.essential !== false,
        notes: '',
        attachment: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    expenses.push(expense);
    saveData();
    updateAll();
    showToast(`${tpl.description} adicionada!`);
}

function saveAsTemplate(expenseId) {
    const e = expenses.find(x => x.id === expenseId);
    if (!e) return;
    if (expenseTemplates.some(t => t.description === e.description && t.amount === e.amount)) {
        showToast('Template ja existe'); return;
    }
    const cats = getEffectiveCategories();
    expenseTemplates.push({
        id: generateId(),
        description: e.description,
        amount: e.amount,
        category: e.category,
        type: e.type,
        split: e.split,
        essential: e.essential,
        icon: cats[e.category]?.icon || 'fa-receipt'
    });
    saveData();
    updateAll();
    showToast('Guardado como frequente!');
}

function deleteTemplate(tplId) {
    expenseTemplates = expenseTemplates.filter(t => t.id !== tplId);
    saveData();
    updateAll();
    showToast('Template removido');
}

function showAddTemplate() {
    const cats = getEffectiveCategories();
    const catOptions = Object.entries(cats).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
    let typeRadios = `<label class="radio-option"><input type="radio" name="tpl-type" value="personal" checked> Pessoal</label>`;
    children.forEach(c => {
        typeRadios += `<label class="radio-option"><input type="radio" name="tpl-type" value="${c.id}"> ${c.name}</label>`;
    });

    document.getElementById('template-form-area').innerHTML = `
        <div class="card" style="margin-top:8px;padding:12px">
            <div class="form-group"><label>Descricao</label><input type="text" id="tpl-desc" required placeholder="Ex: Via Verde"></div>
            <div class="form-group"><label>Valor (EUR)</label><input type="number" id="tpl-amount" step="0.01" min="0.01" required placeholder="0,00"></div>
            <div class="form-group"><label>Categoria</label><select id="tpl-category">${catOptions}</select></div>
            <div class="form-group"><label>Tipo</label><div class="radio-group">${typeRadios}</div></div>
            <div style="display:flex;gap:8px">
                <button onclick="saveNewTemplate()" class="btn btn-primary" style="flex:1"><i class="fas fa-save"></i> Guardar</button>
                <button onclick="document.getElementById('template-form-area').innerHTML=''" class="btn btn-secondary" style="flex:1">Cancelar</button>
            </div>
        </div>
    `;
}

function saveNewTemplate() {
    const desc = document.getElementById('tpl-desc').value.trim();
    const amount = parseFloat(document.getElementById('tpl-amount').value);
    const category = document.getElementById('tpl-category').value;
    const type = document.querySelector('input[name="tpl-type"]:checked').value;
    if (!desc || !amount || !category) { showToast('Preencha todos os campos'); return; }
    const cats = getEffectiveCategories();
    expenseTemplates.push({
        id: generateId(),
        description: desc,
        amount,
        category,
        type,
        split: children.some(c => c.id === type),
        essential: true,
        icon: cats[category]?.icon || 'fa-receipt'
    });
    saveData();
    document.getElementById('template-form-area').innerHTML = '';
    updateAll();
    showToast('Despesa frequente criada!');
}

function renderQuickAdd() {
    const container = document.getElementById('quick-add-bar');
    if (!container) return;
    if (expenseTemplates.length === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';
    const cats = getEffectiveCategories();
    // Header dropped — chips render inline to save vertical space. The first
    // chip carries the bolt icon as a subtle marker that this is a quick-add.
    container.innerHTML = `
        <div class="quick-add-chips">
            ${expenseTemplates.map((t, idx) => {
                const cat = cats[t.category] || {};
                const marker = idx === 0 ? `<i class="fas fa-bolt" style="color:#FDCB6E;margin-right:2px;font-size:0.7rem"></i>` : '';
                return `<button class="quick-add-chip" onclick="addFromTemplate('${t.id}')" title="${t.description} - ${formatCurrency(t.amount)}">
                    ${marker}<i class="fas ${cat.icon || t.icon || 'fa-receipt'}" style="color:${cat.color || 'var(--primary)'}"></i>
                    <span>${t.description}</span>
                    <span class="quick-add-amount">${formatCurrency(t.amount)}</span>
                </button>`;
            }).join('')}
        </div>
    `;
}

function toggleFixedSection() {
    const body = document.getElementById('fixed-month-body');
    const chevron = document.getElementById('fixed-section-chevron');
    if (!body) return;
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    if (chevron) chevron.style.transform = isOpen ? 'rotate(180deg)' : '';
    localStorage.setItem('fixedSectionOpen', isOpen ? '0' : '1');
}

function initVariableExpensesState() {
    // Fixed section: default closed
    const body = document.getElementById('fixed-month-body');
    const chevron = document.getElementById('fixed-section-chevron');
    if (body) {
        const isOpen = localStorage.getItem('fixedSectionOpen') === '1';
        body.style.display = isOpen ? 'block' : 'none';
        if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
    }
    // Filter bar: collapsed by default unless a filter is active or the user
    // explicitly opened it (persisted in vanessa_expenses_filters_open).
    initFiltersBar();
}

// ----- Collapsible filter bar (Categoria + Tipo) -----
function isFiltersBarOpen() {
    const stored = localStorage.getItem('vanessa_expenses_filters_open');
    if (stored === '1') return true;
    if (stored === '0') return false;
    // No explicit choice: open if any filter is active.
    return hasActiveFilters();
}
function hasActiveFilters() {
    const c = document.getElementById('filter-category')?.value;
    const t = document.getElementById('filter-type')?.value;
    return Boolean(c || t);
}
function activeFiltersCount() {
    let n = 0;
    if (document.getElementById('filter-category')?.value) n++;
    if (document.getElementById('filter-type')?.value) n++;
    return n;
}
function updateFiltersSummary() {
    const txt = document.getElementById('filter-bar-summary-text');
    if (!txt) return;
    const n = activeFiltersCount();
    if (n > 0) {
        txt.textContent = `Filtros (${n} ativo${n === 1 ? '' : 's'})`;
        txt.parentElement?.classList.add('filter-bar-summary-active');
    } else {
        txt.textContent = 'Filtros';
        txt.parentElement?.classList.remove('filter-bar-summary-active');
    }
}
function applyFiltersBarOpen(open) {
    const bar = document.getElementById('filter-bar');
    const chev = document.getElementById('filter-bar-chevron');
    if (bar) bar.style.display = open ? 'flex' : 'none';
    if (chev) chev.style.transform = open ? 'rotate(180deg)' : '';
}
function toggleFiltersBar() {
    const cur = isFiltersBarOpen();
    const next = !cur;
    localStorage.setItem('vanessa_expenses_filters_open', next ? '1' : '0');
    applyFiltersBarOpen(next);
}
function initFiltersBar() {
    applyFiltersBarOpen(isFiltersBarOpen());
    updateFiltersSummary();
}

// Persisted toggle for the despesas tab list view ('category' | 'chrono').
function getExpensesView() {
    return localStorage.getItem('vanessa_expenses_view') === 'chrono' ? 'chrono' : 'category';
}
function setExpensesView(view) {
    localStorage.setItem('vanessa_expenses_view', view === 'chrono' ? 'chrono' : 'category');
    renderExpenses();
}
function getExpensesChronoFilter() {
    const v = localStorage.getItem('vanessa_expenses_filter') || 'all';
    return ['all','pending','paid','fixed','variable'].includes(v) ? v : 'all';
}
function setExpenseFilter(f) {
    localStorage.setItem('vanessa_expenses_filter', f);
    renderExpenses();
}

function renderExpenses() {
    renderQuickAdd();
    const monthExp = getMonthExpenses(currentDate).map(adjustExpenseForCoParent);
    const filterCat = document.getElementById('filter-category')?.value;
    const filterType = document.getElementById('filter-type')?.value;
    const view = getExpensesView();

    // Sync toggle/chip UI states
    const toggle = document.getElementById('expense-view-toggle');
    if (toggle) {
        toggle.querySelectorAll('.view-toggle-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.view === view);
        });
    }
    const chipsBar = document.getElementById('expense-filter-chips');
    if (chipsBar) {
        chipsBar.style.display = view === 'chrono' ? 'flex' : 'none';
        const cf = getExpensesChronoFilter();
        chipsBar.querySelectorAll('.expense-filter-chip').forEach(b => {
            b.classList.toggle('active', b.dataset.filter === cf);
        });
    }

    // Fixed expenses section
    const activeFixed = getActiveFixedForMonth(currentDate);
    const fixedSection = document.getElementById('fixed-month-section');
    const fixedList = document.getElementById('fixed-month-list');
    const titleEl = document.getElementById('other-expenses-title');

    const noFixedCta = document.getElementById('no-fixed-expenses-cta');
    if (fixedExpenses.length === 0 && noFixedCta) { noFixedCta.style.display = 'block'; } else if (noFixedCta) { noFixedCta.style.display = 'none'; }

    // Chrono view: skip the fixed-section entirely, render a flat date-sorted
    // list with day separators below. Filter chips control what gets shown.
    // We keep the section title visible because it now carries the view-toggle
    // segmented switch (otherwise the user has no way back to "Por categoria").
    if (view === 'chrono') {
        if (fixedSection) fixedSection.style.display = 'none';
        if (titleEl) titleEl.style.display = 'flex';
        // Label is empty — the toggle on the right already indicates the
        // active mode, so the redundant text was just stealing horizontal
        // room and forcing the total to wrap.
        const labelEl = document.getElementById('other-expenses-label');
        if (labelEl) labelEl.textContent = '';
        renderExpensesChrono(monthExp, filterCat, filterType);
        return;
    }
    // Category view: same reasoning — toggle conveys the mode, no label needed.
    const labelEl = document.getElementById('other-expenses-label');
    if (labelEl) labelEl.textContent = '';

    if (activeFixed.length > 0 && !filterCat && !filterType) {
        fixedSection.style.display = 'block';
        // Always apply open/closed state from localStorage on every render
        const fixedBody = document.getElementById('fixed-month-body');
        const fixedChevron = document.getElementById('fixed-section-chevron');
        const fixedIsOpen = localStorage.getItem('fixedSectionOpen') === '1';
        if (fixedBody) fixedBody.style.display = fixedIsOpen ? 'block' : 'none';
        if (fixedChevron) fixedChevron.style.transform = fixedIsOpen ? '' : 'rotate(180deg)';
        const cats = getEffectiveCategories();

        // Separate skipped from active
        const activeNotSkipped = activeFixed.filter(f => !isFixedSkipped(f.id, currentDate));
        const activeSkipped = activeFixed.filter(f => isFixedSkipped(f.id, currentDate));

        const fixedTotal = activeNotSkipped.reduce((s, f) => {
            const amount = getEffectiveFixedAmount(f, currentDate);
            const st = getFixedStatusForMonth(f.id, currentDate);
            const coParentPaid = st?.paidByFather || false;
            const child = children.find(c => c.id === f.type);
            if (f.split && coParentPaid && child) {
                return s + amount * (1 - getEffectiveSplitPct(f, child) / 100);
            }
            return s + amount;
        }, 0);
        document.getElementById('fixed-month-total').textContent = formatCurrency(fixedTotal);

        function renderFixedItem(f, skipped) {
            const effSt = getEffectiveFixedStatus(f, currentDate);
            const isPaid = effSt.status === 'pago';
            const isAuto = effSt.auto && isPaid;
            const cat = cats[f.category] || cats.outros;
            const amount = getEffectiveFixedAmount(f, currentDate);
            const child = children.find(c => c.id === f.type);
            const st = getFixedStatusForMonth(f.id, currentDate);
            const coParentPaid = st?.paidByFather || false;
            const splitPct = getEffectiveSplitPct(f, child);

            if (skipped) {
                return `
                    <div class="fixed-month-item fixed-skipped-item">
                        <div class="fixed-icon" style="width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.85rem;background:#F5F5F5;color:#BDBDBD;flex-shrink:0">
                            <i class="fas ${cat.icon}"></i>
                        </div>
                        <div style="flex:1;min-width:0">
                            <div style="font-size:0.85rem;font-weight:600;text-decoration:line-through;color:var(--text-light)">${f.description}</div>
                            <div style="font-size:0.72rem;color:var(--text-light)">Ignorado este mês</div>
                        </div>
                        <div class="fixed-month-amount" style="color:var(--text-light);text-decoration:line-through">${formatCurrency(amount)}</div>
                        <button onclick="toggleSkipFixed('${f.id}', currentDate)"
                            class="fixed-status-badge" style="border:none;cursor:pointer;background:#F5F5F5;color:#757575">
                            <i class="fas fa-rotate-left"></i> Reativar
                        </button>
                    </div>
                `;
            }

            let splitBadge = '';
            if (child && f.split) {
                splitBadge = `<button onclick="event.stopPropagation();markFixedCoParentPaid('${f.id}', currentDate, ${!coParentPaid})"
                    class="fixed-status-badge ${coParentPaid ? 'status-pago' : 'status-pendente'}" style="border:none;cursor:pointer;font-size:0.65rem;margin-left:4px">
                    ${coParentPaid ? `<i class="fas fa-check"></i> ${child.coParentName} pagou` : `<i class="fas fa-clock"></i> ${child.coParentName}?`}
                </button>`;
            }
            // Multi-person split badges for this specific month.
            const fSplits = Array.isArray(f.splits) ? f.splits : [];
            const fPaidArr = getFixedSplitsPaidForMonth(f, currentDate);
            const fixedSplitsBadge = fSplits.length
                ? fSplits.map((s, i) => {
                    const paid = !!fPaidArr[i];
                    return `<button onclick="event.stopPropagation();toggleFixedSplitPaid('${f.id}', currentDate, ${i})" class="fixed-status-badge ${paid ? 'status-pago' : 'status-pendente'}" style="border:none;cursor:pointer;font-size:0.65rem" title="${s.name}: ${formatCurrency(s.amount)}">${paid ? '<i class="fas fa-check"></i>' : '<i class="fas fa-clock"></i>'} ${s.name}</button>`;
                }).join('')
                : '';
            // Mix-partner badge + per-month toggle for fixed expenses
            let fixedMixPartnerBadge = '';
            if (f.mixPartnerPct && f.mixPartnerName) {
                const isSplit = !!f.mixPartnerSplit;
                if (isSplit) {
                    const mpPaid = !!st?.mixPartnerPaid;
                    const stateIcon = mpPaid ? '<i class="fas fa-check"></i>' : '<i class="fas fa-clock"></i>';
                    const cls = mpPaid ? 'status-pago' : 'status-pendente';
                    const bg = mpPaid ? '#E8F5E9' : '#FCE4EC';
                    const color = mpPaid ? '#2E7D32' : '#C2185B';
                    fixedMixPartnerBadge = `<span onclick="event.stopPropagation();toggleFixedMixPartnerPaid('${f.id}', currentDate)" class="fixed-status-badge ${cls}" role="button" style="background:${bg};color:${color};font-size:0.65rem;cursor:pointer"><i class="fas fa-heart"></i> ${stateIcon} ${f.mixPartnerName} ${f.mixPartnerPct}%</span>`;
                } else {
                    fixedMixPartnerBadge = `<span class="fixed-status-badge" style="background:#FCE4EC;color:#C2185B;font-size:0.65rem"><i class="fas fa-heart"></i> ${f.mixPartnerName} ${f.mixPartnerPct}%</span>`;
                }
            }
            let totalSplitsDeduction = fSplits.reduce((sum, s, i) => fPaidArr[i] ? sum + (parseFloat(s.amount) || 0) : sum, 0);
            if (f.mixPartnerPct && f.mixPartnerSplit && st?.mixPartnerPaid) {
                const base = st?.amount || f.amount;
                totalSplitsDeduction += base * (parseFloat(f.mixPartnerPct) / 100);
            }
            const gross = st?.amount || f.amount;
            const hasSplitDeduction = totalSplitsDeduction > 0;
            const netAmount = (f.split && coParentPaid && child) ? amount * (1 - splitPct / 100) : amount;

            const varBadge = f.isVariable ? `<span style="font-size:0.65rem;color:var(--primary);font-weight:600;background:#EDE7F6;padding:1px 5px;border-radius:4px">~</span>` : '';
            const varEdit = f.isVariable ? `<button onclick="event.stopPropagation();editFixedAmount('${f.id}', currentDate)" class="btn-icon" style="color:var(--primary);padding:4px" title="Editar valor real"><i class="fas fa-pen-to-square"></i></button>` : '';

            const hasExtraBadges = !!splitBadge || !!fixedSplitsBadge;
            // Mirrors the variable-expense pattern: tap the row body to open
            // editFixed; the only buttons inline are the per-month toggles
            // (pago/pendente, ignorar) plus the "real value" pen for
            // variable fixas. Each button stopPropagation so it doesn't
            // double-fire as a row click. No dedicated edit pen — the row
            // itself is the edit affordance.
            return `
                <div class="fixed-month-item" onclick="editFixed('${f.id}')" style="${isPaid ? 'opacity:0.85;' : ''}flex-wrap:wrap;cursor:pointer">
                    <div class="fixed-icon" style="width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.85rem;background:${isPaid ? '#E8F5E9' : '#EDE7F6'};color:${isPaid ? '#2E7D32' : 'var(--primary)'};flex-shrink:0">
                        <i class="fas ${cat.icon}"></i>
                    </div>
                    <div>
                        <div class="fixed-month-desc">${f.description} ${varBadge}</div>
                        <div class="fixed-month-meta"><span class="meta-day">Dia ${f.dayOfMonth}</span> &middot; ${cat.label}${child ? ` &middot; ${child.name}` : ''}${isAuto ? ' &middot; auto' : ''}${coParentPaid ? ` &middot; <span style="color:var(--success)">-${splitPct}%</span>` : ''}</div>
                    </div>
                    <div class="fixed-month-amount" style="${coParentPaid || hasSplitDeduction ? 'color:var(--success)' : f.isVariable && amount !== f.amount ? 'color:var(--primary)' : ''}">
                        ${coParentPaid ? `<span style="text-decoration:line-through;font-size:0.7rem;color:var(--text-light);margin-right:3px">${formatCurrency(amount)}</span>${formatCurrency(netAmount)}`
                          : hasSplitDeduction ? `<span style="text-decoration:line-through;font-size:0.7rem;color:var(--text-light);margin-right:3px">${formatCurrency(gross)}</span>${formatCurrency(amount)}`
                          : formatCurrency(amount)}
                    </div>
                    <div style="flex-basis:100%;display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-top:6px">
                        <button onclick="event.stopPropagation();markFixedPaid('${f.id}', currentDate, ${!isPaid})"
                            class="fixed-status-badge ${isPaid ? 'status-pago' : 'status-pendente'}" style="border:none;cursor:pointer">
                            ${isPaid ? '<i class="fas fa-check"></i> Pago' : '<i class="fas fa-clock"></i> Pendente'}
                        </button>
                        ${varEdit}
                        <button onclick="event.stopPropagation();duplicateFixed('${f.id}')" class="btn-icon" style="color:#E65100;padding:4px" title="Duplicar">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button onclick="event.stopPropagation();toggleSkipFixed('${f.id}', currentDate)" class="btn-icon" style="color:var(--text-light);padding:4px" title="Ignorar este mês">
                            <i class="fas fa-ban"></i>
                        </button>
                        <button onclick="event.stopPropagation();confirmDeleteFixed('${f.id}')" class="btn-icon" style="color:var(--danger);padding:4px" title="Apagar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    ${hasExtraBadges || fixedMixPartnerBadge ? `<div style="flex-basis:100%;display:flex;flex-wrap:wrap;gap:4px;padding-top:6px;margin-top:4px;border-top:1px dashed var(--border)">${splitBadge}${fixedSplitsBadge}${fixedMixPartnerBadge}</div>` : ''}
                </div>
            `;
        }

        // Group active (non-skipped) fixed expenses by category. Categories
        // with a single fixa render inline; 2+ collapse into a category row
        // matching the variável list. Skipped ones stay as plain rows below.
        const fixedByCat = new Map();
        for (const f of activeNotSkipped) {
            const k = f.category || 'outros';
            if (!fixedByCat.has(k)) fixedByCat.set(k, []);
            fixedByCat.get(k).push(f);
        }
        const fixedGroupedHtml = [];
        const fixedInlineHtml = [];
        for (const [k, items] of fixedByCat) {
            if (items.length >= 2) fixedGroupedHtml.push(renderCategoryGroupRow(k, items, 'fixed', f => renderFixedItem(f, false)));
            else fixedInlineHtml.push(renderFixedItem(items[0], false));
        }
        fixedList.innerHTML = [
            ...fixedGroupedHtml,
            ...fixedInlineHtml,
            ...activeSkipped.map(f => renderFixedItem(f, true))
        ].join('');
        titleEl.style.display = 'flex';
    } else {
        fixedSection.style.display = 'none';
        // Always show the title (with the view toggle); helps the user switch
        // back to chrono even when there's nothing in the list.
        titleEl.style.display = 'flex';
    }

    let filtered = monthExp;
    if (filterCat) filtered = filtered.filter(e => e.category === filterCat);
    if (filterType) filtered = filtered.filter(e => e.type === filterType);
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    const otherTotal = filtered.filter(expenseAffectsBalance).reduce((s, e) => s + e.amount, 0);
    const otherTotalEl = document.getElementById('other-expenses-total');
    if (otherTotalEl) otherTotalEl.textContent = filtered.length > 0 ? `(${filtered.length}) ${formatCurrency(otherTotal)}` : '';

    const container = document.getElementById('expenses-list');
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>Sem despesas para mostrar</p></div>';
        return;
    }

    // Partition prepaid card rows (top-ups + linked spends) so they collapse
    // into a single per-card group row. Keeps the despesas list tidy when a
    // user has many small card consumos sharing the same top-up.
    const prepaidByCard = new Map();
    const nonPrepaid = [];
    for (const e of filtered) {
        if (e.prepaidCardId) {
            if (!prepaidByCard.has(e.prepaidCardId)) prepaidByCard.set(e.prepaidCardId, []);
            prepaidByCard.get(e.prepaidCardId).push(e);
        } else {
            nonPrepaid.push(e);
        }
    }

    // Then group non-prepaid by category. Categories with a single
    // expense pass through unchanged so we don't add chrome around a
    // single row. The user can still tap to edit either way.
    const byCategory = new Map();
    for (const e of nonPrepaid) {
        const k = e.category || 'outros';
        if (!byCategory.has(k)) byCategory.set(k, []);
        byCategory.get(k).push(e);
    }
    const groupedHtml = [];
    const inlineHtml = [];
    for (const [k, items] of byCategory) {
        if (items.length >= 2) groupedHtml.push(renderCategoryGroupRow(k, items, 'var', e => renderExpenseItem(e)));
        else inlineHtml.push(renderExpenseItem(items[0]));
    }
    // Sort the category groups by total desc so the heaviest sit on top.
    groupedHtml.sort((a, b) => 0); // already in insertion order; keep date-sorted upstream

    container.innerHTML = [
        ...[...prepaidByCard.entries()].map(([cardId, items]) => renderPrepaidGroupRow(cardId, items)),
        ...groupedHtml,
        ...inlineHtml
    ].join('');
}

// Standalone fixed-row renderer for the chronological view. The variable
// counterpart is renderExpenseItem; the fixed renderer used by category
// view is a closure inside renderExpenses, so we duplicate a slimmed-down
// version here. Reuses the same status helpers / quick-action handlers so
// behaviour stays consistent.
function renderFixedItemChrono(f) {
    const cats = getEffectiveCategories();
    const cat = cats[f.category] || cats.outros;
    const effSt = getEffectiveFixedStatus(f, currentDate);
    const isPaid = effSt.status === 'pago';
    const amount = getEffectiveFixedAmount(f, currentDate);
    const child = children.find(c => c.id === f.type);
    const maxDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const day = Math.min(f.dayOfMonth, maxDay);
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    // Match the category view's quick-actions for fixed rows so users have the
    // same shortcuts (toggle paid, duplicate, skip, delete) regardless of mode.
    return `
        <div class="expense-item" onclick="editFixed('${f.id}')" style="cursor:pointer;border-left:3px solid ${cat.color || '#9E9E9E'}">
            <div class="expense-icon" style="background:${isPaid ? '#E8F5E9' : '#EDE7F6'};color:${isPaid ? '#2E7D32' : 'var(--primary)'}">
                <i class="fas ${cat.icon}"></i>
            </div>
            <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                    <div class="expense-desc">${f.description} <span style="font-size:0.62rem;background:#EDE7F6;color:var(--primary);padding:1px 5px;border-radius:4px;font-weight:700">fixa</span></div>
                    <div class="expense-amount" style="flex-shrink:0">${formatCurrency(amount)}</div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;gap:8px">
                    <div class="expense-meta">
                        <span>${formatDate(dateStr)}</span> &middot; <span>${cat.label}</span>${child ? ` &middot; <span>${child.name}</span>` : ''}
                    </div>
                    <div class="expense-actions" style="display:flex;align-items:center;gap:4px">
                        <button onclick="event.stopPropagation();markFixedPaid('${f.id}', currentDate, ${!isPaid})" class="fixed-status-badge ${isPaid ? 'status-pago' : 'status-pendente'}" style="border:none;cursor:pointer;font-size:0.62rem;padding:2px 6px" title="${isPaid ? 'Marcar como pendente' : 'Marcar como pago'}">
                            ${isPaid ? '<i class="fas fa-check"></i> Pago' : '<i class="fas fa-clock"></i> Pendente'}
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation();duplicateFixed('${f.id}')" title="Duplicar" style="color:#E65100;padding:4px"><i class="fas fa-copy"></i></button>
                        <button class="btn-icon" onclick="event.stopPropagation();toggleSkipFixed('${f.id}', currentDate)" title="Ignorar este mês" style="color:var(--text-light);padding:4px"><i class="fas fa-ban"></i></button>
                        <button class="btn-icon" onclick="event.stopPropagation();confirmDeleteFixed('${f.id}')" title="Apagar" style="color:var(--danger);padding:4px"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Chronological flat list of all expenses (variable + fixed) for the month.
// Inserts a thin "— DD MMM (N)" separator whenever a new day starts.
function renderExpensesChrono(monthExp, filterCat, filterType) {
    const container = document.getElementById('expenses-list');
    if (!container) return;
    const monthsAbbr = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const chronoFilter = getExpensesChronoFilter();

    // Build unified list. For fixed: every active fixa for the month, dated on
    // its day-of-month. We pull the underlying templates (not getPaidFixedAsExpenses)
    // so pending ones still appear.
    const activeFixed = getActiveFixedForMonth(currentDate);
    const skippedSet = new Set(activeFixed.filter(f => isFixedSkipped(f.id, currentDate)).map(f => f.id));
    const fixedRows = activeFixed
        .filter(f => !skippedSet.has(f.id))
        .map(f => {
            const maxDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
            const day = Math.min(f.dayOfMonth, maxDay);
            const date = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isPaid = getEffectiveFixedStatus(f, currentDate).status === 'pago';
            return { _kind: 'fixed', _isPaid: isPaid, date, category: f.category, type: f.type || 'personal', _f: f };
        });

    const varRows = monthExp.map(e => ({ ...e, _kind: 'var', _isPaid: true }));

    let all = [...varRows, ...fixedRows];
    if (filterCat) all = all.filter(e => e.category === filterCat);
    if (filterType) all = all.filter(e => e.type === filterType);

    if (chronoFilter === 'fixed') all = all.filter(e => e._kind === 'fixed');
    else if (chronoFilter === 'variable') all = all.filter(e => e._kind === 'var');
    else if (chronoFilter === 'paid') all = all.filter(e => e._isPaid);
    else if (chronoFilter === 'pending') all = all.filter(e => !e._isPaid);

    all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Refresh the section title total. Match the dashboard "Ciclo Salarial"
    // convention: "pago / total compromisso". The previous single-number
    // version mixed already-paid spending with pending fixas (effectively
    // showing future commitments as if spent), inflating the figure relative
    // to the resumo card and confusing the user. Now we split:
    //   pago     = variables that affect balance + fixas with status 'pago'
    //   total    = pago + fixas pendentes (compromisso do mês)
    // Rendered as `(N) 92,65 € / 944,29 €`, ignored fixas excluded earlier.
    const otherTotalEl = document.getElementById('other-expenses-total');
    if (otherTotalEl) {
        let paid = 0, pending = 0;
        for (const e of all) {
            if (e._kind === 'fixed') {
                const amt = getEffectiveFixedAmount(e._f, currentDate) || 0;
                if (e._isPaid) paid += amt; else pending += amt;
            } else if (expenseAffectsBalance(e)) {
                paid += e.amount || 0;
            }
        }
        const total = paid + pending;
        // Compact short form (no "EUR" suffix on the first number, € symbol
        // on the total) so the split fits next to the toggle on a phone.
        const shortPaid = formatCurrency(paid).replace(' EUR', '');
        if (all.length === 0) {
            otherTotalEl.innerHTML = '';
        } else if (pending > 0) {
            otherTotalEl.innerHTML = `(${all.length}) <span style="color:var(--primary)">${shortPaid}</span><span style="color:var(--text-light);font-weight:500"> / ${formatCurrency(total).replace(' EUR', ' €')}</span>`;
        } else {
            otherTotalEl.textContent = `(${all.length}) ${formatCurrency(paid)}`;
        }
    }

    if (all.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>Sem despesas para mostrar</p></div>';
        return;
    }

    // Group by day for separators
    const byDay = new Map();
    for (const e of all) {
        const k = e.date || '';
        if (!byDay.has(k)) byDay.set(k, []);
        byDay.get(k).push(e);
    }

    const today = new Date();
    const todayStr = toLocalDateStr(today);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateStr(yesterday);

    const out = [];
    for (const [dateStr, items] of byDay) {
        let label;
        if (dateStr === todayStr) label = 'Hoje';
        else if (dateStr === yesterdayStr) label = 'Ontem';
        else if (dateStr) {
            const [y, m, d] = dateStr.split('-').map(Number);
            label = `${String(d).padStart(2,'0')} ${monthsAbbr[m-1]}`;
        } else {
            label = 'Sem data';
        }
        const dayTotal = items.filter(e => e._kind === 'var' ? expenseAffectsBalance(e) : true)
            .reduce((s, e) => s + (e._kind === 'fixed' ? getEffectiveFixedAmount(e._f, currentDate) : (e.amount || 0)), 0);
        out.push(`<div class="day-separator"><span>— ${label} (${items.length})</span><span class="day-separator-total">${formatCurrency(dayTotal)}</span></div>`);
        for (const e of items) {
            out.push(e._kind === 'fixed' ? renderFixedItemChrono(e._f) : renderExpenseItem(e));
        }
    }
    container.innerHTML = out.join('');
}

// Generic "category group" row used by both variable and fixed expense
// lists. Shows category icon + label + total + count, expandable to
// reveal the underlying rows. kind is 'var' or 'fixed' so the toggle
// state matches the section. The caller passes the per-row renderer
// since renderFixedItem is a closure inside renderExpenses (it captures
// currentDate-dependent state and the cats lookup).
function renderCategoryGroupRow(catKey, items, kind, renderItem) {
    const cats = getEffectiveCategories();
    const cat = cats[catKey] || cats.outros;
    const total = items.filter(e => kind === 'fixed' ? true : expenseAffectsBalance(e)).reduce((s, e) => s + (e.amount || 0), 0);
    const groupKey = `cat-${kind}-${catKey}`;
    const isOpen = (window._categoryGroupOpen || {})[groupKey];
    const innerRows = items.map(renderItem).join('');
    const accent = cat.color || '#9E9E9E';
    return `
        <div class="expense-item category-group-row" style="border-left:3px solid ${accent};flex-direction:column;align-items:stretch">
            <div onclick="toggleCategoryGroup('${groupKey}')" style="display:flex;align-items:center;gap:10px;cursor:pointer;width:100%">
                <div class="expense-icon cat-${catKey}"><i class="fas ${cat.icon}"></i></div>
                <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                        <div class="expense-desc">${cat.label} <span style="font-size:0.7rem;color:var(--text-light);font-weight:500;margin-left:4px">(${items.length})</span></div>
                        <div class="expense-amount" style="flex-shrink:0">${formatCurrency(total)}</div>
                    </div>
                    <div class="expense-meta" style="margin-top:4px">
                        <span>${items.length} ${items.length === 1 ? 'lançamento' : 'lançamentos'}</span>
                        <i class="fas fa-chevron-${isOpen ? 'up' : 'down'}" style="color:var(--text-light);font-size:0.7rem;margin-left:auto"></i>
                    </div>
                </div>
            </div>
            <div style="display:${isOpen ? 'block' : 'none'};margin-top:10px;padding-top:8px;border-top:1px dashed var(--border)">${innerRows}</div>
        </div>
    `;
}

function toggleCategoryGroup(groupKey) {
    window._categoryGroupOpen = window._categoryGroupOpen || {};
    window._categoryGroupOpen[groupKey] = !window._categoryGroupOpen[groupKey];
    renderExpenses();
}

// One-row "card group" that aggregates the month's top-ups and linked spends
// for a single prepaid card. Tapping the row toggles an embedded sub-list of
// the underlying renderExpenseItem rows so the user can still edit each one.
function renderPrepaidGroupRow(cardId, items) {
    const card = (typeof prepaidCards !== 'undefined' ? prepaidCards : []).find(c => c.id === cardId);
    const cardName = card?.name || 'Cartão';
    const cardColor = card?.color || '#5A3BD8';
    const cardIcon = card?.icon || 'fa-credit-card';
    const topups = items.filter(e => e.isPrepaidTopup);
    const spends = items.filter(e => !e.isPrepaidTopup);
    const topupTotal = topups.reduce((s, e) => s + (e.fullAmount || e.amount), 0);
    const spendTotal = spends.reduce((s, e) => s + (e.fullAmount || e.amount), 0);
    const balance = (typeof getPrepaidBalance === 'function' && card) ? getPrepaidBalance(cardId) : null;
    const groupId = `prepaid-group-${cardId}`;
    const isOpen = (window._prepaidGroupOpen || {})[cardId];
    const innerRows = items
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(e => renderExpenseItem(e))
        .join('');
    const balanceTxt = balance != null ? ` &middot; saldo ${formatCurrency(balance)}` : '';
    return `
        <div class="expense-item prepaid-group-row" style="border-left:3px solid ${cardColor};background:#FBF9FF;flex-direction:column;align-items:stretch">
            <div onclick="togglePrepaidGroup('${cardId}')" style="display:flex;align-items:center;gap:10px;cursor:pointer;width:100%">
                <div class="expense-icon" style="background:#EEE7FF;color:${cardColor}">
                    <i class="fas ${cardIcon}"></i>
                </div>
                <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                        <div class="expense-desc">${cardName} <span style="font-size:0.65rem;color:#5A3BD8;background:#EEE7FF;padding:1px 5px;border-radius:4px;font-weight:700">cartão</span></div>
                        <div class="expense-amount" style="color:var(--text);flex-shrink:0" title="Carregamentos do mês — os consumos já estão incluídos">${formatCurrency(topupTotal)}</div>
                    </div>
                    <div class="expense-meta" style="margin-top:4px">
                        <span><i class="fas fa-arrow-up" style="color:var(--success);font-size:0.65rem"></i> ${topups.length} carreg. ${formatCurrency(topupTotal)}</span>
                        <span><i class="fas fa-arrow-down" style="color:var(--text-light);font-size:0.65rem"></i> ${spends.length} consumo${spends.length === 1 ? '' : 's'} ${formatCurrency(spendTotal)} <span style="font-size:0.65rem;opacity:0.7">(já no carreg.)</span></span>
                        ${balanceTxt ? `<span style="color:var(--text-light)">${balanceTxt}</span>` : ''}
                        <i class="fas fa-chevron-${isOpen ? 'up' : 'down'}" style="color:var(--text-light);font-size:0.7rem;margin-left:auto"></i>
                    </div>
                </div>
            </div>
            <div id="${groupId}" style="display:${isOpen ? 'block' : 'none'};margin-top:10px;padding-top:8px;border-top:1px dashed var(--border)">${innerRows}</div>
        </div>
    `;
}

function togglePrepaidGroup(cardId) {
    window._prepaidGroupOpen = window._prepaidGroupOpen || {};
    window._prepaidGroupOpen[cardId] = !window._prepaidGroupOpen[cardId];
    renderExpenses();
}

function toggleExpenseCoParent(id) {
    const idx = expenses.findIndex(e => e.id === id);
    if (idx < 0) return;
    expenses[idx].paidByFather = !expenses[idx].paidByFather;
    saveData();
    updateAll();
    showToast(expenses[idx].paidByFather ? 'Marcado como pago!' : 'Marcado como pendente');
}

function toggleExpenseSpousePaid(id) {
    const idx = expenses.findIndex(e => e.id === id);
    if (idx < 0) return;
    expenses[idx].spousePaid = !expenses[idx].spousePaid;
    saveData();
    updateAll();
    showToast(expenses[idx].spousePaid ? `${getSpouseName()} pagou!` : 'Marcado como pendente');
}

// ===== GROUPED EXPENSES (incremental entries) =====
function computeGroupedTotal(e) {
    if (!e.isGrouped || !Array.isArray(e.entries)) return e.amount;
    return e.entries.reduce((s, x) => s + (x.amount || 0), 0);
}

let pendingGroupedEntryId = null;
function addGroupedEntry(id) {
    const idx = expenses.findIndex(e => e.id === id);
    if (idx < 0) return;
    const e = expenses[idx];
    if (!e.isGrouped) {
        e.isGrouped = true;
        e.entries = [{ eid: generateId(), date: e.date, amount: e.amount, notes: e.notes || '', type: e.type }];
        expenses[idx] = e;
    }
    pendingGroupedEntryId = id;
    document.getElementById('grouped-entry-title').textContent = `Nova entrada: ${e.description}`;
    document.getElementById('grouped-entry-amount').value = '';
    document.getElementById('grouped-entry-date').valueAsDate = new Date();
    document.getElementById('grouped-entry-notes').value = '';
    const withGroup = document.getElementById('grouped-entry-with-group');
    const withSel = document.getElementById('grouped-entry-with');
    if (withGroup && withSel && children.length >= 2) {
        const allLabel = children.length === 2 ? 'Ambos' : 'Todos';
        const childOpts = children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        withSel.innerHTML = childOpts + `<option value="both">${allLabel}</option><option value="personal">Pessoal</option>`;
        withSel.value = e.type || 'personal';
        withGroup.style.display = 'block';
    } else if (withGroup) {
        withGroup.style.display = 'none';
    }
    document.getElementById('modal-grouped-entry').classList.add('active');
    // Per-entry partner toggle: only visible in separated mode with a configured
    // partner. Lets the user mark this particular entry as "with partner"
    // without affecting other entries of the same group.
    const pGrp = document.getElementById('grouped-entry-partner-group');
    const pCb = document.getElementById('grouped-entry-with-partner');
    const pName = document.getElementById('grouped-entry-partner-name');
    const partnerName = getPartnerName();
    if (pGrp) {
        const show = !isMarriedMode() && !!partnerName;
        pGrp.style.display = show ? 'block' : 'none';
        if (show && pName) pName.textContent = partnerName;
        if (pCb) pCb.checked = false;
    }
    setTimeout(() => document.getElementById('grouped-entry-amount').focus(), 100);
}

function saveGroupedEntry(event) {
    event.preventDefault();
    const id = pendingGroupedEntryId;
    if (!id) return;
    const idx = expenses.findIndex(e => e.id === id);
    if (idx < 0) return;
    const amount = parseFloat(document.getElementById('grouped-entry-amount').value);
    const date = document.getElementById('grouped-entry-date').value;
    const notes = document.getElementById('grouped-entry-notes').value.trim();
    if (isNaN(amount) || amount <= 0 || !date) { showToast('Preencha valor e data'); return; }
    const e = expenses[idx];
    const withGroup = document.getElementById('grouped-entry-with-group');
    const entryType = (withGroup && withGroup.style.display !== 'none')
        ? document.getElementById('grouped-entry-with').value
        : e.type;
    const withPartner = !!document.getElementById('grouped-entry-with-partner')?.checked;
    e.entries = e.entries || [];
    e.entries.push({ eid: generateId(), date, amount, notes, type: entryType, withPartner });
    e.amount = computeGroupedTotal(e);
    e.date = [...e.entries].sort((a, b) => b.date.localeCompare(a.date))[0].date;
    e.updatedAt = new Date().toISOString();
    expenses[idx] = e;
    saveData();
    closeGroupedEntryModal();
    updateAll();
    showToast(`Entrada adicionada: ${formatCurrency(amount)}`);
}

function closeGroupedEntryModal() {
    document.getElementById('modal-grouped-entry').classList.remove('active');
    pendingGroupedEntryId = null;
}

function removeGroupedEntry(expenseId, entryRef) {
    const idx = expenses.findIndex(e => e.id === expenseId);
    if (idx < 0) return;
    const e = expenses[idx];
    if (!e.isGrouped || !Array.isArray(e.entries)) return;
    // entryRef can be an eid (string) or a numeric index (legacy callers).
    let removeIdx = -1;
    if (typeof entryRef === 'string') {
        removeIdx = e.entries.findIndex(en => en.eid === entryRef);
    } else if (typeof entryRef === 'number') {
        removeIdx = entryRef;
    }
    if (removeIdx < 0 || removeIdx >= e.entries.length) return;
    e.entries.splice(removeIdx, 1);
    if (e.entries.length === 0) {
        // Remove whole grouped expense
        expenses.splice(idx, 1);
        saveData();
        updateAll();
        showToast('Despesa removida (sem entradas)');
        return;
    }
    e.amount = computeGroupedTotal(e);
    // Update date to latest entry
    e.date = [...e.entries].sort((a, b) => b.date.localeCompare(a.date))[0].date;
    e.updatedAt = new Date().toISOString();
    expenses[idx] = e;
    saveData();
    updateAll();
    showToast('Entrada removida');
}

function toggleGroupedExpand(id) {
    const el = document.getElementById(`grouped-entries-${id}`);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function duplicateExpense(id) {
    const orig = expenses.find(e => e.id === id);
    if (!orig) return;
    const hasCopyTag = /^\(copia\)\s/i.test(orig.description);
    const newDesc = hasCopyTag ? orig.description : `(copia) ${orig.description}`;
    // Keep the original date so duplicating an expense from May lands in
    // May, not in whatever month "today" happens to be. The user can still
    // edit afterwards if they actually want a different date.
    const dup = { ...orig, id: generateId(), description: newDesc, date: orig.date, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    delete dup.attachment;
    // Don't clone prepaid linkage — otherwise the duplicate shares the same
    // ledger tx with the original and editing one ends up opening the
    // other. The user can re-link the card on the new expense if needed.
    delete dup.prepaidCardId;
    delete dup.prepaidTxId;
    delete dup.isPrepaidTopup;
    expenses.push(dup);
    saveData();
    updateAll();
    showToast('Despesa duplicada! Edite para ajustar.');
}

function duplicateIncome(id) {
    const orig = incomes.find(e => e.id === id);
    if (!orig) return;
    const hasCopyTag = /^\(copia\)\s/i.test(orig.description);
    const newDesc = hasCopyTag ? orig.description : `(copia) ${orig.description}`;
    const dup = { ...orig, id: generateId(), description: newDesc, date: orig.date, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    delete dup.attachment;
    incomes.push(dup);
    saveData();
    updateAll();
    showToast('Receita duplicada! Edite para ajustar.');
}

function duplicateFixed(id) {
    const orig = fixedExpenses.find(f => f.id === id);
    if (!orig) return;
    const dup = { ...orig, id: generateId(), description: `(copia) ${orig.description}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    fixedExpenses.push(dup);
    saveData();
    renderFixedList();
    showToast('Despesa fixa duplicada! Edite para ajustar.');
}

function duplicateFixedIncome(id) {
    const orig = fixedIncomes.find(f => f.id === id);
    if (!orig) return;
    const dup = { ...orig, id: generateId(), description: `(copia) ${orig.description}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    fixedIncomes.push(dup);
    saveData();
    renderFixedIncomeList();
    showToast('Receita fixa duplicada! Edite para ajustar.');
}

function renderExpenseItem(e) {
    const cats = getEffectiveCategories();
    const cat = cats[e.category] || cats.outros;
    const expChild = children.find(c => c.id === e.type);
    const tagClass = expChild ? 'tag-laura' : 'tag-personal';
    const tagLabel = expChild ? expChild.name : 'Pessoal';
    const essentialIcon = e.essential === false ? '<i class="fas fa-exclamation-circle" style="color:var(--warning);font-size:0.7rem" title="Nao essencial"></i>' : '';
    const attachIcon = e.attachment ? '<i class="fas fa-paperclip expense-attachment-icon" title="Tem anexo"></i>' : '';
    const fullAmt = e.fullAmount || e.amount;
    const isFixedVirtual = e.isFixedExpense;

    let coParentBadge = '';
    if (isMarriedMode() && e.splitSpouse && !isFixedVirtual) {
        const spousePaid = e.spousePaid || false;
        const spouseName = getSpouseName();
        coParentBadge = `<button onclick="event.stopPropagation();toggleExpenseSpousePaid('${e.id}')"
            class="fixed-status-badge ${spousePaid ? 'status-pago' : 'status-pendente'}" style="border:none;cursor:pointer;font-size:0.65rem">
            ${spousePaid ? `<i class="fas fa-check"></i> ${spouseName}` : `<i class="fas fa-clock"></i> ${spouseName}?`}
        </button>`;
    } else if (!isMarriedMode() && e.split && expChild) {
        const paidByFather = e.paidByFather || false;
        if (isFixedVirtual) {
            coParentBadge = `<button onclick="event.stopPropagation();markFixedCoParentPaid('${e.fixedId}', currentDate, ${!paidByFather})"
                class="fixed-status-badge ${paidByFather ? 'status-pago' : 'status-pendente'}" style="border:none;cursor:pointer;font-size:0.65rem">
                ${paidByFather ? `<i class="fas fa-check"></i> ${expChild.coParentName}` : `<i class="fas fa-clock"></i> ${expChild.coParentName}?`}
            </button>`;
        } else {
            coParentBadge = `<button onclick="event.stopPropagation();toggleExpenseCoParent('${e.id}')"
                class="fixed-status-badge ${paidByFather ? 'status-pago' : 'status-pendente'}" style="border:none;cursor:pointer;font-size:0.65rem">
                ${paidByFather ? `<i class="fas fa-check"></i> ${expChild.coParentName}` : `<i class="fas fa-clock"></i> ${expChild.coParentName}?`}
            </button>`;
        }
    }

    const splitsArr = Array.isArray(e.splits) ? e.splits : [];
    const splitsPaidCount = splitsArr.filter(s => s.paid).length;
    const splitsAllPaid = splitsArr.length > 0 && splitsPaidCount === splitsArr.length;
    const splitsAnyPaid = splitsPaidCount > 0;
    // Partner "Dividir" + paid reduces the user's net by her attributed share.
    const mixPartnerDeduction = (e.mixPartnerPct && e.mixPartnerSplit && e.mixPartnerPaid)
        ? (fullAmt * parseFloat(e.mixPartnerPct) / 100) : 0;
    const netAmount = e.amount - mixPartnerDeduction;
    const hasDeduction = (e.paidByFather && e.split)
        || (e.spousePaid && e.splitSpouse)
        || splitsAnyPaid
        || (e.splitWithName && e.splitWithReceived)
        || mixPartnerDeduction > 0;
    const amountDisplay = hasDeduction
        ? `<span style="text-decoration:line-through;font-size:0.7rem;color:var(--text-light);margin-right:2px">${formatCurrency(fullAmt)}</span>${formatCurrency(netAmount)}`
        : formatCurrency(e.amount);
    // Split badge: one per person when few, or a summary chip when many.
    let splitWithBadge = '';
    if (splitsArr.length) {
        if (splitsArr.length === 1) {
            const s = splitsArr[0];
            splitWithBadge = `<button onclick="event.stopPropagation();toggleExpenseSplitPaid('${e.id}',0)" class="fixed-status-badge ${s.paid ? 'status-pago' : 'status-pendente'}" style="border:none;cursor:pointer;font-size:0.65rem">${s.paid ? `<i class="fas fa-check"></i> ${s.name} ${formatCurrency(s.amount)}` : `<i class="fas fa-clock"></i> ${s.name} ${formatCurrency(s.amount)}?`}</button>`;
        } else if (splitsArr.length <= 3) {
            splitWithBadge = splitsArr.map((s, i) => `<button onclick="event.stopPropagation();toggleExpenseSplitPaid('${e.id}',${i})" class="fixed-status-badge ${s.paid ? 'status-pago' : 'status-pendente'}" style="border:none;cursor:pointer;font-size:0.65rem">${s.paid ? '<i class="fas fa-check"></i>' : '<i class="fas fa-clock"></i>'} ${s.name}</button>`).join('');
        } else {
            splitWithBadge = `<span class="fixed-status-badge ${splitsAllPaid ? 'status-pago' : 'status-pendente'}" style="font-size:0.65rem"><i class="fas fa-user-group"></i> ${splitsPaidCount}/${splitsArr.length} pagos</span>`;
        }
    } else if (e.splitWithName) {
        // Legacy fallback (single person by pct)
        splitWithBadge = `<button onclick="event.stopPropagation();toggleSplitWithReceived('${e.id}')" class="fixed-status-badge ${e.splitWithReceived ? 'status-pago' : 'status-pendente'}" style="border:none;cursor:pointer;font-size:0.65rem">${e.splitWithReceived ? `<i class="fas fa-check"></i> recebi de ${e.splitWithName}` : `<i class="fas fa-clock"></i> ${e.splitWithName}?`}</button>`;
    }
    // Mix Pessoal+filho badge (one combined chip)
    let mixBadge = '';
    if (e.mixChildId && e.mixChildPct) {
        const mc = children.find(c => c.id === e.mixChildId);
        const mcName = mc?.name || 'filho';
        mixBadge = `<span class="fixed-status-badge" style="background:#EDE7F6;color:var(--primary);font-size:0.65rem"><i class="fas fa-divide"></i> ${100 - e.mixChildPct}% / ${e.mixChildPct}% ${mcName}</span>`;
    }
    // Mix Pessoal+namorado/a badge. "Dividir" makes the chip clickable (pago/por
    // receber). "Gastei" alone is a static tag.
    if (e.mixPartnerPct && e.mixPartnerName) {
        const isSplit = !!e.mixPartnerSplit;
        const paid = !!e.mixPartnerPaid;
        if (isSplit) {
            const state = paid ? ' ✓' : ' 🕐';
            const color = paid ? '#2E7D32' : '#C2185B';
            const bg = paid ? '#E8F5E9' : '#FCE4EC';
            mixBadge += `<span onclick="event.stopPropagation();toggleMixPartnerPaid('${e.id}')" title="Tocar para alternar pago/por receber" role="button" class="fixed-status-badge" style="background:${bg};color:${color};font-size:0.65rem;margin-left:${mixBadge ? '4px' : '0'};cursor:pointer"><i class="fas fa-heart"></i> ${e.mixPartnerPct}% ${e.mixPartnerName}${state}</span>`;
        } else {
            mixBadge += `<span class="fixed-status-badge" style="background:#FCE4EC;color:#C2185B;font-size:0.65rem;margin-left:${mixBadge ? '4px' : '0'}"><i class="fas fa-heart"></i> ${e.mixPartnerPct}% ${e.mixPartnerName}</span>`;
        }
    }

    // Grouped expense rendering (has entries array)
    const entryTypeLabel = (t) => {
        if (t === 'both') return children.length === 2 ? 'Ambos' : 'Todos';
        const ch = children.find(c => c.id === t);
        if (ch) return ch.name;
        if (t === 'personal') return 'Pessoal';
        return '';
    };
    const groupedBreakdown = (() => {
        if (!e.isGrouped || !Array.isArray(e.entries) || e.entries.length === 0) return '';
        if (children.length < 2) return '';
        const totals = {};
        e.entries.forEach(en => {
            const t = en.type || e.type;
            totals[t] = (totals[t] || 0) + (en.amount || 0);
        });
        const keys = Object.keys(totals);
        if (keys.length <= 1) return '';
        const parts = keys.map(k => `${entryTypeLabel(k)} ${formatCurrency(totals[k])}`).join(' · ');
        return `<span style="color:var(--text-light);font-size:0.72rem">${parts}</span>`;
    })();
    const groupedInfo = e.isGrouped && Array.isArray(e.entries)
        ? `<span style="color:var(--primary);font-weight:600"><i class="fas fa-layer-group" style="font-size:0.65rem"></i> ${e.entries.length} ${e.entries.length === 1 ? 'entrada' : 'entradas'}</span>`
        : '';

    const groupedEntriesHtml = (e.isGrouped && Array.isArray(e.entries))
        ? `<div id="grouped-entries-${e.id}" style="display:none;margin-top:8px;padding-top:8px;border-top:1px dashed var(--border)">
            ${[...e.entries].sort((a,b)=>b.date.localeCompare(a.date)).map((entry, idx) => {
                const tLabel = entryTypeLabel(entry.type || e.type);
                const showTag = tLabel && children.length >= 2;
                // Prefer the stable eid; fall back to index if (legacy) eid missing.
                const ref = entry.eid ? `'${entry.eid}'` : `${e.entries.indexOf(entry)}`;
                return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:0.78rem;border-bottom:1px solid var(--border)">
                    <span style="color:var(--text-light)">${formatDate(entry.date)}${entry.notes ? ` · ${entry.notes}` : ''}${showTag ? ` · <span style="color:var(--primary);font-weight:600">${tLabel}</span>` : ''}</span>
                    <span style="display:flex;align-items:center;gap:6px">
                        <span style="font-weight:600">${formatCurrency(entry.amount)}</span>
                        <button class="btn-icon" onclick="event.stopPropagation();removeGroupedEntry('${e.id}', ${ref})" title="Remover" style="padding:2px;color:var(--danger);font-size:0.7rem"><i class="fas fa-times"></i></button>
                    </span>
                </div>`;
            }).join('')}
            <button onclick="event.stopPropagation();addGroupedEntry('${e.id}')" class="btn btn-primary btn-sm" style="width:100%;margin-top:8px;padding:8px">
                <i class="fas fa-plus"></i> Adicionar entrada
            </button>
        </div>`
        : '';

    const catColor = cat.color || '#6C5CE7';
    const badgesRow = `${mixBadge}${splitWithBadge}${coParentBadge}`;
    // Prepaid card visual treatment: top-ups get a purple chip ("Carregamento"),
    // expenses paid from a card balance get a chip + muted strikethrough on
    // the amount because that money was already counted at top-up time.
    const linkedCard = e.prepaidCardId ? prepaidCards.find(c => c.id === e.prepaidCardId) : null;
    const isPrepaidPaid = !!(e.prepaidCardId && !e.isPrepaidTopup);
    const isPrepaidTopupRow = !!e.isPrepaidTopup;
    const prepaidChip = isPrepaidTopupRow
        ? `<span class="fixed-status-badge" style="background:#EEE7FF;color:#5A3BD8;font-size:0.65rem;font-weight:700"><i class="fas fa-arrow-up"></i> Carregamento${linkedCard ? ' ' + linkedCard.name : ''}</span>`
        : (isPrepaidPaid
            ? `<span class="fixed-status-badge" style="background:#F3EFFF;color:#5A3BD8;font-size:0.65rem;font-weight:700"><i class="fas fa-credit-card"></i> Cartão · ${linkedCard?.name || 'sem nome'}</span>`
            : '');
    const amountStyle = isPrepaidPaid
        ? 'flex-shrink:0;color:var(--text-light);text-decoration:line-through;opacity:0.7'
        : `flex-shrink:0;${hasDeduction ? 'color:var(--success)' : ''}`;
    const amountTitle = isPrepaidPaid ? 'Já pago via cartão de carregamento — não conta no total do mês' : '';
    // Prepaid-related rows get a tinted background and a thicker purple
    // accent border so they stand apart from regular cash expenses at a
    // glance. Top-ups and consumptions share the visual treatment but
    // the chip text says which one it is.
    const isPrepaidRow = isPrepaidTopupRow || isPrepaidPaid;
    const rowBg = isPrepaidRow ? 'background:#FBF9FF;' : '';
    const rowBorder = isPrepaidRow ? '#5A3BD8' : catColor;
    return `
        <div class="expense-item" onclick="${isFixedVirtual ? '' : `editExpense('${e.id}')`}" style="border-left:3px solid ${rowBorder};${rowBg}">
            <div class="expense-icon cat-${e.category}">
                <i class="fas ${cat.icon}"></i>
            </div>
            <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                    <div class="expense-desc">${e.description} ${essentialIcon} ${attachIcon} ${isFixedVirtual ? '<i class="fas fa-repeat" style="font-size:0.6rem;color:var(--text-light)" title="Despesa fixa"></i>' : ''} ${prepaidChip}</div>
                    <div class="expense-amount" style="${amountStyle}" title="${amountTitle}">${amountDisplay}</div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px">
                    <div class="expense-meta" style="min-width:0;flex:1">
                        <span>${formatDate(e.date)}</span>
                        <span class="expense-tag ${tagClass}">${tagLabel}</span>
                        ${groupedInfo}
                        ${groupedBreakdown}
                        ${e.split ? (() => { const p = getEffectiveSplitPct(e, expChild); const ov = parseFloat(e.splitPctOverride); const star = (!isNaN(ov) && ov > 0 && ov < 100) ? ' <span title="% específica desta despesa" style="color:var(--warning);font-size:0.6rem">●</span>' : ''; return `<span style="color:var(--primary)"><i class="fas fa-divide"></i> ${p}/${100-p}${star}</span>`; })() : ''}
                        ${e.splitSpouse && isMarriedMode() ? `<span style="color:var(--primary)"><i class="fas fa-divide"></i> ${getSpousePct()}/${100-getSpousePct()}</span>` : ''}
                        ${(e.withPeople && e.withPeople.length > 0) ? `<span style="color:var(--primary)"><i class="fas fa-user-group" style="font-size:0.65rem"></i> ${e.withPeople.slice(0,2).join(', ')}${e.withPeople.length > 2 ? ` +${e.withPeople.length-2}` : ''}</span>` : ''}
                    </div>
                    <div class="expense-actions" style="flex-shrink:0">
                        ${e.isGrouped && !isFixedVirtual ? `<button onclick="event.stopPropagation();addGroupedEntry('${e.id}')" title="Adicionar entrada" class="btn-grouped-add"><i class="fas fa-plus"></i></button>` : ''}
                        ${e.isGrouped && !isFixedVirtual ? `<button class="btn-icon" onclick="event.stopPropagation();toggleGroupedExpand('${e.id}')" title="Ver entradas" style="color:var(--primary)"><i class="fas fa-chevron-down"></i></button>` : ''}
                        ${e.attachment ? `<button class="btn-icon" onclick="event.stopPropagation();viewAttachment('${e.id}')" title="Ver anexo"><i class="fas fa-image"></i></button>` : ''}
                        ${!isFixedVirtual ? `<button class="btn-icon" onclick="event.stopPropagation();saveAsTemplate('${e.id}')" title="Guardar como frequente"><i class="fas fa-star"></i></button>` : ''}
                        ${!isFixedVirtual && !e.isGrouped ? `<button class="btn-icon" onclick="event.stopPropagation();duplicateExpense('${e.id}')" title="Duplicar"><i class="fas fa-copy"></i></button>` : ''}
                        ${!isFixedVirtual ? `<button class="btn-icon" onclick="event.stopPropagation();confirmDelete('${e.id}')" title="Apagar"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
                ${badgesRow ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">${badgesRow}</div>` : ''}
                ${groupedEntriesHtml}
            </div>
        </div>
    `;
}

// ===== INCOME TAB =====
function renderIncomeTab() {
    const monthInc = getEffectiveMonthIncomes(currentDate);
    const monthExp = getEffectiveMonthExpenses(currentDate);
    const totalIncome = monthInc.reduce((s, e) => s + e.amount, 0);
    // Include ALL active fixed expenses (paid + pending, excluding ignored) for a realistic total
    const activeFixed = getActiveFixedForMonth(currentDate);
    const fixedExpTotal = activeFixed
        .filter(f => !isFixedSkipped(f.id, currentDate))
        .reduce((s, f) => {
            const amount = getEffectiveFixedAmount(f, currentDate);
            const st = getFixedStatusForMonth(f.id, currentDate);
            const child = children.find(c => c.id === f.type);
            const coParentPaid = st?.paidByFather || false;
            return s + (f.split && coParentPaid && child ? amount * (1 - getEffectiveSplitPct(f, child) / 100) : amount);
        }, 0);
    const varExpTotal = monthExp.filter(e => !e.isFixedExpense).reduce((s, e) => s + e.amount, 0);
    const totalExpenses = varExpTotal + fixedExpTotal;
    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;

    document.getElementById('income-total').textContent = formatCurrency(totalIncome);
    document.getElementById('income-expenses-total').textContent = formatCurrency(totalExpenses);
    const balEl = document.getElementById('income-balance');
    balEl.textContent = formatCurrency(balance);
    balEl.style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)';
    const rateEl = document.getElementById('income-savings-rate');
    rateEl.textContent = savingsRate + '%';
    rateEl.style.color = savingsRate >= 20 ? 'var(--success)' : savingsRate >= 0 ? 'var(--warning)' : 'var(--danger)';

    // Carry-over section
    const carryOver = getCarryOverStored(currentDate);
    const carrySection = document.getElementById('carry-over-section');
    if (carrySection) {
        if (carryOver > 0) {
            carrySection.style.display = 'block';
            document.getElementById('carry-over-amount').textContent = formatCurrency(carryOver);
        } else {
            carrySection.style.display = 'none';
        }
    }

    // Fixed income section
    const activeFixedInc = getActiveFixedIncomesForMonth(currentDate);
    const fixedIncSection = document.getElementById('fixed-income-section');
    const fixedIncList = document.getElementById('fixed-income-list');
    const noFixedIncCta = document.getElementById('no-fixed-incomes-cta');
    if (fixedIncomes.length === 0 && noFixedIncCta) { noFixedIncCta.style.display = 'block'; } else if (noFixedIncCta) { noFixedIncCta.style.display = 'none'; }

    if (activeFixedInc.length > 0 && fixedIncSection && fixedIncList) {
        fixedIncSection.style.display = 'block';
        const incCats = getEffectiveIncomeCategories();
        const fixedIncTotal = activeFixedInc.reduce((s, fi) => s + getEffectiveFixedIncomeAmount(fi, currentDate), 0);
        document.getElementById('fixed-income-total').textContent = formatCurrency(fixedIncTotal);
        fixedIncList.innerHTML = activeFixedInc.map(fi => {
            const st = getEffectiveFixedIncomeStatus(fi, currentDate);
            const isReceived = st.status === 'recebido';
            const cat = incCats[fi.category] || incCats.outros_receita;
            const amount = getEffectiveFixedIncomeAmount(fi, currentDate);
            const varBadge = fi.isVariable ? `<span style="font-size:0.65rem;color:#2E7D32;font-weight:600;background:#E8F5E9;padding:1px 5px;border-radius:4px">~</span>` : '';
            const varEdit = fi.isVariable ? `<button onclick="event.stopPropagation();editFixedIncomeAmount('${fi.id}', currentDate)" class="btn-icon" style="color:#2E7D32;padding:4px" title="Editar valor real"><i class="fas fa-pen-to-square"></i></button>` : '';
            const today2 = new Date();
            const payDate2 = getFixedIncomePaymentDate(fi, today2.getFullYear(), today2.getMonth());
            const waitingForDay = fi.onlyOnDay && !isReceived && today2 < payDate2;
            const modeLabel = fi.paymentMode === 'last-working-day' ? 'último dia útil'
                : fi.paymentMode === 'working-day-after' ? `1.º útil após ${fi.dayOfMonth}`
                : `Dia ${fi.dayOfMonth}`;
            // Same row-tap-to-edit pattern as despesas fixas: tap the body
            // to open editFixedIncome; per-month controls + duplicate +
            // delete sit on a second flex row, all stopPropagation.
            return `
                <div class="fixed-month-item" onclick="editFixedIncome('${fi.id}')" style="flex-wrap:wrap;cursor:pointer;${waitingForDay ? 'opacity:0.6;' : ''}">
                    <div class="fixed-icon" style="width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.85rem;background:#E8F5E9;color:#2E7D32;flex-shrink:0">
                        <i class="fas ${cat.icon || 'fa-coins'}"></i>
                    </div>
                    <div>
                        <div class="fixed-month-desc">${fi.description} ${varBadge}${(() => { const cpChild = fi.coParentChildId ? children.find(c => c.id === fi.coParentChildId) : null; return cpChild ? ` <span style="font-size:0.65rem;color:#5A3BD8;background:#EEE7FF;padding:1px 5px;border-radius:4px;font-weight:600">${cpChild.coParentName || 'co-prog.'} → ${cpChild.name}</span>` : ''; })()}</div>
                        <div class="fixed-month-meta"><span class="meta-day" style="color:#2E7D32">${modeLabel}</span>${fi.isVariable && amount !== fi.amount ? ` &middot; base: ${formatCurrency(fi.amount)}` : ''}${waitingForDay ? ' &middot; <i class="fas fa-hourglass-half"></i> aguarda' : ''}</div>
                    </div>
                    <div class="fixed-month-amount" style="color:${waitingForDay ? 'var(--text-light)' : 'var(--success)'}">${fi.isVariable && amount !== fi.amount ? `<span style="text-decoration:line-through;font-size:0.7rem;color:var(--text-light);margin-right:3px">${formatCurrency(fi.amount)}</span>` : ''}+${formatCurrency(amount)}</div>
                    <div style="flex-basis:100%;display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-top:6px">
                        <button onclick="event.stopPropagation();markFixedIncomePaid('${fi.id}', currentDate, ${!isReceived})"
                            class="fixed-status-badge ${isReceived ? 'status-pago' : 'status-pendente'}" style="border:none;cursor:pointer">
                            ${isReceived ? '<i class="fas fa-check"></i> Recebido' : '<i class="fas fa-clock"></i> Pendente'}
                        </button>
                        ${varEdit}
                        <button onclick="event.stopPropagation();duplicateFixedIncome('${fi.id}')" class="btn-icon" style="color:#E65100;padding:4px" title="Duplicar">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button onclick="event.stopPropagation();confirmDeleteFixedIncome('${fi.id}')" class="btn-icon" style="color:var(--danger);padding:4px" title="Apagar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } else if (fixedIncSection) {
        fixedIncSection.style.display = 'none';
    }

    const realInc = getMonthIncomes(currentDate);
    const container = document.getElementById('income-list');
    if (realInc.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-coins"></i><p>Sem receitas este mes</p></div>';
        return;
    }
    realInc.sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = realInc.map(e => {
        const cats = getEffectiveIncomeCategories();
        const cat = cats[e.category] || cats.outros_receita;
        const attachIcon = e.attachment ? '<i class="fas fa-paperclip expense-attachment-icon" title="Tem anexo"></i>' : '';
        return `
            <div class="income-item" onclick="editIncome('${e.id}')">
                <div class="income-icon">
                    <i class="fas ${cat.icon}"></i>
                </div>
                <div class="expense-info">
                    <div class="expense-desc">${e.description} ${attachIcon}</div>
                    <div class="expense-meta">
                        <span>${formatDate(e.date)}</span>
                        <span>${cat.label}</span>
                    </div>
                </div>
                <div class="income-amount">+${formatCurrency(e.amount)}</div>
                <div class="expense-actions">
                    ${e.attachment ? `<button class="btn-icon" onclick="event.stopPropagation();viewIncomeAttachment('${e.id}')" title="Ver anexo"><i class="fas fa-image"></i></button>` : ''}
                    <button class="btn-icon" onclick="event.stopPropagation();duplicateIncome('${e.id}')" title="Duplicar"><i class="fas fa-copy"></i></button>
                    <button class="btn-icon" onclick="event.stopPropagation();confirmDeleteIncome('${e.id}')" title="Apagar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== CHILDREN TAB =====
function getActiveChild() {
    return children[0] || null;
}

function onChildSelectChange() {} // no-op, kept for backwards compat

function batchToggleCoParent(childId, markPaid) {
    const monthExpAll = getEffectiveMonthExpenses(currentDate);
    const childSplit = monthExpAll.filter(e => e.type === childId && e.split);
    childSplit.forEach(e => {
        if (e.isFixedExpense) {
            markFixedCoParentPaidSilent(e.fixedId, currentDate, markPaid);
        } else {
            const idx = expenses.findIndex(x => x.id === e.id);
            if (idx >= 0) expenses[idx].paidByFather = markPaid;
        }
    });
    saveData();
    updateAll();
    showToast(markPaid ? 'Todas marcadas como pagas!' : 'Todas marcadas como pendentes');
}

function markFixedCoParentPaidSilent(fixedId, date, paidByCoParent) {
    const monthKey = getFixedMonthKey(date);
    const idx = fixedStatus.findIndex(s => s.fixedId === fixedId && s.month === monthKey);
    if (idx >= 0) {
        fixedStatus[idx].paidByFather = paidByCoParent;
    } else {
        fixedStatus.push({ fixedId, month: monthKey, status: 'pendente', paidByFather: paidByCoParent });
    }
}

function renderChildrenTab() {
    // Family tab header logic — partner block, then children block.
    // Each section's header only renders when there's something to show.
    const partnerHdr = document.getElementById('family-partner-header');
    const childrenHdr = document.getElementById('family-children-header');
    const partnerLabel = document.getElementById('family-partner-header-label');
    const partnerName = getPartnerName();
    const showPartner = !isMarriedMode() && !!partnerName;
    if (partnerHdr) partnerHdr.style.display = showPartner ? 'block' : 'none';
    if (showPartner && partnerLabel) partnerLabel.textContent = `Gastos com ${partnerName}`;
    if (childrenHdr) childrenHdr.style.display = children.length ? 'block' : 'none';
    // Partner summary card itself is rendered by renderPartnerSummary() —
    // it lives inside #family-partner-section so calling it here keeps the
    // tab in sync when the user switches months.
    renderPartnerSummary();

    const container = document.getElementById('children-content');
    if (!container) return;
    if (!children.length) {
        // Show the empty state only when neither partner nor children exist.
        // Otherwise the partner card alone is the page.
        if (showPartner) { container.innerHTML = ''; return; }
        container.innerHTML = `
            <div class="empty-state" style="padding:40px 20px">
                <i class="fas fa-users" style="font-size:2rem;color:var(--text-muted);margin-bottom:12px"></i>
                <p style="margin-bottom:12px">Nao tem familiares configurados</p>
                <button onclick="showSettingsModal();setTimeout(()=>switchSettingsTab('children'),100)" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Adicionar filho ou conjuge
                </button>
            </div>
        `;
        return;
    }

    const monthExpAll = getEffectiveMonthExpenses(currentDate);

    const married = isMarriedMode();
    // Summary cards for each child (compact)
    const summaryHtml = children.map(child => {
        const childExp = monthExpAll.filter(e => e.type === child.id);
        const total = childExp.reduce((s, e) => s + (e.fullAmount || e.amount), 0);
        if (married || child.hasSplit === false) {
            return `
                <div class="card split-summary-card" style="margin-bottom:8px">
                    <h3 style="display:flex;align-items:center;justify-content:space-between">
                        <span><i class="fas fa-child"></i> ${child.name}</span>
                        <span style="font-size:1rem;font-weight:700;color:var(--primary)">${formatCurrency(total)}</span>
                    </h3>
                    <div style="font-size:0.75rem;color:var(--text-light)">${childExp.length} ${childExp.length === 1 ? 'despesa' : 'despesas'} este mes</div>
                </div>
            `;
        }
        const splitExp = childExp.filter(e => e.split);
        const splitTotal = splitExp.reduce((s, e) => s + (e.fullAmount || e.amount), 0);
        const coParentShare = splitTotal * (child.splitPct / 100);
        const coParentPaid = splitExp.filter(e => e.paidByFather).reduce((s, e) => s + (e.fullAmount || e.amount) * (child.splitPct / 100), 0);
        const coParentPending = coParentShare - coParentPaid;
        const vanessaPays = total - coParentPaid;
        // Co-parent receitas — receitas tagged with this child via the
        // "Pagamento do co-progenitor" toggle. Listed as a separate row so
        // they don't fight with the expense-share math.
        const coParentIncomes = getActiveFixedIncomesForMonth(currentDate)
            .filter(fi => fi.coParentChildId === child.id);
        const coParentIncomeReceived = coParentIncomes
            .filter(fi => getEffectiveFixedIncomeStatus(fi, currentDate).status === 'recebido')
            .reduce((s, fi) => s + getEffectiveFixedIncomeAmount(fi, currentDate), 0);
        const coParentIncomePending = coParentIncomes
            .filter(fi => getEffectiveFixedIncomeStatus(fi, currentDate).status !== 'recebido')
            .reduce((s, fi) => s + getEffectiveFixedIncomeAmount(fi, currentDate), 0);

        return `
            <div class="card split-summary-card" style="margin-bottom:8px">
                <h3 style="display:flex;align-items:center;justify-content:space-between">
                    <span><i class="fas fa-handshake"></i> ${child.name} / ${child.coParentName}</span>
                    <span style="font-size:0.8rem;font-weight:400;color:var(--text-light)">${formatCurrency(total)}</span>
                </h3>
                <div class="split-details">
                    <div class="split-row">
                        <span>Total despesas</span>
                        <span class="bold">${formatCurrency(total)}</span>
                    </div>
                    <div class="split-row">
                        <span>${getUserNameOrDefault()} paga efetivo</span>
                        <span class="bold" style="color:var(--primary)">${formatCurrency(vanessaPays)}</span>
                    </div>
                    <div class="split-row highlight">
                        <span>${child.coParentName} deve (${child.splitPct}%)</span>
                        <span class="bold">${formatCurrency(coParentShare)}</span>
                    </div>
                    <div class="split-row paid-row">
                        <span>Ja pago por ${child.coParentName}</span>
                        <span class="bold">${formatCurrency(coParentPaid)}</span>
                    </div>
                    <div class="split-row pending-row">
                        <span>Em falta</span>
                        <span class="bold">${formatCurrency(coParentPending)}</span>
                    </div>
                    ${coParentIncomes.length > 0 ? `
                    <div class="split-row" style="background:#E8F5E9;border-radius:6px;padding:8px 10px;margin-top:6px">
                        <span><i class="fas fa-arrow-down" style="color:#2E7D32;font-size:0.7rem"></i> Recebido de ${child.coParentName} ${coParentIncomePending > 0 && coParentIncomeReceived === 0 ? '<span style="font-size:0.65rem;color:#E65100;background:#FFF3E0;padding:1px 5px;border-radius:4px">pendente</span>' : ''}</span>
                        <span class="bold" style="color:#2E7D32">
                            ${formatCurrency(coParentIncomeReceived)}${coParentIncomePending > 0 ? `<span style="font-size:0.7rem;font-weight:400;color:var(--text-light);margin-left:6px">+${formatCurrency(coParentIncomePending)} por receber</span>` : ''}
                        </span>
                    </div>` : ''}
                </div>
                <div class="split-actions" style="flex-wrap:wrap">
                    ${coParentPending > 0 ? `<button onclick="batchToggleCoParent('${child.id}', true)" class="btn btn-sm" style="background:#E8F5E9;color:#2E7D32;border:1px solid #C8E6C9">
                        <i class="fas fa-check-double"></i> ${child.coParentName} pagou tudo
                    </button>` : `<button onclick="batchToggleCoParent('${child.id}', false)" class="btn btn-sm" style="background:#FFF3E0;color:#E65100;border:1px solid #FFE0B2">
                        <i class="fas fa-undo"></i> Reverter pagamentos
                    </button>`}
                    <button onclick="shareWithCoParentById('${child.id}')" class="btn btn-primary btn-sm">
                        <i class="fas fa-share-alt"></i> Partilhar
                    </button>
                    <button onclick="shareWithCoParentWithAttachmentsById('${child.id}')" class="btn btn-secondary btn-sm">
                        <i class="fas fa-paperclip"></i> Faturas
                    </button>
                    <button onclick="exportChildReportById('${child.id}')" class="btn btn-secondary btn-sm">
                        <i class="fas fa-file-alt"></i> Relatorio
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Merged expense list for all children, sorted by date
    const allChildExp = monthExpAll.filter(e => children.some(c => c.id === e.type));
    const allChildTotal = allChildExp.reduce((s, e) => s + (e.fullAmount || e.amount), 0);
    const allChildNet = allChildExp.reduce((s, e) => s + e.amount, 0);
    const expHtml = allChildExp.length === 0
        ? `<div class="empty-state"><i class="fas fa-child"></i><p>Sem despesas de filhos este mes</p></div>`
        : [...allChildExp].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => renderExpenseItem(e)).join('');

    const totalBar = `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--surface);border-radius:var(--radius-sm);margin-bottom:8px;font-weight:700">
        <span><i class="fas fa-children" style="margin-right:6px"></i> Total Filhos</span>
        <span>${allChildNet < allChildTotal ? `<span style="text-decoration:line-through;font-size:0.8rem;color:var(--text-light);margin-right:4px">${formatCurrency(allChildTotal)}</span>` : ''}${formatCurrency(allChildNet)}</span>
    </div>`;

    container.innerHTML = summaryHtml + totalBar + `<div class="expenses-list" style="margin-bottom:20px">${expHtml}</div>`;
}

// ===== REPORTS =====
// One-shot migration: previous default was 6M, but on phones the heatmap
// only fits ~5 months even with horizontal scroll, so 3M is the new default.
// We migrate existing users away from the old 6M default exactly once; if
// they re-pick 6M after the migration we respect it (the flag prevents us
// from overwriting it again on the next load).
(function migrateReportsPeriodDefault() {
    try {
        if (localStorage.getItem('vanessa_reports_period_migrated_v2') === '1') return;
        if (localStorage.getItem('vanessa_reports_period') === '6M' ||
            localStorage.getItem('vanessa_reports_period') === '6') {
            localStorage.setItem('vanessa_reports_period', '3');
        }
        localStorage.setItem('vanessa_reports_period_migrated_v2', '1');
    } catch (e) { /* storage disabled — fall back to in-memory default */ }
})();

function getReportsPeriod() {
    const raw = localStorage.getItem('vanessa_reports_period');
    // Accept both "3" and legacy "3M" forms.
    const v = parseInt(raw, 10);
    return [3, 6, 12].includes(v) ? v : 3;
}
function setReportsPeriod(months) {
    localStorage.setItem('vanessa_reports_period', String(months));
    renderReports();
}

function renderReports() {
    renderIncomeVsExpenses();
    renderMonthlyEvolution();
    renderSalaryCycleReport();
    renderCategoryHeatmap();
    renderFixedVsVariable();
    renderTopExpensesAllTime();
    renderPartnerSpending();
    renderIrsTracker();
    renderSubscriptionAudit();
    renderUtilityConsumption();
    renderReceiptInsights();
    renderProductPrices();
    renderSavingsAnalysis();
    renderCategoryComparison();
    renderUnnecessaryExpenses();
    renderYearToDate();
    renderPeopleSpending();
    renderWeekdayHeatmap();
    renderSmartInsights();
}

// Categories × months heatmap. Rows = categories, columns = last N months,
// each cell shaded by spend magnitude relative to the table max. Period
// (3/6/12 months) controlled by the chips at the top of the card and
// persisted in vanessa_reports_period.
function renderCategoryHeatmap() {
    const container = document.getElementById('reports-heatmap-body');
    if (!container) return;
    const N = getReportsPeriod();
    // Sync chip active state
    const chipBars = document.querySelectorAll('.reports-period-chips');
    chipBars.forEach(bar => {
        bar.querySelectorAll('.reports-period-chip').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.period, 10) === N);
        });
    });

    const today = new Date();
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const monthDates = [];
    for (let i = N - 1; i >= 0; i--) {
        monthDates.push(new Date(today.getFullYear(), today.getMonth() - i, 1));
    }

    const cats = getEffectiveCategories();
    const totals = {}; // cat -> [m0, m1, ...]
    let maxCell = 0;
    monthDates.forEach((d, idx) => {
        const monthExp = getEffectiveMonthExpenses(d).filter(e => !e.splitVirtualPartner);
        monthExp.forEach(e => {
            const k = e.category || 'outros';
            if (!totals[k]) totals[k] = new Array(monthDates.length).fill(0);
            totals[k][idx] += (e.amount || 0);
            if (totals[k][idx] > maxCell) maxCell = totals[k][idx];
        });
    });

    const sortedCats = Object.entries(totals)
        .map(([k, arr]) => ({ k, arr, sum: arr.reduce((s, v) => s + v, 0) }))
        .filter(r => r.sum > 0)
        .sort((a, b) => b.sum - a.sum);

    if (sortedCats.length === 0 || maxCell === 0) {
        container.innerHTML = '<p class="empty-state">Sem despesas para mostrar</p>';
        return;
    }

    const headerCells = monthDates.map(d => `<th>${months[d.getMonth()]}<br><span style="font-size:0.55rem;opacity:0.7">${String(d.getFullYear()).slice(2)}</span></th>`).join('');
    const rows = sortedCats.map(({ k, arr }) => {
        const c = cats[k] || cats.outros;
        const cells = arr.map(v => {
            const intensity = v === 0 ? 0 : Math.max(0.08, v / maxCell);
            const bg = `rgba(108,92,231,${intensity.toFixed(2)})`;
            const color = intensity > 0.55 ? '#fff' : 'var(--text)';
            return `<td class="heatmap-cell" style="background:${bg};color:${color}" title="${c?.label || k}: ${formatCurrency(v)}">${v > 0 ? formatCurrency(v) : '·'}</td>`;
        }).join('');
        return `<tr><td class="heatmap-row-label"><i class="fas ${c?.icon || 'fa-circle'}" style="color:${c?.color || '#9E9E9E'}"></i> ${c?.label || k}</td>${cells}</tr>`;
    }).join('');

    container.innerHTML = `<table class="heatmap-table"><thead><tr><th></th>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;
}

// Fixed vs variable, last N months stacked. Cativo (fixas pagas) vs
// discricionário (variáveis). Pure HTML+CSS — no chart library.
function renderFixedVsVariable() {
    const container = document.getElementById('reports-fixed-var-body');
    if (!container) return;
    const N = getReportsPeriod();
    const today = new Date();
    const monthsShort = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

    const data = [];
    let maxTotal = 0;
    for (let i = N - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthExp = getEffectiveMonthExpenses(d);
        let fixed = 0, variable = 0;
        monthExp.forEach(e => {
            if (e.isFixedExpense) fixed += (e.amount || 0);
            else variable += (e.amount || 0);
        });
        const tot = fixed + variable;
        if (tot > maxTotal) maxTotal = tot;
        data.push({ d, fixed, variable, total: tot });
    }

    if (maxTotal === 0) {
        container.innerHTML = '<p class="empty-state">Sem dados</p>';
        return;
    }

    const fixedColor = '#5A4BD1';
    const varColor = '#A29BFE';
    const rows = data.map(r => {
        const fixedPct = r.total > 0 ? (r.fixed / maxTotal) * 100 : 0;
        const varPct = r.total > 0 ? (r.variable / maxTotal) * 100 : 0;
        return `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:0.72rem">
                <div style="width:36px;color:var(--text-light);font-weight:600">${monthsShort[r.d.getMonth()]}</div>
                <div class="stack-bar" style="flex:1">
                    <div class="stack-bar-seg" style="width:${fixedPct}%;background:${fixedColor}" title="Fixas: ${formatCurrency(r.fixed)}"></div>
                    <div class="stack-bar-seg" style="width:${varPct}%;background:${varColor}" title="Variáveis: ${formatCurrency(r.variable)}"></div>
                </div>
                <div style="width:80px;text-align:right;color:var(--text);font-weight:700">${formatCurrency(r.total)}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div style="display:flex;gap:14px;font-size:0.7rem;color:var(--text-light);margin-bottom:10px">
            <span><span style="display:inline-block;width:10px;height:10px;background:${fixedColor};border-radius:2px;vertical-align:middle"></span> Fixas (cativo)</span>
            <span><span style="display:inline-block;width:10px;height:10px;background:${varColor};border-radius:2px;vertical-align:middle"></span> Variáveis (discricionário)</span>
        </div>
        ${rows}
    `;
}

// Top 10 single expenses across the last 12 months. Always 12-month window
// regardless of the period chips (the title already says "12 meses-ish"
// implicitly — keep it simple and consistent).
function renderTopExpensesAllTime() {
    const container = document.getElementById('reports-top10-body');
    if (!container) return;
    const today = new Date();
    const since = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    const sinceStr = toLocalDateStr(since);

    const cats = getEffectiveCategories();
    const all = expenses
        .filter(e => e.date && e.date >= sinceStr)
        .map(adjustExpenseForCoParent)
        .sort((a, b) => (b.amount || 0) - (a.amount || 0))
        .slice(0, 10);

    if (all.length === 0) {
        container.innerHTML = '<p class="empty-state">Sem despesas nos últimos 12 meses</p>';
        return;
    }

    container.innerHTML = all.map((e, i) => {
        const c = cats[e.category] || cats.outros;
        return `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
                <div style="width:24px;text-align:center;font-weight:800;color:var(--text-light);font-size:0.75rem">${i + 1}</div>
                <div style="width:30px;height:30px;border-radius:8px;background:${c?.color || '#9E9E9E'}22;color:${c?.color || '#9E9E9E'};display:flex;align-items:center;justify-content:center"><i class="fas ${c?.icon || 'fa-circle'}"></i></div>
                <div style="flex:1;min-width:0">
                    <div style="font-size:0.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.description || '(sem descrição)'}</div>
                    <div style="font-size:0.68rem;color:var(--text-light)">${formatDate(e.date)} · ${c?.label || e.category}</div>
                </div>
                <div style="font-weight:700;color:var(--danger);white-space:nowrap">${formatCurrency(e.amount)}</div>
            </div>
        `;
    }).join('');
}

// Partner-specific spending highlight card. Shows totals for the month and
// the last 6 months, plus the user's net share (after subtracting paid splits
// attributed to the partner). Only rendered in separated mode with a partner
// name configured.
function renderPartnerSpending() {
    const container = document.getElementById('partner-spending-card');
    if (!container) return;
    const name = getPartnerName();
    if (isMarriedMode() || !name) { container.style.display = 'none'; return; }
    const nameLower = name.toLowerCase();

    const { totals, entries } = getPartnerMonthStats(currentDate, name);

    // Last 6 months trend (use involved totals)
    const now = new Date();
    const series = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const { totals: t } = getPartnerMonthStats(d, name);
        series.push({ date: d, total: t.involved });
    }
    const maxSeries = Math.max(...series.map(s => s.total), 1);
    const monthsShort = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const cats = getEffectiveCategories();

    // Sort entries by date desc
    const detailEntries = entries.slice().sort((a, b) => (b.expense.date || '').localeCompare(a.expense.date || ''));
    const isOpen = localStorage.getItem('partner-details-open') === '1';

    container.style.display = 'block';
    const hasSettle = (totals.owed + totals.paid) > 0;
    container.innerHTML = `
        <h3><i class="fas fa-heart" style="color:#E91E63"></i> Gasto com ${name}</h3>
        <div style="padding:12px;background:#FCE4EC;border-radius:10px;margin-bottom:10px">
            <div style="font-size:0.7rem;color:#880E4F">Envolvido este mês</div>
            <div style="font-size:1.4rem;font-weight:800;color:#C2185B">${formatCurrency(totals.involved)}</div>
            <div style="font-size:0.7rem;color:#AD1457">${entries.length} ${entries.length === 1 ? 'despesa' : 'despesas'}</div>
            ${hasSettle ? `<div style="margin-top:6px;font-size:0.72rem;color:var(--text-light)">Por liquidar: <span style="color:var(--success);font-weight:600">${formatCurrency(totals.paid)} pagos</span> · <span style="color:var(--danger);font-weight:600">${formatCurrency(totals.owed)} por receber</span></div>` : ''}
        </div>
        <div style="font-size:0.72rem;color:var(--text-light);margin-bottom:4px">Últimos 6 meses</div>
        <div style="display:flex;gap:4px;align-items:flex-end;height:60px;margin-bottom:12px">
            ${series.map(s => {
                const h = Math.max(4, Math.round((s.total / maxSeries) * 54));
                const isCurrent = s.date.getMonth() === now.getMonth() && s.date.getFullYear() === now.getFullYear();
                return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px" title="${monthsShort[s.date.getMonth()]}: ${formatCurrency(s.total)}">
                    <div style="width:100%;height:${h}px;background:${isCurrent ? '#E91E63' : '#F8BBD0'};border-radius:4px 4px 0 0"></div>
                    <div style="font-size:0.6rem;color:var(--text-light)">${monthsShort[s.date.getMonth()].slice(0,3)}</div>
                </div>`;
            }).join('')}
        </div>
        ${detailEntries.length ? `
        <button id="partner-details-toggle" onclick="togglePartnerDetails()" style="width:100%;background:#F5F3FF;color:var(--primary);border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-family:var(--font);font-size:0.78rem;font-weight:600;display:flex;justify-content:space-between;align-items:center">
            <span>Detalhe das ${detailEntries.length} ${detailEntries.length === 1 ? 'despesa' : 'despesas'} com ${name}</span>
            <i class="fas fa-chevron-${isOpen ? 'up' : 'down'}"></i>
        </button>
        <div id="partner-details-list" style="display:${isOpen ? 'flex' : 'none'};flex-direction:column;gap:4px;margin-top:8px">
            ${detailEntries.map(({ expense: e, involved, attributed, owed, paid }) => {
                const cat = cats[e.category] || cats.outros;
                const gross = e.fullAmount != null ? e.fullAmount : e.amount;
                const partnerSplitEntry = Array.isArray(e.splits) ? e.splits.find(s => (s.name||'').toLowerCase() === nameLower) : null;
                const pctLabel = e.mixPartnerPct ? ` · ${e.mixPartnerPct}% atribuído` : '';
                const settleLabel = partnerSplitEntry
                    ? (partnerSplitEntry.paid
                        ? `<span style="color:var(--success);font-weight:600">✓ ${formatCurrency(partnerSplitEntry.amount)} pago</span>`
                        : `<span style="color:var(--danger);font-weight:600">🕐 ${formatCurrency(partnerSplitEntry.amount)} por receber</span>`)
                    : (e.mixPartnerPct && e.mixPartnerSplit
                        ? (e.mixPartnerPaid
                            ? `<span style="color:var(--success);font-weight:600">✓ parte recebida</span>`
                            : `<span style="color:var(--danger);font-weight:600">🕐 parte por receber</span>`)
                        : '');
                return `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:#fff;border:1px solid var(--border);border-radius:8px">
                    <div style="width:26px;height:26px;border-radius:6px;background:${cat.color}22;color:${cat.color};display:flex;align-items:center;justify-content:center;font-size:0.75rem;flex-shrink:0"><i class="fas ${cat.icon}"></i></div>
                    <div style="flex:1;min-width:0">
                        <div style="font-size:0.78rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${(e.description || '').replace(/\(.+?\)$/, '').trim()}</div>
                        <div style="font-size:0.65rem;color:var(--text-light)">${formatDate(e.date)}${pctLabel} ${settleLabel ? '· ' + settleLabel : ''}</div>
                    </div>
                    <div style="text-align:right;white-space:nowrap">
                        <div style="font-size:0.8rem;font-weight:700;color:#C2185B">${formatCurrency(involved)}</div>
                    </div>
                </div>`;
            }).join('')}
        </div>` : ''}
    `;
}

function togglePartnerDetails() {
    const list = document.getElementById('partner-details-list');
    const btn = document.getElementById('partner-details-toggle');
    if (!list) return;
    const isOpen = list.style.display !== 'none';
    list.style.display = isOpen ? 'none' : 'flex';
    localStorage.setItem('partner-details-open', isOpen ? '0' : '1');
    if (btn) {
        const chevron = btn.querySelector('.fa-chevron-down, .fa-chevron-up');
        if (chevron) {
            chevron.classList.toggle('fa-chevron-up', !isOpen);
            chevron.classList.toggle('fa-chevron-down', isOpen);
        }
    }
}

// Local-timezone date formatter (YYYY-MM-DD). toISOString() uses UTC and can
// shift the date by one day for users east/west of UTC.
function toLocalDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Whether to treat a date as a working day. Weekends only — Portuguese public
// holidays would need a calendar, out of scope for now.
function isWorkingDay(date) {
    const dow = date.getDay();
    return dow !== 0 && dow !== 6;
}

// Walks forward from the given date until it lands on a working day (stays put
// if already a working day).
function shiftForwardToWorkingDay(date) {
    const d = new Date(date);
    while (!isWorkingDay(d)) d.setDate(d.getDate() + 1);
    return d;
}

// Walks backward from the given date until it lands on a working day.
function shiftBackwardToWorkingDay(date) {
    const d = new Date(date);
    while (!isWorkingDay(d)) d.setDate(d.getDate() - 1);
    return d;
}

// Computes the actual salary pay-date for a calendar month according to the
// configured salary mode. Returns null when no mode/day is configured.
function getSalaryDateForMonth(year, month) {
    const mode = salaryMode || 'fixed-day';
    if (mode === 'last-working-day') {
        const lastDay = new Date(year, month + 1, 0);
        return shiftBackwardToWorkingDay(lastDay);
    }
    if (!salaryDay) return null;
    const maxDay = new Date(year, month + 1, 0).getDate();
    const clampedDay = Math.min(salaryDay, maxDay);
    const target = new Date(year, month, clampedDay);
    if (mode === 'working-day-after') return shiftForwardToWorkingDay(target);
    return target; // fixed-day
}

// Start/end dates of the salary cycle that begins in the given calendar month.
// End is the day before the next month's salary date.
function getSalaryCycleForMonth(year, month) {
    const start = getSalaryDateForMonth(year, month);
    if (!start) return null;
    const nextStart = getSalaryDateForMonth(year, month + 1);
    if (!nextStart) return null;
    const end = new Date(nextStart);
    end.setDate(end.getDate() - 1);
    return { start, end };
}

// Salary cycle that contains the given reference date.
function getSalaryCycleAt(ref) {
    const d = new Date(ref);
    const thisMonthStart = getSalaryDateForMonth(d.getFullYear(), d.getMonth());
    if (!thisMonthStart) return null;
    if (d >= thisMonthStart) return getSalaryCycleForMonth(d.getFullYear(), d.getMonth());
    return getSalaryCycleForMonth(d.getFullYear(), d.getMonth() - 1);
}

// Checks whether a salary is configured (at all). Used to show/hide the
// salary-cycle card and the report.
function isSalaryConfigured() {
    if (salaryMode === 'last-working-day') return true;
    return !!salaryDay;
}

// Detailed breakdown of a salary cycle. refDate (defaults to cycleEnd) separates
// what actually happened ("received"/"paid") from what's still expected ("pending"):
// transactions/fixed with date ≤ refDate count as realized; fixed scheduled for
// days after refDate but still within the cycle count as pending. Covers variable
// transactions plus paid fixed across the (up to two) calendar months the cycle touches.
function getSalaryCycleBreakdown(cycleStart, cycleEnd, refDate) {
    const startStr = toLocalDateStr(cycleStart);
    const endStr = toLocalDateStr(cycleEnd);
    const rawRefStr = refDate ? toLocalDateStr(refDate) : endStr;
    const refStr = rawRefStr > endStr ? endStr : (rawRefStr < startStr ? startStr : rawRefStr);

    const inCycle = (d) => d >= startStr && d <= endStr;
    const isRealized = (d) => d <= refStr;

    let incReceivedVariable = 0, incReceivedFixed = 0, incPending = 0;
    let expPaidVariable = 0, expPaidFixed = 0, expPending = 0, expPendingOverdue = 0;
    let incPendingOverdue = 0;
    const expByCategory = {};

    incomes.forEach(i => {
        if (!i.date || !inCycle(i.date) || !isRealized(i.date)) return;
        incReceivedVariable += i.amount;
    });
    expenses.forEach(e => {
        if (!e.date || !inCycle(e.date) || !isRealized(e.date)) return;
        const adj = adjustExpenseForCoParent(e);
        expPaidVariable += adj.amount;
        expByCategory[e.category] = (expByCategory[e.category] || 0) + adj.amount;
    });

    const monthKeys = new Set();
    const walker = new Date(cycleStart.getFullYear(), cycleStart.getMonth(), 1);
    const endMonth = new Date(cycleEnd.getFullYear(), cycleEnd.getMonth(), 1);
    while (walker <= endMonth) {
        monthKeys.add(`${walker.getFullYear()}-${walker.getMonth()}`);
        walker.setMonth(walker.getMonth() + 1);
    }
    for (const key of monthKeys) {
        const [y, m] = key.split('-').map(Number);
        const monthDate = new Date(y, m, 1);

        getPaidFixedAsExpenses(monthDate).forEach(e => {
            if (!inCycle(e.date)) return;
            // Same as the income side: explicit "pago" can land before
            // the scheduled day. Don't gate on isRealized for fixed
            // expenses already marked paid.
            expPaidFixed += e.amount;
            expByCategory[e.category] = (expByCategory[e.category] || 0) + e.amount;
        });
        getPaidFixedIncomesAsIncome(monthDate).forEach(i => {
            if (!inCycle(i.date)) return;
            // getPaidFixedIncomesAsIncome only returns receitas marked recebido
            // (auto or explicit). Auto-recebido implies payDate<=today so
            // isRealized is true. Explicit-recebido may be set BEFORE the
            // scheduled payDate (user got the money early) — count anyway.
            incReceivedFixed += i.amount;
        });

        const maxDay = new Date(y, m + 1, 0).getDate();
        const dStrFor = (day) => `${y}-${String(m + 1).padStart(2, '0')}-${String(Math.min(day, maxDay)).padStart(2, '0')}`;

        getActiveFixedForMonth(monthDate).forEach(f => {
            const st = getEffectiveFixedStatus(f, monthDate).status;
            if (st === 'pago' || st === 'ignorado') return;
            const dStr = dStrFor(f.dayOfMonth);
            if (!inCycle(dStr)) return;
            // Include all unpaid fixas in expPending — including those whose
            // scheduled day has passed but the user hasn't reconciled yet
            // ("em atraso"). Previously these were silently dropped from
            // Cativo and the figure didn't match the chrono cycle list.
            // Track overdue separately so the UI can flag them.
            const amt = getEffectiveFixedAmount(f, monthDate);
            expPending += amt;
            if (isRealized(dStr)) expPendingOverdue += amt;
        });
        getActiveFixedIncomesForMonth(monthDate).forEach(fi => {
            if (getEffectiveFixedIncomeStatus(fi, monthDate).status === 'recebido') return;
            const dStr = dStrFor(fi.dayOfMonth);
            if (!inCycle(dStr)) return;
            // Same treatment for incomes: an unreconciled receita whose
            // scheduled day has passed still counts as expected (incPending);
            // overdue tracked separately for the warning chip.
            const amt = getEffectiveFixedIncomeAmount(fi, monthDate);
            incPending += amt;
            if (isRealized(dStr)) incPendingOverdue += amt;
        });
    }

    const incReceived = incReceivedVariable + incReceivedFixed;
    const expPaid = expPaidVariable + expPaidFixed;
    return {
        incReceived, incReceivedVariable, incReceivedFixed, incPending, incPendingOverdue,
        expPaid, expPaidVariable, expPaidFixed, expPending, expPendingOverdue,
        totalInc: incReceived + incPending,
        totalExp: expPaid + expPending,
        balance: (incReceived + incPending) - (expPaid + expPending),
        realizedBalance: incReceived - expPaid,
        expByCategory
    };
}

function renderSalaryCycleReport() {
    const container = document.getElementById('salary-cycle-report');
    if (!container) return;
    if (!isSalaryConfigured()) { container.style.display = 'none'; return; }

    const today = new Date();
    const cycles = [];
    let cursor = new Date(today);
    for (let i = 0; i < 6; i++) {
        const c = getSalaryCycleAt(cursor);
        if (!c) break;
        cycles.push({ ...c, isCurrent: i === 0 });
        cursor = new Date(c.start);
        cursor.setDate(cursor.getDate() - 1);
    }

    const summaries = cycles
        .map(c => {
            const refDate = c.isCurrent ? today : c.end;
            const b = getSalaryCycleBreakdown(c.start, c.end, refDate);
            // Per-month totals restricted to the cycle window (22..21 across two months)
            const monthTotals = [];
            const seen = new Set();
            [c.start, c.end].forEach(d => {
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                if (seen.has(key)) return;
                seen.add(key);
                const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
                const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                const portionStart = mStart < c.start ? c.start : mStart;
                const portionEnd = mEnd > c.end ? c.end : mEnd;
                const mb = getSalaryCycleBreakdown(portionStart, portionEnd, c.isCurrent ? today : portionEnd);
                monthTotals.push({
                    date: mStart,
                    portionStart,
                    portionEnd,
                    inc: mb.totalInc,
                    exp: mb.totalExp,
                    balance: mb.balance
                });
            });
            return { ...c, ...b, monthTotals };
        })
        .filter(s => s.totalInc > 0 || s.totalExp > 0);

    if (summaries.length === 0) { container.style.display = 'none'; return; }

    const monthsShort = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const fmtLabel = (d) => `${d.getDate()} ${monthsShort[d.getMonth()]}`;
    const cats = getEffectiveCategories();

    const completed = summaries.filter(s => !s.isCurrent);
    const best = completed.length ? completed.slice().sort((a, b) => b.balance - a.balance)[0] : null;
    const worst = completed.length ? completed.slice().sort((a, b) => a.balance - b.balance)[0] : null;
    const avgBalance = completed.length ? completed.reduce((s, x) => s + x.balance, 0) / completed.length : 0;
    const avgExp = completed.length ? completed.reduce((s, x) => s + x.totalExp, 0) / completed.length : 0;
    const monthsFull = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

    container.style.display = 'block';
    const modeDesc = salaryMode === 'last-working-day' ? 'último dia útil do mês'
        : salaryMode === 'working-day-after' ? `1.º dia útil após o dia ${salaryDay}`
        : `dia ${salaryDay} de cada mês`;
    container.innerHTML = `
        <h3><i class="fas fa-calendar-week"></i> Ciclos de salário</h3>
        <p class="card-description">Análise entre salários — ${modeDesc}</p>
        ${completed.length >= 2 ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;margin-bottom:10px">
            <div style="padding:8px;background:var(--surface);border-radius:8px;text-align:center">
                <div style="font-size:0.65rem;color:var(--text-light)">Saldo médio</div>
                <div style="font-size:0.95rem;font-weight:700;color:${avgBalance >= 0 ? 'var(--success)' : 'var(--danger)'}">${avgBalance >= 0 ? '+' : ''}${formatCurrency(avgBalance)}</div>
                <div style="font-size:0.65rem;color:var(--text-light)">${completed.length} ciclos</div>
            </div>
            <div style="padding:8px;background:var(--surface);border-radius:8px;text-align:center">
                <div style="font-size:0.65rem;color:var(--text-light)">Despesa média</div>
                <div style="font-size:0.95rem;font-weight:700;color:var(--danger)">${formatCurrency(avgExp)}</div>
                <div style="font-size:0.65rem;color:var(--text-light)">por ciclo</div>
            </div>
        </div>` : ''}
        <div>
            ${summaries.map((s, idx) => {
                const balColor = s.balance >= 0 ? 'var(--success)' : 'var(--danger)';
                const balSign = s.balance >= 0 ? '+' : '';
                const currentBadge = s.isCurrent
                    ? ' <span style="font-size:0.65rem;font-weight:500;color:var(--primary);background:#EDE7F6;padding:1px 6px;border-radius:4px;margin-left:4px">atual</span>'
                    : '';
                // Variation vs previous cycle (next in list is older)
                const prev = summaries[idx + 1];
                let varHtml = '';
                if (prev && !s.isCurrent) {
                    const delta = s.balance - prev.balance;
                    const arrow = delta >= 0 ? '↗' : '↘';
                    const color = delta >= 0 ? 'var(--success)' : 'var(--danger)';
                    const sign = delta >= 0 ? '+' : '';
                    varHtml = `<div style="margin-top:6px;font-size:0.7rem;text-align:right"><span style="color:${color}">${arrow} ${sign}${formatCurrency(delta)} vs ciclo anterior</span></div>`;
                }
                const monthBoxes = s.monthTotals.map(m => {
                    const mBalColor = m.balance >= 0 ? 'var(--success)' : 'var(--danger)';
                    const mBalSign = m.balance >= 0 ? '+' : '';
                    const portionLabel = `${m.portionStart.getDate()}–${m.portionEnd.getDate()} ${monthsShort[m.date.getMonth()]}`;
                    return `
                    <div style="flex:1;padding:8px;background:#fff;border:1px solid var(--border);border-radius:6px">
                        <div style="font-size:0.7rem;font-weight:700;color:var(--text);text-transform:capitalize;margin-bottom:2px">${monthsFull[m.date.getMonth()]}</div>
                        <div style="font-size:0.62rem;color:var(--text-light);margin-bottom:4px">${portionLabel}</div>
                        <div style="font-size:0.68rem;color:var(--text-light);display:flex;justify-content:space-between"><span>↑ Receitas</span><span style="color:var(--success);font-weight:600">${formatCurrency(m.inc)}</span></div>
                        <div style="font-size:0.68rem;color:var(--text-light);display:flex;justify-content:space-between"><span>↓ Despesas</span><span style="color:var(--danger);font-weight:600">${formatCurrency(m.exp)}</span></div>
                        <div style="border-top:1px solid var(--border);margin-top:4px;padding-top:4px;font-size:0.72rem;display:flex;justify-content:space-between"><span style="color:var(--text-light)">Saldo</span><span style="color:${mBalColor};font-weight:700">${mBalSign}${formatCurrency(m.balance)}</span></div>
                    </div>`;
                }).join('');

                return `
                <div style="padding:10px;margin-bottom:8px;background:var(--surface);border-radius:8px">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                        <div>
                            <div style="font-size:0.9rem;font-weight:700">${fmtLabel(s.start)} → ${fmtLabel(s.end)}${currentBadge}</div>
                            <div style="font-size:0.65rem;color:var(--text-light)">ciclo de salário</div>
                        </div>
                        <div style="text-align:right">
                            <div style="color:${balColor};font-weight:800;font-size:1rem">${balSign}${formatCurrency(s.balance)}</div>
                            <div style="font-size:0.62rem;color:var(--text-light)">saldo do ciclo</div>
                        </div>
                    </div>
                    <div style="display:flex;gap:6px">${monthBoxes}</div>
                    ${varHtml}
                </div>`;
            }).join('')}
        </div>
        ${best && worst && best !== worst ? `
        <div style="display:flex;gap:8px;margin-top:8px">
            <div style="flex:1;padding:8px;background:#E8F5E9;border-radius:8px;text-align:center">
                <i class="fas fa-trophy" style="color:#2E7D32"></i>
                <div style="font-size:0.7rem;color:#2E7D32">Melhor ciclo</div>
                <div style="font-size:0.8rem;font-weight:700;color:#2E7D32">${fmtLabel(best.start)} → ${fmtLabel(best.end)}</div>
                <div style="font-size:0.75rem;color:#2E7D32">+${formatCurrency(best.balance)}</div>
            </div>
            <div style="flex:1;padding:8px;background:#FFEBEE;border-radius:8px;text-align:center">
                <i class="fas fa-triangle-exclamation" style="color:#C62828"></i>
                <div style="font-size:0.7rem;color:#C62828">Pior ciclo</div>
                <div style="font-size:0.8rem;font-weight:700;color:#C62828">${fmtLabel(worst.start)} → ${fmtLabel(worst.end)}</div>
                <div style="font-size:0.75rem;color:#C62828">${worst.balance >= 0 ? '+' : ''}${formatCurrency(worst.balance)}</div>
            </div>
        </div>` : ''}
    `;
}

function renderYTDStrip() {
    const container = document.getElementById('ytd-strip');
    if (!container) return;
    const year = currentDate.getFullYear();
    let totalInc = 0, totalExp = 0, monthsWithData = 0;
    for (let m = 0; m < 12; m++) {
        const d = new Date(year, m, 1);
        const exp = getEffectiveMonthExpenses(d).reduce((s, e) => s + e.amount, 0);
        const inc = getEffectiveMonthIncomes(d).reduce((s, e) => s + e.amount, 0);
        if (exp > 0 || inc > 0) monthsWithData++;
        totalExp += exp; totalInc += inc;
    }
    if (monthsWithData === 0) { container.style.display = 'none'; return; }
    const balance = totalInc - totalExp;
    container.style.display = 'block';
    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:0.8rem;font-weight:700"><i class="fas fa-calendar"></i> ${year} acumulado</span>
            <span style="font-size:0.7rem;color:var(--text-light)">${monthsWithData} ${monthsWithData === 1 ? 'mes' : 'meses'}</span>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
            <div style="flex:1;text-align:center">
                <div style="font-size:0.65rem;color:var(--text-light)">Receitas</div>
                <div style="font-size:0.9rem;font-weight:700;color:var(--success)">${formatCurrency(totalInc)}</div>
            </div>
            <div style="flex:1;text-align:center">
                <div style="font-size:0.65rem;color:var(--text-light)">Despesas</div>
                <div style="font-size:0.9rem;font-weight:700;color:var(--danger)">${formatCurrency(totalExp)}</div>
            </div>
            <div style="flex:1;text-align:center">
                <div style="font-size:0.65rem;color:var(--text-light)">Saldo</div>
                <div style="font-size:0.9rem;font-weight:700;color:${balance >= 0 ? 'var(--success)' : 'var(--danger)'}">${balance >= 0 ? '+' : ''}${formatCurrency(balance)}</div>
            </div>
        </div>
    `;
}

// Year-to-date totals
function renderYearToDate() {
    const container = document.getElementById('ytd-summary');
    if (!container) return;
    const year = currentDate.getFullYear();
    let totalInc = 0, totalExp = 0, monthsWithData = 0;
    const monthlyData = [];
    for (let m = 0; m < 12; m++) {
        const d = new Date(year, m, 1);
        const exp = getEffectiveMonthExpenses(d).reduce((s, e) => s + e.amount, 0);
        const inc = getEffectiveMonthIncomes(d).reduce((s, e) => s + e.amount, 0);
        if (exp > 0 || inc > 0) monthsWithData++;
        totalExp += exp; totalInc += inc;
        monthlyData.push({ month: m, exp, inc, balance: inc - exp });
    }
    if (monthsWithData === 0) { container.style.display = 'none'; return; }
    const balance = totalInc - totalExp;
    const avgExp = totalExp / monthsWithData;
    const avgInc = totalInc / monthsWithData;

    // Best/worst month (by balance)
    const best = monthlyData.filter(m => m.exp > 0 || m.inc > 0).sort((a, b) => b.balance - a.balance)[0];
    const worst = monthlyData.filter(m => m.exp > 0 || m.inc > 0).sort((a, b) => a.balance - b.balance)[0];
    const monthName = (m) => new Date(year, m, 1).toLocaleDateString('pt-PT', { month: 'long' });

    container.style.display = 'block';
    container.innerHTML = `
        <h3 class="card-title"><i class="fas fa-calendar"></i> Ano ${year} (YTD)</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div style="padding:10px;background:var(--surface);border-radius:8px">
                <div style="font-size:0.7rem;color:var(--text-light)">Total receitas</div>
                <div style="font-size:1rem;font-weight:700;color:var(--success)">${formatCurrency(totalInc)}</div>
                <div style="font-size:0.65rem;color:var(--text-light)">media ${formatCurrency(avgInc)}/mes</div>
            </div>
            <div style="padding:10px;background:var(--surface);border-radius:8px">
                <div style="font-size:0.7rem;color:var(--text-light)">Total despesas</div>
                <div style="font-size:1rem;font-weight:700;color:var(--danger)">${formatCurrency(totalExp)}</div>
                <div style="font-size:0.65rem;color:var(--text-light)">media ${formatCurrency(avgExp)}/mes</div>
            </div>
            <div style="padding:10px;background:var(--surface);border-radius:8px;grid-column:span 2">
                <div style="font-size:0.7rem;color:var(--text-light)">Saldo acumulado</div>
                <div style="font-size:1.2rem;font-weight:800;color:${balance >= 0 ? 'var(--success)' : 'var(--danger)'}">${balance >= 0 ? '+' : ''}${formatCurrency(balance)}</div>
            </div>
        </div>
        ${best && worst ? `
        <div style="display:flex;gap:8px;margin-top:8px">
            <div style="flex:1;padding:8px;background:#E8F5E9;border-radius:8px;text-align:center">
                <i class="fas fa-trophy" style="color:#2E7D32"></i>
                <div style="font-size:0.7rem;color:#2E7D32">Melhor mes</div>
                <div style="font-size:0.85rem;font-weight:700;color:#2E7D32">${monthName(best.month)}</div>
                <div style="font-size:0.75rem;color:#2E7D32">+${formatCurrency(best.balance)}</div>
            </div>
            <div style="flex:1;padding:8px;background:#FFEBEE;border-radius:8px;text-align:center">
                <i class="fas fa-triangle-exclamation" style="color:#C62828"></i>
                <div style="font-size:0.7rem;color:#C62828">Pior mes</div>
                <div style="font-size:0.85rem;font-weight:700;color:#C62828">${monthName(worst.month)}</div>
                <div style="font-size:0.75rem;color:#C62828">${worst.balance >= 0 ? '+' : ''}${formatCurrency(worst.balance)}</div>
            </div>
        </div>` : ''}
    `;
}

// Spending by person (from withPeople tags)
function renderPeopleSpending() {
    const container = document.getElementById('people-spending');
    if (!container) return;
    const monthExp = getEffectiveMonthExpenses(currentDate);
    const byPerson = {};
    monthExp.forEach(e => {
        (e.withPeople || []).forEach(p => {
            if (!byPerson[p]) byPerson[p] = { total: 0, count: 0 };
            byPerson[p].total += e.amount;
            byPerson[p].count += 1;
        });
    });
    const entries = Object.entries(byPerson).sort((a, b) => b[1].total - a[1].total);
    if (entries.length === 0) { container.style.display = 'none'; return; }
    const max = entries[0][1].total;
    container.style.display = 'block';
    container.innerHTML = `
        <h3 class="card-title"><i class="fas fa-user-group"></i> Gastos por pessoa</h3>
        ${entries.map(([name, data]) => {
            const pct = (data.total / max * 100).toFixed(0);
            return `<div style="margin-bottom:8px">
                <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:2px">
                    <span><i class="fas fa-user" style="color:var(--primary);font-size:0.7rem"></i> ${name}</span>
                    <span style="font-weight:600">${formatCurrency(data.total)} <span style="color:var(--text-light);font-size:0.7rem">(${data.count}x)</span></span>
                </div>
                <div style="background:var(--border);border-radius:4px;height:5px;overflow:hidden">
                    <div style="width:${pct}%;height:100%;background:var(--primary);border-radius:4px"></div>
                </div>
            </div>`;
        }).join('')}
    `;
}

// Spending by day of week
function renderWeekdayHeatmap() {
    const container = document.getElementById('weekday-heatmap');
    if (!container) return;
    const monthExp = getEffectiveMonthExpenses(currentDate);
    if (monthExp.length === 0) { container.style.display = 'none'; return; }
    const byDay = [0, 0, 0, 0, 0, 0, 0];
    const countByDay = [0, 0, 0, 0, 0, 0, 0];
    monthExp.forEach(e => {
        const dow = new Date(e.date).getDay();
        byDay[dow] += e.amount;
        countByDay[dow] += 1;
    });
    const max = Math.max(...byDay, 1);
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    container.style.display = 'block';
    container.innerHTML = `
        <h3 class="card-title"><i class="fas fa-calendar-day"></i> Gastos por dia da semana</h3>
        <div style="display:flex;gap:4px;align-items:flex-end;height:120px;padding:8px 0">
            ${[1,2,3,4,5,6,0].map(dow => {
                const val = byDay[dow];
                const h = (val / max * 100).toFixed(0);
                const isWeekend = dow === 0 || dow === 6;
                return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
                    <div style="font-size:0.65rem;color:var(--text-light)">${val > 0 ? formatCurrency(val).replace(',00', '') : ''}</div>
                    <div style="width:100%;height:${h}%;min-height:2px;background:${isWeekend ? 'var(--warning)' : 'var(--primary)'};border-radius:4px 4px 0 0;transition:height 0.3s" title="${dayNames[dow]}: ${formatCurrency(val)} (${countByDay[dow]}x)"></div>
                    <div style="font-size:0.7rem;font-weight:600">${dayNames[dow]}</div>
                </div>`;
            }).join('')}
        </div>
    `;
}

function renderSmartInsights() {
    const container = document.getElementById('smart-insights');
    if (!container) return;

    const monthExp = getEffectiveMonthExpenses(currentDate);
    const monthInc = getEffectiveMonthIncomes(currentDate);
    const totalExp = monthExp.filter(expenseAffectsBalance).reduce((s, e) => s + e.amount, 0);
    const totalInc = monthInc.reduce((s, e) => s + e.amount, 0);
    const prevExp = getPrevMonthExpenses();
    const prevTotal = prevExp.reduce((s, e) => s + e.amount, 0);
    const insights = [];

    // 1. Weekend spending pattern
    const weekendExp = monthExp.filter(e => { const d = new Date(e.date).getDay(); return d === 0 || d === 6; });
    const weekendTotal = weekendExp.reduce((s, e) => s + e.amount, 0);
    if (weekendTotal > 0 && totalExp > 0) {
        const weekendPct = (weekendTotal / totalExp * 100).toFixed(0);
        if (weekendPct > 35) {
            insights.push({ icon: 'fa-calendar-week', color: '#FF9800',
                text: `<strong>${weekendPct}% dos gastos</strong> sao ao fim-de-semana (${formatCurrency(weekendTotal)}). Tente planear atividades gratuitas.` });
        }
    }

    // 2. Spending trend
    if (prevTotal > 0 && totalExp > 0) {
        const change = ((totalExp - prevTotal) / prevTotal * 100).toFixed(0);
        if (change > 15) {
            insights.push({ icon: 'fa-arrow-trend-up', color: '#E53935',
                text: `Gastos aumentaram <strong>${change}%</strong> face ao mes anterior. Reveja categorias em crescimento.` });
        } else if (change < -10) {
            insights.push({ icon: 'fa-arrow-trend-down', color: '#4CAF50',
                text: `Parabens! Reduziu gastos em <strong>${Math.abs(change)}%</strong> face ao mes anterior.` });
        }
    }

    // 3. Top growing category
    const grouped = {};
    monthExp.forEach(e => { grouped[e.category] = (grouped[e.category] || 0) + e.amount; });
    const prevGrouped = {};
    prevExp.forEach(e => { prevGrouped[e.category] = (prevGrouped[e.category] || 0) + e.amount; });
    const cats = getEffectiveCategories();
    let biggestGrowth = null;
    Object.entries(grouped).forEach(([cat, val]) => {
        const prevVal = prevGrouped[cat] || 0;
        if (prevVal > 0 && val > prevVal * 1.3 && val - prevVal > 20) {
            const increase = ((val - prevVal) / prevVal * 100).toFixed(0);
            if (!biggestGrowth || val - prevVal > biggestGrowth.diff) {
                biggestGrowth = { cat, val, prevVal, increase, diff: val - prevVal };
            }
        }
    });
    if (biggestGrowth) {
        insights.push({ icon: 'fa-chart-line', color: '#FF5722',
            text: `<strong>${cats[biggestGrowth.cat]?.label}</strong> subiu ${biggestGrowth.increase}% (${formatCurrency(biggestGrowth.prevVal)} → ${formatCurrency(biggestGrowth.val)}).` });
    }

    // 4. Savings rate warning
    if (totalInc > 0) {
        const savingsRate = ((totalInc - totalExp) / totalInc * 100);
        if (savingsRate < 10 && savingsRate >= 0) {
            insights.push({ icon: 'fa-piggy-bank', color: '#FF9800',
                text: `Taxa de poupanca de apenas <strong>${savingsRate.toFixed(0)}%</strong>. O ideal e poupar pelo menos 20%.` });
        } else if (savingsRate < 0) {
            insights.push({ icon: 'fa-exclamation-triangle', color: '#E53935',
                text: `Esta a gastar <strong>mais do que ganha</strong> este mes. Reveja os gastos nao essenciais.` });
        } else if (savingsRate >= 30) {
            insights.push({ icon: 'fa-trophy', color: '#4CAF50',
                text: `Excelente! Taxa de poupanca de <strong>${savingsRate.toFixed(0)}%</strong>. Continue assim!` });
        }
    }

    // 5. Budget warnings
    Object.entries(categoryBudgets).forEach(([cat, budget]) => {
        const spent = grouped[cat] || 0;
        const pct = (spent / budget * 100);
        if (pct >= 100) {
            insights.push({ icon: 'fa-ban', color: '#E53935',
                text: `Ultrapassou o limite de <strong>${cats[cat]?.label}</strong>: ${formatCurrency(spent)} de ${formatCurrency(budget)} (${pct.toFixed(0)}%).` });
        } else if (pct >= 80) {
            insights.push({ icon: 'fa-exclamation-circle', color: '#FF9800',
                text: `Proximo do limite em <strong>${cats[cat]?.label}</strong>: ${formatCurrency(spent)} de ${formatCurrency(budget)} (${pct.toFixed(0)}%).` });
        }
    });

    // 6. Frequent small expenses
    const smallExp = monthExp.filter(e => e.amount <= 5 && !e.isFixedExpense);
    if (smallExp.length >= 10) {
        const smallTotal = smallExp.reduce((s, e) => s + e.amount, 0);
        insights.push({ icon: 'fa-coins', color: '#9C27B0',
            text: `Tem <strong>${smallExp.length} gastos pequenos</strong> (≤5 EUR) que somam ${formatCurrency(smallTotal)}. Pequenos gastos acumulam-se.` });
    }

    if (insights.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = `
        <h3 class="card-title"><i class="fas fa-lightbulb"></i> Insights Inteligentes</h3>
        ${insights.map(i => `
            <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
                <div style="width:28px;height:28px;border-radius:50%;background:${i.color}15;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                    <i class="fas ${i.icon}" style="font-size:0.75rem;color:${i.color}"></i>
                </div>
                <div style="font-size:0.8rem;line-height:1.4">${i.text}</div>
            </div>
        `).join('')}
    `;
}

function renderIncomeVsExpenses() {
    const container = document.getElementById('income-vs-expenses-chart');
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const exp = getEffectiveMonthExpenses(d);
        const inc = getEffectiveMonthIncomes(d);
        const totalExp = exp.reduce((s, e) => s + e.amount, 0);
        const totalInc = inc.reduce((s, e) => s + e.amount, 0);
        months.push({ date: d, income: totalInc, expenses: totalExp, balance: totalInc - totalExp });
    }

    const max = Math.max(...months.map(m => Math.max(m.income, m.expenses)), 1);
    container.innerHTML = months.map((m, i) => {
        const incPct = (m.income / max * 100).toFixed(1);
        const expPct = (m.expenses / max * 100).toFixed(1);
        const label = m.date.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' });
        const balColor = m.balance >= 0 ? 'var(--success)' : 'var(--danger)';
        const balSign = m.balance >= 0 ? '+' : '';
        return `
            <div class="ive-bar-container">
                <div class="ive-label">
                    <span>${label}</span>
                    <span style="color:${balColor};font-weight:600">${balSign}${formatCurrency(m.balance)}</span>
                </div>
                <div class="ive-bars">
                    <div class="ive-bar ive-bar-income" style="width:${incPct}%" title="Receitas: ${formatCurrency(m.income)}"></div>
                </div>
                <div class="ive-bars" style="margin-top:2px">
                    <div class="ive-bar ive-bar-expense" style="width:${expPct}%" title="Despesas: ${formatCurrency(m.expenses)}"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--text-muted);margin-top:2px">
                    <span>Entradas: ${formatCurrency(m.income)}</span>
                    <span>Saidas: ${formatCurrency(m.expenses)}</span>
                </div>
            </div>
        `;
    }).join('') + `
        <div style="display:flex;gap:16px;margin-top:8px;font-size:0.75rem">
            <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#4CAF50;vertical-align:middle"></span> Entradas</span>
            <span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:#EF5350;vertical-align:middle"></span> Saidas</span>
        </div>
    `;
}

function renderMonthlyEvolution() {
    const container = document.getElementById('monthly-evolution-chart');
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const exp = getEffectiveMonthExpenses(d);
        const total = exp.reduce((s, e) => s + e.amount, 0);
        months.push({ date: d, total });
    }

    const max = Math.max(...months.map(m => m.total), 1);
    container.innerHTML = months.map((m, i) => {
        const pct = (m.total / max * 100).toFixed(1);
        const isCurrent = i === months.length - 1;
        const label = m.date.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' });
        return `
            <div class="evolution-bar-container">
                <div class="evolution-label">
                    <span>${label}</span>
                    <span>${formatCurrency(m.total)}</span>
                </div>
                <div class="evolution-bar">
                    <div class="evolution-fill ${isCurrent ? 'current' : ''}" style="width:${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Guard to avoid parallel AI calls while the user taps the tab repeatedly.
let _savingsAnalysisAiToken = 0;

async function renderSavingsAnalysis() {
    const container = document.getElementById('savings-analysis');
    if (!container) return;
    const monthExp = getEffectiveMonthExpenses(currentDate);
    const monthInc = getEffectiveMonthIncomes(currentDate);
    const prevExp = getPrevMonthExpenses();

    // Heuristic tips render synchronously so there's always content even if
    // there's no AI key or the provider is down.
    const heuristicTips = computeHeuristicSavingsTips(monthExp, monthInc, prevExp);
    const showLoader = hasAnyAiKey();
    renderSavingsTips(container, heuristicTips, showLoader);

    if (!showLoader) return;
    const token = ++_savingsAnalysisAiToken;
    try {
        const aiTips = await generateAiSavingsInsights(monthExp, monthInc, prevExp);
        if (token !== _savingsAnalysisAiToken) return; // a newer run took over
        const merged = aiTips && aiTips.length
            ? [...aiTips, ...dedupHeuristicsVsAi(heuristicTips, aiTips)]
            : heuristicTips;
        renderSavingsTips(container, merged, false);
    } catch (e) {
        if (token !== _savingsAnalysisAiToken) return;
        console.warn('AI savings analysis failed:', e?.message || e);
        renderSavingsTips(container, heuristicTips, false);
    }
}

function computeHeuristicSavingsTips(monthExp, monthInc, prevExp) {
    const tips = [];
    const cats = getEffectiveCategories();
    const totalIncome = monthInc.reduce((s, e) => s + e.amount, 0);
    const totalExpenses = monthExp.filter(expenseAffectsBalance).reduce((s, e) => s + e.amount, 0);

    // Savings rate
    if (totalIncome > 0) {
        const savingsRate = Math.round((totalIncome - totalExpenses) / totalIncome * 100);
        if (savingsRate < 10) {
            tips.push({ type: 'alert', text: `Taxa de poupança de apenas <strong>${savingsRate}%</strong>. O ideal é poupar pelo menos 20% (${formatCurrency(totalIncome * 0.2)}).` });
        } else if (savingsRate >= 20) {
            tips.push({ type: 'tip', text: `Excelente! Taxa de poupança de <strong>${savingsRate}%</strong>. Está a poupar ${formatCurrency(totalIncome - totalExpenses)} este mês.` });
        } else {
            tips.push({ type: 'warning', text: `Taxa de poupança de <strong>${savingsRate}%</strong>. Tente chegar aos 20% (faltam ${formatCurrency(totalIncome * 0.2 - (totalIncome - totalExpenses))}).` });
        }
    }

    // Category month-over-month spikes
    const currByCategory = groupByCategory(monthExp);
    const prevByCategory = groupByCategory(prevExp);
    Object.entries(currByCategory).forEach(([cat, total]) => {
        const prevTotal = prevByCategory[cat] || 0;
        if (prevTotal >= 20) {
            const increase = Math.round((total - prevTotal) / prevTotal * 100);
            if (increase > 25) {
                tips.push({ type: 'warning', text: `<strong>${cats[cat]?.label || cat}</strong> subiu ${increase}% (${formatCurrency(prevTotal)} → ${formatCurrency(total)}).` });
            }
        }
    });

    // Non-essential share
    const nonEssentialTotal = monthExp.filter(e => e.essential === false).reduce((s, e) => s + e.amount, 0);
    if (nonEssentialTotal > 0 && totalExpenses > 0) {
        const pct = Math.round(nonEssentialTotal / totalExpenses * 100);
        tips.push({
            type: pct > 30 ? 'alert' : pct > 20 ? 'warning' : 'tip',
            text: `Gastos <strong>não essenciais</strong>: ${formatCurrency(nonEssentialTotal)} (${pct}% do total). ${pct > 20 ? 'Há margem para cortar.' : 'Bom controlo!'}`
        });
    }

    // Subscriptions
    const subs = monthExp.filter(e => e.category === 'subscricoes');
    if (subs.length > 0) {
        const subsTotal = subs.reduce((s, e) => s + e.amount, 0);
        tips.push({ type: 'tip', text: `Tem <strong>${subs.length} subscrições</strong> a custar ${formatCurrency(subsTotal)}/mês. Verifique se usa todas.` });
    }

    // Restaurants vs supermarket
    const restTotal = currByCategory['restaurantes'] || 0;
    const superTotal = currByCategory['supermercado'] || 0;
    if (restTotal > 0 && superTotal > 0 && restTotal > superTotal * 0.5) {
        const pct = Math.round(restTotal / (restTotal + superTotal) * 100);
        tips.push({ type: 'warning', text: `Gasta ${formatCurrency(restTotal)} em <strong>restaurantes</strong> (${pct}% da alimentação). Cozinhar mais pode poupar.` });
    }

    // Merchant comparison within the same category
    tips.push(...merchantComparisonTips(monthExp, cats));

    // Weekend vs weekday
    tips.push(...weekendPatternTips(monthExp));

    // Single-expense outlier
    tips.push(...outlierTips(monthExp, cats));

    if (tips.length === 0) {
        tips.push({ type: 'tip', text: 'Adicione mais despesas e receitas para obter análises de poupança.' });
    }
    return tips;
}

// Builds a map of NIF -> canonical merchant name from the user's own data.
// Whenever we've seen a NIF before with any non-empty description, that
// description becomes the canonical name — this means "LIDL ODIVELAS" and
// "LIDL FONTE NOVA" (both NIF 500 799 367) collapse to the same bucket
// once the user has at least one receipt where the description is "Lidl".
let _canonicalByNifCache = null;
let _canonicalByNifVersion = 0;
function getCanonicalByNifMap() {
    // Rebuilds when expenses change. Cheap enough to recompute lazily.
    const v = expenses.length;
    if (_canonicalByNifCache && _canonicalByNifVersion === v) return _canonicalByNifCache;
    const map = new Map();
    expenses.forEach(e => {
        if (!e.sellerNif) return;
        const brand = extractBrandOnly(e);
        if (!brand) return;
        if (!map.has(e.sellerNif)) map.set(e.sellerNif, brand);
    });
    _canonicalByNifCache = map;
    _canonicalByNifVersion = v;
    return map;
}

// Returns a canonical merchant label for an expense. Precedence:
//  1. If sellerNif matches a known brand (from user's history), use it.
//  2. Detect a brand keyword in description/notes (extractBrandOnly).
//  3. Strip known location suffixes from the description ("Lidl Odivelas"
//     → "Lidl", "McDonald's Cascais" → "McDonald's").
//  4. Fallback to the raw description.
function getCanonicalMerchant(e) {
    if (e.sellerNif) {
        const byNif = getCanonicalByNifMap().get(e.sellerNif);
        if (byNif) return byNif;
    }
    const brand = extractBrandOnly(e);
    if (brand) return brand;
    const raw = (e.description || '').trim();
    if (!raw) return null;
    // Strip trailing location tokens (all-uppercase cities, common suffixes)
    const cleaned = raw
        .replace(/\s+(LISBOA|PORTO|BRAGA|COIMBRA|FARO|OEIRAS|CASCAIS|SINTRA|LOURES|ODIVELAS|AMADORA|SETÚBAL|SETUBAL|ALMADA|FUNCHAL|LEIRIA|AVEIRO|VIANA|BARCELOS|GUIMARÃES|GUIMARAES|MATOSINHOS|GAIA|MAIA|ALVERCA|SACAVÉM|SACAVEM|EXPO|COLOMBO|VASCO DA GAMA|FONTE NOVA)\b.*$/i, '')
        .replace(/\s+-\s+.*$/, '')
        .trim();
    return cleaned || raw;
}

// Split brand detection from extractMerchant so getCanonicalByNifMap can
// reuse it without recursion.
function extractBrandOnly(e) {
    const raw = `${e.description || ''} ${e.notes || ''}`.toLowerCase();
    const brands = [
        ['pingo doce', 'Pingo Doce'], ['continente', 'Continente'],
        ['lidl', 'Lidl'], ['auchan', 'Auchan'], ['aldi', 'Aldi'],
        ['mercadona', 'Mercadona'], ['intermarché', 'Intermarché'], ['intermarche', 'Intermarché'],
        ['minipreço', 'Minipreço'], ['minipreco', 'Minipreço'],
        ['jumbo', 'Jumbo'], ['meu super', 'Meu Super'],
        ["mcdonald's", "McDonald's"], ['mcdonalds', "McDonald's"],
        ['burger king', 'Burger King'], ['kfc', 'KFC'], ['pizza hut', 'Pizza Hut'],
        ['starbucks', 'Starbucks'],
        ['uber eats', 'Uber Eats'], ['bolt food', 'Bolt Food'],
        ['uber', 'Uber'], ['bolt', 'Bolt'], ['glovo', 'Glovo'],
        ['galp', 'Galp'], ['repsol', 'Repsol'], ['prio', 'Prio'], ['cepsa', 'Cepsa'], [' bp ', 'BP'],
        ['worten', 'Worten'], ['fnac', 'Fnac'], ['ikea', 'IKEA'], ['leroy merlin', 'Leroy Merlin'],
        ['decathlon', 'Decathlon'], ['zara', 'Zara'], ['h&m', 'H&M'],
        ['amazon', 'Amazon'], ['aliexpress', 'AliExpress']
    ];
    for (const [kw, label] of brands) {
        if (raw.includes(kw)) return label;
    }
    return null;
}

// Tries to identify a merchant brand from description/notes. Returns null if
// it doesn't match any known pattern — falls back to the description itself
// for AI prompting so unknown merchants still contribute to the analysis.
function extractMerchant(e) {
    // Kept as a thin wrapper for call sites that only care about "did we
    // detect a known brand?". New code should prefer getCanonicalMerchant.
    return extractBrandOnly(e);
}

function merchantComparisonTips(expenses, cats) {
    const byCat = {};
    expenses.forEach(e => {
        // Canonical merchant collapses "LIDL ODIVELAS" and "LIDL BRAGA"
        // into a single "Lidl" bucket so comparisons are meaningful.
        const m = getCanonicalMerchant(e);
        if (!m) return;
        if (!byCat[e.category]) byCat[e.category] = {};
        if (!byCat[e.category][m]) byCat[e.category][m] = { count: 0, total: 0 };
        byCat[e.category][m].count++;
        byCat[e.category][m].total += e.amount;
    });
    const tips = [];
    Object.entries(byCat).forEach(([cat, merchants]) => {
        const list = Object.entries(merchants)
            .map(([m, v]) => ({ m, ...v, avg: v.total / v.count }))
            .filter(x => x.count >= 2);
        if (list.length < 2) return;
        list.sort((a, b) => b.avg - a.avg);
        const high = list[0], low = list[list.length - 1];
        if (high.avg > low.avg * 1.15 && high.avg - low.avg > 5) {
            const saving = (high.avg - low.avg) * high.count;
            tips.push({
                type: 'tip',
                text: `Em ${cats[cat]?.label || cat}: média por ida <strong>${formatCurrency(high.avg)}</strong> no ${high.m} vs <strong>${formatCurrency(low.avg)}</strong> no ${low.m}. Se mudares hábitos, podes poupar até ${formatCurrency(saving)}/mês.`
            });
        }
    });
    return tips.slice(0, 2);
}

function weekendPatternTips(expenses) {
    const variable = expenses.filter(e => !e.isFixedExpense);
    if (variable.length < 8) return [];
    let weekendTotal = 0, weekdayTotal = 0;
    const weekendDays = new Set(), weekdayDays = new Set();
    variable.forEach(e => {
        const d = new Date(e.date);
        const wd = d.getDay();
        if (wd === 0 || wd === 6) { weekendTotal += e.amount; weekendDays.add(e.date); }
        else { weekdayTotal += e.amount; weekdayDays.add(e.date); }
    });
    if (weekendDays.size < 2 || weekdayDays.size < 2) return [];
    const wkndAvg = weekendTotal / weekendDays.size;
    const wkdyAvg = weekdayTotal / weekdayDays.size;
    if (wkndAvg > wkdyAvg * 1.4 && wkndAvg > 20) {
        return [{
            type: 'warning',
            text: `Aos fins-de-semana gasta em média <strong>${formatCurrency(wkndAvg)}/dia</strong> vs ${formatCurrency(wkdyAvg)} durante a semana. Planear saídas com orçamento ajuda a controlar.`
        }];
    }
    return [];
}

function outlierTips(expenses, cats) {
    const byCat = {};
    expenses.forEach(e => {
        if (e.isFixedExpense) return;
        if (!byCat[e.category]) byCat[e.category] = [];
        byCat[e.category].push(e);
    });
    const tips = [];
    Object.entries(byCat).forEach(([cat, list]) => {
        if (list.length < 4) return;
        const amounts = list.map(e => e.amount).sort((a, b) => a - b);
        const median = amounts[Math.floor(amounts.length / 2)];
        const total = amounts.reduce((s, a) => s + a, 0);
        const max = list.reduce((m, e) => e.amount > m.amount ? e : m);
        if (max.amount > median * 3 && max.amount > total * 0.3 && max.amount > 30) {
            tips.push({
                type: 'tip',
                text: `Em <strong>${cats[cat]?.label || cat}</strong>, uma despesa de ${formatCurrency(max.amount)} (${(max.description || '').trim() || 'sem descrição'}) pesa ${Math.round(max.amount/total*100)}% da categoria. Se for pontual está OK; se for recorrente, vale a pena rever.`
            });
        }
    });
    return tips.slice(0, 1);
}

// Keeps only heuristics that don't overlap with the AI suggestions (by
// comparing the first 30 normalised characters). Stops us showing
// "Taxa de poupança 74%" twice when the AI also produced it.
function dedupHeuristicsVsAi(heuristics, aiTips) {
    const norm = s => (s || '').replace(/<[^>]+>/g, '').toLowerCase().replace(/\s+/g, ' ').slice(0, 40).trim();
    const aiKeys = new Set(aiTips.map(t => norm(t.text)));
    return heuristics.filter(h => !aiKeys.has(norm(h.text)));
}

function renderSavingsTips(container, tips, loading) {
    if (!container) return;
    const tipHtml = tips.map(t => {
        const icon = t.type === 'tip' ? 'fa-lightbulb' : t.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation';
        const aiTag = t.ai ? '<span style="display:inline-block;background:#EEE7FF;color:#5A3BD8;border-radius:4px;font-size:0.6rem;padding:1px 5px;font-weight:700;margin-right:6px;vertical-align:middle">IA</span>' : '';
        return `<div class="savings-item">
            <div class="savings-icon ${t.type}"><i class="fas ${icon}"></i></div>
            <div class="savings-text">${aiTag}${t.text}</div>
        </div>`;
    }).join('');
    const loadingHtml = loading ? `<div class="savings-item">
        <div class="savings-icon tip"><i class="fas fa-spinner fa-spin"></i></div>
        <div class="savings-text" style="font-style:italic;color:var(--text-light)">A IA está a analisar padrões adicionais…</div>
    </div>` : '';
    container.innerHTML = tipHtml + loadingHtml;
}

function hasAnyAiKey() {
    // Any configured provider unlocks the AI features — the dispatcher
    // handles picking the right one at call time.
    return !!(aiCfg.geminiKey || aiCfg.groqKey || aiCfg.grokKey || aiCfg.mistralKey);
}

// Single entry point for "text in, text out" AI calls. Picks the user's
// preferred provider first, then falls back through any other providers
// with a key configured when the preferred one errors (quota, 429, network).
// Every call site benefits — narrative, savings tips, NL query, auto-cat,
// scenarios, duplicates, fixas suggestion, share-message drafting.
async function callAIText(prompt) {
    const order = aiProviderFallbackOrder();
    if (!order.length) throw new Error('Sem chave de IA configurada');
    const errors = [];
    for (const provider of order) {
        try {
            if (provider === 'gemini') {
                const data = await callGeminiOnce(prompt);
                return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            }
            if (provider === 'groq') {
                const data = await callGroqOnce(prompt);
                return data?.choices?.[0]?.message?.content || '';
            }
            if (provider === 'grok') {
                const data = await callGrokOnce(prompt);
                return data?.choices?.[0]?.message?.content || '';
            }
            if (provider === 'mistral') {
                const data = await callMistralOnce(prompt);
                return data?.choices?.[0]?.message?.content || '';
            }
        } catch (e) {
            errors.push(`${provider}: ${e?.message || e}`);
            // Keep trying — next provider in the fallback chain.
        }
    }
    throw new Error(errors.join(' | ') || 'Todas as IAs falharam');
}

// Ordered list of providers to try: user's preferred first, then anything
// else that has a key. Used by callAIText and runReceiptOcr.
function aiProviderFallbackOrder() {
    const preferred = aiCfg.aiProvider || 'gemini';
    const hasKey = { gemini: !!aiCfg.geminiKey, groq: !!aiCfg.groqKey, grok: !!aiCfg.grokKey, mistral: !!aiCfg.mistralKey };
    const order = [];
    if (hasKey[preferred]) order.push(preferred);
    // Free tiers first in the fallback so we burn paid quota last.
    ['groq', 'mistral', 'gemini', 'grok'].forEach(p => { if (hasKey[p] && !order.includes(p)) order.push(p); });
    return order;
}

// Tries to parse a JSON object from the AI response, tolerating code fences
// or leading prose. Returns null if nothing usable is found.
function extractJsonObject(text) {
    if (!text) return null;
    const cleaned = text.replace(/```json|```/g, '');
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
}

async function generateAiSavingsInsights(monthExp, monthInc, prevExp) {
    const cats = getEffectiveCategories();
    const totalIncome = monthInc.reduce((s, e) => s + e.amount, 0);
    const totalExpenses = monthExp.filter(expenseAffectsBalance).reduce((s, e) => s + e.amount, 0);
    const byCat = groupByCategory(monthExp);

    // Three months of history lets the AI spot drifts rather than one-off
    // spikes ("tem vindo a subir há 3 meses" vs "só este mês").
    const history = [];
    for (let i = 0; i < 3; i++) {
        const d = new Date(currentDate); d.setDate(1); d.setMonth(d.getMonth() - (i + 1));
        const exp = getEffectiveMonthExpenses(d);
        const inc = getEffectiveMonthIncomes(d);
        const totalE = exp.reduce((s, e) => s + e.amount, 0);
        const totalI = inc.reduce((s, e) => s + e.amount, 0);
        history.push({
            mes: d.toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' }),
            rendimento: Math.round(totalI * 100) / 100,
            gastos: Math.round(totalE * 100) / 100,
            poupanca: Math.round((totalI - totalE) * 100) / 100,
            categorias: Object.entries(groupByCategory(exp))
                .sort((a, b) => b[1] - a[1]).slice(0, 6)
                .map(([c, v]) => ({ cat: cats[c]?.label || c, val: Math.round(v * 100) / 100 }))
        });
    }

    const byMerchant = {};
    monthExp.forEach(e => {
        if (e.isFixedExpense) return;
        const m = getCanonicalMerchant(e) || (e.description || 'Sem descrição').slice(0, 28);
        const key = `${cats[e.category]?.label || e.category}|${m}`;
        if (!byMerchant[key]) byMerchant[key] = { cat: cats[e.category]?.label || e.category, merchant: m, count: 0, total: 0 };
        byMerchant[key].count++;
        byMerchant[key].total += e.amount;
    });
    const topMerchants = Object.values(byMerchant)
        .sort((a, b) => b.total - a.total)
        .slice(0, 14)
        .map(m => ({ categoria: m.cat, estabelecimento: m.merchant, vezes: m.count, total: Math.round(m.total * 100) / 100, media: Math.round((m.total / m.count) * 100) / 100 }));

    const categoriasAtual = Object.entries(byCat)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([c, v]) => ({ categoria: cats[c]?.label || c, atual: Math.round(v * 100) / 100 }));

    const fixedTotal = Math.round(monthExp.filter(e => e.isFixedExpense).reduce((s, e) => s + e.amount, 0) * 100) / 100;
    const nonEssential = Math.round(monthExp.filter(e => e.essential === false).reduce((s, e) => s + e.amount, 0) * 100) / 100;

    const prompt = `${AI_SYSTEM_PROMPT}
Devolve 4 a 6 sugestões acionáveis como JSON array. Formato por item: {"type":"tip"|"warning"|"alert","text":"..."}.

Regras:
- Cita sempre VALORES concretos em EUR (ex: "podes poupar ~25€/mês").
- Prefere padrões entre estabelecimentos da mesma categoria (ticket médio, frequência, preço médio por visita).
- Usa o histórico dos 3 meses para identificar tendências (a subir há N meses, dispara só este mês, etc.).
- Sinaliza despesas que parecem evitáveis ou substituíveis.
- NÃO repitas a taxa de poupança.
- 1-2 frases por sugestão.

Contexto do mês atual (EUR):
Rendimento: ${totalIncome.toFixed(2)}
Gastos totais: ${totalExpenses.toFixed(2)} (dos quais ${fixedTotal.toFixed(2)} são fixos, ${nonEssential.toFixed(2)} não-essenciais)
Categorias: ${JSON.stringify(categoriasAtual)}
Top estabelecimentos (com total, nº de visitas e média por visita): ${JSON.stringify(topMerchants)}

Histórico recente (mais recente primeiro):
${JSON.stringify(history)}
${userProfilePromptBlock()}

Responde só com o JSON array.`;

    const rawText = await callAIText(prompt);
    const parsed = extractJsonArray(rawText);
    if (!Array.isArray(parsed)) return [];
    return parsed
        .filter(t => t && typeof t === 'object' && t.text)
        .map(t => ({
            type: ['tip', 'warning', 'alert'].includes(t.type) ? t.type : 'tip',
            text: String(t.text).slice(0, 400),
            ai: true
        }))
        .slice(0, 6);
}

// ===== AI ASSISTANTS =====
// Cache narrative per-month so switching tabs doesn't re-spend tokens.
const _aiNarrativeCache = {}; // { "YYYY-MM": { text, at } }
const _aiCategoryCache = new Map(); // description -> {category, essential}

const USER_PROFILE_KEY = 'user_profile_v1';

// Shared persona / guardrails prepended to every text-generation call so
// tone and formatting stay consistent across features. Individual prompts
// only define the task and data; this takes care of language, voice,
// anti-platitude stance, and output discipline.
const AI_SYSTEM_PROMPT = `És um consultor financeiro pessoal em Português de Portugal. Tom direto, amigável, sem jargão. Usa sempre valores em EUR. Evita platitudes ("poupe mais", "faça orçamento") e frases de fortuna. Quando devolveres JSON, devolve APENAS o JSON pedido, sem markdown nem texto antes/depois. Quando devolveres texto livre, sem aspas nem markdown — HTML só com <strong>...</strong>.`;

function aiMonthKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

// Rolls up the last 12 months of data into a compact "consumption profile".
// Persists in localStorage so it's loaded instantly on cold start; is kept
// fresh via recomputeUserProfile() after any data change. Every AI prompt
// attaches this so analyses build on the user's historical habits instead
// of just the current month's snapshot.
function recomputeUserProfile() {
    try {
        const cats = getEffectiveCategories();
        const MONTHS_BACK = 12;
        const monthly = [];
        const categoryTotals = {};    // catId -> { total, monthsSeen[], months: {YYYY-MM: total} }
        const merchantTotals = {};    // merchant -> { count, total, category }
        let weekendTotal = 0, weekdayTotal = 0;
        const weekendDays = new Set(), weekdayDays = new Set();

        for (let i = 0; i < MONTHS_BACK; i++) {
            const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
            const exp = getEffectiveMonthExpenses(d);
            const inc = getEffectiveMonthIncomes(d);
            if (exp.length === 0 && inc.length === 0) continue;
            const totE = exp.reduce((s, e) => s + e.amount, 0);
            const totI = inc.reduce((s, e) => s + e.amount, 0);
            const nonEss = exp.filter(e => e.essential === false).reduce((s, e) => s + e.amount, 0);
            const mKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            monthly.push({ mKey, totE, totI, nonEss });

            // Category roll-up (raw, per-month, so we can detect trends later)
            Object.entries(groupByCategory(exp)).forEach(([c, v]) => {
                if (!categoryTotals[c]) categoryTotals[c] = { total: 0, months: {} };
                categoryTotals[c].total += v;
                categoryTotals[c].months[mKey] = v;
            });

            // Merchant roll-up (canonical → "LIDL ODIVELAS" and "LIDL BRAGA"
            // collapse to the same Lidl bucket).
            exp.filter(e => !e.isFixedExpense).forEach(e => {
                const m = getCanonicalMerchant(e);
                if (!m) return;
                const k = m;
                if (!merchantTotals[k]) merchantTotals[k] = { count: 0, total: 0, category: cats[e.category]?.label || e.category };
                merchantTotals[k].count++;
                merchantTotals[k].total += e.amount;

                const d2 = new Date(e.date);
                const wd = d2.getDay();
                if (wd === 0 || wd === 6) { weekendTotal += e.amount; weekendDays.add(e.date); }
                else { weekdayTotal += e.amount; weekdayDays.add(e.date); }
            });
        }

        if (monthly.length === 0) {
            const empty = { meses_analisados: 0, ultima_actualizacao: new Date().toISOString() };
            localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(empty));
            return empty;
        }

        const avgE = monthly.reduce((s, m) => s + m.totE, 0) / monthly.length;
        const avgI = monthly.reduce((s, m) => s + m.totI, 0) / monthly.length;
        const avgNonEss = monthly.reduce((s, m) => s + m.nonEss, 0) / monthly.length;

        // Trend: linear direction by comparing first and last halves (min 4 months to be meaningful).
        const trendFor = (series) => {
            const months = Object.keys(series.months).sort();
            if (months.length < 4) return 'estavel';
            const half = Math.floor(months.length / 2);
            const oldAvg = months.slice(0, half).reduce((s, m) => s + series.months[m], 0) / half;
            const newAvg = months.slice(half).reduce((s, m) => s + series.months[m], 0) / (months.length - half);
            if (newAvg > oldAvg * 1.2) return 'a subir';
            if (newAvg < oldAvg * 0.8) return 'a descer';
            return 'estavel';
        };

        const topCategories = Object.entries(categoryTotals)
            .map(([c, v]) => ({
                categoria: cats[c]?.label || c,
                media_mensal: Math.round((v.total / monthly.length) * 100) / 100,
                tendencia: trendFor(v)
            }))
            .sort((a, b) => b.media_mensal - a.media_mensal)
            .slice(0, 10);

        const monthsCount = Math.max(1, monthly.length);
        const topMerchants = Object.entries(merchantTotals)
            .map(([name, v]) => ({
                estabelecimento: name,
                categoria: v.category,
                visitas_por_mes: Math.round((v.count / monthsCount) * 10) / 10,
                ticket_medio: Math.round((v.total / v.count) * 100) / 100,
                gasto_total: Math.round(v.total * 100) / 100
            }))
            .sort((a, b) => b.gasto_total - a.gasto_total)
            .slice(0, 10);

        const weekendAvg = weekendDays.size ? weekendTotal / weekendDays.size : 0;
        const weekdayAvg = weekdayDays.size ? weekdayTotal / weekdayDays.size : 0;
        const weekendPattern = weekendAvg > weekdayAvg * 1.4 ? 'elevado'
            : weekendAvg < weekdayAvg * 0.7 ? 'baixo' : 'normal';

        const profile = {
            meses_analisados: monthly.length,
            ultima_actualizacao: new Date().toISOString(),
            media_mensal: {
                gastos: Math.round(avgE * 100) / 100,
                rendimento: Math.round(avgI * 100) / 100,
                poupanca: Math.round((avgI - avgE) * 100) / 100,
                taxa_poupanca_pct: avgI > 0 ? Math.round((avgI - avgE) / avgI * 100) : 0,
                nao_essencial: Math.round(avgNonEss * 100) / 100
            },
            categorias_habituais: topCategories,
            estabelecimentos_habituais: topMerchants,
            padroes: {
                fim_de_semana: weekendPattern,
                gasto_medio_dia_util: Math.round(weekdayAvg * 100) / 100,
                gasto_medio_dia_fim_semana: Math.round(weekendAvg * 100) / 100,
                categorias_em_subida: topCategories.filter(c => c.tendencia === 'a subir').map(c => c.categoria).slice(0, 3),
                categorias_em_descida: topCategories.filter(c => c.tendencia === 'a descer').map(c => c.categoria).slice(0, 3)
            }
        };
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
        return profile;
    } catch (e) {
        console.warn('Could not recompute user profile:', e?.message || e);
        return null;
    }
}

// Returns the cached profile; refreshes if older than 6h. Returns null when
// we've never had enough data to build one.
function getUserProfile() {
    try {
        const raw = localStorage.getItem(USER_PROFILE_KEY);
        if (raw) {
            const p = JSON.parse(raw);
            const age = Date.now() - new Date(p.ultima_actualizacao || 0).getTime();
            if (age < 6 * 60 * 60 * 1000) return p;
        }
    } catch {}
    return recomputeUserProfile();
}

// Short prompt fragment — callers prepend this to any AI prompt so the
// model sees the user's long-term habits. Kept tiny so it doesn't eclipse
// the per-call data.
function userProfilePromptBlock() {
    const p = getUserProfile();
    if (!p || !p.meses_analisados) return '';
    return `\n\nPerfil de consumo do utilizador (${p.meses_analisados} meses de histórico):
${JSON.stringify({
    media_mensal: p.media_mensal,
    categorias_habituais: p.categorias_habituais,
    estabelecimentos_habituais: p.estabelecimentos_habituais,
    padroes: p.padroes
})}`;
}

function renderAiInsightsCard() {
    const card = document.getElementById('ai-insights-card');
    if (!card) return;
    if (!hasAnyAiKey()) { card.style.display = 'none'; return; }
    card.style.display = 'block';

    // Swap the card title based on whether an active salary cycle is in view.
    const today = new Date();
    const cycle = isSalaryConfigured() ? getSalaryCycleAt(today) : null;
    const viewIsCurrent = currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() === today.getMonth();
    const cycleActive = !!(cycle && viewIsCurrent && today >= cycle.start && today <= cycle.end);
    const titleEl = card.querySelector('.ai-insights-title');
    if (titleEl) {
        titleEl.innerHTML = cycleActive
            ? '<i class="fas fa-sparkles"></i> IA · Ciclo salarial em curso'
            : '<i class="fas fa-sparkles"></i> IA · Resumo do mês';
    }

    const key = aiMonthKey(currentDate);
    const cached = _aiNarrativeCache[key];
    const textEl = document.getElementById('ai-narrative-text');
    if (cached) {
        if (textEl) { textEl.classList.remove('loading'); textEl.innerHTML = cached.text; }
        return;
    }
    if (textEl) { textEl.classList.add('loading'); textEl.textContent = cycleActive ? 'A IA está a analisar o ciclo salarial…' : 'A IA está a analisar o mês…'; }
    generateAiMonthNarrative(currentDate).then(text => {
        if (aiMonthKey(currentDate) !== key) return; // month switched during call
        _aiNarrativeCache[key] = { text, at: Date.now() };
        if (textEl) { textEl.classList.remove('loading'); textEl.innerHTML = text; }
    }).catch(e => {
        console.warn('AI narrative failed:', e?.message || e);
        if (textEl) { textEl.classList.remove('loading'); textEl.textContent = 'Não consegui gerar o resumo agora. Tenta de novo.'; }
    });
}

function refreshAiNarrative() {
    const key = aiMonthKey(currentDate);
    delete _aiNarrativeCache[key];
    const ansEl = document.getElementById('ai-ask-answer');
    if (ansEl) { ansEl.style.display = 'none'; ansEl.textContent = ''; }
    renderAiInsightsCard();
}

async function generateAiMonthNarrative(date) {
    const cats = getEffectiveCategories();
    const monthExp = getEffectiveMonthExpenses(date);
    const monthInc = getEffectiveMonthIncomes(date);
    const prev = new Date(date); prev.setDate(1); prev.setMonth(prev.getMonth() - 1);
    const prevExp = getEffectiveMonthExpenses(prev);
    const prevInc = getEffectiveMonthIncomes(prev);

    const totE = monthExp.filter(expenseAffectsBalance).reduce((s, e) => s + e.amount, 0);
    const totI = monthInc.reduce((s, e) => s + e.amount, 0);
    const prevE = prevExp.reduce((s, e) => s + e.amount, 0);
    const prevI = prevInc.reduce((s, e) => s + e.amount, 0);

    const topDeltas = Object.entries(groupByCategory(monthExp))
        .map(([c, v]) => ({ cat: cats[c]?.label || c, atual: v, anterior: groupByCategory(prevExp)[c] || 0 }))
        .sort((a, b) => Math.abs(b.atual - b.anterior) - Math.abs(a.atual - a.anterior))
        .slice(0, 5)
        .map(x => ({ ...x, atual: Math.round(x.atual*100)/100, anterior: Math.round(x.anterior*100)/100 }));

    const monthLabel = date.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

    // If the viewed month carries an active salary cycle, the cycle is the
    // operational lens the user cares about — lead with it and make the month
    // comparison the supporting context.
    const today = new Date();
    const cycle = isSalaryConfigured() ? getSalaryCycleAt(today) : null;
    const viewIsCurrent = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
    const cycleActive = !!(cycle && viewIsCurrent && today >= cycle.start && today <= cycle.end);

    let prompt;
    if (cycleActive) {
        const b = getSalaryCycleBreakdown(cycle.start, cycle.end, today);
        const daysTotal = Math.max(1, Math.round((cycle.end - cycle.start) / 86400000) + 1);
        const daysElapsed = Math.max(1, Math.min(daysTotal, Math.round((today - cycle.start) / 86400000) + 1));
        const daysLeft = Math.max(0, daysTotal - daysElapsed);
        const totalBudget = b.incReceived || (b.expPaid + b.expPending);
        const available = totalBudget - b.expPaid - b.expPending;
        const dailyRate = b.expPaidVariable > 0 ? b.expPaidVariable / daysElapsed : 0;
        const dailyBudget = daysLeft > 0 && available > 0 ? available / daysLeft : 0;
        const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        const periodLabel = `${cycle.start.getDate()} ${months[cycle.start.getMonth()]} → ${cycle.end.getDate()} ${months[cycle.end.getMonth()]}`;
        prompt = `${AI_SYSTEM_PROMPT}
ESCREVE TEXTO CORRIDO (NÃO devolvas JSON, NÃO uses chaves {} nem aspas, NÃO devolvas listas). Apenas 2 a 3 frases naturais focadas no CICLO SALARIAL em curso (${periodLabel}, dia ${daysElapsed}/${daysTotal}). Só no fim, se sobrar espaço, contextualiza com o mês de calendário. Inclui pelo menos um valor concreto em EUR. Diz se está no bom caminho, se tem de abrandar o ritmo diário, ou se pode dar-se a um gasto extra.

Dados do ciclo (EUR):
Recebido: ${b.incReceived.toFixed(2)}
Gasto até agora: ${b.expPaid.toFixed(2)} (dos quais ${b.expPaidVariable.toFixed(2)} variável)
Fixo cativo a sair: ${b.expPending.toFixed(2)}
Disponível no ciclo: ${available.toFixed(2)}
Ritmo atual variável: ${dailyRate.toFixed(2)}/dia
Podes gastar (budget): ${dailyBudget.toFixed(2)}/dia nos próximos ${daysLeft} dias

Contexto do mês de calendário (secundário):
Este mês: gastos ${totE.toFixed(2)}, rendimento ${totI.toFixed(2)}
Mês anterior: gastos ${prevE.toFixed(2)}, rendimento ${prevI.toFixed(2)}
Top variações por categoria (atual vs anterior): ${JSON.stringify(topDeltas)}
${userProfilePromptBlock()}`;
    } else {
        prompt = `${AI_SYSTEM_PROMPT}
ESCREVE TEXTO CORRIDO (NÃO devolvas JSON, NÃO uses chaves {} nem aspas, NÃO devolvas listas). Apenas 2 a 3 frases naturais que resumam o mês de ${monthLabel}. Inclui pelo menos um valor concreto em EUR. Destaca o que é mais digno de nota (categoria que subiu/desceu, poupança, padrão incomum). Usa o perfil histórico para dizer se o mês está dentro do normal ou destoa.

Dados (EUR):
Este mês: gastos ${totE.toFixed(2)}, rendimento ${totI.toFixed(2)} (poupança ${(totI-totE).toFixed(2)})
Mês anterior: gastos ${prevE.toFixed(2)}, rendimento ${prevI.toFixed(2)} (poupança ${(prevI-prevE).toFixed(2)})
Top variações por categoria (atual vs anterior): ${JSON.stringify(topDeltas)}
${userProfilePromptBlock()}`;
    }

    const raw = await callAIText(prompt);
    return sanitizeNarrative(raw).slice(0, 600);
}

// Some models stubbornly return JSON even when asked for prose. Detect
// that case and either glue the JSON values into a sentence, or fall
// back to the raw text stripped of fences.
function sanitizeNarrative(raw) {
    if (!raw) return '';
    let s = String(raw).replace(/```json|```/gi, '').trim();
    // If it starts with a "json" tag or a brace, try to parse and join values.
    const looksJson = /^\s*(json\s*)?[\{\[]/i.test(s);
    if (looksJson) {
        const m = s.match(/[\{\[][\s\S]*[\}\]]/);
        if (m) {
            try {
                const obj = JSON.parse(m[0]);
                const parts = [];
                const collect = v => {
                    if (typeof v === 'string') parts.push(v);
                    else if (typeof v === 'number') parts.push(String(v));
                    else if (Array.isArray(v)) v.forEach(collect);
                    else if (v && typeof v === 'object') Object.values(v).forEach(collect);
                };
                collect(obj);
                if (parts.length) return parts.join('. ').replace(/\.+/g, '.').trim();
            } catch {}
        }
    }
    return s;
}

// ----- Natural-language money question -----
async function askAiMoney() {
    const input = document.getElementById('ai-ask-input');
    const ansEl = document.getElementById('ai-ask-answer');
    if (!input || !ansEl) return;
    const question = input.value.trim();
    if (!question) return;
    if (!hasAnyAiKey()) { ansEl.style.display = 'block'; ansEl.textContent = 'Configura uma chave de IA nas Definições para usar esta funcionalidade.'; return; }
    ansEl.style.display = 'block';
    ansEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A IA está a pensar…';
    try {
        const answer = await answerAiMoneyQuestion(question);
        ansEl.innerHTML = answer;
        input.value = '';
    } catch (e) {
        ansEl.textContent = `Erro: ${e?.message || 'não consegui responder'}`;
    }
}

async function answerAiMoneyQuestion(question) {
    const cats = getEffectiveCategories();
    // Pull 6 months of expenses so "desde Janeiro", "nos últimos 3 meses" etc. work.
    const history = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(currentDate); d.setDate(1); d.setMonth(d.getMonth() - i);
        const exp = getEffectiveMonthExpenses(d).filter(e => !e.isFixedExpense);
        history.push(...exp.map(e => ({
            data: e.date,
            desc: (e.description || '').slice(0, 40),
            valor: Math.round((e.amount || 0) * 100) / 100,
            categoria: cats[e.category]?.label || e.category,
            essencial: e.essential !== false
        })));
    }
    // Keep size bounded to avoid blowing up the context
    const slim = history.slice(0, 800);

    const today = new Date().toISOString().slice(0,10);
    const prompt = `${AI_SYSTEM_PROMPT}
Responde à pergunta do utilizador com base nas despesas abaixo. Hoje é ${today}.
ESCREVE TEXTO CORRIDO em PT-PT (1-3 frases curtas). NÃO devolvas JSON, NÃO uses chaves {} nem aspas, NÃO devolvas listas. Se a pergunta não puder ser respondida com estes dados, diz-o com clareza.

Pergunta: "${question.replace(/"/g, "'")}"

Despesas (últimos meses):
${JSON.stringify(slim)}
${userProfilePromptBlock()}`;

    const raw = await callAIText(prompt);
    // Same sanitiser the cycle narrative uses — turns the occasional
    // stray JSON ({"media_habitual":23.83}) into a usable sentence.
    return sanitizeNarrative(raw || 'Sem resposta.').slice(0, 800);
}

// ----- Auto-categorize from description -----
async function aiSuggestCategory(description) {
    if (!hasAnyAiKey() || !description || description.length < 3) return null;
    const key = description.toLowerCase().trim().slice(0, 50);
    if (_aiCategoryCache.has(key)) return _aiCategoryCache.get(key);
    const cats = getEffectiveCategories();
    const catList = Object.entries(cats).map(([id, c]) => ({ id, label: c.label }));
    const recent = expenses.slice(-80).map(e => ({
        desc: (e.description || '').slice(0, 40),
        cat: e.category,
        essencial: e.essential !== false
    }));
    const prompt = `Categoriza esta descrição de despesa. Devolve APENAS JSON: {"categoria":"<id>","essencial":true|false,"confianca":0..1}. Sem texto extra.
Descrição: "${description.replace(/"/g, "'")}"
Categorias disponíveis (usa o id exato): ${JSON.stringify(catList)}
Exemplos recentes do utilizador: ${JSON.stringify(recent)}
${userProfilePromptBlock()}`;
    try {
        const raw = await callAIText(prompt);
        const obj = extractJsonObject(raw);
        if (!obj || !obj.categoria || !cats[obj.categoria]) return null;
        const result = {
            category: obj.categoria,
            essential: obj.essencial !== false,
            confidence: typeof obj.confianca === 'number' ? obj.confianca : 0.7
        };
        _aiCategoryCache.set(key, result);
        return result;
    } catch (e) {
        console.warn('AI categorise failed:', e?.message || e);
        return null;
    }
}

let _aiCategoryDebounce = null;
function scheduleAiCategorySuggestion(descEl, categorySelect, hintEl, essentialInputs) {
    if (!hasAnyAiKey() || !descEl || !categorySelect || !hintEl) return;
    clearTimeout(_aiCategoryDebounce);
    _aiCategoryDebounce = setTimeout(async () => {
        const desc = descEl.value.trim();
        if (desc.length < 3) { hintEl.style.display = 'none'; return; }
        const result = await aiSuggestCategory(desc);
        if (!result || !result.category) { hintEl.style.display = 'none'; return; }
        const cats = getEffectiveCategories();
        const label = cats[result.category]?.label || result.category;
        hintEl.style.display = 'inline-flex';
        hintEl.innerHTML = `<i class="fas fa-sparkles"></i> IA sugere: <strong>${label}</strong>${result.essential ? '' : ' · não essencial'} <span style="opacity:0.7">(tocar para aplicar)</span>`;
        hintEl.onclick = () => {
            categorySelect.value = result.category;
            if (essentialInputs && essentialInputs.length) {
                essentialInputs.forEach(inp => { inp.checked = inp.value === (result.essential ? 'yes' : 'no'); });
            }
            hintEl.style.display = 'none';
        };
    }, 700);
}

// ----- Detect duplicates / weird entries in the current month -----
async function runAiDuplicateCheck() {
    if (!hasAnyAiKey()) { showToast('Configura uma chave de IA'); return; }
    const btn = document.getElementById('ai-dup-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A IA a analisar…'; }
    try {
        const cats = getEffectiveCategories();
        const monthExp = getEffectiveMonthExpenses(currentDate).filter(e => !e.isFixedExpense);
        const data = monthExp.map(e => ({
            id: e.id,
            data: e.date,
            desc: (e.description || '').slice(0, 50),
            valor: Math.round(e.amount * 100) / 100,
            cat: cats[e.category]?.label || e.category
        }));
        if (data.length < 3) { showToast('Sem despesas suficientes para analisar'); return; }
        const prompt = `Analisa estas despesas de um mês e devolve APENAS um JSON array com entradas suspeitas (duplicados prováveis, valores fora do padrão do histórico, categoria provavelmente errada). Formato por item: {"id":"…","motivo":"…","acao":"rever"|"apagar"|"recategorizar"}. Se nada suspeito, devolve []. Máx. 8 itens. Sem markdown.
Despesas: ${JSON.stringify(data)}
${userProfilePromptBlock()}`;
        const raw = await callAIText(prompt);
        const parsed = extractJsonArray(raw);
        showAiDuplicatesModal(parsed);
    } catch (e) {
        showToast(`IA falhou: ${e?.message || e}`);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Analisar com IA'; }
    }
}

function showAiDuplicatesModal(items) {
    const container = document.getElementById('ai-dup-results');
    if (!container) return;
    if (!items || !items.length) {
        container.innerHTML = '<p class="empty-state" style="padding:20px">Nenhuma entrada suspeita detetada.</p>';
        document.getElementById('modal-ai-duplicates')?.classList.add('active');
        return;
    }
    container.innerHTML = items.map(it => {
        const e = expenses.find(x => x.id === it.id);
        if (!e) return '';
        return `<div class="dup-row" style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="flex:1;min-width:0">
                <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.description || 'Sem descrição'}</div>
                <div style="font-size:0.75rem;color:var(--text-light)">${e.date} · ${formatCurrency(e.amount)}</div>
                <div style="font-size:0.78rem;margin-top:4px;color:#5A3BD8"><i class="fas fa-sparkles"></i> ${it.motivo || ''}</div>
            </div>
            <button class="btn btn-sm" onclick="editExpense('${e.id}');document.getElementById('modal-ai-duplicates').classList.remove('active')"><i class="fas fa-pen"></i></button>
            <button class="btn btn-sm" style="background:#FFEBEE;color:#C62828" onclick="if(confirm('Apagar?')){deleteExpense('${e.id}');this.closest('.dup-row').remove();}"><i class="fas fa-trash"></i></button>
        </div>`;
    }).join('');
    document.getElementById('modal-ai-duplicates')?.classList.add('active');
}

// ----- Suggest recurring expenses to promote to fixed -----
async function runAiFixedSuggestion() {
    if (!hasAnyAiKey()) { showToast('Configura uma chave de IA'); return; }
    const btn = document.getElementById('ai-fixed-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A analisar…'; }
    try {
        // Candidates: same description (normalized) appearing on ~monthly cadence
        // over the last 4 months. Let the AI decide which are genuine fixed.
        const cats = getEffectiveCategories();
        const candidates = {};
        for (let i = 0; i < 4; i++) {
            const d = new Date(currentDate); d.setDate(1); d.setMonth(d.getMonth() - i);
            const exp = getEffectiveMonthExpenses(d).filter(e => !e.isFixedExpense);
            exp.forEach(e => {
                const key = (e.description || '').toLowerCase().trim().slice(0, 30);
                if (!key) return;
                if (!candidates[key]) candidates[key] = { desc: (e.description || '').slice(0, 40), categoria: cats[e.category]?.label || e.category, meses: new Set(), total: 0, n: 0 };
                candidates[key].meses.add(`${d.getFullYear()}-${d.getMonth()}`);
                candidates[key].total += e.amount;
                candidates[key].n += 1;
            });
        }
        const shortlist = Object.values(candidates)
            .filter(c => c.meses.size >= 2)
            .map(c => ({ desc: c.desc, categoria: c.categoria, meses_com_entradas: c.meses.size, media: Math.round((c.total / c.n) * 100) / 100, total_ocorrencias: c.n }))
            .slice(0, 20);
        if (!shortlist.length) { showToast('Sem padrões suficientes'); return; }
        const prompt = `Com base nestas despesas recorrentes, devolve APENAS JSON array com candidatos a "despesa fixa" (recorrência mensal estável, mesmo valor ou próximo). Formato: {"desc":"…","media":N,"motivo":"…"}. Ignora compras variáveis (supermercado, restaurantes). Máx. 6. Sem markdown.
Candidatos: ${JSON.stringify(shortlist)}`;
        const raw = await callAIText(prompt);
        const parsed = extractJsonArray(raw);
        showAiFixedModal(parsed);
    } catch (e) {
        showToast(`IA falhou: ${e?.message || e}`);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Detetar fixas com IA'; }
    }
}

function showAiFixedModal(items) {
    const container = document.getElementById('ai-fixed-results');
    if (!container) return;
    if (!items || !items.length) {
        container.innerHTML = '<p class="empty-state" style="padding:20px">Nenhum candidato a fixa identificado.</p>';
    } else {
        container.innerHTML = items.map(it => `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="font-weight:600">${it.desc || 'Sem descrição'}</div>
            <div style="font-size:0.78rem;color:var(--text-light)">~${formatCurrency(it.media || 0)}/mês</div>
            <div style="font-size:0.78rem;margin-top:4px;color:#5A3BD8"><i class="fas fa-sparkles"></i> ${it.motivo || ''}</div>
        </div>`).join('');
    }
    document.getElementById('modal-ai-fixed')?.classList.add('active');
}

// ----- Draft a partner/co-parent settlement message -----
async function aiDraftShareMessage(context) {
    if (!hasAnyAiKey()) return null;
    const prompt = `Escreve uma mensagem curta, simpática, em Português de Portugal (tom casual, WhatsApp) para enviar à pessoa. Inclui o valor total, número de despesas, e um resumo breve. Sem emojis excessivos. Máx. 4 linhas. Devolve só o texto.
Contexto: ${JSON.stringify(context)}`;
    try { return (await callAIText(prompt)).trim(); } catch { return null; }
}

// ----- Receipt OCR (photo → expense) -----
// Resizes the photo to at most 1024px on the longer side and re-encodes as
// JPEG at 0.85 quality. Huge impact on token count for every provider:
// a raw 4000×3000 camera capture is ~4-5 MB base64; after this it's
// usually <200 KB. The user's keyboard thumb doesn't notice a crop this
// aggressive for a legible receipt.
function resizeImageForOcr(file, maxDim = 1024, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            const comma = dataUrl.indexOf(',');
            resolve({ data: comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl, type: 'image/jpeg' });
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não consegui ler a imagem')); };
        img.src = url;
    });
}

async function callGeminiVision(base64Data, mimeType, prompt) {
    if (!aiCfg.geminiKey) throw new Error('Chave Gemini não configurada');
    // flash-lite is ~5× cheaper in free-tier quota and handles receipts fine.
    // If it 404s on older deployments we fall through to flash.
    const models = ['gemini-2.0-flash-lite', 'gemini-2.0-flash'];
    let lastErr;
    for (const model of models) {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiCfg.geminiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [ { text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } } ] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 600 }
                })
            }
        );
        const data = await res.json().catch(() => ({}));
        if (!data.error) return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        lastErr = data.error.message || '';
        if (lastErr.toLowerCase().includes('quota')) throw new Error('Quota Gemini esgotada.');
    }
    throw new Error(lastErr || 'Erro Gemini');
}

// Groq and xAI both expose OpenAI-compatible multimodal calls: image as
// an image_url content part with a data URL.
async function callOpenAIVision(label, url, key, model, base64Data, mimeType, prompt) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({
            model,
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
                ]
            }],
            temperature: 0.1,
            max_tokens: 600
        })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.error?.message || data?.error || res.statusText || `Erro ${label}`;
        if (res.status === 401) throw new Error(`Chave ${label} inválida (401)`);
        if (res.status === 429) throw new Error(`${label}: limite atingido.`);
        throw new Error(`${label}: ${msg}`);
    }
    return data?.choices?.[0]?.message?.content || '';
}
function callGroqVision(b64, mime, prompt) {
    // Llama 4 Scout is Groq's current multimodal model in the free tier.
    return callOpenAIVision('Groq', 'https://api.groq.com/openai/v1/chat/completions', aiCfg.groqKey, 'meta-llama/llama-4-scout-17b-16e-instruct', b64, mime, prompt);
}
function callGrokVision(b64, mime, prompt) {
    return callOpenAIVision('Grok', 'https://api.x.ai/v1/chat/completions', aiCfg.grokKey, 'grok-2-vision-latest', b64, mime, prompt);
}
function callMistralVision(b64, mime, prompt) {
    // Pixtral is Mistral's multimodal line; the small variant is in the
    // free tier and has no trouble with receipts.
    return callOpenAIVision('Mistral', 'https://api.mistral.ai/v1/chat/completions', aiCfg.mistralKey, 'pixtral-12b-2409', b64, mime, prompt);
}

// Dispatch OCR to whatever provider is configured — starts with the user's
// selected one; on quota/failure falls back to another provider that has
// a key. Matters because Gemini free tier runs out, Groq/Mistral are
// generous.
async function runReceiptOcr(base64Data, mimeType, prompt) {
    const order = aiProviderFallbackOrder();
    if (!order.length) throw new Error('Sem chave de IA configurada (Gemini, Groq, Mistral ou Grok).');
    const tried = [];
    for (const provider of order) {
        try {
            if (provider === 'gemini')  return { text: await callGeminiVision(base64Data, mimeType, prompt), provider };
            if (provider === 'groq')    return { text: await callGroqVision(base64Data, mimeType, prompt), provider };
            if (provider === 'grok')    return { text: await callGrokVision(base64Data, mimeType, prompt), provider };
            if (provider === 'mistral') return { text: await callMistralVision(base64Data, mimeType, prompt), provider };
        } catch (e) {
            tried.push(`${provider}: ${e?.message || e}`);
        }
    }
    throw new Error(tried.join(' | ') || 'OCR falhou');
}

async function onReceiptImageSelected(input) {
    const file = input?.files?.[0];
    if (!file) return;
    if (!hasAnyAiKey()) {
        showToast('Scan de recibo requer chave Gemini, Groq, Mistral ou Grok');
        input.value = '';
        return;
    }
    const btn = document.getElementById('receipt-scan-btn');
    const originalHtml = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A ler recibo…'; }
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
    try {
        // Branch by file type so the chip works for both photos and the
        // PDF faturas the user gets via email (EDP, Meo, NOS, seguros…).
        // For PDFs we extract the text via pdf.js and ask the text AI;
        // for images we keep the vision flow.
        const cats = getEffectiveCategories();
        const catList = Object.entries(cats).map(([id, c]) => ({ id, label: c.label }));
        const today = new Date().toISOString().slice(0, 10);
        if (isPdf) {
            // Read raw bytes for pdf.js
            const buf = await file.arrayBuffer();
            await waitForPdfLib();
            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
            const out = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                let prevY = null;
                const line = [];
                for (const it of content.items) {
                    const y = it.transform?.[5];
                    if (prevY !== null && Math.abs(y - prevY) > 3) { out.push(line.join(' ')); line.length = 0; }
                    line.push(it.str);
                    prevY = y;
                }
                if (line.length) out.push(line.join(' '));
                out.push('');
            }
            const text = out.join('\n').trim();
            if (!text || text.length < 30) { showToast('PDF parece vazio ou ilegível'); return; }
            const promptPdf = `${AI_SYSTEM_PROMPT}
Tens o TEXTO desta fatura/recibo PT. Devolve APENAS o JSON com o shape de fatura (descricao, valor, data, hora, estabelecimento, categoria, essencial, confianca, notas, nifVendedor, nifCliente, ivaBase, ivaValor, ivaTaxa, metodoPagamento, cartaoUltimos4, tipoDocumento, atcud, numeroDocumento, moradaVendedor, cidadeVendedor, desconto, programaFidelidade, pontosFidelidade, tipoServico, gorjeta, itens, utility). Usa null quando não encontrares. Hoje é ${today}. Categorias: ${JSON.stringify(catList)}.${userProfilePromptBlock()}

TEXTO:
${text.slice(0, 8000)}`;
            const raw = await callAIText(promptPdf);
            const obj = extractJsonObject(raw);
            if (!obj || obj.erro) { showToast(obj?.erro || 'Não consegui ler o PDF'); return; }
            prefillExpenseFromReceipt(obj);
            showToast('PDF lido — verifica os campos');
            return;
        }
        const { data, type } = await resizeImageForOcr(file);
        const prompt = `Extrai os dados deste recibo/fatura em Português de Portugal. Devolve APENAS JSON com este shape (usa null quando não for legível):
{
  "descricao": "nome curto do estabelecimento",
  "valor": N,
  "data": "YYYY-MM-DD",
  "hora": "HH:MM" | null,
  "estabelecimento": "…",
  "categoria": "<id exato da lista>",
  "essencial": true|false,
  "confianca": 0..1,
  "notas": "…",
  "nifVendedor": "9 dígitos sem espaços" | null,
  "nifCliente": "9 dígitos sem espaços, se aparecer o NIF do comprador" | null,
  "ivaBase": N | null,
  "ivaValor": N | null,
  "ivaTaxa": 6 | 13 | 23 | null,
  "metodoPagamento": "cartao" | "mbway" | "dinheiro" | "transferencia" | "cheque" | "outro" | null,
  "cartaoUltimos4": "4 dígitos" | null,
  "tipoDocumento": "fatura" | "fatura-recibo" | "recibo" | "nota-credito" | null,
  "atcud": "código ATCUD (formato XXXXXXXX-NNNNN)" | null,
  "numeroDocumento": "nº do documento como aparece" | null,
  "moradaVendedor": "morada completa do estabelecimento" | null,
  "cidadeVendedor": "cidade extraída da morada" | null,
  "desconto": N | null,
  "programaFidelidade": "nome do programa (ex: Cartão Continente, Lidl Plus)" | null,
  "pontosFidelidade": N | null,
  "tipoServico": "mesa" | "take-away" | "esplanada" | "balcao" | "delivery" | null,
  "gorjeta": N | null,
  "itens": [{ "nome": "produto/prato normalizado", "qtd": N, "unidade": "un|kg|L|g|ml|dose" | null, "precoUnitario": N | null, "total": N, "iva": 6|13|23 | null }] | null,
  "utility": {
    "tipo": "eletricidade" | "agua" | "gas" | "telecom" | null,
    "periodoInicio": "YYYY-MM-DD" | null,
    "periodoFim": "YYYY-MM-DD" | null,
    "consumoKwh": N | null,
    "consumoM3": N | null,
    "potenciaKva": N | null,
    "tarifa": "simples" | "bi-horaria" | "tri-horaria" | null,
    "consumoVazio": N | null,
    "consumoCheias": N | null,
    "consumoPonta": N | null
  } | null
Para "itens": extrai cada linha da factura que represente um produto ou prato. Normaliza o nome (ex: "LEITE MIMOSA M.G. 1L" → "Leite Mimosa 1L"; "Prato do dia carne" → "Prato do dia"). Se a factura só tem o total agregado (ex: recibo de restauração sem linhas), devolve null ou []. Máximo 30 itens.
Se não conseguires ler o essencial, devolve {"erro":"razão"}. Sem markdown, sem texto fora do objeto.

Categorias (usa o id exato): ${JSON.stringify(catList)}
Hoje é ${today}. Se a data não for legível, usa hoje.${userProfilePromptBlock()}`;
        const { text, provider } = await runReceiptOcr(data, type, prompt);
        const obj = extractJsonObject(text);
        if (!obj || obj.erro) {
            showToast(obj?.erro || 'Não consegui ler o recibo');
            return;
        }
        prefillExpenseFromReceipt(obj);
        showToast(`Recibo lido via ${provider} — verifica os campos`);
    } catch (e) {
        showToast(`Erro: ${e?.message || e}`);
    } finally {
        if (btn && originalHtml != null) { btn.disabled = false; btn.innerHTML = originalHtml; }
        input.value = '';
    }
}

// Opens the "Nova despesa" modal and drops the extracted fields into it.
// The user still reviews and confirms — we never auto-save.
function prefillExpenseFromReceipt(obj) {
    // Opens the modal then routes to the unified OCR-apply helper so we
    // don't have two copies of the "map JSON → form fields" logic.
    showAddExpense();
    setTimeout(() => applyOcrFieldsToOpenModal(obj), 120);
}

// ===== FISCAL FIELDS (receipt details) =====
// In-flight state between the OCR read and the save. Also loaded from the
// edited expense when the user opens an existing entry.
let pendingReceiptFields = null;

// Normalises the utility block from OCR. All fields optional; we only
// persist when "tipo" is one of the recognised categories so we can filter
// utility-bearing expenses cheaply later.
function sanitizeUtility(u) {
    if (!u || typeof u !== 'object') return null;
    const tipo = ['eletricidade', 'agua', 'gas', 'telecom'].includes(u.tipo) ? u.tipo : null;
    if (!tipo) return null;
    const dateOk = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    return {
        tipo,
        periodoInicio: dateOk(u.periodoInicio),
        periodoFim:    dateOk(u.periodoFim),
        consumoKwh:    toNumberOrNull(u.consumoKwh),
        consumoM3:     toNumberOrNull(u.consumoM3),
        potenciaKva:   toNumberOrNull(u.potenciaKva),
        tarifa:        ['simples','bi-horaria','tri-horaria'].includes(u.tarifa) ? u.tarifa : null,
        consumoVazio:  toNumberOrNull(u.consumoVazio),
        consumoCheias: toNumberOrNull(u.consumoCheias),
        consumoPonta:  toNumberOrNull(u.consumoPonta)
    };
}

// Shape/trim line items returned by the OCR so they're safe to store and
// easy to aggregate later. Keeps normalised name, quantity, unit, unit
// price, total and VAT rate; drops anything that doesn't at least have a
// name and a positive total.
function sanitizeLineItems(arr) {
    if (!Array.isArray(arr)) return null;
    const out = arr.slice(0, 40).map(it => {
        if (!it || typeof it !== 'object') return null;
        const name = String(it.nome || '').trim().slice(0, 80);
        const total = toNumberOrNull(it.total);
        if (!name || total == null || total < 0) return null;
        const qty = toNumberOrNull(it.qtd);
        const unitPrice = toNumberOrNull(it.precoUnitario);
        const unit = typeof it.unidade === 'string' ? it.unidade.slice(0, 6) : null;
        const vat = [6, 13, 23].includes(it.iva) ? it.iva : null;
        return {
            name,
            quantity: qty != null && qty > 0 ? qty : 1,
            unit,
            unitPrice: unitPrice ?? (qty ? Math.round((total / qty) * 10000) / 10000 : null),
            total,
            vat,
            // Normalised key (lowercased, no punctuation) so we can group
            // "Leite Mimosa 1L" and "LEITE MIMOSA 1L" together later.
            key: name.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, '').replace(/\s+/g, ' ').trim()
        };
    }).filter(Boolean);
    return out.length ? out : null;
}

function cleanNif(v) {
    const s = String(v || '').replace(/\D+/g, '');
    return /^\d{9}$/.test(s) ? s : null;
}
function toNumberOrNull(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    return isFinite(n) ? Math.round(n * 100) / 100 : null;
}

// Populates the collapsible "Detalhes fiscais" block in the expense modal
// with whatever's in pendingReceiptFields. Called after OCR prefill and
// after loading an existing expense for editing.
function updateFiscalFieldsUI() {
    const p = pendingReceiptFields || {};
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v == null ? '' : v; };
    set('fiscal-seller-nif', p.sellerNif);
    set('fiscal-buyer-nif', p.buyerNif);
    set('fiscal-vat-base', p.vatBase);
    set('fiscal-vat-amount', p.vatAmount);
    set('fiscal-vat-rate', p.vatRate);
    set('fiscal-payment-method', p.paymentMethod || '');
    set('fiscal-card-last4', p.cardLast4);
    set('fiscal-time', p.purchaseTime);
    set('fiscal-doc-type', p.documentType || '');
    set('fiscal-atcud', p.atcud);
    set('fiscal-doc-number', p.docNumber);
    set('fiscal-address', p.sellerAddress);
    set('fiscal-city', p.sellerCity);
    set('fiscal-discount', p.discount);
    set('fiscal-loyalty-program', p.loyaltyProgram);
    set('fiscal-loyalty-points', p.loyaltyPoints);
    set('fiscal-service-type', p.serviceType || '');
    set('fiscal-tip', p.tip);
    set('fiscal-warranty', p.warrantyUntil);
    set('fiscal-channel', p.purchaseChannel || '');
    set('fiscal-context-tag', p.contextTag || '');
    // Location chip
    const locBtn = document.getElementById('fiscal-location-btn');
    if (locBtn) {
        if (p.location && p.location.lat != null) {
            locBtn.innerHTML = `<i class="fas fa-map-marker-alt"></i> Localização guardada <span style="opacity:0.7">(toca para remover)</span>`;
            locBtn.onclick = () => { if (pendingReceiptFields) pendingReceiptFields.location = null; updateFiscalFieldsUI(); };
        } else {
            locBtn.innerHTML = `<i class="fas fa-location-crosshairs"></i> Guardar localização atual`;
            locBtn.onclick = captureCurrentLocation;
        }
    }
    // Show the block collapsed by default unless something came from OCR.
    const body = document.getElementById('fiscal-details-body');
    const toggleIcon = document.getElementById('fiscal-details-toggle');
    const hasAny = p.sellerNif || p.buyerNif || p.vatAmount || p.paymentMethod || p.purchaseTime || p.documentType
                || p.atcud || p.sellerCity || p.discount || p.loyaltyProgram || p.serviceType || p.tip
                || p.warrantyUntil || p.purchaseChannel || p.contextTag || p.location
                || (p.lineItems && p.lineItems.length);
    if (body && toggleIcon) {
        body.style.display = hasAny ? 'block' : 'none';
        toggleIcon.className = hasAny ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    }
    applyFiscalFieldsContext();
}

// Hide/show fields that only make sense for certain categories so the
// form isn't cluttered with irrelevant options:
//  - gorjeta + tipo de serviço → only for restauração-like categories.
//  - garantia → only for tech/home durable categories.
//  - programa fidelização / pontos → makes no sense for most service
//    categories so restrict to supermercado/shopping-like.
function applyFiscalFieldsContext() {
    const cat = document.getElementById('expense-category')?.value || '';
    const hostField = id => document.getElementById(id)?.closest('div');
    const show = (id, visible) => { const h = hostField(id); if (h) h.style.display = visible ? '' : 'none'; };
    const isRestaurant  = ['restaurantes', 'alimentacao'].includes(cat);
    const isDurable     = ['casa', 'tecnologia', 'eletronica', 'mobiliario', 'outros', ''].includes(cat);
    const isShopping    = ['supermercado', 'alimentacao', 'casa', 'presentes', 'vestuario', 'tecnologia', 'eletronica', 'outros', ''].includes(cat);
    show('fiscal-service-type', isRestaurant);
    show('fiscal-tip',          isRestaurant);
    show('fiscal-warranty',     isDurable);
    show('fiscal-loyalty-program', isShopping);
    show('fiscal-loyalty-points',  isShopping);
    // Line items preview
    const itemsBox = document.getElementById('fiscal-line-items');
    if (itemsBox) {
        if (Array.isArray(p.lineItems) && p.lineItems.length) {
            itemsBox.style.display = 'block';
            itemsBox.innerHTML = `<div style="font-size:0.78rem;font-weight:600;margin-bottom:6px">${p.lineItems.length} ${p.lineItems.length === 1 ? 'item' : 'itens'} detetados</div>` +
                p.lineItems.map((it, idx) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);font-size:0.78rem;gap:8px">
                    <div style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${it.name}${it.quantity !== 1 ? ` <span style="color:var(--text-light)">×${it.quantity}${it.unit || ''}</span>` : ''}</div>
                    <div style="white-space:nowrap;font-weight:600">${formatCurrency(it.total)}</div>
                    <button type="button" onclick="removeLineItem(${idx})" class="btn-icon" style="width:22px;height:22px;color:var(--danger)"><i class="fas fa-xmark" style="font-size:0.7rem"></i></button>
                </div>`).join('');
        } else {
            itemsBox.style.display = 'none';
            itemsBox.innerHTML = '';
        }
    }
}

function captureCurrentLocation() {
    if (!navigator.geolocation) { showToast('GPS não disponível'); return; }
    const btn = document.getElementById('fiscal-location-btn');
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A localizar…';
    navigator.geolocation.getCurrentPosition(
        pos => {
            if (!pendingReceiptFields) pendingReceiptFields = { source: 'manual' };
            pendingReceiptFields.location = {
                lat: Math.round(pos.coords.latitude * 1e6) / 1e6,
                lng: Math.round(pos.coords.longitude * 1e6) / 1e6,
                accuracy: Math.round(pos.coords.accuracy)
            };
            showToast('Localização guardada');
            updateFiscalFieldsUI();
        },
        err => {
            showToast(`GPS: ${err.message}`);
            updateFiscalFieldsUI();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
}

function removeLineItem(idx) {
    if (!pendingReceiptFields?.lineItems) return;
    pendingReceiptFields.lineItems.splice(idx, 1);
    if (!pendingReceiptFields.lineItems.length) pendingReceiptFields.lineItems = null;
    updateFiscalFieldsUI();
}

function toggleFiscalDetails() {
    const body = document.getElementById('fiscal-details-body');
    const toggleIcon = document.getElementById('fiscal-details-toggle');
    if (!body || !toggleIcon) return;
    const open = body.style.display !== 'block';
    body.style.display = open ? 'block' : 'none';
    toggleIcon.className = open ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
}

// Reads the fiscal fields back from the DOM at save time.
function collectFiscalFieldsFromForm() {
    const val = id => document.getElementById(id)?.value.trim();
    return {
        sellerNif: cleanNif(val('fiscal-seller-nif')),
        buyerNif: cleanNif(val('fiscal-buyer-nif')),
        vatBase: toNumberOrNull(val('fiscal-vat-base')),
        vatAmount: toNumberOrNull(val('fiscal-vat-amount')),
        vatRate: val('fiscal-vat-rate') ? parseInt(val('fiscal-vat-rate'), 10) : null,
        paymentMethod: val('fiscal-payment-method') || null,
        cardLast4: /^\d{4}$/.test(val('fiscal-card-last4') || '') ? val('fiscal-card-last4') : null,
        purchaseTime: /^\d{2}:\d{2}$/.test(val('fiscal-time') || '') ? val('fiscal-time') : null,
        documentType: val('fiscal-doc-type') || null,
        atcud: val('fiscal-atcud') || null,
        docNumber: val('fiscal-doc-number') || null,
        sellerAddress: val('fiscal-address') || null,
        sellerCity: val('fiscal-city') || null,
        discount: toNumberOrNull(val('fiscal-discount')),
        loyaltyProgram: val('fiscal-loyalty-program') || null,
        loyaltyPoints: toNumberOrNull(val('fiscal-loyalty-points')),
        serviceType: val('fiscal-service-type') || null,
        tip: toNumberOrNull(val('fiscal-tip')),
        warrantyUntil: val('fiscal-warranty') || null,
        purchaseChannel: val('fiscal-channel') || null,
        contextTag: val('fiscal-context-tag') || null
    };
}

// ----- Salary cycle "what if" scenario -----
async function runAiSalaryScenario() {
    if (!hasAnyAiKey()) { showToast('Configura uma chave de IA'); return; }
    const ans = document.getElementById('ai-scenario-answer');
    // Toggle: a second tap while the panel is open collapses it.
    if (ans && ans.style.display === 'block' && ans.dataset.loaded === '1') {
        ans.style.display = 'none';
        return;
    }
    if (ans) { ans.style.display = 'block'; ans.dataset.loaded = '0'; ans.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A simular…'; }
    try {
        const cats = getEffectiveCategories();
        const monthExp = getEffectiveMonthExpenses(currentDate).filter(e => !e.isFixedExpense);
        const byCat = Object.entries(groupByCategory(monthExp)).sort((a,b) => b[1]-a[1]).slice(0,6)
            .map(([c,v]) => ({ cat: cats[c]?.label || c, valor: Math.round(v*100)/100 }));
        const prompt = `Sugere 3 cenários realistas de poupança para o mês, em Português de Portugal. Cada cenário: nome, o que mudar, e quanto poupa (EUR). Adapta as sugestões aos hábitos históricos do utilizador (não sugerir cortes em categorias em que mal gasta). Devolve APENAS JSON array: [{"nome":"…","acao":"…","poupa_eur":N}]. Sem markdown, máx. 3.
Categorias do mês: ${JSON.stringify(byCat)}
${userProfilePromptBlock()}`;
        const raw = await callAIText(prompt);
        const parsed = extractJsonArray(raw);
        if (!ans) return;
        if (!parsed.length) { ans.textContent = 'Sem sugestões desta vez.'; ans.dataset.loaded = '1'; return; }
        ans.innerHTML = parsed.map(s => `<div style="padding:8px 0;border-bottom:1px dashed var(--border)">
            <div style="font-weight:700;color:#5A3BD8">${s.nome || ''}</div>
            <div style="font-size:0.82rem">${s.acao || ''}</div>
            <div style="font-size:0.78rem;margin-top:3px;color:var(--success);font-weight:700">Poupa ~${formatCurrency(s.poupa_eur || 0)}</div>
        </div>`).join('');
        ans.dataset.loaded = '1';
    } catch (e) {
        if (ans) { ans.textContent = `Erro: ${e?.message || e}`; ans.dataset.loaded = '1'; }
    }
}

// ===== IRS TRACKER =====
// Simplified PT IRS deduction rules. Categories map to buckets, each bucket
// has a deductible % (of VAT or total) and an annual cap. Numbers follow
// 2024/2025 AT rules; user sees a best-effort estimate, not a guarantee.
const IRS_BUCKETS = [
    { id: 'saude',        label: 'Saúde',          pctOfVat: 15, cap: 1000.00, cats: ['saude'] },
    { id: 'educacao',     label: 'Educação',       pctOfVat: 30, cap: 800.00,  cats: ['educacao'] },
    { id: 'habitacao',    label: 'Habitação',      pctOfVat: 15, cap: 502.00,  cats: ['casa'] },
    { id: 'passes',       label: 'Passes sociais', pctOfVat: 100, cap: 250.00, cats: ['transportes'] },
    { id: 'restauracao',  label: 'Restauração',    pctOfVat: 15, cap: 250.00, cats: ['restaurantes','alimentacao'] },
    { id: 'outros',       label: 'Outros deduz.',  pctOfVat: 15, cap: 250.00, cats: [] } // catch-all bucket
];

function bucketForCategory(catId) {
    return IRS_BUCKETS.find(b => b.cats.includes(catId));
}

function populateIrsYearSelect() {
    const sel = document.getElementById('irs-year-select');
    if (!sel) return;
    const years = new Set();
    const nowY = new Date().getFullYear();
    years.add(nowY); years.add(nowY - 1);
    expenses.forEach(e => { const y = parseInt((e.date || '').slice(0, 4)); if (y > 2000) years.add(y); });
    const sorted = [...years].sort((a, b) => b - a);
    const current = sel.value || String(nowY);
    sel.innerHTML = sorted.map(y => `<option value="${y}">${y}</option>`).join('');
    sel.value = sorted.includes(parseInt(current)) ? current : String(sorted[0] || nowY);
}

function renderIrsTracker() {
    const card = document.getElementById('irs-tracker-card');
    const body = document.getElementById('irs-tracker-body');
    const yearLabel = document.getElementById('irs-year');
    if (!card || !body) return;

    populateIrsYearSelect();
    const yearSel = document.getElementById('irs-year-select');
    const year = parseInt(yearSel?.value || new Date().getFullYear());

    const userNif = getUserNif();
    // Only expenses with a fatura-type document AND buyerNif matching the
    // user's NIF count towards the deduction. Without a user NIF set we
    // show an onboarding message instead.
    const eligibleExp = expenses.filter(e => {
        if (!e.date || !e.date.startsWith(String(year))) return false;
        if (!e.vatAmount) return false;
        if (!e.documentType || e.documentType === 'recibo') return false;
        if (!userNif) return false;
        return e.buyerNif === userNif;
    });

    if (!userNif) {
        card.style.display = 'block';
        if (yearLabel) yearLabel.textContent = '';
        body.innerHTML = `<p class="empty-state" style="padding:16px 0">Adiciona o teu NIF nas Definições (Perfil) para começar a contabilizar o IVA deduzível das faturas.</p>`;
        return;
    }

    // Roll up per bucket
    const bucketTotals = {};
    IRS_BUCKETS.forEach(b => { bucketTotals[b.id] = { total: 0, vat: 0, count: 0 }; });
    eligibleExp.forEach(e => {
        const b = bucketForCategory(e.category) || IRS_BUCKETS.find(x => x.id === 'outros');
        bucketTotals[b.id].total += e.amount;
        bucketTotals[b.id].vat += e.vatAmount || 0;
        bucketTotals[b.id].count += 1;
    });

    let grandDeductible = 0;
    const rows = IRS_BUCKETS.map(b => {
        const t = bucketTotals[b.id];
        if (!t.count) return '';
        const deductible = Math.min(t.vat * b.pctOfVat / 100, b.cap);
        grandDeductible += deductible;
        const pctCap = b.cap > 0 ? Math.min(100, (deductible / b.cap) * 100) : 0;
        return `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                <div>
                    <div style="font-weight:600;font-size:0.88rem">${b.label}</div>
                    <div style="font-size:0.72rem;color:var(--text-light)">${t.count} ${t.count === 1 ? 'factura' : 'facturas'} · ${formatCurrency(t.total)} · IVA ${formatCurrency(t.vat)}</div>
                </div>
                <div style="text-align:right;white-space:nowrap">
                    <div style="font-weight:700;color:#5A3BD8">${formatCurrency(deductible)}</div>
                    <div style="font-size:0.7rem;color:var(--text-light)">máx. ${formatCurrency(b.cap)}</div>
                </div>
            </div>
            <div style="height:6px;background:#EEE7FF;border-radius:3px;margin-top:6px;overflow:hidden">
                <div style="height:100%;width:${pctCap}%;background:linear-gradient(90deg,#5A3BD8,#8C6DFF)"></div>
            </div>
        </div>`;
    }).join('');

    if (yearLabel) yearLabel.textContent = `· ${year}`;
    card.style.display = 'block';

    if (!eligibleExp.length) {
        body.innerHTML = `<p class="empty-state" style="padding:16px 0">Nenhuma factura com o teu NIF neste ano. Ao fazer scan de recibo/factura, se aparecer o teu NIF ele entra automaticamente.</p>`;
        return;
    }

    body.innerHTML = `<div style="background:linear-gradient(135deg,#F3EFFF,#FCF4FF);border-radius:10px;padding:12px;margin-bottom:10px;text-align:center">
        <div style="font-size:0.72rem;color:#5A3BD8;letter-spacing:0.04em;font-weight:700">ESTIMATIVA DE DEDUÇÃO IRS</div>
        <div style="font-size:1.8rem;font-weight:700;color:#2A1F4F;margin-top:2px">${formatCurrency(grandDeductible)}</div>
        <div style="font-size:0.72rem;color:var(--text-light)">Com ${eligibleExp.length} facturas elegíveis em ${year}</div>
    </div>${rows}`;
}

// ===== RECEIPT INSIGHTS =====
// Hub card for the data unlocked by the new receipt fields: warranties
// about to expire, yearly discount savings, spending by location, and
// loyalty-points totals. Hidden when there's nothing to show.
function renderReceiptInsights() {
    const card = document.getElementById('receipt-insights-card');
    const body = document.getElementById('receipt-insights-body');
    if (!card || !body) return;

    const now = new Date();
    const nowStr = now.toISOString().slice(0, 10);
    const year = now.getFullYear();

    // Warranties expiring in the next 60 days (or already lapsed in last 30).
    const soon = new Date(now); soon.setDate(now.getDate() + 60);
    const past = new Date(now); past.setDate(now.getDate() - 30);
    const warranties = expenses
        .filter(e => e.warrantyUntil && e.warrantyUntil >= past.toISOString().slice(0,10) && e.warrantyUntil <= soon.toISOString().slice(0,10))
        .sort((a, b) => a.warrantyUntil.localeCompare(b.warrantyUntil));

    // Promotional savings for the current year
    const yearExp = expenses.filter(e => e.date && e.date.startsWith(String(year)));
    const promoTotal = yearExp.reduce((s, e) => s + (e.discount || 0), 0);
    const promoCount = yearExp.filter(e => (e.discount || 0) > 0).length;

    // Spending by city (year)
    const byCity = {};
    yearExp.forEach(e => {
        const c = (e.sellerCity || '').trim();
        if (!c) return;
        byCity[c] = (byCity[c] || 0) + e.amount;
    });
    const topCities = Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Loyalty: total points per programa (year)
    const byLoyalty = {};
    yearExp.forEach(e => {
        if (!e.loyaltyProgram || !e.loyaltyPoints) return;
        const k = e.loyaltyProgram;
        byLoyalty[k] = (byLoyalty[k] || 0) + e.loyaltyPoints;
    });
    const loyaltyList = Object.entries(byLoyalty).sort((a, b) => b[1] - a[1]);

    // Spending by service type (restaurantes)
    const byService = {};
    yearExp.forEach(e => {
        if (!e.serviceType) return;
        byService[e.serviceType] = (byService[e.serviceType] || 0) + e.amount;
    });
    const serviceList = Object.entries(byService).sort((a, b) => b[1] - a[1]);

    const sections = [];

    if (warranties.length) {
        sections.push(`<div class="ri-section">
            <div class="ri-title"><i class="fas fa-shield-halved" style="color:#E65100"></i> Garantias</div>
            ${warranties.map(e => {
                const daysTo = Math.round((new Date(e.warrantyUntil) - now) / 86400000);
                const label = daysTo < 0 ? `expirou há ${Math.abs(daysTo)} dias` : daysTo === 0 ? 'expira hoje' : `faltam ${daysTo} dias`;
                const color = daysTo < 0 ? 'var(--text-light)' : daysTo <= 14 ? 'var(--danger)' : 'var(--warning)';
                return `<div class="ri-row">
                    <div><div style="font-weight:600">${e.description || 'Sem descrição'}</div><div style="font-size:0.7rem;color:var(--text-light)">Até ${formatDate(e.warrantyUntil)} · ${formatCurrency(e.amount)}</div></div>
                    <div style="text-align:right;font-size:0.72rem;color:${color};font-weight:600">${label}</div>
                </div>`;
            }).join('')}
        </div>`);
    }

    if (promoTotal > 0) {
        const totalYearSpend = yearExp.reduce((s, e) => s + e.amount, 0);
        const rate = totalYearSpend > 0 ? (promoTotal / (totalYearSpend + promoTotal) * 100).toFixed(1) : 0;
        sections.push(`<div class="ri-section">
            <div class="ri-title"><i class="fas fa-tag" style="color:var(--success)"></i> Poupança em promoções em ${year}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
                <div><div style="font-weight:700;color:var(--success);font-size:1.1rem">${formatCurrency(promoTotal)}</div><div style="font-size:0.72rem;color:var(--text-light)">em ${promoCount} ${promoCount === 1 ? 'factura' : 'facturas'} · ~${rate}% de taxa de desconto</div></div>
            </div>
        </div>`);
    }

    if (topCities.length) {
        const maxVal = topCities[0][1];
        sections.push(`<div class="ri-section">
            <div class="ri-title"><i class="fas fa-location-dot" style="color:var(--primary)"></i> Gastos por cidade em ${year}</div>
            ${topCities.map(([c, v]) => `<div style="padding:4px 0">
                <div style="display:flex;justify-content:space-between;font-size:0.82rem"><span>${c}</span><span style="font-weight:600">${formatCurrency(v)}</span></div>
                <div style="height:4px;background:#EEE7FF;border-radius:2px;margin-top:2px"><div style="height:100%;width:${Math.round(v/maxVal*100)}%;background:var(--primary);border-radius:2px"></div></div>
            </div>`).join('')}
        </div>`);
    }

    if (loyaltyList.length) {
        sections.push(`<div class="ri-section">
            <div class="ri-title"><i class="fas fa-star" style="color:#FDCB6E"></i> Pontos de fidelização em ${year}</div>
            ${loyaltyList.map(([p, pts]) => `<div class="ri-row">
                <div style="font-weight:600">${p}</div>
                <div style="font-weight:700;color:#5A3BD8">${Math.round(pts)} pts</div>
            </div>`).join('')}
        </div>`);
    }

    if (serviceList.length >= 2) {
        const totS = serviceList.reduce((s, [_, v]) => s + v, 0);
        sections.push(`<div class="ri-section">
            <div class="ri-title"><i class="fas fa-utensils" style="color:#E65100"></i> Restauração por tipo de serviço em ${year}</div>
            ${serviceList.map(([t, v]) => `<div class="ri-row">
                <div>${t === 'take-away' ? 'Take-away' : t.charAt(0).toUpperCase() + t.slice(1)}</div>
                <div style="font-weight:600">${formatCurrency(v)} <span style="font-size:0.72rem;color:var(--text-light);font-weight:400">(${Math.round(v/totS*100)}%)</span></div>
            </div>`).join('')}
        </div>`);
    }

    if (!sections.length) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    body.innerHTML = sections.join('');
}

// ===== UTILITY CONSUMPTION TRACKER =====
// Rolls up OCR-extracted kWh / m³ / contracted power by utility type and
// month so the user can see trends without depending on the AI.
function renderUtilityConsumption() {
    const card = document.getElementById('utility-card');
    const body = document.getElementById('utility-body');
    if (!card || !body) return;

    const rows = [];
    expenses.forEach(e => {
        if (!e.utility || !e.utility.tipo) return;
        const u = e.utility;
        const mKey = (u.periodoInicio || e.date || '').slice(0, 7);
        rows.push({ mKey, type: u.tipo, amount: e.amount, kwh: u.consumoKwh, m3: u.consumoM3, power: u.potenciaKva });
    });
    if (!rows.length) { card.style.display = 'none'; return; }
    card.style.display = 'block';

    const typeLabels = { eletricidade: 'Eletricidade', agua: 'Água', gas: 'Gás', telecom: 'Telecomunicações' };
    const typeIcons  = { eletricidade: 'fa-bolt',      agua: 'fa-droplet', gas: 'fa-fire', telecom: 'fa-wifi' };
    const byType = {};
    rows.forEach(r => {
        if (!byType[r.type]) byType[r.type] = [];
        byType[r.type].push(r);
    });

    body.innerHTML = Object.entries(byType).map(([type, list]) => {
        list.sort((a, b) => a.mKey.localeCompare(b.mKey));
        const recent = list.slice(-6);
        const unit = type === 'eletricidade' ? 'kWh' : type === 'agua' ? 'm³' : type === 'gas' ? 'm³' : '';
        const getConsumption = r => type === 'eletricidade' ? r.kwh : type === 'agua' || type === 'gas' ? r.m3 : null;
        const withCons = recent.filter(r => getConsumption(r) != null);
        const lastC = withCons.length ? getConsumption(withCons[withCons.length - 1]) : null;
        const prevC = withCons.length >= 2 ? getConsumption(withCons[withCons.length - 2]) : null;
        const trend = lastC != null && prevC != null ? ((lastC - prevC) / prevC) * 100 : 0;
        const trendCol = trend > 5 ? 'var(--danger)' : trend < -5 ? 'var(--success)' : 'var(--text-light)';
        const trendIcn = trend > 5 ? 'arrow-up' : trend < -5 ? 'arrow-down' : 'minus';
        const maxVal = Math.max(...recent.map(r => r.amount), 1);
        return `<div class="ri-section">
            <div class="ri-title" style="justify-content:space-between"><span><i class="fas ${typeIcons[type]}"></i> ${typeLabels[type]}</span>
                ${lastC != null ? `<span style="font-size:0.72rem;color:${trendCol};font-weight:600"><i class="fas fa-${trendIcn}"></i> ${lastC} ${unit}${prevC != null ? ` (${trend > 0 ? '+' : ''}${trend.toFixed(0)}% vs anterior)` : ''}</span>` : ''}
            </div>
            ${recent.map(r => {
                const c = getConsumption(r);
                return `<div style="padding:5px 0;display:grid;grid-template-columns:70px 1fr 80px;gap:8px;align-items:center;font-size:0.78rem">
                    <span style="color:var(--text-light)">${r.mKey}</span>
                    <div style="height:8px;background:#EEE7FF;border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.round(r.amount/maxVal*100)}%;background:var(--primary)"></div></div>
                    <span style="text-align:right;font-weight:600">${formatCurrency(r.amount)}${c != null ? ` · ${c}${unit}` : ''}</span>
                </div>`;
            }).join('')}
        </div>`;
    }).join('');
}

// ===== AI CROSS-RECEIPT ITEM ANALYSIS =====
// Walks line items across all receipts (plus the raw amount for utility
// bills that have no line items) and sends a grouped summary to the AI.
// Output splits by receipt type so the user sees groceries, restaurants
// and utilities analysed independently.
const UTILITIES_RE = /\b(edp|endesa|galp\s+g[áa]s|iberdrola|goldenergy|plenitude|naturgy|coopernico|coopérnico|águas|aguas|epal|simar|smas|indaqua|emarp|cmtgl|barcelos|aqualia|vodafone|meo|nos|nowo|dstelecom)\b/i;

async function runAiItemAnalysis() {
    if (!hasAnyAiKey()) { showToast('Configura uma chave de IA'); return; }
    const btn = document.getElementById('ai-items-btn');
    const body = document.getElementById('ai-items-body');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A IA a analisar itens…'; }
    try {
        const cats = getEffectiveCategories();
        // 6-month window keeps the prompt small while giving enough signal
        // for seasonal patterns (e.g. winter gas, summer water).
        const since = new Date(); since.setMonth(since.getMonth() - 6);
        const windowExp = expenses.filter(e => e.date && new Date(e.date) >= since && !e.isFixedExpense);

        // Supermarket items: products with per-unit prices
        const supermarketItems = [];
        const restaurantItems = [];
        windowExp.forEach(e => {
            if (!Array.isArray(e.lineItems) || !e.lineItems.length) return;
            const merchant = getCanonicalMerchant(e) || (e.description || '').trim();
            const target = e.category === 'restaurantes' ? restaurantItems
                : (e.category === 'supermercado' || e.category === 'alimentacao') ? supermarketItems
                : null;
            if (!target) return;
            e.lineItems.forEach(it => {
                target.push({
                    nome: it.name,
                    qtd: it.quantity,
                    unidade: it.unit,
                    preco_unit: it.unitPrice,
                    total: it.total,
                    data: e.date,
                    estabelecimento: merchant
                });
            });
        });

        // Utility bills: detect via description/merchant keywords, aggregate
        // per provider per month (bills rarely itemise the way receipts do).
        const utilities = {};
        windowExp.forEach(e => {
            const hay = `${e.description || ''} ${e.notes || ''}`;
            if (!UTILITIES_RE.test(hay)) return;
            const provider = hay.match(UTILITIES_RE)?.[0]?.trim().toLowerCase();
            if (!provider) return;
            const mKey = e.date.slice(0, 7);
            const key = `${provider}|${mKey}`;
            if (!utilities[key]) utilities[key] = { fornecedor: provider, mes: mKey, total: 0, n: 0 };
            utilities[key].total += e.amount;
            utilities[key].n += 1;
        });
        const utilityMonths = Object.values(utilities)
            .sort((a, b) => a.fornecedor.localeCompare(b.fornecedor) || a.mes.localeCompare(b.mes))
            .map(u => ({ ...u, total: Math.round(u.total * 100) / 100 }));

        // Cap each list to keep prompt under a reasonable size.
        const trim = (arr, n) => arr.slice(0, n).map(x => ({ ...x, total: x.total && Math.round(x.total * 100) / 100, preco_unit: x.preco_unit && Math.round(x.preco_unit * 100) / 100 }));

        if (!supermarketItems.length && !restaurantItems.length && !utilityMonths.length) {
            if (body) body.innerHTML = '<p class="empty-state" style="padding:16px 0">Sem itens para analisar. Faz scan de facturas com linhas (supermercado, restaurante, utilities) para ativar a análise.</p>';
            return;
        }

        const prompt = `${AI_SYSTEM_PROMPT}
Analisa os dados abaixo e devolve APENAS um JSON com esta estrutura (secções podem ser omitidas quando não há dados):
{
  "supermercado": [{"type":"tip|warning|alert","text":"..."}],
  "restaurante": [{"type":"tip|warning|alert","text":"..."}],
  "utilities": [{"type":"tip|warning|alert","text":"..."}],
  "transversal": [{"type":"tip|warning|alert","text":"..."}]
}
Cada secção tem 0-4 insights. Regras:
- Supermercado: mesma referência de produto a subir de preço ao longo dos meses, ou preço diferente entre estabelecimentos ("compras o ovo X no Lidl a 2,49 e no Pingo Doce a 3,19").
- Restaurante: pratos/bebidas favoritos, ticket médio por estabelecimento, gorjetas gastas no total.
- Utilities: se há faturas mensais de água/luz/gás e o valor disparou num mês, destaca.
- Transversal: padrões cruzados que relacionem categorias.
- Sempre valores em EUR, nomes de estabelecimentos reais.

Dados (últimos 6 meses):
Supermercado (${supermarketItems.length} linhas): ${JSON.stringify(trim(supermarketItems, 80))}
Restaurante (${restaurantItems.length} linhas): ${JSON.stringify(trim(restaurantItems, 60))}
Utilities por mês: ${JSON.stringify(utilityMonths.slice(0, 40))}
${userProfilePromptBlock()}`;

        const raw = await callAIText(prompt);
        const obj = extractJsonObject(raw) || {};
        const sections = [
            { key: 'supermercado', label: 'Supermercado', icon: 'fa-basket-shopping', color: '#2E7D32' },
            { key: 'restaurante',  label: 'Restauração',  icon: 'fa-utensils',       color: '#E65100' },
            { key: 'utilities',    label: 'Utilities (água, luz, gás)', icon: 'fa-bolt', color: '#FDCB6E' },
            { key: 'transversal',  label: 'Padrões transversais', icon: 'fa-shuffle', color: '#5A3BD8' }
        ];
        const hasAny = sections.some(s => Array.isArray(obj[s.key]) && obj[s.key].length);
        if (!hasAny) {
            if (body) body.innerHTML = '<p class="empty-state" style="padding:16px 0">A IA não encontrou padrões relevantes desta vez. Tenta novamente quando tiveres mais faturas.</p>';
            return;
        }
        if (body) body.innerHTML = sections.map(s => {
            const list = Array.isArray(obj[s.key]) ? obj[s.key] : [];
            if (!list.length) return '';
            return `<div class="ri-section">
                <div class="ri-title"><i class="fas ${s.icon}" style="color:${s.color}"></i> ${s.label}</div>
                ${list.map(t => {
                    const icn = t.type === 'tip' ? 'fa-lightbulb' : t.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation';
                    const col = t.type === 'tip' ? 'var(--success)' : t.type === 'warning' ? 'var(--warning)' : 'var(--danger)';
                    return `<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;font-size:0.85rem"><i class="fas ${icn}" style="color:${col};margin-top:2px"></i><div>${t.text || ''}</div></div>`;
                }).join('')}
            </div>`;
        }).join('');
    } catch (e) {
        if (body) body.innerHTML = `<p class="empty-state" style="padding:16px 0;color:var(--danger)">Erro: ${e?.message || e}</p>`;
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Analisar itens com IA'; }
    }
}

// ===== PRODUCT PRICE TRACKER =====
// Walks every expense that has lineItems and builds an index per normalised
// product name. Each product gets: total occurrences, last price seen,
// lowest/highest price with merchant, trend vs 3 months ago, and a matrix
// of prices by merchant so the user can spot that the same yogurt costs
// less at Lidl than at Pingo Doce.
function buildProductPriceIndex() {
    const bucket = new Map(); // key -> { name, entries: [{ date, unitPrice, total, merchant, quantity, unit }] }
    expenses.forEach(e => {
        if (!Array.isArray(e.lineItems) || !e.lineItems.length) return;
        const merchant = getCanonicalMerchant(e) || 'Sem descrição';
        const date = e.date;
        e.lineItems.forEach(it => {
            if (!it || !it.key) return;
            if (!bucket.has(it.key)) bucket.set(it.key, { name: it.name, entries: [] });
            const unitPrice = it.unitPrice != null ? it.unitPrice : (it.quantity ? it.total / it.quantity : it.total);
            bucket.get(it.key).entries.push({ date, unitPrice, total: it.total, merchant, quantity: it.quantity || 1, unit: it.unit || null });
        });
    });
    return bucket;
}

function renderProductPrices() {
    const card = document.getElementById('product-prices-card');
    const body = document.getElementById('product-prices-body');
    if (!card || !body) return;

    const index = buildProductPriceIndex();
    if (!index.size) { card.style.display = 'none'; return; }
    card.style.display = 'block';

    const filter = (document.getElementById('product-search')?.value || '').toLowerCase().trim();
    const rows = [];
    index.forEach((v, key) => {
        if (filter && !v.name.toLowerCase().includes(filter)) return;
        if (v.entries.length < 1) return;
        // Sort entries chronologically for the trend calc.
        const sorted = [...v.entries].sort((a, b) => a.date.localeCompare(b.date));
        const last = sorted[sorted.length - 1];
        const first = sorted[0];
        const prices = sorted.map(e => e.unitPrice).filter(p => p != null && isFinite(p));
        if (!prices.length) return;
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
        // Merchant breakdown: average unit price per merchant.
        const byMerchant = {};
        sorted.forEach(e => {
            if (!byMerchant[e.merchant]) byMerchant[e.merchant] = { total: 0, n: 0, prices: [] };
            byMerchant[e.merchant].total += e.total;
            byMerchant[e.merchant].n += 1;
            if (e.unitPrice != null && isFinite(e.unitPrice)) byMerchant[e.merchant].prices.push(e.unitPrice);
        });
        const merchantList = Object.entries(byMerchant)
            .map(([m, v2]) => ({ m, avg: v2.prices.length ? v2.prices.reduce((s,p) => s+p, 0) / v2.prices.length : null, n: v2.n }))
            .filter(x => x.avg != null)
            .sort((a, b) => a.avg - b.avg);
        const cheapest = merchantList[0];
        const priciest = merchantList[merchantList.length - 1];
        const trend = first.unitPrice && last.unitPrice ? ((last.unitPrice - first.unitPrice) / first.unitPrice) * 100 : 0;
        rows.push({
            key, name: v.name, count: sorted.length, last, min, max, avg, trend,
            sorted, merchantList, cheapest, priciest
        });
    });

    // Most-frequently-bought first (higher count = more signal).
    rows.sort((a, b) => b.count - a.count);

    if (!rows.length) {
        body.innerHTML = `<p class="empty-state" style="padding:16px 0">${filter ? 'Sem produtos que correspondam ao filtro.' : 'Faz scan de receitas com linhas (supermercado/restaurante) para começar a comparar preços.'}</p>`;
        return;
    }

    body.innerHTML = rows.slice(0, 30).map(r => {
        const trendColor = r.trend > 5 ? 'var(--danger)' : r.trend < -5 ? 'var(--success)' : 'var(--text-light)';
        const trendIcon = r.trend > 5 ? 'arrow-up' : r.trend < -5 ? 'arrow-down' : 'minus';
        const trendLbl = Math.abs(r.trend) < 1 ? 'estável' : `${r.trend > 0 ? '+' : ''}${r.trend.toFixed(0)}%`;
        const diffMerchant = (r.merchantList.length >= 2 && r.priciest.avg > r.cheapest.avg * 1.08)
            ? `<div style="font-size:0.72rem;margin-top:4px;color:#5A3BD8"><i class="fas fa-scale-balanced"></i> Mais barato em <strong>${r.cheapest.m}</strong> (${formatCurrency(r.cheapest.avg)}) vs <strong>${r.priciest.m}</strong> (${formatCurrency(r.priciest.avg)})</div>`
            : '';
        return `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.name}</div>
                    <div style="font-size:0.72rem;color:var(--text-light)">${r.count} ${r.count === 1 ? 'compra' : 'compras'} · última ${formatDate(r.last.date)} ${r.last.merchant ? `no ${r.last.merchant}` : ''}</div>
                    ${diffMerchant}
                </div>
                <div style="text-align:right;white-space:nowrap">
                    <div style="font-weight:700;font-size:0.9rem">${formatCurrency(r.last.unitPrice)}${r.last.unit ? `/${r.last.unit}` : ''}</div>
                    <div style="font-size:0.7rem;color:${trendColor}"><i class="fas fa-${trendIcon}"></i> ${trendLbl}</div>
                </div>
            </div>
            <div style="display:flex;gap:6px;margin-top:6px;font-size:0.7rem;color:var(--text-light);flex-wrap:wrap">
                <span>min <strong style="color:var(--success)">${formatCurrency(r.min)}</strong></span>
                <span>máx <strong style="color:var(--danger)">${formatCurrency(r.max)}</strong></span>
                <span>média ${formatCurrency(r.avg)}</span>
            </div>
        </div>`;
    }).join('');
}

function renderCategoryComparison() {
    const container = document.getElementById('category-comparison');
    const monthExp = getEffectiveMonthExpenses(currentDate);
    const prevExp = getPrevMonthExpenses();
    const curr = groupByCategory(monthExp);
    const prev = groupByCategory(prevExp);

    const allCats = [...new Set([...Object.keys(curr), ...Object.keys(prev)])];
    if (allCats.length === 0) {
        container.innerHTML = '<p class="empty-state">Sem dados para comparar</p>';
        return;
    }

    const maxVal = Math.max(...Object.values(curr), ...Object.values(prev), 1);

    container.innerHTML = allCats
        .sort((a, b) => (curr[b] || 0) - (curr[a] || 0))
        .map(cat => {
            const c = curr[cat] || 0;
            const p = prev[cat] || 0;
            const diff = c - p;
            const diffLabel = diff > 0 ? `+${formatCurrency(diff)}` : diff < 0 ? formatCurrency(diff) : '=';
            const diffColor = diff > 0 ? 'var(--danger)' : diff < 0 ? 'var(--success)' : 'var(--text-muted)';

            return `
                <div class="cat-comparison-item">
                    <div class="cat-comparison-header">
                        <span>${getEffectiveCategories()[cat]?.label || cat}</span>
                        <span style="color:${diffColor};font-weight:600;font-size:0.8rem">${diffLabel}</span>
                    </div>
                    <div class="cat-comparison-bars">
                        <div class="cat-bar cat-bar-prev" style="width:${(p / maxVal * 100).toFixed(1)}%" title="Anterior: ${formatCurrency(p)}"></div>
                    </div>
                    <div class="cat-comparison-bars" style="margin-top:2px">
                        <div class="cat-bar cat-bar-curr" style="width:${(c / maxVal * 100).toFixed(1)}%" title="Atual: ${formatCurrency(c)}"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-muted);margin-top:2px">
                        <span>Anterior: ${formatCurrency(p)}</span>
                        <span>Atual: ${formatCurrency(c)}</span>
                    </div>
                </div>
            `;
        }).join('');
}

function renderUnnecessaryExpenses() {
    const container = document.getElementById('unnecessary-expenses');
    const monthExp = getEffectiveMonthExpenses(currentDate);
    const nonEssential = monthExp.filter(e => e.essential === false).sort((a, b) => b.amount - a.amount);

    if (nonEssential.length === 0) {
        container.innerHTML = '<p style="font-size:0.85rem;color:var(--text-light)">Nenhuma despesa marcada como nao essencial. Ao adicionar despesas, marque as que nao sao essenciais.</p>';
        return;
    }

    const total = nonEssential.reduce((s, e) => s + e.amount, 0);
    container.innerHTML = nonEssential.map(e => `
        <div class="unnecessary-item">
            <i class="fas ${getEffectiveCategories()[e.category]?.icon || 'fa-circle'}" style="color:${getEffectiveCategories()[e.category]?.color}"></i>
            <div style="flex:1">
                <div style="font-weight:600">${e.description}</div>
                <div style="font-size:0.75rem;color:var(--text-light)">${formatDate(e.date)} &middot; ${getEffectiveCategories()[e.category]?.label}</div>
            </div>
            <div class="unnecessary-amount">${formatCurrency(e.amount)}</div>
        </div>
    `).join('') + `
        <div style="margin-top:12px;padding:10px;background:var(--bg);border-radius:8px;font-size:0.85rem">
            <strong>Total gastos nao essenciais:</strong> ${formatCurrency(total)}
            <br><span style="color:var(--text-light)">Podia poupar ate ${formatCurrency(total)} se eliminasse todos</span>
        </div>
    `;
}

// ===== ATTACHMENTS =====
function previewAttachment(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        pendingAttachment = { data: e.target.result, name: file.name, type: file.type };
        renderAttachmentPreview('attachment-preview', pendingAttachment);
    };
    reader.readAsDataURL(file);
}

function previewIncomeAttachment(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        pendingIncomeAttachment = { data: e.target.result, name: file.name, type: file.type };
        renderAttachmentPreview('income-attachment-preview', pendingIncomeAttachment);
    };
    reader.readAsDataURL(file);
}

function renderAttachmentPreview(containerId, attachment) {
    const container = document.getElementById(containerId);
    if (!attachment) { container.innerHTML = ''; return; }

    const isPdf = attachment.type === 'application/pdf';
    const isImage = (attachment.type || '').startsWith('image/');
    const isExpense = containerId === 'attachment-preview';
    // Both images and PDFs can be parsed by the AI for fatura data — the
    // image path uses vision, the PDF path extracts text via pdf.js and
    // sends it to the text model. Same outcome for the user: the modal
    // gets pre-filled.
    const canOcr = isExpense && (isImage || isPdf);
    container.innerHTML = `
        <div class="attachment-thumb ${isPdf ? 'attachment-thumb-pdf' : ''}">
            ${isPdf ? '<i class="fas fa-file-pdf"></i>' : `<img src="${attachment.data}" alt="Anexo">`}
            <button class="remove-attachment" onclick="remove${isExpense ? 'Pending' : 'PendingIncome'}Attachment()" type="button">
                <i class="fas fa-times"></i>
            </button>
        </div>
        ${canOcr ? `<button type="button" onclick="runOcrOnAttachment()" class="btn btn-sm" style="margin-top:6px;background:#FFF3E0;color:#E65100;border:1px solid #FFCC80;width:100%"><i class="fas fa-wand-magic-sparkles"></i> Ler esta fatura com IA</button>` : ''}
    `;
}

// Runs OCR against the currently-attached photo, so the "Anexar fatura"
// flow doubles as a scan. Users coming in via "+" → Anexar Fatura / Foto
// no longer need a separate "Scan recibo" chip — same button, richer
// outcome.
async function runOcrOnAttachment() {
    if (!pendingAttachment || !pendingAttachment.data) { showToast('Sem anexo'); return; }
    if (!hasAnyAiKey()) { showToast('Configura uma chave de IA'); return; }
    const isPdf = pendingAttachment.type === 'application/pdf';
    const isImage = (pendingAttachment.type || '').startsWith('image/');
    if (!isPdf && !isImage) { showToast('Tipo de ficheiro não suportado'); return; }
    try {
        const cats = getEffectiveCategories();
        const catList = Object.entries(cats).map(([id, c]) => ({ id, label: c.label }));
        const today = new Date().toISOString().slice(0, 10);
        if (isPdf) {
            // PDFs: extract text with pdf.js then route to the text AI with
            // the same fatura schema. Vision isn't used here because most
            // utility/insurance/invoice PDFs are text-native (OCR-quality
            // would only help scanned PDFs, which are rare in PT).
            showToast('A ler fatura PDF…');
            const text = await extractPdfTextFromAttachment(pendingAttachment);
            if (!text || text.length < 30) { showToast('PDF parece vazio ou ilegível'); return; }
            const prompt = `${AI_SYSTEM_PROMPT}
Tens o TEXTO desta fatura/recibo PT. Devolve APENAS o JSON com o shape de fatura (descricao, valor, data, hora, estabelecimento, categoria, essencial, confianca, notas, nifVendedor, nifCliente, ivaBase, ivaValor, ivaTaxa, metodoPagamento, cartaoUltimos4, tipoDocumento, atcud, numeroDocumento, moradaVendedor, cidadeVendedor, desconto, programaFidelidade, pontosFidelidade, tipoServico, gorjeta, itens, utility). Usa null para o que não encontrares. Hoje é ${today}. Categorias: ${JSON.stringify(catList)}.${userProfilePromptBlock()}

TEXTO:
${text.slice(0, 8000)}`;
            const raw = await callAIText(prompt);
            const obj = extractJsonObject(raw);
            if (!obj || obj.erro) { showToast(obj?.erro || 'Não consegui ler o PDF'); return; }
            applyOcrFieldsToOpenModal(obj);
            showToast('PDF lido — verifica os campos');
            return;
        }
        // Image path: same flow as the dedicated "Scan recibo" chip.
        const resized = await new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
                const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
                const cvs = document.createElement('canvas');
                cvs.width = w; cvs.height = h;
                cvs.getContext('2d').drawImage(img, 0, 0, w, h);
                const url = cvs.toDataURL('image/jpeg', 0.85);
                const c = url.indexOf(',');
                res({ data: c >= 0 ? url.slice(c + 1) : url, type: 'image/jpeg' });
            };
            img.onerror = () => rej(new Error('Não consegui ler a imagem'));
            img.src = pendingAttachment.data;
        });
        const prompt = `${AI_SYSTEM_PROMPT}
Extrai os dados deste recibo/fatura e devolve APENAS o JSON com o shape normal. Hoje é ${today}. Categorias: ${JSON.stringify(catList)}.${userProfilePromptBlock()}`;
        showToast('A ler fatura anexada…');
        const { text, provider } = await runReceiptOcr(resized.data, resized.type, prompt);
        const obj = extractJsonObject(text);
        if (!obj || obj.erro) { showToast(obj?.erro || 'Não consegui ler o recibo'); return; }
        applyOcrFieldsToOpenModal(obj);
        showToast(`Lido via ${provider} — verifica os campos`);
    } catch (e) {
        showToast(`Erro: ${e?.message || e}`);
    }
}

// Reuses the same pdf.js loader that the bank-statement importer uses,
// but takes a base64 data URL instead of a File. Returns plain text.
async function extractPdfTextFromAttachment(attachment) {
    await waitForPdfLib();
    const dataUrl = attachment.data;
    const comma = dataUrl.indexOf(',');
    const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
    // base64 → Uint8Array for pdf.js
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const out = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        let prevY = null;
        const line = [];
        for (const it of content.items) {
            const y = it.transform?.[5];
            if (prevY !== null && Math.abs(y - prevY) > 3) {
                out.push(line.join(' '));
                line.length = 0;
            }
            line.push(it.str);
            prevY = y;
        }
        if (line.length) out.push(line.join(' '));
        out.push(''); // page break
    }
    return out.join('\n').trim();
}

// Fills the currently-open expense modal with OCR output, keeping the
// user-entered description/amount if already set. Used both by the "Scan
// recibo" chip and by "Ler esta fatura com IA" on an attachment.
function applyOcrFieldsToOpenModal(obj) {
    pendingReceiptFields = {
        sellerNif:       cleanNif(obj.nifVendedor),
        buyerNif:        cleanNif(obj.nifCliente),
        vatBase:         toNumberOrNull(obj.ivaBase),
        vatAmount:       toNumberOrNull(obj.ivaValor),
        vatRate:         [6, 13, 23].includes(obj.ivaTaxa) ? obj.ivaTaxa : null,
        paymentMethod:   ['cartao','mbway','dinheiro','transferencia','cheque','outro'].includes(obj.metodoPagamento) ? obj.metodoPagamento : null,
        cardLast4:       /^\d{4}$/.test(String(obj.cartaoUltimos4 || '')) ? String(obj.cartaoUltimos4) : null,
        purchaseTime:    /^\d{2}:\d{2}$/.test(String(obj.hora || '')) ? String(obj.hora) : null,
        documentType:    ['fatura','fatura-recibo','recibo','nota-credito'].includes(obj.tipoDocumento) ? obj.tipoDocumento : null,
        atcud:           typeof obj.atcud === 'string' ? obj.atcud.trim().slice(0, 40) : null,
        docNumber:       typeof obj.numeroDocumento === 'string' ? obj.numeroDocumento.trim().slice(0, 40) : null,
        sellerAddress:   typeof obj.moradaVendedor === 'string' ? obj.moradaVendedor.trim().slice(0, 120) : null,
        sellerCity:      typeof obj.cidadeVendedor === 'string' ? obj.cidadeVendedor.trim().slice(0, 60) : null,
        discount:        toNumberOrNull(obj.desconto),
        loyaltyProgram:  typeof obj.programaFidelidade === 'string' ? obj.programaFidelidade.trim().slice(0, 40) : null,
        loyaltyPoints:   toNumberOrNull(obj.pontosFidelidade),
        serviceType:     ['mesa','take-away','esplanada','balcao','delivery'].includes(obj.tipoServico) ? obj.tipoServico : null,
        tip:             toNumberOrNull(obj.gorjeta),
        lineItems:       sanitizeLineItems(obj.itens),
        utility:         sanitizeUtility(obj.utility),
        location:        pendingReceiptFields?.location || null,
        source: 'ocr'
    };
    // Fill the form fields only when empty (don't clobber user-typed data)
    const descEl = document.getElementById('expense-desc');
    const amtEl = document.getElementById('expense-amount');
    const dateEl = document.getElementById('expense-date');
    const catEl = document.getElementById('expense-category');
    const notesEl = document.getElementById('expense-notes');
    if (descEl && !descEl.value && obj.descricao) descEl.value = String(obj.descricao).slice(0, 60);
    if (amtEl && !amtEl.value && typeof obj.valor === 'number') amtEl.value = obj.valor;
    if (dateEl && obj.data && /^\d{4}-\d{2}-\d{2}$/.test(obj.data)) dateEl.value = obj.data;
    const cats = getEffectiveCategories();
    if (catEl && !catEl.value && obj.categoria && cats[obj.categoria]) catEl.value = obj.categoria;
    if (notesEl && !notesEl.value) {
        const pieces = [];
        if (obj.estabelecimento && (!obj.descricao || !obj.descricao.toLowerCase().includes(String(obj.estabelecimento).toLowerCase()))) pieces.push(obj.estabelecimento);
        if (obj.notas) pieces.push(obj.notas);
        if (pieces.length) notesEl.value = pieces.join(' · ');
    }
    if (typeof obj.essencial === 'boolean') {
        const radio = document.querySelector(`input[name="essential"][value="${obj.essencial ? 'yes' : 'no'}"]`);
        if (radio) radio.checked = true;
    }
    updateFiscalFieldsUI();
    applyFiscalFieldsContext();
}

function removePendingAttachment() {
    pendingAttachment = null;
    document.getElementById('expense-attachment').value = '';
    document.getElementById('attachment-preview').innerHTML = '';
}

function removePendingIncomeAttachment() {
    pendingIncomeAttachment = null;
    document.getElementById('income-attachment').value = '';
    document.getElementById('income-attachment-preview').innerHTML = '';
}

function viewAttachment(id) {
    const e = expenses.find(x => x.id === id);
    if (!e?.attachment) return;
    showAttachmentViewer(e.attachment);
}

function viewIncomeAttachment(id) {
    const e = incomes.find(x => x.id === id);
    if (!e?.attachment) return;
    showAttachmentViewer(e.attachment);
}

function showAttachmentViewer(attachment) {
    const container = document.getElementById('attachment-viewer-content');
    const isPdf = attachment.type === 'application/pdf';
    container.innerHTML = isPdf
        ? `<p>Ficheiro PDF: ${attachment.name}</p><a href="${attachment.data}" download="${attachment.name}" class="btn btn-primary btn-block"><i class="fas fa-download"></i> Descarregar</a>`
        : `<img src="${attachment.data}" alt="Anexo"><br><a href="${attachment.data}" download="${attachment.name || 'fatura.jpg'}" class="btn btn-secondary btn-block" style="margin-top:10px"><i class="fas fa-download"></i> Descarregar</a>`;
    document.getElementById('modal-attachment').classList.add('active');
}

function closeAttachmentViewer() {
    document.getElementById('modal-attachment').classList.remove('active');
}

// ===== ADD/EDIT EXPENSE =====
function showAddExpense() {
    // Open the modal up-front so a downstream init failure can't leave the
    // user staring at an unresponsive FAB. The rest of the setup happens
    // inside a try/catch so the form is at least visible even if one of
    // the new optional features (prepaid cards, etc.) blows up.
    const modal = document.getElementById('modal-add');
    if (modal) modal.classList.add('active');
    try {
        document.getElementById('modal-title').textContent = 'Nova Despesa';
        document.getElementById('expense-id').value = '';
        window._editingExpenseId = null;
        const promoBtn = document.getElementById('promote-to-fixed-btn');
        if (promoBtn) promoBtn.style.display = 'none';
        // Prepaid cards: show select only when the user has at least one card.
        const prepaidGrp = document.getElementById('expense-prepaid-group');
        if (prepaidGrp) prepaidGrp.style.display = (Array.isArray(prepaidCards) && prepaidCards.length) ? 'block' : 'none';
        populatePrepaidSelect();
        const psel = document.getElementById('expense-prepaid-card');
        if (psel) psel.value = '';
        document.getElementById('expense-date').valueAsDate = new Date();
        document.getElementById('laura-split-group').style.display = 'none';
        document.getElementById('paid-by-father-group').style.display = 'none';
        const ovGrp0 = document.getElementById('split-pct-override-group');
        const ovCb0 = document.getElementById('split-pct-override-on');
        const ovFields0 = document.getElementById('split-pct-override-fields');
        const ovInput0 = document.getElementById('split-pct-override');
        if (ovGrp0) ovGrp0.style.display = 'none';
        if (ovCb0) ovCb0.checked = false;
        if (ovFields0) ovFields0.style.display = 'none';
        if (ovInput0) ovInput0.value = '';
        // Don't wipe OCR-injected fiscal fields right before we render them.
        // prefillExpenseFromReceipt sets pendingReceiptFields and then calls
        // showAddExpense(); when the user opens manually, reset here.
        if (pendingReceiptFields?.source !== 'ocr') pendingReceiptFields = null;
        pendingAttachment = null;
        document.getElementById('attachment-preview').innerHTML = '';
        populateExpenseTypeOptions(); // rebuilds radios (resets to personal)
        document.getElementById('expense-form').reset();
        document.getElementById('expense-date').valueAsDate = new Date();
        // Restore last used category
        const lastCat = JSON.parse(localStorage.getItem(LAST_CAT_KEY) || '{}');
        const catSelect = document.getElementById('expense-category');
        if (lastCat.expense && catSelect.querySelector(`option[value="${lastCat.expense}"]`)) {
            catSelect.value = lastCat.expense;
        }
        renderPeopleSuggestions();
        // Initialize split-across-children UI
        const splitGrp = document.getElementById('split-children-group');
        if (splitGrp) {
            splitGrp.style.display = children.length >= 2 ? 'block' : 'none';
            if (children.length >= 2) {
                renderSplitAcrossChildrenList('split-across-children');
                setupSplitAcrossToggle('split-across-children', 'split-across-children-list');
                document.getElementById('split-across-children').checked = false;
                document.getElementById('split-across-children-list').style.display = 'none';
            }
        }
        // Initialize spouse split UI (married mode)
        setupSpouseSplitUI(null);
        // Reset splits section
        const swOther = document.getElementById('split-with-other');
        if (swOther) swOther.checked = false;
        const list = document.getElementById('splits-list');
        if (list) list.innerHTML = '';
        toggleSplitWithOther();
        populateSplitWithNamesList();
        updatePartnerQuickGroupUI(null);
        // Reset mix-with-child state (defaults to hidden; setupTypeToggle shows when type=personal)
        const mixCb = document.getElementById('mix-with-child');
        if (mixCb) mixCb.checked = false;
        toggleMixWithChild();
        const mixGrp = document.getElementById('mix-personal-child-group');
        if (mixGrp) mixGrp.style.display = children.length >= 1 ? 'block' : 'none';
        if (children.length >= 1) populateMixChildSelect();
        document.getElementById('expense-is-grouped').checked = false;
        onIsGroupedChange();
        updateFiscalFieldsUI();
    } catch (err) {
        console.error('showAddExpense init error:', err);
    }
}

function toggleMixWithChild() {
    const cb = document.getElementById('mix-with-child');
    const fields = document.getElementById('mix-with-child-fields');
    if (cb && fields) fields.style.display = cb.checked ? 'block' : 'none';
    if (cb?.checked) { populateMixChildSelect(); updateMixCoParentLabels(); }
}

// Mix Pessoal + partner UI — mirror of the mix-with-child flow, for a
// namorado/a in separated mode. Populates partner name in the labels.
function toggleMixWithPartner() {
    const cb = document.getElementById('mix-with-partner');
    const fields = document.getElementById('mix-with-partner-fields');
    if (cb && fields) fields.style.display = cb.checked ? 'block' : 'none';
}

// No-op kept for HTML onchange wiring. Grouped + "Atribuir parte a X" is a
// valid combination (whole-expense attribution wins over per-entry flags).
function onIsGroupedChange() {}

function toggleMixPartnerSplit() {
    const cb = document.getElementById('mix-partner-split');
    const fields = document.getElementById('mix-partner-split-fields');
    if (cb && fields) fields.style.display = cb.checked ? 'block' : 'none';
    if (!cb?.checked) {
        const paid = document.getElementById('mix-partner-paid');
        if (paid) paid.checked = false;
    }
}

function updateMixPartnerUI(expense) {
    const grp = document.getElementById('mix-personal-partner-group');
    if (!grp) return;
    const name = getPartnerName();
    const show = !isMarriedMode() && !!name;
    grp.style.display = show ? 'block' : 'none';
    if (!show) return;
    document.querySelectorAll('.mix-partner-name').forEach(el => { el.textContent = name; });
    const headerName = document.getElementById('mix-partner-header-name');
    if (headerName) headerName.textContent = name;
    // Populate from the expense when editing
    const cb = document.getElementById('mix-with-partner');
    const pct = document.getElementById('mix-partner-pct');
    const splitCb = document.getElementById('mix-partner-split');
    const paidCb = document.getElementById('mix-partner-paid');
    const has = !!(expense && expense.mixPartnerPct);
    if (cb) cb.checked = has;
    if (pct) pct.value = expense?.mixPartnerPct || 50;
    if (splitCb) splitCb.checked = !!(expense && expense.mixPartnerSplit);
    if (paidCb) paidCb.checked = !!(expense && expense.mixPartnerPaid);
    toggleMixWithPartner();
    toggleMixPartnerSplit();
}

// Kept as alias so old call sites don't break; unified into updateMixPartnerUI.
function updatePartnerQuickGroupUI(expense) { updateMixPartnerUI(expense); }

function populateMixChildSelect() {
    const sel = document.getElementById('mix-child-id');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    if (currentVal && children.some(c => c.id === currentVal)) sel.value = currentVal;
}

function toggleMixCoParent() {
    const cb = document.getElementById('mix-child-split-coparent');
    const row = document.getElementById('mix-coparent-paid-row');
    if (cb && row) row.style.display = cb.checked ? 'block' : 'none';
    if (!cb?.checked) {
        const paid = document.getElementById('mix-child-paid-by-father');
        if (paid) paid.checked = false;
    }
}

function updateMixCoParentLabels() {
    const childId = document.getElementById('mix-child-id')?.value;
    const child = children.find(c => c.id === childId);
    const lbl = document.getElementById('mix-coparent-label');
    const paidLbl = document.getElementById('mix-coparent-paid-label');
    const coName = child?.coParentName || 'co-progenitor';
    if (lbl) lbl.textContent = `Dividir a parte com ${coName}`;
    if (paidLbl) paidLbl.textContent = `${coName} já pagou a parte dele`;
}

function toggleSplitWithOther() {
    const cb = document.getElementById('split-with-other');
    const fields = document.getElementById('split-with-other-fields');
    if (cb && fields) fields.style.display = cb.checked ? 'block' : 'none';
    // Ensure at least one empty row when enabled
    if (cb && cb.checked) {
        const list = document.getElementById('splits-list');
        if (list && list.children.length === 0) addSplitRow();
    }
}

// Per-expense split percentage override toggle (separated mode only).
function toggleSplitPctOverride() {
    const cb = document.getElementById('split-pct-override-on');
    const fields = document.getElementById('split-pct-override-fields');
    const input = document.getElementById('split-pct-override');
    if (!cb || !fields) return;
    fields.style.display = cb.checked ? 'block' : 'none';
    if (cb.checked && input && !input.value) {
        // Default to the child's configured % so the user can tweak from there.
        const typeRadio = document.querySelector('input[name="expense-type"]:checked');
        const child = typeRadio ? children.find(c => c.id === typeRadio.value) : null;
        input.value = child?.splitPct || 50;
    }
}

// Same as the variable-expense override but for fixed expenses.
function toggleFixedSplitPctOverride() {
    const cb = document.getElementById('fixed-split-pct-override-on');
    const fields = document.getElementById('fixed-split-pct-override-fields');
    const input = document.getElementById('fixed-split-pct-override');
    if (!cb || !fields) return;
    fields.style.display = cb.checked ? 'block' : 'none';
    if (cb.checked && input && !input.value) {
        const typeRadio = document.querySelector('input[name="fixed-type"]:checked');
        const child = typeRadio ? children.find(c => c.id === typeRadio.value) : null;
        input.value = child?.splitPct || 50;
    }
}

// Suggests names previously used for quick re-selection.
function populateSplitWithNamesList() {
    const dl = document.getElementById('split-with-names-list');
    if (!dl) return;
    const names = new Set();
    expenses.forEach(e => {
        (Array.isArray(e.splits) ? e.splits : []).forEach(s => { if (s.name) names.add(s.name); });
        if (e.splitWithName) names.add(e.splitWithName);
    });
    fixedExpenses.forEach(f => {
        (Array.isArray(f.splits) ? f.splits : []).forEach(s => { if (s.name) names.add(s.name); });
    });
    dl.innerHTML = [...names].sort().map(n => `<option value="${n.replace(/"/g, '&quot;')}">`).join('');
}

// Adds a split row to the modal. Accepts an optional pre-fill { name, amount, paid }.
function addSplitRow(prefill) {
    const list = document.getElementById('splits-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'split-row';
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center';
    row.innerHTML = `
        <input type="text" class="split-name" placeholder="Nome" list="split-with-names-list" style="flex:2;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-family:var(--font);font-size:0.85rem">
        <input type="number" class="split-amount" placeholder="Valor" step="0.01" min="0" style="flex:1;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-family:var(--font);font-size:0.85rem">
        <label style="display:flex;align-items:center;gap:3px;font-size:0.72rem;color:var(--text-light)">
            <input type="checkbox" class="split-paid"> pago
        </label>
        <button type="button" onclick="removeSplitRow(this)" class="btn-icon" style="color:var(--danger);font-size:0.9rem"><i class="fas fa-times"></i></button>
    `;
    if (prefill) {
        row.querySelector('.split-name').value = prefill.name || '';
        if (prefill.amount != null) row.querySelector('.split-amount').value = parseFloat(prefill.amount).toFixed(2);
        row.querySelector('.split-paid').checked = !!prefill.paid;
    }
    list.appendChild(row);
}

function removeSplitRow(btn) {
    const row = btn.closest('.split-row');
    if (row) row.remove();
}

// Reads the current splits rows from the modal.
function collectSplitsFromModal() {
    const rows = document.querySelectorAll('#splits-list .split-row');
    return [...rows].map(r => {
        const name = r.querySelector('.split-name')?.value.trim() || '';
        const amount = parseFloat(r.querySelector('.split-amount')?.value) || 0;
        const paid = !!r.querySelector('.split-paid')?.checked;
        return { name, amount, paid };
    }).filter(s => s.name && s.amount > 0);
}

// Divides the expense total equally between the user + each split row.
function distributeEqually() {
    const totalEl = document.getElementById('expense-amount') || document.getElementById('fixed-amount');
    const total = parseFloat(totalEl?.value) || 0;
    const rows = document.querySelectorAll('#splits-list .split-row');
    if (total <= 0 || rows.length === 0) { showToast('Define o valor e adiciona pessoas primeiro'); return; }
    const parts = rows.length + 1; // +1 for the user
    const perPerson = Math.round((total / parts) * 100) / 100;
    rows.forEach(r => {
        const input = r.querySelector('.split-amount');
        if (input) input.value = perPerson.toFixed(2);
    });
    showToast(`${parts} partes de ${formatCurrency(perPerson)}`);
}

// Fills the modal splits section from an expense/fixed object.
function populateSplitsUI(e) {
    const list = document.getElementById('splits-list');
    if (!list) return;
    list.innerHTML = '';
    const splits = Array.isArray(e?.splits) ? e.splits : [];
    // Legacy single-split migration
    if (!splits.length && e?.splitWithName) {
        const pct = parseFloat(e.splitWithPct) || 50;
        const full = e.fullAmount || e.amount || 0;
        splits.push({ name: e.splitWithName, amount: full * pct / 100, paid: !!e.splitWithReceived });
    }
    const swOther = document.getElementById('split-with-other');
    if (swOther) swOther.checked = splits.length > 0;
    toggleSplitWithOther();
    splits.forEach(s => addSplitRow(s));
}

// If any splits are marked paid, deduct those amounts from the expense total
// so the effective amount reflects the user's current out-of-pocket.
function adjustExpenseForCustomSplit(e) {
    const splits = Array.isArray(e.splits) ? e.splits : null;
    if (splits && splits.length) {
        const received = splits.filter(s => s.paid).reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
        if (received <= 0) return e;
        const fullAmount = e.fullAmount || e.amount;
        return { ...e, amount: Math.max(0, fullAmount - received), fullAmount };
    }
    // Legacy single split by pct — kept for old data.
    if (!e.splitWithName || !e.splitWithReceived) return e;
    const pct = parseFloat(e.splitWithPct);
    if (!(pct > 0 && pct < 100)) return e;
    const fullAmount = e.fullAmount || e.amount;
    return { ...e, amount: fullAmount * (1 - pct / 100), fullAmount };
}

// Toggles a single split entry's paid status from the expense list row.
function toggleExpenseSplitPaid(expenseId, splitIndex) {
    const idx = expenses.findIndex(e => e.id === expenseId);
    if (idx < 0) return;
    const splits = Array.isArray(expenses[idx].splits) ? expenses[idx].splits : [];
    if (splits[splitIndex]) {
        splits[splitIndex].paid = !splits[splitIndex].paid;
        expenses[idx].splits = splits;
        expenses[idx].updatedAt = new Date().toISOString();
        saveData();
        updateAll();
        showToast(splits[splitIndex].paid ? 'Pago!' : 'Marcado por receber');
    }
}

// ===== Fixed-expense split helpers (mirror of the one-off expense flow,
// but splits apply to every month: they're a permanent deduction from the
// fixed amount). =====
function toggleFixedSplitOther() {
    const cb = document.getElementById('fixed-split-other');
    const fields = document.getElementById('fixed-split-other-fields');
    if (cb && fields) fields.style.display = cb.checked ? 'block' : 'none';
    if (cb && cb.checked) {
        const list = document.getElementById('fixed-splits-list');
        if (list && list.children.length === 0) addFixedSplitRow();
    }
}
function addFixedSplitRow(prefill) {
    const list = document.getElementById('fixed-splits-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'fixed-split-row';
    row.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center';
    row.innerHTML = `
        <input type="text" class="fixed-split-name" placeholder="Nome" list="split-with-names-list" style="flex:2;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-family:var(--font);font-size:0.85rem">
        <input type="number" class="fixed-split-amount" placeholder="Valor" step="0.01" min="0" style="flex:1;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-family:var(--font);font-size:0.85rem">
        <button type="button" onclick="this.closest('.fixed-split-row').remove()" class="btn-icon" style="color:var(--danger);font-size:0.9rem"><i class="fas fa-times"></i></button>
    `;
    if (prefill) {
        row.querySelector('.fixed-split-name').value = prefill.name || '';
        if (prefill.amount != null) row.querySelector('.fixed-split-amount').value = parseFloat(prefill.amount).toFixed(2);
    }
    list.appendChild(row);
}
function collectFixedSplitsFromModal() {
    const rows = document.querySelectorAll('#fixed-splits-list .fixed-split-row');
    return [...rows].map(r => {
        const name = r.querySelector('.fixed-split-name')?.value.trim() || '';
        const amount = parseFloat(r.querySelector('.fixed-split-amount')?.value) || 0;
        return { name, amount };
    }).filter(s => s.name && s.amount > 0);
}
function fixedDistributeEqually() {
    const total = parseFloat(document.getElementById('fixed-amount')?.value) || 0;
    const rows = document.querySelectorAll('#fixed-splits-list .fixed-split-row');
    if (total <= 0 || rows.length === 0) { showToast('Define o valor e adiciona pessoas primeiro'); return; }
    const parts = rows.length + 1;
    const per = Math.round((total / parts) * 100) / 100;
    rows.forEach(r => {
        const input = r.querySelector('.fixed-split-amount');
        if (input) input.value = per.toFixed(2);
    });
    showToast(`${parts} partes de ${formatCurrency(per)}`);
}
// Mix Pessoal+partner for FIXED expenses — same concept as one-offs. Template
// stores mixPartnerPct + optional sub-split. Paid-per-month state lives on the
// per-month fixedStatus record (mixPartnerPaid).
function toggleFixedMixPartner() {
    const cb = document.getElementById('fixed-mix-with-partner');
    const fields = document.getElementById('fixed-mix-partner-fields');
    if (cb && fields) fields.style.display = cb.checked ? 'block' : 'none';
}
function toggleFixedMixPartnerSplit() {
    const cb = document.getElementById('fixed-mix-partner-split');
    const fields = document.getElementById('fixed-mix-partner-split-fields');
    if (cb && fields) fields.style.display = cb.checked ? 'block' : 'none';
}
function updateFixedMixPartnerUI(f) {
    const grp = document.getElementById('fixed-mix-partner-group');
    if (!grp) return;
    const name = getPartnerName();
    const show = !isMarriedMode() && !!name;
    grp.style.display = show ? 'block' : 'none';
    if (!show) return;
    document.querySelectorAll('.fixed-mix-partner-name').forEach(el => { el.textContent = name; });
    const header = document.getElementById('fixed-mix-partner-name');
    if (header) header.textContent = name;
    const cb = document.getElementById('fixed-mix-with-partner');
    const pct = document.getElementById('fixed-mix-partner-pct');
    const splitCb = document.getElementById('fixed-mix-partner-split');
    const has = !!(f && f.mixPartnerPct);
    if (cb) cb.checked = has;
    if (pct) pct.value = f?.mixPartnerPct || 50;
    if (splitCb) splitCb.checked = !!(f && f.mixPartnerSplit);
    toggleFixedMixPartner();
}

function populateFixedSplitsUI(f) {
    const list = document.getElementById('fixed-splits-list');
    if (!list) return;
    list.innerHTML = '';
    const splits = Array.isArray(f?.splits) ? f.splits : [];
    const cb = document.getElementById('fixed-split-other');
    if (cb) cb.checked = splits.length > 0;
    toggleFixedSplitOther();
    splits.forEach(s => addFixedSplitRow(s));
}

// Flips mixPartnerPaid so the user can settle the partner's share straight
// from the expense row. Only meaningful when the "Dividir" flag is on.
function toggleMixPartnerPaid(expenseId) {
    const idx = expenses.findIndex(e => e.id === expenseId);
    if (idx < 0) return;
    const e = expenses[idx];
    if (!e.mixPartnerPct || !e.mixPartnerSplit) return;
    e.mixPartnerPaid = !e.mixPartnerPaid;
    e.updatedAt = new Date().toISOString();
    saveData();
    updateAll();
    showToast(e.mixPartnerPaid ? 'Parte recebida!' : 'Marcado como por receber');
}

// Legacy single-person toggle — kept so old saved expenses still work.
function toggleSplitWithReceived(id) {
    const idx = expenses.findIndex(e => e.id === id);
    if (idx < 0) return;
    expenses[idx].splitWithReceived = !expenses[idx].splitWithReceived;
    expenses[idx].updatedAt = new Date().toISOString();
    saveData();
    updateAll();
    showToast(expenses[idx].splitWithReceived ? 'Parte recebida!' : 'Marcado como por receber');
}

function setupSpouseSplitUI(e) {
    const spouseGrp = document.getElementById('spouse-split-group');
    if (!spouseGrp) return;
    const spouseName = getSpouseName();
    document.getElementById('spouse-name-label').textContent = spouseName;
    document.getElementById('spouse-paid-label').textContent = `${spouseName} ja pagou a parte`;
    const cb = document.getElementById('split-with-spouse');
    const paidCb = document.getElementById('spouse-paid');
    const paidRow = document.getElementById('spouse-paid-row');
    cb.checked = !!(e && e.splitSpouse);
    paidCb.checked = !!(e && e.spousePaid);
    paidRow.style.display = cb.checked ? 'block' : 'none';
    cb.onchange = () => { paidRow.style.display = cb.checked ? 'block' : 'none'; if (!cb.checked) paidCb.checked = false; };
}

function suggestCategoryFromDescription(desc) {
    if (!desc || desc.length < 3) return null;
    const lower = desc.toLowerCase();
    // Count category usage for matching descriptions
    const matches = expenses.filter(e => e.description.toLowerCase().includes(lower.substring(0, Math.min(lower.length, 5))));
    if (matches.length === 0) return null;
    // Most common category among matches
    const catCount = {};
    matches.forEach(e => { catCount[e.category] = (catCount[e.category] || 0) + 1; });
    const [topCat] = Object.entries(catCount).sort((a,b) => b[1] - a[1])[0];
    return topCat;
}

function onDescriptionInput() {
    const descEl = document.getElementById('expense-desc');
    const catSelect = document.getElementById('expense-category');
    if (!descEl || !catSelect) return;
    const desc = descEl.value;
    // Cheap local keyword match still runs first — instant and offline.
    if (!catSelect.value) {
        const suggested = suggestCategoryFromDescription(desc);
        if (suggested && catSelect.querySelector(`option[value="${suggested}"]`)) {
            catSelect.value = suggested;
        }
    }
    // AI refinement runs after a pause and offers a chip the user can tap.
    const hint = document.getElementById('ai-category-suggestion');
    const essentials = Array.from(document.querySelectorAll('input[name="essential"]'));
    scheduleAiCategorySuggestion(descEl, catSelect, hint, essentials);
}

function getKnownPeople() {
    const set = new Set();
    expenses.forEach(e => (e.withPeople || []).forEach(p => p && set.add(p)));
    return [...set].sort();
}

function renderPeopleSuggestions() {
    const container = document.getElementById('expense-with-suggestions');
    if (!container) return;
    const known = getKnownPeople();
    if (known.length === 0) { container.innerHTML = ''; return; }
    container.innerHTML = known.slice(0, 12).map(p =>
        `<button type="button" class="people-suggestion-chip" onclick="addPersonToInput('${p.replace(/'/g, "\\'")}')">${p}</button>`
    ).join('');
}

function addPersonToInput(name) {
    const input = document.getElementById('expense-with');
    if (!input) return;
    const current = input.value.split(',').map(s => s.trim()).filter(s => s);
    if (current.includes(name)) return;
    current.push(name);
    input.value = current.join(', ');
}

function editExpense(id) {
    const e = expenses.find(x => x.id === id);
    if (!e) return;
    // Open the modal up-front. Same reasoning as showAddExpense: any
    // downstream init failure (a missing optional DOM node, a bad cached
    // value) shouldn't leave the user with an unresponsive row tap.
    const modal = document.getElementById('modal-add');
    if (modal) modal.classList.add('active');
    try {
        document.getElementById('modal-title').textContent = 'Editar Despesa';
    document.getElementById('expense-id').value = e.id;
    // Expose the source id to the "Tornar fixa" button rendered in the modal.
    window._editingExpenseId = e.id;
    const promoBtn = document.getElementById('promote-to-fixed-btn');
    if (promoBtn) promoBtn.style.display = 'block';
    const prepaidGrp = document.getElementById('expense-prepaid-group');
    if (prepaidGrp) prepaidGrp.style.display = prepaidCards.length ? 'block' : 'none';
    populatePrepaidSelect();
    const psel = document.getElementById('expense-prepaid-card');
    if (psel) psel.value = e.prepaidCardId || '';
    document.getElementById('expense-desc').value = e.description;
    document.getElementById('expense-amount').value = e.amount;
    document.getElementById('expense-date').value = e.date;
    document.getElementById('expense-category').value = e.category;
    document.getElementById('expense-notes').value = e.notes || '';
    document.getElementById('expense-with').value = (e.withPeople || []).join(', ');
    renderPeopleSuggestions();
    setupSpouseSplitUI(e);
    document.getElementById('expense-is-grouped').checked = !!e.isGrouped;
    onIsGroupedChange();
    // Restore split-across-children state
    const splitGrp = document.getElementById('split-children-group');
    if (splitGrp) {
        const canShow = children.length >= 2 && e.type === 'personal';
        splitGrp.style.display = canShow ? 'block' : 'none';
        if (canShow) {
            renderSplitAcrossChildrenList('split-across-children');
            setupSplitAcrossToggle('split-across-children', 'split-across-children-list');
            const cb = document.getElementById('split-across-children');
            cb.checked = !!e.splitAcrossChildren;
            document.getElementById('split-across-children-list').style.display = cb.checked ? 'block' : 'none';
            (e.splitChildrenIds || []).forEach(id => {
                const box = document.querySelector(`input[name="split-across-children"][value="${id}"]`);
                if (box) box.checked = true;
            });
        }
    }

    populateExpenseTypeOptions();
    const typeRadio = document.querySelector(`input[name="expense-type"][value="${e.type}"]`);
    if (typeRadio) typeRadio.checked = true;
    document.querySelector(`input[name="essential"][value="${e.essential !== false ? 'yes' : 'no'}"]`).checked = true;

    const editChild = children.find(c => c.id === e.type);
    const ovGrp = document.getElementById('split-pct-override-group');
    const ovCb = document.getElementById('split-pct-override-on');
    const ovInput = document.getElementById('split-pct-override');
    const ovFields = document.getElementById('split-pct-override-fields');
    const ovName = document.getElementById('split-pct-override-name');
    if (editChild && editChild.hasSplit !== false) {
        document.getElementById('laura-split-group').style.display = 'block';
        const splitLabel = document.getElementById('split-coparent-label');
        const paidLabel = document.getElementById('paid-by-father-label');
        if (splitLabel) splitLabel.textContent = editChild.coParentName;
        if (paidLabel) paidLabel.textContent = `${editChild.coParentName} ja pagou a parte dele`;
        document.querySelector(`input[name="laura-split"][value="${e.split ? 'yes' : 'no'}"]`).checked = true;
        if (e.split) {
            document.getElementById('paid-by-father-group').style.display = 'block';
            document.getElementById('paid-by-father').checked = e.paidByFather || false;
        }
        if (e.split && ovGrp) {
            ovGrp.style.display = 'block';
            if (ovName) ovName.textContent = editChild.coParentName;
            const pctOv = parseFloat(e.splitPctOverride);
            const hasOv = !isNaN(pctOv) && pctOv > 0 && pctOv < 100;
            if (ovCb) ovCb.checked = hasOv;
            if (ovInput) ovInput.value = hasOv ? pctOv : (editChild.splitPct || 50);
            if (ovFields) ovFields.style.display = hasOv ? 'block' : 'none';
        } else if (ovGrp) {
            ovGrp.style.display = 'none';
        }
    } else {
        document.getElementById('laura-split-group').style.display = 'none';
        document.getElementById('paid-by-father-group').style.display = 'none';
        if (ovGrp) ovGrp.style.display = 'none';
    }

    // Multi-person split (with legacy migration)
    populateSplitWithNamesList();
    populateSplitsUI(e);
    updatePartnerQuickGroupUI(e);
    // Mix-with-child (Pessoal + filho %). Visible when type is personal AND children exist.
    const mixGrp = document.getElementById('mix-personal-child-group');
    if (mixGrp) mixGrp.style.display = (e.type === 'personal' && children.length >= 1) ? 'block' : 'none';
    const mixCb = document.getElementById('mix-with-child');
    if (mixCb) mixCb.checked = !!e.mixChildId;
    populateMixChildSelect();
    const mixSel = document.getElementById('mix-child-id');
    if (mixSel && e.mixChildId) mixSel.value = e.mixChildId;
    const mixPct = document.getElementById('mix-child-pct');
    if (mixPct) mixPct.value = e.mixChildPct || 50;
    const mixCoSplit = document.getElementById('mix-child-split-coparent');
    if (mixCoSplit) mixCoSplit.checked = !!e.mixChildSplitCoParent;
    const mixCoPaid = document.getElementById('mix-child-paid-by-father');
    if (mixCoPaid) mixCoPaid.checked = !!e.mixChildPaidByFather;
    toggleMixWithChild();
    toggleMixCoParent();
    updateMixCoParentLabels();

    pendingAttachment = e.attachment || null;
    renderAttachmentPreview('attachment-preview', pendingAttachment);

    // Load the fiscal fields stored on the expense so the edit form mirrors
    // whatever the OCR extracted (or the user typed) originally.
    pendingReceiptFields = {
        sellerNif: e.sellerNif || null,
        buyerNif: e.buyerNif || null,
        vatBase: e.vatBase ?? null,
        vatAmount: e.vatAmount ?? null,
        vatRate: e.vatRate ?? null,
        paymentMethod: e.paymentMethod || null,
        cardLast4: e.cardLast4 || null,
        purchaseTime: e.purchaseTime || null,
        documentType: e.documentType || null,
        atcud: e.atcud || null,
        docNumber: e.docNumber || null,
        sellerAddress: e.sellerAddress || null,
        sellerCity: e.sellerCity || null,
        discount: e.discount ?? null,
        loyaltyProgram: e.loyaltyProgram || null,
        loyaltyPoints: e.loyaltyPoints ?? null,
        serviceType: e.serviceType || null,
        tip: e.tip ?? null,
        warrantyUntil: e.warrantyUntil || null,
        purchaseChannel: e.purchaseChannel || null,
        contextTag: e.contextTag || null,
        location: e.location || null,
        lineItems: Array.isArray(e.lineItems) ? e.lineItems : null,
        utility: e.utility || null,
        source: 'edit'
    };
    updateFiscalFieldsUI();
    } catch (err) {
        console.error('editExpense init error:', err);
    }
}

function saveExpense(event) {
    event.preventDefault();
    const id = document.getElementById('expense-id').value;
    const type = document.querySelector('input[name="expense-type"]:checked').value;
    const isChild = children.some(c => c.id === type);
    const isMulti = type === 'multi';
    const split = isChild && document.querySelector('input[name="laura-split"]:checked')?.value === 'yes';

    // ATCUD dedup: PT invoices carry a unique AT code. If the user enters
    // an ATCUD that matches another expense (not the one being edited),
    // warn before saving — strong signal of a duplicate.
    const atcudVal = document.getElementById('fiscal-atcud')?.value.trim();
    if (atcudVal && atcudVal.length >= 5) {
        const dup = expenses.find(x => x.id !== id && x.atcud === atcudVal);
        if (dup) {
            if (!confirm(`Já existe uma despesa com este ATCUD (${dup.description} — ${formatCurrency(dup.amount)} em ${formatDate(dup.date)}). Queres guardar mesmo assim?`)) {
                return;
            }
        }
    }

    // Multi-child: create N expenses, one per selected child, with amount/N each
    if (isMulti) {
        const selectedChildIds = Array.from(document.querySelectorAll('input[name="multi-child"]:checked')).map(c => c.value);
        if (selectedChildIds.length < 2) { showToast('Selecione pelo menos 2 filhos'); return; }
        if (id) { showToast('Nao pode editar para varios filhos. Apague e crie novo.'); return; }

        const fullAmount = parseFloat(document.getElementById('expense-amount').value);
        const perChild = fullAmount / selectedChildIds.length;
        const groupId = generateId();
        const baseDesc = document.getElementById('expense-desc').value.trim();
        const now = new Date().toISOString();

        selectedChildIds.forEach(childId => {
            const child = children.find(c => c.id === childId);
            expenses.push({
                id: generateId(),
                description: `${baseDesc} (${child.name})`,
                amount: perChild,
                date: document.getElementById('expense-date').value,
                category: document.getElementById('expense-category').value,
                type: childId,
                split: false,
                paidByFather: false,
                essential: document.querySelector('input[name="essential"]:checked').value === 'yes',
                notes: document.getElementById('expense-notes').value.trim(),
                attachment: null,
                multiGroupId: groupId,
                createdAt: now,
                updatedAt: now
            });
        });

        saveData();
        closeModal();
        pendingAttachment = null;
        updateAll();
        showToast(`Dividida por ${selectedChildIds.length} filhos (${formatCurrency(perChild)} cada)!`);
        return;
    }

    const withInput = document.getElementById('expense-with')?.value.trim() || '';
    const withPeople = withInput ? withInput.split(',').map(s => s.trim()).filter(s => s) : [];
    // Mix partner (separated mode): when set, the partner name is implicitly
    // added to withPeople so the partner-spending report picks this expense up.
    const partnerName = getPartnerName();
    const mixWithPartnerOn = !isMarriedMode() && partnerName
        && document.getElementById('mix-with-partner')?.checked;
    const mixPartnerPct = mixWithPartnerOn
        ? (parseFloat(document.getElementById('mix-partner-pct')?.value) || 0)
        : 0;
    // Attributing a % to the partner implies "spent with" (tag for reports).
    // Checking "Dividir" adds a debt layer on top; "Paid" clears the debt.
    const mixPartnerSpentOn = mixWithPartnerOn;
    const mixPartnerSplitOn = mixWithPartnerOn && !!document.getElementById('mix-partner-split')?.checked;
    const mixPartnerPaidOn = mixPartnerSplitOn && !!document.getElementById('mix-partner-paid')?.checked;
    if (mixWithPartnerOn && mixPartnerPct > 0 && !withPeople.some(p => p.toLowerCase() === partnerName.toLowerCase())) {
        withPeople.push(partnerName);
    }
    const splitAcross = document.getElementById('split-across-children')?.checked || false;
    const splitChildrenIds = splitAcross
        ? Array.from(document.querySelectorAll('input[name="split-across-children"]:checked')).map(c => c.value)
        : [];

    const splitSpouse = isMarriedMode() && document.getElementById('split-with-spouse')?.checked;
    const spousePaid = splitSpouse && document.getElementById('spouse-paid')?.checked;
    const splitWithOther = document.getElementById('split-with-other')?.checked;
    const splits = splitWithOther ? collectSplitsFromModal() : [];
    // Per-expense % override (separated mode only). Stored when the user
    // explicitly enables the toggle and supplies a value in (0, 100).
    const splitPctOverrideOn = !!document.getElementById('split-pct-override-on')?.checked;
    const splitPctOverrideRaw = parseFloat(document.getElementById('split-pct-override')?.value);
    const splitPctOverride = (split && splitPctOverrideOn && !isNaN(splitPctOverrideRaw)
        && splitPctOverrideRaw > 0 && splitPctOverrideRaw <= 100)
        ? splitPctOverrideRaw
        : null;
    // Pessoal + single-child split (e.g. "100€ · 30% Laura, 70% Pessoal")
    const mixWithChild = type === 'personal'
        && !splitAcross
        && children.length > 0
        && document.getElementById('mix-with-child')?.checked;
    const mixChildId = mixWithChild ? document.getElementById('mix-child-id')?.value : null;
    const mixChildPct = mixWithChild ? (parseFloat(document.getElementById('mix-child-pct')?.value) || 0) : 0;
    const isGrouped = document.getElementById('expense-is-grouped')?.checked || false;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const dateVal = document.getElementById('expense-date').value;
    const notesVal = document.getElementById('expense-notes').value.trim();
    const fiscal = collectFiscalFieldsFromForm();

    // Mix split: stored as ONE expense with mix* fields. Expanded at render
    // time into Pessoal + child virtuals so reports and totals reflect both
    // sides. Keeps editing and "Agrupada" working naturally.
    const mixChildSplitCoParent = mixWithChild && !!document.getElementById('mix-child-split-coparent')?.checked;
    const mixChildPaidByFather = mixChildSplitCoParent && !!document.getElementById('mix-child-paid-by-father')?.checked;

    const expense = {
        id: id || generateId(),
        description: document.getElementById('expense-desc').value.trim(),
        amount,
        date: dateVal,
        category: document.getElementById('expense-category').value,
        type: type,
        split: split,
        paidByFather: split ? document.getElementById('paid-by-father').checked : false,
        splitPctOverride,
        splitSpouse,
        spousePaid,
        splits,
        // Mix split between Pessoal and a single child
        mixChildId: mixWithChild && mixChildId && mixChildPct > 0 && mixChildPct < 100 ? mixChildId : null,
        mixChildPct: mixWithChild && mixChildPct > 0 && mixChildPct < 100 ? mixChildPct : null,
        mixChildSplitCoParent,
        mixChildPaidByFather,
        // Mix split between Pessoal and the partner (separated mode)
        mixPartnerPct: mixWithPartnerOn && mixPartnerPct > 0 && mixPartnerPct < 100 ? mixPartnerPct : null,
        mixPartnerName: mixWithPartnerOn && mixPartnerPct > 0 && mixPartnerPct < 100 ? partnerName : null,
        mixPartnerSpent: mixPartnerSpentOn,
        mixPartnerSplit: mixPartnerSplitOn,
        mixPartnerPaid: mixPartnerPaidOn,
        essential: document.querySelector('input[name="essential"]:checked').value === 'yes',
        notes: notesVal,
        withPeople,
        splitAcrossChildren: splitAcross && splitChildrenIds.length >= 2,
        splitChildrenIds,
        isGrouped,
        attachment: pendingAttachment || null,
        // Fiscal / receipt detail fields (optional — from OCR or manual entry)
        sellerNif:       fiscal.sellerNif,
        buyerNif:        fiscal.buyerNif,
        vatBase:         fiscal.vatBase,
        vatAmount:       fiscal.vatAmount,
        vatRate:         fiscal.vatRate,
        paymentMethod:   fiscal.paymentMethod,
        cardLast4:       fiscal.cardLast4,
        purchaseTime:    fiscal.purchaseTime,
        documentType:    fiscal.documentType,
        atcud:           fiscal.atcud,
        docNumber:       fiscal.docNumber,
        sellerAddress:   fiscal.sellerAddress,
        sellerCity:      fiscal.sellerCity,
        discount:        fiscal.discount,
        loyaltyProgram:  fiscal.loyaltyProgram,
        loyaltyPoints:   fiscal.loyaltyPoints,
        serviceType:     fiscal.serviceType,
        tip:             fiscal.tip,
        warrantyUntil:   fiscal.warrantyUntil,
        purchaseChannel: fiscal.purchaseChannel,
        contextTag:      fiscal.contextTag,
        location:        pendingReceiptFields?.location || null,
        lineItems:       pendingReceiptFields?.lineItems || null,
        utility:         pendingReceiptFields?.utility || null,
        updatedAt: new Date().toISOString()
    };

    // Grouped expense handling
    if (isGrouped) {
        if (id) {
            // Editing existing grouped: preserve entries, recompute totals if needed
            const existing = expenses.find(x => x.id === id);
            if (existing && Array.isArray(existing.entries)) {
                expense.entries = existing.entries;
                expense.amount = computeGroupedTotal(expense);
            } else {
                expense.entries = [{ date: dateVal, amount, notes: notesVal }];
            }
        } else {
            expense.entries = [{ date: dateVal, amount, notes: notesVal }];
        }
    }

    if (id) {
        const idx = expenses.findIndex(e => e.id === id);
        if (idx >= 0) {
            const old = expenses[idx];
            expense.createdAt = old.createdAt;
            // Preserve prepaid card linkage across edits — saveExpense
            // builds a fresh object that doesn't carry these fields, so
            // syncPrepaidSpendForExpense would otherwise see "no card"
            // and create a duplicate tx instead of updating.
            if (!('prepaidCardId' in expense)) expense.prepaidCardId = old.prepaidCardId || null;
            if (!('prepaidTxId' in expense))   expense.prepaidTxId = old.prepaidTxId || null;
            if (!('isPrepaidTopup' in expense)) expense.isPrepaidTopup = !!old.isPrepaidTopup;
            expenses[idx] = expense;
        }
    } else {
        expense.createdAt = new Date().toISOString();
        expenses.push(expense);
    }

    // Remember last category
    const lastCat = JSON.parse(localStorage.getItem(LAST_CAT_KEY) || '{}');
    lastCat.expense = expense.category;
    localStorage.setItem(LAST_CAT_KEY, JSON.stringify(lastCat));

    // If the user picked a prepaid card, register a "spend" transaction
    // on the card so the balance stays in sync. We stamp prepaidCardId on
    // the expense so editing the expense later can still pair up with its
    // original ledger entry (used for delete cleanup down the line).
    // Sync the prepaid card link for both new and edited expenses. Top-ups
    // (isPrepaidTopup) are managed by the top-up flow itself, so we only
    // touch spends here.
    const newPrepaidCardId = document.getElementById('expense-prepaid-card')?.value || null;
    const target = expenses.find(x => x.id === expense.id);
    if (target && !target.isPrepaidTopup) {
        // Soft block: don't allow a spend to push the card balance below
        // zero. Compute the would-be balance excluding the current tx if
        // we're editing (so editing the same expense up/down works).
        if (newPrepaidCardId) {
            const card = prepaidCards.find(c => c.id === newPrepaidCardId);
            if (card) {
                const currentBalance = getPrepaidBalance(newPrepaidCardId);
                const ownContribution = (() => {
                    if (target.prepaidCardId !== newPrepaidCardId || !target.prepaidTxId) return 0;
                    const oldTx = (card.transactions || []).find(t => t.id === target.prepaidTxId);
                    return oldTx?.type === 'spend' ? oldTx.amount : 0;
                })();
                const projected = currentBalance + ownContribution - target.amount;
                if (projected < 0) {
                    showToast(`Saldo insuficiente em ${card.name} (${formatCurrency(currentBalance + ownContribution)}). Carrega o cartão antes ou usa outro método.`);
                    // Strip the card so the expense still saves but isn't
                    // tied to the card, instead of hard-blocking the save.
                    const sel = document.getElementById('expense-prepaid-card');
                    if (sel) sel.value = '';
                    syncPrepaidSpendForExpense(target, null);
                } else {
                    syncPrepaidSpendForExpense(target, newPrepaidCardId);
                }
            } else {
                syncPrepaidSpendForExpense(target, newPrepaidCardId);
            }
        } else {
            syncPrepaidSpendForExpense(target, null);
        }
    }

    saveData();
    closeModal();
    pendingAttachment = null;
    // If this save came from approving a pending imported expense, drop it
    // from the pending list so it doesn't stay as a duplicate. Flag is set
    // by editPending() just before opening the modal.
    if (window._pendingApprovedFromId) {
        pendingExpenses = pendingExpenses.filter(x => x.id !== window._pendingApprovedFromId);
        localStorage.setItem(PENDING_KEY, JSON.stringify(pendingExpenses));
        window._pendingApprovedFromId = null;
        renderPendingExpenses();
    }
    updateAll();
    showToast(id ? 'Despesa atualizada!' : 'Despesa adicionada!');
}

// ===== ADD/EDIT INCOME =====
function showAddIncome() {
    document.getElementById('income-modal-title').textContent = 'Nova Receita';
    document.getElementById('income-form').reset();
    document.getElementById('income-id').value = '';
    document.getElementById('income-date').valueAsDate = new Date();
    pendingIncomeAttachment = null;
    document.getElementById('income-attachment-preview').innerHTML = '';
    // Restore last used category
    const lastCat = JSON.parse(localStorage.getItem(LAST_CAT_KEY) || '{}');
    const incCatSelect = document.getElementById('income-category');
    if (lastCat.income && incCatSelect.querySelector(`option[value="${lastCat.income}"]`)) {
        incCatSelect.value = lastCat.income;
    }
    document.getElementById('modal-income').classList.add('active');
}

function editIncome(id) {
    const e = incomes.find(x => x.id === id);
    if (!e) return;

    document.getElementById('income-modal-title').textContent = 'Editar Receita';
    document.getElementById('income-id').value = e.id;
    document.getElementById('income-desc').value = e.description;
    document.getElementById('income-amount').value = e.amount;
    document.getElementById('income-date').value = e.date;
    document.getElementById('income-category').value = e.category;
    document.getElementById('income-notes').value = e.notes || '';

    pendingIncomeAttachment = e.attachment || null;
    renderAttachmentPreview('income-attachment-preview', pendingIncomeAttachment);

    document.getElementById('modal-income').classList.add('active');
}

function saveIncome(event) {
    event.preventDefault();
    const id = document.getElementById('income-id').value;

    const income = {
        id: id || generateId(),
        description: document.getElementById('income-desc').value.trim(),
        amount: parseFloat(document.getElementById('income-amount').value),
        date: document.getElementById('income-date').value,
        category: document.getElementById('income-category').value,
        notes: document.getElementById('income-notes').value.trim(),
        attachment: pendingIncomeAttachment || null,
        updatedAt: new Date().toISOString()
    };

    if (id) {
        const idx = incomes.findIndex(e => e.id === id);
        if (idx >= 0) {
            income.createdAt = incomes[idx].createdAt;
            incomes[idx] = income;
        }
    } else {
        income.createdAt = new Date().toISOString();
        incomes.push(income);
    }

    // Remember last category
    const lastCat = JSON.parse(localStorage.getItem(LAST_CAT_KEY) || '{}');
    lastCat.income = income.category;
    localStorage.setItem(LAST_CAT_KEY, JSON.stringify(lastCat));

    saveData();
    closeIncomeModal();
    pendingIncomeAttachment = null;
    updateAll();
    showToast(id ? 'Receita atualizada!' : 'Receita adicionada!');
}

function confirmDeleteIncome(id) {
    pendingDeleteId = id;
    pendingDeleteType = 'income';
    const e = incomes.find(x => x.id === id);
    document.getElementById('confirm-message').textContent = `Apagar receita "${e?.description}"?`;
    document.getElementById('confirm-btn').onclick = () => {
        incomes = incomes.filter(e => e.id !== pendingDeleteId);
        saveData();
        closeConfirm();
        updateAll();
        showToast('Receita apagada');
    };
    document.getElementById('modal-confirm').classList.add('active');
}

function populateExpenseTypeOptions() {
    const container = document.getElementById('expense-type-options');
    if (!container) return;
    let html = `<label class="radio-label"><input type="radio" name="expense-type" value="personal" checked><span class="radio-custom"></span>Pessoal</label>`;
    children.forEach(c => {
        html += `<label class="radio-label"><input type="radio" name="expense-type" value="${c.id}"><span class="radio-custom"></span>${c.name}</label>`;
    });
    if (children.length >= 2) {
        html += `<label class="radio-label"><input type="radio" name="expense-type" value="multi"><span class="radio-custom"></span>Varios filhos</label>`;
    }
    container.innerHTML = html;
    setupTypeToggle();
}

function populateFixedTypeOptions() {
    const container = document.getElementById('fixed-type-options');
    if (!container) return;
    let html = `<label class="radio-label"><input type="radio" name="fixed-type" value="personal" checked><span class="radio-custom"></span>Pessoal</label>`;
    children.forEach(c => {
        html += `<label class="radio-label"><input type="radio" name="fixed-type" value="${c.id}"><span class="radio-custom"></span>${c.name}</label>`;
    });
    container.innerHTML = html;
    setupFixedTypeToggle();
}

function populateFilterTypes() {
    const sel = document.getElementById('filter-type');
    if (!sel) return;
    const val = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    const opt = document.createElement('option');
    opt.value = 'personal'; opt.textContent = 'Pessoal';
    sel.appendChild(opt);
    children.forEach(c => {
        const o = document.createElement('option');
        o.value = c.id; o.textContent = c.name;
        sel.appendChild(o);
    });
    if (val) sel.value = val;
}

function setupTypeToggle() {
    document.querySelectorAll('input[name="expense-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const child = children.find(c => c.id === e.target.value);
            const isMulti = e.target.value === 'multi';
            const isPersonal = e.target.value === 'personal';
            const childSplits = child && child.hasSplit !== false;
            document.getElementById('laura-split-group').style.display = childSplits ? 'block' : 'none';
            if (!childSplits) document.getElementById('paid-by-father-group').style.display = 'none';
            const ovGrp = document.getElementById('split-pct-override-group');
            const ovName = document.getElementById('split-pct-override-name');
            const splitYes = document.querySelector('input[name="laura-split"]:checked')?.value === 'yes';
            if (ovGrp) ovGrp.style.display = childSplits && splitYes ? 'block' : 'none';
            if (ovName && child) ovName.textContent = child.coParentName;
            // Multi-child group
            const multiGroup = document.getElementById('multi-children-group');
            if (multiGroup) {
                multiGroup.style.display = isMulti ? 'block' : 'none';
                if (isMulti) renderMultiChildrenCheckboxes();
            }
            // Split-across-children group (only when personal and 2+ children)
            const splitGrp = document.getElementById('split-children-group');
            if (splitGrp) {
                splitGrp.style.display = (isPersonal && children.length >= 2) ? 'block' : 'none';
                if (isPersonal && children.length >= 2) renderSplitAcrossChildrenList('split-across-children');
            }
            // Mix Pessoal + single child group (only when personal + at least one child)
            const mixGrp = document.getElementById('mix-personal-child-group');
            if (mixGrp) {
                mixGrp.style.display = (isPersonal && children.length >= 1) ? 'block' : 'none';
                if (isPersonal && children.length >= 1) populateMixChildSelect();
            }
            // Update co-parent labels
            const splitLabel = document.getElementById('split-coparent-label');
            const paidLabel = document.getElementById('paid-by-father-label');
            if (splitLabel) splitLabel.textContent = child ? child.coParentName : 'o co-progenitor';
            if (paidLabel) paidLabel.textContent = child ? `${child.coParentName} ja pagou a parte dele` : 'Co-progenitor ja pagou a parte dele';
        });
    });
    document.querySelectorAll('input[name="laura-split"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('paid-by-father-group').style.display = e.target.value === 'yes' ? 'block' : 'none';
            const ovGrp = document.getElementById('split-pct-override-group');
            const typeRadio = document.querySelector('input[name="expense-type"]:checked');
            const child = typeRadio ? children.find(c => c.id === typeRadio.value) : null;
            if (ovGrp) ovGrp.style.display = (child && child.hasSplit !== false && e.target.value === 'yes') ? 'block' : 'none';
        });
    });
}

function renderMultiChildrenCheckboxes() {
    const container = document.getElementById('multi-children-checkboxes');
    if (!container) return;
    container.innerHTML = children.map(c =>
        `<label style="display:flex;align-items:center;gap:8px;padding:6px 0">
            <input type="checkbox" name="multi-child" value="${c.id}"> ${c.name}
        </label>`
    ).join('');
}

function renderSplitAcrossChildrenList(namePrefix) {
    const container = document.getElementById(`${namePrefix}-list`);
    if (!container) return;
    container.innerHTML = children.map(c =>
        `<label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.85rem">
            <input type="checkbox" name="${namePrefix}" value="${c.id}"> ${c.name}
        </label>`
    ).join('');
}

function setupSplitAcrossToggle(checkboxId, listId) {
    const cb = document.getElementById(checkboxId);
    if (!cb) return;
    cb.onchange = () => {
        const listEl = document.getElementById(listId);
        if (listEl) listEl.style.display = cb.checked ? 'block' : 'none';
    };
}

// ===== DELETE =====
let pendingDeleteId = null;
let pendingDeleteType = 'expense';
function confirmDelete(id) {
    pendingDeleteId = id;
    pendingDeleteType = 'expense';
    const e = expenses.find(x => x.id === id);
    document.getElementById('confirm-message').textContent = `Apagar "${e?.description}"?`;
    document.getElementById('confirm-btn').onclick = deleteExpense;
    document.getElementById('modal-confirm').classList.add('active');
}
// Converts an existing variable expense into a recurring fixed expense.
// Opens the fixed-expense modal pre-filled from this expense and remembers
// the source id so we can optionally remove the one-off once the fixed is
// saved (with user confirmation, to avoid silent data loss).
function promoteExpenseToFixed(id) {
    const e = expenses.find(x => x.id === id);
    if (!e) { showToast('Despesa não encontrada'); return; }
    const d = new Date(e.date);
    const day = isNaN(d) ? 1 : d.getDate();
    const monthKey = isNaN(d)
        ? (new Date()).toISOString().slice(0, 7)
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    populateCategorySelects();
    populateFixedTypeOptions();
    document.getElementById('fixed-modal-title').textContent = 'Nova Despesa Fixa';
    document.getElementById('fixed-id').value = '';
    document.getElementById('fixed-form').reset();
    document.getElementById('fixed-desc').value = e.description || '';
    document.getElementById('fixed-amount').value = parseFloat(e.fullAmount || e.amount).toFixed(2);
    document.getElementById('fixed-day').value = day;
    document.getElementById('fixed-start').value = monthKey;
    const catSel = document.getElementById('fixed-category');
    if (catSel) catSel.value = e.category || 'outros';
    const splitGroup = document.getElementById('fixed-split-group');
    if (splitGroup) splitGroup.style.display = 'none';
    // Close the expense modal if open, then open the fixed one.
    closeModal();
    document.getElementById('fixed-modal').classList.add('active');
    // Flag so saveFixed can prompt "apagar a despesa original?" after save.
    window._expensePromotedToFixedSourceId = id;
}

// ===== SAVINGS GOALS =====
// Each goal has a target amount and optional deadline. savedSoFar is
// manually maintained — the user updates as they actually transfer money
// to their savings account. We compute "monthly required" and surface
// it on the dashboard along with progress vs the user's typical savings
// rate so they know if the goal is realistic.
// Savings goals are now ledger-backed: savedSoFar is derived from a list
// of {type:'add'|'remove', amount, date, note} so transitions across
// months (and across goals) are visible, auditable, and reversible.
function getGoalBalance(goal) {
    return (goal?.transactions || []).reduce(
        (s, t) => s + (t.type === 'add' ? t.amount : -t.amount), 0
    );
}

// Sums net additions across all goals in the given month — used to show
// the user how much they actually moved into savings each month.
function getGoalsMonthlyContribution(yyyymm) {
    let total = 0;
    savingsGoals.forEach(g => (g.transactions || []).forEach(t => {
        if ((t.date || '').startsWith(yyyymm)) total += (t.type === 'add' ? t.amount : -t.amount);
    }));
    return total;
}

// Same idea but bound by an arbitrary date range — needed for the salary
// cycle which may span two calendar months (e.g. 22 Apr → 21 May). Used
// to deduct committed savings from the cycle's available + projection.
function getGoalsContributionInRange(start, end) {
    let total = 0;
    savingsGoals.forEach(g => (g.transactions || []).forEach(t => {
        if (!t.date) return;
        const d = new Date(t.date);
        if (d >= start && d <= end) total += (t.type === 'add' ? t.amount : -t.amount);
    }));
    return total;
}

function showAddGoalPrompt() {
    openGoalModal(null);
}

function openGoalModal(id) {
    const modal = document.getElementById('modal-savings-goal');
    if (!modal) return;
    const g = id ? savingsGoals.find(x => x.id === id) : null;
    document.getElementById('goal-modal-title').textContent = g ? `Editar: ${g.name}` : 'Novo objetivo';
    document.getElementById('goal-form-id').value = g ? g.id : '';
    document.getElementById('goal-form-name').value = g ? g.name : '';
    document.getElementById('goal-form-target').value = g ? g.target : '';
    document.getElementById('goal-form-deadline').value = g?.deadline || '';
    document.getElementById('goal-form-monthly').value = g?.monthlyTarget || '';
    document.getElementById('goal-form-initial').value = '';
    // Initial balance only makes sense on creation; the user changes later
    // values via the dedicated + / − buttons on the goal card.
    document.getElementById('goal-form-initial-group').style.display = g ? 'none' : 'block';
    modal.classList.add('active');
    setTimeout(() => document.getElementById('goal-form-name')?.focus(), 100);
}

function submitSavingsGoal() {
    const id = document.getElementById('goal-form-id').value;
    const name = (document.getElementById('goal-form-name').value || '').trim();
    if (!name) { showToast('Indica o nome'); return; }
    const target = parseFloat((document.getElementById('goal-form-target').value || '').replace(',', '.'));
    if (!isFinite(target) || target <= 0) { showToast('Valor a poupar inválido'); return; }
    const deadline = document.getElementById('goal-form-deadline').value || null;
    const monthlyVal = parseFloat((document.getElementById('goal-form-monthly').value || '').replace(',', '.'));
    const monthlyTarget = isFinite(monthlyVal) && monthlyVal > 0 ? monthlyVal : null;
    if (id) {
        const g = savingsGoals.find(x => x.id === id);
        if (!g) return;
        g.name = name;
        g.target = target;
        g.deadline = deadline;
        g.monthlyTarget = monthlyTarget;
    } else {
        const initial = parseFloat((document.getElementById('goal-form-initial').value || '').replace(',', '.'));
        const goal = {
            id: generateId(),
            name,
            target,
            deadline,
            monthlyTarget,
            transactions: [],
            color: '#5A3BD8',
            createdAt: new Date().toISOString()
        };
        if (isFinite(initial) && initial > 0) {
            goal.transactions.push({
                id: generateId(), type: 'add', amount: initial,
                date: new Date().toISOString().slice(0, 10),
                note: 'Saldo inicial'
            });
        }
        savingsGoals.push(goal);
    }
    saveData();
    document.getElementById('modal-savings-goal').classList.remove('active');
    updateAll();
    showToast(id ? 'Objetivo atualizado' : 'Objetivo criado');
}

function addToGoal(id)    { openGoalTxModal(id, 'add'); }
function removeFromGoal(id) { openGoalTxModal(id, 'remove'); }

function openGoalTxModal(goalId, type) {
    const g = savingsGoals.find(x => x.id === goalId);
    const modal = document.getElementById('modal-goal-tx');
    if (!g || !modal) return;
    const balance = getGoalBalance(g);
    const isAdd = type === 'add';
    document.getElementById('goal-tx-title').innerHTML = isAdd
        ? '<i class="fas fa-plus" style="color:var(--success)"></i> Adicionar à poupança'
        : '<i class="fas fa-minus" style="color:#E65100"></i> Retirar da poupança';
    document.getElementById('goal-tx-info').innerHTML =
        `<strong>${g.name}</strong> · saldo atual ${formatCurrency(balance)} / ${formatCurrency(g.target)}`;
    document.getElementById('goal-tx-goal-id').value = goalId;
    document.getElementById('goal-tx-type').value = type;
    document.getElementById('goal-tx-amount').value = '';
    document.getElementById('goal-tx-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('goal-tx-note').value = '';
    modal.classList.add('active');
    setTimeout(() => document.getElementById('goal-tx-amount')?.focus(), 100);
}

function submitGoalTx() {
    const goalId = document.getElementById('goal-tx-goal-id').value;
    const type = document.getElementById('goal-tx-type').value;
    const g = savingsGoals.find(x => x.id === goalId);
    if (!g) return;
    const amt = parseFloat((document.getElementById('goal-tx-amount').value || '').replace(',', '.'));
    if (!isFinite(amt) || amt <= 0) { showToast('Valor inválido'); return; }
    const date = document.getElementById('goal-tx-date').value || new Date().toISOString().slice(0, 10);
    const note = (document.getElementById('goal-tx-note').value || '').trim();
    const balance = getGoalBalance(g);
    if (type === 'remove' && amt > balance) {
        if (!confirm(`Vais retirar ${formatCurrency(amt)} mas só tens ${formatCurrency(balance)}. Continuar (saldo fica negativo)?`)) return;
    }
    g.transactions = g.transactions || [];
    g.transactions.push({ id: generateId(), type, amount: amt, date, note });
    saveData();
    document.getElementById('modal-goal-tx').classList.remove('active');
    // Full re-render so the dashboard pill, the patrimonio total and the
    // saldo projetado all reflect the change immediately. Without this the
    // user only saw the goal card update.
    updateAll();
    if (type === 'add' && getGoalBalance(g) >= g.target) {
        showToast(`🎉 Objetivo "${g.name}" atingido!`);
    } else {
        showToast(type === 'add' ? `+ ${formatCurrency(amt)} em ${g.name}` : `− ${formatCurrency(amt)} de ${g.name}`);
    }
}

function deleteGoal(id) {
    const g = savingsGoals.find(x => x.id === id);
    if (!g) return;
    if (!confirm(`Apagar objetivo "${g.name}"? Histórico de transações perdido.`)) return;
    savingsGoals = savingsGoals.filter(x => x.id !== id);
    saveData();
    updateAll();
}

function showGoalHistory(id) {
    const g = savingsGoals.find(x => x.id === id);
    if (!g) return;
    const txs = [...(g.transactions || [])].sort((a, b) => b.date.localeCompare(a.date));
    if (!txs.length) { showToast('Sem transações ainda'); return; }
    const lines = txs.map(t => `${t.date} ${t.type === 'add' ? '+' : '-'}${formatCurrency(t.amount)}${t.note ? ' · ' + t.note : ''}`).join('\n');
    alert(`Histórico de "${g.name}":\n\n${lines}`);
}

function renderSavingsGoals() {
    const card = document.getElementById('savings-goals-card');
    const list = document.getElementById('savings-goals-list');
    if (!card || !list) return;
    card.style.display = 'block';
    if (!savingsGoals.length) {
        list.innerHTML = '<p class="empty-state" style="padding:10px 0">Sem objetivos ainda. Cria um para começar a poupar com propósito (férias, fundo de emergência, …).</p>';
        return;
    }

    const profile = getUserProfile();
    const avgMonthlySaving = profile?.media_mensal?.poupanca || 0;
    const thisMonth = new Date().toISOString().slice(0, 7);

    list.innerHTML = savingsGoals.map(g => {
        const balance = getGoalBalance(g);
        const pct = Math.min(100, Math.max(0, (balance / g.target) * 100));
        const remaining = Math.max(0, g.target - balance);
        // This-month contribution for this goal (for the per-goal "este mês")
        const thisMonthForGoal = (g.transactions || [])
            .filter(t => (t.date || '').startsWith(thisMonth))
            .reduce((s, t) => s + (t.type === 'add' ? t.amount : -t.amount), 0);
        let timeLabel = '';
        let warn = false;
        if (g.deadline) {
            const days = Math.round((new Date(g.deadline) - new Date()) / 86400000);
            const months = Math.max(1, Math.round(days / 30));
            const requiredMonthly = remaining / months;
            timeLabel = days < 0 ? `prazo passou há ${Math.abs(days)} dias` : `${days} dias · ${formatCurrency(requiredMonthly)}/mês`;
            warn = avgMonthlySaving > 0 && requiredMonthly > avgMonthlySaving * 1.2;
        } else if (g.monthlyTarget) {
            const months = Math.ceil(remaining / g.monthlyTarget);
            timeLabel = `ao ritmo de ${formatCurrency(g.monthlyTarget)}/mês: ${months} ${months === 1 ? 'mês' : 'meses'}`;
        } else if (avgMonthlySaving > 0 && remaining > 0) {
            const months = Math.ceil(remaining / avgMonthlySaving);
            timeLabel = `ao teu ritmo histórico: ${months} ${months === 1 ? 'mês' : 'meses'}`;
        }
        const barColor = pct >= 100 ? 'var(--success)' : warn ? 'var(--danger)' : 'var(--primary)';
        return `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
            <div onclick="openGoalModal('${g.id}')" style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer">
                <div style="font-weight:600;font-size:0.92rem">${g.name} <i class="fas fa-pen" style="font-size:0.65rem;color:var(--text-light);margin-left:4px"></i></div>
                <div style="font-size:0.78rem;color:var(--text-light)">${formatCurrency(balance)} / ${formatCurrency(g.target)}</div>
            </div>
            <div style="height:8px;background:#EEE7FF;border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${barColor};transition:width 0.3s"></div></div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:0.72rem;color:var(--text-light);align-items:center;gap:6px;flex-wrap:wrap">
                <span style="flex:1;min-width:0">${timeLabel}${warn ? ' · <span style="color:var(--danger);font-weight:600">acima do teu ritmo</span>' : ''}${thisMonthForGoal !== 0 ? ` · este mês <strong style="color:${thisMonthForGoal > 0 ? 'var(--success)' : 'var(--danger)'}">${thisMonthForGoal > 0 ? '+' : ''}${formatCurrency(thisMonthForGoal)}</strong>` : ''}</span>
                <div style="display:flex;gap:4px">
                    <button onclick="addToGoal('${g.id}')" class="btn btn-sm" title="Adicionar" style="font-size:0.75rem;padding:4px 9px;background:#E8F5E9;color:#2E7D32;border:1px solid #C8E6C9"><i class="fas fa-plus"></i></button>
                    <button onclick="removeFromGoal('${g.id}')" class="btn btn-sm" title="Retirar" style="font-size:0.75rem;padding:4px 9px;background:#FFF3E0;color:#E65100;border:1px solid #FFCC80"><i class="fas fa-minus"></i></button>
                    <button onclick="showGoalHistory('${g.id}')" class="btn btn-sm" title="Histórico" style="font-size:0.7rem;padding:4px 8px;background:#EEE7FF;color:#5A3BD8;border:1px solid #B9A4F0"><i class="fas fa-clock-rotate-left"></i></button>
                    <button onclick="deleteGoal('${g.id}')" class="btn btn-sm" title="Apagar" style="font-size:0.7rem;padding:4px 8px;background:#FFEBEE;color:#C62828;border:1px solid #FFCDD2"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>`;
    }).join('') + (() => {
        const totalSaved = savingsGoals.reduce((s, g) => s + getGoalBalance(g), 0);
        const totalTarget = savingsGoals.reduce((s, g) => s + g.target, 0);
        const monthly = getGoalsMonthlyContribution(thisMonth);
        return `<div style="margin-top:10px;padding:10px;background:#F3EFFF;border-radius:10px;display:flex;justify-content:space-between;align-items:center;gap:10px">
            <div><div style="font-size:0.7rem;color:#5A3BD8;font-weight:700">TOTAL POUPADO</div>
            <div style="font-weight:700;font-size:1rem;color:#2A1F4F">${formatCurrency(totalSaved)} / ${formatCurrency(totalTarget)}</div></div>
            <div style="text-align:right"><div style="font-size:0.7rem;color:var(--text-light)">Este mês</div>
            <div style="font-weight:700;color:${monthly > 0 ? 'var(--success)' : monthly < 0 ? 'var(--danger)' : 'var(--text-light)'}">${monthly > 0 ? '+' : ''}${formatCurrency(monthly)}</div></div>
        </div>`;
    })() + (hasAnyAiKey() ? `<button onclick="runAiGoalCoach()" id="ai-goal-coach-btn" class="btn btn-block" style="margin-top:10px;background:#EEE7FF;color:#5A3BD8;border:1px solid #B9A4F0"><i class="fas fa-sparkles"></i> Coach IA · ações para acelerar</button>
        <div id="ai-goal-coach-output" style="display:none;margin-top:8px;padding:10px;background:#F3EFFF;border-radius:10px;font-size:0.85rem;line-height:1.5"></div>` : '');
}

async function runAiGoalCoach() {
    const out = document.getElementById('ai-goal-coach-output');
    if (!out) return;
    out.style.display = 'block';
    out.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A IA a desenhar um plano…';
    try {
        const profile = getUserProfile();
        const goalsCompact = savingsGoals.map(g => {
            const balance = getGoalBalance(g);
            return {
                objetivo: g.name,
                alvo: g.target,
                poupado: balance,
                falta: Math.max(0, g.target - balance),
                prazo: g.deadline || 'sem prazo',
                contribuicao_mensal_alvo: g.monthlyTarget || null
            };
        });
        const prompt = `${AI_SYSTEM_PROMPT}
És um coach financeiro. Para cada objetivo abaixo, propõe 1-3 ações concretas baseadas no perfil do utilizador (cortar X EUR em Y, reduzir frequência de Z, etc.). Devolve APENAS JSON array: [{"objetivo":"…","plano":"texto curto com ações concretas e valores em EUR"}]. Máx. ${goalsCompact.length} objetivos.

Objetivos: ${JSON.stringify(goalsCompact)}
${userProfilePromptBlock()}`;
        const raw = await callAIText(prompt);
        const parsed = extractJsonArray(raw);
        if (!parsed.length) { out.innerHTML = 'A IA não gerou um plano desta vez.'; return; }
        out.innerHTML = parsed.map(p => `<div style="padding:8px 0;border-bottom:1px dashed var(--border)">
            <div style="font-weight:700;color:#5A3BD8;margin-bottom:4px">${p.objetivo || ''}</div>
            <div>${p.plano || ''}</div>
        </div>`).join('');
    } catch (e) {
        out.textContent = `Erro: ${e?.message || e}`;
    }
}

// ===== SUBSCRIPTION AUDIT =====
// Combines explicit fixed expenses with detected monthly recurrences in
// regular variable expenses (same description in 3+ different months).
function detectSubscriptions() {
    const subs = [];

    // 1) Explicit fixed expenses with category subscriptions/utilities
    fixedExpenses.forEach(f => {
        if (f.endDate && f.endDate < new Date().toISOString().slice(0, 7)) return;
        const monthly = parseFloat(f.amount) || 0;
        subs.push({
            id: f.id,
            kind: 'fixed',
            name: f.description,
            category: f.category,
            monthly,
            yearly: monthly * 12,
            day: f.dayOfMonth,
            startDate: f.startDate,
            source: 'Despesa fixa'
        });
    });

    // 2) Variable expenses showing as monthly recurrences (≥3 months in last 6)
    const monthsSeen = new Map(); // descKey -> Set of YYYY-MM
    const monthsAmount = new Map();
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 6);
    expenses.forEach(e => {
        if (e.isFixedExpense || !e.date) return;
        if (new Date(e.date) < cutoff) return;
        const key = (e.description || '').toLowerCase().trim().slice(0, 30);
        if (!key) return;
        const mKey = e.date.slice(0, 7);
        if (!monthsSeen.has(key)) { monthsSeen.set(key, new Set()); monthsAmount.set(key, []); }
        monthsSeen.get(key).add(mKey);
        monthsAmount.get(key).push(e.amount);
    });
    monthsSeen.forEach((months, key) => {
        if (months.size < 3) return;
        // Skip if already covered by an explicit fixed
        if (subs.some(s => s.kind === 'fixed' && s.name.toLowerCase().includes(key))) return;
        const amounts = monthsAmount.get(key);
        const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
        const sample = expenses.find(e => (e.description || '').toLowerCase().trim().slice(0, 30) === key);
        subs.push({
            id: 'detected_' + key,
            kind: 'detected',
            name: sample?.description || key,
            category: sample?.category || 'subscricoes',
            monthly: avg,
            yearly: avg * 12,
            monthsSeen: months.size,
            source: 'Detetada (mês a mês)'
        });
    });

    return subs.sort((a, b) => b.yearly - a.yearly);
}

function renderSubscriptionAudit() {
    const card = document.getElementById('subscriptions-card');
    const body = document.getElementById('subscriptions-body');
    if (!card || !body) return;
    const subs = detectSubscriptions();
    if (!subs.length) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    const totalYearly = subs.reduce((s, x) => s + x.yearly, 0);
    const totalMonthly = totalYearly / 12;
    const cats = getEffectiveCategories();
    body.innerHTML = `<div style="background:#F3EFFF;border-radius:10px;padding:10px;margin-bottom:10px;text-align:center">
        <div style="font-size:0.72rem;color:#5A3BD8;font-weight:700">TOTAL ANUAL</div>
        <div style="font-size:1.4rem;font-weight:700;color:#2A1F4F">${formatCurrency(totalYearly)}</div>
        <div style="font-size:0.72rem;color:var(--text-light)">${subs.length} subscrições · ${formatCurrency(totalMonthly)}/mês</div>
    </div>` + subs.map(s => `<div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:8px;align-items:center">
        <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
            <div style="font-size:0.7rem;color:var(--text-light)">${cats[s.category]?.label || s.category} · ${s.source}${s.day ? ` · dia ${s.day}` : ''}</div>
        </div>
        <div style="text-align:right;white-space:nowrap">
            <div style="font-weight:700;font-size:0.9rem">${formatCurrency(s.monthly)}/mês</div>
            <div style="font-size:0.7rem;color:var(--text-light)">${formatCurrency(s.yearly)}/ano</div>
        </div>
    </div>`).join('');
}

// ===== BUDGET ALERTS =====
// Walks the current month's spend per category against categoryBudgets
// and surfaces a banner card on the dashboard whenever any category is
// past 80% (warning) or 100% (alert). Quietly hidden when nothing's at
// risk so the user isn't seeing empty UI.
function renderBudgetAlerts() {
    const card = document.getElementById('budget-alerts');
    if (!card) return;
    const budgets = Object.entries(categoryBudgets || {}).filter(([_, v]) => v > 0);
    if (!budgets.length) { card.style.display = 'none'; return; }
    const monthExp = getEffectiveMonthExpenses(currentDate);
    const byCat = groupByCategory(monthExp);
    const cats = getEffectiveCategories();
    const alerts = budgets.map(([catId, max]) => {
        const spent = byCat[catId] || 0;
        const pct = (spent / max) * 100;
        return { catId, max, spent, pct };
    }).filter(a => a.pct >= 80).sort((a, b) => b.pct - a.pct);
    if (!alerts.length) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    card.innerHTML = `<h3><i class="fas fa-triangle-exclamation" style="color:#F57F17"></i> Alertas de orçamento</h3>` +
        alerts.map(a => {
            const cat = cats[a.catId] || cats.outros;
            const color = a.pct >= 100 ? 'var(--danger)' : '#F57F17';
            return `<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:0.85rem">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span><i class="fas ${cat.icon}" style="color:${color}"></i> ${cat.label}</span>
                    <span style="font-weight:600;color:${color}">${formatCurrency(a.spent)} / ${formatCurrency(a.max)}</span>
                </div>
                <div style="height:5px;background:#EEE7FF;border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.min(100, a.pct)}%;background:${color}"></div></div>
                <div style="font-size:0.7rem;color:var(--text-light);margin-top:3px">${Math.round(a.pct)}% do limite mensal</div>
            </div>`;
        }).join('');
}

// ===== NET WORTH MINI =====
// Tiny dashboard card with assets (savings, investments, real estate) and
// liabilities (loans, credit). Computed totals, last update timestamp,
// and a button to edit the lists via prompt. No double-counting of
// expenses — this is a separate snapshot the user maintains manually.
function renderNetWorth() {
    const card = document.getElementById('net-worth-card');
    const body = document.getElementById('net-worth-body');
    if (!card || !body) return;
    const manualAssets = (netWorth.assets || []).reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
    // Savings goals roll up into the Património automatically: every euro
    // the user moves into a goal counts as an asset. Avoids the user
    // having to keep two lists in sync manually.
    const goalsBalance = (savingsGoals || []).reduce((s, g) => s + getGoalBalance(g), 0);
    const assets = manualAssets + goalsBalance;
    const liabilities = (netWorth.liabilities || []).reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
    const total = assets - liabilities;
    card.style.display = 'block';
    if (assets === 0 && liabilities === 0) {
        body.innerHTML = `<p class="empty-state" style="padding:10px 0">O património é uma fotografia rápida de tudo o que tens (depósitos, investimentos, casa, carro) menos tudo o que deves (créditos, cartão de crédito por pagar). Os teus objetivos de poupança entram automaticamente nos ativos.</p>
            <button onclick="openNetWorthModal()" class="btn btn-block" style="background:#EEE7FF;color:#5A3BD8;border:1px solid #B9A4F0"><i class="fas fa-plus"></i> Configurar património</button>`;
        return;
    }
    const updated = netWorth.updatedAt ? new Date(netWorth.updatedAt).toLocaleDateString('pt-PT') : '—';
    const assetsLabel = goalsBalance > 0
        ? `Ativos · ${(netWorth.assets || []).length}+poupança`
        : `Ativos · ${(netWorth.assets || []).length}`;
    body.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div><div style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;letter-spacing:0.04em">Património líquido</div>
        <div style="font-size:1.6rem;font-weight:700;color:${total >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(total)}</div></div>
        <button onclick="openNetWorthModal()" class="btn btn-sm" style="background:#EEE7FF;color:#5A3BD8;border:1px solid #B9A4F0"><i class="fas fa-pen"></i></button>
    </div>
    <div style="display:flex;gap:10px">
        <div style="flex:1;padding:8px;background:#E8F5E9;border-radius:8px"><div style="font-size:0.72rem;color:#2E7D32">${assetsLabel}</div><div style="font-weight:700;color:#2E7D32">${formatCurrency(assets)}</div>${goalsBalance > 0 ? `<div style="font-size:0.66rem;color:var(--text-light)">+${formatCurrency(goalsBalance)} de objetivos</div>` : ''}</div>
        <div style="flex:1;padding:8px;background:#FFEBEE;border-radius:8px"><div style="font-size:0.72rem;color:#C62828">Passivos · ${(netWorth.liabilities || []).length}</div><div style="font-weight:700;color:#C62828">${formatCurrency(liabilities)}</div></div>
    </div>
    <div style="font-size:0.68rem;color:var(--text-light);text-align:right;margin-top:6px">Atualizado em ${updated}</div>`;
}

// Proper modal-based editor: each line is a row with name + amount inputs
// and a delete button. No more parsing free-form text.
function openNetWorthModal() {
    const modal = document.getElementById('modal-net-worth');
    if (!modal) return;
    renderNetWorthEditor();
    modal.classList.add('active');
}

function closeNetWorthModal() {
    const modal = document.getElementById('modal-net-worth');
    if (modal) modal.classList.remove('active');
}

function renderNetWorthEditor() {
    const renderList = (arr, kind) => arr.map((it, idx) => `<div style="display:flex;gap:6px;margin-bottom:6px">
        <input type="text" data-nw-kind="${kind}" data-nw-idx="${idx}" data-nw-field="name" value="${(it.name || '').replace(/"/g, '&quot;')}" placeholder="${kind === 'asset' ? 'Ex: Conta Activobank' : 'Ex: Crédito casa'}" style="flex:1">
        <input type="number" step="0.01" data-nw-kind="${kind}" data-nw-idx="${idx}" data-nw-field="amount" value="${it.amount || ''}" placeholder="0,00" style="width:110px">
        <button type="button" onclick="removeNwRow('${kind}', ${idx})" class="btn btn-icon" style="background:#FFEBEE;color:#C62828;border:1px solid #FFCDD2;width:38px"><i class="fas fa-times"></i></button>
    </div>`).join('');
    const container = document.getElementById('net-worth-editor');
    if (!container) return;
    container.innerHTML = `
        <div style="margin-bottom:14px">
            <h4 style="margin:0 0 6px;color:#2E7D32"><i class="fas fa-arrow-up"></i> Ativos (o que tens)</h4>
            <small style="color:var(--text-light);font-size:0.78rem;display:block;margin-bottom:6px">Conta-poupança, ações/ETFs, criptomoedas, casa, carro, certificados de aforro, etc.</small>
            <div id="nw-assets">${renderList(netWorth.assets || [], 'asset') || '<p class="empty-state" style="padding:6px 0;font-size:0.85rem">Sem ativos</p>'}</div>
            <button type="button" onclick="addNwRow('asset')" class="btn btn-sm btn-block" style="background:#E8F5E9;color:#2E7D32;border:1px solid #C8E6C9;margin-top:6px"><i class="fas fa-plus"></i> Adicionar ativo</button>
        </div>
        <div style="margin-bottom:14px">
            <h4 style="margin:0 0 6px;color:#C62828"><i class="fas fa-arrow-down"></i> Passivos (o que deves)</h4>
            <small style="color:var(--text-light);font-size:0.78rem;display:block;margin-bottom:6px">Crédito habitação por liquidar, crédito automóvel, cartão de crédito por pagar, empréstimos.</small>
            <div id="nw-liabs">${renderList(netWorth.liabilities || [], 'liability') || '<p class="empty-state" style="padding:6px 0;font-size:0.85rem">Sem passivos</p>'}</div>
            <button type="button" onclick="addNwRow('liability')" class="btn btn-sm btn-block" style="background:#FFEBEE;color:#C62828;border:1px solid #FFCDD2;margin-top:6px"><i class="fas fa-plus"></i> Adicionar passivo</button>
        </div>
    `;
}

function addNwRow(kind) {
    saveNwInputsToState();
    if (kind === 'asset') (netWorth.assets = netWorth.assets || []).push({ name: '', amount: 0 });
    else (netWorth.liabilities = netWorth.liabilities || []).push({ name: '', amount: 0 });
    renderNetWorthEditor();
}

function removeNwRow(kind, idx) {
    saveNwInputsToState();
    const arr = kind === 'asset' ? netWorth.assets : netWorth.liabilities;
    if (arr) arr.splice(idx, 1);
    renderNetWorthEditor();
}

function saveNwInputsToState() {
    document.querySelectorAll('[data-nw-kind]').forEach(el => {
        const kind = el.dataset.nwKind;
        const idx = parseInt(el.dataset.nwIdx);
        const field = el.dataset.nwField;
        const arr = kind === 'asset' ? (netWorth.assets || []) : (netWorth.liabilities || []);
        if (!arr[idx]) return;
        if (field === 'name') arr[idx].name = el.value.trim();
        else if (field === 'amount') arr[idx].amount = parseFloat((el.value || '0').replace(',', '.')) || 0;
    });
}

function saveNetWorth() {
    saveNwInputsToState();
    // Drop empty rows so the user can leave half-filled forms without
    // polluting the data.
    netWorth.assets = (netWorth.assets || []).filter(x => x.name && x.amount);
    netWorth.liabilities = (netWorth.liabilities || []).filter(x => x.name && x.amount);
    netWorth.updatedAt = new Date().toISOString();
    saveData();
    renderNetWorth();
    closeNetWorthModal();
    showToast('Património atualizado');
}

// ===== PREPAID CARDS =====
// Reloadable cards / vouchers / digital wallets: user tops up once, then
// every purchase paid with the card decrements its balance. Kept simple:
// balance is derived from the transactions ledger (no mutable field), so
// the source of truth is always replayable.
function getPrepaidBalance(cardId) {
    const card = prepaidCards.find(c => c.id === cardId);
    if (!card) return 0;
    return (card.transactions || []).reduce((s, t) => s + (t.type === 'topup' ? t.amount : -t.amount), 0);
}

// Top-up = real cash leaving the user's wallet/bank. We create both:
//  - a transaction on the card ledger so the prepaid balance goes up
//  - a real expense flagged isPrepaidTopup so the dashboard/totals
//    register the outflow this month. The two records reference each
//    other (txId on the expense, expenseId on the transaction) so a
//    later delete of either side can cascade.
function addPrepaidTopup(cardId, amount, description, date) {
    const card = prepaidCards.find(c => c.id === cardId);
    if (!card) return;
    const amt = parseFloat(amount);
    const dateStr = date || new Date().toISOString().slice(0, 10);
    const txId = generateId();
    const expenseId = generateId();
    card.transactions = card.transactions || [];
    card.transactions.push({
        id: txId,
        type: 'topup',
        amount: amt,
        description: description || 'Carregamento',
        date: dateStr,
        expenseId
    });
    expenses.push({
        id: expenseId,
        description: `Carregamento ${card.name}`,
        amount: amt,
        date: dateStr,
        category: 'outros',
        type: 'personal',
        essential: true,
        isPrepaidTopup: true,
        prepaidCardId: cardId,
        prepaidTxId: txId,
        notes: description && description !== 'Carregamento' ? description : '',
        createdAt: new Date().toISOString()
    });
    saveData();
    renderPrepaidCards();
    updateAll();
    showToast(`+ ${formatCurrency(amt)} em ${card.name}`);
}

// True when an expense represents money actually leaving the user's
// pocket this month. Top-ups count (real outflow at top-up time);
// spends paid from a prepaid card balance don't (already accounted for
// when the card was loaded).
function expenseAffectsBalance(e) {
    if (!e || !e.prepaidCardId) return true;
    return !!e.isPrepaidTopup;
}

// Reconciles the prepaid spend ledger after an expense save. Handles all
// four transitions in one place so callers don't have to reason about
// them: (no card → card) creates a tx, (card → no card) removes the
// existing tx, (card A → card B) moves it across, (same card, edited
// fields) updates amount/date/description in place.
function syncPrepaidSpendForExpense(expense, newCardId) {
    const oldCardId = expense.prepaidCardId || null;
    const oldTxId = expense.prepaidTxId || null;
    const sameCard = oldCardId && newCardId && oldCardId === newCardId;

    if (sameCard) {
        const card = prepaidCards.find(c => c.id === newCardId);
        const tx = card?.transactions?.find(t => t.id === oldTxId);
        if (tx) {
            tx.amount = expense.amount;
            tx.date = expense.date;
            tx.description = expense.description || 'Consumo';
            return;
        }
        // Fallthrough: linked tx vanished — create a fresh one below.
    }

    if (oldCardId) {
        const oldCard = prepaidCards.find(c => c.id === oldCardId);
        if (oldCard && oldTxId) {
            oldCard.transactions = (oldCard.transactions || []).filter(t => t.id !== oldTxId);
        }
        expense.prepaidCardId = null;
        expense.prepaidTxId = null;
    }

    if (newCardId) {
        const txId = addPrepaidSpend(newCardId, expense.amount, expense.description || 'Consumo', expense.date, expense.id);
        if (txId) {
            expense.prepaidCardId = newCardId;
            expense.prepaidTxId = txId;
        }
    }
}

function addPrepaidSpend(cardId, amount, description, date, expenseId) {
    const card = prepaidCards.find(c => c.id === cardId);
    if (!card) return null;
    const txId = generateId();
    card.transactions = card.transactions || [];
    card.transactions.push({
        id: txId,
        type: 'spend',
        amount: parseFloat(amount),
        description: description || 'Consumo',
        date: date || new Date().toISOString().slice(0, 10),
        expenseId: expenseId || null
    });
    return txId;
}

function createPrepaidCard(name, initialBalance, icon, color) {
    const card = {
        id: generateId(),
        name: name.trim(),
        icon: icon || 'fa-credit-card',
        color: color || '#5A3BD8',
        createdAt: new Date().toISOString(),
        transactions: []
    };
    prepaidCards.push(card);
    // Same accounting fix as submitNewPrepaid: a non-zero initial balance
    // has to flow through addPrepaidTopup so the matching "Carregamento"
    // expense is created and the dashboard sees the cash out.
    if (initialBalance && initialBalance > 0) {
        addPrepaidTopup(card.id, parseFloat(initialBalance), 'Saldo inicial', new Date().toISOString().slice(0, 10));
    } else {
        saveData();
        renderPrepaidCards();
    }
    return card;
}

// Cascade delete: when the card goes away, the dashboard totals must
// reflect that the top-ups never happened (we delete the linked
// "Carregamento ..." expenses) and that any consumption paid via the
// card now stops being a hidden line item — the spend expenses get
// their prepaidCardId stripped so they re-enter the regular monthly
// totals via expenseAffectsBalance.
function deletePrepaidCard(id) {
    const card = prepaidCards.find(c => c.id === id);
    if (!card) return;
    const txs = card.transactions || [];
    const topupExpenseIds = new Set();
    txs.forEach(t => { if (t.type === 'topup' && t.expenseId) topupExpenseIds.add(t.expenseId); });
    const spendCount = txs.filter(t => t.type === 'spend').length;
    const lines = [];
    lines.push(`Apagar cartão ${card.name}?`);
    lines.push('');
    lines.push(`• Remove os ${txs.length} movimentos do cartão`);
    if (topupExpenseIds.size) lines.push(`• Apaga também ${topupExpenseIds.size} carregamento(s) registado(s) como despesa`);
    if (spendCount) lines.push(`• Os ${spendCount} consumo(s) passam a contar como despesas normais nos totais mensais`);
    if (!confirm(lines.join('\n'))) return;
    // Drop top-up expenses (the dashboard outflow they represent must go).
    expenses = expenses.filter(e => !topupExpenseIds.has(e.id));
    // Unlink any consumption expenses pointing to this card so they stop
    // being hidden by expenseAffectsBalance.
    expenses.forEach(e => {
        if (e.prepaidCardId === id) {
            e.prepaidCardId = null;
            e.prepaidTxId = null;
        }
    });
    prepaidCards = prepaidCards.filter(c => c.id !== id);
    saveData();
    renderPrepaidCards();
    updateAll();
    showToast('Cartão apagado');
}

// Lightweight rename for prepaid cards. Changing the name also updates
// the description on every linked top-up expense so the dashboard rows
// stay in sync ("Carregamento Lidl Plus" → "Carregamento Lidl"). Date,
// amount and color are unchanged.
function editPrepaidCard(id) {
    const card = prepaidCards.find(c => c.id === id);
    if (!card) return;
    const newName = prompt('Novo nome do cartão:', card.name);
    if (newName == null) return;
    const trimmed = newName.trim();
    if (!trimmed) { showToast('Nome inválido'); return; }
    const oldName = card.name;
    card.name = trimmed;
    expenses.forEach(e => {
        if (e.isPrepaidTopup && e.prepaidCardId === id) {
            e.description = `Carregamento ${trimmed}`;
            e.updatedAt = new Date().toISOString();
        }
    });
    saveData();
    renderPrepaidCards();
    updateAll();
    showToast(`Cartão renomeado: ${oldName} → ${trimmed}`);
}

// Opens the create-card modal with sensible defaults (today's date for the
// initial top-up, blank name/balance) and focuses the name input.
function showAddPrepaidPrompt() {
    const modal = document.getElementById('modal-prepaid-create');
    if (!modal) return;
    const today = new Date().toISOString().slice(0, 10);
    const nameEl = document.getElementById('prepaid-create-name');
    const balEl = document.getElementById('prepaid-create-balance');
    const dateEl = document.getElementById('prepaid-create-date');
    if (nameEl) nameEl.value = '';
    if (balEl) balEl.value = '';
    if (dateEl) dateEl.value = today;
    modal.classList.add('active');
    setTimeout(() => nameEl?.focus(), 100);
}

function submitNewPrepaid() {
    const name = (document.getElementById('prepaid-create-name')?.value || '').trim();
    if (!name) { showToast('Indica um nome'); return; }
    const bal = parseFloat((document.getElementById('prepaid-create-balance')?.value || '0').replace(',', '.'));
    const date = document.getElementById('prepaid-create-date')?.value || new Date().toISOString().slice(0, 10);
    const card = {
        id: generateId(),
        name,
        icon: 'fa-credit-card',
        color: '#5A3BD8',
        createdAt: new Date().toISOString(),
        transactions: []
    };
    prepaidCards.push(card);
    // Route the initial balance through addPrepaidTopup so the
    // accompanying "Carregamento ..." expense is created — that's what
    // makes the dashboard saldo register the real cash out. Without
    // this, the card showed 4000€ but the dashboard didn't notice the
    // money had left the wallet.
    if (isFinite(bal) && bal > 0) {
        addPrepaidTopup(card.id, bal, 'Saldo inicial', date);
    } else {
        saveData();
        renderPrepaidCards();
    }
    document.getElementById('modal-prepaid-create')?.classList.remove('active');
    showToast('Cartão criado');
}

// Opens the top-up modal with the date prefilled to today (editable) and
// the card's name shown so the user knows which card they're charging.
function showPrepaidTopupPrompt(cardId) {
    const card = prepaidCards.find(c => c.id === cardId);
    if (!card) return;
    const modal = document.getElementById('modal-prepaid-topup');
    if (!modal) return;
    const today = new Date().toISOString().slice(0, 10);
    const balance = getPrepaidBalance(cardId);
    document.getElementById('prepaid-topup-card-id').value = cardId;
    document.getElementById('prepaid-topup-card-info').innerHTML =
        `<strong>${card.name}</strong> · saldo atual ${formatCurrency(balance)}`;
    document.getElementById('prepaid-topup-amount').value = '';
    document.getElementById('prepaid-topup-date').value = today;
    document.getElementById('prepaid-topup-note').value = '';
    delete modal.dataset.editingTxId;
    modal.classList.add('active');
    setTimeout(() => document.getElementById('prepaid-topup-amount')?.focus(), 100);
}

function submitPrepaidTopup() {
    const modal = document.getElementById('modal-prepaid-topup');
    const cardId = document.getElementById('prepaid-topup-card-id')?.value;
    if (!cardId) return;
    const amt = parseFloat((document.getElementById('prepaid-topup-amount')?.value || '').replace(',', '.'));
    if (!isFinite(amt) || amt <= 0) { showToast('Valor inválido'); return; }
    const date = document.getElementById('prepaid-topup-date')?.value || new Date().toISOString().slice(0, 10);
    const note = (document.getElementById('prepaid-topup-note')?.value || '').trim() || 'Carregamento';
    const editingId = modal?.dataset.editingTxId;
    if (editingId) {
        // Edit mode: update the tx in place and the linked top-up expense.
        const card = prepaidCards.find(c => c.id === cardId);
        const tx = card?.transactions?.find(t => t.id === editingId);
        if (tx) {
            tx.amount = amt;
            tx.date = date;
            tx.description = note;
            const linked = expenses.find(e => e.id === tx.expenseId);
            if (linked) {
                linked.amount = amt;
                linked.date = date;
                linked.description = `Carregamento ${card.name}`;
                linked.notes = note && note !== 'Carregamento' ? note : '';
                linked.updatedAt = new Date().toISOString();
            }
            saveData();
            updateAll();
            renderPrepaidCards();
            showToast('Carregamento atualizado');
        }
    } else {
        addPrepaidTopup(cardId, amt, note, date);
    }
    if (modal) {
        delete modal.dataset.editingTxId;
        modal.classList.remove('active');
    }
}

function renderPrepaidCards() {
    const container = document.getElementById('prepaid-cards-list');
    if (!container) return;
    if (!prepaidCards.length) {
        // Compact empty state: single CTA button, no paragraph (the H3
        // already conveys the section). Keeps the dashboard tidy when the
        // user doesn't use prepaid cards.
        container.innerHTML = `<button onclick="showAddPrepaidPrompt()" class="btn btn-block" style="background:#F3EFFF;color:#5A3BD8;border:1px dashed #B9A4F0;padding:8px;font-size:0.82rem"><i class="fas fa-plus"></i> Criar cartão (Lidl Plus, Via Verde, Bolt, gift cards…)</button>`;
        return;
    }
    const collapsed = getPrepaidCollapsed();
    container.innerHTML = prepaidCards.map(card => {
        const balance = getPrepaidBalance(card.id);
        const txs = [...(card.transactions || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
        const color = balance > 0 ? 'var(--success)' : balance < 0 ? 'var(--danger)' : 'var(--text-light)';
        const isCollapsed = !!collapsed[card.id];
        const chev = isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up';
        const detailsHtml = isCollapsed ? '' : `${txs.length ? `<div style="margin-top:8px;border-top:1px dashed var(--border);padding-top:8px">${txs.map(t => `<div style="display:flex;justify-content:space-between;font-size:0.78rem;padding:3px 0;align-items:center;gap:6px">
                <span style="color:var(--text-light);min-width:74px">${t.date}</span>
                <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.description}</span>
                <span style="font-weight:600;color:${t.type === 'topup' ? 'var(--success)' : 'var(--danger)'};white-space:nowrap">${t.type === 'topup' ? '+' : '-'}${formatCurrency(t.amount)}</span>
                <button onclick="event.stopPropagation();editPrepaidTransaction('${card.id}','${t.id}')" title="Editar" class="btn-icon" style="width:24px;height:24px;color:var(--primary);font-size:0.7rem"><i class="fas fa-pen"></i></button>
                <button onclick="event.stopPropagation();deletePrepaidTransaction('${card.id}','${t.id}')" title="Apagar" class="btn-icon" style="width:24px;height:24px;color:var(--danger);font-size:0.7rem"><i class="fas fa-times"></i></button>
            </div>`).join('')}</div>` : ''}
            <div style="display:flex;gap:6px;margin-top:10px">
                <button onclick="event.stopPropagation();showPrepaidTopupPrompt('${card.id}')" class="btn btn-sm" style="flex:1;background:#E8F5E9;color:#2E7D32;border:1px solid #C8E6C9"><i class="fas fa-plus"></i> Carregar</button>
                <button onclick="event.stopPropagation();editPrepaidCard('${card.id}')" class="btn btn-sm" style="background:#EDE7F6;color:var(--primary);border:1px solid rgba(108,92,231,0.25)" title="Renomear"><i class="fas fa-pen"></i></button>
                <button onclick="event.stopPropagation();deletePrepaidCard('${card.id}')" class="btn btn-sm" style="background:#FFEBEE;color:#C62828;border:1px solid #FFCDD2"><i class="fas fa-trash"></i></button>
            </div>`;
        // Tap on the header (everything except the action buttons)
        // toggles collapsed state. Lets the user keep many cards visible
        // without each one taking the full vertical real estate.
        return `<div style="background:#fff;border:1px solid var(--border);border-left:4px solid ${card.color || '#5A3BD8'};border-radius:10px;padding:12px;margin-bottom:10px">
            <div onclick="togglePrepaidCard('${card.id}')" style="display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer">
                <div style="flex:1;min-width:0"><div style="font-weight:700;font-size:0.95rem"><i class="fas ${card.icon || 'fa-credit-card'}" style="color:${card.color || '#5A3BD8'}"></i> ${card.name}</div>
                <div style="font-size:0.72rem;color:var(--text-light)">${(card.transactions || []).length} transações · toca para ${isCollapsed ? 'expandir' : 'colapsar'}</div></div>
                <div style="display:flex;align-items:center;gap:8px">
                    <div style="text-align:right"><div style="font-weight:700;font-size:1.1rem;color:${color}">${formatCurrency(balance)}</div><div style="font-size:0.7rem;color:var(--text-light)">saldo</div></div>
                    <i class="fas ${chev}" style="color:var(--text-light);font-size:0.8rem"></i>
                </div>
            </div>
            ${detailsHtml}
        </div>`;
    }).join('');
}

function getPrepaidCollapsed() {
    try { return JSON.parse(localStorage.getItem('vanessa_prepaid_collapsed') || '{}') || {}; } catch { return {}; }
}
function togglePrepaidCard(cardId) {
    const map = getPrepaidCollapsed();
    map[cardId] = !map[cardId];
    localStorage.setItem('vanessa_prepaid_collapsed', JSON.stringify(map));
    renderPrepaidCards();
}

// Removes a single transaction. If it's a top-up that has a linked
// expense (same prepaidTxId), drop that expense too so the dashboard
// totals don't keep counting an outflow that no longer exists. Spends
// are linked to a user-created expense (the actual purchase) — we keep
// the expense in place and just unlink it so the user can re-pair it
// later if needed.
function deletePrepaidTransaction(cardId, txId) {
    const card = prepaidCards.find(c => c.id === cardId);
    if (!card) return;
    const tx = (card.transactions || []).find(t => t.id === txId);
    if (!tx) return;
    if (!confirm(`Apagar este movimento (${tx.type === 'topup' ? 'carregamento' : 'consumo'} de ${formatCurrency(tx.amount)})?`)) return;
    if (tx.type === 'topup') {
        const linked = expenses.findIndex(e => e.id === tx.expenseId || (e.prepaidTxId === tx.id && e.isPrepaidTopup));
        if (linked >= 0) expenses.splice(linked, 1);
    } else if (tx.type === 'spend') {
        // Unlink any expense that pointed to this tx (don't delete it).
        expenses.forEach(e => {
            if (e.prepaidTxId === tx.id || e.id === tx.expenseId) {
                e.prepaidCardId = null;
                e.prepaidTxId = null;
            }
        });
    }
    card.transactions = card.transactions.filter(t => t.id !== txId);
    saveData();
    updateAll();
    renderPrepaidCards();
    showToast('Movimento apagado');
}

// Editing semantics:
//  - Spend (paid via card): the source of truth is the linked expense, so
//    we just open the regular expense edit modal. saveExpense's prepaid
//    sync hook will rewrite the matching ledger entry on save.
//  - Top-up: the source of truth is the prepaid transaction, so we reuse
//    the top-up modal in "edit" mode (hidden tx-id stamps the existing
//    tx instead of creating a new one). Saving syncs the paired expense.
function editPrepaidTransaction(cardId, txId) {
    const card = prepaidCards.find(c => c.id === cardId);
    const tx = card?.transactions?.find(t => t.id === txId);
    if (!card || !tx) return;
    if (tx.type === 'spend') {
        // Sole source of truth: the expense whose prepaidTxId matches THIS
        // tx. We deliberately don't fall back to tx.expenseId because that
        // pointer can be stale (duplicates, edits) and the bug we keep
        // hitting is "tap -10€ row → opens -100€ expense" caused by
        // exactly that fallback. If the back-reference is missing, tell
        // the user the link is broken instead of guessing.
        const linked = expenses.find(e => e.prepaidTxId === txId);
        if (!linked) {
            showToast('Despesa associada não encontrada — link partido. Apaga e recria a despesa.');
            return;
        }
        editExpense(linked.id);
        return;
    }
    // Top-up: prefill the topup modal in edit mode.
    const modal = document.getElementById('modal-prepaid-topup');
    if (!modal) return;
    document.getElementById('prepaid-topup-card-id').value = cardId;
    document.getElementById('prepaid-topup-card-info').innerHTML =
        `<strong>${card.name}</strong> · a editar carregamento`;
    document.getElementById('prepaid-topup-amount').value = tx.amount;
    document.getElementById('prepaid-topup-date').value = tx.date;
    document.getElementById('prepaid-topup-note').value = tx.description || '';
    // Mark the modal as editing this tx so submit updates instead of creates.
    modal.dataset.editingTxId = txId;
    modal.classList.add('active');
    setTimeout(() => document.getElementById('prepaid-topup-amount')?.focus(), 100);
}

// Populates the "Pagar com cartão" select in the expense modal. Balance
// next to each entry tells the user at-a-glance whether there's enough.
function populatePrepaidSelect() {
    const sel = document.getElementById('expense-prepaid-card');
    if (!sel) return;
    const current = sel.value;
    const options = ['<option value="">— Nenhum —</option>'];
    prepaidCards.forEach(c => {
        const bal = getPrepaidBalance(c.id);
        options.push(`<option value="${c.id}">${c.name} (${formatCurrency(bal)})</option>`);
    });
    sel.innerHTML = options.join('');
    if (current && prepaidCards.some(c => c.id === current)) sel.value = current;
}

function deleteExpense() {
    // Cascade to the prepaid card ledger so removing the expense from the
    // list also removes the matching tx from the card. Without this the
    // card kept showing "Carregamento" and "Sumo" rows for expenses the
    // user had already deleted, leaving the two views inconsistent.
    const target = expenses.find(e => e.id === pendingDeleteId);
    if (target?.prepaidCardId && target?.prepaidTxId) {
        const card = prepaidCards.find(c => c.id === target.prepaidCardId);
        if (card) {
            card.transactions = (card.transactions || []).filter(t => t.id !== target.prepaidTxId);
        }
    }
    expenses = expenses.filter(e => e.id !== pendingDeleteId);
    saveData();
    closeConfirm();
    updateAll();
    renderPrepaidCards();
    showToast('Despesa apagada');
}
function closeConfirm() {
    document.getElementById('modal-confirm').classList.remove('active');
    pendingDeleteId = null;
    // Restore the default footer button in case a previous flow (e.g. fixed
    // expense delete with two inline choices) hid it.
    const confirmBtn = document.getElementById('confirm-btn');
    if (confirmBtn) confirmBtn.style.display = '';
}

// ===== MODALS =====
function closeModal() { document.getElementById('modal-add').classList.remove('active'); }
function closeIncomeModal() { document.getElementById('modal-income').classList.remove('active'); }
function showExportMenu() { document.getElementById('modal-export').classList.add('active'); }
function closeExportMenu() { document.getElementById('modal-export').classList.remove('active'); }
function showImportDialog() { document.getElementById('modal-import').classList.add('active'); }
function closeImportDialog() { document.getElementById('modal-import').classList.remove('active'); }

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// ===== SHARE WITH CO-PARENT =====
function shareWithCoParent() { shareWithCoParentById(getActiveChild()?.id); }
function shareWithCoParentWithAttachments() { shareWithCoParentWithAttachmentsById(getActiveChild()?.id); }
function exportChildReport() { exportChildReportById(getActiveChild()?.id); }

async function shareWithCoParentById(childId) {
    const child = children.find(c => c.id === childId);
    if (!child) return;
    const monthExp = getEffectiveMonthExpenses(currentDate).filter(e => e.type === child.id && e.split);
    if (monthExp.length === 0) { showToast('Sem despesas partilhadas'); return; }

    const total = monthExp.reduce((s, e) => s + (e.fullAmount || e.amount), 0);
    const coParentShare = total * (child.splitPct / 100);
    const paid = monthExp.filter(e => e.paidByFather).reduce((s, e) => s + (e.fullAmount || e.amount) * (child.splitPct / 100), 0);
    const pending = coParentShare - paid;

    const fallback = `Despesas de ${child.name} - ${getMonthLabel(currentDate)}\n\n` +
        monthExp.map(e => `- ${formatDate(e.date)}: ${e.description} - ${formatCurrency(e.fullAmount || e.amount)}${e.attachment ? ' [fatura anexada]' : ''}`).join('\n') +
        `\n\nTotal: ${formatCurrency(total)}\nA tua parte (${child.splitPct}%): ${formatCurrency(coParentShare)}\n` +
        (paid > 0 ? `Ja pagaste: ${formatCurrency(paid)}\n` : '') +
        (pending > 0 ? `Em falta: ${formatCurrency(pending)}` : 'Tudo pago!');

    // Ask the AI to draft a nicer intro; fall back to the plain breakdown.
    let text = fallback;
    const aiIntro = await aiDraftShareMessage({
        destinatario: child.coParentName || 'co-progenitor',
        filho: child.name,
        mes: getMonthLabel(currentDate),
        total_eur: Math.round(total * 100) / 100,
        parte_eur: Math.round(coParentShare * 100) / 100,
        pago_eur: Math.round(paid * 100) / 100,
        em_falta_eur: Math.round(pending * 100) / 100,
        n_despesas: monthExp.length
    });
    if (aiIntro) text = `${aiIntro}\n\n${fallback}`;

    if (navigator.share) {
        navigator.share({ title: `Despesas ${child.name} - ${getMonthLabel(currentDate)}`, text })
            .catch(() => copyToClipboard(text));
    } else {
        copyToClipboard(text);
    }
}

function shareWithCoParentWithAttachmentsById(childId) {
    const child = children.find(c => c.id === childId);
    if (!child) return;
    const monthExp = getEffectiveMonthExpenses(currentDate).filter(e => e.type === child.id && e.split);
    if (monthExp.length === 0) { showToast('Sem despesas partilhadas'); return; }

    const total = monthExp.reduce((s, e) => s + (e.fullAmount || e.amount), 0);
    const coParentShare = total * (child.splitPct / 100);
    const paid = monthExp.filter(e => e.paidByFather).reduce((s, e) => s + (e.fullAmount || e.amount) * (child.splitPct / 100), 0);
    const pending = coParentShare - paid;

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Despesas ${child.name} - ${getMonthLabel(currentDate)}</title>
    <style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px}
    h1{color:#6C5CE7;font-size:1.3rem}table{width:100%;border-collapse:collapse;margin:16px 0}
    th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #eee;font-size:0.9rem}
    th{background:#f5f5f5;font-weight:600}.pending{color:#E53935;font-weight:700}
    .img-attach{max-width:100%;max-height:300px;margin:8px 0;border-radius:8px;border:1px solid #ddd}
    .summary{background:#FFF3E0;padding:16px;border-radius:8px;margin:16px 0}</style></head><body>`;
    html += `<h1>Despesas de ${child.name} - ${getMonthLabel(currentDate)}</h1>`;
    html += `<div class="summary"><p><strong>Total:</strong> ${formatCurrency(total)}</p>`;
    html += `<p><strong>Parte de ${child.coParentName} (${child.splitPct}%):</strong> ${formatCurrency(coParentShare)}</p>`;
    html += `<p><strong>Ja pago:</strong> ${formatCurrency(paid)}</p>`;
    html += `<p class="pending"><strong>Em falta:</strong> ${formatCurrency(pending)}</p></div>`;
    html += `<table><tr><th>Data</th><th>Descricao</th><th>Valor</th><th>Estado</th></tr>`;
    monthExp.sort((a, b) => a.date.localeCompare(b.date)).forEach(e => {
        html += `<tr><td>${formatDate(e.date)}</td><td>${e.description}</td><td>${formatCurrency(e.amount)}</td><td>${e.paidByFather ? 'Pago' : 'Pendente'}</td></tr>`;
        if (e.attachment && e.attachment.type?.startsWith('image/')) {
            html += `<tr><td colspan="4"><img class="img-attach" src="${e.attachment.data}" alt="Fatura - ${e.description}"></td></tr>`;
        }
    });
    html += `</table><p style="color:#999;font-size:0.8rem">Gerado pela app Despesas</p></body></html>`;

    downloadFile(html, `${child.name.toLowerCase()}_faturas_${formatMonthFile(currentDate)}.html`, 'text/html');
    showToast('Relatorio com faturas exportado!');
}

// ===== EXPORT =====
function exportToCSV() {
    const monthExp = getEffectiveMonthExpenses(currentDate);
    if (monthExp.length === 0) { showToast('Sem despesas para exportar'); return; }

    const headers = ['Data', 'Descricao', 'Categoria', 'Valor', 'Tipo', 'Partilha 50/50', 'Essencial', 'Tem Anexo', 'Notas'];
    const rows = monthExp.sort((a, b) => a.date.localeCompare(b.date)).map(e => [
        formatDate(e.date),
        e.description,
        getEffectiveCategories()[e.category]?.label || e.category,
        e.amount.toFixed(2).replace('.', ','),
        (children.find(c => c.id === e.type)?.name) || 'Pessoal',
        e.split ? 'Sim' : 'Nao',
        e.essential !== false ? 'Sim' : 'Nao',
        e.attachment ? 'Sim' : 'Nao',
        e.notes || ''
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(';')).join('\n');
    const BOM = '\uFEFF';
    downloadFile(BOM + csv, `despesas_${formatMonthFile(currentDate)}.csv`, 'text/csv;charset=utf-8');
    closeExportMenu();
    showToast('CSV exportado!');
}

function exportToJSON() {
    const data = JSON.stringify({
        version: 2,
        exportedAt: new Date().toISOString(),
        expenses,
        incomes,
        fixedExpenses,
        fixedStatus,
        fixedIncomes,
        fixedIncomeStatus,
        children,
        customCategories,
        customIncCategories,
        expenseTemplates,
        categoryBudgets,
        settings: {
            userName: getUserName(),
            appTitle: getAppTitle(),
            householdMode: getHouseholdMode(),
            spouseName: localStorage.getItem(SPOUSE_NAME_KEY) || '',
            spousePct: getSpousePct()
        }
    }, null, 2);
    downloadFile(data, `despesas_backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    closeExportMenu();
    showToast('Backup completo exportado!');
}

function exportChildReportById(childId) {
    const child = children.find(c => c.id === childId);
    if (!child) return;
    const monthExp = getEffectiveMonthExpenses(currentDate).filter(e => e.type === child.id);
    if (monthExp.length === 0) { showToast(`Sem despesas de ${child.name} este mes`); return; }

    const splitExp = monthExp.filter(e => e.split);
    const total = monthExp.reduce((s, e) => s + (e.fullAmount || e.amount), 0);
    const splitTotal = splitExp.reduce((s, e) => s + (e.fullAmount || e.amount), 0);
    const coParentShare = splitTotal * (child.splitPct / 100);
    const coParentPaid = splitExp.filter(e => e.paidByFather).reduce((s, e) => s + (e.fullAmount || e.amount) * (child.splitPct / 100), 0);

    let report = `RELATORIO DE DESPESAS DE ${child.name.toUpperCase()}\n`;
    report += `${'='.repeat(45)}\n`;
    report += `Mes: ${getMonthLabel(currentDate)}\n`;
    report += `Data do relatorio: ${new Date().toLocaleDateString('pt-PT')}\n\n`;
    report += `RESUMO\n${'-'.repeat(45)}\n`;
    report += `Total despesas ${child.name}: ${formatCurrency(total)}\n`;
    report += `Despesas partilhadas: ${formatCurrency(splitTotal)}\n`;
    report += `Parte de ${child.coParentName} (${child.splitPct}%): ${formatCurrency(coParentShare)}\n`;
    report += `Ja pago: ${formatCurrency(coParentPaid)}\n`;
    report += `EM FALTA: ${formatCurrency(coParentShare - coParentPaid)}\n\n`;
    report += `DETALHE DAS DESPESAS\n${'-'.repeat(45)}\n`;
    monthExp.sort((a, b) => a.date.localeCompare(b.date)).forEach(e => {
        const attach = e.attachment ? ' [TEM FATURA]' : '';
        report += `${formatDate(e.date)} | ${e.description.padEnd(25)} | ${formatCurrency(e.fullAmount || e.amount).padStart(10)} | ${e.split ? `${child.splitPct}/${100-child.splitPct}` : 'N/A'} | ${e.paidByFather ? 'Pago' : 'Pendente'}${attach}\n`;
    });
    report += `\n${'='.repeat(45)}\nGerado pela app Despesas\n`;

    downloadFile(report, `${child.name.toLowerCase()}_${formatMonthFile(currentDate)}.txt`, 'text/plain');
    closeExportMenu();
    showToast(`Relatorio de ${child.name} exportado!`);
}

function generateFullReport() {
    const monthExp = getEffectiveMonthExpenses(currentDate);
    const monthInc = getEffectiveMonthIncomes(currentDate);
    const prevExp = getPrevMonthExpenses();
    const totalExpenses = monthExp.filter(expenseAffectsBalance).reduce((s, e) => s + e.amount, 0);
    const totalIncome = monthInc.reduce((s, e) => s + e.amount, 0);
    const prevTotal = prevExp.reduce((s, e) => s + e.amount, 0);
    const curr = groupByCategory(monthExp);
    const prev = groupByCategory(prevExp);
    const balance = totalIncome - totalExpenses;

    let report = `RELATORIO MENSAL DE DESPESAS\n`;
    report += `${'='.repeat(50)}\n`;
    report += `Mes: ${getMonthLabel(currentDate)}\n`;
    report += `Data: ${new Date().toLocaleDateString('pt-PT')}\n\n`;

    report += `1. BALANCO GERAL\n`;
    report += `${'-'.repeat(50)}\n`;
    report += `Total receitas: ${formatCurrency(totalIncome)}\n`;
    report += `Total despesas: ${formatCurrency(totalExpenses)}\n`;
    report += `SALDO: ${balance >= 0 ? '+' : ''}${formatCurrency(balance)}\n`;
    if (totalIncome > 0) {
        report += `Taxa de poupanca: ${((balance / totalIncome) * 100).toFixed(1)}%\n`;
        report += `Percentagem gasta: ${((totalExpenses / totalIncome) * 100).toFixed(1)}%\n`;
    }
    report += `\nReceitas:\n`;
    monthInc.forEach(e => {
        report += `  + ${formatDate(e.date)} | ${e.description.padEnd(20)} | ${formatCurrency(e.amount).padStart(10)}\n`;
    });

    report += `\n2. DESPESAS vs MES ANTERIOR\n`;
    report += `${'-'.repeat(50)}\n`;
    report += `Este mes: ${formatCurrency(totalExpenses)}\n`;
    report += `Mes anterior: ${formatCurrency(prevTotal)}\n`;
    const diff = totalExpenses - prevTotal;
    report += `Diferenca: ${diff > 0 ? '+' : ''}${formatCurrency(diff)} (${prevTotal > 0 ? ((diff / prevTotal) * 100).toFixed(1) : '0'}%)\n`;
    report += `Pessoal: ${formatCurrency(monthExp.filter(e => e.type === 'personal').reduce((s, e) => s + e.amount, 0))}\n`;
    children.forEach(c => {
        report += `${c.name}: ${formatCurrency(monthExp.filter(e => e.type === c.id).reduce((s, e) => s + e.amount, 0))}\n`;
    });
    report += `\n`;

    report += `3. GASTOS POR CATEGORIA\n`;
    report += `${'-'.repeat(50)}\n`;
    Object.entries(curr).sort((a, b) => b[1] - a[1]).forEach(([cat, val]) => {
        const pct = (val / totalExpenses * 100).toFixed(1);
        const prevVal = prev[cat] || 0;
        const catDiff = val - prevVal;
        report += `${(getEffectiveCategories()[cat]?.label || cat).padEnd(20)} ${formatCurrency(val).padStart(10)} (${pct}%) ${catDiff !== 0 ? (catDiff > 0 ? '+' : '') + formatCurrency(catDiff) : ''}\n`;
    });

    report += `\n4. GASTOS NAO ESSENCIAIS\n`;
    report += `${'-'.repeat(50)}\n`;
    const nonEssential = monthExp.filter(e => e.essential === false);
    if (nonEssential.length > 0) {
        const neTotal = nonEssential.reduce((s, e) => s + e.amount, 0);
        report += `Total nao essencial: ${formatCurrency(neTotal)} (${(neTotal / totalExpenses * 100).toFixed(1)}% do total)\n`;
        nonEssential.sort((a, b) => b.amount - a.amount).forEach(e => {
            report += `  - ${e.description}: ${formatCurrency(e.amount)} (${getEffectiveCategories()[e.category]?.label})\n`;
        });
        report += `\nPotencial de poupanca: ate ${formatCurrency(neTotal)}\n`;
    } else {
        report += `Nenhuma despesa marcada como nao essencial.\n`;
    }

    report += `\n5. TOP 10 MAIORES GASTOS\n`;
    report += `${'-'.repeat(50)}\n`;
    [...monthExp].sort((a, b) => b.amount - a.amount).slice(0, 10).forEach((e, i) => {
        const attach = e.attachment ? ' [FATURA]' : '';
        report += `${(i + 1).toString().padStart(2)}. ${e.description.padEnd(25)} ${formatCurrency(e.amount).padStart(10)} (${formatDate(e.date)})${attach}\n`;
    });

    report += `\n6. RECOMENDACOES\n`;
    report += `${'-'.repeat(50)}\n`;
    if (totalIncome > 0 && balance < totalIncome * 0.1) {
        report += `- Atencao: esta a poupar menos de 10% do rendimento.\n`;
    }
    if (diff > 0 && prevTotal > 0) {
        report += `- Os gastos aumentaram ${((diff / prevTotal) * 100).toFixed(0)}% em relacao ao mes anterior.\n`;
    }
    const restTotal = curr['restaurantes'] || 0;
    const superTotal = curr['supermercado'] || 0;
    if (restTotal > superTotal * 0.5 && restTotal > 0) {
        report += `- Restaurantes representam uma parte significativa. Considere cozinhar mais.\n`;
    }
    if (nonEssential.length > 0) {
        report += `- Reveja os ${nonEssential.length} gastos nao essenciais para possivel poupanca.\n`;
    }

    report += `\n${'='.repeat(50)}\n`;
    report += `Gerado pela app Despesas${getUserName() ? ' - ' + getUserName() : ''}\n`;

    downloadFile(report, `relatorio_${formatMonthFile(currentDate)}.txt`, 'text/plain');
    closeExportMenu();
    showToast('Relatorio completo gerado!');
}

// ===== DEMO MODE =====
// Builds a self-contained dataset that exercises the main features —
// children + co-parent split, fixed/variable expenses, prepaid card,
// savings goal, fixed incomes incl. one tagged as co-parent payment.
// Replaces ALL current data after a confirmation; users are warned to
// export first via showExportMenu.
function buildDemoDataset() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const today = now.getDate();
    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
    const id = () => Math.random().toString(36).slice(2, 11);
    // Format YYYY-MM-DD clamping the day to the month's last valid day.
    const dStrAt = (year, month, day) => {
        const last = new Date(year, month + 1, 0).getDate();
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`;
    };
    const dStr = (day) => dStrAt(y, m, day);
    // Walk back N full months from current and return [{y,m,monthKey}].
    const monthsBack = (n) => {
        const out = [];
        for (let i = n; i >= 0; i--) {
            const d = new Date(y, m - i, 1);
            out.push({
                y: d.getFullYear(),
                m: d.getMonth(),
                monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                isCurrent: i === 0
            });
        }
        return out;
    };
    // 6 prior months + current month = 7 months total of activity.
    const months = monthsBack(6);

    const childA = id();
    const childB = id();
    const cardId = id();
    const goalFeriasId = id();
    const goalCarroId = id();

    // Fictional Portuguese names so it doesn't look like personal data.
    const children = [
        { id: childA, name: 'Madalena', coParentName: 'Rui', splitPct: 50, hasSplit: true },
        { id: childB, name: 'Tomás', coParentName: 'Inês', splitPct: 50, hasSplit: true }
    ];

    const fId = {
        renda: id(), edp: id(), nos: id(), aguas: id(), gas: id(), gym: id(),
        escolaA: id(), atvB: id(), seguroAuto: id()
    };
    const fixedExpenses = [
        { id: fId.renda, description: 'Renda casa', amount: 650, dayOfMonth: 5, category: 'casa', type: 'personal', split: false, isVariable: false, startDate: '2024-01', endDate: null, notes: 'Senhorio: Sr. Antunes' },
        { id: fId.edp, description: 'EDP eletricidade', amount: 78, dayOfMonth: 12, category: 'casa', type: 'personal', split: false, isVariable: true, startDate: '2024-01', endDate: null },
        { id: fId.nos, description: 'NOS internet+TV', amount: 41.99, dayOfMonth: 8, category: 'casa', type: 'personal', split: false, isVariable: false, startDate: '2024-01', endDate: null },
        { id: fId.aguas, description: 'Águas de Cascais', amount: 23.5, dayOfMonth: 20, category: 'casa', type: 'personal', split: false, isVariable: true, startDate: '2024-01', endDate: null },
        { id: fId.gas, description: 'Galp Gás', amount: 31, dayOfMonth: 15, category: 'casa', type: 'personal', split: false, isVariable: true, startDate: '2024-01', endDate: null },
        { id: fId.gym, description: 'Ginásio Holmes Place', amount: 49.9, dayOfMonth: 1, category: 'lazer', type: 'personal', split: false, isVariable: false, startDate: '2024-06', endDate: null },
        { id: fId.escolaA, description: 'Escola Madalena', amount: 280, dayOfMonth: 5, category: 'educacao', type: childA, split: true, isVariable: false, startDate: '2024-09', endDate: null },
        { id: fId.atvB, description: 'Atividades Tomás', amount: 95, dayOfMonth: 5, category: 'educacao', type: childB, split: true, isVariable: false, startDate: '2024-09', endDate: null },
        { id: fId.seguroAuto, description: 'Seguro automóvel', amount: 38.5, dayOfMonth: 10, category: 'transportes', type: 'personal', split: false, isVariable: false, startDate: '2024-01', endDate: null }
    ];

    const incomeIds = { salario: id(), subsidio: id(), copagA: id() };
    const fixedIncomes = [
        { id: incomeIds.salario, description: 'Salário', amount: 2700, dayOfMonth: 22, paymentMode: 'working-day-after', category: 'ordenado', startDate: '2023-01', endDate: null, isVariable: false, onlyOnDay: false, manualMark: false },
        { id: incomeIds.subsidio, description: 'Subsídio Refeição', amount: 183, dayOfMonth: 22, paymentMode: 'working-day-after', category: 'subsidio_refeicao', startDate: '2023-01', endDate: null, isVariable: true, onlyOnDay: false, manualMark: false },
        { id: incomeIds.copagA, description: 'Pagamento Rui (Madalena)', amount: 25.5, dayOfMonth: 1, paymentMode: 'fixed-day', category: `pag_${childA}`, startDate: '2024-01', endDate: null, isVariable: false, onlyOnDay: true, manualMark: true, coParentChildId: childA }
    ];

    // Fixed status: mark all past months' fixed expenses as paid; current
    // month only those whose day already arrived. Same for fixed incomes
    // (recebido). For the co-parent income, mark recebido on every past
    // month (and current if day passed).
    const fixedStatus = [];
    const fixedIncomeStatus = [];
    months.forEach(({ y: yy, m: mm, monthKey: mk, isCurrent }) => {
        fixedExpenses.forEach(f => {
            if (f.startDate > mk) return;
            const dayHere = Math.min(f.dayOfMonth, new Date(yy, mm + 1, 0).getDate());
            const realized = !isCurrent || today >= dayHere;
            if (realized) {
                // Slight per-month variation for variable fixas
                const status = { fixedId: f.id, month: mk, status: 'pago', paidByFather: false };
                if (f.isVariable) {
                    const swing = ((mk.charCodeAt(5) + mk.charCodeAt(6)) % 11) - 5; // -5..+5
                    status.amount = Math.round((f.amount + swing) * 100) / 100;
                }
                fixedStatus.push(status);
            }
        });
        fixedIncomes.forEach(fi => {
            if (fi.startDate > mk) return;
            const dayHere = Math.min(fi.dayOfMonth, new Date(yy, mm + 1, 0).getDate());
            const realized = !isCurrent || today >= dayHere;
            if (realized) fixedIncomeStatus.push({ fixedIncomeId: fi.id, month: mk, status: 'recebido' });
        });
    });

    // Variable expenses across all months. Pattern repeats but with
    // jitter so each month feels real. Days picked to spread.
    const expenses = [];
    const supermercadoTemplates = ['Auchan', 'Mercadona', 'Pingo Doce', 'Continente', 'Lidl'];
    const restauranteTemplates = ['Honest Greens', 'Vitaminas', 'Café Versailles', 'Tasca da Esquina', 'A Cevicheria'];

    months.forEach(({ y: yy, m: mm, monthKey: mk, isCurrent }) => {
        const dHere = (day) => dStrAt(yy, mm, day);
        const monthHash = parseInt(mk.replace('-', ''), 10);
        const lastValidDay = isCurrent ? today : new Date(yy, mm + 1, 0).getDate();
        const okDay = (d) => d <= lastValidDay;

        // ---- Grouped expense: Mercado Mensal (4 weekly entries) ----
        const grpId = id();
        const grpEntries = [
            { date: dHere(3), amount: 47.85, notes: supermercadoTemplates[monthHash % 5] },
            { date: dHere(10), amount: 32.4, notes: supermercadoTemplates[(monthHash + 1) % 5] },
            { date: dHere(17), amount: 28.6, notes: supermercadoTemplates[(monthHash + 2) % 5] },
            { date: dHere(24), amount: 65.2, notes: supermercadoTemplates[(monthHash + 3) % 5] }
        ].filter(e => okDay(parseInt(e.date.slice(-2), 10)));
        if (grpEntries.length) {
            expenses.push({
                id: grpId,
                description: 'Mercado mensal',
                amount: grpEntries.reduce((s, e) => s + e.amount, 0),
                date: grpEntries[grpEntries.length - 1].date,
                category: 'supermercado',
                type: 'personal',
                essential: true,
                isGrouped: true,
                entries: grpEntries
            });
        }

        // Restaurantes: 2-3 per month
        if (okDay(6))  expenses.push({ id: id(), description: restauranteTemplates[monthHash % 5], amount: 12.5 + (monthHash % 7), date: dHere(6), category: 'restaurantes', type: 'personal', essential: false });
        if (okDay(14)) expenses.push({ id: id(), description: restauranteTemplates[(monthHash + 2) % 5], amount: 24.0 + (monthHash % 5), date: dHere(14), category: 'restaurantes', type: 'personal', essential: false });
        if (okDay(21)) expenses.push({ id: id(), description: 'Café com colegas', amount: 4.5, date: dHere(21), category: 'restaurantes', type: 'personal', essential: false });

        // Combustível: 2 per month
        if (okDay(7))  expenses.push({ id: id(), description: 'Galp combustível', amount: 55, date: dHere(7), category: 'combustivel', type: 'personal', essential: true });
        if (okDay(20)) expenses.push({ id: id(), description: 'Galp combustível', amount: 50, date: dHere(20), category: 'combustivel', type: 'personal', essential: true });

        // Saúde / farmácia
        if (okDay(11)) expenses.push({ id: id(), description: 'Farmácia Costa', amount: 18.3, date: dHere(11), category: 'farmacia', type: 'personal', essential: true });
        if (okDay(8))  expenses.push({ id: id(), description: 'Médico Madalena', amount: 35, date: dHere(8), category: 'saude', type: childA, split: true, paidByFather: monthHash % 2 === 0, essential: true });

        // Roupa filhos (esporádico)
        if (mm % 3 === 1 && okDay(13)) expenses.push({ id: id(), description: 'Sapatilhas Tomás', amount: 42.9, date: dHere(13), category: 'roupa', type: childB, split: true, paidByFather: false, essential: false });

        // Lazer
        if (okDay(18)) expenses.push({ id: id(), description: 'Cinema NOS', amount: 9.5, date: dHere(18), category: 'lazer', type: 'personal', essential: false });
    });

    // ---- Prepaid card "Via Verde" with topup + spends across months ----
    const prepaidTxs = [];
    months.forEach(({ y: yy, m: mm, isCurrent }) => {
        const dHere = (day) => dStrAt(yy, mm, day);
        const lastValidDay = isCurrent ? today : new Date(yy, mm + 1, 0).getDate();
        const okDay = (d) => d <= lastValidDay;
        if (!okDay(2)) return;
        // Top-up at start of month
        const topupTxId = id(); const topupExpenseId = id();
        prepaidTxs.push({ tx: { id: topupTxId, type: 'topup', amount: 50, description: 'Carregamento Via Verde', date: dHere(2), expenseId: topupExpenseId } });
        expenses.push({ id: topupExpenseId, description: 'Carregamento Via Verde', amount: 50, date: dHere(2), category: 'transportes', type: 'personal', essential: true, isPrepaidTopup: true, prepaidCardId: cardId, prepaidTxId: topupTxId });
        // Spends
        const spends = [
            { day: 5, amount: 4.85, description: 'Portagem A5' },
            { day: 12, amount: 8.7, description: 'Portagem A1' },
            { day: 17, amount: 3.2, description: 'Estacionamento EMEL' },
            { day: 23, amount: 4.85, description: 'Portagem A5' }
        ].filter(s => okDay(s.day));
        spends.forEach(s => {
            const txId = id(); const expId = id();
            prepaidTxs.push({ tx: { id: txId, type: 'spend', amount: s.amount, description: s.description, date: dHere(s.day), expenseId: expId } });
            expenses.push({ id: expId, description: s.description, amount: s.amount, date: dHere(s.day), category: 'transportes', type: 'personal', essential: true, prepaidCardId: cardId, prepaidTxId: txId });
        });
    });
    const prepaidCards = [{
        id: cardId,
        name: 'Via Verde',
        color: '#FF6F00',
        icon: 'fa-road',
        transactions: prepaidTxs.map(p => p.tx)
    }];

    // ---- Savings goals: Férias + Carro Novo with monthly add txs ----
    const goalsTxsForMonth = (goalId, perMonth) =>
        months.map(({ monthKey: mk }, i) => ({
            id: id(),
            type: 'add',
            amount: perMonth,
            date: `${mk}-25`,
            note: 'Reforço mensal'
        }));
    const savingsGoals = [
        {
            id: goalFeriasId,
            name: 'Férias Verão',
            target: 2000,
            deadline: `${y}-08-31`,
            icon: 'fa-umbrella-beach',
            color: '#00BCD4',
            transactions: goalsTxsForMonth(goalFeriasId, 200),
            createdAt: `${months[0].monthKey}-01T00:00:00.000Z`
        },
        {
            id: goalCarroId,
            name: 'Fundo de emergência',
            target: 5000,
            deadline: `${y + 1}-12-31`,
            icon: 'fa-shield-halved',
            color: '#9C27B0',
            transactions: goalsTxsForMonth(goalCarroId, 100),
            createdAt: `${months[0].monthKey}-01T00:00:00.000Z`
        }
    ];

    // ---- Net worth: realistic assets/liabilities ----
    const netWorth = {
        assets: [
            { name: 'Conta à ordem (BPI)', amount: 4200 },
            { name: 'Depósito a prazo', amount: 12000 },
            { name: 'Carro (valor estimado)', amount: 8500 },
            { name: 'PPR Allianz', amount: 6300 }
        ],
        liabilities: [
            { name: 'Crédito habitação', amount: 78000 },
            { name: 'Cartão crédito (saldo)', amount: 420 }
        ],
        updatedAt: new Date().toISOString()
    };

    return {
        expenses, incomes: [], fixedExpenses, fixedIncomes,
        fixedStatus, fixedIncomeStatus, children, prepaidCards, savingsGoals, netWorth
    };
}

function loadDemoData() {
    if (!confirm('⚠️ Isto SUBSTITUI todos os dados actuais por dados fictícios de demonstração.\n\nGuardaste o teu backup (botão exportar) antes? Continuar?')) return;
    const demo = buildDemoDataset();
    expenses = demo.expenses;
    incomes = demo.incomes;
    fixedExpenses = demo.fixedExpenses;
    fixedIncomes = demo.fixedIncomes;
    fixedStatus = demo.fixedStatus;
    fixedIncomeStatus = demo.fixedIncomeStatus;
    children = demo.children;
    prepaidCards = demo.prepaidCards;
    savingsGoals = demo.savingsGoals;
    netWorth = demo.netWorth;
    // Switch to separated mode so the co-parent split features are visible.
    localStorage.setItem(HOUSEHOLD_MODE_KEY, 'separated');
    localStorage.setItem(USER_NAME_KEY, 'Demo');
    saveData();
    closeSettingsModal();
    updateAll();
    showToast('Demo carregada — explora as várias tabs');
}

function wipeAllData() {
    if (!confirm('⚠️ Apagar TODOS os dados (despesas, receitas, fixas, cartões, poupanças, filhos, património)?\n\nIsto não tem volta. Exporta primeiro se ainda precisas dos dados.')) return;
    if (!confirm('Última confirmação: vais perder tudo. Continuar?')) return;
    expenses = [];
    incomes = [];
    fixedExpenses = [];
    fixedIncomes = [];
    fixedStatus = [];
    fixedIncomeStatus = [];
    children = [];
    prepaidCards = [];
    savingsGoals = [];
    netWorth = { assets: [], liabilities: [], updatedAt: null };
    saveData();
    closeSettingsModal();
    updateAll();
    showToast('Todos os dados foram apagados');
}

// ===== IMPORT =====
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            if (file.name.endsWith('.json')) {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data)) {
                    // Very old format (just expenses array)
                    expenses = data;
                } else if (data.expenses) {
                    // Backup with data
                    expenses = data.expenses || [];
                    incomes = data.incomes || [];
                    // v2 format: full backup
                    if (data.fixedExpenses) fixedExpenses = data.fixedExpenses;
                    if (data.fixedStatus) fixedStatus = data.fixedStatus;
                    if (data.fixedIncomes) fixedIncomes = data.fixedIncomes;
                    if (data.fixedIncomeStatus) fixedIncomeStatus = data.fixedIncomeStatus;
                    if (data.children) children = data.children;
                    if (data.customCategories) customCategories = data.customCategories;
                    if (data.customIncCategories) customIncCategories = data.customIncCategories;
                    if (data.expenseTemplates) expenseTemplates = data.expenseTemplates;
                    if (data.categoryBudgets) categoryBudgets = data.categoryBudgets;
                    if (data.settings) {
                        const s = data.settings;
                        if (s.userName) localStorage.setItem(USER_NAME_KEY, s.userName);
                        if (s.appTitle) localStorage.setItem(APP_TITLE_KEY, s.appTitle);
                        if (s.householdMode) localStorage.setItem(HOUSEHOLD_MODE_KEY, s.householdMode);
                        if (s.spouseName) localStorage.setItem(SPOUSE_NAME_KEY, s.spouseName);
                        if (s.spousePct != null) localStorage.setItem(SPOUSE_PCT_KEY, String(s.spousePct));
                    }
                }
                saveData();
                applyAppTitle();
                applyHouseholdMode();
                populateExpenseTypeOptions();
                populateFixedTypeOptions();
                populateFilterTypes();
                populateCategorySelects();
                updateAll();
                showToast('Backup importado!');
            } else if (file.name.endsWith('.csv')) {
                importCSV(e.target.result);
            }
        } catch (err) {
            showToast('Erro ao importar ficheiro');
            console.error(err);
        }
        closeImportDialog();
    };
    reader.readAsText(file);
    event.target.value = '';
}

function importCSV(content) {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) { showToast('CSV vazio'); return; }

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(';').map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length < 4) continue;

        const dateParts = cols[0].split('/');
        const dateStr = dateParts.length === 3
            ? `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`
            : cols[0];

        const categoryKey = Object.entries(CATEGORIES).find(([, v]) => v.label.toLowerCase() === cols[2].toLowerCase())?.[0] || 'outros';

        expenses.push({
            id: generateId(),
            description: cols[1],
            amount: parseFloat(cols[3].replace(',', '.')),
            date: dateStr,
            category: categoryKey,
            type: (cols[4] || '').toLowerCase() === 'laura' ? 'laura' : 'personal',
            split: (cols[5] || '').toLowerCase() === 'sim',
            essential: (cols[6] || 'sim').toLowerCase() !== 'nao',
            notes: cols[8] || cols[7] || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        imported++;
    }

    saveData();
    updateAll();
    showToast(`${imported} despesas importadas do CSV!`);
}

// ===== FILTER =====
function populateFilterCategories() {
    const select = document.getElementById('filter-category');
    if (!select) return;
    const existing = select.querySelectorAll('option:not(:first-child)');
    existing.forEach(o => o.remove());
    Object.entries(CATEGORIES).forEach(([key, val]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = val.label;
        select.appendChild(opt);
    });
}

// ===== SETTINGS MODAL =====
function renderTemplateList() {
    const container = document.getElementById('template-list');
    if (!container) return;
    const cats = getEffectiveCategories();
    container.innerHTML = expenseTemplates.length === 0
        ? '<div class="empty-state" style="padding:16px"><p>Sem despesas frequentes. Adicione uma ou clique <i class="fas fa-star"></i> numa despesa existente.</p></div>'
        : expenseTemplates.map(t => {
            const cat = cats[t.category] || {};
            return `<div class="fixed-item">
                <div style="display:flex;align-items:center;gap:10px;flex:1">
                    <i class="fas ${cat.icon || 'fa-receipt'}" style="color:${cat.color || 'var(--primary)'}"></i>
                    <div>
                        <div style="font-weight:600;font-size:0.85rem">${t.description}</div>
                        <div style="font-size:0.72rem;color:var(--text-light)">${cat.label || t.category} &middot; ${formatCurrency(t.amount)}</div>
                    </div>
                </div>
                <button onclick="deleteTemplate('${t.id}')" class="btn-icon" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
            </div>`;
        }).join('');
}

function renderBudgetList() {
    const container = document.getElementById('budget-list');
    if (!container) return;
    const cats = getEffectiveCategories();
    container.innerHTML = Object.entries(cats).filter(([k]) => k !== 'transicao').map(([key, cat]) => {
        const budget = categoryBudgets[key] || '';
        return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
            <i class="fas ${cat.icon}" style="color:${cat.color || 'var(--primary)'};width:20px;text-align:center"></i>
            <span style="flex:1;font-size:0.85rem;font-weight:500">${cat.label}</span>
            <input type="number" value="${budget}" placeholder="--" min="0" step="1"
                onchange="setCategoryBudget('${key}', this.value)"
                style="width:80px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;text-align:right">
            <span style="font-size:0.75rem;color:var(--text-light)">EUR</span>
        </div>`;
    }).join('');
}

function setCategoryBudget(category, value) {
    const amount = parseFloat(value);
    if (!value || isNaN(amount) || amount <= 0) {
        delete categoryBudgets[category];
    } else {
        categoryBudgets[category] = amount;
    }
    saveData();
}

function showSettingsModal() {
    renderChildrenList();
    renderCatList('expense');
    renderCatList('income');
    renderTemplateList();
    renderBudgetList();
    renderSecuritySettingsUI();
    populateCategorySelects();
    document.getElementById('profile-name').value = getUserName();
    document.getElementById('profile-title').value = getAppTitle();
    const nifEl = document.getElementById('profile-nif');
    if (nifEl) nifEl.value = getUserNif();
    const modeRadio = document.querySelector(`input[name="household-mode"][value="${getHouseholdMode()}"]`);
    if (modeRadio) modeRadio.checked = true;
    const spouseNameEl = document.getElementById('profile-spouse-name');
    const spousePctEl = document.getElementById('profile-spouse-pct');
    if (spouseNameEl) spouseNameEl.value = localStorage.getItem(SPOUSE_NAME_KEY) || '';
    if (spousePctEl) spousePctEl.value = getSpousePct();
    const partnerNameEl = document.getElementById('profile-partner-name');
    const partnerPctEl = document.getElementById('profile-partner-pct');
    if (partnerNameEl) partnerNameEl.value = getPartnerName();
    if (partnerPctEl) partnerPctEl.value = getPartnerPct();
    // Live-update spouse/partner settings visibility when mode changes (before Guardar)
    toggleSpouseSettingsUI();
    document.querySelectorAll('input[name="household-mode"]').forEach(r => {
        r.onchange = toggleSpouseSettingsUI;
    });
}

function toggleSpouseSettingsUI() {
    const mode = document.querySelector('input[name="household-mode"]:checked')?.value;
    const spouseGrp = document.getElementById('spouse-settings');
    if (spouseGrp) spouseGrp.style.display = mode === 'married' ? 'block' : 'none';
    const partnerGrp = document.getElementById('partner-settings');
    if (partnerGrp) partnerGrp.style.display = mode === 'separated' ? 'block' : 'none';
    document.getElementById('modal-settings').classList.add('active');
}

// The dedicated fixed-expense and fixed-income manager modals were
// removed once the dashboard rows got their own edit/duplicate/delete
// actions and the headers got "+ Nova" chips. The functions are kept
// as compatibility shims that route to showAddFixed/showAddFixedIncome
// so any legacy onclick="openFixedManagerModal()" still does something
// sensible (open the add form).
function openFixedManagerModal() { showAddFixed(); }
function closeFixedManagerModal() { /* modal removed */ }
function openFixedIncomeManagerModal() { showAddFixedIncome(); }
function closeFixedIncomeManagerModal() { /* modal removed */ }

function saveProfileName() {
    const name = document.getElementById('profile-name').value.trim();
    const title = document.getElementById('profile-title').value.trim();
    const mode = document.querySelector('input[name="household-mode"]:checked')?.value || 'separated';
    if (!name) { showToast('Introduza um nome'); return; }
    localStorage.setItem(USER_NAME_KEY, name);
    if (title) localStorage.setItem(APP_TITLE_KEY, title);
    localStorage.setItem(HOUSEHOLD_MODE_KEY, mode);
    // Persist the user's NIF for the IRS tracker and e-fatura matching.
    const nifEl = document.getElementById('profile-nif');
    if (nifEl) {
        const nif = (nifEl.value || '').replace(/\D+/g, '');
        if (nif === '' || /^\d{9}$/.test(nif)) {
            localStorage.setItem(USER_NIF_KEY, nif);
        } else {
            showToast('NIF deve ter 9 dígitos (ignorado)');
        }
    }
    // Spouse settings (only relevant in married mode but save anyway)
    const spouseName = document.getElementById('profile-spouse-name')?.value.trim();
    const spousePct = parseInt(document.getElementById('profile-spouse-pct')?.value);
    if (spouseName) localStorage.setItem(SPOUSE_NAME_KEY, spouseName);
    if (!isNaN(spousePct)) localStorage.setItem(SPOUSE_PCT_KEY, String(spousePct));
    // Partner settings (separated mode shortcut)
    const partnerName = document.getElementById('profile-partner-name')?.value.trim();
    const partnerPct = parseInt(document.getElementById('profile-partner-pct')?.value);
    if (partnerName !== undefined) {
        if (partnerName) localStorage.setItem(PARTNER_NAME_KEY, partnerName);
        else localStorage.removeItem(PARTNER_NAME_KEY);
    }
    if (!isNaN(partnerPct)) localStorage.setItem(PARTNER_PCT_KEY, String(partnerPct));
    // Salary day + mode
    const sdInput = document.getElementById('profile-salary-day');
    if (sdInput) {
        const sd = parseInt(sdInput.value);
        salaryDay = (sd >= 1 && sd <= 31) ? sd : null;
        if (salaryDay) localStorage.setItem('vanessa_salary_day', salaryDay);
        else localStorage.removeItem('vanessa_salary_day');
    }
    const smode = document.querySelector('input[name="salary-mode"]:checked')?.value;
    if (smode) {
        salaryMode = smode;
        localStorage.setItem('vanessa_salary_mode', salaryMode);
    }
    applyAppTitle();
    applyHouseholdMode();
    updateAll();
    showToast('Perfil atualizado!');
}

// Unregister service workers and wipe caches so the next load fetches fresh
// assets from the network. localStorage (user data) is untouched.
async function forceAppUpdate() {
    if (!confirm('Limpar cache e recarregar? Os dados (despesas, receitas, definições) NÃO são apagados.')) return;
    try {
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
        }
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
        }
    } catch (e) {
        console.error('forceAppUpdate failed', e);
    }
    window.location.reload();
}

function applyHouseholdMode() {
    const married = isMarriedMode();
    document.body.classList.toggle('mode-married', married);
}
function closeSettingsModal() { document.getElementById('modal-settings').classList.remove('active'); }

function switchSettingsTab(tab) {
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.settings-tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-stab="${tab}"]`).classList.add('active');
    document.getElementById(`stab-${tab}`).classList.add('active');
    if (tab === 'ai') renderAiSettingsUI();
    if (tab === 'profile') {
        const nameEl = document.getElementById('profile-name');
        if (nameEl) nameEl.value = getUserName();
        const titleEl = document.getElementById('profile-title');
        if (titleEl) titleEl.value = getAppTitle();
        const modeEl = document.querySelector(`input[name="household-mode"][value="${getHouseholdMode()}"]`);
        if (modeEl) modeEl.checked = true;
        const sdEl = document.getElementById('profile-salary-day');
        if (sdEl && salaryDay) sdEl.value = salaryDay;
        const smEl = document.querySelector(`input[name="salary-mode"][value="${salaryMode || 'fixed-day'}"]`);
        if (smEl) smEl.checked = true;
        updateSalaryDayInputVisibility();
    }
}

// Enables/disables the day-of-month input depending on the picked salary mode.
// "last-working-day" doesn't need a day.
function updateSalaryDayInputVisibility() {
    const mode = document.querySelector('input[name="salary-mode"]:checked')?.value || salaryMode || 'fixed-day';
    const dayWrap = document.getElementById('salary-day-wrap');
    if (dayWrap) dayWrap.style.display = (mode === 'last-working-day') ? 'none' : '';
    const hint = document.getElementById('salary-day-hint');
    if (hint) {
        hint.textContent = mode === 'working-day-after'
            ? 'Dia de referência — o salário é considerado pago no 1.º dia útil igual ou após este dia.'
            : mode === 'last-working-day'
            ? 'O salário é considerado pago no último dia útil (seg-sex) de cada mês.'
            : 'Define o início do ciclo orçamental entre salários. Deixar vazio para usar meses normais.';
    }
}

// ===== FIXED EXPENSES MANAGEMENT =====
function renderFixedList() {
    const container = document.getElementById('fixed-list');
    if (fixedExpenses.length === 0) {
        container.innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);margin-top:12px">Nenhuma despesa fixa configurada.</p>';
        return;
    }
    const cats = getEffectiveCategories();
    container.innerHTML = fixedExpenses.map(f => {
        const cat = cats[f.category] || cats.outros;
        const endLabel = f.endDate ? ` ate ${f.endDate}` : '';
        const child = children.find(c => c.id === f.type);
        const varBadge = f.isVariable ? '<span style="font-size:0.65rem;color:var(--primary);background:#EDE7F6;padding:1px 5px;border-radius:4px;margin-left:4px">variavel</span>' : '';
        const splitBadge = (f.split && child) ? `<span style="font-size:0.65rem;color:var(--success);background:#E8F5E9;padding:1px 5px;border-radius:4px;margin-left:4px">÷${f.split ? child.splitPct+'%' : ''}</span>` : '';
        const fixedSplits = Array.isArray(f.splits) ? f.splits : [];
        const splitsBadge = fixedSplits.length
            ? `<span style="font-size:0.65rem;color:#fff;background:var(--primary);padding:1px 5px;border-radius:4px;margin-left:4px" title="${fixedSplits.map(s => `${s.name}: ${formatCurrency(s.amount)}`).join(' · ')}"><i class="fas fa-user-group"></i> ${fixedSplits.length}</span>`
            : '';
        const typeLabel = child ? child.name : 'Pessoal';
        // Compact two-line layout: top row is icon + desc/meta + amount,
        // bottom row is a small toolbar with editar/duplicar/apagar. Buttons
        // are intentionally short (5×9 padding) so they don't dominate the
        // row vertically the way the previous chunky 1-line buttons did.
        return `
            <div class="fixed-item" style="flex-wrap:wrap;padding:10px 12px;gap:8px">
                <div class="fixed-icon" style="width:34px;height:34px"><i class="fas ${cat.icon}"></i></div>
                <div class="fixed-info" style="flex:1;min-width:0">
                    <div class="fixed-desc" style="font-size:0.88rem">${f.description}${varBadge}${splitBadge}${splitsBadge}</div>
                    <div class="fixed-meta" style="font-size:0.7rem">Dia ${f.dayOfMonth} &middot; ${typeLabel}${endLabel ? ` &middot; desde ${f.startDate}${endLabel}` : ` &middot; desde ${f.startDate}`}</div>
                </div>
                <div class="fixed-amount" style="font-size:0.95rem;font-weight:700;white-space:nowrap">${formatCurrency(f.amount)}</div>
                <div style="flex-basis:100%;display:flex;gap:5px;justify-content:flex-end">
                    <button onclick="editFixed('${f.id}')" class="btn-icon" style="background:#EDE7F6;color:var(--primary);border:1px solid rgba(108,92,231,0.25);padding:5px 12px;font-size:0.75rem;border-radius:6px;font-weight:600;display:inline-flex;align-items:center;gap:4px"><i class="fas fa-pen"></i> Editar</button>
                    <button onclick="duplicateFixed('${f.id}')" class="btn-icon" style="background:#FFF3E0;color:#E65100;border:1px solid #FFCC80;padding:5px 9px;font-size:0.75rem;border-radius:6px" title="Duplicar"><i class="fas fa-copy"></i></button>
                    <button onclick="confirmDeleteFixed('${f.id}')" class="btn-icon" style="background:#FFEBEE;color:#C62828;border:1px solid #FFCDD2;padding:5px 9px;font-size:0.75rem;border-radius:6px" title="Apagar"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

function showAddFixed() {
    document.getElementById('fixed-modal-title').textContent = 'Nova Despesa Fixa';
    document.getElementById('fixed-id').value = '';
    populateCategorySelects();
    populateFixedTypeOptions();
    document.getElementById('fixed-form').reset();
    const now = new Date();
    document.getElementById('fixed-start').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('fixed-split-group').style.display = 'none';
    const fOvCb = document.getElementById('fixed-split-pct-override-on');
    const fOvFields = document.getElementById('fixed-split-pct-override-fields');
    const fOvInput = document.getElementById('fixed-split-pct-override');
    if (fOvCb) fOvCb.checked = false;
    if (fOvFields) fOvFields.style.display = 'none';
    if (fOvInput) fOvInput.value = '';
    populateFixedSplitsUI(null);
    updateFixedMixPartnerUI(null);
    populateSplitWithNamesList();
    document.getElementById('fixed-modal').classList.add('active');
}

function editFixed(id) {
    const f = fixedExpenses.find(x => x.id === id);
    if (!f) return;
    document.getElementById('fixed-modal-title').textContent = 'Editar Despesa Fixa';
    document.getElementById('fixed-id').value = f.id;
    document.getElementById('fixed-desc').value = f.description;
    document.getElementById('fixed-amount').value = f.amount;
    document.getElementById('fixed-day').value = f.dayOfMonth;
    document.getElementById('fixed-start').value = f.startDate;
    document.getElementById('fixed-end').value = f.endDate || '';
    document.getElementById('fixed-notes').value = f.notes || '';
    document.getElementById('fixed-is-variable').checked = f.isVariable || false;
    populateCategorySelects();
    populateFixedTypeOptions();
    document.getElementById('fixed-category').value = f.category;
    const ftype = f.type || 'personal';
    const fixedTypeEl = document.querySelector(`input[name="fixed-type"][value="${ftype}"]`);
    if (fixedTypeEl) fixedTypeEl.checked = true;
    // Show split group if type is a child
    const isChild = children.some(c => c.id === ftype);
    const splitGroup = document.getElementById('fixed-split-group');
    if (splitGroup) splitGroup.style.display = isChild ? 'block' : 'none';
    if (isChild && f.split !== undefined) {
        document.querySelector(`input[name="fixed-split"][value="${f.split ? 'yes' : 'no'}"]`).checked = true;
    }
    // Restore the per-fixed-expense override toggle/value.
    const fOvCb = document.getElementById('fixed-split-pct-override-on');
    const fOvFields = document.getElementById('fixed-split-pct-override-fields');
    const fOvInput = document.getElementById('fixed-split-pct-override');
    const fOvName = document.getElementById('fixed-split-pct-override-name');
    const editFchild = children.find(c => c.id === ftype);
    if (editFchild) {
        const pctOv = parseFloat(f.splitPctOverride);
        const hasOv = !isNaN(pctOv) && pctOv > 0 && pctOv < 100;
        if (fOvCb) fOvCb.checked = hasOv;
        if (fOvInput) fOvInput.value = hasOv ? pctOv : (editFchild.splitPct || 50);
        if (fOvFields) fOvFields.style.display = hasOv ? 'block' : 'none';
        if (fOvName) fOvName.textContent = editFchild.coParentName || 'co-progenitor';
    } else {
        if (fOvCb) fOvCb.checked = false;
        if (fOvFields) fOvFields.style.display = 'none';
        if (fOvInput) fOvInput.value = '';
    }
    populateFixedSplitsUI(f);
    updateFixedMixPartnerUI(f);
    populateSplitWithNamesList();
    document.getElementById('fixed-modal').classList.add('active');
}

function saveFixed(event) {
    event.preventDefault();
    const id = document.getElementById('fixed-id').value;
    const ftype = document.querySelector('input[name="fixed-type"]:checked').value;
    const isChild = children.some(c => c.id === ftype);
    const splitOtherOn = document.getElementById('fixed-split-other')?.checked;
    const fixedSplits = splitOtherOn ? collectFixedSplitsFromModal() : [];
    const partnerName = getPartnerName();
    const mixPartnerOn = !isMarriedMode() && partnerName
        && !!document.getElementById('fixed-mix-with-partner')?.checked;
    const mixPartnerPct = mixPartnerOn
        ? (parseFloat(document.getElementById('fixed-mix-partner-pct')?.value) || 0)
        : 0;
    // Attribution implies "spent with" (tag). "Dividir" adds the debt layer,
    // with per-month reimbursement tracked on fixedStatus.mixPartnerPaid.
    const mixPartnerSpentOn = mixPartnerOn;
    const mixPartnerSplitOn = mixPartnerOn && !!document.getElementById('fixed-mix-partner-split')?.checked;
    const fSplit = isChild ? (document.querySelector('input[name="fixed-split"]:checked')?.value === 'yes') : false;
    const fOvOn = !!document.getElementById('fixed-split-pct-override-on')?.checked;
    const fOvRaw = parseFloat(document.getElementById('fixed-split-pct-override')?.value);
    const fSplitPctOverride = (fSplit && fOvOn && !isNaN(fOvRaw) && fOvRaw > 0 && fOvRaw <= 100)
        ? fOvRaw
        : null;
    const fixed = {
        id: id || generateId(),
        description: document.getElementById('fixed-desc').value.trim(),
        amount: parseFloat(document.getElementById('fixed-amount').value),
        dayOfMonth: parseInt(document.getElementById('fixed-day').value),
        category: document.getElementById('fixed-category').value,
        type: ftype,
        split: fSplit,
        splitPctOverride: fSplitPctOverride,
        isVariable: document.getElementById('fixed-is-variable').checked,
        startDate: document.getElementById('fixed-start').value,
        endDate: document.getElementById('fixed-end').value || null,
        notes: document.getElementById('fixed-notes').value.trim(),
        splits: fixedSplits,
        mixPartnerPct: mixPartnerOn && mixPartnerPct > 0 && mixPartnerPct < 100 ? mixPartnerPct : null,
        mixPartnerName: mixPartnerOn && mixPartnerPct > 0 && mixPartnerPct < 100 ? partnerName : null,
        mixPartnerSpent: mixPartnerSpentOn,
        mixPartnerSplit: mixPartnerSplitOn,
        updatedAt: new Date().toISOString()
    };
    if (id) {
        const idx = fixedExpenses.findIndex(f => f.id === id);
        const currentMonthKey = getFixedMonthKey(new Date());
        const prevDate = new Date(); prevDate.setDate(1); prevDate.setMonth(prevDate.getMonth() - 1);
        const prevMonthKey = getFixedMonthKey(prevDate);
        const existing = idx >= 0 ? fixedExpenses[idx] : null;
        if (existing && existing.startDate < currentMonthKey) {
            // Has past data: end the old record and create a new version from current month
            fixedExpenses[idx].endDate = prevMonthKey;
            const newFixed = { ...fixed, id: generateId(), startDate: currentMonthKey, createdAt: new Date().toISOString() };
            fixedExpenses.push(newFixed);
            showToast('Nova versao criada a partir deste mes');
        } else {
            // No past history: edit in place
            if (idx >= 0) { fixed.createdAt = fixedExpenses[idx].createdAt; fixedExpenses[idx] = fixed; }
            showToast('Despesa fixa atualizada!');
        }
    } else {
        fixed.createdAt = new Date().toISOString();
        fixedExpenses.push(fixed);
        showToast('Despesa fixa criada!');
    }
    saveData();
    closeFixedModal();
    renderFixedList();
    // If this was promoted from a pending AI-detected expense, drop it from the pending list.
    if (window._pendingPromotedToFixed) {
        pendingExpenses = pendingExpenses.filter(x => x.id !== window._pendingPromotedToFixed);
        localStorage.setItem(PENDING_KEY, JSON.stringify(pendingExpenses));
        window._pendingPromotedToFixed = null;
        renderPendingExpenses();
    }
    // Promoted from an existing variable expense: offer to remove the one-off
    // so the user doesn't double-count the bill once the fixed fires this month.
    if (window._expensePromotedToFixedSourceId) {
        const srcId = window._expensePromotedToFixedSourceId;
        window._expensePromotedToFixedSourceId = null;
        const src = expenses.find(x => x.id === srcId);
        if (src && confirm(`Apagar a despesa variável original (${src.description} — ${formatCurrency(src.amount)})? A fixa já vai substituí-la a partir deste mês.`)) {
            expenses = expenses.filter(x => x.id !== srcId);
            saveData();
        }
    }
    updateAll();
}

function setupFixedTypeToggle() {
    document.querySelectorAll('input[name="fixed-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const child = children.find(c => c.id === e.target.value);
            const canSplit = child && child.hasSplit !== false;
            const splitGroup = document.getElementById('fixed-split-group');
            if (splitGroup) splitGroup.style.display = canSplit ? 'block' : 'none';
        });
    });
}

function confirmDeleteFixed(id) {
    const f = fixedExpenses.find(x => x.id === id);
    if (!f) return;
    const currentMonthKey = getFixedMonthKey(new Date());
    const prevDate = new Date(); prevDate.setDate(1); prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonthKey = getFixedMonthKey(prevDate);
    const hasPastData = f.startDate < currentMonthKey;
    const confirmBtn = document.getElementById('confirm-btn');
    const msgEl = document.getElementById('confirm-message');

    // Shared post-mutation refresh. Defer one frame so the modal animation
    // doesn't visually fight the DOM swap (was the source of "só desaparece
    // depois de sair e voltar" — sometimes the manager modal still showed
    // the deleted row because the innerHTML write happened before the close).
    const refresh = () => {
        try { renderFixedList(); } catch (err) { console.warn('renderFixedList failed', err); }
        try { updateAll(); } catch (err) { console.warn('updateAll failed', err); }
        requestAnimationFrame(() => {
            try { renderFixedList(); } catch {}
            try { renderExpenses(); } catch {}
        });
    };

    if (hasPastData) {
        // Two real choices: keep history (deactivate) or wipe everything.
        // Render a richer message with two action buttons inline so the user
        // sees both options at a glance and the previous "Desativar" button
        // doesn't masquerade as a delete.
        msgEl.innerHTML = `
            <strong>"${f.description}"</strong> tem registos em meses anteriores.<br><br>
            <button id="confirm-deactivate-btn" class="btn btn-secondary" style="width:100%;margin-bottom:8px">
                <i class="fas fa-pause"></i> Desativar (manter histórico)
            </button>
            <button id="confirm-hard-delete-btn" class="btn btn-danger" style="width:100%">
                <i class="fas fa-trash"></i> Apagar tudo (incluindo histórico)
            </button>
        `;
        confirmBtn.style.display = 'none';
        // Attach the inline-button handlers right after we paint them.
        requestAnimationFrame(() => {
            const dBtn = document.getElementById('confirm-deactivate-btn');
            const hBtn = document.getElementById('confirm-hard-delete-btn');
            if (dBtn) dBtn.onclick = () => {
                const idx = fixedExpenses.findIndex(x => x.id === id);
                if (idx >= 0) fixedExpenses[idx].endDate = prevMonthKey;
                saveData();
                closeConfirm();
                confirmBtn.style.display = '';
                refresh();
                showToast('Despesa fixa desativada');
            };
            if (hBtn) hBtn.onclick = () => {
                fixedExpenses = fixedExpenses.filter(x => x.id !== id);
                fixedStatus = fixedStatus.filter(s => s.fixedId !== id);
                saveData();
                closeConfirm();
                confirmBtn.style.display = '';
                refresh();
                showToast('Despesa fixa removida (histórico incluído)');
            };
        });
    } else {
        msgEl.textContent = `Apagar despesa fixa "${f.description}"? Não afeta despesas já registadas.`;
        confirmBtn.style.display = '';
        confirmBtn.textContent = 'Apagar';
        confirmBtn.onclick = () => {
            fixedExpenses = fixedExpenses.filter(x => x.id !== id);
            fixedStatus = fixedStatus.filter(s => s.fixedId !== id);
            saveData();
            closeConfirm();
            refresh();
            showToast('Despesa fixa removida');
        };
    }
    document.getElementById('modal-confirm').classList.add('active');
}

function closeFixedModal() {
    document.getElementById('fixed-modal').classList.remove('active');
    // Drop any pending-promotion marker so a cancel doesn't silently hit the next save.
    window._pendingPromotedToFixed = null;
}

// ===== FIXED INCOME MANAGEMENT =====
function renderFixedIncomeList() {
    const container = document.getElementById('fixed-income-list-settings');
    if (!container) return;
    if (fixedIncomes.length === 0) {
        container.innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);margin-top:12px">Nenhuma receita fixa configurada.</p>';
        return;
    }
    const incCats = getEffectiveIncomeCategories();
    container.innerHTML = fixedIncomes.map(fi => {
        const cat = incCats[fi.category] || incCats.outros_receita;
        const endLabel = fi.endDate ? ` ate ${fi.endDate}` : '';
        return `
            <div class="fixed-item">
                <div class="fixed-icon" style="background:#E8F5E9;color:#2E7D32"><i class="fas ${cat.icon || 'fa-coins'}"></i></div>
                <div class="fixed-info">
                    <div class="fixed-desc">${fi.description}</div>
                    <div class="fixed-meta">Dia ${fi.dayOfMonth} &middot; desde ${fi.startDate}${endLabel}</div>
                </div>
                <div class="fixed-amount" style="color:var(--success)">+${formatCurrency(fi.amount)}</div>
                <div class="expense-actions">
                    <button class="btn-icon" onclick="editFixedIncome('${fi.id}')" style="color:var(--primary)"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon" onclick="duplicateFixedIncome('${fi.id}')" title="Duplicar"><i class="fas fa-copy"></i></button>
                    <button class="btn-icon" onclick="confirmDeleteFixedIncome('${fi.id}')" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

function showAddFixedIncome() {
    document.getElementById('fixed-income-modal-title').textContent = 'Nova Receita Fixa';
    document.getElementById('fixed-income-id').value = '';
    populateCategorySelects();
    document.getElementById('fixed-income-form').reset();
    const now = new Date();
    document.getElementById('fixed-income-start').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const modeEl = document.querySelector('input[name="fi-pay-mode"][value="fixed-day"]');
    if (modeEl) modeEl.checked = true;
    updateFixedIncomeDayVisibility();
    populateFixedIncomeCoParentChildren();
    const cpGrp = document.getElementById('fixed-income-coparent-group');
    const cpCb = document.getElementById('fixed-income-coparent-on');
    const cpFields = document.getElementById('fixed-income-coparent-fields');
    if (cpGrp) cpGrp.style.display = children.length ? 'block' : 'none';
    if (cpCb) cpCb.checked = false;
    if (cpFields) cpFields.style.display = 'none';
    document.getElementById('modal-fixed-income').classList.add('active');
}

function editFixedIncome(id) {
    const fi = fixedIncomes.find(x => x.id === id);
    if (!fi) return;
    document.getElementById('fixed-income-modal-title').textContent = 'Editar Receita Fixa';
    document.getElementById('fixed-income-id').value = fi.id;
    document.getElementById('fixed-income-desc').value = fi.description;
    document.getElementById('fixed-income-amount').value = fi.amount;
    document.getElementById('fixed-income-day').value = fi.dayOfMonth;
    document.getElementById('fixed-income-start').value = fi.startDate;
    document.getElementById('fixed-income-end').value = fi.endDate || '';
    document.getElementById('fixed-income-notes').value = fi.notes || '';
    document.getElementById('fixed-income-is-variable').checked = fi.isVariable || false;
    document.getElementById('fixed-income-only-on-day').checked = fi.onlyOnDay || false;
    const mmEl = document.getElementById('fixed-income-manual-mark');
    if (mmEl) mmEl.checked = !!fi.manualMark;
    const mode = fi.paymentMode || 'fixed-day';
    const modeEl = document.querySelector(`input[name="fi-pay-mode"][value="${mode}"]`);
    if (modeEl) modeEl.checked = true;
    updateFixedIncomeDayVisibility();
    populateCategorySelects();
    document.getElementById('fixed-income-category').value = fi.category || 'ordenado';
    populateFixedIncomeCoParentChildren();
    const cpGrp = document.getElementById('fixed-income-coparent-group');
    const cpCb = document.getElementById('fixed-income-coparent-on');
    const cpFields = document.getElementById('fixed-income-coparent-fields');
    const cpSel = document.getElementById('fixed-income-coparent-child');
    if (cpGrp) cpGrp.style.display = children.length ? 'block' : 'none';
    if (cpCb) cpCb.checked = !!fi.coParentChildId;
    if (cpFields) cpFields.style.display = fi.coParentChildId ? 'block' : 'none';
    if (cpSel && fi.coParentChildId) cpSel.value = fi.coParentChildId;
    document.getElementById('modal-fixed-income').classList.add('active');
}

function populateFixedIncomeCoParentChildren() {
    const sel = document.getElementById('fixed-income-coparent-child');
    if (!sel) return;
    sel.innerHTML = children.map(c => `<option value="${c.id}">${c.name}${c.coParentName ? ` (${c.coParentName})` : ''}</option>`).join('');
}

function toggleFixedIncomeCoParent() {
    const cb = document.getElementById('fixed-income-coparent-on');
    const fields = document.getElementById('fixed-income-coparent-fields');
    if (cb && fields) fields.style.display = cb.checked ? 'block' : 'none';
}

function updateFixedIncomeDayVisibility() {
    const mode = document.querySelector('input[name="fi-pay-mode"]:checked')?.value || 'fixed-day';
    const wrap = document.getElementById('fixed-income-day-wrap');
    if (wrap) wrap.style.display = mode === 'last-working-day' ? 'none' : '';
}

function saveFixedIncome(event) {
    event.preventDefault();
    const id = document.getElementById('fixed-income-id').value;
    const payMode = document.querySelector('input[name="fi-pay-mode"]:checked')?.value || 'fixed-day';
    const fi = {
        id: id || generateId(),
        description: document.getElementById('fixed-income-desc').value.trim(),
        amount: parseFloat(document.getElementById('fixed-income-amount').value),
        dayOfMonth: parseInt(document.getElementById('fixed-income-day').value) || 1,
        paymentMode: payMode,
        category: document.getElementById('fixed-income-category').value,
        startDate: document.getElementById('fixed-income-start').value,
        endDate: document.getElementById('fixed-income-end').value || null,
        notes: document.getElementById('fixed-income-notes').value.trim(),
        isVariable: document.getElementById('fixed-income-is-variable').checked,
        onlyOnDay: document.getElementById('fixed-income-only-on-day').checked,
        manualMark: document.getElementById('fixed-income-manual-mark')?.checked || false,
        coParentChildId: (document.getElementById('fixed-income-coparent-on')?.checked
            ? (document.getElementById('fixed-income-coparent-child')?.value || null)
            : null),
        updatedAt: new Date().toISOString()
    };
    if (id) {
        const idx = fixedIncomes.findIndex(x => x.id === id);
        const currentMonthKey = getFixedMonthKey(new Date());
        const prevDate = new Date(); prevDate.setDate(1); prevDate.setMonth(prevDate.getMonth() - 1);
        const prevMonthKey = getFixedMonthKey(prevDate);
        const existing = idx >= 0 ? fixedIncomes[idx] : null;
        if (existing && existing.startDate < currentMonthKey) {
            // Has past data: end the old record and create a new version from current month
            fixedIncomes[idx].endDate = prevMonthKey;
            const newFi = { ...fi, id: generateId(), startDate: currentMonthKey, createdAt: new Date().toISOString() };
            fixedIncomes.push(newFi);
            showToast('Nova versao criada a partir deste mes');
        } else {
            // No past history: edit in place
            if (idx >= 0) { fi.createdAt = fixedIncomes[idx].createdAt; fixedIncomes[idx] = fi; }
            showToast('Receita fixa atualizada!');
        }
    } else {
        fi.createdAt = new Date().toISOString();
        fixedIncomes.push(fi);
        showToast('Receita fixa criada!');
    }
    saveData();
    closeFixedIncomeModal();
    renderFixedIncomeList();
    updateAll();
}

function confirmDeleteFixedIncome(id) {
    const fi = fixedIncomes.find(x => x.id === id);
    if (!fi) return;
    const currentMonthKey = getFixedMonthKey(new Date());
    const prevDate = new Date(); prevDate.setDate(1); prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonthKey = getFixedMonthKey(prevDate);
    const hasPastData = fi.startDate < currentMonthKey;
    const confirmBtn = document.getElementById('confirm-btn');
    if (hasPastData) {
        document.getElementById('confirm-message').textContent = `"${fi.description}" tem dados em meses anteriores. Sera desativada a partir deste mes (historico fica guardado).`;
        confirmBtn.textContent = 'Desativar';
        confirmBtn.onclick = () => {
            const idx = fixedIncomes.findIndex(x => x.id === id);
            if (idx >= 0) fixedIncomes[idx].endDate = prevMonthKey;
            saveData();
            closeConfirm();
            renderFixedIncomeList();
            updateAll();
            showToast('Receita fixa desativada');
        };
    } else {
        document.getElementById('confirm-message').textContent = `Apagar receita fixa "${fi.description}"?`;
        confirmBtn.textContent = 'Apagar';
        confirmBtn.onclick = () => {
            fixedIncomes = fixedIncomes.filter(x => x.id !== id);
            fixedIncomeStatus = fixedIncomeStatus.filter(s => s.fixedIncomeId !== id);
            saveData();
            closeConfirm();
            renderFixedIncomeList();
            updateAll();
            showToast('Receita fixa removida');
        };
    }
    document.getElementById('modal-confirm').classList.add('active');
}

function closeFixedIncomeModal() { document.getElementById('modal-fixed-income').classList.remove('active'); }

// ===== CHILDREN MANAGEMENT =====
function renderChildrenList() {
    const container = document.getElementById('children-list');
    if (!container) return;
    if (children.length === 0) {
        container.innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);margin-top:12px">Nenhum filho configurado.</p>';
        return;
    }
    container.innerHTML = children.map(c => `
        <div class="fixed-item">
            <div class="fixed-icon" style="background:#EDE7F6;color:var(--primary);width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <i class="fas fa-child"></i>
            </div>
            <div class="fixed-info">
                <div class="fixed-desc">${c.name}</div>
                <div class="fixed-meta">Co-progenitor: ${c.coParentName} &middot; ${c.splitPct}% a cargo de ${c.coParentName}</div>
            </div>
            <div class="expense-actions">
                <button class="btn-icon" onclick="editChild('${c.id}')" style="color:var(--primary)"><i class="fas fa-pen"></i></button>
                ${children.length > 1 ? `<button class="btn-icon" onclick="confirmDeleteChild('${c.id}')" style="color:var(--danger)"><i class="fas fa-trash"></i></button>` : ''}
            </div>
        </div>
    `).join('');
}

function showAddChild() {
    document.getElementById('child-modal-title').textContent = 'Adicionar Filho';
    document.getElementById('child-form').reset();
    document.getElementById('child-id').value = '';
    document.getElementById('child-split-pct').value = 50;
    document.getElementById('child-has-split').checked = true;
    toggleChildSplitFields();
    document.getElementById('modal-child').classList.add('active');
}

function editChild(id) {
    const c = children.find(x => x.id === id);
    if (!c) return;
    document.getElementById('child-modal-title').textContent = 'Editar Filho';
    document.getElementById('child-id').value = c.id;
    document.getElementById('child-name-input').value = c.name;
    document.getElementById('child-coparent-input').value = c.coParentName || '';
    document.getElementById('child-split-pct').value = c.splitPct || 50;
    // Default true for backward compat: existing children without hasSplit flag were split-enabled
    const hasSplit = c.hasSplit !== false && (c.coParentName || c.splitPct > 0 || c.hasSplit === undefined);
    document.getElementById('child-has-split').checked = c.hasSplit !== false;
    toggleChildSplitFields();
    document.getElementById('modal-child').classList.add('active');
}

function toggleChildSplitFields() {
    const on = document.getElementById('child-has-split').checked;
    document.getElementById('child-coparent-group').style.display = on ? 'block' : 'none';
    document.getElementById('child-split-pct-group').style.display = on ? 'block' : 'none';
}

function saveChild(event) {
    event.preventDefault();
    const id = document.getElementById('child-id').value;
    const hasSplit = document.getElementById('child-has-split').checked;
    const child = {
        id: id || generateId(),
        name: document.getElementById('child-name-input').value.trim(),
        coParentName: hasSplit ? (document.getElementById('child-coparent-input').value.trim() || 'Co-progenitor') : '',
        splitPct: hasSplit ? (parseInt(document.getElementById('child-split-pct').value) || 50) : 0,
        hasSplit
    };
    if (id) {
        const idx = children.findIndex(c => c.id === id);
        if (idx >= 0) children[idx] = child;
    } else {
        children.push(child);
        if (!activeChildId) activeChildId = child.id;
    }
    try { saveData(); } catch (e) { console.error('saveChild/saveData', e); }
    closeChildModal();
    try { renderChildrenList(); } catch (e) { console.error('saveChild/renderChildrenList', e); }
    try { populateExpenseTypeOptions(); } catch (e) { console.error('saveChild/populateExpenseTypeOptions', e); }
    try { populateFixedTypeOptions(); } catch (e) { console.error('saveChild/populateFixedTypeOptions', e); }
    try { populateFilterTypes(); } catch (e) { console.error('saveChild/populateFilterTypes', e); }
    try { updateAll(); } catch (e) { console.error('saveChild/updateAll', e); }
    showToast(id ? 'Filho atualizado!' : 'Filho adicionado!');
}

function confirmDeleteChild(id) {
    if (children.length <= 1) { showToast('Deve ter pelo menos um filho'); return; }
    const c = children.find(x => x.id === id);
    document.getElementById('confirm-message').textContent = `Remover "${c?.name}"? As despesas existentes ficam guardadas.`;
    document.getElementById('confirm-btn').onclick = () => {
        children = children.filter(x => x.id !== id);
        if (activeChildId === id) activeChildId = children[0]?.id || null;
        saveData();
        closeConfirm();
        renderChildrenList();
        populateExpenseTypeOptions();
        populateFixedTypeOptions();
        populateFilterTypes();
        updateAll();
        showToast('Filho removido');
    };
    document.getElementById('modal-confirm').classList.add('active');
}

function closeChildModal() { document.getElementById('modal-child').classList.remove('active'); }

// ===== CATEGORY MANAGEMENT =====
const ICON_OPTIONS = [
    'fa-tag','fa-heart','fa-star','fa-paw','fa-dumbbell','fa-music','fa-plane',
    'fa-car','fa-bicycle','fa-baby','fa-dog','fa-cat','fa-book','fa-camera',
    'fa-graduation-cap','fa-briefcase','fa-tools','fa-leaf','fa-wine-glass',
    'fa-coffee','fa-pizza-slice','fa-shopping-bag','fa-tshirt','fa-mobile-alt'
];
const COLOR_OPTIONS = [
    '#E53935','#D81B60','#8E24AA','#5E35B1','#3949AB','#1E88E5','#039BE5',
    '#00ACC1','#00897B','#43A047','#7CB342','#C0CA33','#FDD835','#FFB300',
    '#FB8C00','#F4511E','#6D4C41','#757575','#546E7A','#607D8B'
];

function buildIconPicker() {
    const container = document.getElementById('icon-picker');
    if (!container) return;
    container.innerHTML = ICON_OPTIONS.map(icon => `
        <div class="icon-option ${icon === 'fa-tag' ? 'selected' : ''}" onclick="selectIcon('${icon}')" data-icon="${icon}">
            <i class="fas ${icon}"></i>
        </div>
    `).join('');
}

function selectIcon(icon) {
    document.getElementById('cat-icon').value = icon;
    document.querySelectorAll('.icon-option').forEach(el => el.classList.toggle('selected', el.dataset.icon === icon));
}

function buildColorPicker() {
    const container = document.getElementById('color-picker');
    if (!container) return;
    container.innerHTML = COLOR_OPTIONS.map(color => `
        <div class="color-option ${color === '#607D8B' ? 'selected' : ''}" onclick="selectColor('${color}')"
            style="background:${color}" data-color="${color}"></div>
    `).join('');
}

function selectColor(color) {
    document.getElementById('cat-color').value = color;
    document.querySelectorAll('.color-option').forEach(el => el.classList.toggle('selected', el.dataset.color === color));
}

function renderCatList(type) {
    const isExp = type === 'expense';
    const container = document.getElementById(isExp ? 'catexp-list' : 'catinc-list');
    const defaults = isExp ? CATEGORIES : INCOME_CATEGORIES;
    const customs = isExp ? customCategories : customIncCategories;

    let html = '';
    // Default categories (read-only)
    Object.entries(defaults).forEach(([k, v]) => {
        html += `
            <div class="cat-item default-cat">
                <div class="cat-item-icon" style="background:${v.color || '#EDE7F6'};color:white">
                    <i class="fas ${v.icon}"></i>
                </div>
                <span class="cat-item-name">${v.label}</span>
                <span class="cat-item-badge">Padrao</span>
            </div>`;
    });
    // Custom categories (editable)
    customs.forEach(c => {
        html += `
            <div class="cat-item">
                <div class="cat-item-icon" style="background:${c.color};color:white">
                    <i class="fas ${c.icon}"></i>
                </div>
                <span class="cat-item-name">${c.name}</span>
                <div class="expense-actions">
                    <button class="btn-icon" onclick="editCategory('${c.id}','${type}')" style="color:var(--primary)"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon" onclick="deleteCategory('${c.id}','${type}')" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

function showAddCategory(type) {
    document.getElementById('cat-modal-title').textContent = type === 'expense' ? 'Nova Categoria de Despesa' : 'Nova Categoria de Receita';
    document.getElementById('category-form').reset();
    document.getElementById('cat-id').value = '';
    document.getElementById('cat-type').value = type;
    document.getElementById('cat-icon').value = 'fa-tag';
    document.getElementById('cat-color').value = '#607D8B';
    buildIconPicker();
    buildColorPicker();
    document.getElementById('modal-category').classList.add('active');
}

function editCategory(id, type) {
    const list = type === 'expense' ? customCategories : customIncCategories;
    const c = list.find(x => x.id === id);
    if (!c) return;
    document.getElementById('cat-modal-title').textContent = 'Editar Categoria';
    document.getElementById('cat-id').value = c.id;
    document.getElementById('cat-type').value = type;
    document.getElementById('cat-name').value = c.name;
    document.getElementById('cat-icon').value = c.icon;
    document.getElementById('cat-color').value = c.color;
    buildIconPicker();
    buildColorPicker();
    // Mark selected
    setTimeout(() => {
        selectIcon(c.icon);
        selectColor(c.color);
    }, 0);
    document.getElementById('modal-category').classList.add('active');
}

function saveCategory(event) {
    event.preventDefault();
    const id = document.getElementById('cat-id').value;
    const type = document.getElementById('cat-type').value;
    const isExp = type === 'expense';
    const list = isExp ? customCategories : customIncCategories;
    const cat = {
        id: id || generateId(),
        name: document.getElementById('cat-name').value.trim(),
        icon: document.getElementById('cat-icon').value,
        color: document.getElementById('cat-color').value
    };
    if (id) {
        const idx = list.findIndex(x => x.id === id);
        if (idx >= 0) list[idx] = cat;
    } else {
        list.push(cat);
    }
    if (isExp) customCategories = list; else customIncCategories = list;
    saveData();
    closeCategoryModal();
    renderCatList(type);
    populateCategorySelects();
    populateFilterCategories();
    showToast('Categoria guardada!');
}

function deleteCategory(id, type) {
    const isExp = type === 'expense';
    if (isExp) customCategories = customCategories.filter(x => x.id !== id);
    else customIncCategories = customIncCategories.filter(x => x.id !== id);
    saveData();
    renderCatList(type);
    populateCategorySelects();
    populateFilterCategories();
    showToast('Categoria removida');
}

function closeCategoryModal() { document.getElementById('modal-category').classList.remove('active'); }

// ===== HELPERS =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function formatCurrency(value) {
    return value.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR';
}

// Tweens an element's text from its previously-shown numeric value to `to`.
// Stores the current value on the element so subsequent calls continue smoothly.
// Skipped (set-once) when the delta is trivial or the user prefers reduced motion.
function animateNumber(el, to, formatter = formatCurrency, duration = 500) {
    if (!el) return;
    const from = parseFloat(el.dataset.animVal || '0');
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || Math.abs(to - from) < 0.01) {
        el.textContent = formatter(to);
        el.dataset.animVal = String(to);
        return;
    }
    el.dataset.animVal = String(to);
    const start = performance.now();
    const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = formatter(from + (to - from) * eased);
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    // Drop the year when the row is from the current year — it's just
    // visual noise. The full DD/MM/YYYY form sticks around for older
    // rows so context stays clear.
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleDateString('pt-PT', sameYear
        ? { day: '2-digit', month: '2-digit' }
        : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMonthFile(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

function groupByCategory(expenseList) {
    const result = {};
    expenseList.forEach(e => {
        // Skip expenses paid from a prepaid card balance — that money was
        // already counted when the card was topped up. Top-ups themselves
        // (isPrepaidTopup) do contribute and fall through normally.
        if (!expenseAffectsBalance(e)) return;
        result[e.category] = (result[e.category] || 0) + e.amount;
    });
    return result;
}

function getUniqueMonths() {
    const monthMap = {};
    expenses.forEach(e => {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!monthMap[key]) monthMap[key] = { date: d, total: 0 };
        monthMap[key].total += e.amount;
    });
    return Object.values(monthMap).sort((a, b) => b.date - a.date);
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copiado! Cole numa mensagem para partilhar.');
    }).catch(() => {
        showToast('Nao foi possivel copiar');
    });
}

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
