/**
 * Dashboard.js — Overview page showing key metrics, alerts, and quick actions.
 */
import { UserState } from '../state.js';
import { navigateTo } from '../main.js';
import {
  fmtRupee, fmt, metricCard, scoreRingSVG, dimRow, alert,
  calcEmergencyScore, calcInsuranceScore, calcInvestmentScore,
  calcDebtScore, calcTaxScore, calcRetirementScore
} from '../utils.js';
import { getMarketIndices, getGoldPrice } from '../api.js';
import { createNetWorthChart, createExpensePieChart } from '../utils/charts.js';
import { calculateRiskScore, createRiskGaugeSVG, createRiskBreakdown } from '../utils/riskGauge.js';

// Helper to render market ticker
function marketTicker(name, price, change, changePct) {
  if (!price) return '';
  const isUp = change >= 0;
  const color = isUp ? 'var(--emerald-mid)' : 'var(--crimson)';
  const arrow = isUp ? '▲' : '▼';
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--ink-10);">
      <span style="font-weight:500;">${name}</span>
      <div style="text-align:right;">
        <div style="font-weight:600;">${price.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
        <div style="font-size:11px;color:${color};">${arrow} ${Math.abs(changePct).toFixed(2)}%</div>
      </div>
    </div>`;
}

export function renderDashboard(container) {
  if (!UserState.ready) {
    container.innerHTML = `
      <div class="page-hdr">
        <div class="page-title">Your Financial Dashboard</div>
        <div class="page-sub">AI-powered insights based on your live profile</div>
      </div>

      <!-- Market Pulse for non-logged-in users too -->
      <div class="card" style="margin-bottom:1rem;">
        <div class="card-title">📊 Market Pulse <span style="font-size:11px;color:var(--ink-60);font-weight:400;">Live</span></div>
        <div id="market-pulse" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
          <div style="text-align:center;padding:1rem;color:var(--ink-60);">Loading market data...</div>
        </div>
      </div>

      <div style="text-align:center;padding:3rem 1rem;">
        <div style="font-size:48px;margin-bottom:1rem;">🏦</div>
        <div style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:700;margin-bottom:8px;">Build your financial profile first</div>
        <div style="font-size:13px;color:var(--ink-60);margin-bottom:1.5rem;max-width:420px;margin-left:auto;margin-right:auto;">
          ArthMitra needs 2 minutes of your data to generate a real, personalised financial plan.
        </div>
        <button class="btn btn-gold" id="start-btn">Start 2-min Setup →</button>
      </div>`;
    container.querySelector('#start-btn').addEventListener('click', () => navigateTo('health'));
    loadMarketData();
    return;
  }

  const U = UserState;
  const scoreColor = U.healthScore >= 75 ? 'var(--emerald-mid)' : U.healthScore >= 50 ? 'var(--gold)' : 'var(--crimson)';

  const emScore  = calcEmergencyScore(U);
  const insScore = calcInsuranceScore(U);
  const invScore = Math.min(100, calcInvestmentScore(U));
  const dbScore  = calcDebtScore(U);
  const taxScore = calcTaxScore(U);
  const retScore = calcRetirementScore(U);

  // Build alerts
  const alerts = [];
  if (U.termCover < U.income * 10)
    alerts.push(alert('err', '⚠️', `<strong>Insurance Gap:</strong> Need ${fmtRupee(U.income * 10)} term cover. You have ${fmtRupee(U.termCover)}. Cost: ~₹${Math.round(U.age * 300)}/month.`));
  if (U.emergency < U.totalExpenses * 3)
    alerts.push(alert('warn', '💡', `<strong>Emergency fund low</strong> (${Math.round(U.emergency / Math.max(1, U.totalExpenses))} months). Target 6 months = ${fmtRupee(U.totalExpenses * 6)}.`));
  if (U.remaining80c > 0)
    alerts.push(alert('warn', '🧾', `<strong>80C gap:</strong> ${fmtRupee(U.remaining80c)} more to invest before March 31. Save up to ${fmtRupee(Math.round(U.remaining80c * 0.3))} in tax.`));
  if (U.surplus > 5000)
    alerts.push(alert('ok', '✅', `${fmtRupee(U.surplus)} monthly surplus detected. Set up a SIP of at least ${fmtRupee(Math.round(U.surplus * 0.5))} today.`));

  const annualExp = U.totalExpenses * 12;
  const fireCorpus = annualExp / 0.035;
  const fireYears = Math.max(0, U.fireAge - U.age);

  container.innerHTML = `
    <div class="page-hdr">
      <div class="page-title">Your Financial Dashboard</div>
      <div class="page-sub">Welcome back, ${U.name} — here's your money picture</div>
    </div>

    <!-- Market Pulse -->
    <div class="card" style="margin-bottom:1rem;animation:fadeInUp 0.4s ease;">
      <div class="card-title">📊 Market Pulse <span style="font-size:11px;color:var(--ink-60);font-weight:400;">Live</span></div>
      <div id="market-pulse" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
        <div style="text-align:center;padding:1rem;color:var(--ink-60);">Loading...</div>
      </div>
    </div>

    <div class="g4" style="margin-bottom:1rem;">
      <div style="animation:slideInUp 0.5s ease 0.05s both;">
        ${metricCard('Net Worth', fmtRupee(U.netWorth), 'Total assets')}
      </div>
      <div style="animation:slideInUp 0.5s ease 0.1s both;">
        ${metricCard('Monthly Surplus', fmtRupee(U.surplus), 'Investable', U.surplus > 0 ? 'var(--emerald-mid)' : 'var(--crimson)')}
      </div>
      <div style="animation:slideInUp 0.5s ease 0.15s both;">
        ${metricCard('Health Score', U.healthScore, 'Out of 100', scoreColor)}
      </div>
      <div style="animation:slideInUp 0.5s ease 0.2s both;">
        ${metricCard('FIRE In', `${fireYears} yrs`, `Age ${U.fireAge}`)}
      </div>
    </div>

    <div class="g2" style="margin-bottom:1rem;">
      <div class="card" style="animation:slideInUp 0.5s ease 0.25s both;">
        <div class="card-title">Money Health Snapshot</div>
        <div style="display:flex;align-items:center;gap:1.25rem;">
          ${scoreRingSVG(U.healthScore)}
          <div style="flex:1;">
            ${dimRow('🛡️ Emergency', emScore)}
            ${dimRow('🏥 Insurance', insScore)}
            ${dimRow('📈 Investments', invScore)}
            ${dimRow('💳 Debt', dbScore)}
            ${dimRow('💰 Tax', taxScore)}
            ${dimRow('🏦 Retirement', retScore)}
          </div>
        </div>
      </div>

      <div class="card" style="animation:slideInUp 0.5s ease 0.3s both;">
        <div class="card-title">Action Items</div>
        ${alerts.join('') || '<div class="alert alert-ok">✅<div>All good! No urgent actions found.</div></div>'}
        <button class="btn btn-gold btn-sm" style="margin-top:8px;" id="ask-ai-btn">Ask AI about these →</button>
      </div>
    </div>

    <div class="card" style="animation:slideInUp 0.5s ease 0.35s both;">
      <div class="card-title">Quick Actions</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-gold dash-nav" data-page="whatif">🎯 What-If Simulator</button>
        <button class="btn btn-gold dash-nav" data-page="fire">🔥 View FIRE Plan</button>
        <button class="btn btn-ink dash-nav" data-page="tax">🧾 Tax Wizard</button>
        <button class="btn btn-ghost dash-nav" data-page="mentor">🤖 Ask AI Mentor</button>
        <button class="btn btn-ghost dash-nav" data-page="portfolio">📈 Portfolio X-Ray</button>
      </div>
    </div>

    <!-- Financial Risk Gauge -->
    <div class="card" style="margin-top:1rem;animation:slideInUp 0.5s ease 0.4s both;">
      <div class="card-title">⚠️ Financial Risk Assessment</div>
      <div id="risk-gauge-container"></div>
      <div id="risk-breakdown" style="margin-top:1.5rem;"></div>
    </div>

    <!-- Charts Section -->
    <div class="g2" style="margin-top:1rem;">
      <div class="card" style="animation:slideInUp 0.5s ease 0.45s both;">
        <div class="card-title">📈 Net Worth Projection</div>
        <div style="position:relative;height:350px;">
          <canvas id="networth-chart"></canvas>
        </div>
      </div>

      <div class="card" style="animation:slideInUp 0.5s ease 0.5s both;">
        <div class="card-title">💰 Expense Breakdown</div>
        <div style="position:relative;height:350px;">
          <canvas id="expense-chart"></canvas>
        </div>
      </div>
    </div>`;

  container.querySelector('#ask-ai-btn').addEventListener('click', () => navigateTo('mentor'));
  container.querySelectorAll('.dash-nav').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  // Load market data
  loadMarketData();

  // Load charts and risk gauge (async, non-blocking)
  setTimeout(() => {
    loadChartsAndRiskGauge(U);
  }, 100);
}

// Load and render all charts and visualizations
async function loadChartsAndRiskGauge(profile) {
  try {
    // Load risk gauge
    const riskScore = calculateRiskScore(profile);
    const riskContainer = document.getElementById('risk-gauge-container');
    if (riskContainer) {
      riskContainer.innerHTML = createRiskGaugeSVG(riskScore);
    }

    const riskBreakdown = document.getElementById('risk-breakdown');
    if (riskBreakdown) {
      riskBreakdown.innerHTML = createRiskBreakdown(profile);
    }

    // Load net worth chart
    const networthCanvas = document.getElementById('networth-chart');
    if (networthCanvas) {
      await createNetWorthChart(networthCanvas, profile);
    }

    // Load expense chart
    const expenseCanvas = document.getElementById('expense-chart');
    if (expenseCanvas) {
      await createExpensePieChart(expenseCanvas, profile);
    }
  } catch (err) {
    console.error('Error loading charts:', err);
  }
}

// Fetch and display market indices
async function loadMarketData() {
  const pulseEl = document.getElementById('market-pulse');
  if (!pulseEl) return;

  // Fallback data if API fails
  const fallback = {
    nifty_50: { price: 22500, change: 25.5, change_percent: 0.11 },
    sensex: { price: 74125, change: 75.3, change_percent: 0.10 },
    nifty_bank: { price: 48500, change: -100, change_percent: -0.21 },
    nifty_it: { price: 33250, change: 150, change_percent: 0.45 }
  };

  try {
    let indices = await getMarketIndices();
    console.log('Market indices fetched:', indices);

    // If API didn't return proper object, use fallback
    if (!indices || typeof indices !== 'object' || Object.keys(indices).length === 0) {
      indices = fallback;
    }

    let html = '';
    if (indices.nifty_50) {
      html += marketTicker('Nifty 50', indices.nifty_50.price, indices.nifty_50.change, indices.nifty_50.change_percent);
    }
    if (indices.sensex) {
      html += marketTicker('Sensex', indices.sensex.price, indices.sensex.change, indices.sensex.change_percent);
    }
    if (indices.nifty_bank) {
      html += marketTicker('Bank Nifty', indices.nifty_bank.price, indices.nifty_bank.change, indices.nifty_bank.change_percent);
    }
    if (indices.nifty_it) {
      html += marketTicker('Nifty IT', indices.nifty_it.price, indices.nifty_it.change, indices.nifty_it.change_percent);
    }

    if (html) {
      pulseEl.innerHTML = html;
      // Try to add gold price (non-blocking)
      getGoldPrice()
        .then(gold => {
          if (gold && gold.price_inr_10g && pulseEl) {
            const goldHtml = marketTicker('Gold (10g)', gold.price_inr_10g, 0, gold.change_percent || 0);
            pulseEl.innerHTML += goldHtml;
          }
        })
        .catch(() => {});
    } else {
      pulseEl.innerHTML = '<div style="color:var(--ink-60);padding:1rem;">📊 Market Live</div>';
    }
  } catch (err) {
    console.error('Market data error:', err);
    // Show fallback data on error
    let html = '';
    const indices = fallback;
    if (indices.nifty_50) {
      html += marketTicker('Nifty 50', indices.nifty_50.price, indices.nifty_50.change, indices.nifty_50.change_percent);
    }
    if (indices.sensex) {
      html += marketTicker('Sensex', indices.sensex.price, indices.sensex.change, indices.sensex.change_percent);
    }
    if (indices.nifty_bank) {
      html += marketTicker('Bank Nifty', indices.nifty_bank.price, indices.nifty_bank.change, indices.nifty_bank.change_percent);
    }
    if (indices.nifty_it) {
      html += marketTicker('Nifty IT', indices.nifty_it.price, indices.nifty_it.change, indices.nifty_it.change_percent);
    }
    pulseEl.innerHTML = html;
  }
}
