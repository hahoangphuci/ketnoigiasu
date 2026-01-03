const el = (id) => document.getElementById(id);
const show = (id) =>
  document
    .querySelectorAll("main > section")
    .forEach((s) =>
      s.id === id ? s.classList.remove("hidden") : s.classList.add("hidden")
    );

// Navigation
el("nav-home").onclick = () => show("home");
el("nav-search").onclick = () => {
  show("search");
  loadTutors();
};
el("nav-dashboard").onclick = async () => {
  show("dashboard");
  await refreshMe();
  await loadStats();
  await loadMyProfiles();
  await loadMySessions();
};
el("nav-auth").onclick = () => {
  // If logged in, show user menu dropdown
  if (window.currentUser) {
    toggleUserMenu();
  } else {
    show("auth");
  }
};

// User menu dropdown
function toggleUserMenu() {
  let menu = document.getElementById("user-menu");
  if (menu) {
    menu.remove();
    return;
  }
  menu = document.createElement("div");
  menu.id = "user-menu";
  menu.className = "user-menu";
  menu.innerHTML = `
    <div class="user-menu-header">
      <div class="user-menu-avatar">${window.currentUser.name
        .charAt(0)
        .toUpperCase()}</div>
      <div>
        <div class="user-menu-name">${window.currentUser.name}</div>
        <div class="user-menu-role">${
          window.currentUser.role === "tutor" ? "👨‍🏫 Gia sư" : "🎓 Học viên"
        }</div>
      </div>
    </div>
    <div class="user-menu-divider"></div>
    <button class="user-menu-item" onclick="show('dashboard');document.getElementById('user-menu').remove();refreshMe();loadStats();loadMyProfiles();loadMySessions();">
      <i class="fas fa-th-large"></i> Bảng điều khiển
    </button>
    <button class="user-menu-item" id="menu-logout">
      <i class="fas fa-sign-out-alt"></i> Đăng xuất
    </button>
  `;
  document.body.appendChild(menu);

  // Position menu below nav-auth button
  const btn = el("nav-auth");
  const rect = btn.getBoundingClientRect();
  menu.style.top = rect.bottom + 8 + "px";
  menu.style.right = window.innerWidth - rect.right + "px";

  // Logout handler
  document.getElementById("menu-logout").onclick = async () => {
    await api("/api/auth/logout", { method: "POST" });
    window.currentUser = null;
    menu.remove();
    show("home");
    el("user-info").innerHTML = "";
    el("stats-area").innerHTML = "";
    el("my-profiles").innerHTML = "";
    el("nav-auth").innerHTML = '<i class="fas fa-user"></i> Đăng nhập';
    // Show auth buttons again
    document
      .querySelectorAll(".auth-only-btn")
      .forEach((el) => (el.style.display = ""));
    // Show tutor panel
    const tutorPanel = document.querySelector(".tutor-only-panel");
    if (tutorPanel) tutorPanel.style.display = "";
  };

  // Close when click outside
  setTimeout(() => {
    document.addEventListener("click", function closeMenu(e) {
      if (
        !menu.contains(e.target) &&
        e.target !== btn &&
        !btn.contains(e.target)
      ) {
        menu.remove();
        document.removeEventListener("click", closeMenu);
      }
    });
  }, 10);
}

let currentProfileToBook = null; // {tutorId, profileId, subject, tutorName, price}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...opts,
  });
  if (!res.ok) throw new Error((await res.json()).message || "Error");
  return res.json();
}

// Validation
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateForm(fields) {
  for (const [name, value] of Object.entries(fields)) {
    if (!value || (typeof value === "string" && !value.trim())) {
      return `Vui lòng nhập ${name}`;
    }
  }
  return null;
}

// Auth
el("btn-register").onclick = async () => {
  const name = el("r-name").value.trim();
  const email = el("r-email").value.trim();
  const password = el("r-password").value;
  const role = el("r-role").value;

  const error = validateForm({
    "họ tên": name,
    email: email,
    "mật khẩu": password,
  });
  if (error) {
    el(
      "register-status"
    ).innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> ${error}`;
    return;
  }
  if (!validateEmail(email)) {
    el(
      "register-status"
    ).innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> Email không hợp lệ`;
    return;
  }
  if (password.length < 6) {
    el(
      "register-status"
    ).innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> Mật khẩu tối thiểu 6 ký tự`;
    return;
  }

  try {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role }),
    });
    el(
      "register-status"
    ).innerHTML = `<i class="fas fa-check-circle" style="color:#10b981"></i> Đăng ký thành công!`;
    // Clear forms
    el("r-name").value = "";
    el("r-email").value = "";
    el("r-password").value = "";
    el("l-email").value = "";
    el("l-password").value = "";
    // Redirect immediately
    show("dashboard");
    await refreshMe();
    await loadStats();
    await loadMyProfiles();
    await loadMySessions();
  } catch (e) {
    el(
      "register-status"
    ).innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> ${e.message}`;
  }
};

