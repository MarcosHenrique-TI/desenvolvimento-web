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

let state = { ...defaultState };
let dashboardCharts = {};
let elements = {};

// Utility functions
function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...defaultState };
        const parsed = JSON.parse(raw);
        return { ...defaultState, ...parsed };
    } catch (error) {
        console.error('Erro ao carregar estado do localStorage:', error);
        showToast('Erro ao carregar dados salvos. Usando valores padrão.', 'error');
        return { ...defaultState };
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Erro ao salvar estado no localStorage:', error);
        showToast('Erro ao salvar dados.', 'error');
    }
}

function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

function formatDateLabel(dateString) {
    try {
        return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return dateString;
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    if (elements.toastRoot) {
        elements.toastRoot.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 3200);
    } else {
        console.warn('Toast root not found');
    }
}

function validateInput(value, type = 'string') {
    if (type === 'number') {
        const num = Number(value);
        return !isNaN(num) && num >= 0;
    }
    return value && value.trim().length > 0;
}

// Rendering functions
function renderDashboard() {
    if (!elements.dashboardRecords) return;
    const today = getCurrentDate();
    const log = state.dailyLogs.find((entry) => entry.date === today);
    const workoutCompleted = Boolean(log && log.groups?.some((group) => group.exercises.some((ex) => ex.completed)));
    const caloriesLogged = Number(state.dietLogs[today]?.calories || 0);
    const weeklyCount = getWeekCompletionCount();
    const level = determineLevel(weeklyCount);

    elements.dashboardRecords.workoutStatus.innerHTML = workoutCompleted ? '<span class="badge success">Completo</span>' : '<span class="badge danger">Aberto</span>';
    elements.dashboardRecords.caloriesConsumed.textContent = `${caloriesLogged} kcal`;
    elements.dashboardRecords.weeklyProgress.textContent = `${weeklyCount} treinos/semana`;
    elements.dashboardRecords.levelBadge.textContent = level;
    if (elements.userNamePreview) elements.userNamePreview.textContent = state.profile.name || 'Usuário';

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
    if (!elements.chartWeekly || !elements.chartCalories) return;
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

    try {
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
    } catch (error) {
        console.error('Erro ao renderizar gráficos:', error);
        showToast('Erro ao carregar gráficos.', 'error');
    }
}

