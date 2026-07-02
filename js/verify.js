// ── 방문 인증 ──────────────────────────────
async function openVerify() {
    if (!token) {
        showToast("로그인이 필요해요");
        return;
    }
    try {
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

        // 진행중인 인증 없음
        const pos = await getPosition();
        const enterResponse = await fetch(`${API}/verifications/enter`, {
            method: "POST",
            headers: { ...authHeader(), "Content-Type": "application/json" },
            body: JSON.stringify({
                restaurant_id: currentRestaurant.id,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude
            })
        });
        const enterData = await enterResponse.json();

        if (!enterResponse.ok || !enterData.success) {
            showToast(enterData.message ?? "방문 인증을 시작할 수 없습니다.");
            return;
        }

        currentVerificationId = enterData.data.verification_id;
        document.getElementById("verify-modal").style.display = "flex";
        document.getElementById("mstep2").classList.remove("done");
        document.getElementById("mstep2").innerHTML = '<i class="ti ti-clock"></i> 체류 대기 중...';
        document.getElementById("verify-cta").style.display = "none";
        startVerificationTimer(enterData.data.required_stay_seconds);

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
            document.getElementById("mstep2").classList.add("done");
            document.getElementById("mstep2").innerHTML = '<i class="ti ti-circle-check"></i> 체류 인증 완료!';
            document.getElementById("verify-cta").style.display = "block";
        }
    }, 1000);
}

async function completeVerify() {
    if (currentVerificationId) {
        try {
            const pos = await getPosition();
            await fetch(`${API}/verifications/${currentVerificationId}/verify`, {
                method: 'POST',
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
            });
        } catch (e) {}
    }
    closeVerify();
    goWrite();
}

function closeVerify(e) {
    if (e && e.target !== document.getElementById('verify-modal')) return;
    clearInterval(timerInterval);
    document.getElementById('verify-modal').style.display = 'none';
}