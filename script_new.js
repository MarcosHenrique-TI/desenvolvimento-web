  const STORAGE_KEY = 'healthClubAppData';
const defaultState = {
    profile: {},
    profileImage: '',
    workoutGroups: [],
    dailyLogs: [],
    dietGoals: {},
    dietLogs: {},
    dailyWeights: {},
    settings: { theme: 'dark' },
};

const state = { ...defaultState };
let dashboardCharts = {};

const elements = {
    views: document.querySelectorAll('.view'),
    sidebarButtons: document.querySelectorAll('button[data-view]'),
    themeToggle: document.querySelector('#themeToggle'),
    toastRoot: document.querySelector('#toastRoot'),
    profileForm: document.querySelector('#profileForm'),
    profileDisplay: document.querySelector('#profileDisplay'),
    workoutGroups: document.querySelector('#workoutGroups'),
    groupSelection: document.querySelector('#groupSelection'),
    dailyLog: document.querySelector('#dailyLog'),
    calendarGrid: document.querySelector('#calendarGrid'),
    logDate: document.querySelector('#logDate'),
    dietGoals: {
        calories: document.querySelector('#goalCalories'),
        protein: document.querySelector('#goalProtein'),
        carbs: document.querySelector('#goalCarbs'),
        fat: document.querySelector('#goalFat'),
    },
    dietLogs: {
        calories: document.querySelector('#logCalories'),
        protein: document.querySelector('#logProtein'),
        carbs: document.querySelector('#logCarbs'),
        fat: document.querySelector('#logFat'),
    },
    exportButton: document.querySelector('#exportButton'),
    exerciseSearch: document.querySelector('#exerciseSearch'),
    profilePhoto: document.querySelector('#profilePhoto'),
    profileImageInput: document.querySelector('#profileImageInput'),
    userNamePreview: document.querySelector('#userNamePreview'),
    dashboardRecords: {
        workoutStatus: document.querySelector('#workoutStatus'),
        caloriesConsumed: document.querySelector('#caloriesConsumed'),
        weeklyProgress: document.querySelector('#weeklyProgress'),
        levelBadge: document.querySelector('#levelBadge'),
    },
    chartWeekly: document.querySelector('#weeklyChart'),
    chartCalories: document.querySelector('#caloriesChart'),
    modalBackdrop: document.querySelector('#modalBackdrop'),
    modalTitle: document.querySelector('#modalTitle'),
    modalBody: document.querySelector('#modalBody'),
    modalPrimary: document.querySelector('#modalPrimary'),
    modalClose: document.querySelector('#modalClose'),
};

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    try {
        return { ...defaultState, ...JSON.parse(raw) };
    } catch (error) {
        console.error('Erro ao carregar estado:', error);
        return { ...defaultState };
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    elements.toastRoot.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3200);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    state.settings.theme = theme;
    saveState();
    elements.themeToggle.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i> Claro' : '<i class="fas fa-moon"></i> Escuro';
}

function showView(viewId) {
    elements.views.forEach((view) => view.classList.remove('active'));
    const view = document.getElementById(viewId);
    if (!view) return;
    view.classList.add('active');
    elements.sidebarButtons.forEach((button) => button.classList.toggle('active', button.dataset.view === viewId));

    if (viewId === 'dashboard') renderDashboard();
    if (viewId === 'profileView') {
        populateProfileForm();
        renderProfileView();
    }
    if (viewId === 'workout') renderWorkoutEditor();
    if (viewId === 'daily') loadDailyLog();
    if (viewId === 'calendar') renderCalendar();
    if (viewId === 'diet') loadDietData();

    view.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

function formatDateLabel(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function renderDashboard() {
    const today = getCurrentDate();
    const log = state.dailyLogs.find((entry) => entry.date === today);
    const workoutCompleted = Boolean(log && log.groups?.some((group) => group.exercises.some((ex) => ex.completed)));
    const caloriesLogged = Number(state.dietLogs[today]?.calories || 0);
    const weeklyCount = getWeekCompletionCount();
    const level = determineLevel(weeklyCount);

    elements.dashboardRecords.workoutStatus.textContent = workoutCompleted ? 'Completo' : 'Aberto';
    elements.dashboardRecords.caloriesConsumed.textContent = `${caloriesLogged} kcal`;
    elements.dashboardRecords.weeklyProgress.textContent = `${weeklyCount} treinos/semana`;
    elements.dashboardRecords.levelBadge.textContent = level;
    elements.userNamePreview.textContent = state.profile.name || 'Usuário';

    renderCharts();
}

function getWeekCompletionCount() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    return state.dailyLogs.filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate <= now && entry.groups?.some((group) => group.exercises.some((ex) => ex.completed));
    }).length;
}

