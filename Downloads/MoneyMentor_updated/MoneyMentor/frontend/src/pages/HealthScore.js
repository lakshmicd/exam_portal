/**
 * HealthScore.js — 6-step onboarding + AI health assessment.
 */
import { UserState } from '../state.js';
import { assessHealth } from '../api.js';
import { showLoading, hideLoading } from '../components/LoadingOverlay.js';
import { navigateTo } from '../main.js';
import {
  aiBox, scoreRingSVG, dimRow, metricCard, createInsightCards,
  calcEmergencyScore, calcInsuranceScore, calcInvestmentScore,
  calcDebtScore, calcTaxScore, calcRetirementScore, calcOverallScore
} from '../utils.js';

let currentStep = 0;

const STEPS = ['1. You', '2. Income', '3. Expenses', '4. Investments', '5. Insurance', '6. Goals'];

export function renderHealthScore(container) {
  currentStep = 0;
  container.innerHTML = `
    <div class="page-hdr">
      <div class="page-title">Financial Health Check</div>
      <div class="page-sub">5 minutes → personalised score across 6 dimensions</div>
    </div>
    <div class="onboard-wrap">
      <div class="step-bar" id="step-bar">
        ${STEPS.map((s, i) => `<div class="step ${i === 0 ? 'active' : ''}" id="step-${i}">${s}</div>`).join('')}
      </div>
      <div id="step-content"></div>
    </div>`;

  renderStep(0, container);
}

function renderStep(step, container) {
  const content = container.querySelector('#step-content');
  content.innerHTML = STEP_FORMS[step]();
  bindStepButtons(step, container);
}

function bindStepButtons(step, container) {
  const nextBtn = container.querySelector('#next-btn');
  const backBtn = container.querySelector('#back-btn');

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      saveStep(step);
      if (step < 5) {
        container.querySelector(`#step-${step}`).className = 'step done';
        container.querySelector(`#step-${step + 1}`).className = 'step active';
        currentStep = step + 1;
        renderStep(step + 1, container);
      } else {
        generateProfile(container);
      }
    });
  }
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      container.querySelector(`#step-${step}`).className = 'step';
      container.querySelector(`#step-${step - 1}`).className = 'step active';
      currentStep = step - 1;
      renderStep(step - 1, container);
    });
  }
}

function saveStep(step) {
  const g = id => parseFloat(document.getElementById(id)?.value) || 0;
  const s = id => document.getElementById(id)?.value || '';

  if (step === 0) UserState.update({ name: s('f-name') || 'User', age: g('f-age') || 30, city: s('f-city') || 'India', risk: s('f-risk') });
  if (step === 1) UserState.update({ income: g('f-income'), otherIncome: g('f-other'), hra: g('f-hra'), rentPaid: g('f-rent') });
  if (step === 2) UserState.update({ expRent: g('f-exp-rent'), expGroceries: g('f-exp-groc'), expTransport: g('f-exp-trans'), expFun: g('f-exp-fun'), expOther: g('f-exp-other'), expEmi: g('f-exp-emi') });
  if (step === 3) UserState.update({ mf: g('f-mf'), epf: g('f-epf'), fd: g('f-fd'), stocks: g('f-stocks'), emergency: g('f-emergency'), sip: g('f-sip') });
  if (step === 4) UserState.update({ termCover: g('f-term'), healthCover: g('f-health'), premium: g('f-premium'), invested80c: g('f-80c') });
  if (step === 5) UserState.update({ fireAge: g('f-fire-age') || 50, goal: s('f-goal'), note: s('f-note') });
}

async function generateProfile(container) {
  saveStep(5);
  const score = calcOverallScore(UserState);
  UserState.update({ healthScore: score, ready: true });

  showLoading('🤖 AI is analysing your complete financial picture...');
  try {
    const assessment = await assessHealth(UserState.toJSON());
    hideLoading();
    renderResult(container, assessment);
  } catch (e) {
    hideLoading();
    container.querySelector('#step-content').innerHTML = `<div class="alert alert-err">⚠️ ${e.message}</div>`;
  }
}

