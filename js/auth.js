function switchTab(tab) {
    document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
    document.querySelectorAll('.auth-tab').forEach((b, i) =>
        b.classList.toggle('active', tab === 'login' ? i === 0 : i === 1));
}

async function doLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pw = document.getElementById('login-pw').value;
    if (!email || !pw) { showErr('login-err', '이메일과 비밀번호를 입력해주세요.'); return; }
    const btn = document.getElementById('login-btn');
    btn.disabled = true; btn.textContent = '로그인 중...';
    try {
        const r = await fetch(API + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pw })
        });
        const d = await r.json();
        if (r.ok) {
            token = d.data?.access_token;
            localStorage.setItem('access_token', token);
            localStorage.setItem('refresh_token', d.data?.refresh_token || '');
            currentUser = { email, nickname: d.data?.nickname || email.split('@')[0] };
            afterLogin();
        } else {
            showErr('login-err', d.message || '이메일 또는 비밀번호가 일치하지 않습니다.');
        }
    } catch (e) {
        showErr('login-err', '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
        btn.disabled = false; btn.textContent = '로그인';
    }
}

async function doSignup() {
    const email = document.getElementById('su-email').value.trim();
    const nickname = document.getElementById('su-nick').value.trim();
    const pw = document.getElementById('su-pw').value;
    if (!email || !nickname || !pw) { showErr('signup-err', '모든 항목을 입력해주세요.'); return; }
    if (pw.length < 8) { showErr('signup-err', '비밀번호는 8자 이상이어야 합니다.'); return; }
    const btn = document.getElementById('signup-btn');
    btn.disabled = true; btn.textContent = '가입 중...';
    try {
        const r = await fetch(API + '/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, nickname, password: pw })
        });
        const d = await r.json();
        if (r.ok || r.status === 201) {
            showToast('회원가입 완료! 로그인해주세요.');
            switchTab('login');
        } else {
            showErr('signup-err', d.message || '회원가입에 실패했습니다.');
        }
    } catch (e) {
        showErr('signup-err', '서버에 연결할 수 없습니다.');
    } finally {
        btn.disabled = false; btn.textContent = '회원가입';
    }
}

async function afterLogin() {
    try {
        const r = await fetch(API + '/users/me', { headers: authHeader() });
        if (r.ok) {
            const d = await r.json();
            currentUser = { id: d.data.id, email: d.data.email, nickname: d.data.nickname };
        }
    } catch (e) {}
    navigate('home');
}

async function doLogout() {
    try {
        await fetch(API + '/auth/logout', { method: 'POST', headers: authHeader() });
    } catch (e) {}
    token = null; currentUser = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    showToast('로그아웃 되었습니다.');
    setTimeout(() => navigate('auth'), 300);
}

async function tryRefreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return;
    try {
        const r = await fetch(API + '/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });
        if (r.ok) {
            const d = await r.json();
            token = d.data?.access_token;
            localStorage.setItem('access_token', token);
            const userR = await fetch(API + '/users/me', { headers: { 'Authorization': 'Bearer ' + token } });
            if (userR.ok) {
                const userData = await userR.json();
                currentUser = { id: userData.data.id, email: userData.data.email, nickname: userData.data.nickname };
                afterLogin();
            }
        } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
        }
    } catch (e) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }
}