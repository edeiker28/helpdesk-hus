const API = 'http://localhost:8000/api/v1';
let token = localStorage.getItem('token') || null;
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// ── INICIALIZACIÓN ────────────────────────────────────────────
window.onload = () => {
    if (token && currentUser) {
        showApp();
    }
};

// ── AUTH ──────────────────────────────────────────────────────
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!email || !password) {
        showError(errorEl, 'Por favor ingresa email y contraseña');
        return;
    }

    try {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            showError(errorEl, 'Credenciales incorrectas');
            return;
        }

        const data = await res.json();
        token = data.access_token;
        localStorage.setItem('token', token);

        // Obtener info del usuario
        const userRes = await fetch(`${API}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        currentUser = await userRes.json();
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        showApp();
    } catch (err) {
        showError(errorEl, 'Error de conexión con el servidor');
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    document.getElementById('login-page').classList.add('active');
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('app-page').classList.add('hidden');
    document.getElementById('app-page').classList.remove('active');
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
}

function showApp() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app-page').classList.remove('hidden');
    document.getElementById('app-page').classList.add('active');
    document.getElementById('user-name').textContent = currentUser.full_name;
    document.getElementById('user-role').textContent = roleLabel(currentUser.role);
    loadDashboard();
    loadUnreadCount();
}

// ── NAVEGACIÓN ────────────────────────────────────────────────
function showSection(name) {
    document.querySelectorAll('.section').forEach(s => {
        s.classList.add('hidden');
        s.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(`section-${name}`).classList.remove('hidden');
    document.getElementById(`section-${name}`).classList.add('active');
    document.getElementById('section-title').textContent = sectionTitle(name);

    event.currentTarget.classList.add('active');

    if (name === 'dashboard') loadDashboard();
    if (name === 'tickets') loadTickets();
    if (name === 'incidents') loadIncidents();
    if (name === 'notifications') loadNotifications();
}

// ── DASHBOARD ─────────────────────────────────────────────────
async function loadDashboard() {
    try {
        const res = await apiFetch('/dashboard/');
        const data = await res.json();

        document.getElementById('m-open').textContent = data.tickets.open;
        document.getElementById('m-progress').textContent = data.tickets.in_progress;
        document.getElementById('m-resolved').textContent = data.tickets.resolved;
        document.getElementById('m-incidents').textContent =
            data.incidents.open + data.incidents.in_progress;

        document.getElementById('priority-list').innerHTML = `
            <div class="priority-item">
                <span class="priority-label"><span class="dot dot-critical"></span> Crítica</span>
                <span class="priority-count">${data.tickets_by_priority.critical}</span>
            </div>
            <div class="priority-item">
                <span class="priority-label"><span class="dot dot-high"></span> Alta</span>
                <span class="priority-count">${data.tickets_by_priority.high}</span>
            </div>
            <div class="priority-item">
                <span class="priority-label"><span class="dot dot-medium"></span> Media</span>
                <span class="priority-count">${data.tickets_by_priority.medium}</span>
            </div>
            <div class="priority-item">
                <span class="priority-label"><span class="dot dot-low"></span> Baja</span>
                <span class="priority-count">${data.tickets_by_priority.low}</span>
            </div>
        `;

        document.getElementById('summary-list').innerHTML = `
            <div class="summary-item">
                <span>Total tickets</span>
                <span class="summary-value">${data.tickets.total}</span>
            </div>
            <div class="summary-item">
                <span>Tickets cerrados</span>
                <span class="summary-value">${data.tickets.closed}</span>
            </div>
            <div class="summary-item">
                <span>Incidentes resueltos</span>
                <span class="summary-value">${data.incidents.resolved}</span>
            </div>
            <div class="summary-item">
                <span>Total usuarios</span>
                <span class="summary-value">${data.total_users}</span>
            </div>
        `;
    } catch (err) {
        console.error('Error cargando dashboard:', err);
    }
}

// ── TICKETS ───────────────────────────────────────────────────
async function loadTickets() {
    const container = document.getElementById('tickets-list');
    container.innerHTML = '<p style="color:#64748b">Cargando...</p>';

    try {
        const res = await apiFetch('/tickets/');
        const tickets = await res.json();

        if (tickets.length === 0) {
            container.innerHTML = emptyState('ticket-alt', 'No tienes tickets aún');
            return;
        }

        container.innerHTML = tickets.map(t => `
            <div class="ticket-card priority-${t.priority}">
                <div class="ticket-header">
                    <span class="ticket-title">#${t.id} — ${t.title}</span>
                </div>
                <div class="ticket-meta">
                    <span class="tag tag-status-${t.status}">${statusLabel(t.status)}</span>
                    <span class="tag tag-priority-${t.priority}">${priorityLabel(t.priority)}</span>
                    <span class="tag tag-category">${categoryLabel(t.category)}</span>
                </div>
                <div class="ticket-date">
                    <i class="fas fa-user"></i> ${t.created_by.full_name} —
                    <i class="fas fa-clock"></i> ${formatDate(t.created_at)}
                    ${t.assigned_to ? `— <i class="fas fa-user-cog"></i> ${t.assigned_to.full_name}` : ''}
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = '<p style="color:red">Error cargando tickets</p>';
    }
}