el("btn-login").onclick = async () => {
  const email = el("l-email").value.trim();
  const password = el("l-password").value;

  if (!email || !password) {
    el(
      "login-status"
    ).innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> Vui lòng nhập email và mật khẩu`;
    return;
  }

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    el(
      "login-status"
    ).innerHTML = `<i class="fas fa-check-circle" style="color:#10b981"></i> Đăng nhập thành công!`;
    // Clear forms
    el("r-name").value = "";
    el("r-email").value = "";
    el("r-password").value = "";
    el("l-email").value = "";
    el("l-password").value = "";
    // Redirect immediately
    show("dashboard");
    await refreshMe();
    await loadStats();
    await loadMyProfiles();
    await loadMySessions();
  } catch (e) {
    el(
      "login-status"
    ).innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> ${e.message}`;
  }
};

async function refreshMe() {
  console.log("refreshMe called");
  try {
    const me = await api("/api/auth/me");
    console.log("Got user:", me);
    window.currentUser = me;
    const roleLabel = me.role === "tutor" ? "👨‍🏫 Gia sư" : "🎓 Học viên";
    const userInfoEl = el("user-info");
    if (!userInfoEl) {
      console.error("user-info element not found");
      return;
    }
    userInfoEl.innerHTML = `
      <div class="user-card">
        <div class="user-avatar">${me.name.charAt(0).toUpperCase()}</div>
        <div style="flex:1">
          <h4 style="margin:0;color:#fff;font-size:20px">${me.name}</h4>
          <p style="margin:4px 0;color:#94a3b8">${me.email}</p>
          <span class="badge paid">${roleLabel}</span>
        </div>
        <button class="btn ghost" id="btn-logout"><i class="fas fa-sign-out-alt"></i> Đăng xuất</button>
      </div>`;
    document.getElementById("btn-logout").onclick = async () => {
      await api("/api/auth/logout", { method: "POST" });
      window.currentUser = null;
      show("home");
      el("user-info").innerHTML = "";
      el("stats-area").innerHTML = "";
      el("my-profiles").innerHTML = "";
      el("nav-auth").innerHTML = '<i class="fas fa-user"></i> Đăng nhập';
      // Show tutor panel again for next login
      const tutorPanel = document.querySelector(".tutor-only-panel");
      if (tutorPanel) tutorPanel.style.display = "";
      // Show auth buttons again
      document
        .querySelectorAll(".auth-only-btn")
        .forEach((el) => (el.style.display = ""));
    };
    el("nav-auth").innerHTML = `<i class="fas fa-user-check"></i> ${me.name}`;

    // Hide auth buttons when logged in
    document
      .querySelectorAll(".auth-only-btn")
      .forEach((el) => (el.style.display = "none"));

    // Show/hide tutor panel based on role
    const tutorPanel = document.querySelector(".tutor-only-panel");
    if (tutorPanel) {
      if (me.role === "tutor") {
        tutorPanel.style.display = "";
      } else {
        tutorPanel.style.display = "none";
      }
    }
  } catch (e) {
    console.log("refreshMe error:", e.message);
    window.currentUser = null;
    const userInfoEl = el("user-info");
    if (userInfoEl)
      userInfoEl.innerHTML =
        '<div class="muted"><i class="fas fa-info-circle"></i> Chưa đăng nhập. Hãy đăng nhập để sử dụng đầy đủ tính năng.</div>';
    el("nav-auth").innerHTML = '<i class="fas fa-user"></i> Đăng nhập';
    const statsArea = el("stats-area");
    if (statsArea) statsArea.innerHTML = "";
    const myProfiles = el("my-profiles");
    if (myProfiles) myProfiles.innerHTML = "";
    // Show tutor panel for potential future login
    const tutorPanel = document.querySelector(".tutor-only-panel");
    if (tutorPanel) tutorPanel.style.display = "";
    // Show auth buttons when not logged in
    document
      .querySelectorAll(".auth-only-btn")
      .forEach((el) => (el.style.display = ""));
  }
}

// Stats
async function loadStats() {
  const area = el("stats-area");

  // Don't load stats if not logged in
  if (!window.currentUser) {
    area.innerHTML = "";
    return;
  }

  try {
    const stats = await api("/api/stats");
    if (stats.role === "student") {
      area.innerHTML = `
        <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-value">${stats.totalSessions}</div><div class="stat-label">Buổi học</div></div>
        <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${stats.completed}</div><div class="stat-label">Hoàn thành</div></div>
        <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-value">${stats.totalSpent}k</div><div class="stat-label">Đã chi</div></div>
      `;
    } else {
      area.innerHTML = `
        <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-value">${stats.totalSessions}</div><div class="stat-label">Buổi dạy</div></div>
        <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${stats.completed}</div><div class="stat-label">Hoàn thành</div></div>
        <div class="stat-card"><div class="stat-icon">💵</div><div class="stat-value">${stats.totalEarned}k</div><div class="stat-label">Thu nhập</div></div>
        <div class="stat-card"><div class="stat-icon">⭐</div><div class="stat-value">${stats.avgRating}</div><div class="stat-label">${stats.totalReviews} đánh giá</div></div>
      `;
    }
  } catch {
    area.innerHTML = "";
  }
}

