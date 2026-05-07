const API = 'http://192.168.1.116:8000/api/v1';
let token = localStorage.getItem('token') || null;
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let allLocations = [];
let allTechnicians = [];
let editingTicketId = null;

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

async function showApp() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app-page').classList.remove('hidden');
    document.getElementById('app-page').classList.add('active');
    document.getElementById('user-name').textContent = currentUser.full_name;
    document.getElementById('user-role').textContent = roleLabel(currentUser.role);

    const isAdmin = currentUser.role === 'admin';
    const isTech = currentUser.role === 'technician';

    if (isAdmin) {
        document.getElementById('admin-nav').classList.remove('hidden');
        document.getElementById('nav-users').classList.remove('hidden');
        document.getElementById('nav-all-tickets').classList.remove('hidden');
        document.getElementById('btn-add-location').classList.remove('hidden');
        document.getElementById('btn-add-asset').classList.remove('hidden');
        document.getElementById('location-filter-bar').classList.remove('hidden');
    }

    if (isTech) {
        document.getElementById('admin-nav').classList.remove('hidden');
        document.getElementById('nav-users').classList.add('hidden');
        document.getElementById('nav-all-tickets').classList.remove('hidden');
        document.getElementById('btn-add-asset').classList.remove('hidden');
    }

    await loadLocations();
    await loadTechnicians();
    populateAssetLocationFilter();

    if (currentUser.location_id) {
        const loc = allLocations.find(l => l.id === currentUser.location_id);
        if (loc) {
            document.getElementById('user-location').textContent = `📍 ${loc.name}`;
        }
    }

    loadDashboard();
    loadUnreadCount();
}

// ── DATOS GLOBALES ────────────────────────────────────────────
async function loadLocations() {
    try {
        const res = await apiFetch('/locations/');
        allLocations = await res.json();

        const selects = ['t-location', 'u-location', 'filter-location', 'a-location'];
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const defaultOpt = el.options[0];
            el.innerHTML = '';
            el.appendChild(defaultOpt);
            allLocations.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l.id;
                opt.textContent = l.name;
                el.appendChild(opt);
            });
        });
    } catch (err) {
        console.error('Error cargando sedes:', err);
    }
}

function populateAssetLocationFilter() {
    const el = document.getElementById('asset-filter-location');
    if (!el) return;
    const defaultOpt = el.options[0];
    el.innerHTML = '';
    el.appendChild(defaultOpt);
    allLocations.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.id;
        opt.textContent = l.name;
        el.appendChild(opt);
    });
}

async function loadTechnicians() {
    if (currentUser.role !== 'admin') return;
    try {
        const res = await apiFetch('/users/');
        const users = await res.json();
        allTechnicians = users.filter(u => u.role === 'technician');

        const sel = document.getElementById('edit-assigned');
        if (!sel) return;
        const defaultOpt = sel.options[0];
        sel.innerHTML = '';
        sel.appendChild(defaultOpt);
        allTechnicians.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.full_name;
            sel.appendChild(opt);
        });
    } catch (err) {}
}

