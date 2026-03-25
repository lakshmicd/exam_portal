/**
 * FirePlanner.js — FIRE calculator with live math and AI analysis.
 */
import { UserState } from '../state.js';
import { analyseFire } from '../api.js';
import { showLoading, hideLoading } from '../components/LoadingOverlay.js';
import { navigateTo } from '../main.js';
import { fmtRupee, fmtCr, fmt, metricCard, aiBox, createInsightCards, calcRequiredSIP } from '../utils.js';

export function renderFirePlanner(container) {
  if (!UserState.ready) {
    container.innerHTML = `<div class="page-hdr"><div class="page-title">FIRE Planner</div></div>
      <div style="text-align:center;padding:2rem;">
        <p style="color:var(--ink-60);font-size:13px;">Complete your Health Score setup first.</p>
        <button class="btn btn-gold" style="margin-top:1rem;" id="go-health">Set Up Profile →</button>
      </div>`;
    container.querySelector('#go-health').addEventListener('click', () => navigateTo('health'));
    return;
  }

  container.innerHTML = `
    <div class="page-hdr">
      <div class="page-title">FIRE Path Planner</div>
      <div class="page-sub">Financial Independence, Retire Early — your personalised roadmap</div>
    </div>
    <div class="g2" style="margin-bottom:1rem;">
      <div class="card" style="animation:slideInUp 0.5s ease 0.05s both;">
        <div class="card-title">Adjust Parameters</div>
        ${rangeField('fire-age-r', 'Target FIRE Age', 35, 65, UserState.fireAge, 1, 'fire-age-v', '')}
        ${rangeField('fire-ret-r', 'Expected Return (%)', 6, 15, 11, 0.5, 'fire-ret-v', '%')}
        ${rangeField('fire-swr-r', 'Safe Withdrawal Rate (%)', 2, 5, 3.5, 0.5, 'fire-swr-v', '%')}
        ${rangeField('fire-inf-r', 'Inflation Rate (%)', 4, 8, 6, 0.5, 'fire-inf-v', '%')}
        <button class="btn btn-gold btn-full" id="fire-ai-btn" style="margin-top:8px;">🤖 Get AI FIRE Advice</button>
      </div>
      <div class="card" id="fire-numbers" style="animation:slideInUp 0.5s ease 0.1s both;">
        <div class="card-title">Your FIRE Numbers</div>
        <div id="fire-metrics" class="g2" style="margin-bottom:1rem;"></div>
        <div id="fire-progress"></div>
      </div>
    </div>
    <div class="card" style="margin-bottom:1rem;animation:slideInUp 0.5s ease 0.15s both;">
      <div class="card-title">Month-by-Month Roadmap</div>
      <div class="timeline" id="fire-timeline"></div>
    </div>
    <div class="card" id="fire-ai-box" style="display:none;animation:slideInUp 0.5s ease both;">
      <div class="card-title">AI FIRE Analysis</div>
      <div id="fire-ai-content"></div>
    </div>`;

  // Bind range sliders
  ['fire-age-r', 'fire-ret-r', 'fire-swr-r', 'fire-inf-r'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateFire);
  });

  document.getElementById('fire-ai-btn').addEventListener('click', getFireAI);
  updateFire();
}

function rangeField(id, label, min, max, val, step, valId, suffix) {
  return `
    <div style="margin-bottom:10px;">
      <label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-60);display:block;margin-bottom:5px;">${label}</label>
      <div class="range-row">
        <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"/>
        <span class="range-val" id="${valId}">${val}${suffix}</span>
      </div>
    </div>`;
}

