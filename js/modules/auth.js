/**
 * auth.js — Login / PIN / User management module
 */

import { api } from '../api.js';
import { toast } from '../utils.js';

export async function loadUsers() {
  const res = await api('GET_USERS');
  return res.users || [];
}

export async function addUser(payload) {
  const res = await api('ADD_USER', payload);
  if (res.success) toast('User added');
  else toast('Failed: ' + res.message, 'error');
  return res;
}