// My Profiles (for tutors)
async function loadMyProfiles() {
  const area = el("my-profiles");
  try {
    const profiles = await api("/api/tutors/my/profiles");
    if (profiles.length === 0) {
      area.innerHTML =
        '<div class="muted" style="margin-bottom:12px"><i class="fas fa-info-circle"></i> Bạn chưa có hồ sơ nào. Tạo hồ sơ để học viên có thể tìm thấy bạn.</div>';
      return;
    }
    area.innerHTML = profiles
      .map(
        (p) => `
      <div class="profile-card">
        <div>
          <h4><i class="fas fa-book"></i> ${p.subject}</h4>
          <p>${p.pricePerHour}k/giờ • ⭐ ${p.rating} (${p.ratingCount} đánh giá)</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn ghost btn-view-detail" data-id="${p.id}" title="Xem chi tiết"><i class="fas fa-eye"></i></button>
          <button class="btn ghost btn-delete-profile" data-id="${p.id}" data-subject="${p.subject}" title="Xóa hồ sơ" style="color:#ef4444"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `
      )
      .join("");
    area.querySelectorAll(".btn-view-detail").forEach((btn) => {
      btn.onclick = () => openTutorDetail(btn.dataset.id);
    });
    // Xử lý xóa hồ sơ
    area.querySelectorAll(".btn-delete-profile").forEach((btn) => {
      btn.onclick = async () => {
        const profileId = btn.dataset.id;
        const subject = btn.dataset.subject;
        if (
          !confirm(
            `Bạn có chắc muốn xóa hồ sơ môn "${subject}"?\n\nLưu ý: Không thể xóa nếu còn buổi học chưa hoàn thành.`
          )
        )
          return;
        try {
          await api(`/api/tutors/${profileId}`, { method: "DELETE" });
          alert("Đã xóa hồ sơ thành công!");
          await loadMyProfiles();
        } catch (e) {
          alert(`Lỗi: ${e.message}`);
        }
      };
    });
  } catch {
    area.innerHTML = "";
  }
}