function renderProfileView() {
    if (!elements.profileDisplay) return;
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
            <div style="display:flex;gap:10px;align-items:center;">
                <div class="level-badge"><i class="fas fa-star"></i>${determineLevel(getWeekCompletionCount())}</div>
                <button class="btn btn-secondary" id="editProfileButton"><i class="fas fa-edit"></i> Editar</button>
            </div>
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
                    <div class="meta"><span class="tag">Sexo</span><span>${profile.gender || 'N/A'}</span></div>
                    <div class="meta"><span class="tag">Idade</span><span>${profile.age || 'N/A'}</span></div>
                    <div class="meta"><span class="tag">Peso</span><span>${profile.weight || 'N/A'} kg</span></div>
                    <div class="meta"><span class="tag">Altura</span><span>${profile.height || 'N/A'} cm</span></div>
                </div>
            </div>
        </div>
    `;
    elements.profileDisplay.appendChild(wrapper);
    const profileImageInput = document.getElementById('profileImageInput');
    const editProfileButton = document.getElementById('editProfileButton');
    if (profileImageInput) profileImageInput.addEventListener('change', handleProfileImageUpload);
    if (editProfileButton) editProfileButton.addEventListener('click', openProfileEditor);
}

function renderWorkoutEditor() {
    if (!elements.workoutGroups) return;
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

function renderCalendar() {
    if (!elements.calendarGrid) return;
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

function loadDietData() {
    if (!elements.dietGoals || !elements.dietLogs) return;
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

    updateDietProgress();
}

function updateDietProgress() {
    const goals = state.dietGoals;
    const todaysDiet = state.dietLogs[getCurrentDate()] || {};
    const calories = Number(todaysDiet.calories || 0);
    const goalCalories = Number(goals.calories || 0);
    const protein = Number(todaysDiet.protein || 0);
    const goalProtein = Number(goals.protein || 0);
    const carbs = Number(todaysDiet.carbs || 0);
    const goalCarbs = Number(goals.carbs || 0);
    const fat = Number(todaysDiet.fat || 0);
    const goalFat = Number(goals.fat || 0);

    const caloriesPercent = goalCalories ? (calories / goalCalories) * 100 : 0;
    const proteinPercent = goalProtein ? (protein / goalProtein) * 100 : 0;
    const carbsPercent = goalCarbs ? (carbs / goalCarbs) * 100 : 0;
    const fatPercent = goalFat ? (fat / goalFat) * 100 : 0;

    const caloriesProgress = document.getElementById('caloriesProgress');
    const proteinProgress = document.getElementById('proteinProgress');
    const carbsProgress = document.getElementById('carbsProgress');
    const fatProgress = document.getElementById('fatProgress');
    const caloriesProgressText = document.getElementById('caloriesProgressText');
    const proteinProgressText = document.getElementById('proteinProgressText');
    const carbsProgressText = document.getElementById('carbsProgressText');
    const fatProgressText = document.getElementById('fatProgressText');

    if (caloriesProgress) {
        caloriesProgress.style.width = Math.min(caloriesPercent, 100) + '%';
        caloriesProgress.classList.toggle('exceeded', caloriesPercent > 100);
    }
    if (proteinProgress) {
        proteinProgress.style.width = Math.min(proteinPercent, 100) + '%';
        proteinProgress.classList.toggle('exceeded', proteinPercent > 100);
    }
    if (carbsProgress) {
        carbsProgress.style.width = Math.min(carbsPercent, 100) + '%';
        carbsProgress.classList.toggle('exceeded', carbsPercent > 100);
    }
    if (fatProgress) {
        fatProgress.style.width = Math.min(fatPercent, 100) + '%';
        fatProgress.classList.toggle('exceeded', fatPercent > 100);
    }
    if (caloriesProgressText) caloriesProgressText.textContent = `${calories} / ${goalCalories} kcal`;
    if (proteinProgressText) proteinProgressText.textContent = `${protein} / ${goalProtein} g`;
    if (carbsProgressText) carbsProgressText.textContent = `${carbs} / ${goalCarbs} g`;
    if (fatProgressText) fatProgressText.textContent = `${fat} / ${goalFat} g`;
}

// Event handlers
function showView(viewId) {
    if (!elements.views) return;
    elements.views.forEach((view) => view.classList.remove('active'));
    const view = document.getElementById(viewId);
    if (!view) return;
    view.classList.add('active');
    if (elements.sidebarButtons) {
        elements.sidebarButtons.forEach((button) => button.classList.toggle('active', button.dataset.view === viewId));
    }

    if (viewId === 'dashboard') renderDashboard();
    if (viewId === 'profileView') renderProfileView();
    if (viewId === 'workout') renderWorkoutEditor();
    if (viewId === 'daily') loadDailyLog();
    if (viewId === 'calendar') renderCalendar();
    if (viewId === 'diet') loadDietData();

    view.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    state.settings.theme = theme;
    saveState();
    if (elements.themeToggle) {
        elements.themeToggle.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i> Claro' : '<i class="fas fa-moon"></i> Escuro';
    }
}

function handleProfileImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        state.profileImage = reader.result;
        saveState();
        renderProfileView();
        showToast('Foto do perfil atualizada', 'success');
    };
    reader.readAsDataURL(file);
}

function openProfileEditor() {
    const profile = state.profile;
    openModal(
        'Editar Perfil',
        `
            <div class="form-grid">
                <div class="input-group">
                    <label>Nome</label>
                    <input id="modalName" type="text" value="${profile.name || ''}">
                </div>
                <div class="input-group">
                    <label>Sexo</label>
                    <select id="modalGender">
                        <option value="">Selecione</option>
                        <option value="masculino" ${profile.gender === 'masculino' ? 'selected' : ''}>Masculino</option>
                        <option value="feminino" ${profile.gender === 'feminino' ? 'selected' : ''}>Feminino</option>
                        <option value="transgênero" ${profile.gender === 'transgênero' ? 'selected' : ''}>Transgênero</option>
                        <option value="não-binário" ${profile.gender === 'não-binário' ? 'selected' : ''}>Não-binário</option>
                        <option value="outro" ${profile.gender === 'outro' ? 'selected' : ''}>Outro</option>
                        <option value="prefiro não dizer" ${profile.gender === 'prefiro não dizer' ? 'selected' : ''}>Prefiro não dizer</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Idade</label>
                    <input id="modalAge" type="number" value="${profile.age || ''}">
                </div>
                <div class="input-group">
                    <label>Peso (kg)</label>
                    <input id="modalWeight" type="number" value="${profile.weight || ''}">
                </div>
                <div class="input-group">
                    <label>Altura (cm)</label>
                    <input id="modalHeight" type="number" value="${profile.height || ''}">
                </div>
                <div class="input-group" style="grid-column:1/-1;">
                    <label>Objetivos</label>
                    <textarea id="modalGoals">${profile.goals || ''}</textarea>
                </div>
            </div>
        `,
        'Salvar',
        () => {
            const nameEl = document.getElementById('modalName');
            const genderEl = document.getElementById('modalGender');
            const ageEl = document.getElementById('modalAge');
            const weightEl = document.getElementById('modalWeight');
            const heightEl = document.getElementById('modalHeight');
            const goalsEl = document.getElementById('modalGoals');
            if (!nameEl || !genderEl || !ageEl || !weightEl || !heightEl || !goalsEl) return;

            const name = nameEl.value.trim();
            const gender = genderEl.value;
            const age = ageEl.value;
            const weight = weightEl.value;
            const height = heightEl.value;
            const goals = goalsEl.value.trim();

            if (!validateInput(name)) {
                showToast('Nome é obrigatório.', 'error');
                return;
            }
            if (!validateInput(age, 'number')) {
                showToast('Idade deve ser um número válido.', 'error');
                return;
            }
            if (!validateInput(weight, 'number')) {
                showToast('Peso deve ser um número válido.', 'error');
                return;
            }
            if (!validateInput(height, 'number')) {
                showToast('Altura deve ser um número válido.', 'error');
                return;
            }

            state.profile = { name, gender, age, weight, height, goals };
            saveState();
            renderProfileView();
            showToast('Perfil salvo', 'success');
        }
    );
}

function openModal(title, bodyHtml, primaryActionText, onPrimary) {
    if (!elements.modalTitle || !elements.modalBody || !elements.modalPrimary || !elements.modalBackdrop) return;
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
    if (elements.modalBackdrop) elements.modalBackdrop.classList.remove('open');
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
            showToast('Grupo removido', 'success');
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
    if (!group) return;
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
            const groupNameEl = document.getElementById('modalGroupName');
            if (!groupNameEl) return;
            const groupName = groupNameEl.value.trim();
            if (!validateInput(groupName)) {
                showToast('Nome do grupo é obrigatório.', 'error');
                return;
            }
            state.workoutGroups[index].name = groupName;
            saveState();
            renderWorkoutEditor();
            showToast('Grupo atualizado', 'success');
        }
    );
}

function openExerciseEditor(groupIndex, exerciseIndex) {
    const group = state.workoutGroups[groupIndex];
    if (!group) return;
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
            const nameEl = document.getElementById('modalExerciseName');
            const seriesEl = document.getElementById('modalExerciseSeries');
            const repsEl = document.getElementById('modalExerciseReps');
            if (!nameEl || !seriesEl || !repsEl) return;

            const name = nameEl.value.trim();
            const series = seriesEl.value;
            const reps = repsEl.value;
            if (!validateInput(name)) {
                showToast('Nome do exercício é obrigatório.', 'error');
                return;
            }
            if (!validateInput(series, 'number')) {
                showToast('Séries deve ser um número válido.', 'error');
                return;
            }
            if (!validateInput(reps, 'number')) {
                showToast('Repetições deve ser um número válido.', 'error');
                return;
            }
            if (exerciseIndex !== undefined) {
                state.workoutGroups[groupIndex].exercises[exerciseIndex] = { id: exerciseIndex, name, series, reps };
                showToast('Exercício atualizado', 'success');
            } else {
                state.workoutGroups[groupIndex].exercises.push({ id: group.exercises.length, name, series, reps });
                showToast('Exercício adicionado', 'success');
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
            const groupNameEl = document.getElementById('modalGroupName');
            if (!groupNameEl) return;
            const groupName = groupNameEl.value.trim();
            if (!validateInput(groupName)) {
                showToast('Nome do grupo é obrigatório.', 'error');
                return;
            }
            state.workoutGroups.push({ name: groupName, exercises: [] });
            saveState();
            renderWorkoutEditor();
            showToast('Grupo criado', 'success');
        }
    );
}

function loadDailyLog() {
    if (!elements.logDate || !elements.groupSelection || !elements.dailyLog) return;
    elements.logDate.value = getCurrentDate();
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) currentDateEl.textContent = `Treino do Dia: ${new Date().toLocaleDateString('pt-BR')}`;
    renderGroupSelection();
}

function renderGroupSelection() {
    if (!elements.groupSelection || !elements.dailyLog) return;
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
    if (!elements.groupSelection || !elements.dailyLog) return;
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
    if (!elements.dailyLog) return;
    elements.dailyLog.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        if (checkbox.dataset.completedId) checkbox.checked = true;
    });
    showToast('Treino marcado como concluído', 'success');
}

function saveDailyLog() {
    if (!elements.logDate || !elements.groupSelection || !elements.dailyLog) return;
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
    showToast(`Treino salvo para ${formatDateLabel(date)}`, 'success');
}

function openDayModal(dateStr) {
    if (!elements.modalTitle || !elements.modalBody) return;
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
        const nextDateEl = document.getElementById('modalDateInput');
        const nextWeightEl = document.getElementById('modalWeight');
        if (!nextDateEl || !nextWeightEl) return;
        const nextDate = nextDateEl.value;
        const nextWeight = nextWeightEl.value;
        if (nextDate) {
            state.dailyWeights[nextDate] = nextWeight;
            saveState();
            renderCalendar();
            showToast('Resumo do dia atualizado', 'success');
        }
    });
}

function saveGoals() {
    if (!elements.dietGoals) return;
    const calories = elements.dietGoals.calories.value;
    const protein = elements.dietGoals.protein.value;
    const carbs = elements.dietGoals.carbs.value;
    const fat = elements.dietGoals.fat.value;

    if (!validateInput(calories, 'number') || !validateInput(protein, 'number') || !validateInput(carbs, 'number') || !validateInput(fat, 'number')) {
        showToast('Todos os campos de metas devem ser números válidos.', 'error');
        return;
    }

    state.dietGoals = { calories, protein, carbs, fat };
    saveState();
    updateDietProgress();
    showToast('Metas salvas', 'success');
}

function saveDailyDiet() {
    if (!elements.dietLogs) return;
    const calories = elements.dietLogs.calories.value;
    const protein = elements.dietLogs.protein.value;
    const carbs = elements.dietLogs.carbs.value;
    const fat = elements.dietLogs.fat.value;

    if (!validateInput(calories, 'number') || !validateInput(protein, 'number') || !validateInput(carbs, 'number') || !validateInput(fat, 'number')) {
        showToast('Todos os campos de log devem ser números válidos.', 'error');
        return;
    }

    const today = getCurrentDate();
    state.dietLogs[today] = { calories, protein, carbs, fat };
    saveState();
    updateDietProgress();
    showToast('Log de dieta salvo', 'success');
}

function exportData() {
    try {
        const payload = JSON.stringify(state, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `health-club-data-${getCurrentDate()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('Dados exportados como JSON', 'success');
    } catch (error) {
        console.error('Erro ao exportar dados:', error);
        showToast('Erro ao exportar dados.', 'error');
    }
}