function showCreateTicket() {
    document.getElementById('create-ticket-form').classList.remove('hidden');
}

function hideCreateTicket() {
    document.getElementById('create-ticket-form').classList.add('hidden');
}

async function createTicket() {
    const title = document.getElementById('t-title').value;
    const description = document.getElementById('t-description').value;
    const category = document.getElementById('t-category').value;
    const priority = document.getElementById('t-priority').value;

    if (!title || !description) {
        alert('El título y la descripción son obligatorios');
        return;
    }

    try {
        const res = await apiFetch('/tickets/', {
            method: 'POST',
            body: JSON.stringify({ title, description, category, priority }),
        });

        if (res.ok) {
            hideCreateTicket();
            document.getElementById('t-title').value = '';
            document.getElementById('t-description').value = '';
            loadTickets();
        } else {
            alert('Error al crear el ticket');
        }
    } catch (err) {
        alert('Error de conexión');
    }
}

// ── INCIDENTES ────────────────────────────────────────────────
async function loadIncidents() {
    const container = document.getElementById('incidents-list');
    container.innerHTML = '<p style="color:#64748b">Cargando...</p>';

    try {
        const res = await apiFetch('/incidents/');
        const incidents = await res.json();

        if (incidents.length === 0) {
            container.innerHTML = emptyState('exclamation-triangle', 'No hay incidentes registrados');
            return;
        }

        container.innerHTML = incidents.map(i => `
            <div class="ticket-card priority-${i.severity}">
                <div class="ticket-header">
                    <span class="ticket-title">#${i.id} — ${i.title}</span>
                </div>
                <div class="ticket-meta">
                    <span class="tag tag-status-${i.status}">${statusLabel(i.status)}</span>
                    <span class="tag tag-priority-${i.severity}">${priorityLabel(i.severity)}</span>
                </div>
                <div class="ticket-date">
                    <i class="fas fa-user"></i> ${i.created_by.full_name} —
                    <i class="fas fa-clock"></i> ${formatDate(i.created_at)}
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = '<p style="color:red">Error cargando incidentes</p>';
    }
}

// ── NOTIFICACIONES ────────────────────────────────────────────
async function loadNotifications() {
    const container = document.getElementById('notifications-list');
    container.innerHTML = '<p style="color:#64748b">Cargando...</p>';

    try {
        const res = await apiFetch('/notifications/');
        const notifs = await res.json();

        if (notifs.length === 0) {
            container.innerHTML = emptyState('bell', 'No tienes notificaciones');
            return;
        }

        container.innerHTML = notifs.map(n => `
            <div class="notif-card ${n.is_read ? '' : 'unread'}">
                <i class="fas fa-bell notif-icon"></i>
                <span class="notif-message">${n.message}</span>
                <span class="notif-date">${formatDate(n.created_at)}</span>
            </div>
        `).join('');

        loadUnreadCount();
    } catch (err) {
        container.innerHTML = '<p style="color:red">Error cargando notificaciones</p>';
    }
}

async function markAllRead() {
    await apiFetch('/notifications/mark-all-read', { method: 'PATCH' });
    loadNotifications();
}

async function loadUnreadCount() {
    try {
        const res = await apiFetch('/notifications/unread-count');
        const data = await res.json();
        const badge = document.getElementById('notif-badge');
        if (data.unread_count > 0) {
            badge.textContent = data.unread_count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (err) {}
}

// ── HELPERS ───────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
    return fetch(`${API}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });
}

function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
}

function emptyState(icon, msg) {
    return `<div class="empty-state">
        <i class="fas fa-${icon}"></i>
        <p>${msg}</p>
    </div>`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function statusLabel(s) {
    const labels = {
        open: 'Abierto', in_progress: 'En Progreso',
        resolved: 'Resuelto', closed: 'Cerrado',
    };
    return labels[s] || s;
}

function priorityLabel(p) {
    const labels = {
        low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica',
    };
    return labels[p] || p;
}

function categoryLabel(c) {
    const labels = {
        hardware: 'Hardware', software: 'Software', network: 'Red',
        access: 'Acceso', printers: 'Impresoras', telephony: 'Telefonía',
        medical_equipment: 'Equipo Médico', other: 'Otro',
    };
    return labels[c] || c;
}

function roleLabel(r) {
    const labels = {
        admin: 'Administrador', technician: 'Técnico', end_user: 'Usuario',
    };
    return labels[r] || r;
}

function sectionTitle(s) {
    const titles = {
        dashboard: 'Dashboard', tickets: 'Tickets',
        incidents: 'Incidentes', notifications: 'Notificaciones',
    };
    return titles[s] || s;
}