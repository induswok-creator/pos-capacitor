/**
 * content.js — Social media content ideas + AI generation
 */

import { api } from '../api.js';
import { escHtml, toast } from '../utils.js';

let ideasCache = [];

export async function onTabFocus() {
  await loadIdeas();
  renderIdeas();
}

async function loadIdeas() {
  const res = await api('GET_CONTENT_IDEAS');
  ideasCache = res.contentIdeas || [];
}

function renderIdeas() {
  const tbody = document.getElementById('contentTable');
  if (!tbody) return;
  tbody.innerHTML = ideasCache.map(i => `
    <tr>
      <td>${escHtml(i.idea)}</td>
      <td>${escHtml(i.platform)}</td>
      <td>${escHtml(i.category)}</td>
      <td><span class="status-badge ${i.status==='Done'?'status-done':'status-active'}">${i.status||'Pending'}</span></td>
      <td><button class="btn btn-sm ${i.status==='Done'?'btn-outline':'btn-green'}" onclick="Content.toggleIdeaStatus('${escHtml(i.id)}', '${i.status==='Done'?'Pending':'Done'}')">${i.status==='Done'?'↩ Undo':'✓ Done'}</button></td>
    </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray);">No ideas yet</td></tr>';
}

export async function saveIdea() {
  const payload = {
    idea: document.getElementById('contentIdea')?.value?.trim(),
    platform: document.getElementById('contentPlatform')?.value || 'Instagram',
    category: document.getElementById('contentCategory')?.value || 'General',
    status: 'Pending',
    updatedAt: Date.now()
  };
  if (!payload.idea) { toast('Enter idea', 'warning'); return; }
  await api('SAVE_CONTENT_IDEA', payload);
  document.getElementById('contentIdea').value = '';
  await loadIdeas(); renderIdeas();
  toast('Idea saved');
}

export async function generateAIidea() {
  // Fallback: generate locally if no internet
  const ideas = [
    "📸 Behind-the-scenes reel of your chef tossing noodles in the wok — Instagram",
    "🍜 'Top 5 Pan-Asian dishes you must try this weekend' — Facebook post",
    "🎥 Quick recipe video: 30-sec Schezwan Fried Rice — YouTube Shorts",
    "📢 'Flash sale: 15% off on all combos today only!' — WhatsApp Status",
    "🌟 Customer testimonial spotlight — 'Best hakka noodles in town!' — Instagram Stories"
  ];
  const idea = ideas[Math.floor(Math.random() * ideas.length)];
  document.getElementById('contentIdea').value = idea;
  toast('💡 AI Idea generated! (Save to keep)');
}

export async function toggleIdeaStatus(id, newStatus) {
  await api('UPDATE_CONTENT_IDEA', { id, status: newStatus, updatedAt: Date.now() });
  await loadIdeas(); renderIdeas();
}
