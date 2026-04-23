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
const APP_TITLE_KEY = 'vanessa_app_title';
const HOUSEHOLD_MODE_KEY = 'vanessa_household_mode';
const SPOUSE_NAME_KEY = 'vanessa_spouse_name';
const SPOUSE_PCT_KEY = 'vanessa_spouse_pct';

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
const BUDGETS_KEY = 'vanessa_budgets';
let expenseTemplates = [];   // { id, description, amount, category, type, split, essential, icon }
let categoryBudgets = {};    // { category: maxAmount }

function getUserName() {
    return localStorage.getItem(USER_NAME_KEY) || '';
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

let aiCfg = { geminiKey: '', grokKey: '', grokModel: 'grok-4-fast', groqKey: '', groqModel: 'llama-3.3-70b-versatile', aiProvider: 'gemini', googleClientId: '', autoSync: false, lastSyncDate: null };
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
    const provider = document.querySelector('input[name="ai-provider"]:checked')?.value;
    const cid = document.getElementById('ai-google-client-id')?.value.trim();
    if (key) aiCfg.geminiKey = key;
    if (grokKey) aiCfg.grokKey = grokKey;
    if (grokModel) aiCfg.grokModel = grokModel;
    if (groqKey) aiCfg.groqKey = groqKey;
    if (groqModel) aiCfg.groqModel = groqModel;
    if (provider) aiCfg.aiProvider = provider;
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
    const cidEl = document.getElementById('ai-google-client-id');
    const autoEl = document.getElementById('ai-auto-sync');
    const fromEl = document.getElementById('ai-sync-from');
    const toEl = document.getElementById('ai-sync-to');
    if (keyEl && aiCfg.geminiKey) keyEl.value = aiCfg.geminiKey;
    if (grokKeyEl && aiCfg.grokKey) grokKeyEl.value = aiCfg.grokKey;
    if (grokModelEl) grokModelEl.value = aiCfg.grokModel || 'grok-4-fast';
    if (groqKeyEl && aiCfg.groqKey) groqKeyEl.value = aiCfg.groqKey;
    if (groqModelEl) groqModelEl.value = aiCfg.groqModel || 'llama-3.3-70b-versatile';
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
    if (cidEl && aiCfg.googleClientId) cidEl.value = aiCfg.googleClientId;
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
const PAYMENT_KEYWORDS = ['debit','debito','pagamento','fatura','factura','compra','transac','transferen','movimento','recibo','banco','mbway','multibanco','visa','mastercard','sepa','direct debit','payment','purchase','withdrawal','atm','pos ','ref ','iban','swift','cobranca'];

function isProbablyPaymentEmail(subject, from) {
    const text = (subject + ' ' + from).toLowerCase();
    return PAYMENT_KEYWORDS.some(k => text.includes(k));
}

async function fetchGmailForPeriod(from, to) {
    const fromStr = from.toISOString().slice(0, 10).replace(/-/g, '/');
    const toDate = new Date(to); toDate.setDate(toDate.getDate() + 1);
    const toStr = toDate.toISOString().slice(0, 10).replace(/-/g, '/');
    // More targeted query: known payment signals in subject
    const q = `after:${fromStr} before:${toStr} (debito OR pagamento OR fatura OR compra OR transacao OR mbway OR multibanco OR "movimentos" OR recibo)`;
    // Step 1: fetch metadata only (no body) — free and fast
    const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=50`,
        { headers: { Authorization: 'Bearer ' + _googleAccessToken } }
    );
    if (!listRes.ok) throw new Error('Erro Gmail API: ' + listRes.status);
    const listData = await listRes.json();
    if (!listData.messages?.length) return [];

    // Load already-seen email IDs to avoid re-analysis
    const seenIds = new Set(aiCfg.analyzedEmailIds || []);

    // Step 2: fetch metadata headers only for up to 20 emails
    const candidates = listData.messages.slice(0, 20);
    const metaResults = await Promise.all(candidates.map(m =>
        fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            { headers: { Authorization: 'Bearer ' + _googleAccessToken } }
        ).then(r => r.json())
    ));

    // Step 3: filter to relevant, unseen emails (max 6)
    const getHeader = (msg, name) => (msg.payload?.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    const relevant = metaResults
        .filter(m => !seenIds.has(m.id) && isProbablyPaymentEmail(getHeader(m, 'Subject'), getHeader(m, 'From')))
        .slice(0, 6);

    if (!relevant.length) return [];

    // Step 4: fetch full content only for relevant emails
    const msgs = await Promise.all(relevant.map(m =>
        fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
            { headers: { Authorization: 'Bearer ' + _googleAccessToken } }
        ).then(r => r.json())
    ));
    return msgs;
}

function decodeEmailBody(payload) {
    if (payload.body?.data) {
        try { return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/')); } catch { return ''; }
    }
    if (payload.parts) {
        for (const p of payload.parts) {
            const t = decodeEmailBody(p);
            if (t) return t;
        }
    }
    return '';
}

function emailToText(msg) {
    const headers = msg.payload?.headers || [];
    const get = n => headers.find(h => h.name.toLowerCase() === n.toLowerCase())?.value || '';
    // Very short body — only need key numbers/dates, not full prose
    const body = decodeEmailBody(msg.payload || {}).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
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
                    generationConfig: { temperature: 0.1, maxOutputTokens: 800 }
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
                        generationConfig: { temperature: 0.1, maxOutputTokens: 800 }
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
            max_tokens: 800
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

const EMAIL_EXTRACT_PROMPT = (texts) => `Analisa estes emails e extrai APENAS pagamentos/despesas reais a debito (ignora transferencias entre contas proprias, depositos, publicidade, newsletters).

Responde UNICAMENTE com JSON array (sem texto extra):
[{"id":"ID_DO_EMAIL","description":"descricao curta","amount":12.50,"date":"YYYY-MM-DD","category":"alimentacao|transportes|saude|casa|lazer|subscricoes|contas|telecomunicacoes|outros"}]

Se um email nao tiver despesa, omite-o do array. Se nao houver nenhuma, responde [].

EMAILS:
${texts.join('\n===\n')}`;

function extractJsonArray(text) {
    const m = (text || '').match(/\[[\s\S]*?\]/);
    if (!m) return [];
    try { return JSON.parse(m[0]); } catch { return []; }
}

// Dispatcher: routes to whichever provider is configured.
async function callAI(emailTexts) {
    if (!emailTexts.length) return [];
    const provider = aiCfg.aiProvider || 'gemini';
    const prompt = EMAIL_EXTRACT_PROMPT(emailTexts);
    if (provider === 'grok') {
        if (!aiCfg.grokKey) throw new Error('Chave Grok nao configurada');
        const data = await callGrokOnce(prompt);
        return extractJsonArray(data.choices?.[0]?.message?.content);
    }
    if (provider === 'groq') {
        if (!aiCfg.groqKey) throw new Error('Chave Groq nao configurada');
        const data = await callGroqOnce(prompt);
        return extractJsonArray(data.choices?.[0]?.message?.content);
    }
    if (!aiCfg.geminiKey) throw new Error('Chave Gemini nao configurada');
    const data = await callGeminiOnce(prompt);
    return extractJsonArray(data.candidates?.[0]?.content?.parts?.[0]?.text);
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
        // Deduplicate against existing pending
        const newItems = extracted
            .filter(e => e.amount > 0 && e.date)
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

function renderPendingExpenses() {
    const section = document.getElementById('pending-expenses-section');
    const list = document.getElementById('pending-expenses-list');
    const badge = document.getElementById('pending-count-badge');
    if (badge) badge.textContent = pendingExpenses.length || '';
    if (!section || !list) return;
    if (!pendingExpenses.length) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    const cats = getEffectiveCategories();
    const confColor = c => c === 'high' ? 'var(--success)' : c === 'medium' ? '#FF8F00' : 'var(--danger)';
    list.innerHTML = pendingExpenses.map(e => {
        const cat = cats[e.category] || cats.outros;
        return `<div style="background:white;border-radius:10px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:8px">
            <div style="width:32px;height:32px;border-radius:8px;background:#EDE7F6;display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0"><i class="fas ${cat.icon}"></i></div>
            <div style="flex:1;min-width:0">
                <div style="font-size:0.83rem;font-weight:600">${e.description}${e.merchant && e.merchant !== e.description ? ` <span style="font-weight:400;color:var(--text-light);font-size:0.75rem">(${e.merchant})</span>` : ''}</div>
                <div style="font-size:0.72rem;color:var(--text-light)">${e.date} &middot; ${cat.label} &middot; <span style="color:${confColor(e.confidence)}">${e.confidence === 'high' ? 'alta' : e.confidence === 'medium' ? 'media' : 'baixa'} confianca</span></div>
            </div>
            <div style="font-size:0.88rem;font-weight:700;color:var(--danger);white-space:nowrap">-${formatCurrency(e.amount)}</div>
            <button onclick="approvePending('${e.id}')" style="background:var(--success);color:white;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;flex-shrink:0"><i class="fas fa-check"></i></button>
            <button onclick="dismissPending('${e.id}')" style="background:#F5F5F5;color:#999;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;flex-shrink:0"><i class="fas fa-times"></i></button>
        </div>`;
    }).join('');
}

function approvePending(id) {
    const e = pendingExpenses.find(x => x.id === id);
    if (!e) return;
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
    if (!card || !salaryDay) { if (card) card.style.display = 'none'; return; }

    const today = new Date();
    const todayDay = today.getDate();

    // Determine current salary cycle start and end
    let cycleStart, cycleEnd;
    if (todayDay >= salaryDay) {
        cycleStart = new Date(today.getFullYear(), today.getMonth(), salaryDay);
        cycleEnd = new Date(today.getFullYear(), today.getMonth() + 1, salaryDay - 1);
    } else {
        cycleStart = new Date(today.getFullYear(), today.getMonth() - 1, salaryDay);
        cycleEnd = new Date(today.getFullYear(), today.getMonth(), salaryDay - 1);
    }

    const daysLeft = Math.max(0, Math.round((cycleEnd - today) / 86400000));

    // Period label
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const periodLabel = `${salaryDay} ${months[cycleStart.getMonth()]} \u2192 ${salaryDay - 1} ${months[cycleEnd.getMonth()]}`;

    const b = getSalaryCycleBreakdown(cycleStart, cycleEnd, today);
    const spentSinceSalary = b.expPaid;
    const cycleFixed = b.expPending;
    const salaryIncome = b.incReceived;

    const totalBudget = salaryIncome || (spentSinceSalary + cycleFixed + 500);
    const available = totalBudget - spentSinceSalary - cycleFixed;
    const usedPct = totalBudget > 0 ? Math.min(100, ((spentSinceSalary + cycleFixed) / totalBudget) * 100) : 0;

    // Day counters
    const daysTotal = Math.max(1, Math.round((cycleEnd - cycleStart) / 86400000) + 1);
    const daysElapsed = Math.max(1, Math.min(daysTotal, Math.round((today - cycleStart) / 86400000) + 1));

    // Daily spending rate (variable only — fixed doesn't reflect daily behaviour)
    const dailyVarRate = b.expPaidVariable / daysElapsed;
    // Projected balance at end of cycle: assume pending incomes arrive, pending fixed get paid,
    // and variable spending continues at the current per-day rate for the remaining days.
    const projectedVar = dailyVarRate * daysLeft;
    const projectedEndBalance = (b.incReceived + b.incPending) - (b.expPaid + b.expPending + projectedVar);

    // Top category within the cycle
    const topCat = Object.entries(b.expByCategory).sort((a, b) => b[1] - a[1])[0];
    const cats = getEffectiveCategories();

    card.style.display = 'block';
    document.getElementById('salary-cycle-period').textContent = periodLabel;
    document.getElementById('salary-cycle-days').textContent = daysLeft + ' dias restantes';
    const dayCountEl = document.getElementById('salary-cycle-daycount');
    if (dayCountEl) dayCountEl.textContent = `Dia ${daysElapsed}/${daysTotal}`;

    animateNumber(document.getElementById('salary-received'), b.incReceived);
    const recPendEl = document.getElementById('salary-received-pending');
    if (recPendEl) recPendEl.textContent = b.incPending > 0 ? `+ ${formatCurrency(b.incPending)} por receber` : '';

    animateNumber(document.getElementById('salary-spent'), spentSinceSalary);
    const rateEl = document.getElementById('salary-spent-rate');
    if (rateEl) rateEl.textContent = b.expPaidVariable > 0 ? `${formatCurrency(dailyVarRate)}/dia` : '';

    animateNumber(document.getElementById('salary-fixed'), cycleFixed);
    animateNumber(document.getElementById('salary-available'), available, formatCurrency, 700);
    document.getElementById('salary-available').style.color = available >= 0 ? 'var(--success)' : 'var(--danger)';
    const fill = document.getElementById('salary-progress-fill');
    if (fill) {
        fill.style.width = usedPct + '%';
        fill.style.background = usedPct > 90 ? 'var(--danger)' : usedPct > 70 ? 'var(--warning)' : 'var(--success)';
    }

    // Footer: projection + top category. Only shown once there's something meaningful to project.
    const footer = document.getElementById('salary-cycle-footer');
    const hasProjection = b.expPaidVariable > 0 && daysLeft > 0;
    const hasTop = !!topCat;
    if (footer) {
        footer.style.display = (hasProjection || hasTop) ? 'flex' : 'none';
    }
    if (hasProjection) {
        const projEl = document.getElementById('salary-projection');
        const sign = projectedEndBalance >= 0 ? '+' : '';
        const color = projectedEndBalance >= 0 ? '#69f0ae' : '#ff9f9f';
        if (projEl) {
            projEl.textContent = `${sign}${formatCurrency(projectedEndBalance)} no fim`;
            projEl.style.color = color;
        }
    } else {
        const projEl = document.getElementById('salary-projection');
        if (projEl) projEl.textContent = '—';
    }
    const topRow = document.getElementById('salary-topcat-row');
    if (topRow) topRow.style.display = hasTop ? 'flex' : 'none';
    if (hasTop) {
        const topEl = document.getElementById('salary-topcat');
        const cat = cats[topCat[0]];
        if (topEl) topEl.textContent = `${cat?.label || topCat[0]} · ${formatCurrency(topCat[1])}`;
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadAiData();
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
    const savedSalaryDay = localStorage.getItem('vanessa_salary_day');
    salaryDay = savedSalaryDay ? parseInt(savedSalaryDay) : null;
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
    return st?.amount || f.amount;
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

function getEffectiveFixedIncomeStatus(fi, date) {
    const explicit = getFixedIncomeStatusForMonth(fi.id, date);
    if (explicit) return explicit;
    const today = new Date();
    const isCurrentMonth = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    if (isCurrentMonth && today.getDate() >= fi.dayOfMonth) {
        return { status: 'recebido', auto: true };
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
            const splitPct = child?.splitPct || 50;
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

function adjustExpenseForCoParent(e) {
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
    return { ...e, amount: fullAmount * (1 - child.splitPct / 100), fullAmount };
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

function getEffectiveMonthExpenses(date) {
    const real = getMonthExpenses(date).map(adjustExpenseForCoParent);
    const expanded = real.flatMap(expandSplitAcrossChildren);
    const paidFixed = getPaidFixedAsExpenses(date).flatMap(expandSplitAcrossChildren);
    return [...expanded, ...paidFixed];
}

function getPaidFixedIncomesAsIncome(date) {
    const active = getActiveFixedIncomesForMonth(date);
    const monthKey = getFixedMonthKey(date);
    const [y, m] = monthKey.split('-').map(Number);
    return active
        .filter(fi => getEffectiveFixedIncomeStatus(fi, date).status === 'recebido')
        .map(fi => {
            const maxDay = new Date(y, m, 0).getDate();
            const day = Math.min(fi.dayOfMonth, maxDay);
            return {
                id: `fixedinc_${fi.id}_${monthKey}`,
                description: fi.description,
                amount: getEffectiveFixedIncomeAmount(fi, date),
                date: `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
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
    const totalExpenses = monthExp.reduce((s, e) => s + e.amount, 0);
    const totalIncome = monthInc.reduce((s, e) => s + e.amount, 0);
    const balance = totalIncome - totalExpenses;
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
        // If "only count on day", don't project before the day arrives
        if (fi.onlyOnDay && todayDay < fi.dayOfMonth) return false;
        return getEffectiveFixedIncomeStatus(fi, currentDate).status !== 'recebido';
    }).reduce((s, fi) => s + getEffectiveFixedIncomeAmount(fi, currentDate), 0);

    const futureRegularInc = isPastMonth ? 0 :
        getMonthIncomes(currentDate).filter(i => i.date > todayStr).reduce((s, i) => s + i.amount, 0);

    const pendingIncomes = fixedIncPending + futureRegularInc;

    // Projected totals and balance
    const projectedIncome = totalIncome + pendingIncomes;
    const projectedExpenses = totalExpenses + pendingExpenses;
    const projectedBalance = projectedIncome - projectedExpenses;
    const available = projectedBalance;

    // Balance KPI
    animateNumber(document.getElementById('kpi-income'), totalIncome);
    animateNumber(document.getElementById('kpi-expenses'), totalExpenses);
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
}