// Tutor profile
el("btn-create-profile").onclick = async () => {
  const subject = el("p-subject").value.trim();
  const price = Number(el("p-price").value);

  // Get selected time slots from checkboxes
  const times = [];
  if (document.getElementById("p-time-morning")?.checked) times.push("morning");
  if (document.getElementById("p-time-afternoon")?.checked)
    times.push("afternoon");
  if (document.getElementById("p-time-evening")?.checked) times.push("evening");
  if (document.getElementById("p-time-weekend")?.checked) times.push("weekend");

  const bio = el("p-bio").value.trim();
  const location = el("p-location").value.trim();

  if (!subject) {
    el(
      "profile-status"
    ).innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> Vui lòng nhập môn dạy`;
    return;
  }
  if (!price || price < 10) {
    el(
      "profile-status"
    ).innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> Giá tối thiểu 10k/giờ`;
    return;
  }
  if (!location) {
    el(
      "profile-status"
    ).innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> Vui lòng nhập vị trí dạy`;
    return;
  }
  if (times.length === 0) {
    el(
      "profile-status"
    ).innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> Vui lòng chọn ít nhất 1 khung giờ dạy`;
    return;
  }

  try {
    const p = await api("/api/tutors", {
      method: "POST",
      body: JSON.stringify({
        subject,
        pricePerHour: price,
        availableTimes: times,
        bio,
        location,
      }),
    });
    el(
      "profile-status"
    ).innerHTML = `<i class="fas fa-check-circle" style="color:#10b981"></i> Đã tạo hồ sơ môn <strong>${p.subject}</strong> - ${p.pricePerHour}k/giờ`;
    // Reset form
    el("p-subject").value = "";
    el("p-price").value = "";
    el("p-bio").value = "";
    el("p-location").value = "";
    document.getElementById("p-time-morning").checked = false;
    document.getElementById("p-time-afternoon").checked = false;
    document.getElementById("p-time-evening").checked = false;
    document.getElementById("p-time-weekend").checked = false;
    await loadMyProfiles();
  } catch (e) {
    el(
      "profile-status"
    ).innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> ${e.message}`;
  }
};

// Search tutors
let currentPage = 1;

async function loadTutors(page = 1) {
  currentPage = page;
  const subject = el("f-subject") ? el("f-subject").value : "";
  const minPrice = el("f-min") ? el("f-min").value : "";
  const maxPrice = el("f-max") ? el("f-max").value : "";
  const time = el("f-time") ? el("f-time").value : "";
  const ratingMin = el("f-rating") ? el("f-rating").value : "";
  const location = el("f-location") ? el("f-location").value : "";
  const q = new URLSearchParams({
    subject,
    minPrice,
    maxPrice,
    time,
    ratingMin,
    location,
    page,
    limit: 6,
  });
  try {
    console.log("Loading tutors from:", "/api/tutors?" + q.toString());
    const data = await api("/api/tutors?" + q.toString());
    console.log("Loaded tutors:", data);
    const results = el("results");
    if (!results) {
      console.error("Results element not found");
      return;
    }

    const tutors = data.tutors || [];
    const pagination = data.pagination || {};

    // Sort by rating
    tutors.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    if (tutors.length === 0) {
      results.innerHTML =
        '<div class="muted"><i class="fas fa-search"></i> Không tìm thấy gia sư nào. Thử thay đổi bộ lọc.</div>';
      return;
    }

    // Show search results banner
    results.innerHTML = `
      <div class="search-banner">
        <div class="search-icon"><i class="fas fa-search"></i></div>
        <div class="search-text">
          <h4>Kết quả tìm kiếm</h4>
          <p>Tìm thấy <strong>${pagination.total} gia sư</strong> phù hợp. Hiển thị trang ${pagination.currentPage}/${pagination.totalPages}.</p>
        </div>
      </div>
    `;

    tutors.forEach((t) => {
      const stars = "⭐".repeat(Math.round(t.rating || 0));
      const div = document.createElement("div");
      div.className = "tutor";
      div.innerHTML = `
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <div class="tutor-list-avatar">${(t.tutorName || "G")
              .charAt(0)
              .toUpperCase()}</div>
            <div>
              <h4 style="margin:0"><i class="fas fa-user-tie"></i> ${
                t.tutorName || "Gia sư"
              }</h4>
              <span style="color:#a5b4fc;font-size:14px"><i class="fas fa-book"></i> ${
                t.subject
              }</span>
            </div>
          </div>
          <p style="color:#94a3b8;margin:8px 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${
            t.bio || "Chưa có giới thiệu"
          }</p>
          <div class="tutor-meta">
            <span><i class="fas fa-map-marker-alt"></i> ${
              t.location || "Chưa cập nhật"
            }</span>
            <span><i class="fas fa-money-bill-wave"></i> <strong>${
              t.pricePerHour
            }k</strong>/giờ</span>
            <span><i class="fas fa-clock"></i> ${formatTimes(
              t.availableTimes
            )}</span>
            <span class="stars">${stars || "☆"} (${t.ratingCount || 0})</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn ghost btn-detail"><i class="fas fa-info-circle"></i> Chi tiết</button>
          <button class="btn primary btn-book"><i class="fas fa-calendar-plus"></i> Đặt lịch</button>
        </div>`;
      div.querySelector(".btn-book").onclick = () => {
        currentProfileToBook = {
          tutorId: t.tutorId,
          profileId: t.id,
          subject: t.subject,
          price: t.pricePerHour,
          availableTimes: t.availableTimes || [],
          tutorName: t.tutorName || "Gia sư",
        };
        openBookingModal();
      };
      div.querySelector(".btn-detail").onclick = () => openTutorDetail(t.id);
      results.appendChild(div);
    });

    // Add pagination
    if (pagination.totalPages > 1) {
      const paginationDiv = document.createElement("div");
      paginationDiv.className = "pagination";
      let paginationHtml = "";

      // Previous button
      if (pagination.hasPrev) {
        paginationHtml += `<button class="page-btn" onclick="loadTutors(${
          pagination.currentPage - 1
        })"><i class="fas fa-chevron-left"></i></button>`;
      }

      // Page numbers
      for (let i = 1; i <= pagination.totalPages; i++) {
        if (i === pagination.currentPage) {
          paginationHtml += `<button class="page-btn active">${i}</button>`;
        } else if (
          i === 1 ||
          i === pagination.totalPages ||
          (i >= pagination.currentPage - 1 && i <= pagination.currentPage + 1)
        ) {
          paginationHtml += `<button class="page-btn" onclick="loadTutors(${i})">${i}</button>`;
        } else if (
          i === pagination.currentPage - 2 ||
          i === pagination.currentPage + 2
        ) {
          paginationHtml += `<span class="page-dots">...</span>`;
        }
      }

      // Next button
      if (pagination.hasNext) {
        paginationHtml += `<button class="page-btn" onclick="loadTutors(${
          pagination.currentPage + 1
        })"><i class="fas fa-chevron-right"></i></button>`;
      }

      paginationDiv.innerHTML = paginationHtml;
      results.appendChild(paginationDiv);
    }
  } catch (e) {
    el(
      "results"
    ).innerHTML = `<div class='muted'><i class="fas fa-exclamation-triangle"></i> ${e.message}</div>`;
  }
}

function formatTimes(times) {
  if (!times || times.length === 0) return "Linh hoạt";
  const map = {
    morning: "Sáng",
    afternoon: "Chiều",
    evening: "Tối",
    weekend: "Cuối tuần",
  };
  return times.map((t) => map[t] || t).join(", ");
}

el("btn-search").onclick = () => loadTutors(1);

// Store tutor data for booking from detail modal
let detailTutorData = null;

function bookFromDetail() {
  if (!detailTutorData) return;
  currentProfileToBook = {
    tutorId: detailTutorData.tutorId,
    profileId: detailTutorData.id,
    subject: detailTutorData.subject,
    price: detailTutorData.pricePerHour,
    availableTimes: detailTutorData.availableTimes || [],
    tutorName: detailTutorData.tutorName || "Gia sư",
  };
  document.getElementById("detail-modal").classList.add("hidden");
  openBookingModal();
}

