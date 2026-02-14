const KEY = 'hourglass-v2';
const defaultState = {
  tasks: [],
  xp: 0,
  focusSessions: 0,
  totalFocusMinutes: 0,
  schedule: [],
  exam: null,
  notes: '',
  achievements: [],
  dailyHours: {},
  lastDailyPrompt: null,
};
const state = { ...defaultState, ...load() };

const $ = (id) => document.getElementById(id);
const taskList = $('task-list');
const deadlineAlerts = $('deadline-alerts');
const priorityAlert = $('priority-alert');
const breakdownList = $('breakdown-list');
const focusTaskLink = $('focus-task-link');
const achievementsList = $('achievements');
const leaderboard = $('leaderboard');

let focusTimer = null;
let focusRemaining = 0;
let focusPaused = false;

init();

function init() {
  bindNav();
  bindTasks();
  bindBreakdown();
  bindFocus();
  bindPlanning();
  bindNotes();
  maybeAskDailyLog();
  renderAll();
  setInterval(renderExamCountdown, 1000);
}

function bindNav() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
      btn.classList.add('active');
      $(btn.dataset.view).classList.add('active');
    });
  });
}

function bindTasks() {
  $('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('task-title').value.trim();
    if (!title) return;
    state.tasks.push({
      id: crypto.randomUUID(), title,
      priority: $('task-priority').value,
      deadline: $('task-deadline').value || null,
      createdAt: Date.now(),
      completed: false,
      completedAt: null,
      penaltyApplied: false,
    });
    $('task-title').value = '';
    save();
    renderAll();
  });
}

function bindBreakdown() {
  $('breakdown-btn').addEventListener('click', () => {
    const goal = $('goal-input').value.trim();
    if (!goal) return;
    const pieces = [
      `Clarify end-goal for: ${goal}`,
      'Create a milestone timeline',
      'Break milestone into 30-60 min tasks',
      'Schedule top 3 tasks this week',
      'Review progress and adjust plan',
    ];
    breakdownList.innerHTML = '';
    pieces.forEach((text) => {
      const li = document.createElement('li');
      const add = document.createElement('button');
      add.textContent = 'Add as task';
      add.className = 'secondary';
      add.onclick = () => {
        state.tasks.push({ id: crypto.randomUUID(), title: text, priority: 'Medium', deadline: null, createdAt: Date.now(), completed: false, completedAt: null, penaltyApplied: false });
        save();
        renderAll();
      };
      li.textContent = text + ' ';
      li.appendChild(add);
      breakdownList.appendChild(li);
    });
  });
}

function bindFocus() {
  $('focus-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const minutes = Number($('focus-minutes').value);
    if (!minutes || minutes <= 0) return;
    focusRemaining = minutes * 60;
    focusPaused = false;
    $('focus-status').textContent = `Active: ${$('focus-name').value || 'Focus Session'}`;
    clearInterval(focusTimer);
    focusTimer = setInterval(tickFocus, 1000);
    renderFocus();
  });

  $('pause-focus').addEventListener('click', () => {
    focusPaused = !focusPaused;
  });

  $('stop-focus').addEventListener('click', () => {
    clearInterval(focusTimer);
    focusTimer = null;
    focusRemaining = 0;
    $('focus-status').textContent = 'Session stopped.';
    renderFocus();
  });

  $('load-audio').addEventListener('click', () => {
    $('audio-player').src = $('audio-url').value.trim();
  });
  $('audio-file').addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (f) $('audio-player').src = URL.createObjectURL(f);
  });
  $('set-spotify').addEventListener('click', () => {
    $('spotify-frame').src = $('spotify-url').value.trim();
  });
}

function tickFocus() {
  if (focusPaused || focusRemaining <= 0) return;
  focusRemaining -= 1;
  renderFocus();
  if (focusRemaining === 0) {
    clearInterval(focusTimer);
    focusTimer = null;
    state.focusSessions += 1;
    const mins = Number($('focus-minutes').value);
    state.totalFocusMinutes += mins;
    addXP(40, 'Focus session completed');
    $('focus-status').textContent = 'Completed! +40 XP';
    save();
    renderAll();
  }
}

function renderFocus() {
  const m = String(Math.floor(focusRemaining / 60)).padStart(2, '0');
  const s = String(focusRemaining % 60).padStart(2, '0');
  $('focus-display').textContent = `${m}:${s}`;
}

