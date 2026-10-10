/* Abuja Life — instalment loans from banks and microfinance lenders.
   Approval looks at your weekly income (salary + businesses), credit score
   and existing loans. Repayments are taken from your bank account every
   Monday morning; missing one hurts your credit score. */
(function (AL) {
  'use strict';
  const fmt = AL.fmt;
  const S = () => AL.S;
  const Cr = {};

  Cr.loans = () => (Array.isArray(S().loans) ? S().loans : (S().loans = []));
  Cr.weeklyIncome = () => {
    const s = S(), c = AL.Life.career();
    let inc = c ? AL.Life.careerPay(c, s.career.lvl) * c.days.length : 0;
    Object.entries(s.biz || {}).forEach(([id, v]) => { const b = AL.BIZ.find((x) => x.id === id); if (b) inc += AL.bizProfit(b, v.lvl) * 7 * 0.9; });
    return Math.round(inc);
  };
  Cr.instalmentsDue = () => Cr.loans().reduce((a, l) => a + l.weekly, 0);
  Cr.quote = (lenderId, amount, weeks) => {
    const L = AL.LENDERS[lenderId];
    const total = Math.round(amount * (1 + L.rate * (weeks / 12)));
    return { total, weekly: Math.ceil(total / weeks / 100) * 100, rate: L.rate };
  };
  /* returns { ok, reasons[], max, ...quote } */
  Cr.assess = (lenderId, amount, weeks) => {
    const L = AL.LENDERS[lenderId], s = S(), q = Cr.quote(lenderId, amount, weeks);
    const inc = Cr.weeklyIncome(), room = inc * AL.AFFORD - Cr.instalmentsDue();
    const reasons = [];
    if (s.credit < L.minCredit) reasons.push('Credit score ' + s.credit + ' is below ' + L.minCredit + '.');
    if (!inc) reasons.push('No regular income. Get a salaried job or own a business first.');
    else if (q.weekly > room) reasons.push('Repayments of ' + fmt(q.weekly) + '/week are more than 40% of your income (' + fmt(inc) + '/week) after existing loans.');
    if (Cr.loans().some((l) => l.lender === lenderId)) reasons.push('You already have a loan with ' + L.name + '.');
    if (s.loan) reasons.push('Clear your QuickLoan from the Bank app first.');
    // largest amount that would pass the income test for this term
    const per = Cr.quote(lenderId, 100000, weeks).weekly / 100000;
    const max = Math.max(0, Math.floor((room / per) / 50000) * 50000);
    return { ok: !reasons.length, reasons, max, inc, ...q };
  };
  Cr.take = (lenderId, amount, weeks) => {
    const a = Cr.assess(lenderId, amount, weeks); if (!a.ok) return AL.toast(a.reasons[0]);
    const L = AL.LENDERS[lenderId];
    Cr.loans().push({ lender: lenderId, amount, weeks, left: weeks, weekly: a.weekly, bal: a.total, missed: 0, day: AL.day() });
    AL.Life.credit(amount, L.name + ' loan disbursed');
    AL.msg(L.name, 'Approved! ' + fmt(amount) + ' is in your account. ' + weeks + ' weekly repayments of ' + fmt(a.weekly) + ' start next Monday.', 'bank');
    AL.log('Took a ' + fmt(amount) + ' loan from ' + L.name + ' over ' + weeks + ' weeks.');
    AL.toast('Loan approved: ' + fmt(amount), 'money'); AL.Life.mood(3);
    AL.commit();
  };
  Cr.payOff = (i) => {
    const s = S(), l = Cr.loans()[i]; if (!l) return;
    if (s.savings < l.bal) return AL.toast('You need ' + fmt(l.bal) + ' in your bank account.');
    s.savings -= l.bal; AL.tx('Loan payoff: ' + AL.LENDERS[l.lender].name, -l.bal);
    Cr.loans().splice(i, 1); s.credit = Math.min(850, s.credit + 20);
    AL.msg(AL.LENDERS[l.lender].name, 'Loan paid off early. Thank you! Your credit score went up.', 'bank');
    AL.commit();
  };
  /* Monday morning repayments */
  AL.on('newday', () => {
    if (AL.weekday() !== 1) return;
    const s = S();
    Cr.loans().slice().forEach((l) => {
      const L = AL.LENDERS[l.lender], due = Math.min(l.weekly, l.bal);
      if (s.savings >= due) {
        s.savings -= due; l.bal -= due; l.left -= 1; AL.tx('Loan repayment: ' + L.name, -due);
        if (l.bal <= 0 || l.left <= 0) { Cr.loans().splice(Cr.loans().indexOf(l), 1); s.credit = Math.min(850, s.credit + 30); AL.msg(L.name, 'Final repayment received. Your loan is closed and your credit score improved.', 'bank'); }
      } else {
        l.missed += 1; l.bal = Math.round(l.bal * 1.05); s.credit = Math.max(300, s.credit - 25);
        AL.msg(L.name, 'Missed repayment of ' + fmt(due) + '. A 5% penalty was added. Balance ' + fmt(l.bal) + '.', 'warn');
      }
    });
  });
  // net worth counts loan balances as debt
  const base = AL.worth;
  AL.worth = (s = AL.S) => base(s) - (Array.isArray(s.loans) ? s.loans.reduce((a, l) => a + (Number(l.bal) || 0), 0) : 0);
  AL.Credit = Cr;
})(window.AL);