function determineLevel(weeklyCount) {
    if (weeklyCount >= 4) return 'Avançado';
    if (weeklyCount >= 2) return 'Intermediário';
    return 'Iniciante';
}

function renderCharts() {
    const weeklyCanvas = elements.chartWeekly;
    const caloriesCanvas = elements.chartCalories;
    const weekDays = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    });
    const weeklyCounts = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        const key = date.toISOString().split('T')[0];
        const entry = state.dailyLogs.find((item) => item.date === key);
        return entry?.groups?.reduce((acc, group) => acc + group.exercises.filter((ex) => ex.completed).length, 0) || 0;
    });
    const caloriesData = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        const key = date.toISOString().split('T')[0];
        return Number(state.dietLogs[key]?.calories || 0);
    });

    if (dashboardCharts.weekly) dashboardCharts.weekly.destroy();
    if (dashboardCharts.calories) dashboardCharts.calories.destroy();

    dashboardCharts.weekly = new Chart(weeklyCanvas, {
        type: 'line',
        data: {
            labels: weekDays,
            datasets: [{
                label: 'Exercícios concluídos',
                data: weeklyCounts,
                borderColor: '#22d3ee',
                backgroundColor: 'rgba(56,189,248,0.2)',
                fill: true,
                tension: 0.35,
                pointRadius: 4,
                pointBackgroundColor: '#0ea5e9',
            }],
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: 'var(--muted)' } },
                y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: 'var(--muted)', beginAtZero: true } },
            },
        },
    });

    dashboardCharts.calories = new Chart(caloriesCanvas, {
        type: 'bar',
        data: {
            labels: weekDays,
            datasets: [{
                label: 'Calorias',
                data: caloriesData,
                backgroundColor: '#38bdf8',
                borderRadius: 12,
            }],
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: 'var(--muted)' } },
                y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: 'var(--muted)', beginAtZero: true } },
            },
        },
    });
}

function populateProfileForm() {
    const profile = state.profile;
    const form = document.querySelector('#profileForm');
    if (!form) return;
    form.querySelector('#name').value = profile.name || '';
    form.querySelector('#age').value = profile.age || '';
    form.querySelector('#weight').value = profile.weight || '';
    form.querySelector('#height').value = profile.height || '';
    form.querySelector('#goals').value = profile.goals || '';
}

function renderProfileView() {
    elements.profileDisplay.innerHTML = '';
    const profile = state.profile;
    const wrapper = document.createElement('div');
    wrapper.className = 'card';
    wrapper.innerHTML = `
        <div class="section-header">
            <div>
                <h2>Meu Perfil</h2>
                <p class="subtitle">Confira suas informações e progresso atual.</p>
            </div>
            <div class="level-badge"><i class="fas fa-star"></i>${determineLevel(getWeekCompletionCount())}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;">
            <div style="display:flex;flex-direction:column;gap:18px;">
                <img id="profilePhoto" class="profile-avatar" src="${state.profileImage || 'https://via.placeholder.com/160x160?text=Perfil'}" alt="Foto de perfil">
                <label class="file-label" for="profileImageInput"><i class="fas fa-upload"></i> Alterar foto</label>
                <input type="file" id="profileImageInput" class="file-input" accept="image/*">
            </div>
            <div style="display:grid;gap:18px;">
                <div class="card-block">
                    <h3>${profile.name || 'Sem nome'}</h3>
                    <p>${profile.goals || 'Nenhum objetivo definido ainda.'}</p>
                </div>
                <div class="card-block">
                    <div class="meta"><span class="tag">Idade</span><span>${profile.age || 'N/A'}</span></div>
                    <div class="meta"><span class="tag">Peso</span><span>${profile.weight || 'N/A'} kg</span></div>
                    <div class="meta"><span class="tag">Altura</span><span>${profile.height || 'N/A'} cm</span></div>
                </div>
            </div>
        </div>
    `;
    elements.profileDisplay.appendChild(wrapper);
    document.querySelector('#profileImageInput').addEventListener('change', handleProfileImageUpload);
}

function handleProfileImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        state.profileImage = reader.result;
        saveState();
        renderProfileView();
        createToast('Foto do perfil atualizada', 'success');
    };
    reader.readAsDataURL(file);
}

function renderWorkoutEditor() {
    elements.workoutGroups.innerHTML = '';
    const search = elements.exerciseSearch?.value?.toLowerCase?.() || '';
    state.workoutGroups.forEach((group, index) => {
        const card = document.createElement('div');
        card.className = 'group-card';
        const filteredExercises = group.exercises.filter((exercise) => exercise.name.toLowerCase().includes(search));
        card.innerHTML = `
            <header>
                <div>
                    <h3>${group.name}</h3>
                    <p>${filteredExercises.length} exercícios</p>
                </div>
                <div>
                    <button class="btn btn-secondary" data-action="edit-group" data-index="${index}"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-danger" data-action="delete-group" data-index="${index}"><i class="fas fa-trash"></i></button>
                </div>
            </header>
        `;
        const body = document.createElement('div');
        body.className = 'card-block';
        if (filteredExercises.length) {
            filteredExercises.forEach((exercise, exerciseIndex) => {
                const row = document.createElement('div');
                row.className = 'daily-group';
                row.innerHTML = `
                    <div class="daily-group">
                        <div class="exercise-row">
                            <h4>${exercise.name || 'Sem nome'}</h4>
                            <div><span class="tag">Séries</span> ${exercise.series || '-'}</div>
                            <div><span class="tag">Repetições</span> ${exercise.reps || '-'}</div>
                            <button class="btn btn-secondary" data-action="edit-exercise" data-group="${index}" data-exercise="${exerciseIndex}"><i class="fas fa-edit"></i></button>
                        </div>
                    </div>
                `;
                body.appendChild(row);
            });
        } else {
            body.innerHTML = `<p>Nenhum exercício encontrado para esta busca.</p>`;
        }
        const actions = document.createElement('div');
        actions.style.marginTop = '16px';
        actions.innerHTML = `<button class="btn btn-primary" data-action="add-exercise" data-index="${index}"><i class="fas fa-plus"></i> Adicionar Exercício</button>`;
        card.appendChild(body);
        card.appendChild(actions);
        elements.workoutGroups.appendChild(card);
    });
}

function openModal(title, bodyHtml, primaryActionText, onPrimary) {
    elements.modalTitle.textContent = title;
    elements.modalBody.innerHTML = bodyHtml;
    elements.modalPrimary.textContent = primaryActionText;
    elements.modalPrimary.onclick = () => {
        onPrimary();
        closeModal();
    };
    elements.modalBackdrop.classList.add('open');
}

function closeModal() {
    elements.modalBackdrop.classList.remove('open');
}

function initializeWorkoutEditor() {
    document.body.addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]');
        if (!action) return;
        const index = Number(action.dataset.index);
        if (action.dataset.action === 'edit-group') {
            openGroupEditor(index);
        }
        if (action.dataset.action === 'delete-group') {
            state.workoutGroups.splice(index, 1);
            saveState();
            renderWorkoutEditor();
            createToast('Grupo removido', 'success');
        }
        if (action.dataset.action === 'add-exercise') {
            openExerciseEditor(index);
        }
        if (action.dataset.action === 'edit-exercise') {
            openExerciseEditor(action.dataset.group, action.dataset.exercise);
        }
    });
}

function openGroupEditor(index) {
    const group = state.workoutGroups[index];
    openModal(
        'Editar Grupo de Treino',
        `
            <div class="input-group">
                <label>Nome do grupo</label>
                <input id="modalGroupName" type="text" value="${group.name}">
            </div>
        `,
        'Salvar',
        () => {
            const groupName = document.querySelector('#modalGroupName').value.trim();
            if (!groupName) return createToast('Informe o nome do grupo', 'error');
            state.workoutGroups[index].name = groupName;
            saveState();
            renderWorkoutEditor();
            createToast('Grupo atualizado', 'success');
        }
    );
}

