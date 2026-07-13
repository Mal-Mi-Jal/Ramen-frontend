let editingReviewId = null;
let selectedStar = 0;
let selectedRevisit = null;

async function loadReviews(restaurantId) {
    const list = document.getElementById('review-list');
    list.innerHTML = '<div class="loading">리뷰를 불러오는 중...</div>';
    try {
        const r = await fetch(`${API}/restaurants/${restaurantId}/reviews`);
        const d = await r.json();
        const reviews = d.data?.reviews || [];
        if (reviews.length === 0) {
            list.innerHTML = '<div class="empty">아직 리뷰가 없어요.<br>첫 번째 리뷰를 남겨보세요! 🍜</div>';
            return;
        }
        list.innerHTML = reviews.map(rv => renderReviewItem(rv, false)).join('');
    } catch (e) {
        list.innerHTML = '<div class="empty">리뷰를 불러올 수 없어요.</div>';
    }
}

function renderReviewItem(rv, isMine) {
    const isMyReview = isMine || (currentUser && rv.user?.id === currentUser?.id);
    const menuHtml = isMyReview ? `
    <div class="review-menu">
      <button class="review-menu-btn" onclick="toggleReviewMenu(event, '${rv.id}')">
        <i class="ti ti-dots-vertical"></i>
      </button>
      <div class="review-dropdown" id="review-menu-${rv.id}">
        <button onclick="goEditReview('${rv.id}', ${rv.rating}, ${JSON.stringify(rv.content || '').replace(/"/g, '&quot;')}, ${rv.revisit_intention})">수정</button>
        <button class="delete-btn" onclick="deleteReview('${rv.id}')">삭제</button>
      </div>
    </div>
  ` : '';

    const restaurantOrUser = isMine
        ? `<div class="reviewer-name">${rv.restaurant?.name || ''}</div>`
        : `<div class="reviewer-name">${rv.user?.nickname || '익명'}</div>`;

    return `
  <div class="review-item" id="review-item-${rv.id}">
    <div class="reviewer">
      <div class="avatar">${isMine ? (rv.restaurant?.name?.[0] || '?') : (rv.user?.nickname?.[0] || '?')}</div>

      <div style="flex:1">
        ${restaurantOrUser}
        <div class="reviewer-date">${formatDate(rv.created_at)}</div>
      </div>

      ${menuHtml}
    </div>

    <div class="stars">${'⭐'.repeat(rv.rating)}</div>

    <div class="review-text">
      ${rv.content || ''}
    </div>

    <div class="review-tags">
      <span class="tag ${rv.revisit_intention ? 'revisit' : ''}">
        ${rv.revisit_intention ? '재방문 의사 있음' : '재방문 의사 없음'}
      </span>
    </div>

    <div class="review-actions">

      <button class="like-btn"
              id="like-${rv.id}"
              onclick="toggleLike('${rv.id}', ${rv.like_count || 0})">
        <i class="ti ti-heart"></i>
        ${rv.like_count || 0}
      </button>

     <button
    id="comment-btn-${rv.id}"
    class="comment-toggle-btn"
    onclick="openCommentModal('${rv.id}')">
        <i class="ti ti-message-circle"></i>
        ${rv.comment_count || 0}
      </button>

    </div>

  </div>
`;
}

function toggleReviewMenu(e, reviewId) {
    e.stopPropagation();
    const menu = document.getElementById('review-menu-' + reviewId);
    const isOpen = menu.classList.contains('open');
    // 다른 열린 메뉴 닫기
    document.querySelectorAll('.review-dropdown.open').forEach(m => m.classList.remove('open'));
    if (!isOpen) menu.classList.add('open');
}

// 다른 곳 클릭 시 드롭다운 닫기
document.addEventListener('click', () => {
    document.querySelectorAll('.review-dropdown.open').forEach(m => m.classList.remove('open'));
});

