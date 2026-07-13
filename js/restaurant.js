// ==========================
// Supabase
// ==========================

const SUPABASE_URL =
    "https://whbavqoikolkdbuohjxv.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_LcZCnc_syjMEZS7k3j7-CQ_JopqZg3H";

const supabase =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ── 주변 라멘집 ───────────────────────────
async function loadNearbyRestaurants() {
    const list = document.getElementById('restaurant-list');
    // 💡 캐시 있으면 바로 꺼내서 사용
    if (nearbyRestaurantsCache) {
        renderRestaurantList(nearbyRestaurantsCache);
        return;
    }

    list.innerHTML = '<div class="loading">주변 라멘집을 불러오는 중...</div>';
    try {
        const pos = await getPosition();
        const { latitude, longitude } = pos.coords;
        const r = await fetch(
            `${API}/restaurants/nearby?latitude=${latitude}&longitude=${longitude}`,
            { headers: authHeader() }
        );
        const d = await r.json();
        const restaurants = d.data?.restaurants || [];
        if (restaurants.length === 0) {
            list.innerHTML = '<div class="empty">주변에 등록된 라멘집이 없어요 🍜</div>';
            return;
        }
        nearbyRestaurantsCache = restaurants;
        renderRestaurantList(restaurants);
    } catch (e) {
        list.innerHTML = '<div class="empty">위치 정보를 가져올 수 없어요.<br>브라우저 위치 권한을 허용해주세요.</div>';
    }
}

function renderRestaurantList(restaurants) {
    allSearchResults = restaurants;
    displayedCount = 0;
    renderNextPage();
}

function renderCardHtml(rest) {
    return `
    <div class="rest-card"
        onclick="openDetail(${JSON.stringify(rest).replace(/"/g, '&quot;')})">
      <div class="rest-icon">🍜</div>
      <div class="rest-info">
        <div class="rest-name">${rest.name}</div>
        <div class="rest-addr">${rest.address || ''}</div>
        <div class="rest-meta">
          <span class="rest-rating">
            <i class="ti ti-star-filled" style="font-size:12px"></i>
            ${rest.average_rating?.toFixed(1) || '-'}
          </span>
          <span class="rest-dist">리뷰 ${rest.review_count || 0}개</span>
          ${rest.distance_meters != null
        ? `<span class="rest-dist">${
            rest.distance_meters >= 1000
                ? (rest.distance_meters / 1000).toFixed(1) + "km"
                : rest.distance_meters + "m"
        }</span>`
        : ""}
        </div>
      </div>
      <i class="ti ti-chevron-right" style="color:var(--text3);font-size:18px"></i>
    </div>
  `;
}

function renderNextPage() {
    const list = document.getElementById("restaurant-list");
    if (allSearchResults.length === 0) {
        list.innerHTML = '<div class="empty">검색 결과가 없습니다.</div>';
        return;
    }
    const nextBatch = allSearchResults.slice(displayedCount, displayedCount + PAGE_SIZE);
    const cardsHtml = nextBatch.map(renderCardHtml).join("");
    if (displayedCount === 0) {
        list.innerHTML = cardsHtml;
    } else {
        const existingBtn = document.getElementById("load-more-btn");
        if (existingBtn) existingBtn.remove();
        list.insertAdjacentHTML("beforeend", cardsHtml);
    }
    displayedCount += nextBatch.length;
    if (displayedCount < allSearchResults.length) {
        list.insertAdjacentHTML("beforeend",
            `<button class="load-more-btn" id="load-more-btn" onclick="renderNextPage()">
        더보기 (${allSearchResults.length - displayedCount}개 더 있음)
      </button>`
        );
    }
}

async function searchRestaurants() {
    const keyword = document.getElementById("search-input").value.trim();
    if (keyword === "") {
        loadNearbyRestaurants();
        return;
    }
    try {
        const pos = await getPosition();
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        const response = await fetch(
            `${API}/restaurants/search?keyword=${encodeURIComponent(keyword)}&latitude=${latitude}&longitude=${longitude}`
        );
        const data = await response.json();
        renderRestaurantList(data.data?.restaurants || []);
    } catch (e) {
        console.error(e);
        showToast("검색에 실패했습니다.");
    }
}