// Initialization
function init() {
    try {
        const localState = loadState();
        Object.assign(state, localState);
        setTheme(state.settings.theme || 'dark');

        // Cache elements with checks
        elements = {
            views: document.querySelectorAll('.view'),
            sidebarButtons: document.querySelectorAll('button[data-view]'),
            themeToggle: document.getElementById('themeToggle'),
            toastRoot: document.getElementById('toastRoot'),
            profileDisplay: document.getElementById('profileDisplay'),
            workoutGroups: document.getElementById('workoutGroups'),
            groupSelection: document.getElementById('groupSelection'),
            dailyLog: document.getElementById('dailyLog'),
            calendarGrid: document.getElementById('calendarGrid'),
            logDate: document.getElementById('logDate'),
            dietGoals: {
                calories: document.getElementById('goalCalories'),
                protein: document.getElementById('goalProtein'),
                carbs: document.getElementById('goalCarbs'),
                fat: document.getElementById('goalFat'),
            },
            dietLogs: {
                calories: document.getElementById('logCalories'),
                protein: document.getElementById('logProtein'),
                carbs: document.getElementById('logCarbs'),
                fat: document.getElementById('logFat'),
            },
            exportButton: document.getElementById('exportButton'),
            exerciseSearch: document.getElementById('exerciseSearch'),
            profilePhoto: document.getElementById('profilePhoto'),
            profileImageInput: document.getElementById('profileImageInput'),
            userNamePreview: document.getElementById('userNamePreview'),
            dashboardRecords: {
                workoutStatus: document.getElementById('workoutStatus'),
                caloriesConsumed: document.getElementById('caloriesConsumed'),
                weeklyProgress: document.getElementById('weeklyProgress'),
                levelBadge: document.getElementById('levelBadge'),
            },
            chartWeekly: document.getElementById('weeklyChart'),
            chartCalories: document.getElementById('caloriesChart'),
            modalBackdrop: document.getElementById('modalBackdrop'),
            modalTitle: document.getElementById('modalTitle'),
            modalBody: document.getElementById('modalBody'),
            modalPrimary: document.getElementById('modalPrimary'),
            modalClose: document.getElementById('modalClose'),
        };

        // Attach event listeners with checks
        if (elements.sidebarButtons) {
            elements.sidebarButtons.forEach((button) => {
                button.addEventListener('click', () => showView(button.dataset.view));
            });
        }
        if (elements.themeToggle) elements.themeToggle.addEventListener('click', () => setTheme(state.settings.theme === 'dark' ? 'light' : 'dark'));
        if (elements.exportButton) elements.exportButton.addEventListener('click', exportData);
        if (elements.exerciseSearch) elements.exerciseSearch.addEventListener('input', renderWorkoutEditor);
        if (elements.modalClose) elements.modalClose.addEventListener('click', closeModal);
        if (elements.modalBackdrop) elements.modalBackdrop.addEventListener('click', (event) => {
            if (event.target === elements.modalBackdrop) closeModal();
        });

        const addGroupButton = document.getElementById('addGroupButton');
        const saveGoalsButton = document.getElementById('saveGoals');
        const saveDietButton = document.getElementById('saveDiet');
        if (addGroupButton) addGroupButton.addEventListener('click', addNewWorkoutGroup);
        if (saveGoalsButton) saveGoalsButton.addEventListener('click', saveGoals);
        if (saveDietButton) saveDietButton.addEventListener('click', saveDailyDiet);

        renderWorkoutEditor();
        renderDashboard();
        renderProfileView();
        initializeWorkoutEditor();
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showToast('Erro ao inicializar a aplicação.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', init);