function renderSpendingPace(monthExp, totalIncome, totalExpenses) {
    const container = document.getElementById('spending-pace');
    if (!container) return;

    const today = new Date();
    const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
    if (!isCurrentMonth || totalExpenses === 0) {
        container.style.display = 'none';
        return;
    }

    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - dayOfMonth;
    const dailyAvg = totalExpenses / dayOfMonth;
    const projected = dailyAvg * daysInMonth;
    const dailyBudget = daysRemaining > 0 && totalIncome > 0 ? Math.max(0, (totalIncome - totalExpenses) / daysRemaining) : 0;
    const monthPct = Math.round((dayOfMonth / daysInMonth) * 100);

    const projColor = projected > totalIncome ? 'var(--danger)' : projected > totalIncome * 0.8 ? 'var(--warning)' : 'var(--success)';
    const projBg = projected > totalIncome ? '#FFEBEE' : projected > totalIncome * 0.8 ? '#FFF8E1' : '#E8F5E9';
    const budgetColor = dailyBudget < 10 ? 'var(--danger)' : dailyBudget < 30 ? 'var(--warning)' : 'var(--success)';
    const budgetBg = dailyBudget < 10 ? '#FFEBEE' : dailyBudget < 30 ? '#FFF8E1' : '#E8F5E9';

    container.style.display = 'block';
    container.innerHTML = `
        <div class="pace-header">
            <span class="pace-title"><i class="fas fa-gauge-high"></i> Ritmo de Gastos</span>
            <span class="pace-badge">Dia ${dayOfMonth}/${daysInMonth}</span>
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
        <div class="pace-progress-label">${monthPct}% do mês passou · ${daysRemaining} dias restantes</div>
    `;
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
    const currTotal = monthExp.reduce((s, e) => s + e.amount, 0);
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
    const expense = {
        id: generateId(),
        description: tpl.description,
        amount: tpl.amount,
        date: new Date().toISOString().slice(0, 10),
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
    container.innerHTML = `
        <div class="quick-add-header">
            <span style="font-size:0.8rem;font-weight:700;color:var(--text)"><i class="fas fa-bolt"></i> Adicao rapida</span>
        </div>
        <div class="quick-add-chips">
            ${expenseTemplates.map(t => {
                const cat = cats[t.category] || {};
                return `<button class="quick-add-chip" onclick="addFromTemplate('${t.id}')" title="${t.description} - ${formatCurrency(t.amount)}">
                    <i class="fas ${cat.icon || t.icon || 'fa-receipt'}" style="color:${cat.color || 'var(--primary)'}"></i>
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
}

function renderExpenses() {
    renderQuickAdd();
    const monthExp = getMonthExpenses(currentDate).map(adjustExpenseForCoParent);
    const filterCat = document.getElementById('filter-category')?.value;
    const filterType = document.getElementById('filter-type')?.value;

    // Fixed expenses section
    const activeFixed = getActiveFixedForMonth(currentDate);
    const fixedSection = document.getElementById('fixed-month-section');
    const fixedList = document.getElementById('fixed-month-list');
    const titleEl = document.getElementById('other-expenses-title');

    const noFixedCta = document.getElementById('no-fixed-expenses-cta');
    if (fixedExpenses.length === 0 && noFixedCta) { noFixedCta.style.display = 'block'; } else if (noFixedCta) { noFixedCta.style.display = 'none'; }

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
                return s + amount * (1 - child.splitPct / 100);
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
            const splitPct = child?.splitPct || 50;

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
            const netAmount = (f.split && coParentPaid && child) ? amount * (1 - splitPct / 100) : amount;

            const varBadge = f.isVariable ? `<span style="font-size:0.65rem;color:var(--primary);font-weight:600;background:#EDE7F6;padding:1px 5px;border-radius:4px">~</span>` : '';
            const varEdit = f.isVariable ? `<button onclick="event.stopPropagation();editFixedAmount('${f.id}', currentDate)" class="btn-icon" style="color:var(--primary);padding:4px" title="Editar valor real"><i class="fas fa-pen-to-square"></i></button>` : '';

            return `
                <div class="fixed-month-item" style="${isPaid ? 'opacity:0.85' : ''}">
                    <div class="fixed-icon" style="width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.85rem;background:${isPaid ? '#E8F5E9' : '#EDE7F6'};color:${isPaid ? '#2E7D32' : 'var(--primary)'};flex-shrink:0">
                        <i class="fas ${cat.icon}"></i>
                    </div>
                    <div style="flex:1;min-width:0">
                        <div style="font-size:0.85rem;font-weight:600">${f.description} ${varBadge}</div>
                        <div style="font-size:0.72rem;color:var(--text-light)">Dia ${f.dayOfMonth} &middot; ${cat.label}${child ? ` &middot; ${child.name}` : ''}${isAuto ? ' &middot; auto' : ''}${coParentPaid ? ` &middot; <span style="color:var(--success)">-${splitPct}%</span>` : ''}</div>
                    </div>
                    ${varEdit}
                    <div class="fixed-month-amount" style="${coParentPaid ? 'color:var(--success)' : f.isVariable && amount !== f.amount ? 'color:var(--primary)' : ''}">
                        ${coParentPaid ? `<span style="text-decoration:line-through;font-size:0.7rem;color:var(--text-light);margin-right:3px">${formatCurrency(amount)}</span>${formatCurrency(netAmount)}` : formatCurrency(amount)}
                    </div>
                    <button onclick="markFixedPaid('${f.id}', currentDate, ${!isPaid})"
                        class="fixed-status-badge ${isPaid ? 'status-pago' : 'status-pendente'}" style="border:none;cursor:pointer">
                        ${isPaid ? '<i class="fas fa-check"></i> Pago' : '<i class="fas fa-clock"></i> Pendente'}
                    </button>
                    <button onclick="event.stopPropagation();toggleSkipFixed('${f.id}', currentDate)" class="btn-icon" style="color:var(--text-light);padding:4px;margin-left:2px" title="Ignorar este mês">
                        <i class="fas fa-ban"></i>
                    </button>
                    ${splitBadge}
                </div>
            `;
        }

        fixedList.innerHTML = [
            ...activeNotSkipped.map(f => renderFixedItem(f, false)),
            ...activeSkipped.map(f => renderFixedItem(f, true))
        ].join('');
        titleEl.style.display = 'block';
    } else {
        fixedSection.style.display = 'none';
        titleEl.style.display = activeFixed.length > 0 ? 'block' : 'none';
    }

    let filtered = monthExp;
    if (filterCat) filtered = filtered.filter(e => e.category === filterCat);
    if (filterType) filtered = filtered.filter(e => e.type === filterType);
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    const otherTotal = filtered.reduce((s, e) => s + e.amount, 0);
    const otherTotalEl = document.getElementById('other-expenses-total');
    if (otherTotalEl) otherTotalEl.textContent = filtered.length > 0 ? `(${filtered.length}) ${formatCurrency(otherTotal)}` : '';

    const container = document.getElementById('expenses-list');
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>Sem despesas para mostrar</p></div>';
        return;
    }

    container.innerHTML = filtered.map(e => renderExpenseItem(e)).join('');
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
        e.entries = [{ date: e.date, amount: e.amount, notes: e.notes || '', type: e.type }];
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
    e.entries = e.entries || [];
    e.entries.push({ date, amount, notes, type: entryType });
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

