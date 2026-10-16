/* =========================================================
   Supabase 연결 정보
   Supabase 대시보드 → Project Settings → API 에서 복사해 넣으세요.
   (anon/publishable 키는 공개되어도 괜찮은 키입니다. service_role 키는 절대 넣지 마세요)

   청첩장 기본 내용은 data/default-config.json 에 있습니다.
   관리자 페이지에서 한 번이라도 저장하면 그 내용이 우선 적용됩니다.
   ========================================================= */
window.SUPABASE_URL = "https://zlkyfjkuexohbzmhlcop.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_Y-7Sz2ONw6OVO0Yu8e6SaA_LxpJXgiL";

/* 공용: Supabase 클라이언트 (연결 정보가 없으면 null) */
window.sb = (window.supabase && !window.SUPABASE_URL.startsWith("YOUR_"))
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;
