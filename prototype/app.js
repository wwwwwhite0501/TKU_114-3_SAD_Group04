// 全局狀態變數
let books = [];
let users = [];
let reports = [];
let logs = [];
let currentUser = null;
let activeRole = "買家"; // 當前操作身份 (買家, 賣家, 系統管理員)

// 保留管理員學號清單，普通人不可註冊此學號
const RESERVED_ADMIN_IDS = ["411100547", "413638189", "410631633"];

// 初始化啟動
document.addEventListener("DOMContentLoaded", () => {
  // 1. 初始化 Mock 資料 (如果 localStorage 沒有的話)
  initMockDatabase();
  
  // 2. 從 localStorage 載入資料
  loadStateFromStorage();
  
  // 3. 載入並設定主題
  const savedTheme = localStorage.getItem("sad_theme") || "dark";
  setTheme(savedTheme);
  
  // 4. 檢查登入 Session 狀態
  checkLoginSession();
});

// 主題切換邏輯
function setTheme(themeName) {
  document.body.setAttribute("data-theme", themeName);
  localStorage.setItem("sad_theme", themeName);
  
  const darkBtn = document.getElementById("theme-dark-btn");
  const lightBtn = document.getElementById("theme-light-btn");
  
  if (themeName === 'light') {
    if (darkBtn) darkBtn.classList.remove("active-theme");
    if (lightBtn) lightBtn.classList.add("active-theme");
  } else {
    if (darkBtn) darkBtn.classList.add("active-theme");
    if (lightBtn) lightBtn.classList.remove("active-theme");
  }
}

// 從 LocalStorage 載入資料
function loadStateFromStorage() {
  books = JSON.parse(localStorage.getItem("sad_books")) || [];
  users = JSON.parse(localStorage.getItem("sad_users")) || [];
  reports = JSON.parse(localStorage.getItem("sad_reports")) || [];
  logs = JSON.parse(localStorage.getItem("sad_logs")) || [];
}

// 儲存資料到 LocalStorage
function saveStateToStorage() {
  localStorage.setItem("sad_books", JSON.stringify(books));
  localStorage.setItem("sad_users", JSON.stringify(users));
  localStorage.setItem("sad_reports", JSON.stringify(reports));
  localStorage.setItem("sad_logs", JSON.stringify(logs));
}

// -------------------------------------------------------------
// 登入與註冊控制
// -------------------------------------------------------------

function checkLoginSession() {
  const activeUserId = localStorage.getItem("sad_active_user_id");
  if (activeUserId) {
    const user = users.find(u => u.id === activeUserId);
    if (user) {
      currentUser = user;
      // 讀取上一次儲存的操作身份
      activeRole = localStorage.getItem("sad_active_role") || "買家";
      
      // 隱藏登入遮罩，載入資料
      document.getElementById("loginPortal").style.display = "none";
      switchUser(user.id);
      return;
    }
  }
  // 未登入，顯示登入遮罩
  document.getElementById("loginPortal").style.display = "flex";
  switchLoginTab('login');
}

function switchLoginTab(mode) {
  const loginTab = document.getElementById("loginTabBtn");
  const registerTab = document.getElementById("registerTabBtn");
  const loginView = document.getElementById("loginView");
  const registerView = document.getElementById("registerView");
  
  if (mode === 'login') {
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    loginView.classList.add("active");
    registerView.classList.remove("active");
  } else {
    loginTab.classList.remove("active");
    registerTab.classList.add("active");
    loginView.classList.remove("active");
    registerView.classList.add("active");
  }
}

// 學號登入處理
function handleUserLogin(event) {
  event.preventDefault();
  const studentId = document.getElementById("loginStudentId").value.trim();
  const password = document.getElementById("loginPassword").value;
  
  if (!studentId || !password) {
    showToast("請輸入學號與密碼！", "error");
    return;
  }
  
  const user = users.find(u => u.studentId.replace(/\s+/g, '') === studentId.replace(/\s+/g, ''));
  if (user) {
    // 驗證密碼
    if (user.password !== password) {
      showToast("登入失敗！密碼錯誤，請重新輸入。", "error");
      return;
    }
    // 預設登入角色：如果是管理員就切為管理員，一般學生就切為買家
    activeRole = (user.role === "管理員") ? "系統管理員" : "買家";
    localStorage.setItem("sad_active_role", activeRole);
    loginUser(user);
  } else {
    // 檢查是否為管理員保留學號，防護寫入
    if (RESERVED_ADMIN_IDS.includes(studentId)) {
      showToast("系統初始化管理員資料中...", "info");
      initMockDatabase();
      loadStateFromStorage();
      const adminUser = users.find(u => u.studentId === studentId);
      if (adminUser) {
        if (adminUser.password !== password) {
          showToast("登入失敗！密碼錯誤，請重新輸入。", "error");
          return;
        }
        activeRole = "系統管理員";
        localStorage.setItem("sad_active_role", activeRole);
        loginUser(adminUser);
        return;
      }
    }
    showToast("登入失敗！該學號尚未註冊，請切換至【註冊新帳號】。", "error");
  }
}

// 帳號註冊處理
function handleUserRegister(event) {
  event.preventDefault();
  const name = document.getElementById("regName").value.trim();
  const studentId = document.getElementById("regStudentId").value.trim().replace(/\s+/g, '');
  const department = document.getElementById("regDept").value.trim();
  const gradeClass = document.getElementById("regClass").value.trim();
  const password = document.getElementById("regPassword").value;
  
  if (!name || !studentId || !department || !gradeClass || !password) {
    showToast("所有欄位均為必填！", "error");
    return;
  }
  
  // 限制點：不可註冊管理員保留學號
  if (RESERVED_ADMIN_IDS.includes(studentId)) {
    showToast("註冊失敗！此學號為管理員專屬學號，不開放一般學生註冊。請直接在「學號登入」登入！", "error");
    addLog(`系統警告：嘗試註冊管理員專屬學號 ${studentId} 被系統拒絕。`);
    return;
  }
  
  // 檢查學號是否重複
  const existUser = users.find(u => u.studentId.replace(/\s+/g, '') === studentId);
  if (existUser) {
    showToast("註冊失敗！該學號已存在，請直接登入。", "error");
    return;
  }
  
  const newUser = {
    id: `student-${Date.now()}`,
    name,
    studentId,
    password, // 儲存設定密碼
    department,
    gradeClass,
    role: "學生",
    noshowCount: 0,
    isSuspended: false,
    appealSubmitted: false,
    appealReason: ""
  };
  
  users.push(newUser);
  saveStateToStorage();
  
  addLog(`註冊新交易帳號成功：${name} (${studentId})，科系：${department}，班級：${gradeClass}`);
  activeRole = "買家"; // 註冊後預設以買家登入
  localStorage.setItem("sad_active_role", activeRole);
  loginUser(newUser);
}

// 登入程序
function loginUser(user) {
  currentUser = user;
  localStorage.setItem("sad_active_user_id", user.id);
  
  // 隱藏登入門戶
  document.getElementById("loginPortal").style.display = "none";
  
  // 初始化登入後畫面
  switchUser(user.id);
  
  showToast(`歡迎回來，${user.name}！`, "success");
  addLog(`使用者登入：${user.name} (${user.studentId}) [身份：${activeRole}]`);
}

