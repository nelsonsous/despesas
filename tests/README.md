# Testes (jsdom)

Requisitos: `npm install jsdom` (em qualquer pasta; ajusta o require se necessário).

- `node tests/smoke-cycle.js` — arranca a app completa com dados sintéticos
  ("hoje" fixado em 2026-06-10) e valida o resumo do ciclo: rótulo "Acerto de
  contas", badge de fixas pagas sem data, linhas "Fixas por pagar"/"Livre até
  final do ciclo", ordenação por hora de registo e o helper getFixedCashOutDate.
- `node tests/validate-backup.js [YYYY-MM-DD] [caminho/backup.json]` — arranca a
  app com um backup real (NUNCA comitar backups: têm dados pessoais) e imprime
  saldos por conta, reconciliações entre snapshots e estatísticas do ciclo,
  para validação manual contra a app no telemóvel.
