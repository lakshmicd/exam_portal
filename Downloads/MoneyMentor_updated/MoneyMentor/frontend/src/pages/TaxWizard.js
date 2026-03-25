/**
 * TaxWizard.js — Old vs new regime comparison + AI recommendations.
 */
import { UserState } from '../state.js';
import { analyseTax } from '../api.js';
import { showLoading, hideLoading } from '../components/LoadingOverlay.js';
import { navigateTo } from '../main.js';
import { fmt, fmtRupee, aiBox, createInsightCards, calcTaxOld, calcTaxNew } from '../utils.js';

export function renderTaxWizard(container) {
  if (!UserState.ready) {
    container.innerHTML = `<div class="page-hdr"><div class="page-title">Tax Wizard</div></div>
      <div style="text-align:center;padding:2rem;">
        <p style="color:var(--ink-60);font-size:13px;">Complete your profile to unlock Tax Wizard.</p>
        <button class="btn btn-gold" style="margin-top:1rem;" id="go-h">Set Up Profile →</button>
      </div>`;
    container.querySelector('#go-h').addEventListener('click', () => navigateTo('health'));
    return;
  }

  const U = UserState;
  container.innerHTML = `
    <div class="page-hdr">
      <div class="page-title">Tax Wizard</div>
      <div class="page-sub">AI identifies every rupee you're leaving on the table — FY 2024-25</div>
    </div>
    <div class="g2">
      <div>
        <div class="card" style="margin-bottom:1rem;animation:slideInUp 0.5s ease 0.05s both;">
          <div class="card-title">Salary Structure</div>
          <div class="form-row">
            <div class="fg"><label>Gross Salary</label><div class="pfx"><span class="pfx-sym">₹</span><input id="t-gross" type="number" value="${U.income}" oninput="window._updateTax()"/></div></div>
            <div class="fg"><label>80C Invested</label><div class="pfx"><span class="pfx-sym">₹</span><input id="t-80c" type="number" value="${U.invested80c}" oninput="window._updateTax()"/></div></div>
          </div>
          <div class="form-row">
            <div class="fg"><label>NPS Contribution</label><div class="pfx"><span class="pfx-sym">₹</span><input id="t-nps" type="number" value="0" oninput="window._updateTax()"/></div></div>
            <div class="fg"><label>80D Health Premium</label><div class="pfx"><span class="pfx-sym">₹</span><input id="t-80d" type="number" value="${U.premium}" oninput="window._updateTax()"/></div></div>
          </div>
          <div class="form-row">
            <div class="fg"><label>Home Loan Interest</label><div class="pfx"><span class="pfx-sym">₹</span><input id="t-hl" type="number" value="0" oninput="window._updateTax()"/></div></div>
            <div class="fg"><label>HRA Exemption</label><div class="pfx"><span class="pfx-sym">₹</span><input id="t-hra" type="number" value="${U.hra > 0 ? Math.round(Math.min(U.hra, U.rentPaid)) : 0}" oninput="window._updateTax()"/></div></div>
          </div>
          <button class="btn btn-gold btn-full" id="tax-ai-btn">🤖 Get AI Tax Analysis</button>
        </div>
        <div class="card" style="animation:slideInUp 0.5s ease 0.1s both;">
          <div class="card-title">Deductions Found</div>
          <div id="tax-deds"></div>
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom:1rem;animation:slideInUp 0.5s ease 0.15s both;">
          <div class="card-title">Old vs New Regime</div>
          <div id="tax-regime"></div>
        </div>
        <div class="card" id="tax-ai-card" style="display:none;animation:slideInUp 0.5s ease 0.2s both;">
          <div class="card-title">AI Tax Recommendations</div>
          <div id="tax-ai-content"></div>
        </div>
      </div>
    </div>`;

  // expose updater globally so inline oninput works
  window._updateTax = updateTax;
  document.getElementById('tax-ai-btn').addEventListener('click', runTaxAI);
  updateTax();
}

