/**
 * AIMentor.js — Multi-turn personalised AI chat.
 */
import { UserState } from '../state.js';
import { sendChatMessage } from '../api.js';
import { navigateTo } from '../main.js';
import { fmt, fmtRupee, formatAI } from '../utils.js';

const chatHistory = [];

const QUICK_QUESTIONS = [
  { icon: '🏠', label: 'Prepay loan vs invest?',         q: 'Should I prepay my home loan or invest the extra cash?' },
  { icon: '📊', label: 'Ideal asset allocation?',        q: 'What is my ideal asset allocation right now?' },
  { icon: '🧾', label: 'Old or new tax regime?',         q: 'Which tax regime is better for me — old or new?' },
  { icon: '🛡️', label: 'How much life cover?',           q: 'How much life insurance do I actually need?' },
  { icon: '🔍', label: 'Full financial review',          q: 'Give me a complete review of my financial health and top 5 actions.' },
  { icon: '💰', label: 'What to do with bonus?',         q: 'What should I do with my annual bonus?' },
];

export function renderAIMentor(container) {
  container.innerHTML = `
    <div class="page-hdr">
      <div class="page-title">AI Financial Mentor</div>
      <div class="page-sub">Your personal CA + financial planner, available 24/7</div>
    </div>
    <div style="display:grid;grid-template-columns:220px 1fr;gap:1rem;">

      <!-- Sidebar -->
      <div>
        <div class="card" style="margin-bottom:1rem;">
          <div class="card-title">Quick Questions</div>
          <div style="display:flex;flex-direction:column;gap:6px;" id="quick-qs">
            ${QUICK_QUESTIONS.map(q => `
              <button class="btn btn-ghost" style="justify-content:flex-start;font-size:11px;text-align:left;" data-q="${q.q}">
                ${q.icon} ${q.label}
              </button>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-title">Your Profile</div>
          <div id="mentor-profile" style="font-size:12px;color:var(--ink-60);line-height:2.1;">
            ${UserState.ready
              ? `Age: <strong>${UserState.age}</strong><br/>
                 Income: <strong>${fmtRupee(UserState.income)}/yr</strong><br/>
                 Net Worth: <strong>${fmtRupee(UserState.netWorth)}</strong><br/>
                 SIP: <strong>${fmtRupee(UserState.sip)}/mo</strong><br/>
                 Risk: <strong>${UserState.risk}</strong><br/>
                 FIRE Goal: <strong>Age ${UserState.fireAge}</strong><br/>
                 Score: <strong style="color:var(--gold);">${UserState.healthScore}/100</strong>`
              : '<em>Complete setup first</em>'}
          </div>
          ${!UserState.ready ? `<button class="btn btn-gold btn-sm btn-full" style="margin-top:8px;" id="go-setup">Set Up Profile →</button>` : ''}
        </div>
      </div>

      <!-- Chat -->
      <div class="chat-shell">
        <div class="chat-top">
          <div class="chat-av">🤖</div>
          <div class="chat-info">
            <div class="chat-name">ArthMitra AI</div>
            <div class="chat-status">Personalised to your profile · Powered by AI</div>
          </div>
          <button class="btn btn-ghost btn-sm" id="clear-chat">Clear</button>
        </div>
        <div class="chat-msgs" id="chat-msgs">
          <div class="msg ai">
            <div class="msg-av">🤖</div>
            <div class="msg-bbl">
              ${UserState.ready
                ? `Namaste, ${UserState.name}! 👋 I have your complete financial picture loaded — ${fmtRupee(UserState.income)} income, ${fmtRupee(UserState.netWorth)} net worth, FIRE target at ${UserState.fireAge}. Ask me anything!`
                : `Namaste! 👋 I'm your AI financial mentor powered by OpenAI. Complete your <strong>Health Score setup</strong> first so I can give you truly personalised advice, or ask me anything general!`}
            </div>
          </div>
        </div>
        <div class="chat-chips" id="chat-chips">
          <div class="chip" data-q="How much should I save each month?">How much to save?</div>
          <div class="chip" data-q="Explain what SIP is and why it matters">What is SIP?</div>
          <div class="chip" data-q="Explain FIRE to me in simple terms">Explain FIRE</div>
          <div class="chip" data-q="What are the best tax saving options in India?">Best tax saving options</div>
        </div>
        <div class="chat-input-row">
          <textarea class="chat-ta" id="chat-ta" placeholder="Ask anything about your finances..." rows="1"></textarea>
          <button class="chat-send" id="chat-send">↑</button>
        </div>
      </div>
    </div>`;

  // Bind quick questions
  container.querySelectorAll('[data-q]').forEach(btn => {
    btn.addEventListener('click', () => sendMessage(btn.dataset.q));
  });

  // Setup button
  const setupBtn = container.querySelector('#go-setup');
  if (setupBtn) setupBtn.addEventListener('click', () => navigateTo('health'));

  // Send button and enter key
  container.querySelector('#chat-send').addEventListener('click', () => {
    const ta = container.querySelector('#chat-ta');
    if (ta.value.trim()) sendMessage(ta.value.trim());
    ta.value = '';
  });
  container.querySelector('#chat-ta').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const ta = container.querySelector('#chat-ta');
      if (ta.value.trim()) sendMessage(ta.value.trim());
      ta.value = '';
    }
  });

  // Clear
  container.querySelector('#clear-chat').addEventListener('click', () => {
    chatHistory.length = 0;
    document.getElementById('chat-msgs').innerHTML = `
      <div class="msg ai"><div class="msg-av">🤖</div><div class="msg-bbl">Chat cleared. Ask me anything!</div></div>`;
  });
}

async function sendMessage(text) {
  appendMsg(text, 'user');
  chatHistory.push({ role: 'user', content: text });

  const sendBtn = document.getElementById('chat-send');
  if (sendBtn) sendBtn.disabled = true;

  const typingId = appendTyping();
  try {
    const reply = await sendChatMessage({
      profile: UserState.toJSON(),
      history: chatHistory.slice(-10),
    });
    removeTyping(typingId);
    appendMsg(reply, 'ai');
    chatHistory.push({ role: 'assistant', content: reply });
  } catch (e) {
    removeTyping(typingId);
    appendMsg(`Sorry, I hit an error: ${e.message}. Please try again.`, 'ai');
  }
  if (sendBtn) sendBtn.disabled = false;
}

function appendMsg(text, role) {
  const msgs = document.getElementById('chat-msgs');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  const av = role === 'user' ? (UserState.name ? UserState.name[0].toUpperCase() : 'U') : '🤖';

  if (role === 'ai') {
    // Create empty message first with animation
    div.innerHTML = `
      <div class="msg-av" style="font-weight:600;min-width:32px;text-align:center;">${av}</div>
      <div class="msg-bbl" style="animation: fadeInUp 0.3s ease; min-height: 20px;"></div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;

    // Type out the response
    const msgBbl = div.querySelector('.msg-bbl');
    typeAIResponse(msgBbl, text);
  } else {
    div.innerHTML = `
      <div class="msg-av" style="font-weight:600;min-width:32px;text-align:center;">${av}</div>
      <div class="msg-bbl"><p style="margin:0;">${text}</p></div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }
}

function typeAIResponse(element, fullText) {
  // Format the text
  const formattedHtml = formatAI(fullText);
  element.innerHTML = '';

  let charIndex = 0;
  const totalChars = fullText.length;
  const msgsContainer = document.getElementById('chat-msgs');

  const typeNextChar = () => {
    if (charIndex <= totalChars) {
      // Show partial HTML formatted response with typing cursor
      const partialText = fullText.substring(0, charIndex);
      element.innerHTML = formatAI(partialText) + '<span class="typing-cursor" style="display:inline;"></span>';
      charIndex += 2; // Type 2 chars at a time for speed
      if (msgsContainer) msgsContainer.scrollTop = msgsContainer.scrollHeight;
      setTimeout(typeNextChar, 15); // Typing speed
    } else {
      // Done typing - show final formatted content
      element.innerHTML = formattedHtml;
      if (msgsContainer) msgsContainer.scrollTop = msgsContainer.scrollHeight;
    }
  };

  typeNextChar();
}

function appendTyping() {
  const msgs = document.getElementById('chat-msgs');
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'msg ai'; div.id = id;
  div.innerHTML = `<div class="msg-av">🤖</div><div class="msg-bbl"><div class="typing-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}