async function deleteReview(reviewId) {
    document.querySelectorAll('.review-dropdown.open').forEach(m => m.classList.remove('open'));
    if (!confirm('리뷰를 삭제할까요?')) return;
    try {
        const r = await fetch(`${API}/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: authHeader()
        });
       if (r.ok) {
      myReviewsCache = null;
    profileCache = null;
    delete restaurantCache[currentRestaurant.id];

    showToast('리뷰가 삭제됐어요.');

    document.getElementById(
        'review-item-' + reviewId
    )?.remove();

    await refreshCurrentRestaurantStats();

    await loadReviews(currentRestaurant.id);

    } else {
            showToast('삭제에 실패했어요.');
        }
    } catch (e) {
        showToast('서버에 연결할 수 없어요.');
    }
}

// ── 리뷰 수정 ─────────────────────────────
function goEditReview(reviewId, rating, content, revisitIntention) {
    editingReviewId = reviewId;
    selectedStar = rating;
    selectedRevisit = revisitIntention;

    document.getElementById('write-title').textContent = '리뷰 수정';
    document.getElementById('write-submit-btn').textContent = '수정 완료';
    document.getElementById('review-text').value = content;

    // 별점 표시
    document.querySelectorAll('.star-pick').forEach((b, i) => b.classList.toggle('on', i < rating));

    // 재방문 의사 표시
    document.querySelectorAll('.revisit-btn').forEach((b, i) => {
        b.classList.toggle('active',
            (i === 0 && revisitIntention === true) ||
            (i === 1 && revisitIntention === false)
        );
    });

    document.querySelectorAll('.review-dropdown.open').forEach(m => m.classList.remove('open'));
    navigate('write');
}

async function submitReview() {
    if (!selectedStar) { showToast('별점을 선택해주세요'); return; }
    if (selectedRevisit === null) { showToast('재방문 의사를 선택해주세요'); return; }
    const content = document.getElementById('review-text').value.trim();
    if (!content) { showToast('리뷰 내용을 입력해주세요'); return; }

    // 수정 모드
    if (editingReviewId) {
        try {
            const r = await fetch(`${API}/reviews/${editingReviewId}`, {
                method: 'PATCH',
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating: selectedStar,
                    content,
                    revisit_intention: selectedRevisit
                })
            });
            if (r.ok) {
                myReviewsCache = null;
                delete restaurantCache[currentRestaurant.id];
            
                showToast('리뷰가 수정됐어요! 🍜');
            
                editingReviewId = null;
            
                document.getElementById('write-title').textContent = '리뷰 작성';
            
                document.getElementById('write-submit-btn').textContent = '리뷰 등록하기';
            
                navigate('detail');
            
                await refreshCurrentRestaurantStats();
            
                await loadReviews(currentRestaurant.id);

    }    else {
                const d = await r.json();
                showToast(d.message || '수정에 실패했어요.');
            }
        } catch (e) {
            showToast('서버에 연결할 수 없어요.');
        }
        return;
    }

    // 새 리뷰 작성 모드
    if (!currentVerificationId) { showToast('방문 인증이 필요해요'); return; }
    try {
        const r = await fetch(API + '/reviews', {
            method: 'POST',
            headers: { ...authHeader(), 'Content-Type': 'application/json' },
            const imageUrls =
                await uploadImages();

              body: JSON.stringify({
            
                restaurant_id: currentRestaurant.id,
            
                verification_id: currentVerificationId,
            
                rating: selectedStar,
            
                content,
            
                revisit_intention: selectedRevisit,
            
                image_urls: imageUrls
            
            })
        });
       if (r.ok || r.status === 201) {
           myReviewsCache = null;
            profileCache = null;
            delete restaurantCache[currentRestaurant.id];

        showToast('리뷰가 등록됐어요! 🍜');

        currentVerificationId = null;

        setTimeout(async () => {

        navigate('detail');

        await refreshCurrentRestaurantStats();

        await loadReviews(currentRestaurant.id);

    }, 300);

    } else {
            const d = await r.json();
            showToast(d.message || '리뷰 등록에 실패했어요');
        }
    } catch (e) {
        showToast('서버에 연결할 수 없어요');
    }
}

// ── 내 리뷰 ───────────────────────────────
async function loadMyReviews() {
    if (myReviewsCache) {
    renderMyReviews(myReviewsCache);
    return;
}
    const list = document.getElementById('my-review-list');
    list.innerHTML = '<div class="loading">불러오는 중...</div>';
    try {
        // 💡 GET /users/me/reviews 엔드포인트가 백엔드에 있어야 동작해요
        const r = await fetch(API + '/users/me/reviews', { headers: authHeader() });
        const d = await r.json();
        const reviews = d.data?.reviews || [];
        myReviewsCache = reviews;
        renderMyReviews(reviews);
    } catch (e) {
        list.innerHTML = '<div class="empty">내 리뷰를 불러올 수 없어요.<br>(백엔드 API 준비 중일 수 있어요)</div>';
    }
}


async function toggleLike(reviewId, currentCount) {
    const btn = document.getElementById('like-' + reviewId);
    const isLiked = btn.classList.contains('liked');
    try {
        const r = await fetch(`${API}/reviews/${reviewId}/likes`, {
            method: isLiked ? 'DELETE' : 'POST',
            headers: authHeader()
        });
        if (r.ok || r.status === 201) {
            btn.classList.toggle('liked');
            const newCount = isLiked ? currentCount - 1 : currentCount + 1;
            btn.innerHTML = `<i class="ti ti-${btn.classList.contains('liked') ? 'heart-filled' : 'heart'}"></i> ${newCount}`;
            showToast(isLiked ? '추천을 취소했어요' : '추천했어요 ❤️');
        }
    } catch (e) {
        showToast('로그인이 필요해요');
    }
}

async function goPendingReview(verificationId, restaurantId) {
    currentVerificationId = verificationId;
    await openDetail({ id: restaurantId });
    // 💡 detail 화면이 완전히 렌더된 후 write로 이동
    setTimeout(() => {
        goWrite();
    }, 300);
}

// ── 리뷰 작성 ─────────────────────────────
function goWrite() {
    if (!token) { showToast('로그인이 필요해요'); return; }
    editingReviewId = null;
    selectedStar = 0; selectedRevisit = null;
    document.getElementById('write-title').textContent = '리뷰 작성';
    document.getElementById('write-submit-btn').textContent = '리뷰 등록하기';
    document.getElementById('review-text').value = '';
    document.querySelectorAll('.star-pick').forEach(b => b.classList.remove('on'));
    document.querySelectorAll('.revisit-btn').forEach(b => b.classList.remove('active'));
    navigate('write');
}

function updateFavoriteButton(){
    const btn =
        document.getElementById("favorite-btn");
    if(!btn) return;
    if(isFavorite){
        btn.classList.add("active");
        btn.textContent = "❤️";
    }else{
        btn.classList.remove("active");
        btn.textContent = "🤍";
    }
}

async function toggleFavorite(){
    if(!token){
        showToast("로그인이 필요해요");
        return;
    }
    try{
        const r =
            await fetch(
                `${API}/restaurants/${currentRestaurant.id}/favorite`,
                {
                    method:"POST",
                    headers:authHeader()
                }
            );
        const d =
            await r.json();
        if(!r.ok){
            showToast("즐겨찾기 실패");
            return;
        }
        isFavorite =
            d.data.isFavorite;
        updateFavoriteButton();
        showToast(
            isFavorite
                ? "❤️ 즐겨찾기에 저장되었습니다."
                : "🤍 즐겨찾기에서 제거되었습니다."
        );
    }catch(e){
        console.error(e);
    }
}

function setStar(n) {
    selectedStar = n;
    document.querySelectorAll('.star-pick').forEach((b, i) => b.classList.toggle('on', i < n));
}

function setRevisit(btn, val) {
    selectedRevisit = val;
    document.querySelectorAll('.revisit-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function renderMyReviews(reviews){
    const list =
        document.getElementById("my-review-list");

    if(reviews.length === 0){

        list.innerHTML =
            '<div class="empty">아직 작성한 리뷰가 없어요 🍜</div>';
        return;
    }

    list.innerHTML =
        reviews
            .map(rv => renderReviewItem(rv, true))
            .join("");

}

async function uploadImages(){

    const urls = [];

    for(const file of selectedImages){

        const ext =
            file.name.split(".").pop();

        const fileName =
            crypto.randomUUID() + "." + ext;

        const { data, error } =
            await supabase.storage
                .from("review-images")
                .upload(
                    `reviews/${fileName}`,
                    file
                );

        if(error){
            console.error(error);
            throw error;
        }

        const { data: publicUrl } =
            supabase.storage
                .from("review-images")
                .getPublicUrl(
                    data.path
                );

        urls.push(
            publicUrl.publicUrl
        );

    }
    return urls;

}