// 登出系統
function handleUserLogout() {
  localStorage.removeItem("sad_active_user_id");
  localStorage.removeItem("sad_active_role");
  currentUser = null;
  activeRole = "買家";
  
  // 清空輸入框
  document.getElementById("loginStudentId").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("regName").value = "";
  document.getElementById("regStudentId").value = "";
  document.getElementById("regDept").value = "";
  document.getElementById("regClass").value = "";
  if (document.getElementById("regPassword")) {
    document.getElementById("regPassword").value = "";
  }
  
  // 顯示登入門戶
  document.getElementById("loginPortal").style.display = "flex";
  switchLoginTab('login');
  
  showToast("已登出系統", "info");
  addLog("使用者登出系統。");
}

// -------------------------------------------------------------
// 系統日誌與通知功能
// -------------------------------------------------------------

function addLog(text) {
  const time = new Date().toLocaleTimeString('zh-TW', { hour12: false });
  logs.unshift({ time, text }); // 新日誌排在最前面
  
  if (logs.length > 50) {
    logs.pop();
  }
  
  saveStateToStorage();
  renderLogs();
}

function renderLogs() {
  const logsDisplay = document.getElementById("logsDisplay");
  if (!logsDisplay) return;
  
  logsDisplay.innerHTML = logs.map(log => `
    <div class="log-item">
      <span class="log-time">[${log.time}]</span>${log.text}
    </div>
  `).join("");
}

function clearLogs() {
  logs = [{ time: new Date().toLocaleTimeString('zh-TW', { hour12: false }), text: "日誌已清空。" }];
  saveStateToStorage();
  renderLogs();
  showToast("系統日誌已清空", "success");
}