async function openDetail(rest) {
    if (restaurantCache[rest.id]) {

        currentRestaurant = restaurantCache[rest.id];
        navigate("detail");
        renderRestaurantDetail();
        loadReviews(rest.id);
        return;
    }
    try {
        const r = await fetch(
    `${API}/restaurants/${rest.id}`,
    {
        headers: authHeader()
    }
);
        const d = await r.json();
        console.log(d.data);                                    // 하고 지우자
        console.log("isFavorite =", d.data.isFavorite);
        if (!r.ok || !d.success) {
            showToast("식당 정보를 불러오지 못했습니다.");
            return;
        }
        
        currentRestaurant = d.data;
        isFavorite =
        d.data.isFavorite;
        updateFavoriteButton();
        restaurantCache[currentRestaurant.id] = currentRestaurant;
        navigate("detail");
        renderRestaurantDetail();
        loadReviews(currentRestaurant.id);
    } catch (e) {
        console.error(e);
        showToast("식당 정보를 불러오지 못했습니다.");
    }
}

async function refreshCurrentRestaurantStats() {

    if (!currentRestaurant) return;

    const response =
        await fetch(`${API}/restaurants/${currentRestaurant.id}`);

    const data =
        await response.json();

    if (!response.ok || !data.success) return;

    currentRestaurant = data.data;

    document.getElementById("d-rating").textContent =
        currentRestaurant.average_rating.toFixed(1);

    document.getElementById("d-reviews").textContent =
        currentRestaurant.review_count;

    document.getElementById("d-revisit").textContent =
        Math.round(currentRestaurant.revisit_rate) + "%";
}

function renderRestaurantDetail(){

    document.getElementById("detail-name").textContent =
        currentRestaurant.name;

    document.getElementById("detail-addr").textContent =
        currentRestaurant.address || "";
    
    document.getElementById("d-rating").textContent = 
        currentRestaurant.average_rating.toFixed(1);
    
    document.getElementById("d-reviews").textContent = 
        currentRestaurant.review_count;
    
    document.getElementById("d-revisit").textContent = 
        Math.round(currentRestaurant.revisit_rate) + "%";

    const phoneRow = document.getElementById("detail-phone-row");
        if (currentRestaurant.phone) {
            document.getElementById("detail-phone-link").textContent = currentRestaurant.phone;
            document.getElementById("detail-phone-link").href = "tel:" + currentRestaurant.phone;
            phoneRow.style.display = "flex";
        } else {
            phoneRow.style.display = "none";
        }

    const lat = currentRestaurant.latitude;
        const lng = currentRestaurant.longitude;
        if (lat && lng) {
            const mapEl = document.getElementById("detail-map");
            mapEl.innerHTML = "";
            const targetRestaurantId = currentRestaurant.id;
            kakao.maps.load(function() {
                if (!currentRestaurant || currentRestaurant.id !== targetRestaurantId) return;
                const mapOption = { center: new kakao.maps.LatLng(lat, lng), level: 4 };
                const map = new kakao.maps.Map(mapEl, mapOption);
                const markerPosition = new kakao.maps.LatLng(lat, lng);
                const marker = new kakao.maps.Marker({ position: markerPosition });
                marker.setMap(map);
                setTimeout(() => { map.relayout(); map.setCenter(markerPosition); }, 300);
            });
            document.getElementById("detail-kakao-link").href =
                currentRestaurant.kakao_place_id
                    ? `https://place.map.kakao.com/${currentRestaurant.kakao_place_id}`
                    : `https://map.kakao.com/?q=${encodeURIComponent(currentRestaurant.name)}`;
            document.getElementById("detail-extra").style.display = "block";
        } else {
            document.getElementById("detail-extra").style.display = "none";
        }
    
}

