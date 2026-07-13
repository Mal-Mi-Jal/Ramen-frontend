const API = 'https://ramen-production.up.railway.app';
const SUPABASE_URL =
    "https://whbavqoikolkdbuohjxv.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_LcZCnc_syjMEZS7k3j7-CQ_JopqZg3H";

const supabase =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


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
