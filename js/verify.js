// ── 방문 인증 ──────────────────────────────
async function openVerify() {
    if (!token) {
        showToast("로그인이 필요해요");
        return;
    }
    try {
        const pendingRes = await fetch(
            API + "/users/me/pending-review",
            {
                headers: authHeader()
            }
        );

        const pendingData = await pendingRes.json();

        const pending = pendingData.data || [];

        if (pending.length > 0) {

            openPendingReviewModal(pending);

            return;

        }
        const currentResponse = await fetch(
            `${API}/verifications/current`,
            { headers: authHeader() }
        );
        const currentData = await currentResponse.json();

        // 이미 진행중인 인증 있음
        if (currentData.success && currentData.data) {
            currentVerificationId = currentData.data.verification_id;
            document.getElementById("verify-modal").style.display = "flex";
            document.getElementById("mstep2").classList.remove("done");
            document.getElementById("mstep2").innerHTML = '<i class="ti ti-clock"></i> 체류 대기 중...';
            document.getElementById("verify-cta").style.display = "none";
            startVerificationTimer(currentData.data.remaining_seconds);
            return;
        }
        await startNewVerification();

    } catch (e) {
        console.error(e);
        showToast("위치 정보를 가져올 수 없습니다.");
    }
}

function updateTimerUI() {
    const m = Math.floor(timerSec / 60);
    const s = timerSec % 60;
    document.getElementById("timer-text").textContent =
        `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    const pct = timerSec / totalTimerSeconds;
    document.getElementById("timer-arc").setAttribute("stroke-dashoffset", 238.76 * (1 - pct));
}

function startVerificationTimer(seconds) {
    totalTimerSeconds = seconds;
    timerSec = seconds;
    updateTimerUI();
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timerSec = Math.max(0, timerSec - 1);
        updateTimerUI();

        if (timerSec === 0) {
            clearInterval(timerInterval);
            // 💡 타이머 끝나면 백엔드 상태 폴링 시작
            pollVerificationStatus();
        }
    }, 1000);
}

async function pollVerificationStatus() {
    // 최대 2분간 5초마다 폴링
    let attempts = 0;
    const maxAttempts = 24;

    const poll = setInterval(async () => {
        attempts++;
        try {
            const r = await fetch(`${API}/verifications/current`, { headers: authHeader() });
            const d = await r.json();

            // 💡 PENDING이 없어졌거나 (스케줄러가 VERIFIED로 바꿈) 인증 완료
            if (!d.data || d.data.status === 'verified') {
                clearInterval(poll);
                document.getElementById("mstep2").classList.add("done");
                document.getElementById("mstep2").innerHTML =
                    '<i class="ti ti-circle-check"></i> 체류 인증 완료!';
                document.getElementById("verify-cta").style.display = "block";
                showToast('✅ 방문 인증이 완료됐어요! 리뷰를 남겨보세요.');
                return;
            }
        } catch (e) {
            console.error(e);
        }

        if (attempts >= maxAttempts) {
            clearInterval(poll);
            showToast('인증 상태 확인에 실패했어요. 다시 시도해주세요.');
        }
    }, 5000);
}

// 💡 로그인하거나 홈 진입 시 PENDING 인증 있으면 백그라운드 폴링 시작
async function checkAndStartPolling() {
    if (!token) return;
    try {
        const r = await fetch(`${API}/verifications/current`, { headers: authHeader() });
        const d = await r.json();
        if (d.data && d.data.status === 'pending') {
            const remaining = d.data.remaining_seconds || 0;
            currentVerificationId = d.data.verification_id;
            if (remaining <= 0) {
                // 이미 시간 지났으면 바로 폴링
                pollVerificationStatus();
            } else {
                // 남은 시간 후에 폴링 시작
                setTimeout(() => {
                    pollVerificationStatus();
                }, remaining * 1000);
            }
        }
    } catch (e) {}
}

async function completeVerify() {
    closeVerify();
    goWrite();
}

function closeVerify(e) {
    if (e && e.target !== document.getElementById('verify-modal')) return;
    document.getElementById('verify-modal').style.display = 'none';
}

function openPendingReviewModal(reviews){

    const rv = reviews[0];

    if(confirm(
`아직 작성하지 않은 리뷰가 있습니다.

🍜 ${rv.restaurant_name}

리뷰를 작성하러 이동할까요?`

    )){

        goPendingReview(
            rv.verification_id,
            rv.restaurant_id
        );

    }

}

async function startNewVerification(){

    const pos = await getPosition();

    const enterResponse = await fetch(
        `${API}/verifications/enter`,
        {
            method:"POST",
            headers:{
                ...authHeader(),
                "Content-Type":"application/json"
            },
            body:JSON.stringify({

                restaurant_id:
                    currentRestaurant.id,

                latitude:
                    pos.coords.latitude,

                longitude:
                    pos.coords.longitude

            })
        }
    );

    const enterData =
        await enterResponse.json();

    if(!enterResponse.ok || !enterData.success){

        showToast(
            enterData.message ??
            "방문 인증을 시작할 수 없습니다."
        );

        return;

    }

    currentVerificationId =
        enterData.data.verification_id;

    document.getElementById(
        "verify-modal"
    ).style.display="flex";

    document.getElementById(
        "mstep2"
    ).classList.remove("done");

    document.getElementById(
        "mstep2"
    ).innerHTML =
        '<i class="ti ti-clock"></i> 체류 대기 중...';

    document.getElementById(
        "verify-cta"
    ).style.display="none";

    startVerificationTimer(
        enterData.data.required_stay_seconds
    );

}