function openExerciseEditor(groupIndex, exerciseIndex) {
    const group = state.workoutGroups[groupIndex];
    const exercise = group.exercises[exerciseIndex] || { name: '', series: '', reps: '' };
    openModal(
        exerciseIndex === undefined ? 'Adicionar Exercício' : 'Editar Exercício',
        `
            <div class="input-group">
                <label>Nome do exercício</label>
                <input id="modalExerciseName" type="text" value="${exercise.name}">
            </div>
            <div class="input-group">
                <label>Séries</label>
                <input id="modalExerciseSeries" type="number" value="${exercise.series}">
            </div>
            <div class="input-group">
                <label>Repetições</label>
                <input id="modalExerciseReps" type="number" value="${exercise.reps}">
            </div>
        `,
        'Salvar',
        () => {
            const name = document.querySelector('#modalExerciseName').value.trim();
            const series = document.querySelector('#modalExerciseSeries').value;
            const reps = document.querySelector('#modalExerciseReps').value;
            if (!name) return createToast('O exercício precisa de um nome', 'error');
            if (exerciseIndex !== undefined) {
                state.workoutGroups[groupIndex].exercises[exerciseIndex] = { id: exerciseIndex, name, series, reps };
                createToast('Exercício atualizado', 'success');
            } else {
                state.workoutGroups[groupIndex].exercises.push({ id: group.exercises.length, name, series, reps });
                createToast('Exercício adicionado', 'success');
            }
            saveState();
            renderWorkoutEditor();
        }
    );
}

function addNewWorkoutGroup() {
    openModal(
        'Novo Grupo de Treino',
        `
            <div class="input-group">
                <label>Nome do grupo</label>
                <input id="modalGroupName" type="text" placeholder="Perna, Peito, Costas...">
            </div>
        `,
        'Criar',
        () => {
            const groupName = document.querySelector('#modalGroupName').value.trim();
            if (!groupName) return createToast('Informe um nome para o grupo', 'error');
            state.workoutGroups.push({ name: groupName, exercises: [] });
            saveState();
            renderWorkoutEditor();
            createToast('Grupo criado', 'success');
        }
    );
}

function loadDailyLog() {
    elements.logDate.value = getCurrentDate();
    document.querySelector('#currentDate').textContent = `Treino do Dia: ${new Date().toLocaleDateString('pt-BR')}`;
    renderGroupSelection();
}

function renderGroupSelection() {
    const workoutGroups = state.workoutGroups;
    elements.groupSelection.innerHTML = '<h3>Selecionar grupos para hoje</h3>';
    if (!workoutGroups.length) {
        elements.groupSelection.innerHTML += '<p>Adicione um grupo na ficha de treino para começar.</p>';
        elements.dailyLog.innerHTML = '';
        return;
    }

    workoutGroups.forEach((group, index) => {
        const groupRow = document.createElement('label');
        groupRow.style.display = 'flex';
        groupRow.style.alignItems = 'center';
        groupRow.style.gap = '10px';
        groupRow.style.marginBottom = '10px';
        groupRow.innerHTML = `<input type="checkbox" data-group-index="${index}" checked> ${group.name}`;
        elements.groupSelection.appendChild(groupRow);
    });

    elements.groupSelection.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.addEventListener('change', updateDailyLog);
    });
    updateDailyLog();
}