function updateFire() {
  const fireAge = parseInt(document.getElementById('fire-age-r').value);
  const ret     = parseFloat(document.getElementById('fire-ret-r').value) / 100;
  const swr     = parseFloat(document.getElementById('fire-swr-r').value) / 100;
  const inf     = parseFloat(document.getElementById('fire-inf-r').value) / 100;

  document.getElementById('fire-age-v').textContent = fireAge;
  document.getElementById('fire-ret-v').textContent = document.getElementById('fire-ret-r').value + '%';
  document.getElementById('fire-swr-v').textContent = document.getElementById('fire-swr-r').value + '%';
  document.getElementById('fire-inf-v').textContent = document.getElementById('fire-inf-r').value + '%';

  const U       = UserState;
  const years   = Math.max(1, fireAge - U.age);
  const annExp  = U.totalExpenses * 12;
  const futExp  = annExp * Math.pow(1 + inf, years);
  const corpus  = futExp / swr;
  const nw      = U.netWorth;
  const progress = Math.min(100, Math.round((nw / corpus) * 100));
  const reqSIP  = Math.max(0, Math.round(calcRequiredSIP(corpus - nw, ret, years * 12)));

  document.getElementById('fire-metrics').innerHTML =
    metricCard('FIRE Corpus', fmtCr(corpus), `at ${(swr*100).toFixed(1)}% SWR`) +
    metricCard('Required SIP', fmtRupee(reqSIP), 'per month') +
    metricCard('Current Progress', `${progress}%`, `${fmtCr(nw)} of ${fmtCr(corpus)}`) +
    metricCard('Surplus Available', fmtRupee(U.surplus), '/month investable', U.surplus > 0 ? 'var(--emerald-mid)' : 'var(--crimson)');

  document.getElementById('fire-progress').innerHTML = `
    <div style="font-size:11px;color:var(--ink-60);margin-bottom:4px;display:flex;justify-content:space-between;">
      <span>Progress to FIRE Corpus</span><span style="font-weight:600;">${progress}%</span>
    </div>
    <div style="height:7px;background:var(--surface-3);border-radius:4px;overflow:hidden;">
      <div style="width:${progress}%;height:100%;background:linear-gradient(90deg,var(--gold),var(--emerald-mid));border-radius:4px;"></div>
    </div>`;

  renderTimeline(years, reqSIP, corpus, fireAge);
}

function renderTimeline(years, reqSIP, corpus, fireAge) {
  const milestones = [
    { y: 'Now', title: 'Foundation Phase', detail: `Build 6-month emergency fund. Start SIP of ${fmtRupee(reqSIP)}/month. Max 80C.`, done: true },
    { y: 'Year 2–3', title: 'Acceleration Phase', detail: `Increase SIP 10% annually. Open NPS for extra ₹50K deduction. Buy term insurance.` },
    { y: `Year ${Math.round(years * 0.4)}`, title: 'Wealth Building Phase', detail: `Corpus crosses ${fmtCr(corpus * 0.25)}. Rebalance equity/debt ratio.` },
    { y: `Year ${Math.round(years * 0.7)}`, title: 'Pre-FIRE Phase', detail: `Shift to conservative allocation. Build passive income streams.` },
    { y: `Year ${years} · Age ${fireAge}`, title: '🎯 FIRE Achieved', detail: `Corpus ${fmtCr(corpus)}. Monthly withdrawal: ${fmtRupee(Math.round(corpus * 0.035 / 12))}.` },
  ];

  document.getElementById('fire-timeline').innerHTML = milestones.map((m, i) => `
    <div class="tl-item ${m.done ? 'done' : i === 4 ? 'future' : ''}">
      <div class="tl-year">${m.y}</div>
      <div class="tl-title">${m.title}</div>
      <div class="tl-detail">${m.detail}</div>
    </div>`).join('');
}

async function getFireAI() {
  const fireAge = parseInt(document.getElementById('fire-age-r').value);
  const ret     = parseFloat(document.getElementById('fire-ret-r').value);
  showLoading('Generating your personalised FIRE analysis...');
  try {
    const analysis = await analyseFire({
      profile: UserState.toJSON(),
      fireAge,
      expectedReturn: ret,
      withdrawalRate: parseFloat(document.getElementById('fire-swr-r').value),
      inflationRate:  parseFloat(document.getElementById('fire-inf-r').value),
    });
    hideLoading();
    document.getElementById('fire-ai-box').style.display = 'block';
    document.getElementById('fire-ai-content').innerHTML = createInsightCards(UserState) + aiBox(analysis, `FIRE age ${fireAge} analysis`);
  } catch (e) {
    hideLoading();
    document.getElementById('fire-ai-content').innerHTML = `<div class="alert alert-err">⚠️ ${e.message}</div>`;
    document.getElementById('fire-ai-box').style.display = 'block';
  }
}
