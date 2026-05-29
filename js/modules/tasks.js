/**
 * tasks.js — Task management with assignments
 */

import { api } from '../api.js';
import { escHtml, fmtNum, toast, today } from '../utils.js';

let tasksCache = [];

export async function onTabFocus() {
  await loadTasks();
  renderTasks();
}

async function loadTasks() {
  const res = await api('GET_TASKS');
  tasksCache = res.tasks || [];
}

function renderTasks() {
  const tbody = document.getElementById('tasksTable');
  if (!tbody) return;
  tbody.innerHTML = tasksCache.map(t => `
    <tr>
      <td>${escHtml(t.task)}</td>
      <td><span class="status-badge ${t.priority==='Urgent'?'status-critical':t.priority==='High'?'status-low':'status-ok'}">${t.priority}</span></td>
      <td>${escHtml(t.assigned||'Unassigned')}</td>
      <td><span class="status-badge ${t.status==='Done'?'status-done':'status-active'}">${t.status||'Pending'}</span></td>
      <td>${t.due || '-'}</td>
      <td>${t.status !== 'Done' ? `<button class="btn btn-sm btn-green" onclick="Tasks.completeTask('${escHtml(t.id)}')">✓ Done</button>` : ''}</td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--gray);">No tasks</td></tr>';
}

export async function addTask() {
  const payload = {
    task: document.getElementById('taskText')?.value?.trim(),
    priority: document.getElementById('taskPriority')?.value || 'Medium',
    assigned: document.getElementById('taskAssign')?.value || 'Unassigned',
    due: document.getElementById('taskDue')?.value || '',
    notes: document.getElementById('taskNotes')?.value || '',
    status: 'Pending',
    updatedAt: Date.now()
  };
  if (!payload.task) { toast('Enter task description', 'warning'); return; }
  await api('ADD_TASK', payload);
  document.getElementById('taskText').value = '';
  document.getElementById('taskNotes').value = '';
  await loadTasks(); renderTasks();
  toast('Task added');
}

export async function completeTask(id) {
  await api('UPDATE_TASK', { id, status: 'Done', updatedAt: Date.now() });
  await loadTasks(); renderTasks();
  toast('Task marked done');
}
