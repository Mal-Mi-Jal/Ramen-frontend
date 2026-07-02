const API = 'https://ramen-production.up.railway.app';

function authHeader() {
    return token ? { 'Authorization': 'Bearer ' + token } : {};
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return dateStr.slice(0, 10).replace(/-/g, '.');
}

let toastTimer;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function showErr(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.style.display = 'block';
}

function getPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('GPS 미지원')); return; }
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
    });
}