function updateDailyLog() {
    const selectedIndexes = Array.from(elements.groupSelection.querySelectorAll('input[type="checkbox"]:checked')).map((checkbox) => Number(checkbox.dataset.groupIndex));
    const selectedGroups = state.workoutGroups.filter((_, index) => selectedIndexes.includes(index));
    const dailyLogContainer = elements.dailyLog;
    dailyLogContainer.innerHTML = '';

    if (!selectedGroups.length) {
        dailyLogContainer.innerHTML = '<p>Selecione ao menos um grupo para montar o treino.</p>';
        return;
    }

    selectedGroups.forEach((group, groupIndex) => {
        const groupCard = document.createElement('div');
        groupCard.className = 'daily-group';
        groupCard.innerHTML = `<h3>${group.name}</h3>`;

        if (!group.exercises.length) {
            groupCard.innerHTML += '<p>Sem exercícios neste grupo.</p>';
        } else {
            group.exercises.forEach((exercise) => {
                const row = document.createElement('div');
                row.className = 'exercise-row';
                const uniqueId = `${groupIndex}-${exercise.id}`;
                row.innerHTML = `
                    <div><h4>${exercise.name}</h4></div>
                    <div>
                        <label>Concluído</label>
                        <input type="checkbox" data-completed-id="${uniqueId}">
                    </div>
                    <div>
                        <label>Carga (kg)</label>
                        <input type="number" data-load-id="${uniqueId}" placeholder="0">
                    </div>
                    <div>
                        <label>Séries</label>
                        <input type="number" data-series-id="${uniqueId}" placeholder="0">
                    </div>
                `;
                groupCard.appendChild(row);
            });
        }
        dailyLogContainer.appendChild(groupCard);
    });
}

function markWorkoutCompleted() {
    elements.dailyLog.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        if (checkbox.dataset.completedId) checkbox.checked = true;
    });
    createToast('Treino marcado como concluído', 'success');
}

function saveDailyLog() {
    const date = elements.logDate.value || getCurrentDate();
    const selectedCheckboxes = elements.groupSelection.querySelectorAll('input[type="checkbox"]');
    const selectedGroups = Array.from(selectedCheckboxes)
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => Number(checkbox.dataset.groupIndex));

    const groups = selectedGroups.map((groupIndex) => {
        const group = state.workoutGroups[groupIndex];
        const exercises = group.exercises.map((exercise) => {
            const uniqueId = `${groupIndex}-${exercise.id}`;
            const completed = elements.dailyLog.querySelector(`input[data-completed-id="${uniqueId}"]`)?.checked || false;
            const load = elements.dailyLog.querySelector(`input[data-load-id="${uniqueId}"]`)?.value || '';
            const actualSeries = elements.dailyLog.querySelector(`input[data-series-id="${uniqueId}"]`)?.value || '';
            return { ...exercise, completed, load, actualSeries };
        });
        return { ...group, exercises };
    });

    const existingIndex = state.dailyLogs.findIndex((item) => item.date === date);
    const record = { date, groups };
    if (existingIndex >= 0) {
        state.dailyLogs[existingIndex] = record;
    } else {
        state.dailyLogs.push(record);
    }
    saveState();
    renderDashboard();
    createToast(`Treino salvo para ${formatDateLabel(date)}`, 'success');
}

function renderCalendar() {
    const monthNames = [...Array(12).keys()].map((n) => new Date(2024, n, 1).toLocaleString('pt-BR', { month: 'long' }));
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendarContainer = document.createElement('div');
    calendarContainer.className = 'card';
    calendarContainer.innerHTML = `<div class="section-header"><div><h2>Calendário ${monthNames[month]} ${year}</h2><p class="subtitle">Selecione um dia para ver o resumo de treinos e dieta.</p></div></div>`;

    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    const weekdayRow = document.createElement('div');
    weekdayRow.className = 'calendar-row';
    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach((weekday) => {
        const label = document.createElement('div');
        label.className = 'calendar-day-block';
        label.style.background = 'transparent';
        label.style.borderColor = 'transparent';
        label.style.color = 'var(--muted)';
        label.textContent = weekday;
        weekdayRow.appendChild(label);
    });
    grid.appendChild(weekdayRow);

    let row = document.createElement('div');
    row.className = 'calendar-row';
    for (let i = 0; i < firstDay; i += 1) {
        row.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const log = state.dailyLogs.find((entry) => entry.date === dateStr);
        const completed = Boolean(log?.groups?.some((group) => group.exercises.some((ex) => ex.completed)));

        const dayBlock = document.createElement('button');
        dayBlock.type = 'button';
        dayBlock.className = 'calendar-day-block';
        dayBlock.textContent = day;
        if (completed) dayBlock.classList.add('completed');
        if (dateStr === getCurrentDate()) dayBlock.classList.add('active');
        dayBlock.addEventListener('click', () => openDayModal(dateStr));
        row.appendChild(dayBlock);

        if ((firstDay + day) % 7 === 0 && day < daysInMonth) {
            grid.appendChild(row);
            row = document.createElement('div');
            row.className = 'calendar-row';
        }
    }

    grid.appendChild(row);

    const legend = document.createElement('div');
    legend.className = 'legend';
    legend.innerHTML = `
        <span><span class="marker" style="background: rgba(56,189,248,0.3)"></span> Treino agendado</span>
        <span><span class="marker" style="background: rgba(34,211,238,0.85)"></span> Treino concluído</span>
    `;

    elements.calendarGrid.innerHTML = '';
    elements.calendarGrid.appendChild(calendarContainer);
    calendarContainer.appendChild(grid);
    calendarContainer.appendChild(legend);
}