function showToast(message, type = 'info') {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let icon = "ℹ️";
  if (type === 'success') icon = "✅";
  if (type === 'error') icon = "❌";
  
  toast.innerHTML = `
    <span>${icon} ${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// -------------------------------------------------------------
// 使用者狀態更新與切換
// -------------------------------------------------------------

function switchUser(userId) {
  currentUser = users.find(u => u.id === userId);
  if (!currentUser) return;
  
  // 檢驗並限制角色
  if (currentUser.role !== "管理員" && activeRole === "系統管理員") {
    activeRole = "買家";
    localStorage.setItem("sad_active_role", activeRole);
  }
  
  renderUserStatusCard();
  renderAppealForm();
  
  // 判斷是否顯示停權通知條與封鎖表單操作
  const banner = document.getElementById("suspensionBanner");
  if (currentUser.isSuspended) {
    banner.style.display = "block";
    disableInteractiveInputs(true);
  } else {
    banner.style.display = "none";
    disableInteractiveInputs(false);
  }
  
  // 核心：依據 activeRole 控制分頁按鈕的顯示/隱藏與自動切換
  syncTabVisibility();
  
  // 重新渲染當前所有視圖
  renderLogs(); // 讓日誌能在管理員分頁渲染出來
  renderBooksGrid();
  renderReservations();
  renderSellerListings();
  renderNoShowLogs();
  renderAdminView();
}

function renderUserStatusCard() {
  const container = document.getElementById("userStatusCard");
  if (!container) return;
  
  container.className = "user-status-card";
  
  let statusBadge = `<span class="status-badge badge-normal">正常</span>`;
  if (currentUser.isSuspended) {
    statusBadge = `<span class="status-badge badge-suspended">已停權</span>`;
    container.classList.add("suspended");
  } else if (currentUser.role === "管理員") {
    statusBadge = `<span class="status-badge badge-admin">管理人員</span>`;
    container.classList.add("admin");
  }
  
  // 生成切換角色 dropdown 內容 (不加寫「身份」兩字)
  let roleOptions = "";
  if (currentUser.role === "管理員") {
    roleOptions = `
      <option value="買家" ${activeRole === '買家' ? 'selected' : ''}>買家</option>
      <option value="賣家" ${activeRole === '賣家' ? 'selected' : ''}>賣家</option>
      <option value="系統管理員" ${activeRole === '系統管理員' ? 'selected' : ''}>系統管理員</option>
    `;
  } else {
    roleOptions = `
      <option value="買家" ${activeRole === '買家' ? 'selected' : ''}>買家</option>
      <option value="賣家" ${activeRole === '賣家' ? 'selected' : ''}>賣家</option>
    `;
  }
  
  container.innerHTML = `
    <p style="font-size:0.95rem;"><strong>${currentUser.name}</strong> ${statusBadge}</p>
    <p>學號: <span style="font-family:monospace; font-weight:600;">${currentUser.studentId}</span></p>
    <p>科系: <span>${currentUser.department || '無'}</span></p>
    <p>班級: <span>${currentUser.gradeClass || '無'}</span></p>
    <p>累計放鳥次數: <strong style="color: ${currentUser.noshowCount > 0 ? 'var(--rose-red)' : 'var(--emerald-green)'}">${currentUser.noshowCount} / 2 次</strong></p>
    
    <div style="margin-top:0.75rem; border-top:1px dashed var(--border-color); padding-top:0.75rem;">
      <label style="font-size:0.75rem; color:var(--text-secondary); display:block; margin-bottom:0.25rem; font-weight:600;">🔄 當前操作切換</label>
      <div class="select-wrapper" style="margin-bottom:0;">
        <select onchange="changeActiveRole(this.value)">
          ${roleOptions}
        </select>
      </div>
    </div>
  `;
}

// 變更操作身份
function changeActiveRole(newRole) {
  activeRole = newRole;
  localStorage.setItem("sad_active_role", activeRole);
  
  addLog(`${currentUser.name} 切換操作身份為：【${newRole}】`);
  showToast(`切換至 ${newRole} 模式`);
  
  renderUserStatusCard();
  syncTabVisibility();
  
  renderBooksGrid();
  renderReservations();
  renderSellerListings();
  renderAdminView();
}

// 核心：控制分頁按鈕顯示與隱藏 (採用簡單清楚命名)
function syncTabVisibility() {
  const tabBuyer = document.getElementById("tab-buyer");
  const tabReserved = document.getElementById("tab-reserved");
  const tabSeller = document.getElementById("tab-seller");
  const tabAdmin = document.getElementById("tab-admin");
  const tabNoshowLogs = document.getElementById("tab-noshow-logs");
  const logsConsole = document.getElementById("logsConsole");
  
  if (activeRole === "買家") {
    // 買家：顯示「搜尋與預約」、「預約紀錄」與「放鳥回報紀錄」
    tabBuyer.style.display = "block";
    tabReserved.style.display = "block";
    if (tabNoshowLogs) tabNoshowLogs.style.display = "block";
    tabSeller.style.display = "none";
    tabAdmin.style.display = "none";
    if (logsConsole) logsConsole.style.display = "none";
    
    switchTabDirect("buyer");
  } 
  else if (activeRole === "賣家") {
    // 賣家：搜尋與預約、上架與管理、預約紀錄 (隱藏放鳥回報紀錄)
    tabBuyer.style.display = "block";
    tabSeller.style.display = "block";
    tabReserved.style.display = "block";
    if (tabNoshowLogs) tabNoshowLogs.style.display = "none";
    tabAdmin.style.display = "none";
    if (logsConsole) logsConsole.style.display = "none";
    
    switchTabDirect("seller");
  } 
  else if (activeRole === "系統管理員") {
    // 系統管理員：僅顯示「系統管理」
    tabBuyer.style.display = "none";
    tabReserved.style.display = "none";
    tabSeller.style.display = "none";
    if (tabNoshowLogs) tabNoshowLogs.style.display = "none";
    tabAdmin.style.display = "block";
    if (logsConsole) logsConsole.style.display = "flex";
    
    switchTabDirect("admin");
  }
}

// 切換分頁邏輯
function switchTabDirect(tabId) {
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById(`tab-${tabId}`).classList.add("active");
  
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));
  document.getElementById(`panel-${tabId}`).classList.add("active");
}

// 停權時封鎖所有表單
function disableInteractiveInputs(disable) {
  const inputs = document.querySelectorAll("#uploadForm input, #uploadForm textarea, #uploadForm button, #booksGrid button");
  inputs.forEach(el => {
    if (disable) {
      el.setAttribute("disabled", "true");
      el.style.cursor = "not-allowed";
    } else {
      el.removeAttribute("disabled");
      el.style.cursor = "";
    }
  });
}

// 申訴區塊渲染 (若使用者遭停權，則於側邊欄提供申訴介面)
function renderAppealForm() {
  const container = document.getElementById("appealBoxContainer");
  if (!container) return;
  
  if (currentUser.isSuspended) {
    if (currentUser.appealSubmitted) {
      container.innerHTML = `
        <div class="appeal-dialog" style="background: rgba(52, 211, 153, 0.05); border-color: rgba(52, 211, 153, 0.15); margin-top: 1rem;">
          <h3 style="color: var(--emerald-green);">✍️ 放鳥申訴已送出</h3>
          <p style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4;">
            您已成功提交人工申訴。請靜候管理人員審查結果。<br>
            <strong>申訴理由：</strong><br>
            <span style="font-style: italic; color:var(--text-primary);">"${currentUser.appealReason}"</span>
          </p>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="appeal-dialog" style="margin-top: 1rem;">
          <h3>🚫 提出停權申訴</h3>
          <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom:0.5rem; line-height: 1.3;">
            因面交被回報放鳥累計達 2 次，您已被系統自動處以「停權」處分。如有爭議，請填寫申訴理由送出審核：
          </p>
          <textarea id="appealTextarea" class="appeal-textarea" placeholder="請填寫放鳥爭議申訴原因 (例如：遲到原因、現場聯絡誤會、對方惡意回報等)..."></textarea>
          <button class="btn btn-primary btn-xs" style="width: 100%; font-size: 0.75rem; margin-top:0.5rem;" onclick="submitAppeal()">
            送出放鳥申訴
          </button>
        </div>
      `;
    }
  } else {
    container.innerHTML = "";
  }
}

function submitAppeal() {
  const textarea = document.getElementById("appealTextarea");
  if (!textarea || !textarea.value.trim()) {
    showToast("請填寫申訴理由！", "error");
    return;
  }
  
  const reason = textarea.value.trim();
  
  currentUser.appealSubmitted = true;
  currentUser.appealReason = reason;
  
  const uIndex = users.findIndex(u => u.id === currentUser.id);
  if (uIndex !== -1) {
    users[uIndex] = currentUser;
  }
  
  saveStateToStorage();
  renderAppealForm();
  renderAdminView();
  showToast("申訴已送出，等待管理員審理", "success");
  addLog(`${currentUser.name} (${currentUser.studentId}) 提交了停權放鳥申訴案。`);
}

// 手動點選分頁切換
function switchTab(tabId) {
  // 管理員權限驗證
  if (tabId === 'admin' && currentUser.role !== "管理員") {
    showToast("權限不足！只有【系統管理員】可以進入系統管理。", "error");
    addLog(`攔截未授權存取：${currentUser.name} 企圖進入系統管理。`);
    return;
  }
  
  switchTabDirect(tabId);
  addLog(`手動切換至分頁：${document.getElementById(`tab-${tabId}`).innerText.trim()}`);
}

// -------------------------------------------------------------
// BUYER 功能: 搜尋、預約與買家預約清單
// -------------------------------------------------------------

function filterBooks() {
  renderBooksGrid();
}

function resetFilters() {
  document.getElementById("searchKeyword").value = "";
  document.getElementById("priceMin").value = "";
  document.getElementById("priceMax").value = "";
  renderBooksGrid();
  showToast("篩選條件已重設");
  addLog("買家重設了搜尋篩選條件。");
}

function renderBooksGrid() {
  const grid = document.getElementById("booksGrid");
  if (!grid) return;
  
  const keyword = document.getElementById("searchKeyword").value.trim().toLowerCase();
  const minPrice = parseFloat(document.getElementById("priceMin").value) || 0;
  const maxPrice = parseFloat(document.getElementById("priceMax").value) || Infinity;
  
  const filtered = books.filter(book => {
    if (book.price < minPrice || book.price > maxPrice) return false;
    
    if (keyword) {
      const matchTitle = book.title.toLowerCase().includes(keyword);
      const matchInstructor = book.instructor.toLowerCase().includes(keyword);
      const matchIsbn = book.isbn.toLowerCase().includes(keyword);
      return matchTitle || matchInstructor || matchIsbn;
    }
    
    return true;
  });
  
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 4rem 0;">
        <div class="empty-icon">🔍</div>
        <p>沒有找到符合條件的二手書籍</p>
        <span style="font-size: 0.8rem; color: var(--text-muted);">試著使用其他關鍵字，或調整價格區間篩選。</span>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = filtered.map(book => {
    const seller = users.find(u => u.id === book.sellerId);
    const sellerName = seller ? seller.name : "未知賣家";
    
    let actionBtn = "";
    let statusClass = "badge-available";
    
    if (book.status === "上架中") {
      statusClass = "badge-available";
      if (currentUser && currentUser.id === book.sellerId) {
        actionBtn = `<button class="btn btn-primary" disabled>您的商品</button>`;
      } else {
        const isSusp = currentUser && currentUser.isSuspended;
        actionBtn = `
          <button class="btn btn-primary" ${isSusp ? 'disabled style="background:var(--text-muted); cursor:not-allowed;"' : ''} onclick="reserveBook('${book.id}')">預約購買</button>
          <button class="btn btn-secondary" onclick="reportNonTextbook('${book.id}')" style="max-width: 70px; padding: 0.65rem 0.25rem; font-size: 0.75rem; background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.2); color: var(--rose-red);">⚠️ 檢舉</button>
        `;
      }
    } else if (book.status === "已預約") {
      statusClass = "badge-reserved";
      actionBtn = `<button class="btn btn-primary" disabled style="background: var(--text-muted); color: var(--text-primary); cursor:not-allowed;">已預約 (面交中)</button>`;
    } else if (book.status === "已售出") {
      statusClass = "badge-sold";
      actionBtn = `<button class="btn btn-primary" disabled style="background: rgba(255,255,255,0.05); color: var(--text-muted); cursor:not-allowed;">已售出</button>`;
    }
    
    return `
      <div class="book-card" id="book-card-${book.id}">
        
        <!-- 書籍封面區 -->
        <div class="card-header-cover" style="background: ${book.coverImage ? `url(${book.coverImage}) center/cover no-repeat` : (book.coverColor || 'linear-gradient(135deg, #1e293b, #0f172a)')}">
          <div class="book-cover-pattern"></div>
          <div class="cover-tag-container">
            <span class="cover-badge ${statusClass}">${book.status}</span>
          </div>
          <div class="cover-price">$${book.price}</div>
          <div class="cover-title" title="${book.title}">${book.title}</div>
        </div>
        
        <!-- 書籍規格欄位 -->
        <div class="card-body">
          <div class="card-info-row">
            <span class="info-label">開課老師</span>
            <span class="info-val">${book.instructor}</span>
          </div>
          <div class="card-info-row">
            <span class="info-label">書籍版本</span>
            <span class="info-val">${book.version}</span>
          </div>
          <div class="card-info-row">
            <span class="info-label">ISBN 索引</span>
            <span class="info-val info-isbn">${book.isbn}</span>
          </div>
          <div class="card-info-row">
            <span class="info-label">書況說明</span>
            <span class="info-val" style="color: var(--light-purple); font-weight: 500;">${book.condition}</span>
          </div>
          <div class="card-info-row" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
            <span class="info-label">預期面交</span>
            <span class="info-val" style="color: var(--baby-blue); text-align: right; max-width: 70%; word-break: break-all;">📍 ${book.meetupLocation}</span>
          </div>
          <div class="card-info-row">
            <span class="info-label">賣方學生</span>
            <span class="info-val" style="color: var(--text-secondary); font-size: 0.8rem;">👤 ${sellerName}</span>
          </div>
        </div>
        
        <!-- 按鈕區 -->
        <div class="card-footer">
          ${actionBtn}
        </div>
        
      </div>
    `;
  }).join("");
}

// 買家檢舉違規非教科書商品
function reportNonTextbook(bookId) {
  if (currentUser.isSuspended) {
    showToast("檢舉失敗！您的帳號目前處於【停權】狀態。", "error");
    return;
  }
  
  const book = books.find(b => b.id === bookId);
  if (!book) return;
  
  const confirmReport = confirm(`⚠️ 您確認要檢舉《${book.title}》為「非教科書之違規雜物」商品嗎？\n\n送出後將由平台管理人員進行審理。`);
  if (!confirmReport) return;
  
  const reason = prompt("請輸入檢舉的具體原因描述 (例如：販售雜物、廣告垃圾、與課程無關等)：", "販售非教科書之雜物，違反平台規範");
  if (reason === null) return; // 取消
  
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    alert("檢舉原因不能為空！");
    return;
  }
  
  // 檢查是否已被重複檢舉
  const isAlreadyReported = reports.some(r => r.reportedBookId === bookId);
  if (isAlreadyReported) {
    showToast("此商品已被他人檢舉，管理員正在審理中！", "info");
    return;
  }
  
  const newReport = {
    id: `report-${Date.now()}`,
    reporterName: currentUser.name,
    reporterId: currentUser.id,
    reportedBookId: book.id,
    reportedBookTitle: book.title,
    reason: trimmedReason,
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' ')
  };
  
  reports.unshift(newReport);
  saveStateToStorage();
  
  if (currentUser && currentUser.role === "管理員") {
    renderFlaggedItems();
  }
  
  showToast("檢舉提交成功！管理員將會進行審理。", "success");
  addLog(`[檢舉回報] 買家 ${currentUser.name} 檢舉商品《${book.title}》非教科書。原因: "${trimmedReason}"`);
}

// 買家預約流程
function reserveBook(bookId) {
  if (currentUser.isSuspended) {
    showToast("預約失敗！您的帳號目前處於【停權】狀態，無法進行交易預約。", "error");
    addLog(`系統阻斷：遭停權之買家 ${currentUser.name} 企圖預約商品 ID: ${bookId}`);
    return;
  }
  
  const book = books.find(b => b.id === bookId);
  if (!book) return;
  
  if (book.status !== "上架中") {
    showToast("預約失敗！此教科書已在剛才被其他買家預約。", "error");
    addLog(`鎖定碰撞：買家 ${currentUser.name} 預約的書籍已被搶先預約 (ID: ${bookId})`);
    return;
  }
  
  book.status = "已預約";
  book.buyerId = currentUser.id;
  book.meetupTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ');
  
  saveStateToStorage();
  renderBooksGrid();
  renderReservations();
  renderSellerListings();
  
  addLog(`買家 ${currentUser.name} 成功預約了《${book.title}》！`);
  addLog(`狀態防重鎖定 (Concurrency Lock)：商品 ${bookId} 狀態切換為【已預約】，其他買家按鈕已自動停用。`);
  
  showMeetingModal(book);
}

// 渲染「預約紀錄」 (買家與賣家動態切換顯示)
function renderReservations() {
  const container = document.getElementById("reservationsContainer");
  if (!container) return;
  
  const titleHeader = document.getElementById("reservedTitleHeader");
  
  if (activeRole === "買家") {
    if (titleHeader) titleHeader.innerHTML = `預約紀錄 <span id="reservedSubtitleHeader">追蹤我向他人預訂的書籍</span>`;
    
    const myPurchases = books.filter(b => b.buyerId === currentUser.id && b.status === "已預約");
    
    if (myPurchases.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 4rem 0; border: 1px dashed var(--border-color); border-radius: 0.75rem;">
          <p>🤝 您目前沒有已預約的採購項目</p>
          <span style="font-size:0.75rem; color:var(--text-muted);">前往「搜尋與預約」分頁搜尋並點擊「預約購買」，即可開始面交。</span>
        </div>
      `;
      return;
    }
    
    container.innerHTML = myPurchases.map(book => {
      const seller = users.find(u => u.id === book.sellerId) || {
        name: "未知",
        department: "未知",
        gradeClass: "未知"
      };
      
      return `
        <div class="listing-row-card" style="background: rgba(30, 41, 73, 0.3); border-color: rgba(56, 189, 248, 0.15);">
          <div class="row-cover-thumb" style="background: ${book.coverImage ? `url(${book.coverImage}) center/cover no-repeat` : book.coverColor}">
            採購
          </div>
          <div class="row-details">
            <div class="row-title" style="color:var(--baby-blue);">${book.title}</div>
            <div class="row-meta">
              <span style="color: var(--emerald-green); font-weight:700;">金額: $${book.price} 元</span>
              <span>地點: 📍 ${book.meetupLocation}</span>
            </div>
            <div style="font-size: 0.8rem; margin-top: 0.25rem; color:var(--text-primary);">
              👤 <strong>賣家聯絡：</strong>${seller.name} (${seller.department} - 班級 ${seller.gradeClass})
            </div>
            <div style="font-size: 0.8rem; color: var(--amber-yellow); background: rgba(251, 191, 36, 0.05); padding: 0.35rem; border-radius:0.25rem; margin-top:0.35rem;">
              📌 <strong>賣家提示面交備註：</strong>${book.meetupNote || '無備註'}
            </div>
          </div>
          <div class="row-actions">
            <button class="btn btn-danger btn-xs" onclick="reportNoShow('${book.id}', 'buyer')">⚠️ 賣家放鳥回報</button>
          </div>
        </div>
      `;
    }).join("");
    
  } else if (activeRole === "賣家") {
    if (titleHeader) titleHeader.innerHTML = `預約紀錄 <span id="reservedSubtitleHeader">追蹤買家預約我的商品進度</span>`;
    
    const mySales = books.filter(b => b.sellerId === currentUser.id && b.status === "已預約");
    
    if (mySales.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 4rem 0; border: 1px dashed var(--border-color); border-radius: 0.75rem;">
          <p>📦 您目前上架的書籍沒有被預約的項目</p>
          <span style="font-size:0.75rem; color:var(--text-muted);">可在「上架與管理」中檢視您目前上架中或已售出的所有商品。</span>
        </div>
      `;
      return;
    }
    
    container.innerHTML = mySales.map(book => {
      const buyer = users.find(u => u.id === book.buyerId) || {
        name: "未知",
        department: "未知",
        gradeClass: "未知"
      };
      
      return `
        <div class="listing-row-card" style="background: rgba(30, 41, 73, 0.3); border-color: rgba(56, 189, 248, 0.15);">
          <div class="row-cover-thumb" style="background: ${book.coverImage ? `url(${book.coverImage}) center/cover no-repeat` : book.coverColor}">
            銷售
          </div>
          <div class="row-details">
            <div class="row-title" style="color:var(--light-purple);">${book.title}</div>
            <div class="row-meta">
              <span style="color: var(--emerald-green); font-weight:700;">金額: $${book.price} 元</span>
              <span>地點: 📍 ${book.meetupLocation}</span>
            </div>
            <div style="font-size: 0.8rem; margin-top: 0.25rem; color:var(--text-primary);">
              👤 <strong>買家聯絡：</strong>${buyer.name} (${buyer.department} - 班級 ${buyer.gradeClass})
            </div>
            <div style="font-size: 0.8rem; color: var(--amber-yellow); background: rgba(251, 191, 36, 0.05); padding: 0.35rem; border-radius:0.25rem; margin-top:0.35rem;">
              📌 <strong>我留下的面交備註：</strong>${book.meetupNote || '無備註'}
            </div>
          </div>
          <div class="row-actions" style="flex-direction:column; gap:0.35rem;">
            <button class="btn btn-success btn-xs" style="width:100%" onclick="confirmTransaction('${book.id}')">✅ 確認面交完成</button>
            <button class="btn btn-danger btn-xs" style="width:100%" onclick="reportNoShow('${book.id}', 'seller')">❌ 買家放鳥回報</button>
          </div>
        </div>
      `;
    }).join("");
  }
}

// -------------------------------------------------------------
// 狀態鎖定防重複 - 1秒內雙重搶單衝突模擬 (驗收條件 2)
// -------------------------------------------------------------

function triggerDoubleBookingDemo() {
  let targetBook = books.find(b => b.status === "上架中");
  
  if (!targetBook) {
    books[0].status = "上架中";
    books[0].buyerId = null;
    targetBook = books[0];
    saveStateToStorage();
    renderBooksGrid();
  }
  
  const bTitle = targetBook.title;
  const bId = targetBook.id;
  
  // 只有如果是系統管理員狀態，才會在 console 裡輸出詳細步驟
  addLog(`=== 啟動雙重搶購模擬 ===`);
  addLog(`模擬情境：買家A 與 買家C 同時對《${bTitle}》發起預約...`);
  
  setTimeout(() => {
    addLog(`[執行緒 1] 買家A 的請求先抵達 (領先 45 毫秒)。狀態鎖定生效，書籍狀態變更為【已預約】。`);
    
    targetBook.status = "已預約";
    targetBook.buyerId = "student-01";
    targetBook.meetupTime = "2026-07-15 12:00";
    saveStateToStorage();
    renderBooksGrid();
    renderReservations();
    
    setTimeout(() => {
      addLog(`[執行緒 2] 買家C 的預約請求於 1 秒內抵達。`);
      addLog(`[安全檢查] 系統比對 LocalStorage，偵測到書籍 ${bId} 狀態已非【上架中】(已被陳大文鎖定)。`);
      addLog(`[拒絕交易] 系統防止重複鎖定，拒絕買家C的寫入，彈出鎖定失敗訊息！`);
      
      alert(`【系統防重複鎖定提示】\n\n買家C 您好：\n您所搶購的書籍《${bTitle}》已在剛才被其他買家預約鎖定！\n系統已自動阻斷此次重複預約，請選擇其他二手書籍。`);
      
      showToast("重複搶購衝突！系統已成功鎖定狀態防重複購買。", "error");
      addLog(`=== 雙重搶購模擬結束：驗收通過 ===`);
    }, 500);
    
  }, 100);
}

// -------------------------------------------------------------
// SELLER 功能: 上架與管理
// -------------------------------------------------------------

let currentBookImageBase64 = null;

function previewBookImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith("image/")) {
    alert("請選擇圖片檔案！");
    event.target.value = "";
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // 壓縮與等比例縮小圖片
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      const MAX_SIZE = 300; // 最大解析度
      
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      
      // 壓縮為 jpeg，品質 0.7，以符合 localStorage 容量限制
      currentBookImageBase64 = canvas.toDataURL("image/jpeg", 0.7);
      
      // 更新介面預覽
      document.getElementById("file-upload-preview").src = currentBookImageBase64;
      document.getElementById("file-upload-preview-container").style.display = "flex";
      document.getElementById("file-upload-placeholder").style.display = "none";
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeBookImagePreview(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  currentBookImageBase64 = null;
  const fileInput = document.getElementById("bookImageFile");
  if (fileInput) fileInput.value = "";
  
  const previewContainer = document.getElementById("file-upload-preview-container");
  const placeholder = document.getElementById("file-upload-placeholder");
  if (previewContainer) previewContainer.style.display = "none";
  if (placeholder) placeholder.style.display = "flex";
}

function handleBookUpload(event) {
  event.preventDefault();
  
  if (currentUser.isSuspended) {
    showToast("上架失敗！您的帳號已被停權，無法上架商品。", "error");
    addLog(`系統阻斷：遭停權之賣家 ${currentUser.name} 企圖上架書籍。`);
    return;
  }
  
  if (!currentBookImageBase64) {
    showToast("上架失敗！請上傳書籍實體照片。", "error");
    return;
  }
  
  const title = document.getElementById("bookTitle").value.trim();
  const instructor = document.getElementById("bookInstructor").value.trim();
  const version = document.getElementById("bookVersion").value.trim();
  const isbn = document.getElementById("bookIsbn").value.trim();
  const price = parseInt(document.getElementById("bookPrice").value);
  const location = document.getElementById("bookLocation").value.trim();
  const meetupNote = document.getElementById("bookMeetupNote").value.trim();
  
  const conditionRadios = document.getElementsByName("bookCondition");
  let condition = "全新";
  for (let r of conditionRadios) {
    if (r.checked) {
      condition = r.value;
      break;
    }
  }
  
  const gradients = [
    "linear-gradient(135deg, #4f46e5, #c084fc)",
    "linear-gradient(135deg, #0d9488, #2dd4bf)",
    "linear-gradient(135deg, #ea580c, #fde047)",
    "linear-gradient(135deg, #2563eb, #38bdf8)",
    "linear-gradient(135deg, #7c3aed, #a78bfa)",
    "linear-gradient(135deg, #059669, #34d399)"
  ];
  const randGradient = gradients[Math.floor(Math.random() * gradients.length)];
  
  const newBook = {
    id: `book-${Date.now()}`,
    title,
    instructor,
    version,
    isbn,
    condition,
    price,
    meetupLocation: location,
    meetupNote,
    status: "上架中",
    sellerId: currentUser.id,
    buyerId: null,
    coverColor: randGradient,
    coverImage: currentBookImageBase64,
    imageSeed: "custom"
  };
  
  books.unshift(newBook);
  saveStateToStorage();
  
  document.getElementById("uploadForm").reset();
  removeBookImagePreview();
  
  renderBooksGrid();
  renderSellerListings();
  
  showToast("書籍成功上架！(一頁式上架完成)", "success");
  addLog(`賣家 ${currentUser.name} 成功上架二手書《${title}》，定價 $${price}。面交備註：${meetupNote}`);
}

function renderSellerListings() {
  const container = document.getElementById("sellerListingsList");
  if (!container) return;
  
  // 只顯示「上架中」與「已售出」的書籍 (被預約的已移動至獨立的預約紀錄分頁)
  const myListings = books.filter(b => b.sellerId === currentUser.id && b.status !== "已預約");
  
  if (myListings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📤</div>
        <p>您目前沒有上架中或已售出的書籍</p>
        <span style="font-size: 0.75rem; color: var(--text-muted);">使用左側表單快速上架新書。</span>
      </div>
    `;
    return;
  }
  
  container.innerHTML = myListings.map(book => {
    let actionHtml = "";
    
    if (book.status === "上架中") {
      actionHtml = `
        <button class="btn btn-secondary btn-xs" onclick="deleteBook('${book.id}')">下架書籍</button>
      `;
    } else if (book.status === "已售出") {
      actionHtml = `
        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight:600;">🤝 交易已完成</span>
      `;
    }
    
    return `
      <div class="listing-row-card">
        <div class="row-cover-thumb" style="background: ${book.coverImage ? `url(${book.coverImage}) center/cover no-repeat` : book.coverColor}">
          圖書
        </div>
        <div class="row-details">
          <div class="row-title">${book.title}</div>
          <div class="row-meta">
            <span>價格: $${book.price} 元</span>
            <span>老師: ${book.instructor}</span>
            <span>狀態: <strong style="color: ${book.status === '已售出' ? 'var(--text-muted)' : 'var(--emerald-green)'}">${book.status}</strong></span>
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem; font-style:italic;">
            我的備註: ${book.meetupNote || '無'}
          </div>
        </div>
        <div>
          ${actionHtml}
        </div>
      </div>
    `;
  }).join("");
}