// ── NAVEGACIÓN ────────────────────────────────────────────────
function showSection(name, el) {
    const isAdmin = currentUser.role === 'admin';
    const isTech = currentUser.role === 'technician';

    if (name === 'admin-users' && !isAdmin) {
        alert('Solo los administradores pueden gestionar usuarios');
        return;
    }

    if (name === 'admin-tickets' && !isAdmin && !isTech) {
        alert('No tienes permiso para acceder a esta sección');
        return;
    }

    document.querySelectorAll('.section').forEach(s => {
        s.classList.add('hidden');
        s.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(`section-${name}`).classList.remove('hidden');
    document.getElementById(`section-${name}`).classList.add('active');
    document.getElementById('section-title').textContent = sectionTitle(name);

    if (el) el.classList.add('active');

    if (name === 'dashboard') loadDashboard();
    if (name === 'tickets') loadTickets();
    if (name === 'incidents') loadIncidents();
    if (name === 'notifications') loadNotifications();
    if (name === 'locations') loadLocationsList();
    if (name === 'inventory') loadInventory();
    if (name === 'admin-users') loadUsers();
    if (name === 'admin-tickets') loadAllTickets();
}

function applyLocationFilter() {
    const section = document.querySelector('.section.active');
    if (!section) return;
    const id = section.id.replace('section-', '');
    if (id === 'dashboard') loadDashboard();
    if (id === 'admin-tickets') loadAllTickets();
}

// ── DASHBOARD ─────────────────────────────────────────────────
async function loadDashboard() {
    try {
        if (currentUser.role === 'end_user') {
            const res = await apiFetch('/tickets/');
            const tickets = await res.json();
            const open = tickets.filter(t => t.status === 'open').length;
            const inProgress = tickets.filter(t => t.status === 'in_progress').length;
            const resolved = tickets.filter(t => t.status === 'resolved').length;

            document.getElementById('m-open').textContent = open;
            document.getElementById('m-progress').textContent = inProgress;
            document.getElementById('m-resolved').textContent = resolved;
            document.getElementById('m-incidents').textContent = '—';

            document.getElementById('priority-list').innerHTML = `
                <div class="priority-item">
                    <span class="priority-label"><span class="dot dot-critical"></span> Crítica</span>
                    <span class="priority-count">${tickets.filter(t => t.priority === 'critical').length}</span>
                </div>
                <div class="priority-item">
                    <span class="priority-label"><span class="dot dot-high"></span> Alta</span>
                    <span class="priority-count">${tickets.filter(t => t.priority === 'high').length}</span>
                </div>
                <div class="priority-item">
                    <span class="priority-label"><span class="dot dot-medium"></span> Media</span>
                    <span class="priority-count">${tickets.filter(t => t.priority === 'medium').length}</span>
                </div>
                <div class="priority-item">
                    <span class="priority-label"><span class="dot dot-low"></span> Baja</span>
                    <span class="priority-count">${tickets.filter(t => t.priority === 'low').length}</span>
                </div>
            `;
            document.getElementById('summary-list').innerHTML = `
                <div class="summary-item"><span>Mis tickets totales</span><span class="summary-value">${tickets.length}</span></div>
                <div class="summary-item"><span>Abiertos</span><span class="summary-value">${open}</span></div>
                <div class="summary-item"><span>En progreso</span><span class="summary-value">${inProgress}</span></div>
                <div class="summary-item"><span>Resueltos</span><span class="summary-value">${resolved}</span></div>
            `;
            return;
        }

        const res = await apiFetch('/dashboard/');
        const data = await res.json();

        document.getElementById('m-open').textContent = data.tickets.open;
        document.getElementById('m-progress').textContent = data.tickets.in_progress;
        document.getElementById('m-resolved').textContent = data.tickets.resolved;
        document.getElementById('m-incidents').textContent = data.incidents.open + data.incidents.in_progress;

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
            <div class="summary-item"><span>Total tickets</span><span class="summary-value">${data.tickets.total}</span></div>
            <div class="summary-item"><span>Tickets cerrados</span><span class="summary-value">${data.tickets.closed}</span></div>
            <div class="summary-item"><span>Incidentes resueltos</span><span class="summary-value">${data.incidents.resolved}</span></div>
            <div class="summary-item"><span>Total usuarios</span><span class="summary-value">${data.total_users}</span></div>
            <div class="summary-item"><span>Sedes activas</span><span class="summary-value">${allLocations.length}</span></div>
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
        if (tickets.length === 0) { container.innerHTML = emptyState('ticket-alt', 'No tienes tickets aún'); return; }
        container.innerHTML = tickets.map(t => ticketCard(t, false)).join('');
    } catch (err) {
        container.innerHTML = '<p style="color:red">Error cargando tickets</p>';
    }
}

async function loadAllTickets() {
    const container = document.getElementById('admin-tickets-list');
    container.innerHTML = '<p style="color:#64748b">Cargando...</p>';
    try {
        const res = await apiFetch('/tickets/');
        let tickets = await res.json();
        const locationId = document.getElementById('filter-location')?.value;
        if (locationId) tickets = tickets.filter(t => t.location_id == locationId);
        if (tickets.length === 0) { container.innerHTML = emptyState('ticket-alt', 'No hay tickets'); return; }
        container.innerHTML = tickets.map(t => ticketCard(t, true)).join('');
    } catch (err) {
        container.innerHTML = '<p style="color:red">Error cargando tickets</p>';
    }
}

function ticketCard(t, showEdit) {
    const loc = allLocations.find(l => l.id === t.location_id);
    const locBadge = loc ? `<span class="tag tag-location"><i class="fas fa-map-marker-alt"></i> ${loc.name}</span>` : '';
    const canEdit = showEdit && (currentUser.role === 'admin' || currentUser.role === 'technician');
    const editBtn = canEdit ? `<button class="btn-edit" onclick="openEditTicket(${t.id}, '${t.status}', '${t.priority}', ${t.assigned_to_id || 'null'})"><i class="fas fa-edit"></i></button>` : '';
    return `
        <div class="ticket-card priority-${t.priority}">
            <div class="ticket-header">
                <span class="ticket-title">#${t.id} — ${t.title}</span>
                ${editBtn}
            </div>
            <div class="ticket-meta">
                <span class="tag tag-status-${t.status}">${statusLabel(t.status)}</span>
                <span class="tag tag-priority-${t.priority}">${priorityLabel(t.priority)}</span>
                <span class="tag tag-category">${categoryLabel(t.category)}</span>
                ${locBadge}
            </div>
            <div class="ticket-date">
                <i class="fas fa-user"></i> ${t.created_by.full_name} —
                <i class="fas fa-clock"></i> ${formatDate(t.created_at)}
                ${t.assigned_to ? `— <i class="fas fa-user-cog"></i> ${t.assigned_to.full_name}` : ''}
            </div>
        </div>
    `;
}

function showCreateTicket() { document.getElementById('create-ticket-form').classList.remove('hidden'); }
function hideCreateTicket() { document.getElementById('create-ticket-form').classList.add('hidden'); }

async function createTicket() {
    const title = document.getElementById('t-title').value;
    const description = document.getElementById('t-description').value;
    const category = document.getElementById('t-category').value;
    const priority = document.getElementById('t-priority').value;
    const location_id = document.getElementById('t-location').value || null;

    if (!title || !description) { alert('El título y la descripción son obligatorios'); return; }

    try {
        const res = await apiFetch('/tickets/', {
            method: 'POST',
            body: JSON.stringify({ title, description, category, priority, location_id: location_id ? parseInt(location_id) : null }),
        });
        if (res.ok) {
            hideCreateTicket();
            document.getElementById('t-title').value = '';
            document.getElementById('t-description').value = '';
            loadTickets();
        } else { alert('Error al crear el ticket'); }
    } catch (err) { alert('Error de conexión'); }
}

function openEditTicket(id, status, priority, assignedId) {
    editingTicketId = id;
    document.getElementById('edit-status').value = status;
    document.getElementById('edit-priority').value = priority;
    document.getElementById('edit-assigned').value = assignedId || '';
    document.getElementById('modal-ticket').classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
}

async function saveTicketEdit() {
    const status = document.getElementById('edit-status').value;
    const priority = document.getElementById('edit-priority').value;
    const assigned = document.getElementById('edit-assigned').value;
    try {
        const res = await apiFetch(`/tickets/${editingTicketId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status, priority, assigned_to_id: assigned ? parseInt(assigned) : null }),
        });
        if (res.ok) { closeAllModals(); loadAllTickets(); }
        else { alert('Error al actualizar el ticket'); }
    } catch (err) { alert('Error de conexión'); }
}

// ── INCIDENTES ────────────────────────────────────────────────
async function loadIncidents() {
    const container = document.getElementById('incidents-list');
    container.innerHTML = '<p style="color:#64748b">Cargando...</p>';
    try {
        const res = await apiFetch('/incidents/');
        const incidents = await res.json();
        if (incidents.length === 0) { container.innerHTML = emptyState('exclamation-triangle', 'No hay incidentes'); return; }
        container.innerHTML = incidents.map(i => `
            <div class="ticket-card priority-${i.severity}">
                <div class="ticket-header"><span class="ticket-title">#${i.id} — ${i.title}</span></div>
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
    } catch (err) { container.innerHTML = '<p style="color:red">Error cargando incidentes</p>'; }
}

// ── NOTIFICACIONES ────────────────────────────────────────────
async function loadNotifications() {
    const container = document.getElementById('notifications-list');
    container.innerHTML = '<p style="color:#64748b">Cargando...</p>';
    try {
        const res = await apiFetch('/notifications/');
        const notifs = await res.json();
        if (notifs.length === 0) { container.innerHTML = emptyState('bell', 'No tienes notificaciones'); return; }
        container.innerHTML = notifs.map(n => `
            <div class="notif-card ${n.is_read ? '' : 'unread'}">
                <i class="fas fa-bell notif-icon"></i>
                <span class="notif-message">${n.message}</span>
                <span class="notif-date">${formatDate(n.created_at)}</span>
            </div>
        `).join('');
        loadUnreadCount();
    } catch (err) { container.innerHTML = '<p style="color:red">Error cargando notificaciones</p>'; }
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
        if (data.unread_count > 0) { badge.textContent = data.unread_count; badge.classList.remove('hidden'); }
        else { badge.classList.add('hidden'); }
    } catch (err) {}
}

// ── SEDES ─────────────────────────────────────────────────────
async function loadLocationsList() {
    const container = document.getElementById('locations-list');
    container.innerHTML = '<p style="color:#64748b">Cargando...</p>';
    try {
        const res = await apiFetch('/locations/');
        const locations = await res.json();
        if (locations.length === 0) { container.innerHTML = emptyState('map-marker-alt', 'No hay sedes'); return; }
        container.innerHTML = locations.map(l => `
            <div class="location-card ${l.is_active ? '' : 'inactive'}">
                <div class="location-icon"><i class="fas fa-hospital-alt"></i></div>
                <div class="location-info">
                    <h4>${l.name}</h4>
                    ${l.address ? `<p><i class="fas fa-map-marker-alt"></i> ${l.address}</p>` : ''}
                    ${l.phone ? `<p><i class="fas fa-phone"></i> ${l.phone}</p>` : ''}
                    ${l.description ? `<p><i class="fas fa-info-circle"></i> ${l.description}</p>` : ''}
                </div>
                <div class="location-status">
                    <span class="tag ${l.is_active ? 'tag-status-resolved' : 'tag-status-closed'}">
                        ${l.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                </div>
            </div>
        `).join('');
    } catch (err) { container.innerHTML = '<p style="color:red">Error cargando sedes</p>'; }
}

function showCreateLocation() {
    if (currentUser.role !== 'admin') { alert('Solo los administradores pueden crear sedes'); return; }
    document.getElementById('create-location-form').classList.remove('hidden');
}
function hideCreateLocation() { document.getElementById('create-location-form').classList.add('hidden'); }

async function createLocation() {
    const name = document.getElementById('l-name').value;
    const address = document.getElementById('l-address').value;
    const phone = document.getElementById('l-phone').value;
    const description = document.getElementById('l-description').value;
    if (!name) { alert('El nombre es obligatorio'); return; }
    try {
        const res = await apiFetch('/locations/', {
            method: 'POST',
            body: JSON.stringify({ name, address, phone, description }),
        });
        if (res.ok) {
            hideCreateLocation();
            ['l-name','l-address','l-phone','l-description'].forEach(id => document.getElementById(id).value = '');
            await loadLocations();
            loadLocationsList();
        } else {
            const err = await res.json();
            alert(err.detail || 'Error al crear la sede');
        }
    } catch (err) { alert('Error de conexión'); }
}

// ── INVENTARIO ────────────────────────────────────────────────
async function loadInventory() {
    const container = document.getElementById('inventory-list');
    container.innerHTML = '<p style="color:#64748b">Cargando...</p>';

    try {
        // Cargar stats
        const statsRes = await apiFetch('/assets/stats');
        const stats = await statsRes.json();

        document.getElementById('inventory-stats').innerHTML = `
            <div class="metric-card blue">
                <i class="fas fa-boxes"></i>
                <div class="metric-info">
                    <span class="metric-value">${stats.total}</span>
                    <span class="metric-label">Total Activos</span>
                </div>
            </div>
            <div class="metric-card green">
                <i class="fas fa-check-circle"></i>
                <div class="metric-info">
                    <span class="metric-value">${stats.active}</span>
                    <span class="metric-label">Activos</span>
                </div>
            </div>
            <div class="metric-card yellow">
                <i class="fas fa-tools"></i>
                <div class="metric-info">
                    <span class="metric-value">${stats.in_repair}</span>
                    <span class="metric-label">En Reparación</span>
                </div>
            </div>
            <div class="metric-card red">
                <i class="fas fa-wrench"></i>
                <div class="metric-info">
                    <span class="metric-value">${stats.maintenance}</span>
                    <span class="metric-label">Mantenimiento</span>
                </div>
            </div>
            <div class="metric-card" style="border-left: 4px solid #64748b;">
                <i class="fas fa-archive" style="font-size:2rem; color:#64748b"></i>
                <div class="metric-info">
                    <span class="metric-value">${stats.retired}</span>
                    <span class="metric-label">Dados de Baja</span>
                </div>
            </div>
        `;

        // Construir URL con filtros
        let url = '/assets/?';
        const locFilter = document.getElementById('asset-filter-location')?.value;
        const typeFilter = document.getElementById('asset-filter-type')?.value;
        const statusFilter = document.getElementById('asset-filter-status')?.value;
        if (locFilter) url += `location_id=${locFilter}&`;
        if (typeFilter) url += `asset_type=${typeFilter}&`;
        if (statusFilter) url += `status=${statusFilter}&`;

        const res = await apiFetch(url);
        const assets = await res.json();

        if (assets.length === 0) {
            container.innerHTML = emptyState('boxes', 'No hay activos registrados');
            return;
        }

        container.innerHTML = assets.map(a => {
            const loc = allLocations.find(l => l.id === a.location_id);
            return `
                <div class="asset-card status-${a.status}">
                    <div class="asset-icon">${assetIcon(a.asset_type)}</div>
                    <div class="asset-info">
                        <div class="asset-header">
                            <h4>${a.name}</h4>
                            <span class="tag tag-asset-status-${a.status}">${assetStatusLabel(a.status)}</span>
                        </div>
                        ${a.asset_tag ? `<p class="asset-tag"><i class="fas fa-tag"></i> ${a.asset_tag}</p>` : ''}
                        <div class="asset-meta">
                            <span><i class="fas fa-layer-group"></i> ${assetTypeLabel(a.asset_type)}</span>
                            ${a.brand ? `<span><i class="fas fa-industry"></i> ${a.brand}</span>` : ''}
                            ${a.model ? `<span><i class="fas fa-cube"></i> ${a.model}</span>` : ''}
                            ${loc ? `<span><i class="fas fa-map-marker-alt"></i> ${loc.name}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        container.innerHTML = '<p style="color:red">Error cargando inventario</p>';
    }
}

function showCreateAsset() {
    if (currentUser.role === 'end_user') { 
        alert('No tienes permiso para registrar activos'); 
        return; 
    }
    const form = document.getElementById('create-asset-form');
    form.classList.remove('hidden');
    // Scroll automático al formulario
    setTimeout(() => {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}
function hideCreateAsset() { document.getElementById('create-asset-form').classList.add('hidden'); }

async function createAsset() {
    const name = document.getElementById('a-name').value;
    const asset_tag = document.getElementById('a-tag').value || null;
    const serial_number = document.getElementById('a-serial').value || null;
    const asset_type = document.getElementById('a-type').value;
    const status = document.getElementById('a-status').value;
    const brand = document.getElementById('a-brand').value || null;
    const model = document.getElementById('a-model').value || null;
    const description = document.getElementById('a-description').value || null;
    const purchase_date = document.getElementById('a-purchase').value || null;
    const warranty_expiry = document.getElementById('a-warranty').value || null;
    const location_id = document.getElementById('a-location').value || null;

    if (!name) { alert('El nombre es obligatorio'); return; }

    try {
        const res = await apiFetch('/assets/', {
            method: 'POST',
            body: JSON.stringify({
                name, asset_tag, serial_number, asset_type, status,
                brand, model, description, purchase_date, warranty_expiry,
                location_id: location_id ? parseInt(location_id) : null,
            }),
        });
        if (res.ok) {
            hideCreateAsset();
            ['a-name','a-tag','a-serial','a-brand','a-model','a-description','a-purchase','a-warranty']
                .forEach(id => document.getElementById(id).value = '');
            loadInventory();
        } else {
            const err = await res.json();
            alert(err.detail || 'Error al registrar el activo');
        }
    } catch (err) { alert('Error de conexión'); }
}

// ── ADMIN: USUARIOS ───────────────────────────────────────────
async function loadUsers() {
    const container = document.getElementById('users-list');
    container.innerHTML = '<p style="color:#64748b">Cargando...</p>';
    try {
        const res = await apiFetch('/users/');
        const users = await res.json();
        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>#</th><th>Nombre</th><th>Email</th>
                        <th>Rol</th><th>Sede</th><th>Departamento</th><th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => {
                        const loc = allLocations.find(l => l.id === u.location_id);
                        return `<tr>
                            <td>${u.id}</td>
                            <td>${u.full_name}</td>
                            <td>${u.email}</td>
                            <td><span class="tag tag-role-${u.role}">${roleLabel(u.role)}</span></td>
                            <td>${loc ? loc.name : '—'}</td>
                            <td>${u.department || '—'}</td>
                            <td><span class="tag ${u.is_active ? 'tag-status-resolved' : 'tag-status-closed'}">${u.is_active ? 'Activo' : 'Inactivo'}</span></td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        `;
    } catch (err) { container.innerHTML = '<p style="color:red">Error cargando usuarios</p>'; }
}

function showCreateUser() { document.getElementById('create-user-form').classList.remove('hidden'); }
function hideCreateUser() { document.getElementById('create-user-form').classList.add('hidden'); }

async function createUser() {
    const full_name = document.getElementById('u-name').value;
    const email = document.getElementById('u-email').value;
    const password = document.getElementById('u-password').value;
    const role = document.getElementById('u-role').value;
    const location_id = document.getElementById('u-location').value || null;
    const department = document.getElementById('u-department').value;
    const phone = document.getElementById('u-phone').value;

    if (!full_name || !email || !password) { alert('Nombre, email y contraseña son obligatorios'); return; }

    try {
        const res = await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ full_name, email, password, role, location_id: location_id ? parseInt(location_id) : null, department, phone }),
        });
        if (res.ok) {
            hideCreateUser();
            ['u-name','u-email','u-password'].forEach(id => document.getElementById(id).value = '');
            loadUsers();
            await loadTechnicians();
        } else {
            const err = await res.json();
            alert(err.detail || 'Error al crear el usuario');
        }
    } catch (err) { alert('Error de conexión'); }
}

// ── MODALES ───────────────────────────────────────────────────
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    document.getElementById('modal-overlay').classList.add('hidden');
}
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.getElementById('modal-overlay').classList.add('hidden');
}

// ── HELPERS ───────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
    return fetch(`${API}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(options.headers || {}) },
    });
}

function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
}

function emptyState(icon, msg) {
    return `<div class="empty-state"><i class="fas fa-${icon}"></i><p>${msg}</p></div>`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusLabel(s) {
    return { open: 'Abierto', in_progress: 'En Progreso', resolved: 'Resuelto', closed: 'Cerrado' }[s] || s;
}
function priorityLabel(p) {
    return { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' }[p] || p;
}
function categoryLabel(c) {
    return { hardware: 'Hardware', software: 'Software', network: 'Red', access: 'Acceso', printers: 'Impresoras', telephony: 'Telefonía', medical_equipment: 'Equipo Médico', other: 'Otro' }[c] || c;
}
function roleLabel(r) {
    return { admin: 'Administrador', technician: 'Técnico', end_user: 'Usuario' }[r] || r;
}
function assetTypeLabel(t) {
    return { computer: 'Computador', laptop: 'Laptop', printer: 'Impresora', server: 'Servidor', network: 'Red', phone: 'Teléfono', medical_equipment: 'Equipo Médico', monitor: 'Monitor', ups: 'UPS', other: 'Otro' }[t] || t;
}
function assetStatusLabel(s) {
    return { active: 'Activo', in_repair: 'En Reparación', maintenance: 'Mantenimiento', retired: 'Dado de Baja', stolen: 'Robado' }[s] || s;
}
function assetIcon(t) {
    return { computer: '🖥️', laptop: '💻', printer: '🖨️', server: '🗄️', network: '🌐', phone: '📞', medical_equipment: '🏥', monitor: '🖥️', ups: '🔋', other: '📦' }[t] || '📦';
}
function sectionTitle(s) {
    return { dashboard: 'Dashboard', tickets: 'Tickets', incidents: 'Incidentes', notifications: 'Notificaciones', locations: 'Sedes del HUS', inventory: 'Inventario de Activos', 'admin-users': 'Gestión de Usuarios', 'admin-tickets': 'Gestión de Tickets' }[s] || s;
}