function openDayModal(dateStr) {
    elements.modalTitle.textContent = `Resumo ${formatDateLabel(dateStr)}`;
    const weight = state.dailyWeights[dateStr] || '';
    const log = state.dailyLogs.find((item) => item.date === dateStr);

    let bodyHtml = `
        <div class="input-group"><label>Data</label><input type="date" id="modalDateInput" value="${dateStr}"></div>
        <div class="input-group"><label>Peso (kg)</label><input id="modalWeight" type="number" value="${weight}"></div>
    `;

    if (log?.groups?.length) {
        log.groups.forEach((group) => {
            bodyHtml += `<div class="card-block"><h4>${group.name}</h4>`;
            group.exercises.forEach((exercise) => {
                bodyHtml += `<p>${exercise.name}: ${exercise.completed ? 'Concluído' : 'Aberto'} • ${exercise.load || '-'} kg • ${exercise.actualSeries || '-'} séries</p>`;
            });
            bodyHtml += '</div>';
        });
    } else {
        bodyHtml += '<p>Nenhum treino registrado para este dia.</p>';
    }

    const diet = state.dietLogs[dateStr] || null;
    bodyHtml += '<div class="card-block"><h4>Dieta</h4>';
    bodyHtml += diet ? `<p>Calorias: ${diet.calories || 0}</p><p>Proteína: ${diet.protein || 0}g</p><p>Carboidratos: ${diet.carbs || 0}g</p><p>Gordura: ${diet.fat || 0}g</p>` : '<p>Nenhum log de dieta.</p>';
    bodyHtml += '</div>';

    openModal('Resumo do Dia', bodyHtml, 'Salvar', () => {
        const nextDate = document.querySelector('#modalDateInput').value;
        const nextWeight = document.querySelector('#modalWeight').value;
        if (nextDate) {
            state.dailyWeights[nextDate] = nextWeight;
            saveState();
            renderCalendar();
            createToast('Resumo do dia atualizado', 'success');
        }
    });
}

function loadDietData() {
    const goals = state.dietGoals;
    elements.dietGoals.calories.value = goals.calories || '';
    elements.dietGoals.protein.value = goals.protein || '';
    elements.dietGoals.carbs.value = goals.carbs || '';
    elements.dietGoals.fat.value = goals.fat || '';

    const today = getCurrentDate();
    const todaysDiet = state.dietLogs[today] || {};
    elements.dietLogs.calories.value = todaysDiet.calories || '';
    elements.dietLogs.protein.value = todaysDiet.protein || '';
    elements.dietLogs.carbs.value = todaysDiet.carbs || '';
    elements.dietLogs.fat.value = todaysDiet.fat || '';
}

function saveGoals() {
    state.dietGoals = {
        calories: elements.dietGoals.calories.value,
        protein: elements.dietGoals.protein.value,
        carbs: elements.dietGoals.carbs.value,
        fat: elements.dietGoals.fat.value,
    };
    saveState();
    createToast('Metas salvas', 'success');
}

function saveDailyDiet() {
    const today = getCurrentDate();
    state.dietLogs[today] = {
        calories: elements.dietLogs.calories.value,
        protein: elements.dietLogs.protein.value,
        carbs: elements.dietLogs.carbs.value,
        fat: elements.dietLogs.fat.value,
    };
    saveState();
    createToast('Log de dieta salvo', 'success');
}

