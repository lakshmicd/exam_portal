/**
 * PortfolioXRay.js — Deep MF portfolio analysis with AI.
 */
import { UserState } from '../state.js';
import { xrayPortfolio } from '../api.js';
import { showLoading, hideLoading } from '../components/LoadingOverlay.js';
import { fmt, fmtRupee, aiBox, createInsightCards, metricCard } from '../utils.js';

export function renderPortfolioXRay(container) {
  container.innerHTML = `
    <div class="page-hdr">
      <div class="page-title">Portfolio X-Ray</div>
      <div class="page-sub">Deep analysis of your mutual fund portfolio in seconds</div>
    </div>
    <div class="g2">
      <div>
        <div class="card" style="margin-bottom:1rem;animation:slideInUp 0.5s ease 0.05s both;">
          <div class="card-title">Enter Your Funds</div>
          <div style="font-size:11px;color:var(--ink-60);margin-bottom:8px;">Fund Name → Current Value → XIRR %</div>
          <div id="fund-rows"></div>
          <button class="btn btn-ghost btn-sm" id="add-fund" style="margin-bottom:10px;">+ Add Fund</button>
          <button class="btn btn-gold btn-full" id="xray-btn">🤖 X-Ray My Portfolio</button>
        </div>
      </div>
      <div class="card" style="animation:slideInUp 0.5s ease 0.1s both;">
        <div class="card-title">AI Portfolio Analysis</div>
        <div id="portfolio-result" style="text-align:center;padding:1.5rem;color:var(--ink-60);font-size:13px;">
          Add your funds and click X-Ray for a complete analysis including overlap, expense ratio drag, and rebalancing plan.
        </div>
      </div>
    </div>`;

  const rowsContainer = container.querySelector('#fund-rows');
  addFundRow(rowsContainer);
  addFundRow(rowsContainer);
  addFundRow(rowsContainer);

  container.querySelector('#add-fund').addEventListener('click', () => addFundRow(rowsContainer));
  container.querySelector('#xray-btn').addEventListener('click', () => runXRay(rowsContainer));
}

function addFundRow(container) {
  const row = document.createElement('div');
  row.className = 'fund-input-row';
  row.innerHTML = `
    <input type="text" class="fi-name" placeholder="Fund name (e.g. Parag Parikh Flexi Cap)"/>
    <div class="pfx" style="width:120px;"><span class="pfx-sym">₹</span><input type="number" class="fi-val" placeholder="Value"/></div>
    <div class="pfx" style="width:90px;"><span class="pfx-sym" style="left:8px;">%</span><input type="number" class="fi-xirr" placeholder="XIRR"/></div>`;
  container.appendChild(row);
}

async function runXRay(rowsContainer) {
  const funds = [];
  rowsContainer.querySelectorAll('.fund-input-row').forEach(row => {
    const name  = row.querySelector('.fi-name').value.trim();
    const value = parseFloat(row.querySelector('.fi-val').value) || 0;
    const xirr  = parseFloat(row.querySelector('.fi-xirr').value) || 0;
    if (name && value > 0) funds.push({ name, value, xirr });
  });

  if (!funds.length) { alert('Please add at least one fund with a value.'); return; }

  showLoading('X-Raying your portfolio...');
  try {
    const result = await xrayPortfolio({ profile: UserState.toJSON(), funds });
    hideLoading();

    const { analysis, totalValue, weightedXirr } = result;
    const xirrColor = weightedXirr > 12 ? 'var(--emerald-mid)' : weightedXirr > 8 ? 'var(--gold)' : 'var(--crimson)';

    document.getElementById('portfolio-result').innerHTML = `
      <div class="g2" style="margin-bottom:1rem;animation:slideInUp 0.5s ease both;">
        ${metricCard('Portfolio Value', fmtRupee(totalValue), 'Total')}
        ${metricCard('Weighted XIRR', `${weightedXirr}%`, 'Since inception', xirrColor)}
      </div>
      <div style="margin-bottom:1rem;animation:slideInUp 0.5s ease 0.1s both;">
        ${funds.map(f => {
          const pct = (f.value / totalValue * 100).toFixed(1);
          const c   = f.xirr > 14 ? 'var(--emerald-mid)' : f.xirr > 9 ? 'var(--gold-dark)' : 'var(--crimson)';
          return `<div class="fund-row">
            <div class="fund-name">${f.name}</div>
            <div style="min-width:40px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--ink-60);">${pct}%</div>
            <div style="min-width:50px;text-align:right;font-weight:700;font-family:'JetBrains Mono',monospace;font-size:12px;color:${c};">${f.xirr}%</div>
          </div>`;
        }).join('')}
      </div>
      <div style="animation:slideInUp 0.5s ease 0.15s both;">
        ${createInsightCards(UserState)}
      </div>
      <div style="animation:slideInUp 0.5s ease 0.2s both;">
        ${aiBox(analysis, 'Portfolio X-Ray')}
      </div>`;
  } catch (e) {
    hideLoading();
    document.getElementById('portfolio-result').innerHTML = `<div class="alert alert-err">⚠️ ${e.message}</div>`;
  }
}
