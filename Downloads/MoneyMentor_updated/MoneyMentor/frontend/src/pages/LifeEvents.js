/**
 * LifeEvents.js — AI advisor for bonus, marriage, baby, home etc.
 */
import { UserState } from '../state.js';
import { adviseLifeEvent } from '../api.js';
import { showLoading, hideLoading } from '../components/LoadingOverlay.js';
import { navigateTo } from '../main.js';
import { aiBox, createInsightCards } from '../utils.js';

const EVENTS = [
  { id: 'bonus',       icon: '💰', label: 'Annual Bonus' },
  { id: 'marriage',    icon: '💒', label: 'Getting Married' },
  { id: 'baby',        icon: '👶', label: 'New Baby' },
  { id: 'home',        icon: '🏠', label: 'Buying a Home' },
  { id: 'jobchange',   icon: '💼', label: 'Job Change' },
  { id: 'inheritance', icon: '🏆', label: 'Inheritance' },
];

let selectedEvent = 'bonus';

export function renderLifeEvents(container) {
  container.innerHTML = `
    <div class="page-hdr">
      <div class="page-title">Life Event Advisor</div>
      <div class="page-sub">What's happening in your life? Get personalised financial guidance.</div>
    </div>
    <div class="g2">
      <div>
        <div class="card" style="margin-bottom:1rem;animation:slideInUp 0.5s ease 0.05s both;">
          <div class="card-title">Select Life Event</div>
          <div class="event-grid" id="event-grid">
            ${EVENTS.map(e => `
              <div class="ev-btn ${e.id === selectedEvent ? 'sel' : ''}" data-event="${e.id}">
                <div class="ev-icon">${e.icon}</div>
                <div class="ev-name">${e.label}</div>
              </div>`).join('')}
          </div>
        </div>
        <div class="card" style="animation:slideInUp 0.5s ease 0.1s both;">
          <div class="card-title" id="ev-form-title">Bonus Details</div>
          <div class="form-row full">
            <div class="fg"><label>Amount (₹)</label>
              <div class="pfx"><span class="pfx-sym">₹</span><input id="ev-amount" type="number" placeholder="300000"/></div>
            </div>
          </div>
          <div class="form-row full">
            <div class="fg"><label>Additional Context</label>
              <input id="ev-context" type="text" placeholder="e.g. Q3 performance bonus, 2 months salary"/>
            </div>
          </div>
          <button class="btn btn-gold btn-full" id="life-ai-btn">🤖 Get Personalised Plan</button>
        </div>
      </div>
      <div class="card" id="life-result" style="animation:slideInUp 0.5s ease 0.15s both;">
        <div class="card-title">AI Life Event Advice</div>
        <div id="life-ai-content" style="text-align:center;padding:2rem;color:var(--ink-60);font-size:13px;">
          Select a life event and click "Get Personalised Plan" to receive AI-powered guidance.
        </div>
      </div>
    </div>`;

  // Event selection
  container.querySelectorAll('.ev-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.ev-btn').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      selectedEvent = btn.dataset.event;
      const ev = EVENTS.find(e => e.id === selectedEvent);
      document.getElementById('ev-form-title').textContent = `${ev.label} Details`;
    });
  });

  document.getElementById('life-ai-btn').addEventListener('click', runLifeAI);
}

async function runLifeAI() {
  const amount  = parseFloat(document.getElementById('ev-amount').value) || 0;
  const context = document.getElementById('ev-context').value;

  showLoading('Creating your personalised life event plan...');
  try {
    const advice = await adviseLifeEvent({
      profile: UserState.toJSON(),
      event: selectedEvent,
      amount,
      context,
    });
    hideLoading();
    const ev = EVENTS.find(e => e.id === selectedEvent);
    document.getElementById('life-ai-content').innerHTML = `
      <div style="animation:slideInUp 0.5s ease both;">
        ${createInsightCards(UserState)}
      </div>
      <div style="animation:slideInUp 0.5s ease 0.1s both;">
        ${aiBox(advice, `${ev.label} plan`)}
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-top:10px;animation:slideInUp 0.5s ease 0.15s both;" id="life-followup">Ask follow-up questions →</button>`;
    document.getElementById('life-followup').addEventListener('click', () => {
      navigateTo('mentor');
    });
  } catch (e) {
    hideLoading();
    document.getElementById('life-ai-content').innerHTML = `<div class="alert alert-err">⚠️ ${e.message}</div>`;
  }
}
