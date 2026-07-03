function resetProfileStats() {

    document.getElementById("prof-reviews").textContent = "...";

    document.getElementById("prof-visits").textContent = "...";

    document.getElementById("prof-likes").textContent = "...";

}

// ── 프로필 ────────────────────────────────
async function loadProfile() {
    if (!currentUser) return;
    document.getElementById('prof-name').textContent = currentUser.nickname;
    document.getElementById('prof-email').textContent = currentUser.email;
    document.getElementById('prof-avatar').textContent = currentUser.nickname[0];
    if(profileCache){
        renderProfile(profileCache);
        return;
    }
    resetProfileStats();
    try {
        const r = await fetch(API + '/users/me', { headers: authHeader() });
        if (r.ok) {
            const d = await r.json();
            profileCache = d.data;

            renderProfile(profileCache);
        }
    } catch (e) {
        console.error("프로필 로딩 실패", e);

    document.getElementById("prof-reviews").textContent = "-";
    document.getElementById("prof-visits").textContent = "-";
    document.getElementById("prof-likes").textContent = "-";
    }
    
}

// ── 방문 기록 ─────────────────────────────
async function loadVisitHistory() {
    const list = document.getElementById('visit-list');
    list.innerHTML = '<div class="loading">불러오는 중...</div>';
    try {
        const r = await fetch(API + '/users/me/visit-history', { headers: authHeader() });
        const d = await r.json();
        const visits = d.data?.visit_history || [];
        if (visits.length === 0) {
            list.innerHTML = '<div class="empty">아직 방문 인증한 라멘집이 없어요 🍜</div>';
            return;
        }
        list.innerHTML = visits.map(v => `
      <div class="visit-item" onclick="openDetail(${JSON.stringify(v.restaurant).replace(/"/g, '&quot;')})">
        <div class="rest-icon">🍜</div>
        <div class="visit-info">
          <div class="visit-name">${v.restaurant?.name || ''}</div>
          <div class="visit-addr">${v.restaurant?.address || ''}</div>
          <div class="visit-meta">방문 ${v.visit_count}회 · 최근 방문 ${formatDate(v.last_visited_at)}</div>
        </div>
        <i class="ti ti-chevron-right" style="color:var(--text3);font-size:18px"></i>
      </div>
    `).join('');
    } catch (e) {
        list.innerHTML = '<div class="empty">방문 기록을 불러올 수 없어요.</div>';
    }
}

// ── 프로필 수정 ───────────────────────────
function goEditProfile() {
    document.getElementById('edit-nickname').value = currentUser?.nickname || '';
    document.getElementById('edit-err').style.display = 'none';
    navigate('editprofile');
}

async function submitProfileEdit() {
    const nickname = document.getElementById('edit-nickname').value.trim();
    if (!nickname) { showErr('edit-err', '닉네임을 입력해주세요.'); return; }
    const btn = document.getElementById('edit-submit-btn');
    btn.disabled = true; btn.textContent = '저장 중...';
    try {
        const r = await fetch(API + '/users/me', {
            method: 'PATCH',
            headers: { ...authHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname })
        });
        const d = await r.json();
        if (r.ok) {
            currentUser.nickname = nickname;
            profileCache = null;
            showToast('프로필이 수정됐어요!');
            navigate('profile');
        } else {
            showErr('edit-err', d.message || '수정에 실패했어요.');
        }
    } catch (e) {
        showErr('edit-err', '서버에 연결할 수 없어요.');
    } finally {
        btn.disabled = false; btn.textContent = '저장하기';
    }
}

function renderProfile(profile){

    document.getElementById("prof-name").textContent =
        profile.nickname;

    document.getElementById("prof-email").textContent =
        profile.email;

    document.getElementById("prof-avatar").textContent =
        profile.nickname[0];

    document.getElementById("prof-reviews").textContent =
        profile.review_count;

    document.getElementById("prof-visits").textContent =
        profile.visit_count;

    document.getElementById("prof-likes").textContent =
        profile.received_like_count;

}
