const API = 'http://192.168.1.39:8000/api/v1';
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
    if (currentUser.role !== 'end_user') {
        loadSLABadge();
    }
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
    if (name === 'inventory') loadInventory();
    if (name === 'sla') loadSLA(); 
    if (name === 'admin-users') loadUsers();
    if (name === 'reports') loadReports(); 
    if (name === 'admin-users') loadUsers();
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
          <div class="ticket-card priority-${t.priority}" onclick="openTicketDetail(${t.id})">
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

// ── SLA ───────────────────────────────────────────────────────
async function loadSLA() {
    const container = document.getElementById('sla-list');
    container.innerHTML = '<p style="color:#64748b">Cargando...</p>';

    try {
        const res = await apiFetch('/dashboard/sla');
        const data = await res.json();

        // Actualizar métricas
        document.getElementById('sla-compliance').textContent = `${data.summary.compliance_rate}%`;
        document.getElementById('sla-ok').textContent = data.summary.ok;
        document.getElementById('sla-warning').textContent = data.summary.warning;
        document.getElementById('sla-breached').textContent = data.summary.breached;

        // Actualizar badge en sidebar
        const badge = document.getElementById('sla-breach-badge');
        if (data.summary.breached > 0) {
            badge.textContent = data.summary.breached;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }

        if (data.tickets.length === 0) {
            container.innerHTML = emptyState('check-circle', 'No hay tickets activos');
            return;
        }

        container.innerHTML = data.tickets.map(t => {
            const sla = t.sla;
            const loc = allLocations.find(l => l.id === t.location_id);

            let timeText = '';
            let timeClass = '';

            if (sla.status === 'breached') {
                timeText = `Vencido hace ${formatHours(sla.breached_hours)}`;
                timeClass = 'time-breached';
            } else if (sla.status === 'warning') {
                timeText = `Vence en ${formatHours(sla.remaining_hours)}`;
                timeClass = 'time-warning';
            } else {
                timeText = `Vence en ${formatHours(sla.remaining_hours)}`;
                timeClass = 'time-ok';
            }

            const barWidth = Math.min(sla.percentage_used, 100);

            return `
                <div class="sla-ticket-row ${sla.status}">
                    <div class="sla-ticket-info">
                        <div class="sla-ticket-title">
                            #${t.id} — ${t.title}
                        </div>
                        <div class="sla-ticket-meta">
                            <span class="tag tag-priority-${t.priority}" style="font-size:0.7rem">${priorityLabel(t.priority)}</span>
                            <span class="tag tag-status-${t.status}" style="font-size:0.7rem">${statusLabel(t.status)}</span>
                            ${loc ? `<span style="font-size:0.75rem; color:#64748b"><i class="fas fa-map-marker-alt"></i> ${loc.name}</span>` : ''}
                        </div>
                        <div class="sla-bar-container">
                            <div class="sla-bar ${sla.status}" style="width: ${barWidth}%"></div>
                        </div>
                    </div>
                    <div class="sla-ticket-time">
                        <div class="time-value ${timeClass}">${timeText}</div>
                        <div class="time-label">SLA: ${sla.sla_hours}h</div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        container.innerHTML = '<p style="color:red">Error cargando SLA</p>';
    }
}

function formatHours(hours) {
    if (hours < 0) hours = Math.abs(hours);
    if (hours < 1) {
        const minutes = Math.round(hours * 60);
        return `${minutes}min`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
}

// Cargar SLA badge al iniciar
async function loadSLABadge() {
    try {
        const res = await apiFetch('/dashboard/sla');
        const data = await res.json();
        const badge = document.getElementById('sla-breach-badge');
        if (data.summary.breached > 0) {
            badge.textContent = data.summary.breached;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (err) {}
}

// Agregar SLA badge a cada ticket en la lista
function getSLABadge(createdAt, priority) {
    const SLA_HOURS = { critical: 1, high: 4, medium: 8, low: 24 };
    const slaHours = SLA_HOURS[priority] || 8;
    const now = new Date();
    const created = new Date(createdAt);
    const elapsedHours = (now - created) / (1000 * 60 * 60);
    const percentage = (elapsedHours / slaHours) * 100;

    if (percentage >= 100) {
        const breached = elapsedHours - slaHours;
        return `<span class="sla-badge sla-breached"><i class="fas fa-exclamation-circle"></i> Vencido ${formatHours(breached)}</span>`;
    } else if (percentage >= 75) {
        const remaining = slaHours - elapsedHours;
        return `<span class="sla-badge sla-warning"><i class="fas fa-clock"></i> ${formatHours(remaining)}</span>`;
    } else {
        const remaining = slaHours - elapsedHours;
        return `<span class="sla-badge sla-ok"><i class="fas fa-check"></i> ${formatHours(remaining)}</span>`;
    }
}

// ── REPORTES ──────────────────────────────────────────────────

async function loadReports() {
    // Cargar el reporte por defecto (técnico)
    showReport('technician', document.querySelector('.report-tab'));
}

function showReport(type, el) {
    document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');

    const container = document.getElementById('report-content');
    container.innerHTML = '<p style="color:#64748b; padding:2rem;">Cargando reporte...</p>';

    if (type === 'technician') loadReportTechnician();
    if (type === 'location') loadReportLocation();
    if (type === 'sla-location') loadReportSLALocation();
    if (type === 'assets-location') loadReportAssetsLocation();
    if (type === 'summary') loadReportSummary();
}

async function loadReportTechnician() {
    const container = document.getElementById('report-content');
    try {
        const res = await apiFetch('/reports/tickets-by-technician');
        const data = await res.json();

        if (data.length === 0) {
            container.innerHTML = emptyState('user-cog', 'No hay técnicos registrados');
            return;
        }

        container.innerHTML = `
            <div class="card">
                <h3>Tickets por Técnico</h3>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Técnico</th>
                            <th>Total</th>
                            <th>Abiertos</th>
                            <th>En Progreso</th>
                            <th>Resueltos</th>
                            <th>Cerrados</th>
                            <th>Progreso</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(t => {
                            const resolved = t.resolved + t.closed;
                            const pct = t.total > 0 ? Math.round((resolved / t.total) * 100) : 0;
                            return `
                                <tr>
                                    <td>
                                        <div style="font-weight:600">${t.technician_name}</div>
                                        <div style="font-size:0.8rem;color:#64748b">${t.email}</div>
                                    </td>
                                    <td><strong>${t.total}</strong></td>
                                    <td><span class="tag tag-status-open">${t.open}</span></td>
                                    <td><span class="tag tag-status-in_progress">${t.in_progress}</span></td>
                                    <td><span class="tag tag-status-resolved">${t.resolved}</span></td>
                                    <td><span class="tag tag-status-closed">${t.closed}</span></td>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:0.5rem;">
                                            <div style="flex:1;background:#f1f5f9;border-radius:999px;height:8px;overflow:hidden;">
                                                <div style="width:${pct}%;height:100%;background:#16a34a;border-radius:999px;"></div>
                                            </div>
                                            <span style="font-size:0.8rem;font-weight:700;color:#16a34a">${pct}%</span>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<p style="color:red">Error cargando reporte</p>';
    }
}

async function loadReportLocation() {
    const container = document.getElementById('report-content');
    try {
        const res = await apiFetch('/reports/tickets-by-location');
        const data = await res.json();

        if (data.length === 0) {
            container.innerHTML = emptyState('map-marker-alt', 'No hay sedes registradas');
            return;
        }

        container.innerHTML = `
            <div class="card">
                <h3>Tickets por Sede</h3>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Sede</th>
                            <th>Total</th>
                            <th>Abiertos</th>
                            <th>En Progreso</th>
                            <th>Resueltos</th>
                            <th>Críticos</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(l => `
                            <tr>
                                <td>
                                    <i class="fas fa-map-marker-alt" style="color:#2563eb;margin-right:0.4rem;"></i>
                                    <strong>${l.location_name}</strong>
                                </td>
                                <td><strong>${l.total}</strong></td>
                                <td><span class="tag tag-status-open">${l.open}</span></td>
                                <td><span class="tag tag-status-in_progress">${l.in_progress}</span></td>
                                <td><span class="tag tag-status-resolved">${l.resolved}</span></td>
                                <td><span class="tag tag-priority-critical">${l.critical}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<p style="color:red">Error cargando reporte</p>';
    }
}

async function loadReportSLALocation() {
    const container = document.getElementById('report-content');
    try {
        const res = await apiFetch('/reports/sla-by-location');
        const data = await res.json();

        if (data.length === 0) {
            container.innerHTML = emptyState('clock', 'No hay datos de SLA');
            return;
        }

        container.innerHTML = `
            <div class="card">
                <h3>Cumplimiento SLA por Sede</h3>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Sede</th>
                            <th>Tickets Activos</th>
                            <th>En Tiempo</th>
                            <th>Por Vencer</th>
                            <th>Vencidos</th>
                            <th>Cumplimiento</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(l => {
                            const color = l.compliance_rate >= 90 ? '#16a34a' : l.compliance_rate >= 70 ? '#d97706' : '#dc2626';
                            return `
                                <tr>
                                    <td>
                                        <i class="fas fa-map-marker-alt" style="color:#2563eb;margin-right:0.4rem;"></i>
                                        <strong>${l.location_name}</strong>
                                    </td>
                                    <td>${l.total_active}</td>
                                    <td><span class="tag sla-ok">${l.ok}</span></td>
                                    <td><span class="tag sla-warning">${l.warning}</span></td>
                                    <td><span class="tag sla-breached">${l.breached}</span></td>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:0.5rem;">
                                            <div style="flex:1;background:#f1f5f9;border-radius:999px;height:8px;overflow:hidden;">
                                                <div style="width:${l.compliance_rate}%;height:100%;background:${color};border-radius:999px;"></div>
                                            </div>
                                            <span style="font-weight:700;color:${color}">${l.compliance_rate}%</span>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<p style="color:red">Error cargando reporte</p>';
    }
}

async function loadReportAssetsLocation() {
    const container = document.getElementById('report-content');
    try {
        const res = await apiFetch('/reports/assets-by-location');
        const data = await res.json();

        if (data.length === 0) {
            container.innerHTML = emptyState('boxes', 'No hay activos registrados');
            return;
        }

        container.innerHTML = `
            <div class="card">
                <h3>Activos por Sede</h3>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Sede</th>
                            <th>Total</th>
                            <th>Activos</th>
                            <th>En Reparación</th>
                            <th>Mantenimiento</th>
                            <th>Dados de Baja</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(l => `
                            <tr>
                                <td>
                                    <i class="fas fa-map-marker-alt" style="color:#2563eb;margin-right:0.4rem;"></i>
                                    <strong>${l.location_name}</strong>
                                </td>
                                <td><strong>${l.total}</strong></td>
                                <td><span class="tag tag-asset-status-active">${l.active}</span></td>
                                <td><span class="tag tag-asset-status-in_repair">${l.in_repair}</span></td>
                                <td><span class="tag tag-asset-status-maintenance">${l.maintenance}</span></td>
                                <td><span class="tag tag-asset-status-retired">${l.retired}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<p style="color:red">Error cargando reporte</p>';
    }
}

async function loadReportSummary() {
    const container = document.getElementById('report-content');
    try {
        const res = await apiFetch('/reports/summary');
        const data = await res.json();

        container.innerHTML = `
            <div class="card">
                <h3>
                    Resumen Ejecutivo
                    <span style="font-size:0.8rem;font-weight:400;color:#64748b;margin-left:1rem;">
                        Generado: ${new Date(data.generated_at).toLocaleString('es-CO')}
                    </span>
                </h3>

                <div class="metrics-grid" style="margin-bottom:1.5rem;">
                    <div class="metric-card blue">
                        <i class="fas fa-ticket-alt"></i>
                        <div class="metric-info">
                            <span class="metric-value">${data.totals.tickets}</span>
                            <span class="metric-label">Total Tickets</span>
                        </div>
                    </div>
                    <div class="metric-card green">
                        <i class="fas fa-users"></i>
                        <div class="metric-info">
                            <span class="metric-value">${data.totals.users}</span>
                            <span class="metric-label">Usuarios</span>
                        </div>
                    </div>
                    <div class="metric-card yellow">
                        <i class="fas fa-boxes"></i>
                        <div class="metric-info">
                            <span class="metric-value">${data.totals.assets}</span>
                            <span class="metric-label">Activos</span>
                        </div>
                    </div>
                    <div class="metric-card red">
                        <i class="fas fa-map-marker-alt"></i>
                        <div class="metric-info">
                            <span class="metric-value">${data.totals.locations}</span>
                            <span class="metric-label">Sedes</span>
                        </div>
                    </div>
                </div>

                <div class="cards-row">
                    <div class="card" style="margin-bottom:0;">
                        <h3>Tickets por Estado</h3>
                        <div class="summary-item">
                            <span>Abiertos</span>
                            <span class="tag tag-status-open">${data.tickets_by_status.open}</span>
                        </div>
                        <div class="summary-item">
                            <span>En Progreso</span>
                            <span class="tag tag-status-in_progress">${data.tickets_by_status.in_progress}</span>
                        </div>
                        <div class="summary-item">
                            <span>Resueltos</span>
                            <span class="tag tag-status-resolved">${data.tickets_by_status.resolved}</span>
                        </div>
                        <div class="summary-item">
                            <span>Cerrados</span>
                            <span class="tag tag-status-closed">${data.tickets_by_status.closed}</span>
                        </div>
                        <div class="summary-item" style="margin-top:1rem;padding-top:1rem;border-top:2px solid #e2e8f0;">
                            <span style="font-weight:700;">Tasa de Resolución</span>
                            <span style="font-weight:700;color:#16a34a;font-size:1.1rem;">${data.resolution_rate}%</span>
                        </div>
                    </div>
                    <div class="card" style="margin-bottom:0;">
                        <h3>Tickets por Prioridad</h3>
                        <div class="summary-item">
                            <span>Crítica</span>
                            <span class="tag tag-priority-critical">${data.tickets_by_priority.critical}</span>
                        </div>
                        <div class="summary-item">
                            <span>Alta</span>
                            <span class="tag tag-priority-high">${data.tickets_by_priority.high}</span>
                        </div>
                        <div class="summary-item">
                            <span>Media</span>
                            <span class="tag tag-priority-medium">${data.tickets_by_priority.medium}</span>
                        </div>
                        <div class="summary-item">
                            <span>Baja</span>
                            <span class="tag tag-priority-low">${data.tickets_by_priority.low}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = '<p style="color:red">Error cargando reporte</p>';
    }
}

async function exportCSV(type) {
    try {
        const res = await apiFetch(`/reports/export/${type}`);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_hus_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (err) {
        alert('Error al exportar');
    }
}


// ── DETALLE DE TICKET ─────────────────────────────────────────
let currentTicketId = null;

async function openTicketDetail(ticketId) {
    currentTicketId = ticketId;

    document.getElementById('modal-ticket-detail').classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('detail-comments-list').innerHTML = '<p style="color:#64748b">Cargando...</p>';

    try {
        // Cargar ticket
        const ticketRes = await apiFetch(`/tickets/${ticketId}`);
        const ticket = await ticketRes.json();

        // Título
        document.getElementById('detail-title').textContent = `#${ticket.id} — ${ticket.title}`;

        // Descripción
        document.getElementById('detail-description').innerHTML = `
            <p style="color:#475569; line-height:1.6;">${ticket.description}</p>
        `;

        // Metadata
        document.getElementById('detail-status').innerHTML =
            `<span class="tag tag-status-${ticket.status}">${statusLabel(ticket.status)}</span>`;
        document.getElementById('detail-priority').innerHTML =
            `<span class="tag tag-priority-${ticket.priority}">${priorityLabel(ticket.priority)}</span>`;
        document.getElementById('detail-category').innerHTML =
            `<span class="tag tag-category">${categoryLabel(ticket.category)}</span>`;

        const loc = allLocations.find(l => l.id === ticket.location_id);
        document.getElementById('detail-location').textContent = loc ? loc.name : '—';
        document.getElementById('detail-created-by').textContent = ticket.created_by.full_name;
        document.getElementById('detail-assigned').textContent =
            ticket.assigned_to ? ticket.assigned_to.full_name : 'Sin asignar';
        document.getElementById('detail-created-at').textContent = formatDate(ticket.created_at);

        // SLA
        const SLA_HOURS = { critical: 1, high: 4, medium: 8, low: 24 };
        const slaHours = SLA_HOURS[ticket.priority] || 8;
        const now = new Date();
        const created = new Date(ticket.created_at);
        const elapsed = (now - created) / (1000 * 60 * 60);
        const remaining = slaHours - elapsed;
        const pct = Math.min((elapsed / slaHours) * 100, 100);

        if (ticket.status === 'resolved' || ticket.status === 'closed') {
            document.getElementById('detail-sla').innerHTML =
                `<span class="sla-badge sla-completed"><i class="fas fa-check"></i> Completado</span>`;
        } else if (elapsed > slaHours) {
            document.getElementById('detail-sla').innerHTML =
                `<span class="sla-badge sla-breached"><i class="fas fa-exclamation-circle"></i> Vencido ${formatHours(elapsed - slaHours)}</span>`;
        } else if (pct >= 75) {
            document.getElementById('detail-sla').innerHTML =
                `<span class="sla-badge sla-warning"><i class="fas fa-clock"></i> Vence en ${formatHours(remaining)}</span>`;
        } else {
            document.getElementById('detail-sla').innerHTML =
                `<span class="sla-badge sla-ok"><i class="fas fa-check"></i> Vence en ${formatHours(remaining)}</span>`;
        }

        // Mostrar toggle de nota interna solo para admin y técnico
        const isStaff = currentUser.role === 'admin' || currentUser.role === 'technician';
        const internalLabel = document.getElementById('internal-comment-label');
        if (isStaff) {
            internalLabel.classList.remove('hidden');
        } else {
            internalLabel.classList.add('hidden');
        }

        // Cargar comentarios
        await loadComments(ticketId);

    } catch (err) {
        console.error('Error cargando ticket:', err);
    }
}

async function loadComments(ticketId) {
    const container = document.getElementById('detail-comments-list');

    try {
        const res = await apiFetch(`/comments/ticket/${ticketId}`);
        const comments = await res.json();

        if (comments.length === 0) {
            container.innerHTML = `
                <div class="empty-comments">
                    <i class="fas fa-comments"></i>
                    <p>No hay comentarios aún. ¡Sé el primero!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = comments.map(c => {
            const isOwn = c.author_id === currentUser.id;
            return `
                <div class="comment-card ${c.is_internal ? 'internal' : ''} ${isOwn ? 'own' : ''}">
                    <div class="comment-header">
                        <div class="comment-author">
                            <i class="fas fa-user-circle"></i>
                            <strong>${c.author.full_name}</strong>
                            ${c.is_internal ? '<span class="tag" style="background:#fef3c7;color:#92400e;font-size:0.7rem;">Nota interna</span>' : ''}
                        </div>
                        <span class="comment-date">${formatDate(c.created_at)}</span>
                    </div>
                    <div class="comment-body">${c.body}</div>
                </div>
            `;
        }).join('');

    } catch (err) {
        container.innerHTML = '<p style="color:red">Error cargando comentarios</p>';
    }
}

async function submitComment() {
    const body = document.getElementById('new-comment').value.trim();
    const isInternal = document.getElementById('is-internal').checked;

    if (!body) {
        alert('Escribe un comentario primero');
        return;
    }

    try {
        const res = await apiFetch('/comments/', {
            method: 'POST',
            body: JSON.stringify({
                body,
                is_internal: isInternal,
                ticket_id: currentTicketId,
            }),
        });

        if (res.ok) {
            document.getElementById('new-comment').value = '';
            document.getElementById('is-internal').checked = false;
            await loadComments(currentTicketId);
        } else {
            alert('Error al enviar el comentario');
        }
    } catch (err) {
        alert('Error de conexión');
    }
}