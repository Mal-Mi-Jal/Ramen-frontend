let currentCommentReviewId = null;

// 댓글
async function openCommentModal(reviewId){

    currentCommentReviewId = reviewId;

    document.getElementById("comment-modal").style.display="block";

    loadComments();

}

async function loadComments(){

    const box =
        document.getElementById("comment-list");

    box.innerHTML="불러오는 중...";

    const response =
        await fetch(

            `${API}/reviews/${currentCommentReviewId}/comments?page=1&size=30`,

            {
                headers: authHeader()
            }

        );

    const data =
        await response.json();

    const comments =
        data.data?.comments || [];

    box.innerHTML =
        comments
            .map(c => renderCommentItem(c, currentCommentReviewId))
            .join("");

}

function renderCommentItem(c, reviewId) {

    const isMine =
        currentUser &&
        c.user?.id === currentUser?.id;

    const actionHtml =
        isMine
            ? `
            <div style="display:flex;gap:8px;margin-top:4px">

                <button
                    onclick="startEditComment('${reviewId}','${c.id}')"
                    style="background:none;border:none;font-size:12px;color:var(--text3);cursor:pointer;padding:0">

                    수정

                </button>

                <button
                    onclick="deleteComment('${reviewId}','${c.id}')"
                    style="background:none;border:none;font-size:12px;color:var(--red);cursor:pointer;padding:0">

                    삭제

                </button>

            </div>
            `
            : "";

    return `
        <div class="comment-row" id="comment-row-${c.id}">

            <div class="comment-avatar">

                ${c.user?.nickname?.[0] || "?"}

            </div>

            <div class="comment-body">

                <div class="comment-name">

                    ${c.user?.nickname || "익명"}

                </div>

                <div
                    class="comment-text"
                    id="comment-text-${c.id}">

                    ${c.content}

                </div>

                <div class="comment-date">

                    ${formatDate(c.created_at)}

                </div>

                ${actionHtml}

            </div>

        </div>
    `;
}

async function submitComment(){

    const input =
        document.getElementById("comment-content");

    if(!input.value.trim()){

        showToast("댓글을 입력하세요.");

        return;

    }

    const response =
        await fetch(

            `${API}/reviews/${currentCommentReviewId}/comments`,

            {

                method:"POST",

                headers:{

                    ...authHeader(),

                    "Content-Type":"application/json"

                },

                body:JSON.stringify({

                    content:input.value

                })

            }

        );

    if(response.ok){

        input.value = "";

        updateCommentCount(
            currentCommentReviewId,
            +1
        );

        await loadComments();

        showToast("댓글이 등록되었습니다.");

    }else{

        showToast("댓글 등록에 실패했습니다.");

    }

}

// ── 댓글 수정/삭제 ────────────────────────
function updateCommentCount(reviewId, diff){

    const btn =
        document.getElementById(
            `comment-btn-${reviewId}`
        );

    if(!btn) return;

    const current =
        parseInt(
            btn.textContent.match(/\d+/)?.[0] || "0"
        );

    const next =
        Math.max(0, current + diff);

    btn.innerHTML = `
        <i class="ti ti-message-circle"></i>
        ${next}
    `;

}

function startEditComment(reviewId, commentId){

    const textEl =
        document.getElementById(
            `comment-text-${commentId}`
        );

    const original =
        textEl.textContent.trim();

    textEl.innerHTML = `

        <input
            id="edit-input-${commentId}"
            value="${original}"
            style="width:100%;padding:8px">

        <div
            style="display:flex;gap:8px;margin-top:8px">

            <button
                onclick="submitEditComment('${reviewId}','${commentId}')">

                저장

            </button>

            <button
                onclick="loadComments()">

                취소

            </button>

        </div>

    `;
}

async function submitEditComment(reviewId, commentId){

    const content =
        document
            .getElementById(
                `edit-input-${commentId}`
            )
            .value
            .trim();

    if(!content){

        showToast("댓글을 입력해주세요.");

        return;

    }

    const response =
        await fetch(

            `${API}/reviews/${reviewId}/comments/${commentId}`,

            {

                method:"PATCH",

                headers:{
                    ...authHeader(),
                    "Content-Type":"application/json"
                },

                body:JSON.stringify({
                    content
                })

            }

        );

    if(response.ok){

        showToast("댓글이 수정되었습니다.");

        await loadComments();

        await loadReviews(currentRestaurant.id);

    }else{

        showToast("수정 실패");

    }

}

async function deleteComment(reviewId, commentId){

    if(
        !confirm("댓글을 삭제하시겠습니까?")
    ){
        return;
    }

    const response =
        await fetch(

            `${API}/reviews/${reviewId}/comments/${commentId}`,

            {

                method:"DELETE",

                headers:authHeader()

            }

        );

    if(response.ok){

        updateCommentCount(
            reviewId,
            -1
        );

        await loadComments();

        showToast("댓글이 삭제되었습니다.");

    }else{

        showToast("댓글 삭제에 실패했습니다.");

    }
}


function closeCommentModal(e){

    if(
        e &&
        e.target !==
        document.getElementById("comment-modal")
    ) return;

    document
        .getElementById("comment-modal")
        .style.display = "none";

}