function renderWorkoutEditor() {
    elements.workoutGroups.innerHTML = '';
    const searchTerm = elements.exerciseSearch?.value?.trim().toLowerCase() || '';

    if (!state.workoutGroups.length) {
        elements.workoutGroups.innerHTML = '<div class="card"><p>Adicione um grupo para criar sua ficha de treino.</p></div>';
        return;
    }

    state.workoutGroups.forEach((group, index) => {
        const groupCard = document.createElement('div');
        groupCard.className = 'group-card';
        groupCard.innerHTML = `
            <header>
                <div>
                    <h3>${group.name}</h3>
                    <p>${group.exercises.length} exercícios</p>
                </div>
                <div style="display:flex;gap:10px;">
                    <button class="btn btn-secondary" data-action="edit-group" data-index="${index}"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-danger" data-action="delete-group" data-index="${index}"><i class="fas fa-trash"></i></button>
                </div>
            </header>
        `;

        const body = document.createElement('div');
        body.className = 'card-block';

        const exercisesToShow = searchTerm ? group.exercises.filter((exercise) => exercise.name.toLowerCase().includes(searchTerm)) : group.exercises;
        if (!exercisesToShow.length) {
            body.innerHTML = '<p>Nenhum exercício encontrado neste grupo.</p>';
        } else {
            exercisesToShow.forEach((exercise, exerciseIndex) => {
                const exerciseRow = document.createElement('div');
                exerciseRow.className = 'daily-group';
                exerciseRow.innerHTML = `
                    <div class="exercise-row">
                        <div><h4>${exercise.name}</h4></div>
                        <div><span class="tag">Séries</span> ${exercise.series || '-'}</div>
                        <div><span class="tag">Reps</span> ${exercise.reps || '-'}</div>
                        <button class="btn btn-secondary" data-action="edit-exercise" data-group="${index}" data-exercise="${exerciseIndex}"><i class="fas fa-edit"></i></button>
                    </div>
                `;
                body.appendChild(exerciseRow);
            });
        }

        const actions = document.createElement('div');
        actions.style.marginTop = '16px';
        actions.innerHTML = `<button class="btn btn-primary" data-action="add-exercise" data-index="${index}"><i class="fas fa-plus"></i> Adicionar exercício</button>`;
        groupCard.appendChild(body);
        groupCard.appendChild(actions);
        elements.workoutGroups.appendChild(groupCard);
    });
}

function exportData() {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `health-club-data-${getCurrentDate()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    createToast('Dados exportados como JSON', 'success');
}

function init() {
    const localState = loadState();
    Object.assign(state, localState);
    setTheme(state.settings.theme || 'dark');

    elements.sidebarButtons.forEach((button) => {
        button.addEventListener('click', () => showView(button.dataset.view));
    });

    elements.themeToggle.addEventListener('click', () => setTheme(state.settings.theme === 'dark' ? 'light' : 'dark'));
    elements.profileForm.addEventListener('submit', handleProfileSubmit);
    elements.exportButton?.addEventListener('click', exportData);
    elements.exerciseSearch?.addEventListener('input', renderWorkoutEditor);
    elements.modalClose.addEventListener('click', closeModal);
    elements.modalBackdrop.addEventListener('click', (event) => {
        if (event.target === elements.modalBackdrop) closeModal();
    });
    document.querySelector('#addGroupButton')?.addEventListener('click', addNewWorkoutGroup);
    document.querySelector('#saveGoals')?.addEventListener('click', saveGoals);
    document.querySelector('#saveDiet')?.addEventListener('click', saveDailyDiet);

    renderWorkoutEditor();
    renderDashboard();
    renderProfileView();
    initializeWorkoutEditor();
}

function handleProfileSubmit(event) {
    event.preventDefault();
    const form = event.target;
    state.profile = {
        name: form.querySelector('#name').value,
        age: form.querySelector('#age').value,
        weight: form.querySelector('#weight').value,
        height: form.querySelector('#height').value,
        goals: form.querySelector('#goals').value,
    };
    saveState();
    document.querySelector('button[data-view="profileView"]').style.display = 'inline-flex';
    createToast('Perfil salvo com sucesso', 'success');
    showView('profileView');
}

window.addEventListener('DOMContentLoaded', init);