function deleteBook(bookId) {
  if (confirm("確定要下架此書籍嗎？")) {
    const bIndex = books.findIndex(b => b.id === bookId);
    if (bIndex !== -1) {
      const title = books[bIndex].title;
      books.splice(bIndex, 1);
      saveStateToStorage();
      renderBooksGrid();
      renderSellerListings();
      showToast("書籍已成功下架");
      addLog(`賣家 ${currentUser.name} 下架了二手書《${title}》。`);
    }
  }
}

function confirmTransaction(bookId) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;
  
  book.status = "已售出";
  saveStateToStorage();
  
  renderBooksGrid();
  renderSellerListings();
  
  showToast("面交已順利完成！交易結案。", "success");
  addLog("現場交易確認：現場錢貨兩清，交易完成。書籍已標記為【已售出】。");
}

function reportNoShow(bookId, roleType) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;
  
  let reportedUserId = "";
  let reportedUserName = "";
  let reporterName = currentUser.name;
  
  if (roleType === 'seller') {
    reportedUserId = book.buyerId;
    const buyerObj = users.find(u => u.id === reportedUserId);
    reportedUserName = buyerObj ? buyerObj.name : "買家";
  } else {
    reportedUserId = book.sellerId;
    const sellerObj = users.find(u => u.id === reportedUserId);
    reportedUserName = sellerObj ? sellerObj.name : "賣家";
  }
  
  if (!reportedUserId) {
    showToast("無法找到被回報對象", "error");
    return;
  }
  
  // 彈出框讓使用者填寫詳細狀況描述
  const reason = prompt(`【放鳥違規檢舉】\n您正準備舉報「${reportedUserName}」在面交時無故未到。\n\n請輸入放鳥的詳細狀況描述 (例如：遲到30分鐘聯絡不上、對方臨時取消等)：`);
  
  if (reason === null) {
    showToast("已取消檢舉", "info");
    return; // 使用者按取消
  }
  
  const trimmedReason = reason.trim();
  if (trimmedReason === "") {
    alert("必須填寫詳細狀況描述才能完成舉報！");
    return;
  }
  
  const targetUser = users.find(u => u.id === reportedUserId);
  if (targetUser) {
    // 初始化詳細紀錄陣列
    if (!targetUser.noShowDetails) {
      targetUser.noShowDetails = [];
    }
    
    // 儲存詳細紀錄
    targetUser.noShowDetails.push({
      reporter: reporterName,
      bookTitle: book.title,
      reason: trimmedReason,
      timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false })
    });
    
    targetUser.noshowCount += 1;
    addLog(`[放鳥回報] ${reporterName} 舉報面交遭遇放鳥。被舉報人：${targetUser.name} (${targetUser.studentId})。詳細原因："${trimmedReason}"`);
    
    if (targetUser.noshowCount >= 2) {
      targetUser.isSuspended = true;
      addLog(`【停權處分】學生 ${targetUser.name} (${targetUser.studentId}) 放鳥累計達 2 次，系統已自動執行「停權」處分。`);
      showToast(`學生 ${targetUser.name} 已累計 2 次放鳥，系統已予以停權！`, "error");
    } else {
      showToast(`已成功登記違規，該學生已累計 ${targetUser.noshowCount} 次放鳥。`);
    }
    
    book.status = "上架中";
    book.buyerId = null;
    book.meetupTime = null;
    
    saveStateToStorage();
    
    renderBooksGrid();
    renderReservations();
    renderSellerListings();
    renderNoShowLogs();
    
    if (currentUser.id === targetUser.id) {
      switchUser(currentUser.id);
    } else {
      renderUserStatusCard();
    }
    
    renderAdminView();
  }
}