// Tutor Detail Modal
async function openTutorDetail(profileId) {
  try {
    const data = await api(`/api/tutors/${profileId}/detail`);
    detailTutorData = data; // Store for booking
    const stars = "⭐".repeat(Math.round(data.rating || 0));
    const reviewsHtml =
      data.reviews.length > 0
        ? data.reviews
            .map(
              (r) => `
        <div class="review-card">
          <div class="review-header">
            <span class="review-author">${r.studentName}</span>
            <span class="review-date">${new Date(
              r.createdAt
            ).toLocaleDateString("vi-VN")}</span>
          </div>
          <div class="review-stars">${"⭐".repeat(r.rating)}</div>
          <div class="review-text">${r.comment}</div>
        </div>
      `
            )
            .join("")
        : '<div class="muted"><i class="fas fa-comment-slash"></i> Chưa có đánh giá nào</div>';

    el("tutor-detail-content").innerHTML = `
      <div class="tutor-detail-header">
        <div class="tutor-detail-avatar">${(data.tutorName || "T")
          .charAt(0)
          .toUpperCase()}</div>
        <div class="tutor-detail-name">${data.tutorName || "Gia sư"}</div>
        <div class="tutor-detail-subject"><i class="fas fa-book"></i> ${
          data.subject
        }</div>
        <div class="tutor-detail-rating">${stars} ${data.rating || 0} (${
      data.ratingCount || 0
    } đánh giá)</div>
      </div>
      <div class="tutor-detail-bio">${data.bio || "Chưa có giới thiệu"}</div>
      <div class="tutor-detail-info">
        <div><span>📍 Vị trí</span><strong>${
          data.location || "Chưa cập nhật"
        }</strong></div>
        <div><span>💵 Giá/giờ</span><strong>${data.pricePerHour}k</strong></div>
        <div><span>⏰ Thời gian</span><strong>${formatTimes(
          data.availableTimes
        )}</strong></div>
      </div>
      <h4 style="color:#a5b4fc;margin-bottom:12px"><i class="fas fa-comments"></i> Đánh giá từ học viên</h4>
      <div style="max-height:250px;overflow-y:auto">${reviewsHtml}</div>
      <button class="btn primary" style="width:100%;margin-top:16px" onclick="bookFromDetail()">
        <i class="fas fa-calendar-plus"></i> Đặt lịch ngay
      </button>
    `;
    document.getElementById("detail-modal").classList.remove("hidden");
    document.body.classList.add("modal-open");
  } catch (e) {
    alert(e.message);
  }
}

el("detail-close").onclick = () => {
  document.getElementById("detail-modal").classList.add("hidden");
  document.body.classList.remove("modal-open");
};

// Time slot configuration
const TIME_SLOTS = {
  morning: {
    label: "Buổi sáng",
    slots: ["07:00", "08:00", "09:00", "10:00", "11:00"],
  },
  afternoon: {
    label: "Buổi chiều",
    slots: ["13:00", "14:00", "15:00", "16:00", "17:00"],
  },
  evening: { label: "Buổi tối", slots: ["18:00", "19:00", "20:00", "21:00"] },
  weekend: { label: "Cuối tuần", slots: [] }, // Weekend allows all slots
};

function getAvailableTimeSlots(availableTimes, selectedDate) {
  const date = new Date(selectedDate);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let slots = [];

  // If weekend and tutor allows weekend
  if (isWeekend && availableTimes.includes("weekend")) {
    // Add all time slots for weekend
    slots = [
      ...TIME_SLOTS.morning.slots,
      ...TIME_SLOTS.afternoon.slots,
      ...TIME_SLOTS.evening.slots,
    ];
  } else if (!isWeekend) {
    // Weekday - only show allowed time periods
    if (availableTimes.includes("morning")) {
      slots = [...slots, ...TIME_SLOTS.morning.slots];
    }
    if (availableTimes.includes("afternoon")) {
      slots = [...slots, ...TIME_SLOTS.afternoon.slots];
    }
    if (availableTimes.includes("evening")) {
      slots = [...slots, ...TIME_SLOTS.evening.slots];
    }
  }

  return slots;
}