function bindPlanning() {
  $('save-exam').addEventListener('click', () => {
    state.exam = { name: $('exam-name').value.trim() || 'Exam', at: $('exam-date').value };
    save(); renderExamCountdown();
  });

  $('schedule-form').addEventListener('submit', (e) => {
    e.preventDefault();
    state.schedule.push({
      id: crypto.randomUUID(),
      title: $('sched-title').value.trim(), day: $('sched-day').value, time: $('sched-time').value,
      color: $('sched-color').value, repeat: $('sched-repeat').checked,
    });
    $('sched-title').value = '';
    save(); renderSchedule();
  });

  const subjects = {
    Biology: ['Cell Biology', 'Genetics', 'Ecology'],
    Chemistry: ['Atomic Structure', 'Bonding', 'Organic Chemistry'],
    Physics: ['Kinematics', 'Electricity', 'Waves'],
  };
  const container = $('subjects');
  container.innerHTML = '';
  Object.entries(subjects).forEach(([sub, topics]) => {
    const card = document.createElement('div');
    card.className = 'subject';
    card.innerHTML = `<h3>${sub}</h3>`;
    topics.forEach((t) => {
      const row = document.createElement('div');
      row.innerHTML = `<strong>${t}</strong><br>
      <label><input type="checkbox"> Theory</label>
      <label><input type="checkbox"> MCQ</label>
      <label><input type="checkbox"> Essay</label>`;
      card.appendChild(row);
    });
    container.appendChild(card);
  });
}

function bindNotes() {
  document.querySelectorAll('.toolbar button').forEach((btn) => {
    btn.addEventListener('click', () => document.execCommand(btn.dataset.cmd, false, null));
  });
  $('save-notes').addEventListener('click', () => {
    state.notes = $('notes-editor').innerHTML;
    save();
  });
  $('generate-journal').addEventListener('click', () => {
    const tasksDone = state.tasks.filter((t) => t.completed).length;
    const hours = (state.totalFocusMinutes / 60).toFixed(1);
    $('journal-output').value = `Today you made meaningful progress. You completed ${tasksDone} tasks and focused for ${hours} hours. Keep going—your consistency is building momentum.`;
  });
}

function maybeAskDailyLog() {
  const today = new Date().toDateString();
  if (state.lastDailyPrompt === today) return;
  state.lastDailyPrompt = today;
  save();
  const modal = $('daily-log-modal');
  if (!modal.showModal) return;
  modal.showModal();
  $('daily-log-form').addEventListener('submit', () => {
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const hrs = Number($('daily-hours').value || 0);
    state.dailyHours[y] = hrs;
    addXP(Math.round(hrs * 20), 'Daily hours logged');
    save();
    renderStats();
  }, { once: true });
}

function renderAll() {
  applyOverduePenalty();
  renderTasks();
  renderTaskAlerts();
  renderSchedule();
  renderExamCountdown();
  renderProfile();
  renderAchievements();
  renderLeaderboard();
  renderStats();
  $('notes-editor').innerHTML = state.notes || '';

  focusTaskLink.innerHTML = '<option value="">Link to task (optional)</option>' + state.tasks
    .filter((t) => !t.completed)
    .map((t) => `<option value="${t.id}">${t.title}</option>`).join('');
}

function getVisibleTasks() {
  const today = new Date().toDateString();
  return state.tasks.filter((t) => !(t.completed && new Date(t.completedAt || 0).toDateString() !== today));
}

function renderTasks() {
  const visible = getVisibleTasks();
  taskList.innerHTML = '';
  visible.sort((a, b) => priorityScore(a.priority) - priorityScore(b.priority) || a.createdAt - b.createdAt);
  visible.forEach((task) => {
    const li = document.createElement('li');
    li.innerHTML = `<div class="task-row"><label><input type="checkbox" ${task.completed ? 'checked' : ''}/> ${task.title}</label>
      <span class="badge ${task.priority.toLowerCase()}">${task.priority}</span></div>
      <small class="muted">${task.deadline ? `Due ${task.deadline}` : 'No deadline'}</small>`;
    const [checkbox] = li.querySelectorAll('input');
    checkbox.addEventListener('change', () => {
      task.completed = checkbox.checked;
      task.completedAt = checkbox.checked ? Date.now() : null;
      if (checkbox.checked) addXP(100, 'Task completed');
      save(); renderAll();
    });
    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.className = 'danger';
    del.onclick = () => {
      state.tasks = state.tasks.filter((t) => t.id !== task.id);
      save(); renderAll();
    };
    li.appendChild(del);
    taskList.appendChild(li);
  });
}

