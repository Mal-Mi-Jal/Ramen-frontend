const API = 'https://ramen-production.up.railway.app';
const SUPABASE_URL =
    "https://whbavqoikolkdbuohjxv.supabase.co";

const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoYmF2cW9pa29sa2RidW9oanh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMTI0MzQsImV4cCI6MjA5NzY4ODQzNH0.WpnADedrAT0kPbAlTDqYGhHNuZHOuFbIHJmrCF60EqQ";

const supabaseClient =
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