function updateTimeSlots() {
  const dateInput = el("m-date");
  const timeSelect = el("m-time");
  const selectedDate = dateInput.value;

  if (!selectedDate || !currentProfileToBook) {
    timeSelect.innerHTML = '<option value="">-- Chọn ngày trước --</option>';
    return;
  }

  const availableTimes = currentProfileToBook.availableTimes || [];
  const date = new Date(selectedDate);
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Check if tutor is available on this day
  const hasWeekendSlot = availableTimes.includes("weekend");
  const hasWeekdaySlot = availableTimes.some((t) =>
    ["morning", "afternoon", "evening"].includes(t)
  );

  if (isWeekend && !hasWeekendSlot) {
    timeSelect.innerHTML =
      '<option value="">⚠️ Gia sư không dạy cuối tuần</option>';
    return;
  }

  if (!isWeekend && !hasWeekdaySlot) {
    timeSelect.innerHTML =
      '<option value="">⚠️ Gia sư chỉ dạy cuối tuần</option>';
    return;
  }

  const slots = getAvailableTimeSlots(availableTimes, selectedDate);

  if (slots.length === 0) {
    timeSelect.innerHTML = '<option value="">⚠️ Không có giờ khả dụng</option>';
    return;
  }

  // Group slots by period for better UX
  let html = '<option value="">-- Chọn giờ --</option>';

  if (isWeekend && hasWeekendSlot) {
    // For weekend, group by time periods
    const morningSlots = TIME_SLOTS.morning.slots;
    const afternoonSlots = TIME_SLOTS.afternoon.slots;
    const eveningSlots = TIME_SLOTS.evening.slots;

    html += `<optgroup label="🌅 Buổi sáng">`;
    morningSlots.forEach((s) => (html += `<option value="${s}">${s}</option>`));
    html += `</optgroup>`;

    html += `<optgroup label="☀️ Buổi chiều">`;
    afternoonSlots.forEach(
      (s) => (html += `<option value="${s}">${s}</option>`)
    );
    html += `</optgroup>`;

    html += `<optgroup label="🌙 Buổi tối">`;
    eveningSlots.forEach((s) => (html += `<option value="${s}">${s}</option>`));
    html += `</optgroup>`;
  } else {
    // For weekday, show only available periods
    if (availableTimes.includes("morning")) {
      html += `<optgroup label="🌅 Buổi sáng (7h-12h)">`;
      TIME_SLOTS.morning.slots.forEach(
        (s) => (html += `<option value="${s}">${s}</option>`)
      );
      html += `</optgroup>`;
    }
    if (availableTimes.includes("afternoon")) {
      html += `<optgroup label="☀️ Buổi chiều (13h-17h)">`;
      TIME_SLOTS.afternoon.slots.forEach(
        (s) => (html += `<option value="${s}">${s}</option>`)
      );
      html += `</optgroup>`;
    }
    if (availableTimes.includes("evening")) {
      html += `<optgroup label="🌙 Buổi tối (18h-21h)">`;
      TIME_SLOTS.evening.slots.forEach(
        (s) => (html += `<option value="${s}">${s}</option>`)
      );
      html += `</optgroup>`;
    }
  }

  timeSelect.innerHTML = html;
}

// Booking Modal
function openBookingModal() {
  if (!currentProfileToBook) return;

  const availableTimesText = formatTimes(currentProfileToBook.availableTimes);

  el("modal-tutor-info").innerHTML = `
    <div style="background:rgba(102,126,234,0.1);padding:12px;border-radius:10px;margin-bottom:16px">
      <p style="margin:0;color:#fff;font-size:16px"><i class="fas fa-user-tie"></i> <strong>${currentProfileToBook.tutorName}</strong></p>
      <p style="margin:4px 0;color:#a5b4fc"><i class="fas fa-book"></i> ${currentProfileToBook.subject}</p>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:14px"><i class="fas fa-money-bill"></i> ${currentProfileToBook.price}k/giờ</p>
      <p style="margin:8px 0 0;color:#10b981;font-size:13px"><i class="fas fa-clock"></i> Khung giờ: <strong>${availableTimesText}</strong></p>
    </div>
  `;

  // Reset form
  el("m-date").value = "";
  el("m-time").innerHTML = '<option value="">-- Chọn ngày trước --</option>';
  el("m-duration").value = "1";
  el("m-status").innerHTML = "";

  // Set min date to today
  const today = new Date().toISOString().split("T")[0];
  el("m-date").min = today;

  // Add date change listener
  el("m-date").onchange = updateTimeSlots;

  document.getElementById("modal").classList.remove("hidden");
  document.body.classList.add("modal-open");
}
function closeModal() {
  document.getElementById("modal").classList.add("hidden");
  document.body.classList.remove("modal-open");
  el("m-status").innerHTML = "";
  // Reset payment form
  el("payment-form").classList.add("hidden");
  el("m-book").style.display = "block";
  // Reset to momo method (default)
  document
    .querySelectorAll(".method-btn")
    .forEach((m) => m.classList.remove("selected"));
  document
    .querySelector('.method-btn[data-method="momo"]')
    ?.classList.add("selected");
}

