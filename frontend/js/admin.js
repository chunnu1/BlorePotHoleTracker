const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const adminPassword = document.getElementById('adminPassword');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const reportsGrid = document.getElementById('reportsGrid');
const toastEl = document.getElementById('toast');

const changePasswordModal = document.getElementById('changePasswordModal');
const btnOpenChangePassword = document.getElementById('btnOpenChangePassword');
const btnCancelChange = document.getElementById('btnCancelChange');
const btnSavePassword = document.getElementById('btnSavePassword');
const newPassword = document.getElementById('newPassword');

let token = localStorage.getItem('admin_token');

function showToast(msg, isError = false) {
    toastEl.textContent = msg;
    toastEl.style.backgroundColor = isError ? '#ef4444' : '#10b981';
    toastEl.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => {
        toastEl.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

async function login() {
    const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword.value })
    });
    if (res.ok) {
        const data = await res.json();
        token = data.token;
        localStorage.setItem('admin_token', token);
        adminPassword.value = '';
        checkAuth();
    } else {
        showToast('Invalid password', true);
    }
}

btnLogin.addEventListener('click', login);
adminPassword.addEventListener('keypress', e => {
    if (e.key === 'Enter') login();
});

btnLogout.addEventListener('click', () => {
    localStorage.removeItem('admin_token');
    token = null;
    checkAuth();
});

// Change password
btnOpenChangePassword.addEventListener('click', () => changePasswordModal.classList.remove('hidden'));
btnCancelChange.addEventListener('click', () => {
    changePasswordModal.classList.add('hidden');
    newPassword.value = '';
});
btnSavePassword.addEventListener('click', async () => {
    if (!newPassword.value) return;
    const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'token': token
        },
        body: JSON.stringify({ new_password: newPassword.value })
    });
    if (res.ok) {
        showToast('Password changed successfully');
        changePasswordModal.classList.add('hidden');
        newPassword.value = '';
    } else {
        showToast('Failed to change password', true);
    }
});

async function fetchReports() {
    const res = await fetch('/api/admin/potholes', {
        headers: { 'token': token }
    });
    if (res.status === 401) {
        localStorage.removeItem('admin_token');
        token = null;
        checkAuth();
        return;
    }
    const data = await res.json();
    renderGrid(data);
}

function renderGrid(reports) {
    reportsGrid.innerHTML = '';
    reports.forEach(r => {
        const div = document.createElement('div');
        div.className = 'bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg flex flex-col';
        
        let imgHtml = '<div class="h-48 bg-gray-700 flex items-center justify-center text-gray-500">No Image</div>';
        if (r.image_data && r.image_data.length > 0) {
            imgHtml = `<div class="h-48 overflow-x-auto flex snap-x snap-mandatory">`;
            r.image_data.forEach(src => {
                imgHtml += `<img src="${src}" class="h-full w-full object-cover flex-shrink-0 snap-center">`;
            });
            imgHtml += `</div>`;
        }

        div.innerHTML = `
            ${imgHtml}
            <div class="p-4 flex-1 flex flex-col">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-lg">${r.taluk}</h3>
                    <span class="bg-red-500/20 text-red-500 text-xs font-bold px-2 py-1 rounded-full">${r.reports_count} Reports</span>
                </div>
                <p class="text-sm text-gray-400 mb-1">MLA: ${r.mla}</p>
                <p class="text-sm text-gray-400 mb-4">MP: ${r.mp}</p>
                <div class="mt-auto pt-4 border-t border-gray-700">
                    <button class="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-bold py-2 rounded-lg transition-colors delete-btn" data-id="${r.id}">Delete Completely</button>
                </div>
            </div>
        `;
        reportsGrid.appendChild(div);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Are you sure you want to delete this report?')) return;
            const id = e.target.getAttribute('data-id');
            const res = await fetch(`/api/admin/potholes/${id}`, {
                method: 'DELETE',
                headers: { 'token': token }
            });
            if (res.ok) {
                showToast('Deleted');
                fetchReports();
            } else {
                showToast('Failed to delete', true);
            }
        });
    });
}

function checkAuth() {
    if (token) {
        loginScreen.classList.add('hidden');
        dashboardScreen.classList.remove('hidden');
        fetchReports();
    } else {
        loginScreen.classList.remove('hidden');
        dashboardScreen.classList.add('hidden');
    }
}

checkAuth();
