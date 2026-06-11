// Smoke test: load the real index.html + app.js in jsdom with seeded data,
// render the cycle, and assert the three v298 features + v296 ordering.
const fs = require('fs');
const path = require('path').join(__dirname, '..') + '/';
const { JSDOM } = require('jsdom');

let html = fs.readFileSync(path + 'index.html', 'utf8');

const seed = {
    despesas_salary_day: '23',
    despesas_cycle_section_open: '1',
    despesas_migrated_v1: '1',
    despesas_migrated_dedup_v1: '1',
    despesas_migrated_savwd_v2: '1',
    despesas_accounts: JSON.stringify([
        { id: 'acc1', name: 'Moey', initialBalance: 500, initialBalanceDate: '2026-06-04', color: '#7E57C2' }
    ]),
    // Array order deliberately scrambled vs createdAt to prove the sort uses createdAt
    despesas_despesas: JSON.stringify([
        { id: 'e3', description: 'Mercadona', amount: 103.90, category: 'supermercado', date: '2026-06-10', accountId: 'acc1', createdAt: '2026-06-10T18:00:00.000Z', type: 'personal' },
        { id: 'e1', description: 'Auchan', amount: 50.77, category: 'supermercado', date: '2026-06-10', accountId: 'acc1', createdAt: '2026-06-10T10:00:00.000Z', type: 'personal' },
        { id: 'e2', description: 'Leitao', amount: 85.00, category: 'restaurantes', date: '2026-06-10', accountId: 'acc1', createdAt: '2026-06-10T13:00:00.000Z', type: 'personal' }
    ]),
    despesas_fixas: JSON.stringify([
        { id: 'f1', description: 'Colegio', amount: 159, category: 'educacao', dayOfMonth: 28, accountId: 'acc1', startDate: '2026-01', type: 'personal' },
        { id: 'f2', description: 'EDP', amount: 56.50, category: 'casa', dayOfMonth: 16, accountId: 'acc1', startDate: '2026-01', type: 'personal' },
        { id: 'f3', description: 'Agua', amount: 29.83, category: 'casa', dayOfMonth: 20, accountId: 'acc1', startDate: '2026-01', type: 'personal' }
    ]),
    // f1 confirmed in the past; f2 marked paid WITHOUT date and due Jun 16 (future)
    // -> only f2 must trigger the badge; f3 stays pending.
    despesas_fixas_status: JSON.stringify([
        { fixedId: 'f1', month: '2026-05', status: 'pago', paidDate: '2026-05-28' },
        { fixedId: 'f2', month: '2026-06', status: 'pago' }
    ])
};

const dom = new JSDOM(html, {
    url: 'https://example.com/despesas/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    beforeParse(window) {
        for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, v);
        window.HTMLCanvasElement.prototype.getContext = () => null;
        window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
        window.scrollTo = () => {};
    }
});
const { window } = dom;

// Pin "today" to 2026-06-10 inside the page so the test is deterministic.
window.eval(`
    const _RealDate = Date;
    Date = class extends _RealDate {
        constructor(...args) { if (args.length === 0) { super('2026-06-10T12:00:00'); } else { super(...args); } }
        static now() { return new _RealDate('2026-06-10T12:00:00').getTime(); }
    };
`);

window.eval(fs.readFileSync(path + 'app.js', 'utf8'));

let initError = null;
try {
    window.eval('loadData(); updateAll();');
} catch (e) {
    initError = e.message;
    try { window.eval('renderCycleExpenses();'); } catch (e2) { console.error('FATAL: renderCycleExpenses failed:', e2.message); process.exit(1); }
}

const body = window.document.getElementById('cycle-expenses-body');
const htmlOut = body ? body.innerHTML : '';
const text = body ? body.textContent.replace(/\s+/g, ' ') : '';