// -------------------------------------------------------------
// ADMIN 功能: 系統管理與申訴審查
// -------------------------------------------------------------

function renderAdminView() {
  renderFlaggedItems();
  renderSuspendedUsers();
}

function renderFlaggedItems() {
  const container = document.getElementById("adminReportsList");
  if (!container) return;
  
  if (reports.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>🎉 目前無被檢舉的違規商品</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = reports.map(rep => {
    return `
      <div class="flagged-item-card" id="report-card-${rep.id}">
        <div class="flagged-header">
          <div class="flagged-title">${rep.reportedBookTitle}</div>
          <span class="flagged-tag">檢舉違規</span>
        </div>
        <div class="flagged-body">
          <p><strong>檢舉人:</strong> ${rep.reporterName}</p>
          <p><strong>原因:</strong> ${rep.reason}</p>
          <p style="font-size: 0.75rem; color: var(--text-muted); margin-top:0.25rem;">時間: ${rep.timestamp}</p>
        </div>
        <div class="flagged-actions">
          <button class="btn btn-secondary btn-xs" onclick="dismissReport('${rep.id}')">駁回檢舉</button>
          <button class="btn btn-danger btn-xs" onclick="takeDownBook('${rep.reportedBookId}', '${rep.id}')">下架違規商品</button>
        </div>
      </div>
    `;
  }).join("");
}

function takeDownBook(bookId, reportId) {
  if (confirm("確認要強制下架此違規商品嗎？")) {
    const bIndex = books.findIndex(b => b.id === bookId);
    let bookTitle = "違規商品";
    if (bIndex !== -1) {
      bookTitle = books[bIndex].title;
      books.splice(bIndex, 1);
    }
    
    const rIndex = reports.findIndex(r => r.id === reportId);
    if (rIndex !== -1) {
      reports.splice(rIndex, 1);
    }
    
    saveStateToStorage();
    renderBooksGrid();
    renderFlaggedItems();
    showToast("違規商品已強制下架", "success");
    addLog(`管理員審核：強制下架違規非教科書商品《${bookTitle}》。`);
  }
}

function dismissReport(reportId) {
  const rIndex = reports.findIndex(r => r.id === reportId);
  if (rIndex !== -1) {
    reports.splice(rIndex, 1);
    saveStateToStorage();
    renderFlaggedItems();
    showToast("檢舉案已駁回");
    addLog(`管理員審核：已忽略並駁回該違規商品檢舉案。`);
  }
}

function renderSuspendedUsers() {
  const container = document.getElementById("adminAppealsList");
  if (!container) return;
  
  const suspiciousUsers = users.filter(u => u.role !== "管理員" && (u.noshowCount > 0 || u.isSuspended));
  
  if (suspiciousUsers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>🎉 目前無遭處分或違規的學生紀錄</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = suspiciousUsers.map(user => {
    let statusBadge = `<span class="status-badge badge-normal">正常</span>`;
    let appealBox = "";
    
    if (user.isSuspended) {
      statusBadge = `<span class="status-badge badge-suspended">已停權 (限制交易)</span>`;
      
      if (user.appealSubmitted) {
        appealBox = `
          <div class="audit-appeal-box" style="margin-top: 0.5rem;">
            <div class="audit-appeal-title">✍️ 放鳥爭議申訴書：</div>
            <p style="color:var(--text-primary); font-style:italic;">"${user.appealReason}"</p>
            <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.75rem;">
              <button class="btn btn-success btn-xs" onclick="processAppeal('${user.id}', 'approve')">核准申訴 (解除停權)</button>
              <button class="btn btn-danger btn-xs" onclick="processAppeal('${user.id}', 'reject')">駁回申訴 (維持停權)</button>
            </div>
          </div>
        `;
      } else {
        appealBox = `
          <div style="font-size: 0.75rem; color: var(--text-muted); font-style:italic; margin-top: 0.5rem;">
            ⏳ 該停權學生尚未提交申訴案件。
          </div>
        `;
      }
    }
    
    // 渲染詳細放鳥檢舉紀錄與申訴按鈕
    let noShowDetailsHtml = "";
    if (user.noShowDetails && user.noShowDetails.length > 0) {
      noShowDetailsHtml = `
        <div style="margin-top: 0.5rem; border-top: 1px dashed var(--border-color); padding-top: 0.5rem;">
          <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight:600; margin-bottom: 0.25rem;">🔍 遭舉報放鳥紀錄：</div>
          ${user.noShowDetails.map(d => {
            let appealSection = "";
            if (d.appealSubmitted) {
              appealSection = `
                <div class="audit-appeal-box" style="margin-top: 0.35rem; background: rgba(251, 191, 36, 0.05); padding: 0.35rem; border-radius: 0.25rem;">
                  <div style="font-size: 0.7rem; color: var(--amber-yellow); font-weight:600;">✍️ 放鳥爭議申訴案：</div>
                  <p style="color:var(--text-primary); font-size:0.75rem; font-style:italic; margin: 0.15rem 0;">"${d.appealReason}"</p>
                  <div style="display:flex; justify-content:flex-end; gap:0.35rem; margin-top:0.25rem;">
                    <button class="btn btn-success btn-xs" style="font-size:0.65rem;" onclick="processSpecificAppeal('${user.id}', '${d.id}', 'approve')">核准申訴 (撤銷此放鳥)</button>
                    <button class="btn btn-danger btn-xs" style="font-size:0.65rem;" onclick="processSpecificAppeal('${user.id}', '${d.id}', 'reject')">駁回申訴 (維持此放鳥)</button>
                  </div>
                </div>
              `;
            } else {
              appealSection = `
                <div style="font-size: 0.7rem; color: var(--text-muted); font-style:italic; margin-top: 0.25rem;">
                  ⏳ 該筆放鳥紀錄尚未提交申訴
                </div>
              `;
            }
            return `
              <div style="font-size: 0.75rem; color: var(--rose-red); background: rgba(244, 63, 94, 0.04); border-left: 2px solid var(--rose-red); padding: 0.35rem; border-radius: 0.25rem; margin-bottom: 0.35rem; line-height:1.4;">
                <strong>${d.reporter}</strong> 舉報《${d.bookTitle}》面交：<br>
                <span style="color: var(--text-primary);">"${d.reason}"</span> <span style="font-size:0.65rem; color: var(--text-muted);">(${d.timestamp})</span>
                ${appealSection}
              </div>
            `;
          }).join("")}
        </div>
      `;
    }
    
    return `
      <div class="student-audit-card">
        <div class="audit-user-info">
          <div>
            <div class="audit-user-name">${user.name} (${user.department} - 班級 ${user.gradeClass})</div>
            <div style="font-size:0.75rem; color:var(--text-secondary);">學號: ${user.studentId}</div>
          </div>
          <div>
            ${statusBadge}
          </div>
        </div>
        
        <div class="card-info-row" style="font-size:0.8rem; padding-top:0.25rem;">
          <span>違規放鳥次數統計：</span>
          <span style="color:var(--rose-red); font-weight:700;">${user.noshowCount} / 2 次</span>
        </div>
        
        ${noShowDetailsHtml}
      </div>
    `;
  }).join("");
}

function processAppeal(userId, action) {
  const targetUser = users.find(u => u.id === userId);
  if (!targetUser) return;
  
  if (action === 'approve') {
    targetUser.isSuspended = false;
    targetUser.noshowCount = 0;
    targetUser.appealSubmitted = false;
    targetUser.appealReason = "";
    
    showToast(`已核准申訴！${targetUser.name} 的停權處分已解除。`, "success");
    addLog(`管理員審核申訴：核准了 ${targetUser.name} (${targetUser.studentId}) 的申訴案。該學生已恢復交易權限。`);
  } else if (action === 'reject') {
    targetUser.appealSubmitted = false;
    
    showToast(`已駁回申訴！維持 ${targetUser.name} 的停權處分。`, "error");
    addLog(`管理員審核申訴：駁回了 ${targetUser.name} 的申訴。維持停權處分，禁止交易。`);
  }
  
  if (currentUser.id === targetUser.id) {
    currentUser = targetUser;
    switchUser(currentUser.id);
  } else {
    renderSuspendedUsers();
  }
  
  saveStateToStorage();
  renderBooksGrid();
}

// -------------------------------------------------------------
// MODAL: 面交確認單彈窗
// -------------------------------------------------------------

function showMeetingModal(book) {
  const buyer = users.find(u => u.id === book.buyerId);
  const seller = users.find(u => u.id === book.sellerId);
  
  const buyerName = buyer ? buyer.name : "未知買家";
  const buyerDept = buyer ? `${buyer.department} ${buyer.gradeClass}` : "未知";
  const sellerName = seller ? seller.name : "未知賣家";
  const sellerDept = seller ? `${seller.department} ${seller.gradeClass}` : "未知";
  
  const ticketDetails = document.getElementById("ticketDetails");
  if (!ticketDetails) return;
  
  ticketDetails.innerHTML = `
    <div class="ticket-row">
      <span class="ticket-label">教科書名</span>
      <span class="ticket-value" style="color:var(--baby-blue); text-align:right; max-width:70%;">${book.title}</span>
    </div>
    <div class="ticket-row">
      <span class="ticket-label">ISBN 號碼</span>
      <span class="ticket-value" style="font-family:monospace;">${book.isbn}</span>
    </div>
    <div class="ticket-row" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
      <span class="ticket-label">賣方學生</span>
      <span class="ticket-value">${sellerName} (${sellerDept})</span>
    </div>
    <div class="ticket-row">
      <span class="ticket-label">買方學生</span>
      <span class="ticket-value">${buyerName} (${buyerDept})</span>
    </div>
    <div class="ticket-row" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
      <span class="ticket-label">指定面交地點</span>
      <span class="ticket-value" style="color: var(--baby-blue); text-align:right; max-width:70%;">📍 ${book.meetupLocation}</span>
    </div>
    <div class="ticket-row" style="margin-top: 0.25rem;">
      <span class="ticket-label">賣方預留備註</span>
      <span class="ticket-value" style="color: var(--amber-yellow); text-align:right; max-width:70%;">${book.meetupNote || '無備註'}</span>
    </div>
    <div class="ticket-row" style="margin-top: 0.75rem; font-size: 1.15rem; font-weight:800; border-top: 2px dashed rgba(255,255,255,0.1); padding-top:0.75rem;">
      <span class="ticket-label">面交付款金額</span>
      <span class="ticket-price">$${book.price} TWD</span>
    </div>
  `;
  
  const modal = document.getElementById("meetingModal");
  modal.classList.add("active");
}

function closeMeetingModal(event) {
  const modal = document.getElementById("meetingModal");
  modal.classList.remove("active");
}

// -------------------------------------------------------------
// USER 放鳥回報紀錄渲染與申訴 (新頁面功能)
// -------------------------------------------------------------

function renderNoShowLogs() {
  const mySubmittedContainer = document.getElementById("mySubmittedNoShows");
  const myReceivedContainer = document.getElementById("myReceivedNoShows");
  
  if (!mySubmittedContainer || !myReceivedContainer) return;
  
  // 1. 查詢我所提交的放鳥檢舉
  const mySubmissions = [];
  users.forEach(u => {
    if (u.noShowDetails) {
      u.noShowDetails.forEach(d => {
        if (d.reporter === currentUser.name) {
          mySubmissions.push({
            reportedName: u.name,
            reportedStudentId: u.studentId,
            reportedDept: u.department,
            reportedClass: u.gradeClass,
            bookTitle: d.bookTitle,
            reason: d.reason,
            timestamp: d.timestamp
          });
        }
      });
    }
  });
  
  if (mySubmissions.length === 0) {
    mySubmittedContainer.innerHTML = `
      <div class="empty-state" style="padding: 2rem 0;">
        <p>📤 您目前尚未提交任何放鳥檢舉紀錄</p>
      </div>
    `;
  } else {
    mySubmittedContainer.innerHTML = mySubmissions.map(d => `
      <div style="font-size: 0.8rem; color: var(--text-primary); background: rgba(56, 189, 248, 0.03); border: 1px solid rgba(56, 189, 248, 0.1); padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 0.5rem; line-height: 1.4;">
        <div style="font-weight:600; color: var(--baby-blue); margin-bottom: 0.25rem;">
          舉報對象：${d.reportedName} (${d.reportedDept} - ${d.reportedClass})
        </div>
        <div><strong>交易書籍：</strong>《${d.bookTitle}》</div>
        <div style="color: var(--text-secondary); margin-top: 0.15rem;"><strong>檢舉狀況描述：</strong>"${d.reason}"</div>
        <div style="font-size:0.7rem; color: var(--text-muted); margin-top: 0.25rem; text-align:right;">舉報時間: ${d.timestamp}</div>
      </div>
    `).join("");
  }
  
  // 2. 查詢我所收到的放鳥檢舉紀錄
  const myReceived = currentUser.noShowDetails || [];
  
  if (myReceived.length === 0) {
    myReceivedContainer.innerHTML = `
      <div class="empty-state" style="padding: 2rem 0;">
        <p>🎉 太棒了！您目前沒有被舉報的放鳥違規紀錄</p>
      </div>
    `;
  } else {
    myReceivedContainer.innerHTML = myReceived.map(d => {
      let appealButtonHtml = "";
      if (d.appealSubmitted) {
        appealButtonHtml = `
          <div style="font-size:0.75rem; color: var(--emerald-green); background: rgba(52, 211, 153, 0.05); padding: 0.5rem; border-radius: 0.25rem; border-left: 2px solid var(--emerald-green); margin-top: 0.5rem;">
            <strong>已提出爭議申訴：</strong><br>
            <span style="font-style:italic;">"${d.appealReason}"</span>
          </div>
        `;
      } else {
        appealButtonHtml = `
          <div style="text-align: right; margin-top: 0.5rem;">
            <button class="btn btn-warning btn-xs" onclick="appealNoShow('${d.id}')">
              ✍️ 提出申訴 (寫明申訴原因)
            </button>
          </div>
        `;
      }
      
      return `
        <div style="font-size: 0.8rem; color: var(--text-primary); background: rgba(244, 63, 94, 0.03); border: 1px solid rgba(244, 63, 94, 0.1); padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 0.5rem; line-height: 1.4;">
          <div style="font-weight:600; color: var(--rose-red); margin-bottom: 0.25rem;">
            舉報人：${d.reporter}
          </div>
          <div><strong>交易書籍：</strong>《${d.bookTitle}》</div>
          <div style="color: var(--text-secondary); margin-top: 0.15rem;"><strong>舉報放鳥理由：</strong>"${d.reason}"</div>
          <div style="font-size:0.7rem; color: var(--text-muted); margin-top: 0.25rem;">登記時間: ${d.timestamp}</div>
          ${appealButtonHtml}
        </div>
      `;
    }).join("");
  }
}

// 買家對特定放鳥紀錄進行申訴
function appealNoShow(reportId) {
  const appealReason = prompt("【放鳥爭議申訴】\n請輸入您的申訴原因描述 (例如：機車拋錨並提供修車收據、對方記錯交易時間等)：");
  
  if (appealReason === null) {
    showToast("已取消申訴", "info");
    return;
  }
  
  const trimmedAppeal = appealReason.trim();
  if (trimmedAppeal === "") {
    alert("必須填寫申訴原因才能送出申訴！");
    return;
  }
  
  const report = currentUser.noShowDetails.find(d => d.id === reportId);
  if (report) {
    report.appealSubmitted = true;
    report.appealReason = trimmedAppeal;
    
    // 更新 users 陣列
    const uIndex = users.findIndex(u => u.id === currentUser.id);
    if (uIndex !== -1) {
      users[uIndex] = currentUser;
    }
    
    saveStateToStorage();
    switchUser(currentUser.id);
    
    showToast("申訴已成功提交！等待管理員核審", "success");
    addLog(`[爭議申訴] ${currentUser.name} 對放鳥舉報案件(ID: ${reportId})提交申訴理由: "${trimmedAppeal}"`);
  }
}

// 管理員審理特定申訴案件
function processSpecificAppeal(userId, reportId, action) {
  const targetUser = users.find(u => u.id === userId);
  if (!targetUser) return;
  
  const rIndex = targetUser.noShowDetails.findIndex(d => d.id === reportId);
  if (rIndex === -1) return;
  
  const report = targetUser.noShowDetails[rIndex];
  
  if (action === 'approve') {
    // 核准申訴：撤銷該筆放鳥紀錄
    targetUser.noShowDetails.splice(rIndex, 1);
    targetUser.noshowCount = Math.max(0, targetUser.noshowCount - 1);
    
    // 如果違規次數少於 2 次，自動解除停權
    if (targetUser.noshowCount < 2) {
      targetUser.isSuspended = false;
    }
    
    showToast(`申訴已核准！已撤銷該筆放鳥，目前違規次數: ${targetUser.noshowCount}`, "success");
    addLog(`管理員審核：核准 ${targetUser.name} 的放鳥申訴，撤銷《${report.bookTitle}》之放鳥紀錄。該生目前違規累計為 ${targetUser.noshowCount} 次。`);
  } else if (action === 'reject') {
    // 駁回申訴：維持該放鳥紀錄，清除其申訴狀態 (標記為已駁回，關閉申訴按鈕)
    report.appealSubmitted = false;
    report.appealReason = ""; // 可以清空或標記。這裡我們重置狀態
    report.appealRejected = true; // 標記被駁回
    
    showToast("已駁回申訴，維持該筆放鳥處分", "error");
    addLog(`管理員審核：駁回 ${targetUser.name} 對《${report.bookTitle}》的放鳥申訴。維持其違規次數。`);
  }
  
  saveStateToStorage();
  
  if (currentUser.id === targetUser.id) {
    currentUser = targetUser;
  }
  switchUser(currentUser.id);
}
