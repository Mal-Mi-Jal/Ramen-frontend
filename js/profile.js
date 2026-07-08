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
        await loadPendingReviews();
        checkAndStartPolling();
        return;
    }
    resetProfileStats();
    try {
        const r = await fetch(API + '/users/me', { headers: authHeader() });
        if (r.ok) {
            const d = await r.json();
            profileCache = d.data;

            renderProfile(profileCache);
            await loadPendingReviews();
            checkAndStartPolling();
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

    if (visitHistoryCache) {
        renderVisitHistory(visitHistoryCache);
        return;
    }

    const list = document.getElementById("visit-list");
    list.innerHTML = '<div class="loading">불러오는 중...</div>';

    try {

        const r = await fetch(
            API + "/users/me/visit-history",
            { headers: authHeader() }
        );

        const d = await r.json();

        const visits =
            d.data?.visit_history || [];

        visitHistoryCache = visits;

        renderVisitHistory(visits);

    } catch (e) {

        list.innerHTML =
            '<div class="empty">방문 기록을 불러올 수 없어요.</div>';

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

function renderVisitHistory(visits) {

    const list =
        document.getElementById("visit-list");

    if (visits.length === 0) {

        list.innerHTML =
            '<div class="empty">아직 방문 인증한 라멘집이 없어요 🍜</div>';

        return;

    }

    list.innerHTML = visits.map(v => `
      <div class="visit-item" onclick="openDetail(${JSON.stringify(v.restaurant).replace(/"/g, '&quot;')})">
        <div class="rest-icon">🍜</div>
        <div class="visit-info">
          <div class="visit-name">${v.restaurant?.name || ''}</div>
          <div class="visit-addr">${v.restaurant?.address || ''}</div>
          <div class="visit-meta">
            방문 ${v.visit_count}회 · 최근 방문 ${formatDate(v.last_visited_at)}
          </div>
        </div>
        <i class="ti ti-chevron-right"
           style="color:var(--text3);font-size:18px"></i>
      </div>
    `).join("");

}

async function loadPendingReviews(){

    try{

        const r =
            await fetch(

                API + "/users/me/pending-review",

                {
                    headers:authHeader()
                }

            );

        const d =
            await r.json();

        const box =
            document.getElementById(
                "pending-review-box"
            );

        const reviews =
            d.data || [];

        if(reviews.length===0){

            box.style.display="none";

            return;

        }
        box.style.display = "block";

        box.innerHTML =

`
<div class="pending-review-header">

    🍜

    <span>

        작성 가능한 리뷰 (${reviews.length})

    </span>

</div>

` +

reviews.map(rv=>{

    const isToday =
        rv.days_left <= 0;

    return `

    <div class="pending-review-item">

        <div>

            <div class="pending-review-name">

                ${rv.restaurant_name}

            </div>

            <div class="pending-review-days ${isToday ? "today" : ""}">

                ${
                    isToday
                    ? "⚠️ 오늘 마감"
                    : `⏳ ${rv.days_left}일 남음`
                }

            </div>

        </div>

        <button

            class="pending-review-btn"

            onclick="goPendingReview(
                '${rv.verification_id}',
                '${rv.restaurant_id}'
            )">

            리뷰 작성

        </button>

    </div>

`;

}).join("");
        
    }catch(e){

        console.error(e);

    }

}