let pass = 0, fail = 0;
const check = (name, cond, detail) => {
    if (cond) { pass++; console.log('  PASS  ' + name); }
    else { fail++; console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
};

console.log(initError ? '(updateAll threw: ' + initError + ' — tested via direct render)' : '(full updateAll ran clean)');
console.log('--- Feature 1: label rename ---');
check('no "Face ao previsto" in UI', !htmlOut.includes('Face ao previsto'));
check('"Acerto de contas" row present', htmlOut.includes('Acerto de contas'));

console.log('--- Feature 2: unconfirmed badge ---');
check('badge shows "1 fixa paga sem data confirmada"', text.includes('1 fixa paga sem data confirmada'));
check('badge opens openUnconfirmedFixedModal', htmlOut.includes('openUnconfirmedFixedModal()'));
window.eval('openUnconfirmedFixedModal();');
const modal = window.document.getElementById('modal-confirm');
check('modal lists future-due EDP with Confirmar data', modal.innerHTML.includes('EDP') && modal.innerHTML.includes('Confirmar data'));
check('modal item opens date picker for f2 at its scheduled day', modal.innerHTML.includes("openFixedPaidDateModal('f2','2026-06-16')"));
check('past-confirmed Colegio not listed', !modal.innerHTML.includes('Colegio'));
check('pending Agua not listed', !modal.innerHTML.includes('Agua'));

console.log('--- Feature 3: resto do ciclo ---');
check('shows "Fixas por pagar" 29,83 (only pending Agua)', /Fixas por pagar.*?29,83/.test(text), (text.match(/Fixas por pagar.{0,40}/) || [''])[0]);
// currentTotal = 500 - 239.67 = 260.33: f1 cash-out May 28 predates the
// initial balance; f2 paid-no-date now assumes its scheduled Jun 16 (future).
check('Total = 260,33', /Total[^0-9]*260,33/.test(text), 'text around Total: ' + (text.match(/Total.{0,30}/) || [''])[0]);
// livre = 260.33 - 29.83 = 230.50
check('Livre até final = 230,50', text.includes('Livre até final do ciclo') && /Livre até final do ciclo[^0-9]*230,50/.test(text), (text.match(/Livre.{0,40}/) || [''])[0]);

console.log('--- v296 regression: createdAt ordering ---');
const iM = htmlOut.indexOf('Mercadona'), iL = htmlOut.indexOf('Leitao'), iA = htmlOut.indexOf('Auchan');
check('display order Mercadona > Leitao > Auchan (newest registered on top)', iM !== -1 && iM < iL && iL < iA, `idx M=${iM} L=${iL} A=${iA}`);
// Ledger: Auchan deducted first: 260.33+239.67=500 opening-ish? running uses cycle opening (0) -> after Auchan -50.77, Leitao -135.77, Mercadona -239.67
const balances = [...htmlOut.matchAll(/">= ([^<]+)<\/div>/g)]
    .map(m => parseFloat(m[1].replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.')));
console.log('  running balances (top to bottom):', balances.join(' | '));
// 4 realized rows: Mercadona, Leitao, Auchan (10 Jun, newest registration on
// top) and May's confirmed Colegio at the bottom. EDP (paid, cash-out Jun 16
// future) and Agua (pending) must carry no balance. Reading upward, each
// row's delta must equal its own amount -> ledger walks registration order.
const dif = (i) => +(balances[i] - balances[i + 1]).toFixed(2);
check('ledger deducts in registration order', balances.length === 4
    && dif(0) === -103.90 && dif(1) === -85.00 && dif(2) === -50.77,
    `diffs: ${balances.length === 4 ? [dif(0), dif(1), dif(2)].join(', ') : 'count=' + balances.length}`);

console.log('--- scheduled-day cash-out helper ---');
const ppr = window.eval("getFixedCashOutDate({ dayOfMonth: 7 }, { month: '2026-06' })");
check('PPR-style day-7 fixed assumes the 7th, not the 28th', ppr === '2026-06-07', 'got ' + ppr);
const lwd = window.eval("getFixedCashOutDate({ paymentMode: 'last-working-day' }, { month: '2026-05' })");
check('last-working-day mode resolves to 2026-05-29 (Friday)', lwd === '2026-05-29', 'got ' + lwd);
const explicit = window.eval("getFixedCashOutDate({ dayOfMonth: 7 }, { month: '2026-06', paidDate: '2026-06-02' })");
check('explicit paidDate still wins', explicit === '2026-06-02', 'got ' + explicit);

console.log('--- modal copy ---');
window.eval('openCycleDiffModal && window._cycleDiffStats && openCycleDiffModal();');
check('diff modal titled Acerto de contas + não-é-orçamento note', modal.innerHTML.includes('Acerto de contas') && modal.innerHTML.includes('Não é um orçamento'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
