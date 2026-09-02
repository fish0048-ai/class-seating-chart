window.SEAT_CONFIG = {
  // 把 Apps Script「網頁應用程式」網址貼在這裡（結尾是 /exec）
  // 寫進這個檔案後，平板和筆電打開同一個網頁都會自動連上雲端
  apiUrl: 'https://script.google.com/macros/s/AKfycbwIYM_8utJmG48nzk20YHfepKQIinKZqS2GDXd_v1Ylh9YU4OR-UbgxXrjRrIax43-T/exec',
  // 座位、加扣分、成績資料庫（會寫入）
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1AES93Jv8l65YI2LQ-scVRPqYSLFxtVOD-UqIU99gQSA/edit',
  // 上課課表（只顯示，不寫成績）
  timetableUrl: 'https://docs.google.com/spreadsheets/d/13VrWBx6hoKpUON_JNxIrynH_gyRV8HnhUt0MMscjkWg/edit',
  timetableId: '13VrWBx6hoKpUON_JNxIrynH_gyRV8HnhUt0MMscjkWg',
  // Google Cloud「網頁應用程式」OAuth 用戶端 ID。授權的 JavaScript 來源請加：
  // https://fish0048-ai.github.io
  googleClientId: '556988999591-tc3b8orn6ov3guinfiq5p0c9u6g0n802.apps.googleusercontent.com',
  // 這些帳號登入後才是教師（可改資料、進教師模式）。其餘帳號只能看。
  teacherEmails: ['chunhsinkuo@kcis.hc.edu.tw']
};