el("m-book").onclick = async () => {
  if (!currentProfileToBook) return;
  const date = el("m-date").value;
  const time = el("m-time").value;
  const duration = Number(el("m-duration").value);

  if (!date) {
    el(
      "m-status"
    ).innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> Vui lòng chọn ngày học`;
    return;
  }
  if (!time) {
    el(
      "m-status"
    ).innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> Vui lòng chọn giờ bắt đầu`;
    return;
  }
  if (!duration || duration < 1) {
    el(
      "m-status"
    ).innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> Số giờ tối thiểu là 1`;
    return;
  }
  if (duration > 4) {
    el(
      "m-status"
    ).innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> Số giờ tối đa là 4`;
    return;
  }

  // Combine date and time
  const dateTime = `${date}T${time}`;

  // Calculate price and show payment form
  const pricePerHour = currentProfileToBook.pricePerHour || 100;
  const subtotal = pricePerHour * duration;
  const fee = Math.round(subtotal * 0.05);
  const total = subtotal + fee;

  // Store booking info for payment
  window.pendingBooking = {
    tutorId: currentProfileToBook.tutorId,
    profileId: currentProfileToBook.profileId,
    dateTime,
    duration,
    subtotal,
    fee,
    total,
  };

  // Show payment form
  el("pay-subtotal").textContent = `${subtotal}k`;
  el("pay-fee").textContent = `${fee}k`;
  el("pay-total").textContent = `${total}k`;
  el("payment-form").classList.remove("hidden");
  el("m-status").innerHTML = "";

  // Generate order code for bank transfer
  const orderCode = "GS_" + Date.now().toString(36).toUpperCase();
  document.getElementById("bank-content").textContent = orderCode;

  // Hide booking button
  el("m-book").style.display = "none";

  // Update QR code with payment info
  const qrData = `KetNoiGiaSu_${orderCode}_${total}000`;
  const qrImg = document.getElementById("qr-image");
  if (qrImg) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
      qrData
    )}`;
  }

  // Setup payment method switching
  setupPaymentMethods();
};

// Setup payment method switching
function setupPaymentMethods() {
  const methods = document.querySelectorAll(".method-btn");
  methods.forEach((m) => {
    m.onclick = () => {
      methods.forEach((x) => x.classList.remove("selected"));
      m.classList.add("selected");
      m.querySelector("input").checked = true;

      // Update QR based on method
      const method = m.dataset.method;
      const qrImg = document.getElementById("qr-image");
      const orderCode = document.getElementById("bank-content").textContent;
      const total = document
        .getElementById("pay-total")
        .textContent.replace("k", "");

      let qrData = `KetNoiGiaSu_${orderCode}_${total}000`;
      if (method === "momo") {
        qrData = `momo://transfer?phone=0123456789&amount=${total}000&note=${orderCode}`;
      } else if (method === "zalopay") {
        qrData = `zalopay://transfer?phone=0123456789&amount=${total}000&note=${orderCode}`;
      } else if (method === "vnpay") {
        qrData = `vnpay://pay?amount=${total}000&note=${orderCode}`;
      } else if (method === "bank") {
        qrData = `vietcombank://transfer?acc=1234567890&amount=${total}000&note=${orderCode}`;
      }

      if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
          qrData
        )}`;
      }
    };
  });
}

// Handle payment
el("btn-pay").onclick = async () => {
  const payMethod =
    document.querySelector('input[name="pay-method"]:checked')?.value || "momo";

  const methodNames = {
    momo: "MoMo",
    zalopay: "ZaloPay",
    vnpay: "VNPay",
    bank: "chuyển khoản ngân hàng",
  };

  try {
    el(
      "m-status"
    ).innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang xác nhận thanh toán qua ${methodNames[payMethod]}...`;
    await new Promise((r) => setTimeout(r, 800));

    el(
      "m-status"
    ).innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang tạo buổi học...`;
    const s = await api("/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        tutorId: window.pendingBooking.tutorId,
        profileId: window.pendingBooking.profileId,
        dateTime: window.pendingBooking.dateTime,
        duration: window.pendingBooking.duration,
      }),
    });

    el(
      "m-status"
    ).innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang xử lý thanh toán...`;
    await new Promise((r) => setTimeout(r, 1000));

    const pay = await api("/api/payments/mock", {
      method: "POST",
      body: JSON.stringify({ sessionId: s.id }),
    });

    el("m-status").innerHTML = `
      <div style="text-align:center">
        <i class="fas fa-check-circle" style="color:#10b981;font-size:48px"></i>
        <h3 style="color:#10b981;margin:16px 0 8px">Thanh toán thành công!</h3>
        <p style="color:#94a3b8">Tổng: <strong style="color:#a5b4fc">${window.pendingBooking.total}k</strong></p>
        <p style="color:#64748b;font-size:14px;margin-top:8px">Vào Bảng điều khiển để xem buổi học</p>
      </div>
    `;
    el("payment-form").classList.add("hidden");
  } catch (e) {
    el(
      "m-status"
    ).innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444"></i> ${e.message}`;
  }
};

// Cancel payment
el("btn-cancel-pay").onclick = () => {
  el("payment-form").classList.add("hidden");
  el("m-book").style.display = "block";
  el("m-status").innerHTML = "";
  // Reset to momo method (default)
  document
    .querySelectorAll(".method-btn")
    .forEach((m) => m.classList.remove("selected"));
  document
    .querySelector('.method-btn[data-method="momo"]')
    ?.classList.add("selected");
};