function renderTaskAlerts() {
  const pending = state.tasks.filter((t) => !t.completed);
  pending.sort((a, b) => priorityScore(a.priority) - priorityScore(b.priority) || a.createdAt - b.createdAt);
  priorityAlert.textContent = pending[0]
    ? `Top priority: ${pending[0].title} (${pending[0].priority})`
    : 'No pending tasks.';

  const soon = pending.filter((t) => t.deadline && daysUntil(t.deadline) >= 0 && daysUntil(t.deadline) <= 2);
  deadlineAlerts.innerHTML = soon.map((t) => `<div class="notice">⚠ Due soon: ${t.title} (${t.deadline})</div>`).join('');
}

function renderSchedule() {
  const list = $('schedule-list');
  list.innerHTML = '';
  state.schedule.forEach((e) => {
    const li = document.createElement('li');
    li.innerHTML = `<span style="color:${e.color}">●</span> ${e.day} ${e.time} - ${e.title} ${e.repeat ? '(weekly)' : ''}`;
    list.appendChild(li);
  });
}

function renderExamCountdown() {
  const c = $('exam-countdown');
  if (!state.exam?.at) return c.textContent = 'No exam set.';
  const diff = new Date(state.exam.at).getTime() - Date.now();
  if (diff <= 0) return c.textContent = `${state.exam.name}: Time reached!`;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  c.textContent = `${state.exam.name}: ${d}d ${h}h ${m}m ${s}s`;
}

function addXP(amount) {
  state.xp = Math.max(0, state.xp + amount);
  evaluateAchievements();
}

function applyOverduePenalty() {
  const today = new Date().toISOString().slice(0, 10);
  state.tasks.forEach((t) => {
    if (!t.completed && t.deadline && t.deadline < today && !t.penaltyApplied) {
      t.penaltyApplied = true;
      addXP(-250);
    }
  });
}

function evaluateAchievements() {
  const unlock = (id, name) => {
    if (!state.achievements.find((a) => a.id === id)) state.achievements.push({ id, name, at: new Date().toISOString() });
  };
  if (state.tasks.some((t) => t.completed)) unlock('first-task', 'First Task Completed');
  if (state.totalFocusMinutes >= 120) unlock('focus-2h', 'Focused for 2 hours');
  if (level() >= 5) unlock('level-5', 'Reached Level 5');
}

function level() {
  return Math.floor(state.xp / 500) + 1;
}

function renderProfile() {
  const lvl = level();
  const inLevel = state.xp % 500;
  $('profile-level').textContent = `Level ${lvl}`;
  $('profile-xp').textContent = `${state.xp} XP`;
  $('xp-progress').style.width = `${(inLevel / 500) * 100}%`;
}

function renderAchievements() {
  achievementsList.innerHTML = '';
  if (!state.achievements.length) achievementsList.innerHTML = '<li>No achievements yet.</li>';
  state.achievements.forEach((a) => {
    const li = document.createElement('li');
    li.textContent = a.name;
    achievementsList.appendChild(li);
  });
}

function renderLeaderboard() {
  const users = [
    { name: 'You', xp: state.xp },
    { name: 'Ava', xp: 2200 },
    { name: 'Liam', xp: 1600 },
    { name: 'Noah', xp: 1100 },
  ].sort((a, b) => b.xp - a.xp);
  leaderboard.innerHTML = users.map((u) => `<li>${u.name} — ${u.xp} XP</li>`).join('');
}

function renderStats() {
  const tasksDone = state.tasks.filter((t) => t.completed).length;
  $('stats-summary').textContent = `Tasks completed: ${tasksDone} | Focus sessions: ${state.focusSessions} | Focus hours: ${(state.totalFocusMinutes/60).toFixed(1)}`;
  const chart = $('hours-chart');
  chart.innerHTML = '';
  const entries = Object.entries(state.dailyHours).slice(-7);
  entries.forEach(([d, h]) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${Math.max(8, h * 20)}px`;
    bar.innerHTML = `<span>${d.slice(5)} (${h}h)</span>`;
    chart.appendChild(bar);
  });
}

function priorityScore(p) {
  return { High: 0, Medium: 1, Low: 2 }[p] ?? 3;
}

function daysUntil(dateStr) {
  const a = new Date(dateStr + 'T00:00:00').getTime();
  const b = new Date(new Date().toISOString().slice(0,10) + 'T00:00:00').getTime();
  return Math.round((a - b) / 86400000);
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
