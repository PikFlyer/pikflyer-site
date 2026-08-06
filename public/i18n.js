(() => {
  "use strict";

  const STORAGE_KEY = "pikflyer.language";
  const LEGACY_STORAGE_KEY = "pikflyer-lang";
  const SUPPORTED = new Set(["zh-TW", "en", "ja", "ko"]);
  const HTML_LANG = { "zh-TW": "zh-Hant", en: "en", ja: "ja", ko: "ko" };
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();

  const copy = {
    "Pik Flyer - 小翅膀 Android — 免費試用下載": { en: "Pik Flyer for Android — Free Trial Download", ja: "Pik Flyer Android版 — 無料体験ダウンロード", ko: "Pik Flyer Android — 무료 체험 다운로드" },
    "Pik Flyer - 小翅膀 Android 免費版。和朋友一起骰漂亮明信片、到國外找美景，忙碌或天氣太熱時也能在家安排 18 km/h 城市散步。前 7 天完整體驗；第 8 天後仍可每天基本次數使用。": { en: "Pik Flyer for Android helps you discover postcard-worthy places, plan city routes, and share finds with friends. Enjoy seven days of high-usage access, followed by a free daily basic allowance.", ja: "Pik Flyer Android版なら、ポストカードにしたい場所を探し、街歩きルートを作り、友だちと発見を共有できます。最初の7日間はたっぷり体験でき、8日目以降も毎日の無料基本枠を利用できます。", ko: "Pik Flyer Android로 엽서처럼 멋진 장소를 찾고, 도시 경로를 만들고, 친구와 발견을 공유하세요. 첫 7일은 넉넉하게 체험하고 8일째부터도 매일 기본 무료 사용량을 이용할 수 있습니다." },
    "主選單": { en: "Main navigation", ja: "メインナビゲーション", ko: "주요 메뉴" },
    "Languages": { "zh-TW": "語言", en: "Languages", ja: "言語", ko: "언어" },
    "日常情境": { en: "Everyday life", ja: "日常シーン", ko: "일상 상황" },
    "玩法": { en: "Ways to use", ja: "使い方", ko: "활용법" },
    "特色": { en: "Features", ja: "機能", ko: "기능" },
    "使用情境": { en: "Use cases", ja: "利用シーン", ko: "사용 상황" },
    "地標": { en: "Places", ja: "スポット", ko: "장소" },
    "安裝教學": { en: "Setup guide", ja: "設定ガイド", ko: "설치 가이드" },
    "免費試用": { en: "Free trial", ja: "無料体験", ko: "무료 체험" },
    "下載 Android": { en: "Download for Android", ja: "Android版をダウンロード", ko: "Android 다운로드" },
    "Pik Flyer - 小翅膀 · 7 天完整體驗，之後仍可免費基本使用": { en: "Pik Flyer · 7 days of high-usage access, then free basic use", ja: "Pik Flyer · 7日間たっぷり体験、その後も基本機能は無料", ko: "Pik Flyer · 7일 넉넉한 체험 후에도 기본 기능 무료" },
    "在家，也能": { en: "See the world,", ja: "家にいながら、", ko: "집에서도," },
    "行": { en: "from", ja: "世界を", ko: "세계를" },
    "萬里路。": { en: "home.", ja: "歩こう。", ko: "걸어보세요." },
    "台灣叫「小翅膀」，海外叫 Pik Flyer": { en: "Pik Flyer makes everyday exploration easier", ja: "Pik Flyerで、毎日の探索をもっと気軽に", ko: "Pik Flyer로 일상의 탐험을 더 가볍게" },
    "會飛也會走。和朋友一起骰明信片、找國外美景、排城市散步": { en: "Discover postcard spots, explore beautiful places, and plan city routes with friends", ja: "ポストカードスポットや海外の景色を探し、友だちと街歩きルートを楽しめます", ko: "엽서 장소와 해외 명소를 찾고 친구와 도시 경로를 즐겨보세요" },
    "附近的香菇看膩了？今天很忙忘了種花？天氣太熱不想出門？小翅膀把超過 6 萬筆自建 POI 地標庫、明信片骰子、自動散步與懸浮視窗放進手機。和朋友一起分享今天骰到的國外美景，在家也能有新的城市話題。": { en: "Tired of seeing the same nearby places? Too busy to keep up, or staying in because of the weather? Pik Flyer puts 60,000+ curated POIs, postcard discovery, automatic city routes, and floating controls on your phone. Share today's beautiful find with friends and bring a little more discovery into everyday life.", ja: "近所の景色に飽きた日、忙しくて時間がない日、暑さや雨で外に出たくない日も。Pik Flyerなら、6万件以上の独自POI、ポストカードスポット、街歩きルート、フローティング操作をスマホひとつで使えます。今日見つけた景色を友だちと共有して、日常に小さな旅を増やせます。", ko: "늘 보던 주변 장소가 지겹거나, 바빠서 시간을 내기 어렵거나, 날씨 때문에 밖에 나가기 싫은 날에도 괜찮아요. Pik Flyer는 6만 개 이상의 자체 POI, 엽서 장소 찾기, 자동 도시 경로, 플로팅 컨트롤을 휴대폰에 담았습니다. 오늘 발견한 멋진 장소를 친구와 공유하며 일상에 작은 여행을 더해보세요." },
    "Android 下載": { en: "Android download", ja: "Android版ダウンロード", ko: "Android 다운로드" },
    "免費下載 Android 版": { en: "Download Android free", ja: "Android版を無料ダウンロード", ko: "Android 무료 다운로드" },
    "看安裝教學": { en: "View setup guide", ja: "設定ガイドを見る", ko: "설치 가이드 보기" },
    "最新版 2.0.12": { en: "Latest version 2.0.12", ja: "最新バージョン 2.0.12", ko: "최신 버전 2.0.12" },
    "更新日期 2026/08/06 · Android APK 6.4 MB": { en: "Updated 2026/08/06 · Android APK 6.4 MB", ja: "更新日 2026/08/06 · Android APK 6.4 MB", ko: "업데이트 2026/08/06 · Android APK 6.4 MB" },
    "不是只能用 7 天：之後仍有免費基本次數": { en: "Not just seven days: free basic use continues", ja: "7日間だけではありません：その後も無料基本枠あり", ko: "7일 후에도 기본 무료 사용량이 계속됩니다" },
    "免費試用每日限制": { en: "Daily free trial allowance", ja: "無料体験の1日あたり利用枠", ko: "무료 체험 일일 사용량" },
    "免費": { en: "Free", ja: "無料", ko: "무료" },
    "7 天後仍可基本使用": { en: "Basic use continues after day 7", ja: "8日目以降も基本利用可能", ko: "7일 후에도 기본 사용 가능" },
    "次傳送 / 每天": { en: "teleports / day", ja: "回テレポート / 日", ko: "회 이동 / 일" },
    "次骰子 / 每天": { en: "rolls / day", ja: "回ルーレット / 日", ko: "회 주사위 / 일" },
    "次散步 / 每天": { en: "city routes / day", ja: "回街歩き / 日", ko: "회 도시 산책 / 일" },
    "前 7 天完整體驗；第 8 天後自動變成免費基本版，每天仍可使用 10 次傳送、15 次骰子、1 次城市散步，浮窗也保留。需要更高額度再訂閱 US$4.99 / 月。": { en: "Enjoy full access for the first seven days. From day 8, the free basic plan includes 10 teleports, 15 rolls, one city route per day, and floating controls. Upgrade to US$4.99/month only when you need more.", ja: "最初の7日間はフル体験。8日目以降は無料基本版に切り替わり、1日10回のテレポート、15回のルーレット、1回の街歩き、フローティング操作を利用できます。さらに必要なときだけ月額US$4.99でアップグレードできます。", ko: "첫 7일은 전체 기능을 체험할 수 있습니다. 8일째부터 무료 기본 플랜으로 전환되어 하루 10회 이동, 15회 주사위, 1회 도시 산책과 플로팅 컨트롤을 이용할 수 있습니다. 더 필요할 때만 월 US$4.99로 업그레이드하세요." },
    "真實世界地標 slideshow": { en: "Real-world place slideshow", ja: "世界のスポットスライドショー", ko: "세계 명소 슬라이드쇼" },
    "埃及金字塔": { en: "Pyramids of Giza", ja: "ギザのピラミッド", ko: "기자 피라미드" },
    "沙漠 · 世界級明信片": { en: "desert · iconic postcard", ja: "砂漠 · 世界級ポストカード", ko: "사막 · 세계적인 엽서 명소" },
    "東京晴空塔": { en: "Tokyo Skytree", ja: "東京スカイツリー", ko: "도쿄 스카이트리" },
    "高塔 · 都市夜景": { en: "tower · city night view", ja: "タワー · 都市夜景", ko: "타워 · 도시 야경" },
    "澀谷路口": { en: "Shibuya Crossing", ja: "渋谷スクランブル交差点", ko: "시부야 스크램블 교차로" },
    "東京 · 城市明信片": { en: "Tokyo · city postcard", ja: "東京 · 街のポストカード", ko: "도쿄 · 도시 엽서" },
    "冰島極光": { en: "Iceland Aurora", ja: "アイスランドのオーロラ", ko: "아이슬란드 오로라" },
    "極光 · 壯麗景點": { en: "aurora · dramatic landscape", ja: "オーロラ · 壮大な景色", ko: "오로라 · 장엄한 풍경" },
    "東京鐵塔": { en: "Tokyo Tower", ja: "東京タワー", ko: "도쿄 타워" },
    "夜景 · 明信片骰子": { en: "night view · postcard discovery", ja: "夜景 · ポストカード探し", ko: "야경 · 엽서 장소 찾기" },
    "富士山": { en: "Mount Fuji", ja: "富士山", ko: "후지산" },
    "湖畔 · 櫻花路線": { en: "lakeside · cherry blossom route", ja: "湖畔 · 桜ルート", ko: "호숫가 · 벚꽃 경로" },
    "佩特拉古城": { en: "Petra", ja: "ペトラ遺跡", ko: "페트라" },
    "遺跡 · 沙岩峽谷": { en: "ruins · sandstone canyon", ja: "遺跡 · 砂岩の峡谷", ko: "유적 · 사암 협곡" },
    "大峽谷日出": { en: "Grand Canyon Sunrise", ja: "グランドキャニオンの日の出", ko: "그랜드 캐니언 일출" },
    "峽谷 · 壯闊景觀": { en: "canyon · sweeping view", ja: "峡谷 · 壮大な眺め", ko: "협곡 · 광활한 풍경" },
    "吳哥窟": { en: "Angkor Wat", ja: "アンコールワット", ko: "앙코르와트" },
    "日出 · 古文明路線": { en: "sunrise · ancient route", ja: "日の出 · 古代文明ルート", ko: "일출 · 고대 문명 경로" },
    "伏見稻荷": { en: "Fushimi Inari", ja: "伏見稲荷", ko: "후시미 이나리" },
    "寺社 · 經典散步": { en: "shrine · classic walk", ja: "寺社 · 定番の散策", ko: "신사 · 대표 산책" },
    "botanical · night lights": { "zh-TW": "植物園 · 夜間燈光", ja: "植物園 · 夜間ライト", ko: "식물원 · 야간 조명" },
    "Gardens by the Bay": { "zh-TW": "新加坡濱海灣花園", ja: "ガーデンズ・バイ・ザ・ベイ", ko: "가든스 바이 더 베이" },
    "Gardens by the Bay · Supertree Grove": { "zh-TW": "新加坡濱海灣花園 · 擎天樹叢林", ja: "ガーデンズ・バイ・ザ・ベイ · スーパーツリー・グローブ", ko: "가든스 바이 더 베이 · 슈퍼트리 그로브" },
    "skyline · observation deck": { "zh-TW": "天際線 · 觀景台", ja: "スカイライン · 展望台", ko: "스카이라인 · 전망대" },
    "Taipei 101": { "zh-TW": "台北 101", ja: "台北101", ko: "타이베이 101" },
    "Moraine Lake": { "zh-TW": "夢蓮湖", ja: "モレーン湖", ko: "모레인 호수" },
    "湖景 · 山脈明信片": { en: "lake · mountain postcard", ja: "湖 · 山並みのポストカード", ko: "호수 · 산맥 엽서" },
    "聖托里尼": { en: "Santorini", ja: "サントリーニ", ko: "산토리니" },
    "夕陽 · 海岸明信片": { en: "sunset · coastal postcard", ja: "夕日 · 海辺のポストカード", ko: "노을 · 해안 엽서" },
    "馬丘比丘": { en: "Machu Picchu", ja: "マチュピチュ", ko: "마추픽추" },
    "遺跡 · 山景路線": { en: "ruins · mountain route", ja: "遺跡 · 山岳ルート", ko: "유적 · 산악 경로" },
    "canal · old street": { "zh-TW": "運河 · 老街", ja: "運河 · 旧市街", ko: "운하 · 구시가지" },
    "Venice Rialto": { "zh-TW": "威尼斯里阿爾托橋", ja: "ヴェネツィア・リアルト橋", ko: "베네치아 리알토 다리" },
    "city park · station area": { "zh-TW": "城市公園 · 車站周邊", ja: "都市公園 · 駅周辺", ko: "도시 공원 · 역 주변" },
    "New York Skyline": { "zh-TW": "紐約天際線", ja: "ニューヨークのスカイライン", ko: "뉴욕 스카이라인" },
    "新天鵝堡": { en: "Neuschwanstein Castle", ja: "ノイシュヴァンシュタイン城", ko: "노이슈반슈타인성" },
    "城堡 · 景觀路線": { en: "castle · scenic route", ja: "城 · 景観ルート", ko: "성 · 풍경 경로" },
    "塞納河": { en: "Seine River", ja: "セーヌ川", ko: "센강" },
    "河畔散步 · 明信片城市": { en: "riverside walk · postcard city", ja: "川沿い散策 · ポストカードの街", ko: "강변 산책 · 엽서 도시" },
    "小翅膀骰子": { en: "Pik Flyer discovery", ja: "Pik Flyer ルーレット", ko: "Pik Flyer 주사위" },
    "30 次 / 每天": { en: "30 rolls / day", ja: "1日30回", ko: "하루 30회" },
    "地標明信片": { en: "Postcard places", ja: "ポストカードスポット", ko: "엽서 명소" },
    "高塔 · 花園 · 河畔 · 寺廟": { en: "towers · gardens · riversides · temples", ja: "タワー · 庭園 · 川沿い · 寺院", ko: "타워 · 정원 · 강변 · 사찰" },
    "常見使用情境": { en: "Made for real life", ja: "こんな日に便利", ko: "이런 날에 유용해요" },
    "不是只有重度玩家才會用。忙碌、下雨、天氣太熱、想跟朋友交換漂亮地點時，小翅膀都能派上用場。": { en: "You do not have to be a power user. Pik Flyer helps on busy days, rainy evenings, hot afternoons, or whenever you want to swap beautiful places with friends.", ja: "ヘビーユーザーだけのアプリではありません。忙しい日、雨の日、暑い日、友だちときれいな場所を交換したいときに役立ちます。", ko: "헤비 유저만을 위한 앱이 아닙니다. 바쁜 날, 비 오는 날, 더운 날, 친구와 멋진 장소를 나누고 싶은 순간에 유용합니다." },
    "玩家情境輪播": { en: "Use case carousel", ja: "利用シーンのカルーセル", ko: "사용 상황 캐러셀" },
    "附近的點看膩了？可以先骰一個國外地標，收藏喜歡的明信片地點，晚上再排一段短短的城市散步。": { en: "Tired of the same nearby places? Discover an overseas landmark, save the postcard spot you like, then plan a short city route for the evening.", ja: "近所の景色に飽きたら、海外スポットをひとつ探して保存。夜に短い街歩きルートを作れます。", ko: "주변 장소가 지겹다면 해외 명소를 하나 찾고 마음에 드는 엽서 장소를 저장한 뒤 저녁에 짧은 도시 경로를 만들어보세요." },
    "情境 01": { en: "Use case 01", ja: "シーン 01", ko: "상황 01" },
    "想和朋友交換漂亮地點": { en: "Swap beautiful places with friends", ja: "友だちときれいな場所を交換", ko: "친구와 멋진 장소 공유" },
    "朋友丟來一整串座標時，不用一個一個複製。整段貼上、預覽路線，確認後就能用 18 km/h 開始走。": { en: "When a friend sends a long list of coordinates, paste them all at once, preview the route, and start at 18 km/h after confirming.", ja: "友だちから座標がまとめて届いても、ひとつずつコピーする必要はありません。一括貼り付け、ルート確認後、18 km/hで開始できます。", ko: "친구가 좌표를 여러 개 보내도 하나씩 복사할 필요가 없습니다. 한 번에 붙여넣고 경로를 미리 본 뒤 18 km/h로 시작하세요." },
    "情境 02": { en: "Use case 02", ja: "シーン 02", ko: "상황 02" },
    "手動批量匯入座標": { en: "Batch-import coordinates", ja: "座標をまとめて読み込み", ko: "좌표 일괄 가져오기" },
    "今天上班上課太忙忘了種花？打開小翅膀規劃路線，一鍵按下後讓手機自己走一段。": { en: "Too busy with work or class to keep up? Open Pik Flyer, plan a route, and let your phone handle the walk after one tap.", ja: "仕事や授業で忙しい日は、Pik Flyerでルートを作成。ワンタップでスマホに歩いてもらえます。", ko: "직장이나 수업 때문에 바쁜 날에는 Pik Flyer에서 경로를 만들고 한 번 눌러 휴대폰이 알아서 걷게 해보세요." },
    "情境 03": { en: "Use case 03", ja: "シーン 03", ko: "상황 03" },
    "忙碌日補一段散步": { en: "Keep a little progress on busy days", ja: "忙しい日も少しだけ散策", ko: "바쁜 날에도 짧게 산책" },
    "天氣太熱或下雨不想出門時，先在家找城市、花園、夜景、港灣，挑一個今晚想去的方向。": { en: "When it is too hot or rainy to go out, browse cities, gardens, night views, and harbors from home and choose tonight's direction.", ja: "暑さや雨で外に出たくない日は、家で街、庭園、夜景、港を探して、今夜の行き先を選べます。", ko: "너무 덥거나 비가 와서 나가기 싫은 날에는 집에서 도시, 정원, 야경, 항구를 둘러보고 오늘 밤의 방향을 정하세요." },
    "情境 04": { en: "Use case 04", ja: "シーン 04", ko: "상황 04" },
    "在家挑今晚的城市": { en: "Choose tonight's city from home", ja: "家で今夜の街を選ぶ", ko: "집에서 오늘 밤의 도시 고르기" },
    "想看國外地標但不想滑很久？用分類骰子挑花園、古蹟、夜景或海邊，喜歡的點直接加入收藏。": { en: "Want an overseas landmark without endless scrolling? Choose gardens, heritage sites, night views, or coasts by category and save the places you love.", ja: "海外スポットを探したいけれど、ずっとスクロールしたくないときは、庭園、史跡、夜景、海辺から選び、気に入った場所を保存できます。", ko: "끝없이 스크롤하지 않고 해외 명소를 찾고 싶다면 정원, 유적, 야경, 해변 카테고리에서 고르고 마음에 드는 장소를 저장하세요." },
    "情境 05": { en: "Use case 05", ja: "シーン 05", ko: "상황 05" },
    "快速累積收藏地標": { en: "Build a favorites list faster", ja: "お気に入りをすばやく増やす", ko: "즐겨찾기를 빠르게 모으기" },
    "常常忘記自己去過哪裡？移動日誌會留下紀錄；免費版保留 10 組，訂閱後最多可看 100 組。": { en: "Forget where you have been? The travel log keeps a record: 10 entries on the free plan and up to 100 with a subscription.", ja: "行った場所を忘れがちでも、移動ログに記録が残ります。無料版は10件、サブスクリプションでは最大100件確認できます。", ko: "어디에 갔는지 자주 잊나요? 이동 기록이 남습니다. 무료 플랜은 10개, 구독 후에는 최대 100개까지 확인할 수 있습니다." },
    "情境 06": { en: "Use case 06", ja: "シーン 06", ko: "상황 06" },
    "回頭整理移動紀錄": { en: "Review your travel history", ja: "移動履歴を振り返る", ko: "이동 기록 돌아보기" },
    "評價輪播控制": { en: "Use case carousel controls", ja: "利用シーンの操作", ko: "사용 상황 캐러셀 조작" },
    "Android 版下載": { en: "Download for Android", ja: "Android版ダウンロード", ko: "Android 다운로드" },
    "先免費用起來，喜歡再升級。": { en: "Start free. Upgrade only if it fits your life.", ja: "まずは無料で。気に入ったらアップグレード。", ko: "먼저 무료로. 마음에 들면 업그레이드하세요." },
    "下載後照畫面完成設定，就能開始骰明信片、排散步、開浮窗。7 天完整試用後不會突然不能用，只會改成每日基本次數。": { en: "Follow the on-screen setup after downloading to discover postcard spots, plan routes, and use floating controls. After the seven-day trial, the app stays available with a daily basic allowance.", ja: "ダウンロード後に画面の案内に従って設定すれば、ポストカード探し、街歩き、フローティング操作を始められます。7日間の体験後も、毎日の基本枠で引き続き利用できます。", ko: "다운로드 후 화면 안내에 따라 설정하면 엽서 장소 찾기, 경로 만들기, 플로팅 컨트롤을 시작할 수 있습니다. 7일 체험 후에도 일일 기본 사용량으로 계속 이용할 수 있습니다." },
    "設定簡單。完整試用 7 天：每日提供 20 次傳送、30 次骰子、3 次城市散步。": { en: "Simple setup. The seven-day trial includes 20 teleports, 30 rolls, and three city routes per day.", ja: "設定は簡単。7日間の体験では、1日20回のテレポート、30回のルーレット、3回の街歩きを利用できます。", ko: "설정은 간단합니다. 7일 체험 동안 하루 20회 이동, 30회 주사위, 3회 도시 산책을 이용할 수 있습니다." },
    "價格與下載": { en: "Pricing and download", ja: "料金とダウンロード", ko: "요금 및 다운로드" },
    "7 天完整試用": { en: "7-day full trial", ja: "7日間フル体験", ko: "7일 전체 체험" },
    "/ 月": { en: "/ month", ja: "/ 月", ko: "/ 월" },
    "免費版每日 20 次傳送": { en: "20 teleports per day during the trial", ja: "体験中は1日20回テレポート", ko: "체험 중 하루 20회 이동" },
    "免費版每日 30 次骰子": { en: "30 rolls per day during the trial", ja: "体験中は1日30回ルーレット", ko: "체험 중 하루 30회 주사위" },
    "免費版每日 3 次城市散步": { en: "3 city routes per day during the trial", ja: "体験中は1日3回街歩き", ko: "체험 중 하루 3회 도시 산책" },
    "第 8 天後仍可用：10 次傳送、15 次骰子、1 次城市散步；浮窗仍可使用": { en: "From day 8: 10 teleports, 15 rolls, one city route, plus floating controls", ja: "8日目以降：テレポート10回、ルーレット15回、街歩き1回、フローティング操作", ko: "8일째부터: 이동 10회, 주사위 15회, 도시 산책 1회, 플로팅 컨트롤" },
    "訂閱後取得更高額度、路線預設、地標資料與匯出": { en: "Subscribe for higher limits, route presets, place data, and exports", ja: "サブスクリプションで上限拡大、ルートプリセット、スポットデータ、書き出し", ko: "구독 시 더 높은 한도, 경로 프리셋, 장소 데이터 및 내보내기" },
    "下載 Pik Flyer Android": { en: "Download Pik Flyer for Android", ja: "Pik Flyer Android版をダウンロード", ko: "Pik Flyer Android 다운로드" },
    "訂閱 US$4.99 / 月": { en: "Subscribe for US$4.99 / month", ja: "月額US$4.99で登録", ko: "월 US$4.99 구독" },
    "版本 2.0.12 · Android 版 6.4 MB": { en: "Version 2.0.12 · Android 6.4 MB", ja: "バージョン 2.0.12 · Android版 6.4 MB", ko: "버전 2.0.12 · Android 6.4 MB" },
    "完整試用 7 天；第 8 天後仍可免費低額度使用，需要更多額度時再升級 US$4.99 / 月。": { en: "Seven-day full trial. Free basic use continues from day 8; upgrade to US$4.99/month only when you need more.", ja: "7日間のフル体験。8日目以降も無料基本枠を利用でき、必要なときだけ月額US$4.99でアップグレードできます。", ko: "7일 전체 체험 후 8일째부터도 기본 무료 사용이 계속됩니다. 더 필요할 때만 월 US$4.99로 업그레이드하세요." },
    "給每天很忙、但還想有點探索感的人": { en: "For busy people who still want a sense of discovery", ja: "忙しくても、少しだけ探索を楽しみたい人へ", ko: "바쁜 일상 속에서도 탐험을 느끼고 싶은 사람을 위해" },
    "不用硬出門，也能跟朋友聊今天去了哪裡。": { en: "Stay in, explore, and still have something new to share.", ja: "無理に外へ出なくても、今日の発見を友だちと話せます。", ko: "억지로 나가지 않아도 오늘의 발견을 친구와 나눌 수 있어요." },
    "小翅膀的重點不是炫技，而是把「找漂亮明信片、避開附近重複點、安排一段路」變成每天打開就能完成的小儀式。學生課很多、家裡事情多、外面太熱或下雨，都可以先在手機裡走一段。": { en: "Pik Flyer is not about showing off technology. It turns finding a beautiful postcard spot, escaping the same nearby loop, and planning a route into a small daily ritual. Whether classes are packed, home is busy, or the weather is unpleasant, you can still make room for a little exploration.", ja: "Pik Flyerの目的は技術を見せることではなく、きれいなポストカードを探し、近所のマンネリを離れ、ルートを作ることを毎日の小さな習慣にすることです。授業や家事で忙しい日、暑い日や雨の日も、スマホで少しだけ探索できます。", ko: "Pik Flyer는 기술을 자랑하기 위한 앱이 아닙니다. 멋진 엽서 장소를 찾고, 반복되는 주변을 벗어나고, 경로를 만드는 일을 작은 일상 습관으로 바꿉니다. 수업이나 집안일로 바쁜 날, 너무 덥거나 비 오는 날에도 휴대폰에서 짧게 탐험할 수 있습니다." },
    "跟朋友有連結": { en: "Stay connected with friends", ja: "友だちとのつながり", ko: "친구와 이어지기" },
    "今天你骰到埃及，我骰到冰島。互相丟明信片地點、交換分類清單，比單純自己玩更有話題。": { en: "You find Egypt; I find Iceland. Trading postcard spots and category lists gives you more to talk about than exploring alone.", ja: "あなたはエジプト、私はアイスランド。ポストカードスポットやカテゴリリストを交換すれば、ひとりで遊ぶより会話が広がります。", ko: "너는 이집트, 나는 아이슬란드. 엽서 장소와 카테고리 목록을 주고받으면 혼자 즐길 때보다 대화가 더 풍성해집니다." },
    "離開住家附近的重複感": { en: "Break out of the same nearby loop", ja: "近所のマンネリから離れる", ko: "반복되는 주변에서 벗어나기" },
    "附近都一樣、香菇都看膩時，直接去國外找壯麗地標、夜景、花園和河岸路線。": { en: "When everything nearby feels the same, explore dramatic landmarks, night views, gardens, and riverside routes overseas.", ja: "近所がいつも同じに感じたら、海外の壮大なランドマーク、夜景、庭園、川沿いルートへ。", ko: "주변이 늘 똑같게 느껴질 때 해외의 장엄한 명소, 야경, 정원, 강변 경로를 찾아보세요." },
    "忙或熱，也能補一段散步感": { en: "Make room for a route, even on busy or hot days", ja: "忙しい日や暑い日も、少しだけ街歩き", ko: "바쁘거나 더운 날에도 짧게 산책" },
    "忘了種花、天氣太熱、晚點才有空，都能先用 18 km/h 城市散步安排一段路。": { en: "When you forgot, it is too hot, or you only have time later, plan a city route at 18 km/h and keep a little momentum.", ja: "忙しくて忘れた日、暑い日、あとでしか時間がない日も、18 km/hの街歩きルートを設定できます。", ko: "바빠서 잊었거나 너무 덥거나 나중에야 시간이 나는 날에도 18 km/h 도시 경로를 만들어 흐름을 이어가세요." },
    "🧭 一個工具，三種用法": { en: "🧭 One tool, three easy workflows", ja: "🧭 ひとつのツール、3つの使い方", ko: "🧭 하나의 도구, 세 가지 활용법" },
    "今天想去哪裡，讓小翅膀先幫你開路。": { en: "Wherever you want to go, Pik Flyer helps you start.", ja: "今日行きたい場所へ、Pik Flyerが先に道を作ります。", ko: "오늘 가고 싶은 곳, Pik Flyer가 먼저 길을 열어드려요." },
    "從國外美景、明信片地點、住家附近以外的香菇，到朋友分享的一整串座標，小翅膀把日常探索變成一個比較輕鬆的流程。": { en: "From overseas views and postcard spots to places beyond your neighborhood and coordinates shared by friends, Pik Flyer makes everyday exploration feel lighter.", ja: "海外の景色、ポストカードスポット、近所以外の場所、友だちが共有した座標まで。Pik Flyerなら、日常の探索がもっと気軽になります。", ko: "해외 풍경과 엽서 장소부터 동네 밖의 새로운 곳, 친구가 공유한 좌표까지 Pik Flyer가 일상의 탐험을 더 가볍게 만듭니다." },
    "朋友分享的點，直接變路線": { en: "Turn shared coordinates into a route", ja: "共有された座標をそのままルートに", ko: "공유받은 좌표를 바로 경로로" },
    "看到社群或朋友丟一串座標，整段貼上，先預覽再開始走，不用一個一個複製。": { en: "Paste a list of coordinates from friends or the community, preview the route, and start without copying each point one by one.", ja: "友だちやコミュニティから届いた座標をまとめて貼り付け、プレビューしてから開始。ひとつずつコピーする必要はありません。", ko: "친구나 커뮤니티에서 받은 좌표 목록을 한 번에 붙여넣고 미리 본 뒤 시작하세요. 하나씩 복사할 필요가 없습니다." },
    "今天想看國外明信片": { en: "Discover an overseas postcard spot", ja: "今日は海外のポストカードスポットへ", ko: "오늘은 해외 엽서 장소 찾기" },
    "埃及、東京、冰島、河岸、夜景、花園，選分類就能骰，不用先做功課。": { en: "Egypt, Tokyo, Iceland, riversides, night views, or gardens: choose a category and discover without doing homework first.", ja: "エジプト、東京、アイスランド、川沿い、夜景、庭園。カテゴリを選ぶだけで、事前に調べなくても見つけられます。", ko: "이집트, 도쿄, 아이슬란드, 강변, 야경, 정원. 카테고리만 고르면 미리 조사하지 않아도 바로 발견할 수 있습니다." },
    "每天都能保留一點進度感": { en: "Keep a little momentum every day", ja: "毎日少しずつ楽しめる", ko: "매일 조금씩 흐름 이어가기" },
    "前 7 天完整體驗；之後免費基本版也能每天骰點、傳送、散步，常用再升級。": { en: "Enjoy the full experience for seven days. After that, the free basic plan still includes daily discovery, teleports, and a city route. Upgrade when it becomes part of your routine.", ja: "最初の7日間はフル体験。その後も無料基本版で毎日スポット探し、テレポート、街歩きを利用でき、必要になったらアップグレードできます。", ko: "첫 7일은 전체 기능을 체험하고 이후에도 무료 기본 플랜으로 매일 장소 찾기, 이동, 도시 산책을 이용할 수 있습니다. 자주 쓰게 되면 업그레이드하세요." },
    "小翅膀打開，就是今天的探索入口。": { en: "Open Pik Flyer and start today's discovery.", ja: "Pik Flyerを開けば、今日の探索が始まります。", ko: "Pik Flyer를 열면 오늘의 탐험이 시작됩니다." },
    "重點不是一堆難懂設定，而是讓你很快完成三件事：骰一個好點、走一段路、把漂亮明信片地點傳給朋友。": { en: "No maze of settings. Just discover a good place, plan a route, and send a beautiful postcard spot to a friend.", ja: "難しい設定ではなく、良い場所を見つけ、ルートを歩き、きれいなポストカードスポットを友だちに送る。その3つをすばやくできます。", ko: "복잡한 설정 대신 좋은 장소를 찾고, 경로를 걷고, 멋진 엽서 장소를 친구에게 보내는 세 가지를 빠르게 할 수 있습니다." },
    "超過 6 萬筆自建 POI 地標庫": { en: "60,000+ curated POIs", ja: "6万件以上の独自POIデータ", ko: "6만 개 이상의 자체 POI 데이터" },
    "把公開地標資料整理、清理並分類成小翅膀自己的探索資料庫，保留來源、分類、座標信心與 beauty tags。想找花園、夜景、河岸、車站或老街，不用再逐一翻地圖查座標。": { en: "Pik Flyer cleans and organizes public place data into its own discovery library, preserving sources, categories, coordinate confidence, and visual tags. Find gardens, night views, riversides, stations, or old streets without searching maps point by point.", ja: "公開スポット情報を整理・クリーニング・分類し、出典、カテゴリ、座標の信頼度、景観タグを保持した独自データベースにまとめています。庭園、夜景、川沿い、駅、旧市街を地図でひとつずつ探す必要はありません。", ko: "공개 장소 데이터를 정리하고 검수해 출처, 카테고리, 좌표 신뢰도, 미관 태그를 보존한 자체 탐색 데이터베이스로 만들었습니다. 정원, 야경, 강변, 역, 구시가지를 지도에서 하나씩 찾지 않아도 됩니다." },
    "分類骰子": { en: "Category discovery", ja: "カテゴリルーレット", ko: "카테고리 주사위" },
    "依飾品、城市、季節、夜景、親子、宗教、港灣、花園等類別抽地點，讓每一次跳點都有目標。": { en: "Discover places by decor, city, season, night view, family, religion, harbor, garden, and more, so every jump has a purpose.", ja: "デコ、都市、季節、夜景、親子、宗教、港、庭園などから場所を選び、毎回の移動に目的を持たせます。", ko: "데코, 도시, 계절, 야경, 가족, 종교, 항구, 정원 등 카테고리로 장소를 찾아 매번 이동에 목적을 더합니다." },
    "城市散步": { en: "City routes", ja: "街歩きルート", ko: "도시 산책" },
    "選城市後自動產生散步路線，適合種花、探索明信片、跑活動路線。免費版每日可啟動 3 次。": { en: "Choose a city and generate a walking route for planting, postcard discovery, or event routes. The trial includes three starts per day.", ja: "都市を選ぶと街歩きルートを自動生成。花植え、ポストカード探し、イベントルートに使えます。体験中は1日3回開始できます。", ko: "도시를 고르면 산책 경로를 자동으로 만듭니다. 꽃 심기, 엽서 탐색, 이벤트 경로에 활용할 수 있으며 체험 중 하루 3회 시작할 수 있습니다." },
    "活動專區": { en: "Event hub", ja: "イベント情報", ko: "이벤트 허브" },
    "期間活動會整理時間、地點與路線提示；免費版可查看，會員可在同日期安全窗內快速傳送或排路線。": { en: "See event dates, locations, and route notes in one place. Free users can view details; members can quickly open a location or plan a route within the same-date window.", ja: "イベントの期間、場所、ルート情報をまとめて確認できます。無料版でも閲覧でき、メンバーは同日の時間帯にすばやく場所を開いたりルートを作成できます。", ko: "이벤트 기간, 장소, 경로 안내를 한곳에서 확인하세요. 무료 사용자도 볼 수 있고 멤버는 같은 날짜 범위에서 빠르게 장소를 열거나 경로를 만들 수 있습니다." },
    "把社群分享的連續座標整段貼上，自動解析並在地圖預覽路徑；確認後以 18 km/h 開始走路，也可以先取消重貼。": { en: "Paste a full sequence of shared coordinates, parse it automatically, and preview the route on the map. Confirm to start at 18 km/h, or cancel and paste again.", ja: "共有された座標列をまとめて貼り付けると自動解析し、地図でルートをプレビューできます。確認後は18 km/hで開始でき、キャンセルして貼り直すこともできます。", ko: "공유받은 연속 좌표를 한 번에 붙여넣으면 자동으로 분석하고 지도에서 경로를 미리 보여줍니다. 확인 후 18 km/h로 시작하거나 취소하고 다시 붙여넣을 수 있습니다." },
    "懸浮視窗": { en: "Floating controls", ja: "フローティング操作", ko: "플로팅 컨트롤" },
    "在 Android 上用懸浮球快速骰點、傳送、啟停城市散步，常用功能不用一直切回主畫面。": { en: "Use the Android floating control to discover a place, teleport, or start and stop a city route without repeatedly returning to the main screen.", ja: "Androidのフローティングボタンから、場所探し、テレポート、街歩きの開始・停止を操作でき、何度もメイン画面へ戻る必要がありません。", ko: "Android 플로팅 버튼에서 장소 찾기, 이동, 도시 산책 시작과 정지를 빠르게 조작해 메인 화면으로 계속 돌아갈 필요가 없습니다." },
    "狀態自檢": { en: "Setup checks", ja: "設定セルフチェック", ko: "설정 자체 점검" },
    "Android 橋接、懸浮窗權限、授權、素材與常見安裝問題會集中提示，降低新手安裝卡關。": { en: "Android connection, floating-window permission, license, assets, and common setup issues appear in one place to reduce first-time setup friction.", ja: "Android接続、フローティング権限、ライセンス、素材、よくある設定問題をまとめて表示し、初回設定のつまずきを減らします。", ko: "Android 연결, 플로팅 창 권한, 라이선스, 자료, 자주 발생하는 설치 문제를 한곳에서 안내해 첫 설정의 막힘을 줄입니다." },
    "真實世界的地標美景。": { en: "Beautiful places from the real world.", ja: "世界の美しいスポット。", ko: "현실 세계의 아름다운 장소." },
    "從夜景高塔、湖畔山景、古都街道到花園燈海，每一次骰點都像翻開一張新的城市明信片。": { en: "From illuminated towers and mountain lakes to old-city streets and glowing gardens, every discovery feels like opening a new city postcard.", ja: "夜景のタワー、湖畔の山々、古都の通り、光る庭園まで。見つけるたびに新しい街のポストカードを開くような感覚です。", ko: "빛나는 타워와 산맥 호수, 오래된 도시의 거리와 정원 조명까지. 장소를 찾을 때마다 새로운 도시 엽서를 펼치는 기분입니다." },
    "東京鐵塔 · 夜景": { en: "Tokyo Tower · night view", ja: "東京タワー · 夜景", ko: "도쿄 타워 · 야경" },
    "夜景 · 高塔 · 經典路線": { en: "night view · tower · classic route", ja: "夜景 · タワー · 定番ルート", ko: "야경 · 타워 · 대표 경로" },
    "Taipei 101 · sunset skyline": { "zh-TW": "台北 101 · 夕陽天際線", ja: "台北101 · 夕暮れのスカイライン", ko: "타이베이 101 · 노을 스카이라인" },
    "observation deck · skyline · station area": { "zh-TW": "觀景台 · 天際線 · 車站周邊", ja: "展望台 · スカイライン · 駅周辺", ko: "전망대 · 스카이라인 · 역 주변" },
    "花園 · 植物園 · 夜間燈光": { en: "garden · botanical park · night lights", ja: "庭園 · 植物園 · 夜間ライト", ko: "정원 · 식물원 · 야간 조명" },
    "Android 安裝教學": { en: "Android setup guide", ja: "Android設定ガイド", ko: "Android 설치 가이드" },
    "照順序完成下載、安裝與首次設定。每個權限只要設定一次，之後打開 app 就能直接用。": { en: "Follow these steps to download, install, and complete first-time setup. Each permission is configured once, then Pik Flyer is ready whenever you open it.", ja: "順番にダウンロード、インストール、初回設定を行います。各権限は一度設定すれば、次回からすぐに利用できます。", ko: "순서대로 다운로드, 설치, 첫 설정을 완료하세요. 각 권한은 한 번만 설정하면 이후 앱을 열 때 바로 사용할 수 있습니다." },
    "下載 Android 版": { en: "Download the Android app", ja: "Android版をダウンロード", ko: "Android 앱 다운로드" },
    "在 Android 手機上點「立即下載 Android 版」。下載完成後，從瀏覽器下載通知或「我的檔案」開啟 APK。": { en: "Tap the Android download button on your phone. When it finishes, open the APK from your browser's download notification or the Files app.", ja: "Androidスマートフォンでダウンロードボタンをタップします。完了後、ブラウザの通知またはファイルアプリからAPKを開きます。", ko: "Android 휴대폰에서 다운로드 버튼을 누르세요. 완료되면 브라우저 다운로드 알림이나 파일 앱에서 APK를 여세요." },
    "允許這次安裝": { en: "Allow this installation", ja: "今回のインストールを許可", ko: "이번 설치 허용" },
    "如果系統跳出安全提示，點進設定允許目前瀏覽器安裝 app，返回後按「安裝」。": { en: "If Android shows a security prompt, open its settings, allow the current browser to install apps, return, and tap Install.", ja: "セキュリティメッセージが表示されたら、設定で現在のブラウザからのアプリインストールを許可し、戻って「インストール」をタップします。", ko: "보안 안내가 나타나면 설정에서 현재 브라우저의 앱 설치를 허용한 뒤 돌아와 설치를 누르세요." },
    "開啟小翅膀": { en: "Open Pik Flyer", ja: "Pik Flyerを開く", ko: "Pik Flyer 열기" },
    "第一次開啟會進入設定流程。完成定位、模擬位置與必要權限後，app 會提示設定成功。": { en: "The setup flow opens on first launch. Complete location, mock-location selection, and required permissions; the app confirms when everything is ready.", ja: "初回起動時に設定フローが開きます。位置情報、仮想位置アプリの選択、必要な権限を完了すると、設定完了が表示されます。", ko: "처음 실행하면 설정 과정이 열립니다. 위치, 모의 위치 앱 선택, 필요한 권한을 완료하면 앱이 설정 완료를 알려줍니다." },
    "啟用懸浮視窗": { en: "Enable floating controls", ja: "フローティング操作を有効化", ko: "플로팅 컨트롤 켜기" },
    "要在其他 app 上直接操作，請開啟「顯示在其他應用程式上層」。完成後首頁會顯示浮窗狀態。": { en: "To use controls over other apps, enable Display over other apps. The home screen shows the floating-control status when complete.", ja: "他のアプリ上で操作するには「他のアプリの上に表示」を有効にします。完了するとホーム画面に状態が表示されます。", ko: "다른 앱 위에서 조작하려면 다른 앱 위에 표시를 켜세요. 완료되면 홈 화면에 플로팅 컨트롤 상태가 표시됩니다." },
    "開始骰地點": { en: "Start discovering", ja: "スポットを探す", ko: "장소 찾기 시작" },
    "從明信片骰子、飾品骰子或城市散步開始。試用前 7 天每日有 30 次骰子、20 次傳送、3 次城市散步。": { en: "Start with postcard discovery, decor categories, or a city route. During the first seven days you get 30 rolls, 20 teleports, and three city routes per day.", ja: "ポストカード、デコカテゴリ、街歩きから始めましょう。最初の7日間は1日30回のルーレット、20回のテレポート、3回の街歩きを利用できます。", ko: "엽서 장소, 데코 카테고리, 도시 산책부터 시작하세요. 첫 7일 동안 하루 30회 주사위, 20회 이동, 3회 도시 산책을 이용할 수 있습니다." },
    "需要更多就訂閱": { en: "Subscribe when you need more", ja: "もっと必要なら登録", ko: "더 필요할 때 구독" },
    "US$4.99 / 月解鎖更高額度與進階功能。取消後仍可使用剩餘付費期；未訂閱也可保留低額度免費版。": { en: "US$4.99/month unlocks higher limits and advanced features. After cancellation, access continues through the paid period; the free basic plan remains available without a subscription.", ja: "月額US$4.99で上限拡大と高度な機能を利用できます。解約後も支払い済み期間は利用でき、登録しなくても無料基本版は残ります。", ko: "월 US$4.99로 더 높은 한도와 고급 기능을 이용할 수 있습니다. 취소 후에도 결제 기간이 끝날 때까지 사용할 수 있고 구독하지 않아도 무료 기본 플랜은 유지됩니다." },
    "前往訂閱頁": { en: "Open subscription page", ja: "登録ページを開く", ko: "구독 페이지 열기" },
    "Android 首次設定圖解": { en: "Android first-time setup guide", ja: "Android初回設定ガイド", ko: "Android 첫 설정 안내" },
    "首次設定圖解": { en: "First-time setup", ja: "初回設定", ko: "첫 설정" },
    "看到綠色完成提示，就可以開始用。": { en: "When everything turns green, you are ready.", ja: "緑の完了表示が出たら準備完了です。", ko: "초록색 완료 표시가 보이면 준비가 끝났습니다." },
    "先讓 app 取得定位權限，地圖才能顯示目前位置與附近地標。": { en: "Allow location access so the map can show the current position and nearby places.", ja: "地図に現在地と周辺スポットを表示するため、位置情報を許可します。", ko: "지도에 현재 위치와 주변 장소를 표시할 수 있도록 위치 권한을 허용하세요." },
    "到 Android 開發人員選項，把「選取模擬位置應用程式」設為 Pik Flyer-小翅膀。": { en: "In Android Developer options, set Select mock location app to Pik Flyer.", ja: "Androidの開発者向けオプションで「仮の現在地情報アプリを選択」をPik Flyerに設定します。", ko: "Android 개발자 옵션에서 모의 위치 앱 선택을 Pik Flyer로 설정하세요." },
    "需要懸浮球時，開啟「顯示在其他應用程式上層」。不想用時可在浮窗或 app 首頁關閉。": { en: "Enable Display over other apps when you want the floating control. Turn it off from the control or the app home screen whenever you do not need it.", ja: "フローティング操作を使うときは「他のアプリの上に表示」を有効にします。不要なときはフローティング画面またはホーム画面からオフにできます。", ko: "플로팅 컨트롤이 필요할 때 다른 앱 위에 표시를 켜세요. 필요하지 않을 때는 플로팅 창이나 앱 홈에서 끌 수 있습니다." },
    "回到 app 後按完成設定。若每項都通過，會跳出成功提示並帶你進入主畫面。": { en: "Return to the app and finish setup. When every check passes, a success message opens the main screen.", ja: "アプリに戻って設定を完了します。すべての確認に合格すると、完了メッセージの後にメイン画面が開きます。", ko: "앱으로 돌아와 설정 완료를 누르세요. 모든 항목을 통과하면 성공 안내 후 메인 화면으로 이동합니다." },
    "首頁權限狀態示意": { en: "Home permission status example", ja: "ホーム画面の権限状態例", ko: "홈 권한 상태 예시" },
    "Pik Flyer-小翅膀": { en: "Pik Flyer", ja: "Pik Flyer", ko: "Pik Flyer" },
    "定位權限": { en: "Location permission", ja: "位置情報の権限", ko: "위치 권한" },
    "已允許": { en: "Allowed", ja: "許可済み", ko: "허용됨" },
    "模擬位置": { en: "Mock location", ja: "仮想位置", ko: "모의 위치" },
    "已選取": { en: "Selected", ja: "選択済み", ko: "선택됨" },
    "完成設定": { en: "Finish setup", ja: "設定を完了", ko: "설정 완료" },
    "懸浮視窗狀態示意": { en: "Floating-control status example", ja: "フローティング操作の状態例", ko: "플로팅 컨트롤 상태 예시" },
    "Floating": { "zh-TW": "浮窗", ja: "フローティング", ko: "플로팅" },
    "Ready": { "zh-TW": "就緒", ja: "準備完了", ko: "준비됨" },
    "懸浮球已開啟": { en: "Floating controls enabled", ja: "フローティング操作は有効", ko: "플로팅 컨트롤 켜짐" },
    "🎲 骰地標": { en: "🎲 Discover a place", ja: "🎲 スポットを探す", ko: "🎲 장소 찾기" },
    "快速跳點": { en: "Quick jump", ja: "クイック移動", ko: "빠른 이동" },
    "🚶 自動散步": { en: "🚶 Automatic route", ja: "🚶 自動街歩き", ko: "🚶 자동 산책" },
    "✕ 關閉浮窗": { en: "✕ Close controls", ja: "✕ フローティングを閉じる", ko: "✕ 플로팅 창 닫기" },
    "隨時可關": { en: "Close anytime", ja: "いつでも閉じる", ko: "언제든 끄기" },
    "安裝前檢查": { en: "Setup troubleshooting", ja: "設定前の確認", ko: "설치 전 확인" },
    "下載後找不到檔案？": { en: "Cannot find the download?", ja: "ダウンロードしたファイルが見つからない？", ko: "다운로드 파일을 찾을 수 없나요?" },
    "打開「我的檔案」或瀏覽器下載紀錄，點 APK 重新安裝。": { en: "Open Files or your browser's download history, then tap the APK to install again.", ja: "ファイルアプリまたはブラウザのダウンロード履歴を開き、APKをタップして再度インストールします。", ko: "파일 앱이나 브라우저 다운로드 기록을 열고 APK를 눌러 다시 설치하세요." },
    "按鈕不能點？": { en: "Button not responding?", ja: "ボタンを押せない？", ko: "버튼을 누를 수 없나요?" },
    "回到設定頁確認定位、模擬位置、懸浮視窗是否都已完成。": { en: "Return to setup and confirm location, mock-location selection, and floating-control permission are complete.", ja: "設定画面に戻り、位置情報、仮想位置、フローティング権限が完了しているか確認します。", ko: "설정 화면으로 돌아가 위치, 모의 위치, 플로팅 창 권한이 모두 완료되었는지 확인하세요." },
    "浮窗沒有出現？": { en: "Floating control missing?", ja: "フローティング操作が表示されない？", ko: "플로팅 컨트롤이 보이지 않나요?" },
    "確認上層顯示權限已開啟，再從首頁的浮窗開關重新啟動。": { en: "Confirm Display over other apps is enabled, then restart the floating control from the home screen.", ja: "「他のアプリの上に表示」が有効か確認し、ホーム画面のスイッチから再起動します。", ko: "다른 앱 위에 표시 권한이 켜져 있는지 확인한 뒤 홈 화면에서 플로팅 컨트롤을 다시 시작하세요." },
    "使用節奏": { en: "A comfortable way to start", ja: "おすすめの始め方", ko: "편하게 시작하는 방법" },
    "建議先用免費額度熟悉分類、路線與收藏，再依自己的需求升級訂閱。": { en: "Use the free allowance to learn categories, routes, and favorites first, then upgrade only when it suits your routine.", ja: "まず無料枠でカテゴリ、ルート、お気に入りを試し、必要に応じてアップグレードしてください。", ko: "먼저 무료 사용량으로 카테고리, 경로, 즐겨찾기를 익힌 뒤 필요에 맞게 업그레이드하세요." },
    "常見問題": { en: "Frequently asked questions", ja: "よくある質問", ko: "자주 묻는 질문" },
    "下載、試用和升級前，先看最常遇到的幾個問題。": { en: "A few helpful answers before you download, try, or upgrade.", ja: "ダウンロード、体験、アップグレード前によくある質問をご確認ください。", ko: "다운로드, 체험, 업그레이드 전에 자주 묻는 질문을 확인하세요." },
    "免費版真的可以用嗎？": { en: "Is the free plan really usable?", ja: "無料版でも本当に使えますか？", ko: "무료 플랜도 정말 사용할 수 있나요?" },
    "可以。前 7 天完整試用，每日提供 20 次傳送、30 次骰子、3 次城市散步；第 8 天後每日次數減半為 10 次傳送、15 次骰子、1 次城市散步，浮窗仍可使用。需要更多額度時再升級訂閱。": { en: "Yes. The first seven days include 20 teleports, 30 rolls, and three city routes per day. From day 8, the free plan includes 10 teleports, 15 rolls, one city route, and floating controls. Upgrade only when you need more.", ja: "はい。最初の7日間は1日20回のテレポート、30回のルーレット、3回の街歩きを利用できます。8日目以降は無料版で10回のテレポート、15回のルーレット、1回の街歩き、フローティング操作を利用でき、必要なときだけアップグレードできます。", ko: "네. 첫 7일은 하루 20회 이동, 30회 주사위, 3회 도시 산책을 이용할 수 있습니다. 8일째부터 무료 플랜은 10회 이동, 15회 주사위, 1회 도시 산책과 플로팅 컨트롤을 제공하며 더 필요할 때만 업그레이드하면 됩니다." },
    "安裝時需要授權怎麼辦？": { en: "What if Android asks for installation permission?", ja: "インストール権限を求められたら？", ko: "설치 권한을 요청하면 어떻게 하나요?" },
    "依 Android 畫面提示開啟安裝授權，再回到下載檔完成安裝即可。首次開啟 app 會引導你完成必要設定。": { en: "Follow Android's prompt to allow installation, return to the downloaded file, and finish installing. Pik Flyer guides you through required setup on first launch.", ja: "Androidの案内に従ってインストールを許可し、ダウンロードしたファイルに戻って完了します。初回起動時に必要な設定をご案内します。", ko: "Android 안내에 따라 설치를 허용한 뒤 다운로드 파일로 돌아가 설치를 완료하세요. 처음 실행하면 필요한 설정을 안내합니다." },
    "PC / Mac 版去哪裡下載？": { en: "Where can I get the PC or Mac version?", ja: "PC / Mac版はどこで入手できますか？", ko: "PC / Mac 버전은 어디에서 받을 수 있나요?" },
    "Pik Flyer 先從 Android 版開始。PC 與 Mac 版會在穩定後推出。": { en: "Pik Flyer is launching on Android first. PC and Mac versions will follow after the Android release is stable.", ja: "Pik FlyerはAndroid版から開始します。PC版とMac版はAndroid版が安定した後に提供予定です。", ko: "Pik Flyer는 Android 버전부터 시작합니다. PC와 Mac 버전은 Android가 안정된 뒤 제공할 예정입니다." },
    "Pik Flyer - 小翅膀 Android": { en: "Pik Flyer for Android", ja: "Pik Flyer Android版", ko: "Pik Flyer Android" },
    "會飛也會走，城市探索更自由。": { en: "Explore cities with more freedom.", ja: "街の探索を、もっと自由に。", ko: "도시 탐험을 더 자유롭게." },
    "Support:": { "zh-TW": "客服：", ja: "サポート：", ko: "지원:" },
    "追蹤小翅膀：": { en: "Follow Pik Flyer:", ja: "Pik Flyerをフォロー：", ko: "Pik Flyer 팔로우:" },
    "Privacy": { "zh-TW": "隱私權", ja: "プライバシー", ko: "개인정보 처리방침" },
    "Terms": { "zh-TW": "使用條款", ja: "利用規約", ko: "이용약관" },
    "Refund": { "zh-TW": "退款政策", ja: "返金ポリシー", ko: "환불 정책" },
    "Credits": { "zh-TW": "素材來源", ja: "クレジット", ko: "크레딧" },
    "Pik Flyer home": { en: "Pik Flyer home", ja: "Pik Flyer ホーム", ko: "Pik Flyer 홈" },
    "Giza pyramids in Egypt": { "zh-TW": "埃及吉薩金字塔", ja: "エジプトのギザのピラミッド", ko: "이집트 기자 피라미드" },
    "Tokyo Skytree city view": { "zh-TW": "東京晴空塔城市景觀", ja: "東京スカイツリーの街並み", ko: "도쿄 스카이트리 도시 전망" },
    "Shibuya scramble crossing in Tokyo": { "zh-TW": "東京澀谷十字路口", ja: "東京・渋谷スクランブル交差点", ko: "도쿄 시부야 스크램블 교차로" },
    "Aurora over Kirkjufell mountain in Iceland": { "zh-TW": "冰島教會山上空的極光", ja: "アイスランド・キルキュフェットル山のオーロラ", ko: "아이슬란드 키르큐펠산 오로라" },
    "Tokyo Tower night view": { "zh-TW": "東京鐵塔夜景", ja: "東京タワーの夜景", ko: "도쿄 타워 야경" },
    "Taipei 101 at sunset": { "zh-TW": "夕陽下的台北 101", ja: "夕暮れの台北101", ko: "노을 속 타이베이 101" },
    "Gardens by the Bay Supertree Grove": { "zh-TW": "濱海灣花園擎天樹叢林", ja: "ガーデンズ・バイ・ザ・ベイのスーパーツリー", ko: "가든스 바이 더 베이 슈퍼트리" },
    "Mount Fuji from Lake Kawaguchi": { "zh-TW": "河口湖望向富士山", ja: "河口湖から望む富士山", ko: "가와구치호에서 바라본 후지산" },
    "The Treasury in Petra Jordan": { "zh-TW": "約旦佩特拉寶庫", ja: "ヨルダン・ペトラの宝物殿", ko: "요르단 페트라 알카즈네" },
    "Grand Canyon sunrise": { "zh-TW": "大峽谷日出", ja: "グランドキャニオンの日の出", ko: "그랜드 캐니언 일출" },
    "Angkor Wat at sunrise": { "zh-TW": "吳哥窟日出", ja: "アンコールワットの日の出", ko: "앙코르와트 일출" },
    "Fushimi Inari Taisha torii path": { "zh-TW": "伏見稻荷大社千本鳥居", ja: "伏見稲荷大社の千本鳥居", ko: "후시미 이나리 타이샤 도리이 길" },
    "Taipei 101 skyline": { "zh-TW": "台北 101 天際線", ja: "台北101のスカイライン", ko: "타이베이 101 스카이라인" },
    "Moraine Lake in Canada": { "zh-TW": "加拿大夢蓮湖", ja: "カナダのモレーン湖", ko: "캐나다 모레인 호수" },
    "Santorini sunset": { "zh-TW": "聖托里尼夕陽", ja: "サントリーニの夕日", ko: "산토리니 노을" },
    "Machu Picchu morning landscape": { "zh-TW": "馬丘比丘晨景", ja: "マチュピチュの朝景色", ko: "마추픽추 아침 풍경" },
    "Rialto Bridge and Grand Canal Venice": { "zh-TW": "威尼斯里阿爾托橋與大運河", ja: "ヴェネツィアのリアルト橋と大運河", ko: "베네치아 리알토 다리와 대운하" },
    "New York City skyline": { "zh-TW": "紐約市天際線", ja: "ニューヨーク市のスカイライン", ko: "뉴욕시 스카이라인" },
    "Neuschwanstein Castle": { "zh-TW": "新天鵝堡", ja: "ノイシュヴァンシュタイン城", ko: "노이슈반슈타인성" },
    "Seine river by Eiffel Tower": { "zh-TW": "艾菲爾鐵塔旁的塞納河", ja: "エッフェル塔そばのセーヌ川", ko: "에펠탑 옆 센강" }
  };

  const pageMeta = {
    "zh-TW": {
      title: "Pik Flyer - 小翅膀 Android — 免費試用下載",
      description: "Pik Flyer - 小翅膀 Android 免費版。超過 6 萬筆自建 POI 地標庫，幫你找漂亮明信片地點、安排城市散步，前 7 天完整體驗，之後仍可免費基本使用。"
    },
    en: {
      title: "Pik Flyer for Android — Free Trial Download",
      description: "Explore 60,000+ curated POIs, discover postcard-worthy places, plan city routes, and keep free basic access after a seven-day full trial."
    },
    ja: {
      title: "Pik Flyer Android版 — 無料体験ダウンロード",
      description: "6万件以上の独自POIからポストカードスポットや街歩きルートを発見。7日間のフル体験後も無料基本枠を利用できます。"
    },
    ko: {
      title: "Pik Flyer Android — 무료 체험 다운로드",
      description: "6만 개 이상의 자체 POI에서 엽서처럼 멋진 장소와 도시 경로를 찾아보세요. 7일 전체 체험 후에도 기본 무료 사용이 계속됩니다."
    }
  };

  function normalizeLanguage(value) {
    if (typeof value !== "string") return null;
    const normalized = value.trim().replace("_", "-").toLowerCase();
    if (!normalized) return null;
    if (normalized === "zh-tw" || normalized.startsWith("zh-hant") || normalized.startsWith("zh-hk") || normalized.startsWith("zh-mo") || normalized === "zh") return "zh-TW";
    if (normalized.startsWith("zh-")) return "zh-TW";
    if (normalized.startsWith("ja")) return "ja";
    if (normalized.startsWith("ko")) return "ko";
    if (normalized.startsWith("en")) return "en";
    return null;
  }

  function readStoredLanguage() {
    try {
      const value = normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
      if (value) return value;
      return normalizeLanguage(window.localStorage.getItem(LEGACY_STORAGE_KEY));
    } catch (error) {
      console.warn("Unable to read language preference.", error);
      return null;
    }
  }

  function detectLanguage() {
    const params = new URL(window.location.href).searchParams;
    const requested = normalizeLanguage(params.get("lang"));
    if (requested) return requested;
    const stored = readStoredLanguage();
    if (stored) return stored;
    const browserLanguages = Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
    for (const language of browserLanguages) {
      const supported = normalizeLanguage(language);
      if (supported) return supported;
    }
    return "en";
  }

  function translatedValue(source, language) {
    const entry = copy[source];
    if (!entry) {
      const landscapeMatch = source.match(/^Show landscape (\d+)$/);
      if (landscapeMatch) {
        if (language === "ja") return `景色 ${landscapeMatch[1]} を表示`;
        if (language === "ko") return `풍경 ${landscapeMatch[1]} 보기`;
        if (language === "zh-TW") return `顯示景點 ${landscapeMatch[1]}`;
      }
      const reviewMatch = source.match(/^Show review (\d+)$/);
      if (reviewMatch) {
        if (language === "ja") return `利用シーン ${reviewMatch[1]} を表示`;
        if (language === "ko") return `사용 상황 ${reviewMatch[1]} 보기`;
        if (language === "zh-TW") return `顯示情境 ${reviewMatch[1]}`;
      }
      return source;
    }
    return entry[language] ?? source;
  }

  function translateTextNodes(language) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT", "OPTION"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return node.nodeValue && node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const sourceValue = originalText.get(node);
      const trimmed = sourceValue.trim();
      const leading = sourceValue.match(/^\s*/)?.[0] ?? "";
      const trailing = sourceValue.match(/\s*$/)?.[0] ?? "";
      node.nodeValue = `${leading}${translatedValue(trimmed, language)}${trailing}`;
    }
  }

  function translateAttributes(language) {
    const attributes = ["aria-label", "title", "alt"];
    document.querySelectorAll("[aria-label], [title], img[alt]").forEach((element) => {
      let originals = originalAttributes.get(element);
      if (!originals) {
        originals = {};
        originalAttributes.set(element, originals);
      }
      for (const attribute of attributes) {
        if (!element.hasAttribute(attribute)) continue;
        if (!(attribute in originals)) originals[attribute] = element.getAttribute(attribute) ?? "";
        element.setAttribute(attribute, translatedValue(originals[attribute], language));
      }
    });
  }

  function updateMetadata(language) {
    const meta = pageMeta[language] ?? pageMeta.en;
    document.title = meta.title;
    const description = document.querySelector('meta[name="description"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (description) description.setAttribute("content", meta.description);
    if (ogTitle) ogTitle.setAttribute("content", meta.title);
    if (ogDescription) ogDescription.setAttribute("content", meta.description);
  }

  function saveLanguage(language) {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
      window.localStorage.setItem(LEGACY_STORAGE_KEY, language === "zh-TW" ? "zh" : language);
    } catch (error) {
      console.warn("Unable to save language preference.", error);
    }
  }

  function updateLanguageUrl(language) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", language);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    } catch (error) {
      console.warn("Unable to update language URL.", error);
    }
  }

  function applyLanguage(language, options = {}) {
    const safeLanguage = SUPPORTED.has(language) ? language : "en";
    try {
      document.documentElement.lang = HTML_LANG[safeLanguage];
      translateTextNodes(safeLanguage);
      translateAttributes(safeLanguage);
      updateMetadata(safeLanguage);
      const selector = document.getElementById("language-select");
      if (selector) selector.value = safeLanguage;
      if (options.persist) saveLanguage(safeLanguage);
      if (options.updateUrl) updateLanguageUrl(safeLanguage);
      window.dispatchEvent(new CustomEvent("pikflyer:languagechange", { detail: { language: safeLanguage } }));
    } catch (error) {
      console.error("Unable to apply website language.", error);
    } finally {
      document.documentElement.classList.remove("i18n-pending");
    }
  }

  const selector = document.getElementById("language-select");
  if (selector) {
    selector.addEventListener("change", (event) => {
      const language = normalizeLanguage(event.target.value) ?? "en";
      applyLanguage(language, { persist: true, updateUrl: true });
    });
  }

  applyLanguage(detectLanguage());
})();
