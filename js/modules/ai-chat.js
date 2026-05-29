/**
 * ai-chat.js — Gemini AI Business Assistant
 */

import { Network } from '@capacitor/network';
import { escHtml, toast } from '../utils.js';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';

export function onTabFocus() {
  const container = document.getElementById('chatMessages');
  if (container && !container.querySelector('.chat-bubble-ai')) {
    addAIMessage('Hello! Ask me about sales, stock, or tips for your restaurant.');
  }
}

export async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input?.value?.trim();
  if (!msg) return;
  const net = await Network.getStatus();
  if (!net.connected) { toast('AI chat requires internet', 'warning'); return; }
  addUserMessage(msg);
  if (input) input.value = '';
  const typing = addTyping();
  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role:'user', parts:[{text:msg}] }] })
    });
    const data = await res.json();
    typing.remove();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    addAIMessage(text);
  } catch (err) {
    typing.remove();
    addAIMessage('Sorry, I could not reach Gemini right now. Check your API key or network.');
  }
}

export function quickAsk(q) {
  const input = document.getElementById('chatInput');
  if (input) input.value = q;
  sendChat();
}

function addUserMessage(text) {
  const c = document.getElementById('chatMessages');
  if (!c) return;
  c.innerHTML += `<div class="chat-bubble-user"><span>${escHtml(text)}</span></div>`;
  c.scrollTop = c.scrollHeight;
}

function addAIMessage(text) {
  const c = document.getElementById('chatMessages');
  if (!c) return;
  c.innerHTML += `<div class="chat-bubble-ai"><span>${escHtml(text)}</span></div>`;
  c.scrollTop = c.scrollHeight;
}

function addTyping() {
  const c = document.getElementById('chatMessages');
  if (!c) return document.createElement('div');
  const el = document.createElement('div');
  el.className = 'chat-typing';
  el.textContent = '🤖 Typing...';
  c.appendChild(el);
  c.scrollTop = c.scrollHeight;
  return el;
}
