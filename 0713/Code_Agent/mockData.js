// 預設模擬資料庫資料，用於初始化 LocalStorage
const defaultBooks = [
  {
    id: "book-001",
    title: "系統分析與設計 (Systems Analysis and Design)",
    instructor: "張教授",
    version: "第 10 版",
    isbn: "9789861548234",
    condition: "九成新 (僅些微原子筆畫線)",
    price: 450,
    meetupLocation: "商管大樓 B301 教室旁",
    meetupNote: "週一中午 12:10，我會穿白 T-shirt 與深藍色牛仔褲，手拿黃色提袋。",
    status: "上架中", // 上架中, 已預訂, 已售出
    sellerId: "student-02", // 林小美
    buyerId: null,
    coverColor: "linear-gradient(135deg, #4f46e5, #c084fc)", // 漸層色代替圖片
    imageSeed: "sad"
  },
  {
    id: "book-002",
    title: "資料庫系統原理 (Fundamentals of Database Systems)",
    instructor: "陳教授",
    version: "第 7 版",
    isbn: "9789863412589",
    condition: "八成新 (有鉛筆筆記與螢光筆劃記)",
    price: 380,
    meetupLocation: "圖書館二樓自習室門口",
    meetupNote: "週四下午 2:00，我穿黃色短袖、戴黑框眼鏡。",
    status: "上架中",
    sellerId: "student-02", // 林小美
    buyerId: null,
    coverColor: "linear-gradient(135deg, #0d9488, #2dd4bf)",
    imageSeed: "db"
  },
  {
    id: "book-003",
    title: "演算法概論 (Introduction to Algorithms)",
    instructor: "王老師",
    version: "第 3 版",
    isbn: "9789865034823",
    condition: "全新 (完全無劃記，買錯課本)",
    price: 650,
    meetupLocation: "校門口全家便利商店",
    meetupNote: "週五早上 9:00，我騎白色機車停在全家門口，安全帽是亮橘色。",
    status: "上架中",
    sellerId: "student-04", // 賣家D
    buyerId: null,
    coverColor: "linear-gradient(135deg, #ea580c, #fde047)",
    imageSeed: "algo"
  },
  {
    id: "book-004",
    title: "微積分 (Calculus: Early Transcendentals)",
    instructor: "李教授",
    version: "第 8 版",
    isbn: "9789869283712",
    condition: "五成新 (外皮磨損，內頁無缺，塗寫較多)",
    price: 250,
    meetupLocation: "體育館一樓售票處",
    meetupNote: "週二下午 4:30 體育課後，我會穿紅色運動外套、黑色運動長褲。",
    status: "已預約", // 初始已被預約以展示狀態
    sellerId: "student-02",
    buyerId: "student-01", // 預約者為 陳大文 (買家A)
    meetupTime: "2026-07-15 12:10",
    coverColor: "linear-gradient(135deg, #dc2626, #fca5a5)",
    imageSeed: "calc"
  },
  {
    id: "book-005",
    title: "二手USB電風扇 (非教科書違規商品)",
    instructor: "無",
    version: "無",
    isbn: "0000000000000",
    condition: "九成新",
    price: 150,
    meetupLocation: "商管大樓前",
    meetupNote: "隨時可面交，穿黑衣服。",
    status: "上架中",
    sellerId: "student-05", // 違規學生
    buyerId: null,
    coverColor: "linear-gradient(135deg, #4b5563, #9ca3af)",
    imageSeed: "fan"
  }
];