// Sessions
async function loadMySessions() {
  const area = el("my-sessions");

  // Don't load sessions if not logged in
  if (!window.currentUser) {
    area.innerHTML =
      '<div class="muted"><i class="fas fa-info-circle"></i> Đăng nhập để xem buổi học của bạn.</div>';
    return;
  }

  try {
    const sessions = await api("/api/sessions/mine/detailed");
    if (sessions.length === 0) {
      area.innerHTML =
        '<div class="muted"><i class="fas fa-calendar"></i> Chưa có buổi học nào.</div>';
      return;
    }
    area.innerHTML = "";
    sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    sessions.forEach((s) => {
      const statusClass = s.completed
        ? "completed"
        : s.paid
        ? "paid"
        : "pending";
      const statusText = s.completed
        ? "Hoàn thành"
        : s.paid
        ? "Đã thanh toán"
        : "Chờ xử lý";
      const isTutor = window.currentUser && s.tutorId === window.currentUser.id;
      const otherName = isTutor ? s.studentName : s.tutorName;

      // Calculate start and end time
      const startTime = new Date(s.dateTime);
      const endTime = new Date(
        startTime.getTime() + s.duration * 60 * 60 * 1000
      );
      const formatTime = (d) =>
        d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const formatDate = (d) =>
        d.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

      const div = document.createElement("div");
      div.className = "tutor";
      div.innerHTML = `
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;flex-wrap:wrap">
            <span class="badge ${statusClass}">${statusText}</span>
            <span style="color:#a5b4fc;font-size:14px"><i class="fas fa-book"></i> ${
              s.subject
            }</span>
          </div>
          <p style="margin:0;color:#fff"><i class="fas fa-user"></i> ${
            isTutor ? "Học viên" : "Gia sư"
          }: <strong>${otherName}</strong></p>
          <p style="margin:4px 0;color:#94a3b8"><i class="fas fa-calendar"></i> ${formatDate(
            startTime
          )}</p>
          <p style="margin:4px 0;color:#10b981;font-weight:600"><i class="fas fa-clock"></i> ${formatTime(
            startTime
          )} → ${formatTime(endTime)} (${s.duration} giờ)</p>
          <p style="margin:0;color:#94a3b8"><i class="fas fa-money-bill"></i> ${
            s.price
          }k</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"></div>`;
      const btns = div.querySelector("div:last-child");
      if (s.paid && !s.completed && isTutor) {
        const btn = document.createElement("button");
        btn.className = "btn success";
        btn.innerHTML = '<i class="fas fa-check"></i> Hoàn thành';
        btn.onclick = async () => {
          try {
            await api(`/api/sessions/${s.id}/complete`, { method: "POST" });
            await loadMySessions();
            await loadStats();
          } catch (e) {
            alert(e.message);
          }
        };
        btns.appendChild(btn);
      }
      if (s.completed && !isTutor) {
        const btn2 = document.createElement("button");
        btn2.className = "btn ghost";
        btn2.innerHTML = '<i class="fas fa-star"></i> Đánh giá';
        btn2.onclick = async () => {
          const rating = Number(prompt("Đánh giá (1-5 sao):", "5"));
          if (!rating || rating < 1 || rating > 5) {
            alert("Vui lòng nhập số từ 1-5");
            return;
          }
          const comment = prompt("Nhận xét của bạn:", "Rất hài lòng!");
          if (comment === null) return;
          try {
            await api("/api/reviews", {
              method: "POST",
              body: JSON.stringify({ sessionId: s.id, rating, comment }),
            });
            alert("Cảm ơn bạn đã đánh giá!");
            btn2.disabled = true;
            btn2.innerHTML = '<i class="fas fa-check"></i> Đã đánh giá';
          } catch (e) {
            alert(e.message);
          }
        };
        btns.appendChild(btn2);
      }
      area.appendChild(div);
    });
  } catch (e) {
    el(
      "my-sessions"
    ).innerHTML = `<div class='muted'><i class="fas fa-exclamation-triangle"></i> ${e.message}</div>`;
  }
}

// Click outside modal to close
document.getElementById("modal").onclick = (e) => {
  if (e.target.id === "modal") closeModal();
};
document.getElementById("detail-modal").onclick = (e) => {
  if (e.target.id === "detail-modal") {
    document.getElementById("detail-modal").classList.add("hidden");
    document.body.classList.remove("modal-open");
  }
};

// Featured tutors on homepage
async function loadFeaturedTutors() {
  try {
    const data = await api("/api/tutors");
    const tutors = data.tutors || [];
    const sorted = tutors
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);
    const container = el("featured-tutors");
    if (!container) return;
    container.innerHTML = sorted
      .map(
        (t) => `
      <div class="featured-tutor" onclick="openTutorDetail('${t.id}')">
        <div class="tutor-avatar">${(t.tutorName || "G")
          .charAt(0)
          .toUpperCase()}</div>
        <h4>${t.tutorName || "Gia sư"}</h4>
        <div class="subject"><i class="fas fa-book"></i> ${t.subject}</div>
        <div class="rating">⭐ ${t.rating || 0} (${
          t.ratingCount || 0
        } đánh giá)</div>
        <div class="price">${t.pricePerHour}k/giờ</div>
      </div>
    `
      )
      .join("");
  } catch (e) {
    console.log("Could not load featured tutors");
  }
}

// Initial - check login state on page load
show("home");
refreshMe(); // Check if already logged in
loadTutors(); // Preload tutors
loadFeaturedTutors(); // Load featured on homepage