function renderResult(container, assessment) {
  const U = UserState;
  const scores = {
    '🛡️ Emergency': calcEmergencyScore(U),
    '🏥 Insurance': calcInsuranceScore(U),
    '📈 Investments': Math.min(100, calcInvestmentScore(U)),
    '💳 Debt': calcDebtScore(U),
    '💰 Tax': calcTaxScore(U),
    '🏦 Retirement': calcRetirementScore(U),
  };

  container.querySelector('#step-content').innerHTML = `
    <div class="card" style="animation:fadeInUp 0.5s ease;">
      <div style="display:flex;align-items:center;gap:1.5rem;margin-bottom:1.25rem;flex-wrap:wrap;animation:slideInUp 0.5s ease 0.1s both;">
        ${scoreRingSVG(U.healthScore)}
        <div>
          <div style="font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;margin-bottom:4px;">
            Namaste, ${U.name}! 👋
          </div>
          <div style="font-size:13px;color:var(--ink-60);">Your Money Health Score is <strong>${U.healthScore}/100</strong></div>
        </div>
      </div>
      <div class="g3" style="margin-bottom:1.25rem;animation:slideInUp 0.5s ease 0.15s both;">
        ${Object.entries(scores).map(([l, v]) => {
          const color = v >= 70 ? 'var(--emerald-mid)' : v >= 45 ? 'var(--gold)' : 'var(--crimson)';
          return `<div class="metric" style="padding:8px 10px;">
            <div style="font-size:10px;color:var(--ink-60);margin-bottom:3px;">${l}</div>
            <div style="font-size:1rem;font-weight:700;font-family:'JetBrains Mono',monospace;color:${color};">${v}</div>
            <div style="height:3px;background:var(--surface-3);border-radius:2px;margin-top:4px;overflow:hidden;">
              <div style="width:${v}%;height:100%;background:${color};border-radius:2px;"></div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div style="animation:slideInUp 0.5s ease 0.2s both;">
        ${createInsightCards(U)}
      </div>
      <div style="animation:slideInUp 0.5s ease 0.25s both;">
        ${aiBox(assessment, 'Your personalised assessment')}
      </div>
      <div style="display:flex;gap:8px;margin-top:1rem;animation:slideInUp 0.5s ease 0.3s both;">
        <button class="btn btn-gold" style="flex:1;" id="go-dash">View Dashboard →</button>
        <button class="btn btn-ghost" id="go-mentor">Ask AI Mentor</button>
      </div>
    </div>`;

  container.querySelector('#go-dash').addEventListener('click', () => navigateTo('dashboard'));
  container.querySelector('#go-mentor').addEventListener('click', () => navigateTo('mentor'));
}

// ── Step Form Templates ───────────────────────────────────────────────────

const STEP_FORMS = [
  // Step 0 – Personal
  () => `
    <div class="card">
      <div class="card-title">About You</div>
      <div class="form-row">
        <div class="fg"><label>Full Name</label><input id="f-name" type="text" placeholder="Priya Sharma" value="${UserState.name}"/></div>
        <div class="fg"><label>Age</label><input id="f-age" type="number" placeholder="31" value="${UserState.age || ''}"/></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>City</label><input id="f-city" type="text" placeholder="Bangalore" value="${UserState.city}"/></div>
        <div class="fg"><label>Risk Appetite</label>
          <select id="f-risk">
            <option value="conservative" ${UserState.risk === 'conservative' ? 'selected' : ''}>Conservative</option>
            <option value="moderate" ${UserState.risk === 'moderate' ? 'selected' : ''}>Moderate</option>
            <option value="aggressive" ${UserState.risk === 'aggressive' ? 'selected' : ''}>Aggressive</option>
          </select>
        </div>
      </div>
      <button class="btn btn-gold btn-full" id="next-btn">Continue →</button>
    </div>`,

  // Step 1 – Income
  () => `
    <div class="card">
      <div class="card-title">Income</div>
      <div class="form-row">
        <div class="fg"><label>Annual Gross Salary (₹)</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-income" type="number" placeholder="1800000" value="${UserState.income || ''}"/></div></div>
        <div class="fg"><label>Other Income / Freelance (₹/yr)</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-other" type="number" placeholder="0" value="${UserState.otherIncome || 0}"/></div></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>HRA Received (₹/yr)</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-hra" type="number" placeholder="420000" value="${UserState.hra || 0}"/></div></div>
        <div class="fg"><label>Rent Paid (₹/yr)</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-rent" type="number" placeholder="360000" value="${UserState.rentPaid || 0}"/></div></div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-ghost" id="back-btn">← Back</button>
        <button class="btn btn-gold" style="flex:1;" id="next-btn">Continue →</button>
      </div>
    </div>`,

  // Step 2 – Expenses
  () => `
    <div class="card">
      <div class="card-title">Monthly Expenses</div>
      <div class="form-row">
        <div class="fg"><label>Rent / Home Loan EMI</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-exp-rent" type="number" placeholder="30000" value="${UserState.expRent || ''}"/></div></div>
        <div class="fg"><label>Groceries & Utilities</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-exp-groc" type="number" placeholder="12000" value="${UserState.expGroceries || ''}"/></div></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Transport</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-exp-trans" type="number" placeholder="5000" value="${UserState.expTransport || ''}"/></div></div>
        <div class="fg"><label>Dining / Entertainment</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-exp-fun" type="number" placeholder="10000" value="${UserState.expFun || ''}"/></div></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Other Fixed Expenses</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-exp-other" type="number" placeholder="5000" value="${UserState.expOther || ''}"/></div></div>
        <div class="fg"><label>Loan EMIs (non-home)</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-exp-emi" type="number" placeholder="0" value="${UserState.expEmi || 0}"/></div></div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-ghost" id="back-btn">← Back</button>
        <button class="btn btn-gold" style="flex:1;" id="next-btn">Continue →</button>
      </div>
    </div>`,

  // Step 3 – Investments
  () => `
    <div class="card">
      <div class="card-title">Current Investments & Savings</div>
      <div class="form-row">
        <div class="fg"><label>Mutual Funds (₹)</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-mf" type="number" placeholder="500000" value="${UserState.mf || 0}"/></div></div>
        <div class="fg"><label>EPF / PPF Balance (₹)</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-epf" type="number" placeholder="200000" value="${UserState.epf || 0}"/></div></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Fixed Deposits (₹)</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-fd" type="number" placeholder="0" value="${UserState.fd || 0}"/></div></div>
        <div class="fg"><label>Stocks / Equity (₹)</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-stocks" type="number" placeholder="0" value="${UserState.stocks || 0}"/></div></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Emergency Fund (₹)</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-emergency" type="number" placeholder="0" value="${UserState.emergency || 0}"/></div></div>
        <div class="fg"><label>Monthly SIP (₹)</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-sip" type="number" placeholder="0" value="${UserState.sip || 0}"/></div></div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-ghost" id="back-btn">← Back</button>
        <button class="btn btn-gold" style="flex:1;" id="next-btn">Continue →</button>
      </div>
    </div>`,

  // Step 4 – Insurance
  () => `
    <div class="card">
      <div class="card-title">Insurance Coverage</div>
      <div class="form-row">
        <div class="fg"><label>Term Life Cover (₹)</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-term" type="number" placeholder="0" value="${UserState.termCover || 0}"/></div></div>
        <div class="fg"><label>Health Insurance Cover (₹)</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-health" type="number" placeholder="0" value="${UserState.healthCover || 0}"/></div></div>
      </div>
      <div class="form-row">
        <div class="fg"><label>Total Annual Premium (₹)</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-premium" type="number" placeholder="0" value="${UserState.premium || 0}"/></div></div>
        <div class="fg"><label>80C Invested This Year (₹)</label><div class="pfx"><span class="pfx-sym">₹</span><input id="f-80c" type="number" placeholder="0" value="${UserState.invested80c || 0}"/></div></div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-ghost" id="back-btn">← Back</button>
        <button class="btn btn-gold" style="flex:1;" id="next-btn">Continue →</button>
      </div>
    </div>`,

  // Step 5 – Goals
  () => `
    <div class="card">
      <div class="card-title">Your Goals</div>
      <div class="form-row">
        <div class="fg"><label>Target FIRE Age</label><input id="f-fire-age" type="number" placeholder="50" value="${UserState.fireAge || 50}"/></div>
        <div class="fg"><label>Top Goal</label>
          <select id="f-goal">
            <option value="fire" ${UserState.goal === 'fire' ? 'selected' : ''}>FIRE / Early Retirement</option>
            <option value="home" ${UserState.goal === 'home' ? 'selected' : ''}>Buy a Home</option>
            <option value="child" ${UserState.goal === 'child' ? 'selected' : ''}>Child's Education</option>
            <option value="wealth" ${UserState.goal === 'wealth' ? 'selected' : ''}>Wealth Creation</option>
          </select>
        </div>
      </div>
      <div class="form-row full">
        <div class="fg"><label>Anything specific you want advice on?</label>
          <input id="f-note" type="text" placeholder="e.g. planning to get married next year, just got a bonus..." value="${UserState.note}"/>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-ghost" id="back-btn">← Back</button>
        <button class="btn btn-gold" style="flex:1;" id="next-btn">🤖 Generate My AI Financial Plan</button>
      </div>
    </div>`,
];
