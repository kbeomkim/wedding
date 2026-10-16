/* =========================================================
   1) Supabase 연결 정보
   Supabase 대시보드 → Project Settings → API 에서 복사해 넣으세요.
   (anon/publishable 키는 공개되어도 괜찮은 키입니다. service_role 키는 절대 넣지 마세요)
   ========================================================= */
window.SUPABASE_URL = "https://zlkyfjkuexohbzmhlcop.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_Y-7Sz2ONw6OVO0Yu8e6SaA_LxpJXgiL";

/* =========================================================
   2) 기본값
   관리자 페이지에서 한 번이라도 저장하면 그 내용이 우선 적용됩니다.
   Supabase를 연결하기 전에는 이 값으로 청첩장이 보입니다.
   ========================================================= */
window.DEFAULT_CONFIG = {
  groom: { name: "김민준", phone: "010-0000-0000",
           father: "김철수", mother: "박영희", relation: "장남",
           fatherPhone: "010-0000-0000", motherPhone: "010-0000-0000" },
  bride: { name: "이서연", phone: "010-0000-0000",
           father: "이영호", mother: "최미경", relation: "장녀",
           fatherPhone: "010-0000-0000", motherPhone: "010-0000-0000" },

  // 예식 일시 (한국 시간)
  date: "2027-05-15T12:30:00+09:00",

  venue: {
    name: "그랜드웨딩홀",
    hall: "3층 그랜드볼룸",
    address: "서울특별시 강남구 테헤란로 123",
    tel: "02-000-0000",
    mapQuery: "서울특별시 강남구 테헤란로 123",
  },

  greeting: `서로 다른 길을 걸어온 두 사람이
이제 같은 길을 함께 걸어가려 합니다.

저희의 새로운 시작을
가까이에서 축복해 주시면
더없는 기쁨으로 간직하겠습니다.`,

  transport: [
    { title: "지하철", desc: "2호선 강남역 3번 출구 도보 5분" },
    { title: "버스", desc: "강남역 정류장 하차\n간선 140, 144, 145 / 지선 4412" },
    { title: "주차", desc: "건물 지하 주차장 2시간 무료" },
  ],

  coverImage: "images/cover.jpg",
  gallery: [
    "images/01.jpg", "images/02.jpg", "images/03.jpg",
    "images/04.jpg", "images/05.jpg", "images/06.jpg",
    "images/07.jpg", "images/08.jpg", "images/09.jpg",
  ],

  accounts: {
    groom: [
      { role: "신랑", name: "김민준", bank: "국민은행", number: "000000-00-000000" },
      { role: "신랑 아버지", name: "김철수", bank: "신한은행", number: "000-000-000000" },
      { role: "신랑 어머니", name: "박영희", bank: "우리은행", number: "0000-000-000000" },
    ],
    bride: [
      { role: "신부", name: "이서연", bank: "카카오뱅크", number: "3333-00-0000000" },
      { role: "신부 아버지", name: "이영호", bank: "하나은행", number: "000-000000-00000" },
      { role: "신부 어머니", name: "최미경", bank: "농협", number: "000-0000-0000-00" },
    ],
  },
};

/* 공용: Supabase 클라이언트 (연결 정보가 없으면 null) */
window.sb = (window.supabase && !window.SUPABASE_URL.startsWith("YOUR_"))
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;
