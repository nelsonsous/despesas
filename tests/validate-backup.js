// Full validation of the real 2026-06-10 backup against app v299.
// Seeds localStorage with the backup (same keys the app persists), boots the
// app, and dumps app-computed numbers for accounts/reconciliation/cycle.
const fs = require('fs');
const { JSDOM } = require('jsdom');
const backup = JSON.parse(fs.readFileSync(process.argv[3] || '/tmp/backup.json', 'utf8'));
const PIN = process.argv[2] || '2026-06-10';

const J = JSON.stringify;
const seed = {
    despesas_despesas: J(backup.expenses || []),
    despesas_receitas: J(backup.incomes || []),
    despesas_fixas: J(backup.fixedExpenses || []),
    despesas_fixas_status: J(backup.fixedStatus || []),
    despesas_fixas_receitas: J(backup.fixedIncomes || []),
    despesas_fixas_receitas_status: J(backup.fixedIncomeStatus || []),
    despesas_filhos: J(backup.children || []),
    despesas_cat_despesas: J(backup.customCategories || {}),
    despesas_cat_receitas: J(backup.customIncCategories || {}),
    despesas_templates: J(backup.expenseTemplates || []),
    despesas_budgets: J(backup.categoryBudgets || {}),
    despesas_accounts: J(backup.accounts || []),
    despesas_transfers: J(backup.transfers || []),
    despesas_savings_goals: J(backup.savingsGoals || []),
    despesas_balance_snapshots: J(backup.balanceSnapshots || []),
    despesas_prepaid_cards: J(backup.prepaidCards || []),
    despesas_cycle_opening_overrides: J(backup.cycleOpeningOverrides || {}),
    despesas_forecast_cfg: J(backup.forecastCfg || {}),
    despesas_bank_mappings: J(backup.bankMappings || []),
    despesas_salary_day: backup.settings?.salaryDay || '',
    despesas_salary_mode: backup.settings?.salaryMode || '',
    despesas_household_mode: backup.settings?.householdMode || '',
    despesas_cycle_section_open: '1',
    despesas_migrated_v1: '1',
    despesas_migrated_dedup_v1: '1',
    despesas_migrated_savwd_v2: '1'
};
if (backup.netWorth) seed.despesas_net_worth = J(backup.netWorth);

const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
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
window.eval(`
    const _RealDate = Date;
    Date = class extends _RealDate {
        constructor(...args) { if (args.length === 0) { super('${PIN}T12:00:00'); } else { super(...args); } }
        static now() { return new _RealDate('${PIN}T12:00:00').getTime(); }
    };
`);
// Top-level `let` bindings live in each eval call's own lexical environment,
// so append an accessor that closes over app.js's scope.
window.eval(fs.readFileSync(require('path').join(__dirname, '..', 'app.js'), 'utf8')
    + ';window.__app = () => ({ accounts, balanceSnapshots, expenses, fixedExpenses, fixedStatus });');
window.eval('loadData(); updateAll();');

const out = window.eval(`(() => {
    const { accounts, balanceSnapshots } = window.__app();
    const res = { pin: '${PIN}', accounts: [], cycle: null, unconfirmed: window._unconfirmedFixedRows || [], reconcile: {} };
    accounts.forEach(a => {
        const snaps = balanceSnapshots.filter(s => s.accountId === a.id).sort((x, y) => y.date.localeCompare(x.date));
        const latest = snaps[0] || null;
        res.accounts.push({ name: a.name, isSavings: !!a.isSavings, balance: +getAccountBalance(a.id).toFixed(2),
            latestSnap: latest ? { date: latest.date, amount: latest.amount } : null });
        const toSnap = snaps[0];
        let fromSnap = snaps[1];
        if (!fromSnap && a.initialBalanceDate) fromSnap = { amount: a.initialBalance || 0, date: a.initialBalanceDate };
        if (toSnap && fromSnap) {
            const r = reconcileAccount(a.id, fromSnap, toSnap);
            res.reconcile[a.name] = { window: fromSnap.date + ' -> ' + toSnap.date,
                calculated: +r.calculated.toFixed(2), actual: r.actual, diff: +r.diff.toFixed(2),
                paidIncome: +r.paidIncome.toFixed(2), paidExpense: +r.paidExpense.toFixed(2),
                transfersNet: +r.paidTransfersNet.toFixed(2), savingsNet: +r.savingsNet.toFixed(2) };
        }
    });
    const s = window._cycleDiffStats;
    if (s) res.cycle = { currentTotal: +s.currentTotal.toFixed(2), closingBalance: +s.closingBalance.toFixed(2),
        cycleBalDiff: +s.cycleBalDiff.toFixed(2), opening: +s.opening.toFixed(2),
        cycleStart: toLocalDateStr(s.cycleStart),
        perAccount: s.accounts.map(a => ({ name: a.name, bal: +a.bal.toFixed(2), gap: a.gap === null ? null : +a.gap.toFixed(2) })) };
    const body = document.getElementById('cycle-expenses-body');
    const text = body ? body.textContent.replace(/\\s+/g, ' ') : '';
    res.stripText = (text.match(/Total.{0,220}/) || [''])[0];
    return JSON.stringify(res, null, 1);
})()`);
console.log(out);
