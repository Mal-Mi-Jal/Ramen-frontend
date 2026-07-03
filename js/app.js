// ── 전역 변수 ──────────────────────────────
let token = null;
let currentUser = null;
let currentRestaurant = null;
let currentVerificationId = null;
let timerInterval = null;
let timerSec = 1200;
let totalTimerSeconds = 1200;
let allSearchResults = [];
let restaurantCache = {};
let displayedCount = 0;
let nearbyRestaurantsCache = null;
let profileCache = null;
let visitHistoryCache = null;
const PAGE_SIZE = 10;

// ── 초기화 ────────────────────────────────
token = localStorage.getItem('access_token');

window.addEventListener('DOMContentLoaded', async () => {
    const savedToken = localStorage.getItem('access_token');
    if (savedToken) {
        token = savedToken;
        try {
            const r = await fetch(API + '/users/me', { headers: { 'Authorization': 'Bearer ' + token } });
            if (r.ok) {
                const d = await r.json();
                currentUser = { id: d.data.id, email: d.data.email, nickname: d.data.nickname };
                document.getElementById('splash').style.display = 'none';
                afterLogin();
            } else {
                await tryRefreshToken();
                document.getElementById('splash').style.display = 'none';
            }
        } catch (e) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            token = null;
            document.getElementById('splash').style.display = 'none';
            navigate('auth');
        }
    } else {
        document.getElementById('splash').style.display = 'none';
        navigate('auth');
    }
});

// ── 화면 전환 ──────────────────────────────
function navigate(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
    const nav = document.getElementById('bottom-nav');
    const hideNavScreens = ['auth', 'write', 'visits', 'myreviews', 'editprofile'];
    nav.style.display = hideNavScreens.includes(name) ? 'none' : 'flex';
    ['home', 'profile'].forEach(n => {
        document.getElementById('nav-' + n)?.classList.toggle('active', n === name);
    });
    if (name === 'home') loadNearbyRestaurants();
    if (name === 'profile') loadProfile();
    if (name === 'visits') loadVisitHistory();
    if (name === 'myreviews') loadMyReviews();
}

// 드롭다운 외부 클릭 시 닫기
document.addEventListener('click', () => {
    document.querySelectorAll('.review-dropdown.open').forEach(m => m.classList.remove('open'));
});