function removeGroupedEntry(expenseId, entryIndex) {
    const idx = expenses.findIndex(e => e.id === expenseId);
    if (idx < 0) return;
    const e = expenses[idx];
    if (!e.isGrouped || !Array.isArray(e.entries)) return;
    e.entries.splice(entryIndex, 1);
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
    const dup = { ...orig, id: generateId(), description: newDesc, date: new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    delete dup.attachment;
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
    const dup = { ...orig, id: generateId(), description: newDesc, date: new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
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

    const hasDeduction = (e.paidByFather && e.split) || (e.spousePaid && e.splitSpouse);
    const amountDisplay = hasDeduction
        ? `<span style="text-decoration:line-through;font-size:0.7rem;color:var(--text-light);margin-right:2px">${formatCurrency(fullAmt)}</span>${formatCurrency(e.amount)}`
        : formatCurrency(e.amount);

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
                const realIdx = e.entries.indexOf(entry);
                const tLabel = entryTypeLabel(entry.type || e.type);
                const showTag = tLabel && children.length >= 2;
                return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:0.78rem;border-bottom:1px solid var(--border)">
                    <span style="color:var(--text-light)">${formatDate(entry.date)}${entry.notes ? ` · ${entry.notes}` : ''}${showTag ? ` · <span style="color:var(--primary);font-weight:600">${tLabel}</span>` : ''}</span>
                    <span style="display:flex;align-items:center;gap:6px">
                        <span style="font-weight:600">${formatCurrency(entry.amount)}</span>
                        <button class="btn-icon" onclick="event.stopPropagation();removeGroupedEntry('${e.id}', ${realIdx})" title="Remover" style="padding:2px;color:var(--danger);font-size:0.7rem"><i class="fas fa-times"></i></button>
                    </span>
                </div>`;
            }).join('')}
            <button onclick="event.stopPropagation();addGroupedEntry('${e.id}')" class="btn btn-primary btn-sm" style="width:100%;margin-top:8px;padding:8px">
                <i class="fas fa-plus"></i> Adicionar entrada
            </button>
        </div>`
        : '';

    const catColor = cat.color || '#6C5CE7';
    return `
        <div class="expense-item" onclick="${isFixedVirtual ? '' : `editExpense('${e.id}')`}" style="border-left:3px solid ${catColor}">
            <div class="expense-icon cat-${e.category}">
                <i class="fas ${cat.icon}"></i>
            </div>
            <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                    <div class="expense-desc">${e.description} ${essentialIcon} ${attachIcon} ${isFixedVirtual ? '<i class="fas fa-repeat" style="font-size:0.6rem;color:var(--text-light)" title="Despesa fixa"></i>' : ''}</div>
                    <div class="expense-amount" style="flex-shrink:0;${hasDeduction ? 'color:var(--success)' : ''}">${amountDisplay}</div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
                    <div class="expense-meta">
                        <span>${formatDate(e.date)}</span>
                        <span class="expense-tag ${tagClass}">${tagLabel}</span>
                        ${groupedInfo}
                        ${groupedBreakdown}
                        ${e.split ? `<span style="color:var(--primary)"><i class="fas fa-divide"></i> ${expChild?.splitPct || 50}/${100-(expChild?.splitPct || 50)}</span>` : ''}
                        ${e.splitSpouse && isMarriedMode() ? `<span style="color:var(--primary)"><i class="fas fa-divide"></i> ${getSpousePct()}/${100-getSpousePct()}</span>` : ''}
                        ${(e.withPeople && e.withPeople.length > 0) ? `<span style="color:var(--primary)"><i class="fas fa-user-group" style="font-size:0.65rem"></i> ${e.withPeople.slice(0,2).join(', ')}${e.withPeople.length > 2 ? ` +${e.withPeople.length-2}` : ''}</span>` : ''}
                    </div>
                    <div style="display:flex;align-items:center;gap:4px">
                        ${coParentBadge}
                        <div class="expense-actions">
                            ${e.isGrouped && !isFixedVirtual ? `<button onclick="event.stopPropagation();addGroupedEntry('${e.id}')" title="Adicionar entrada" class="btn-grouped-add"><i class="fas fa-plus"></i></button>` : ''}
                            ${e.isGrouped && !isFixedVirtual ? `<button class="btn-icon" onclick="event.stopPropagation();toggleGroupedExpand('${e.id}')" title="Ver entradas" style="color:var(--primary)"><i class="fas fa-chevron-down"></i></button>` : ''}
                            ${e.attachment ? `<button class="btn-icon" onclick="event.stopPropagation();viewAttachment('${e.id}')" title="Ver anexo"><i class="fas fa-image"></i></button>` : ''}
                            ${!isFixedVirtual ? `<button class="btn-icon" onclick="event.stopPropagation();saveAsTemplate('${e.id}')" title="Guardar como frequente"><i class="fas fa-star"></i></button>` : ''}
                            ${!isFixedVirtual && !e.isGrouped ? `<button class="btn-icon" onclick="event.stopPropagation();duplicateExpense('${e.id}')" title="Duplicar"><i class="fas fa-copy"></i></button>` : ''}
                            ${!isFixedVirtual ? `<button class="btn-icon" onclick="event.stopPropagation();confirmDelete('${e.id}')" title="Apagar"><i class="fas fa-trash"></i></button>` : ''}
                        </div>
                    </div>
                </div>
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
            return s + (f.split && coParentPaid && child ? amount * (1 - child.splitPct / 100) : amount);
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
            const todayDayInc = new Date().getDate();
            const waitingForDay = fi.onlyOnDay && !isReceived && todayDayInc < fi.dayOfMonth;
            return `
                <div class="fixed-month-item" style="${waitingForDay ? 'opacity:0.6' : ''}">
                    <div class="fixed-icon" style="width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.85rem;background:#E8F5E9;color:#2E7D32;flex-shrink:0">
                        <i class="fas ${cat.icon || 'fa-coins'}"></i>
                    </div>
                    <div style="flex:1;min-width:0">
                        <div style="font-size:0.85rem;font-weight:600">${fi.description} ${varBadge}</div>
                        <div style="font-size:0.72rem;color:var(--text-light)">Dia ${fi.dayOfMonth}${fi.isVariable && amount !== fi.amount ? ` &middot; base: ${formatCurrency(fi.amount)}` : ''}${waitingForDay ? ' &middot; <i class="fas fa-hourglass-half"></i> aguarda dia' : ''}</div>
                    </div>
                    ${varEdit}
                    <div class="fixed-month-amount" style="color:${waitingForDay ? 'var(--text-light)' : 'var(--success)'}">${fi.isVariable && amount !== fi.amount ? `<span style="text-decoration:line-through;font-size:0.7rem;color:var(--text-light);margin-right:3px">${formatCurrency(fi.amount)}</span>` : ''}+${formatCurrency(amount)}</div>
                    <button onclick="markFixedIncomePaid('${fi.id}', currentDate, ${!isReceived})"
                        class="fixed-status-badge ${isReceived ? 'status-pago' : 'status-pendente'}" style="border:none;cursor:pointer">
                        ${isReceived ? '<i class="fas fa-check"></i> Recebido' : '<i class="fas fa-clock"></i> Pendente'}
                    </button>
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
    const container = document.getElementById('children-content');
    if (!container) return;
    if (!children.length) {
        container.innerHTML = `
            <div class="empty-state" style="padding:40px 20px">
                <i class="fas fa-children" style="font-size:2rem;color:var(--text-muted);margin-bottom:12px"></i>
                <p style="margin-bottom:12px">Nao tem filhos configurados</p>
                <button onclick="showSettingsModal();setTimeout(()=>switchSettingsTab('children'),100)" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Adicionar Filho
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
function renderReports() {
    renderIncomeVsExpenses();
    renderMonthlyEvolution();
    renderSalaryCycleReport();
    renderSavingsAnalysis();
    renderCategoryComparison();
    renderUnnecessaryExpenses();
    renderYearToDate();
    renderPeopleSpending();
    renderWeekdayHeatmap();
    renderSmartInsights();
}

// Local-timezone date formatter (YYYY-MM-DD). toISOString() uses UTC and can
// shift the date by one day for users east/west of UTC.
function toLocalDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Salary cycle containing the given reference date. A cycle runs from salaryDay
// of month M to salaryDay-1 of month M+1.
function getSalaryCycleAt(ref) {
    if (!salaryDay) return null;
    const d = new Date(ref);
    let start, end;
    if (d.getDate() >= salaryDay) {
        start = new Date(d.getFullYear(), d.getMonth(), salaryDay);
        end = new Date(d.getFullYear(), d.getMonth() + 1, salaryDay - 1);
    } else {
        start = new Date(d.getFullYear(), d.getMonth() - 1, salaryDay);
        end = new Date(d.getFullYear(), d.getMonth(), salaryDay - 1);
    }
    return { start, end };
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
    let expPaidVariable = 0, expPaidFixed = 0, expPending = 0;
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
            if (!inCycle(e.date) || !isRealized(e.date)) return;
            expPaidFixed += e.amount;
            expByCategory[e.category] = (expByCategory[e.category] || 0) + e.amount;
        });
        getPaidFixedIncomesAsIncome(monthDate).forEach(i => {
            if (!inCycle(i.date) || !isRealized(i.date)) return;
            incReceivedFixed += i.amount;
        });

        const maxDay = new Date(y, m + 1, 0).getDate();
        const dStrFor = (day) => `${y}-${String(m + 1).padStart(2, '0')}-${String(Math.min(day, maxDay)).padStart(2, '0')}`;

        getActiveFixedForMonth(monthDate).forEach(f => {
            const st = getEffectiveFixedStatus(f, monthDate).status;
            if (st === 'pago' || st === 'ignorado') return;
            const dStr = dStrFor(f.dayOfMonth);
            if (!inCycle(dStr) || isRealized(dStr)) return;
            expPending += getEffectiveFixedAmount(f, monthDate);
        });
        getActiveFixedIncomesForMonth(monthDate).forEach(fi => {
            if (getEffectiveFixedIncomeStatus(fi, monthDate).status === 'recebido') return;
            const dStr = dStrFor(fi.dayOfMonth);
            if (!inCycle(dStr) || isRealized(dStr)) return;
            incPending += getEffectiveFixedIncomeAmount(fi, monthDate);
        });
    }

    const incReceived = incReceivedVariable + incReceivedFixed;
    const expPaid = expPaidVariable + expPaidFixed;
    return {
        incReceived, incReceivedVariable, incReceivedFixed, incPending,
        expPaid, expPaidVariable, expPaidFixed, expPending,
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
    if (!salaryDay) { container.style.display = 'none'; return; }

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
    container.innerHTML = `
        <h3><i class="fas fa-calendar-week"></i> Ciclos de salário</h3>
        <p class="card-description">Análise entre salários — dia ${salaryDay} de cada mês</p>
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
    const totalExp = monthExp.reduce((s, e) => s + e.amount, 0);
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

function renderSavingsAnalysis() {
    const container = document.getElementById('savings-analysis');
    const monthExp = getEffectiveMonthExpenses(currentDate);
    const monthInc = getEffectiveMonthIncomes(currentDate);
    const prevExp = getPrevMonthExpenses();
    const tips = [];

    const totalIncome = monthInc.reduce((s, e) => s + e.amount, 0);
    const totalExpenses = monthExp.reduce((s, e) => s + e.amount, 0);

    // Income vs Expenses
    if (totalIncome > 0) {
        const savingsRate = ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(0);
        if (savingsRate < 10) {
            tips.push({
                type: 'alert',
                text: `Taxa de poupanca de apenas <strong>${savingsRate}%</strong>. O ideal e poupar pelo menos 20% do rendimento (${formatCurrency(totalIncome * 0.2)}).`
            });
        } else if (savingsRate >= 20) {
            tips.push({
                type: 'tip',
                text: `Excelente! Taxa de poupanca de <strong>${savingsRate}%</strong>. Esta a poupar ${formatCurrency(totalIncome - totalExpenses)} este mes.`
            });
        } else {
            tips.push({
                type: 'warning',
                text: `Taxa de poupanca de <strong>${savingsRate}%</strong>. Tente chegar aos 20% (faltam ${formatCurrency(totalIncome * 0.2 - (totalIncome - totalExpenses))}).`
            });
        }
    }

    // Category analysis
    const currByCategory = groupByCategory(monthExp);
    const prevByCategory = groupByCategory(prevExp);

    Object.entries(currByCategory).forEach(([cat, total]) => {
        const prevTotal = prevByCategory[cat] || 0;
        if (prevTotal > 0) {
            const increase = ((total - prevTotal) / prevTotal * 100).toFixed(0);
            if (increase > 20) {
                tips.push({
                    type: 'warning',
                    text: `<strong>${getEffectiveCategories()[cat]?.label}</strong> aumentou ${increase}% (de ${formatCurrency(prevTotal)} para ${formatCurrency(total)}). Verifique se ha gastos que pode reduzir.`
                });
            }
        }
    });

    // Non-essential
    const nonEssential = monthExp.filter(e => e.essential === false);
    const nonEssentialTotal = nonEssential.reduce((s, e) => s + e.amount, 0);
    if (nonEssentialTotal > 0) {
        const pct = (nonEssentialTotal / Math.max(totalExpenses, 1) * 100).toFixed(0);
        tips.push({
            type: nonEssentialTotal > 100 ? 'alert' : 'tip',
            text: `Gastos <strong>nao essenciais</strong> totalizam ${formatCurrency(nonEssentialTotal)} (${pct}% do total). ${nonEssentialTotal > 100 ? 'Considere reduzir estes gastos.' : 'Bom controlo!'}`
        });
    }

    // Subscriptions
    const subs = monthExp.filter(e => e.category === 'subscricoes');
    if (subs.length > 0) {
        const subsTotal = subs.reduce((s, e) => s + e.amount, 0);
        tips.push({
            type: 'tip',
            text: `Tem <strong>${subs.length} subscricoes</strong> a custar ${formatCurrency(subsTotal)}/mes. Verifique se usa todas.`
        });
    }

    // Restaurants vs cooking
    const restTotal = currByCategory['restaurantes'] || 0;
    const superTotal = currByCategory['supermercado'] || 0;
    if (restTotal > 0 && superTotal > 0 && restTotal > superTotal * 0.5) {
        tips.push({
            type: 'warning',
            text: `Gasta ${formatCurrency(restTotal)} em <strong>restaurantes</strong> (${(restTotal / (restTotal + superTotal) * 100).toFixed(0)}% do total alimentacao). Cozinhar mais pode poupar dinheiro.`
        });
    }

    if (tips.length === 0) {
        tips.push({ type: 'tip', text: 'Adicione mais despesas e receitas para obter analises de poupanca.' });
    }

    container.innerHTML = tips.map(t => `
        <div class="savings-item">
            <div class="savings-icon ${t.type}">
                <i class="fas ${t.type === 'tip' ? 'fa-lightbulb' : t.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation'}"></i>
            </div>
            <div class="savings-text">${t.text}</div>
        </div>
    `).join('');
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
    container.innerHTML = `
        <div class="attachment-thumb ${isPdf ? 'attachment-thumb-pdf' : ''}">
            ${isPdf ? '<i class="fas fa-file-pdf"></i>' : `<img src="${attachment.data}" alt="Anexo">`}
            <button class="remove-attachment" onclick="remove${containerId === 'attachment-preview' ? 'Pending' : 'PendingIncome'}Attachment()" type="button">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
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
    document.getElementById('modal-title').textContent = 'Nova Despesa';
    document.getElementById('expense-id').value = '';
    document.getElementById('expense-date').valueAsDate = new Date();
    document.getElementById('laura-split-group').style.display = 'none';
    document.getElementById('paid-by-father-group').style.display = 'none';
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
    document.getElementById('expense-is-grouped').checked = false;
    document.getElementById('modal-add').classList.add('active');
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
    const desc = document.getElementById('expense-desc').value;
    const catSelect = document.getElementById('expense-category');
    if (!catSelect || catSelect.value) return; // Don't override user choice
    const suggested = suggestCategoryFromDescription(desc);
    if (suggested && catSelect.querySelector(`option[value="${suggested}"]`)) {
        catSelect.value = suggested;
    }
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

    document.getElementById('modal-title').textContent = 'Editar Despesa';
    document.getElementById('expense-id').value = e.id;
    document.getElementById('expense-desc').value = e.description;
    document.getElementById('expense-amount').value = e.amount;
    document.getElementById('expense-date').value = e.date;
    document.getElementById('expense-category').value = e.category;
    document.getElementById('expense-notes').value = e.notes || '';
    document.getElementById('expense-with').value = (e.withPeople || []).join(', ');
    renderPeopleSuggestions();
    setupSpouseSplitUI(e);
    document.getElementById('expense-is-grouped').checked = !!e.isGrouped;
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
    } else {
        document.getElementById('laura-split-group').style.display = 'none';
        document.getElementById('paid-by-father-group').style.display = 'none';
    }

    pendingAttachment = e.attachment || null;
    renderAttachmentPreview('attachment-preview', pendingAttachment);

    document.getElementById('modal-add').classList.add('active');
}

function saveExpense(event) {
    event.preventDefault();
    const id = document.getElementById('expense-id').value;
    const type = document.querySelector('input[name="expense-type"]:checked').value;
    const isChild = children.some(c => c.id === type);
    const isMulti = type === 'multi';
    const split = isChild && document.querySelector('input[name="laura-split"]:checked')?.value === 'yes';

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
    const splitAcross = document.getElementById('split-across-children')?.checked || false;
    const splitChildrenIds = splitAcross
        ? Array.from(document.querySelectorAll('input[name="split-across-children"]:checked')).map(c => c.value)
        : [];

    const splitSpouse = isMarriedMode() && document.getElementById('split-with-spouse')?.checked;
    const spousePaid = splitSpouse && document.getElementById('spouse-paid')?.checked;
    const isGrouped = document.getElementById('expense-is-grouped')?.checked || false;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const dateVal = document.getElementById('expense-date').value;
    const notesVal = document.getElementById('expense-notes').value.trim();

    const expense = {
        id: id || generateId(),
        description: document.getElementById('expense-desc').value.trim(),
        amount,
        date: dateVal,
        category: document.getElementById('expense-category').value,
        type: type,
        split: split,
        paidByFather: split ? document.getElementById('paid-by-father').checked : false,
        splitSpouse,
        spousePaid,
        essential: document.querySelector('input[name="essential"]:checked').value === 'yes',
        notes: notesVal,
        withPeople,
        splitAcrossChildren: splitAcross && splitChildrenIds.length >= 2,
        splitChildrenIds,
        isGrouped,
        attachment: pendingAttachment || null,
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
            expense.createdAt = expenses[idx].createdAt;
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

    saveData();
    closeModal();
    pendingAttachment = null;
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
function deleteExpense() {
    expenses = expenses.filter(e => e.id !== pendingDeleteId);
    saveData();
    closeConfirm();
    updateAll();
    showToast('Despesa apagada');
}
function closeConfirm() {
    document.getElementById('modal-confirm').classList.remove('active');
    pendingDeleteId = null;
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

function shareWithCoParentById(childId) {
    const child = children.find(c => c.id === childId);
    if (!child) return;
    const monthExp = getEffectiveMonthExpenses(currentDate).filter(e => e.type === child.id && e.split);
    if (monthExp.length === 0) { showToast('Sem despesas partilhadas'); return; }

    const total = monthExp.reduce((s, e) => s + (e.fullAmount || e.amount), 0);
    const coParentShare = total * (child.splitPct / 100);
    const paid = monthExp.filter(e => e.paidByFather).reduce((s, e) => s + (e.fullAmount || e.amount) * (child.splitPct / 100), 0);
    const pending = coParentShare - paid;

    const text = `Despesas de ${child.name} - ${getMonthLabel(currentDate)}\n\n` +
        monthExp.map(e => `- ${formatDate(e.date)}: ${e.description} - ${formatCurrency(e.fullAmount || e.amount)}${e.attachment ? ' [fatura anexada]' : ''}`).join('\n') +
        `\n\nTotal: ${formatCurrency(total)}\nA tua parte (${child.splitPct}%): ${formatCurrency(coParentShare)}\n` +
        (paid > 0 ? `Ja pagaste: ${formatCurrency(paid)}\n` : '') +
        (pending > 0 ? `Em falta: ${formatCurrency(pending)}` : 'Tudo pago!');

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
    const totalExpenses = monthExp.reduce((s, e) => s + e.amount, 0);
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
    populateCategorySelects();
    document.getElementById('profile-name').value = getUserName();
    document.getElementById('profile-title').value = getAppTitle();
    const modeRadio = document.querySelector(`input[name="household-mode"][value="${getHouseholdMode()}"]`);
    if (modeRadio) modeRadio.checked = true;
    const spouseNameEl = document.getElementById('profile-spouse-name');
    const spousePctEl = document.getElementById('profile-spouse-pct');
    if (spouseNameEl) spouseNameEl.value = localStorage.getItem(SPOUSE_NAME_KEY) || '';
    if (spousePctEl) spousePctEl.value = getSpousePct();
    // Live-update spouse settings visibility when mode changes (before Guardar)
    toggleSpouseSettingsUI();
    document.querySelectorAll('input[name="household-mode"]').forEach(r => {
        r.onchange = toggleSpouseSettingsUI;
    });
}

function toggleSpouseSettingsUI() {
    const mode = document.querySelector('input[name="household-mode"]:checked')?.value;
    const group = document.getElementById('spouse-settings');
    if (group) group.style.display = mode === 'married' ? 'block' : 'none';
    document.getElementById('modal-settings').classList.add('active');
}

function openFixedManagerModal() {
    renderFixedList();
    document.getElementById('modal-fixed-manager').classList.add('active');
}
function closeFixedManagerModal() {
    document.getElementById('modal-fixed-manager').classList.remove('active');
}
function openFixedIncomeManagerModal() {
    renderFixedIncomeList();
    document.getElementById('modal-fixed-income-manager').classList.add('active');
}
function closeFixedIncomeManagerModal() {
    document.getElementById('modal-fixed-income-manager').classList.remove('active');
}

function saveProfileName() {
    const name = document.getElementById('profile-name').value.trim();
    const title = document.getElementById('profile-title').value.trim();
    const mode = document.querySelector('input[name="household-mode"]:checked')?.value || 'separated';
    if (!name) { showToast('Introduza um nome'); return; }
    localStorage.setItem(USER_NAME_KEY, name);
    if (title) localStorage.setItem(APP_TITLE_KEY, title);
    localStorage.setItem(HOUSEHOLD_MODE_KEY, mode);
    // Spouse settings (only relevant in married mode but save anyway)
    const spouseName = document.getElementById('profile-spouse-name')?.value.trim();
    const spousePct = parseInt(document.getElementById('profile-spouse-pct')?.value);
    if (spouseName) localStorage.setItem(SPOUSE_NAME_KEY, spouseName);
    if (!isNaN(spousePct)) localStorage.setItem(SPOUSE_PCT_KEY, String(spousePct));
    // Salary day
    const sdInput = document.getElementById('profile-salary-day');
    if (sdInput) {
        const sd = parseInt(sdInput.value);
        salaryDay = (sd >= 1 && sd <= 31) ? sd : null;
        if (salaryDay) localStorage.setItem('vanessa_salary_day', salaryDay);
        else localStorage.removeItem('vanessa_salary_day');
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
        const typeLabel = child ? child.name : 'Pessoal';
        return `
            <div class="fixed-item">
                <div class="fixed-icon"><i class="fas ${cat.icon}"></i></div>
                <div class="fixed-info">
                    <div class="fixed-desc">${f.description}${varBadge}${splitBadge}</div>
                    <div class="fixed-meta">Dia ${f.dayOfMonth} &middot; ${typeLabel} &middot; desde ${f.startDate}${endLabel}</div>
                </div>
                <div class="fixed-amount">${formatCurrency(f.amount)}</div>
                <div class="expense-actions">
                    <button class="btn-icon" onclick="editFixed('${f.id}')" style="color:var(--primary)"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon" onclick="duplicateFixed('${f.id}')" title="Duplicar"><i class="fas fa-copy"></i></button>
                    <button class="btn-icon" onclick="confirmDeleteFixed('${f.id}')" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
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
    document.getElementById('fixed-modal').classList.add('active');
}

function saveFixed(event) {
    event.preventDefault();
    const id = document.getElementById('fixed-id').value;
    const ftype = document.querySelector('input[name="fixed-type"]:checked').value;
    const isChild = children.some(c => c.id === ftype);
    const fixed = {
        id: id || generateId(),
        description: document.getElementById('fixed-desc').value.trim(),
        amount: parseFloat(document.getElementById('fixed-amount').value),
        dayOfMonth: parseInt(document.getElementById('fixed-day').value),
        category: document.getElementById('fixed-category').value,
        type: ftype,
        split: isChild ? (document.querySelector('input[name="fixed-split"]:checked')?.value === 'yes') : false,
        isVariable: document.getElementById('fixed-is-variable').checked,
        startDate: document.getElementById('fixed-start').value,
        endDate: document.getElementById('fixed-end').value || null,
        notes: document.getElementById('fixed-notes').value.trim(),
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
    if (hasPastData) {
        document.getElementById('confirm-message').textContent = `"${f.description}" tem dados em meses anteriores. Sera desativada a partir deste mes (historico fica guardado).`;
        confirmBtn.textContent = 'Desativar';
        confirmBtn.onclick = () => {
            const idx = fixedExpenses.findIndex(x => x.id === id);
            if (idx >= 0) fixedExpenses[idx].endDate = prevMonthKey;
            saveData();
            closeConfirm();
            renderFixedList();
            updateAll();
            showToast('Despesa fixa desativada');
        };
    } else {
        document.getElementById('confirm-message').textContent = `Apagar despesa fixa "${f.description}"? Nao afeta despesas ja registadas.`;
        confirmBtn.textContent = 'Apagar';
        confirmBtn.onclick = () => {
            fixedExpenses = fixedExpenses.filter(x => x.id !== id);
            fixedStatus = fixedStatus.filter(s => s.fixedId !== id);
            saveData();
            closeConfirm();
            renderFixedList();
            updateAll();
            showToast('Despesa fixa removida');
        };
    }
    document.getElementById('modal-confirm').classList.add('active');
}

function closeFixedModal() { document.getElementById('fixed-modal').classList.remove('active'); }

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
    populateCategorySelects();
    document.getElementById('fixed-income-category').value = fi.category || 'ordenado';
    document.getElementById('modal-fixed-income').classList.add('active');
}

function saveFixedIncome(event) {
    event.preventDefault();
    const id = document.getElementById('fixed-income-id').value;
    const fi = {
        id: id || generateId(),
        description: document.getElementById('fixed-income-desc').value.trim(),
        amount: parseFloat(document.getElementById('fixed-income-amount').value),
        dayOfMonth: parseInt(document.getElementById('fixed-income-day').value),
        category: document.getElementById('fixed-income-category').value,
        startDate: document.getElementById('fixed-income-start').value,
        endDate: document.getElementById('fixed-income-end').value || null,
        notes: document.getElementById('fixed-income-notes').value.trim(),
        isVariable: document.getElementById('fixed-income-is-variable').checked,
        onlyOnDay: document.getElementById('fixed-income-only-on-day').checked,
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
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMonthFile(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

function groupByCategory(expenseList) {
    const result = {};
    expenseList.forEach(e => {
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