const defaultUsers = [
  {
    id: "student-01",
    name: "陳大文",
    studentId: "411730001",
    password: "123",
    department: "資訊管理學系",
    gradeClass: "A",
    role: "學生",
    noshowCount: 0,
    isSuspended: false,
    appealSubmitted: false,
    appealReason: "",
    noShowDetails: []
  },
  {
    id: "student-02",
    name: "林小美",
    studentId: "411730002",
    password: "123",
    department: "資訊管理學系",
    gradeClass: "B",
    role: "學生",
    noshowCount: 0,
    isSuspended: false,
    appealSubmitted: false,
    appealReason: "",
    noShowDetails: []
  },
  {
    id: "student-03",
    name: "黃小明",
    studentId: "411730003",
    password: "123",
    department: "資訊工程學系",
    gradeClass: "A",
    role: "學生",
    noshowCount: 1,
    isSuspended: false,
    appealSubmitted: false,
    appealReason: "",
    noShowDetails: [
      {
        id: "noshow-01",
        reporter: "林小美",
        bookTitle: "系統分析與設計",
        reason: "約在商管大樓等了20分鐘沒來，傳簡訊說記錯日期了。",
        timestamp: "10:14:05",
        appealSubmitted: false,
        appealReason: ""
      }
    ]
  },
  {
    id: "student-04",
    name: "李小華",
    studentId: "411730004",
    password: "123",
    department: "國際企業學系",
    gradeClass: "B",
    role: "學生",
    noshowCount: 0,
    isSuspended: false,
    appealSubmitted: false,
    appealReason: "",
    noShowDetails: []
  },
  {
    id: "student-05",
    name: "王大鎚",
    studentId: "411730005",
    password: "123",
    department: "電機工程學系",
    gradeClass: "A",
    role: "學生",
    noshowCount: 2,
    isSuspended: true,
    appealSubmitted: true,
    appealReason: "上次因為機車爆胎，在修車廠修理無法前往，並非惡意放鳥，請管理員通融解除停權，謝謝！",
    noShowDetails: [
      {
        id: "noshow-02",
        reporter: "林小美",
        bookTitle: "系統分析與設計",
        reason: "到了約定時間30分鐘後都聯絡不上，訊息也不回，電話也沒接。",
        timestamp: "10:11:05",
        appealSubmitted: true,
        appealReason: "當天出發面交時機車突然爆胎，在修車廠修理無法前往，並非惡意放鳥。"
      },
      {
        id: "noshow-03",
        reporter: "陳大文",
        bookTitle: "資料庫系統原理",
        reason: "在自習室等了20分鐘，對方傳簡訊說臨時要開會就不來了，直接放鳥。",
        timestamp: "10:12:10",
        appealSubmitted: false,
        appealReason: ""
      }
    ]
  },
  // 系統管理員成員
  {
    id: "admin-411100547",
    name: "廖語涵 (系統管理員)",
    studentId: "411100547",
    password: "yuhan0501",
    department: "日本語文學系",
    gradeClass: "C",
    role: "管理員",
    noshowCount: 0,
    isSuspended: false,
    appealSubmitted: false,
    appealReason: "",
    noShowDetails: []
  },
  {
    id: "admin-413638189",
    name: "吳宇庭 (系統管理員)",
    studentId: "413638189",
    password: "admin",
    department: "系統管理人員",
    gradeClass: "A",
    role: "管理員",
    noshowCount: 0,
    isSuspended: false,
    appealSubmitted: false,
    appealReason: "",
    noShowDetails: []
  },
  {
    id: "admin-410631633",
    name: "黃鈺棋 (系統管理員)",
    studentId: "410631633",
    password: "admin",
    department: "系統管理人員",
    gradeClass: "B",
    role: "管理員",
    noshowCount: 0,
    isSuspended: false,
    appealSubmitted: false,
    appealReason: "",
    noShowDetails: []
  }
];

const defaultReports = [
  {
    id: "report-001",
    reporterName: "林小美",
    reportedBookId: "book-005",
    reportedBookTitle: "二手USB電風扇 (非教科書違規商品)",
    reason: "販售非教科書之雜物，違反平台規範 (限教科書上架)",
    timestamp: "2026-07-12 18:30"
  }
];

// 初始化資料庫
function initMockDatabase() {
  // 強制清除歷史以重新載入設定
  localStorage.removeItem("sad_books");
  localStorage.removeItem("sad_users");
  localStorage.removeItem("sad_reports");
  localStorage.removeItem("sad_logs");
  
  if (!localStorage.getItem("sad_books")) {
    localStorage.setItem("sad_books", JSON.stringify(defaultBooks));
  }
  if (!localStorage.getItem("sad_users")) {
    localStorage.setItem("sad_users", JSON.stringify(defaultUsers));
  }
  if (!localStorage.getItem("sad_reports")) {
    localStorage.setItem("sad_reports", JSON.stringify(defaultReports));
  }
  if (!localStorage.getItem("sad_logs")) {
    localStorage.setItem("sad_logs", JSON.stringify([
      { time: "10:10:00", text: "系統資料庫初始化成功。" },
      { time: "10:12:15", text: "王大鎚 因累計放鳥 2 次被系統自動停權。" },
      { time: "10:13:30", text: "王大鎚 提交了停權申訴，待管理員審核。" }
    ]));
  }
}