function updateTax() {
  const g = id => parseFloat(document.getElementById(id)?.value) || 0;
  const gross = g('t-gross');
  const c80   = g('t-80c');
  const nps   = g('t-nps');
  const d80   = g('t-80d');
  const hl    = g('t-hl');
  const hra   = g('t-hra');
  const std   = 50000;

  const oldTaxable = Math.max(0, gross - std - Math.min(c80, 150000) - Math.min(nps, 50000) - Math.min(d80, 25000) - Math.min(hl, 200000) - hra);
  const newTaxable = Math.max(0, gross - 75000);
  const oldTax = calcTaxOld(oldTaxable);
  const newTax = calcTaxNew(newTaxable);
  const winner = oldTax <= newTax ? 'old' : 'new';

  document.getElementById('tax-regime').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;">
      <div class="regime-card ${winner === 'old' ? 'winner' : ''}">
        ${winner === 'old' ? `<div class="rec-badge">Recommended ✓</div>` : ''}
        <div class="regime-lbl">Old Regime</div>
        <div class="regime-tax">₹${fmt(oldTax)}</div>
        <div style="font-size:11px;color:var(--ink-60);">Eff. ${(oldTax / gross * 100).toFixed(1)}%</div>
      </div>
      <div class="vs-dot">VS</div>
      <div class="regime-card ${winner === 'new' ? 'winner' : ''}">
        ${winner === 'new' ? `<div class="rec-badge">Recommended ✓</div>` : ''}
        <div class="regime-lbl">New Regime</div>
        <div class="regime-tax">₹${fmt(newTax)}</div>
        <div style="font-size:11px;color:var(--ink-60);">Eff. ${(newTax / gross * 100).toFixed(1)}%</div>
      </div>
    </div>
    <div style="margin-top:10px;padding:8px 12px;background:${winner==='old'?'var(--emerald-light)':'var(--blue-light)'};border-radius:8px;font-size:12px;color:${winner==='old'?'var(--emerald)':'var(--blue)'};">
      ${winner === 'old'
        ? `Old regime saves you <strong>₹${fmt(newTax - oldTax)}</strong> this year.`
        : `New regime saves you <strong>₹${fmt(oldTax - newTax)}</strong> this year.`}
    </div>`;

  const remaining80c = Math.max(0, 150000 - c80);
  const missedNPS    = Math.max(0, 50000 - nps);
  const missed80d    = Math.max(0, 25000 - d80);

  document.getElementById('tax-deds').innerHTML = `
    <div class="ded-row"><div>Standard Deduction</div><div class="ded-amt">₹${fmt(std)}</div></div>
    <div class="ded-row">
      <div><div>Section 80C</div><div style="font-size:10px;color:var(--ink-60);">₹${fmt(c80)} of ₹1,50,000 used</div></div>
      <div style="text-align:right;"><div class="ded-amt">₹${fmt(Math.min(c80,150000))}</div>${remaining80c > 0 ? `<div style="font-size:10px;color:var(--crimson);">₹${fmt(remaining80c)} remaining!</div>` : ''}</div>
    </div>
    ${nps > 0 ? `<div class="ded-row"><div>NPS 80CCD(1B)</div><div class="ded-amt">₹${fmt(Math.min(nps,50000))}</div></div>` : ''}
    ${missedNPS > 0 ? `<div class="ded-row" style="background:rgba(192,57,43,0.03);border-radius:5px;padding:6px;">
      <div><div style="color:var(--crimson);">NPS 80CCD(1B) — UNCLAIMED</div><div style="font-size:10px;color:var(--crimson);">Saves ₹${fmt(Math.round(missedNPS * 0.3))}</div></div>
      <div class="ded-amt" style="color:var(--crimson);">₹0</div></div>` : ''}
    ${hra > 0 ? `<div class="ded-row"><div>HRA Exemption</div><div class="ded-amt">₹${fmt(hra)}</div></div>` : ''}
    ${d80 > 0 ? `<div class="ded-row"><div>Section 80D</div><div class="ded-amt">₹${fmt(Math.min(d80,25000))}</div></div>` : ''}
    ${missed80d > 0 ? `<div class="ded-row"><div><div style="color:var(--gold-dark);">Health Insurance 80D</div><div style="font-size:10px;color:var(--ink-60);">Saves ₹${fmt(Math.round(missed80d*0.3))}</div></div><div style="color:var(--gold-dark);font-size:12px;">Unclaimed</div></div>` : ''}
    ${hl > 0 ? `<div class="ded-row"><div>Home Loan Interest 24(b)</div><div class="ded-amt">₹${fmt(Math.min(hl,200000))}</div></div>` : ''}`;
}

async function runTaxAI() {
  showLoading('Analysing your tax situation...');
  try {
    const g = id => parseFloat(document.getElementById(id)?.value) || 0;
    const recs = await analyseTax({
      profile: UserState.toJSON(),
      grossSalary:      g('t-gross'),
      invested80c:      g('t-80c'),
      npsContribution:  g('t-nps'),
      premium80d:       g('t-80d'),
      homeLoanInterest: g('t-hl'),
      hraExemption:     g('t-hra'),
    });
    hideLoading();
    document.getElementById('tax-ai-card').style.display = 'block';
    document.getElementById('tax-ai-content').innerHTML = createInsightCards(UserState) + aiBox(recs, 'FY 2024-25 analysis');
  } catch (e) {
    hideLoading();
    document.getElementById('tax-ai-card').style.display = 'block';
    document.getElementById('tax-ai-content').innerHTML = `<div class="alert alert-err">⚠️ ${e.message}</div>`;
  }
}
