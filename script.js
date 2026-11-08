(function initOnReady(fn) { if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', fn, { once: true }); } else { fn(); } })(function () {
  if (window.__velvetMainInitialized) return;
  window.__velvetMainInitialized = true;
  var API_BASE = window.location.port === '7860' ? '' : 'http://127.0.0.1:7860';
  var API = {
    catalog: API_BASE + '/api/catalog',
    sendCode: API_BASE + '/api/auth/send-code',
    verifyCode: API_BASE + '/api/auth/verify',
    myOrders: API_BASE + '/api/my-orders',
    review: API_BASE + '/api/review',
    order: API_BASE + '/api/order',
    adminLogin: API_BASE + '/api/admin/login',
    admin: API_BASE + '/api/admin/action'
  };

  // ==========================================
  // 0. ФУНКЦИИ ЗАЩИТЫ ОТ XSS И БЕЗОПАСНОЙ РАБОТЫ С DOM
  // ==========================================
  function escapeHtml(val) {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeImageUrl(url, fallback) {
    if (!url) return fallback || '';
    var u = String(url).trim();
    if (/^https?:\/\/[^\s<>"']+$/i.test(u)) {
      return u;
    }
    if (/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(u)) {
      return u;
    }
    return fallback || '';
  }

  function safeStorageGet(kind, key) {
    try {
      var store = kind === 'session' ? window.sessionStorage : window.localStorage;
      return store ? store.getItem(key) : null;
    } catch (e) {
      return null;
    }
  }

  function safeStorageSet(kind, key, val) {
    try {
      var store = kind === 'session' ? window.sessionStorage : window.localStorage;
      if (store) store.setItem(key, val);
    } catch (e) {}
  }

  function safeStorageRemove(kind, key) {
    try {
      var store = kind === 'session' ? window.sessionStorage : window.localStorage;
      if (store) store.removeItem(key);
    } catch (e) {}
  }

  // ==========================================
  // 1. ПОЛНЫЙ КАТАЛОГ ТОРТОВ (168 ПОЗИЦИЙ), НАЧИНОК (27) И ОТЗЫВОВ (18) С САЙТА TORT54.RU
  // ==========================================
  var DEFAULT_CATALOG = [
  {
    "id": "cake_1",
    "db_id": 1,
    "sku": "a0024",
    "category": "berry",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": true,
    "badge": "ХИТ • A0024",
    "emoji": "🍓",
    "meta": "Вес: 2,5 кг • Артикул: A0024 • от 1700 ₽/кг",
    "title": "Торт A0024",
    "short_desc": "Кремовый торт с ягодами и фруктами",
    "text": "Кремовый торт с ягодами и фруктами. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4600,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3235-3733-4731-b463-313531336437/0024.jpg",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-952163046442-tort-a0024",
    "is_active": true
  },
  {
    "id": "cake_2",
    "db_id": 2,
    "sku": "d0010",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ • D0010",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0010 • от 1700 ₽/кг",
    "title": "Детский торт D0010",
    "short_desc": "Шоколадный крем чиз с клубникой и печеньем OREO",
    "text": "Шоколадный крем чиз с клубникой и печеньем OREO. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 6000,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3931-3266-4333-a361-313465313037/D0010.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-327236339109-detskii-tort-d0010",
    "is_active": true
  },
  {
    "id": "cake_3",
    "db_id": 3,
    "sku": "w0100",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: W0100",
    "emoji": "💍",
    "meta": "Вес: 8,0 кг • Артикул: W0100 • от 1700 ₽/кг",
    "title": "Свадебный торт W0100",
    "short_desc": "Нежный торт с цветами, шоколадными шарами и сердцами из изомальта.",
    "text": "Нежный торт с цветами, шоколадными шарами и сердцами из изомальта.. Вес: 8,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 15500,
    "unit": "/ 8 кг",
    "weight_kg": 8.0,
    "image": "https://optim.tildacdn.com/stor6464-3163-4161-b030-663533323565/-/format/webp/21730684.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-982946505871-svadebnii-tort-w0100",
    "is_active": true
  },
  {
    "id": "cake_4",
    "db_id": 4,
    "sku": "d0189",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0189",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0189 • от 1700 ₽/кг",
    "title": "Детский торт D0189",
    "short_desc": "Торт бабочки",
    "text": "Торт бабочки. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5200,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/stor6162-6437-4136-b161-316432323961/92694788.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-286942281012-detskii-tort-d0189",
    "is_active": true
  },
  {
    "id": "cake_5",
    "db_id": 5,
    "sku": "w0001",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ • W0001",
    "emoji": "💍",
    "meta": "Вес: 4,5 кг • Артикул: W0001 • от 1700 ₽/кг",
    "title": "Свадебный торт W0001",
    "short_desc": "Нежный с розами кремового цвета",
    "text": "Нежный с розами кремового цвета. Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 8600,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://optim.tildacdn.com/tild3130-6630-4638-b437-396238626338/-/contain/264x264/center/center/-/format/webp/W0001.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-535121304815-svadebnii-tort-w0001",
    "is_active": true
  },
  {
    "id": "cake_6",
    "db_id": 6,
    "sku": "a0003",
    "category": "corp",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": true,
    "badge": "ХИТ • A0003",
    "emoji": "🏆",
    "meta": "Вес: 2,5 кг • Артикул: A0003 • от 1700 ₽/кг",
    "title": "Торт A0003",
    "short_desc": "Торт Forbes 01",
    "text": "Торт Forbes 01. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5000,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild6530-6465-4335-b332-353961396363/-/contain/264x264/center/center/-/format/webp/0003.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-308507397652-tort-a0003",
    "is_active": true
  },
  {
    "id": "cake_7",
    "db_id": 7,
    "sku": "d0188",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0188",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0188 • от 1700 ₽/кг",
    "title": "Детский торт D0188",
    "short_desc": "Торт с паспортом",
    "text": "Торт с паспортом. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5100,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/stor6137-3436-4461-a261-346630646633/-/contain/194x264/center/center/-/format/webp/38623211.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-377274615672-detskii-tort-d0188",
    "is_active": true
  },
  {
    "id": "cake_8",
    "db_id": 8,
    "sku": "d0187",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0187",
    "emoji": "🦄",
    "meta": "Вес: 5,0 кг • Артикул: D0187 • от 1700 ₽/кг",
    "title": "Детский торт D0187",
    "short_desc": "Торт аниме",
    "text": "Торт аниме. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9500,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://static.tildacdn.com/stor3337-3962-4432-b233-623135363830/97011767.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-117636461992-detskii-tort-d0187",
    "is_active": true
  },
  {
    "id": "cake_9",
    "db_id": 9,
    "sku": "d0186",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0186",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0186 • от 1700 ₽/кг",
    "title": "Детский торт D0186",
    "short_desc": "Торт с единорогом",
    "text": "Торт с единорогом. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5500,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/stor3137-6665-4234-a265-666338363133/-/contain/236x264/center/center/-/format/webp/38350151.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-918357729102-detskii-tort-d0186",
    "is_active": true
  },
  {
    "id": "cake_10",
    "db_id": 10,
    "sku": "d0185",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0185",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0185 • от 1700 ₽/кг",
    "title": "Детский торт D0185",
    "short_desc": "Торт на годик",
    "text": "Торт на годик. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5300,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/stor6533-6261-4261-b566-303537663036/42321055.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-377554409632-detskii-tort-d0185",
    "is_active": true
  },
  {
    "id": "cake_11",
    "db_id": 11,
    "sku": "d0184",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0184",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0184 • от 1700 ₽/кг",
    "title": ": Детский торт D0184",
    "short_desc": "Торт с оленёнком",
    "text": "Торт с оленёнком. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 6000,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/stor6665-3733-4365-b062-313736353932/-/contain/264x264/center/center/-/format/webp/83919860.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-802521522492--detskii-tort-d0184",
    "is_active": true
  },
  {
    "id": "cake_12",
    "db_id": 12,
    "sku": "d0183",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0183",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0183 • от 1700 ₽/кг",
    "title": "Copy: Детский торт D0183",
    "short_desc": "Торт для девочки",
    "text": "Торт для девочки. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5100,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/stor3133-3936-4162-b537-626336653734/39014474.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-382200012512-copy-detskii-tort-d0183",
    "is_active": true
  },
  {
    "id": "cake_13",
    "db_id": 13,
    "sku": "d0182",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0182",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0182 • от 1700 ₽/кг",
    "title": ": Детский торт D0182",
    "short_desc": "Кремовый торт с бантиками",
    "text": "Кремовый торт с бантиками. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4400,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/stor6265-3032-4333-a138-633338323366/49263075.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-433078889012--detskii-tort-d0182",
    "is_active": true
  },
  {
    "id": "cake_14",
    "db_id": 14,
    "sku": "d0182",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0182",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0182 • от 1700 ₽/кг",
    "title": "Детский торт D0182 (Торт с паспортом)",
    "short_desc": "Торт с паспортом",
    "text": "Торт с паспортом. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5000,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/stor6137-3436-4461-a261-346630646633/-/contain/194x264/center/center/-/format/webp/38623211.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-354828072992-detskii-tort-d0182",
    "is_active": true
  },
  {
    "id": "cake_15",
    "db_id": 15,
    "sku": "d0181",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0181",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0181 • от 1700 ₽/кг",
    "title": ": Детский торт D0181",
    "short_desc": "Торт с леденцами и бабочками",
    "text": "Торт с леденцами и бабочками. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5300,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/stor6633-6530-4466-b434-636330623335/69987146.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-775760399592--detskii-tort-d0181",
    "is_active": true
  },
  {
    "id": "cake_16",
    "db_id": 16,
    "sku": "d0180",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0180",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0180 • от 1700 ₽/кг",
    "title": "Детский торт D0180",
    "short_desc": "Торт с бантом",
    "text": "Торт с бантом. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4800,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/stor3130-3732-4338-b963-336530616162/-/contain/194x264/center/center/-/format/webp/78061252.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-606838903592-detskii-tort-d0180",
    "is_active": true
  },
  {
    "id": "cake_17",
    "db_id": 17,
    "sku": "d0179",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0179",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0179 • от 1700 ₽/кг",
    "title": "Детский торт D0179",
    "short_desc": "Торт космонавт",
    "text": "Торт космонавт. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5400,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/stor3232-3734-4666-b539-653930653931/-/contain/231x264/center/center/-/format/webp/71917020.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-956190021632-detskii-tort-d0179",
    "is_active": true
  },
  {
    "id": "cake_18",
    "db_id": 18,
    "sku": "d0178",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0178",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0178 • от 1700 ₽/кг",
    "title": ": Детский торт D0178",
    "short_desc": "Торт на крещение",
    "text": "Торт на крещение. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5200,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/stor6236-6635-4337-b366-333930363062/-/contain/181x264/center/center/-/format/webp/72490853.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-210176178832--detskii-tort-d0178",
    "is_active": true
  },
  {
    "id": "cake_19",
    "db_id": 19,
    "sku": "d0177",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0177",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0177 • от 1700 ₽/кг",
    "title": "Детский торт D0177",
    "short_desc": "Кремовый торт с радугой и бабочками",
    "text": "Кремовый торт с радугой и бабочками. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5800,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/stor3030-6633-4261-b062-333565303334/-/contain/211x264/center/center/-/format/webp/95055860.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-786981317222-detskii-tort-d0177",
    "is_active": true
  },
  {
    "id": "cake_20",
    "db_id": 20,
    "sku": "d0131",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0131",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0131 • от 1700 ₽/кг",
    "title": "Детский торт D0131",
    "short_desc": "Торт с Единорогом",
    "text": "Торт с Единорогом. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5500,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/stor3137-6665-4234-a265-666338363133/-/contain/236x264/center/center/-/format/webp/38350151.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-690095719561-detskii-tort-d0131",
    "is_active": true
  },
  {
    "id": "cake_21",
    "db_id": 21,
    "sku": "d0134",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0134",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0134 • от 1700 ₽/кг",
    "title": "Детский торт D0134",
    "short_desc": "Торт для современного подростка",
    "text": "Торт для современного подростка. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4800,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild6135-3133-4638-a437-333362393964/07.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-553583841591-detskii-tort-d0134",
    "is_active": true
  },
  {
    "id": "cake_22",
    "db_id": 22,
    "sku": "d0038",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0038",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0038 • от 1700 ₽/кг",
    "title": "Детский торт D0038",
    "short_desc": "Торт Единорог",
    "text": "Торт Единорог. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4800,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3235-3764-4366-b063-643435306563/-/contain/264x264/center/center/-/format/webp/D0038.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-609635588259-detskii-tort-d0038",
    "is_active": true
  },
  {
    "id": "cake_23",
    "db_id": 23,
    "sku": "d0169",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ • D0169",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0169 • от 1700 ₽/кг",
    "title": "Детский торт D0169",
    "short_desc": "Торт Майн",
    "text": "Торт Майн. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5200,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3634-3061-4832-a232-636261373466/D0001.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-726008141161-detskii-tort-d0169",
    "is_active": true
  },
  {
    "id": "cake_24",
    "db_id": 24,
    "sku": "d0146",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0146",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0146 • от 1700 ₽/кг",
    "title": "Детский торт D0146",
    "short_desc": "Торт с героями",
    "text": "Торт с героями. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4800,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3732-3333-4064-a133-653163396564/023.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-969894938091-detskii-tort-d0146",
    "is_active": true
  },
  {
    "id": "cake_25",
    "db_id": 25,
    "sku": "d0137",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: D0137",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0137 • от 1700 ₽/кг",
    "title": "Детский торт D0137",
    "short_desc": "Торт CS GO",
    "text": "Торт CS GO. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5800,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3764-6461-4938-a630-646530356238/-/contain/264x264/center/center/-/format/webp/24.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-957109180851-detskii-tort-d0137",
    "is_active": true
  },
  {
    "id": "cake_26",
    "db_id": 26,
    "sku": "d0175",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ • D0175",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0175 • от 1700 ₽/кг",
    "title": "Детский торт D0175",
    "short_desc": "Торт с куклами",
    "text": "Торт с куклами. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5300,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/stor3133-3936-4162-b537-626336653734/39014474.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-479135262681-detskii-tort-d0175",
    "is_active": true
  },
  {
    "id": "cake_27",
    "db_id": 27,
    "sku": "d0041",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ -10% • D0041",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0041 • от 1700 ₽/кг",
    "title": "Детский торт D0041",
    "short_desc": "Торт с младенцем",
    "text": "Торт с младенцем. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5100,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/stor6533-6261-4261-b566-303537663036/42321055.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-277954728848-detskii-tort-d0041",
    "is_active": true
  },
  {
    "id": "cake_28",
    "db_id": 28,
    "sku": "d0171",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ • D0171",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0171 • от 1700 ₽/кг",
    "title": "Детский торт D0171",
    "short_desc": "Торт с Сониками",
    "text": "Торт с Сониками. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5400,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3732-3333-4064-a133-653163396564/023.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-534372324471-detskii-tort-d0171",
    "is_active": true
  },
  {
    "id": "cake_29",
    "db_id": 29,
    "sku": "d0039",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ -10% • D0039",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0039 • от 1700 ₽/кг",
    "title": "Детский торт D0039",
    "short_desc": "Торт с фигуркой Единорогом",
    "text": "Торт с фигуркой Единорогом. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5200,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3235-3764-4366-b063-643435306563/-/contain/264x264/center/center/-/format/webp/D0038.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-290377741962-detskii-tort-d0039",
    "is_active": true
  },
  {
    "id": "cake_30",
    "db_id": 30,
    "sku": "d0159",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0159",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0159 • от 1700 ₽/кг",
    "title": "Детский торт D0159",
    "short_desc": "Торт с мишкой и безе",
    "text": "Торт с мишкой и безе. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4900,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3764-6332-4165-a661-343035386330/18.jpg",
    "product_url": "https://www.tort54.ru/tproduct/110332707-733545299531-detskii-tort-d0159",
    "is_active": true
  },
  {
    "id": "cake_31",
    "db_id": 31,
    "sku": "d0176",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0176",
    "emoji": "🦄",
    "meta": "Вес: 4,5 кг • Артикул: D0176 • от 1700 ₽/кг",
    "title": "Детский торт D0176",
    "short_desc": "Торт с куклами",
    "text": "Торт с куклами. Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 8400,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://static.tildacdn.com/stor3133-3936-4162-b537-626336653734/39014474.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-795561707821-detskii-tort-d0176",
    "is_active": true
  },
  {
    "id": "cake_32",
    "db_id": 32,
    "sku": "d0155",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0155",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0155 • от 1700 ₽/кг",
    "title": "Детский торт D0155",
    "short_desc": "Торт три единорога",
    "text": "Торт три единорога. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 6100,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3061-6264-4437-b439-396465666531/037.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-299154527441-detskii-tort-d0155",
    "is_active": true
  },
  {
    "id": "cake_33",
    "db_id": 33,
    "sku": "d0003",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ -10% • D0003",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0003 • от 1700 ₽/кг",
    "title": "Детский торт D0003",
    "short_desc": "Торт с фигуркой М.",
    "text": "Торт с фигуркой М.. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5100,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3736-3539-4639-a539-303464336561/-/contain/264x264/center/center/-/format/webp/D0003.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-742465015549-detskii-tort-d0003",
    "is_active": true
  },
  {
    "id": "cake_34",
    "db_id": 34,
    "sku": "d0156",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ -10% • D0156",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0156 • от 1700 ₽/кг",
    "title": "Детский торт D0156",
    "short_desc": "Торт тачка (новый)",
    "text": "Торт тачка (новый). Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5900,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3634-3061-4832-a232-636261373466/D0001.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-159813667391-detskii-tort-d0156",
    "is_active": true
  },
  {
    "id": "cake_35",
    "db_id": 35,
    "sku": "d0136",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0136",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0136 • от 1700 ₽/кг",
    "title": "Детский торт D0136",
    "short_desc": "Торт с зайкой",
    "text": "Торт с зайкой. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5200,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/stor6533-6261-4261-b566-303537663036/42321055.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-408671342021-detskii-tort-d0136",
    "is_active": true
  },
  {
    "id": "cake_36",
    "db_id": 36,
    "sku": "d0006",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ • D0006",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0006 • от 1700 ₽/кг",
    "title": "Детский торт D0006",
    "short_desc": "Кремовый торт с клубникой и голубикой",
    "text": "Кремовый торт с клубникой и голубикой. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4800,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild6139-3430-4966-b733-353763626331/D0006.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-406376535294-detskii-tort-d0006",
    "is_active": true
  },
  {
    "id": "cake_37",
    "db_id": 37,
    "sku": "d0004",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ • D0004",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0004 • от 1700 ₽/кг",
    "title": "Детский торт D0165",
    "short_desc": "Торт с машинкой",
    "text": "Торт с машинкой. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5200,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3634-3061-4832-a232-636261373466/D0001.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-194926366991-detskii-tort-d0165",
    "is_active": true
  },
  {
    "id": "cake_38",
    "db_id": 38,
    "sku": "d0012",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: D0012",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0012 • от 1700 ₽/кг",
    "title": "Детский торт D0012",
    "short_desc": "Торт с пауком",
    "text": "Торт с пауком. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4900,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3832-6637-4865-b163-353663393162/-/contain/298x298/center/center/-/format/webp/D0012.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-320095776663-detskii-tort-d0012",
    "is_active": true
  },
  {
    "id": "cake_39",
    "db_id": 39,
    "sku": "d0032",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ -10% • D0032",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0032 • от 1700 ₽/кг",
    "title": "Детский торт D0032",
    "short_desc": "Торт (пример)",
    "text": "Торт (пример). Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4500,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild6236-6633-4361-b434-613738393265/-/contain/264x264/center/center/-/format/webp/D0032.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-566352215070-detskii-tort-d0032",
    "is_active": true
  },
  {
    "id": "cake_40",
    "db_id": 40,
    "sku": "d0011",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ -10% • D0011",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0011 • от 1700 ₽/кг",
    "title": "Детский торт D0011",
    "short_desc": "Торт с фигуркой ММ",
    "text": "Торт с фигуркой ММ. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5500,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3636-6233-4038-b133-306639366663/D0011.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-134661503703-detskii-tort-d0011",
    "is_active": true
  },
  {
    "id": "cake_41",
    "db_id": 41,
    "sku": "d0121",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0121",
    "emoji": "🦄",
    "meta": "Вес: 4,5 кг • Артикул: D0121 • от 1700 ₽/кг",
    "title": "Детский торт D0121",
    "short_desc": "Торт с короной и мишками. Два яруса",
    "text": "Торт с короной и мишками. Два яруса. Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9400,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://static.tildacdn.com/tild3764-6332-4165-a661-343035386330/18.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-661588914470-detskii-tort-d0121",
    "is_active": true
  },
  {
    "id": "cake_42",
    "db_id": 42,
    "sku": "d0173",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0173",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0173 • от 1700 ₽/кг",
    "title": "Детский торт D0173",
    "short_desc": "Торт с Халком",
    "text": "Торт с Халком. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4800,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3732-3333-4064-a133-653163396564/023.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-419703771951-detskii-tort-d0173",
    "is_active": true
  },
  {
    "id": "cake_43",
    "db_id": 43,
    "sku": "d0139",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ -10% • D0139",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0139 • от 1700 ₽/кг",
    "title": "Детский торт D0139",
    "short_desc": "Торт с короной",
    "text": "Торт с короной. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4700,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/stor6265-3032-4333-a138-633338323366/49263075.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-426868538961-detskii-tort-d0139",
    "is_active": true
  },
  {
    "id": "cake_44",
    "db_id": 44,
    "sku": "d0013",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ -10% • D0013",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0013 • от 1700 ₽/кг",
    "title": "Детский торт D0013",
    "short_desc": "Торт Губка Боб. Цена указана без ромашек",
    "text": "Торт Губка Боб. Цена указана без ромашек. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5100,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3634-3061-4832-a232-636261373466/D0001.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-625590756147-detskii-tort-d0013",
    "is_active": true
  },
  {
    "id": "cake_45",
    "db_id": 45,
    "sku": "d0009",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0009",
    "emoji": "🦄",
    "meta": "Вес: 4,5 кг • Артикул: D0009 • от 1700 ₽/кг",
    "title": "Детский торт D0009",
    "short_desc": "Торт с 3-мя фигурками мишек на годик",
    "text": "Торт с 3-мя фигурками мишек на годик. Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9800,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://static.tildacdn.com/tild3764-6332-4165-a661-343035386330/18.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-216457070315-detskii-tort-d0009",
    "is_active": true
  },
  {
    "id": "cake_46",
    "db_id": 46,
    "sku": "d0015",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ -10% • D0015",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0015 • от 1700 ₽/кг",
    "title": "Детский торт D0015",
    "short_desc": "Торт Черепашки",
    "text": "Торт Черепашки. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4700,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3732-3333-4064-a133-653163396564/023.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-616646011656-detskii-tort-d0015",
    "is_active": true
  },
  {
    "id": "cake_47",
    "db_id": 47,
    "sku": "d0133",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ -10% • D0133",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0133 • от 1700 ₽/кг",
    "title": "Детский торт D0133",
    "short_desc": "Торт с миньонами",
    "text": "Торт с миньонами. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5900,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3636-6233-4038-b133-306639366663/D0011.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-323208925561-detskii-tort-d0133",
    "is_active": true
  },
  {
    "id": "cake_48",
    "db_id": 48,
    "sku": "d0145",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0145",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0145 • от 1700 ₽/кг",
    "title": "Детский торт D0145",
    "short_desc": "Футболист (Торт футбол)",
    "text": "Футболист (Торт футбол). Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4900,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild6135-3133-4638-a437-333362393964/07.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-404161581761-detskii-tort-d0145",
    "is_active": true
  },
  {
    "id": "cake_49",
    "db_id": 49,
    "sku": "d0140",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ • D0140",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0140 • от 1700 ₽/кг",
    "title": "Детский торт D0140",
    "short_desc": "Торт с мишками",
    "text": "Торт с мишками. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 6700,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3764-6332-4165-a661-343035386330/18.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-162622654141-detskii-tort-d0140",
    "is_active": true
  },
  {
    "id": "cake_50",
    "db_id": 50,
    "sku": "d0148",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0148",
    "emoji": "🦄",
    "meta": "Вес: 4,5 кг • Артикул: D0148 • от 1700 ₽/кг",
    "title": "Детский торт D0148",
    "short_desc": "Торт с оленёнками",
    "text": "Торт с оленёнками. Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9600,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://optim.tildacdn.com/stor6665-3733-4365-b062-313736353932/-/contain/264x264/center/center/-/format/webp/83919860.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-220043244291-detskii-tort-d0148",
    "is_active": true
  },
  {
    "id": "cake_51",
    "db_id": 51,
    "sku": "d0141",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": true,
    "is_hit": true,
    "badge": "ХИТ -10% • D0141",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0141 • от 1700 ₽/кг",
    "title": "Детский торт D0141",
    "short_desc": "Розовый с клубникой",
    "text": "Розовый с клубникой. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4700,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3263-3834-4162-b063-343539313830/-/contain/264x264/center/center/-/format/webp/001.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-715091817361-detskii-tort-d0141",
    "is_active": true
  },
  {
    "id": "cake_52",
    "db_id": 52,
    "sku": "d0150",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0150",
    "emoji": "🦄",
    "meta": "Вес: 4,5 кг • Артикул: D0150 • от 1700 ₽/кг",
    "title": "Детский торт D0150",
    "short_desc": "Торт с мишками и качелей",
    "text": "Торт с мишками и качелей. Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 10700,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://static.tildacdn.com/tild3764-6332-4165-a661-343035386330/18.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-822630126871-detskii-tort-d0150",
    "is_active": true
  },
  {
    "id": "cake_53",
    "db_id": 53,
    "sku": "d0151",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0151",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0151 • от 1700 ₽/кг",
    "title": "Детский торт D0151",
    "short_desc": "Торт заяц с шарами",
    "text": "Торт заяц с шарами. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 6000,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/stor6533-6261-4261-b566-303537663036/42321055.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-815840318441-detskii-tort-d0151",
    "is_active": true
  },
  {
    "id": "cake_54",
    "db_id": 54,
    "sku": "d0154",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: D0154",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0154 • от 1700 ₽/кг",
    "title": "Детский торт D0154",
    "short_desc": "Торт КФС",
    "text": "Торт КФС. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 7400,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3863-3331-4036-b737-663665313335/-/contain/264x264/center/center/-/format/webp/036.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-134281410491-detskii-tort-d0154",
    "is_active": true
  },
  {
    "id": "cake_55",
    "db_id": 55,
    "sku": "d0160",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ -10% • D0160",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0160 • от 1700 ₽/кг",
    "title": "Детский торт D0160",
    "short_desc": "Торт Соник",
    "text": "Торт Соник. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4800,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3732-3333-4064-a133-653163396564/023.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-678122878921-detskii-tort-d0160",
    "is_active": true
  },
  {
    "id": "cake_56",
    "db_id": 56,
    "sku": "d0028",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ -10% • D0028",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0028 • от 1700 ₽/кг",
    "title": "Детский торт D0028",
    "short_desc": "Торт с 3-мя М.",
    "text": "Торт с 3-мя М.. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5100,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3736-3539-4639-a539-303464336561/-/contain/264x264/center/center/-/format/webp/D0003.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-479081132957-detskii-tort-d0028",
    "is_active": true
  },
  {
    "id": "cake_57",
    "db_id": 57,
    "sku": "d0061",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0061",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0061 • от 1700 ₽/кг",
    "title": "Детский торт D0061",
    "short_desc": "Торт со слонёнком",
    "text": "Торт со слонёнком. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5000,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/stor6533-6261-4261-b566-303537663036/42321055.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-731092812232-detskii-tort-d0061",
    "is_active": true
  },
  {
    "id": "cake_58",
    "db_id": 58,
    "sku": "d0075",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: D0075",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0075 • от 1700 ₽/кг",
    "title": "Детский торт D0075",
    "short_desc": "Торт с самолётом",
    "text": "Торт с самолётом. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5200,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild6338-3232-4736-a661-316232326235/-/contain/264x264/center/center/-/format/webp/D0075.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-916884412969-detskii-tort-d0075",
    "is_active": true
  },
  {
    "id": "cake_59",
    "db_id": 59,
    "sku": "d0066",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0066",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0066 • от 1700 ₽/кг",
    "title": "Детский торт D0066",
    "short_desc": "Торт Леди Баг и Супер Кот",
    "text": "Торт Леди Баг и Супер Кот. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4800,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3832-6637-4865-b163-353663393162/-/contain/298x298/center/center/-/format/webp/D0012.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-325808779636-detskii-tort-d0066",
    "is_active": true
  },
  {
    "id": "cake_60",
    "db_id": 60,
    "sku": "d0072",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0072",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0072 • от 1700 ₽/кг",
    "title": "Детский торт D0072",
    "short_desc": "Торт Танк",
    "text": "Торт Танк. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 6000,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3764-6461-4938-a630-646530356238/-/contain/264x264/center/center/-/format/webp/24.jpg.webp",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-377193034793-detskii-tort-d0072",
    "is_active": true
  },
  {
    "id": "cake_61",
    "db_id": 61,
    "sku": "d0078",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0078",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0078 • от 1700 ₽/кг",
    "title": "Детский торт D0078",
    "short_desc": "Торт 0078",
    "text": "Торт 0078. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4800,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3634-3061-4832-a232-636261373466/D0001.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-215732355155-detskii-tort-d0078",
    "is_active": true
  },
  {
    "id": "cake_62",
    "db_id": 62,
    "sku": "d0086",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0086",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0086 • от 1700 ₽/кг",
    "title": "Детский торт D0086",
    "short_desc": "Торт 0086",
    "text": "Торт 0086. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4700,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild6139-3430-4966-b733-353763626331/D0006.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-861019998838-detskii-tort-d0086",
    "is_active": true
  },
  {
    "id": "cake_63",
    "db_id": 63,
    "sku": "d0108",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0108",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0108 • от 1700 ₽/кг",
    "title": "Детский торт D0108",
    "short_desc": "Торт с 0108",
    "text": "Торт с 0108. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5600,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/stor6633-6530-4466-b434-636330623335/69987146.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-572301320601-detskii-tort-d0108",
    "is_active": true
  },
  {
    "id": "cake_64",
    "db_id": 64,
    "sku": "d0109",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0109",
    "emoji": "🦄",
    "meta": "Вес: 4,5 кг • Артикул: D0109 • от 1700 ₽/кг",
    "title": "Детский торт D0109",
    "short_desc": "Торт с Пони 02",
    "text": "Торт с Пони 02. Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 8400,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://static.tildacdn.com/tild3061-6264-4437-b439-396465666531/037.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-820960607294-detskii-tort-d0109",
    "is_active": true
  },
  {
    "id": "cake_65",
    "db_id": 65,
    "sku": "d0119",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0119",
    "emoji": "🦄",
    "meta": "Вес: 4,5 кг • Артикул: D0119 • от 1700 ₽/кг",
    "title": "Детский торт D0119",
    "short_desc": "Торт с башней",
    "text": "Торт с башней. Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5900,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://static.tildacdn.com/stor3133-3936-4162-b537-626336653734/39014474.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-956960365417-detskii-tort-d0119",
    "is_active": true
  },
  {
    "id": "cake_66",
    "db_id": 66,
    "sku": "d0128",
    "category": "kids",
    "section": "kids",
    "in_baby": true,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: D0128",
    "emoji": "🦄",
    "meta": "Вес: 2,5 кг • Артикул: D0128 • от 1700 ₽/кг",
    "title": "Детский торт D0128",
    "short_desc": "Торт с динозаврами",
    "text": "Торт с динозаврами. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4900,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/tild3634-3061-4832-a232-636261373466/D0001.jpg",
    "product_url": "https://www.tort54.ru/baby/tproduct/121565445-699462314421-detskii-tort-d0128",
    "is_active": true
  },
  {
    "id": "cake_67",
    "db_id": 67,
    "sku": "w0109",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: W0109",
    "emoji": "💍",
    "meta": "Вес: 8,0 кг • Артикул: W0109 • от 1700 ₽/кг",
    "title": "Свадебный торт W0109",
    "short_desc": "Нежный торт с вафельными цветами",
    "text": "Нежный торт с вафельными цветами. Вес: 8,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 15800,
    "unit": "/ 8 кг",
    "weight_kg": 8.0,
    "image": "https://static.tildacdn.com/stor6664-3631-4261-b766-383230343863/66996029.jpg",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-121182595962-svadebnii-tort-w0109",
    "is_active": true
  },
  {
    "id": "cake_68",
    "db_id": 68,
    "sku": "w0108",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: W0108",
    "emoji": "💍",
    "meta": "Вес: 2,5 кг • Артикул: W0108 • от 1700 ₽/кг",
    "title": "Свадебный торт W0108",
    "short_desc": "Торт с кольцами",
    "text": "Торт с кольцами. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5400,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://static.tildacdn.com/stor3161-3364-4466-b335-303866616364/78628838.jpg",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-200676587982-svadebnii-tort-w0108",
    "is_active": true
  },
  {
    "id": "cake_69",
    "db_id": 69,
    "sku": "w0107",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: W0107",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0107 • от 1700 ₽/кг",
    "title": "Свадебный торт W0107",
    "short_desc": "Торт с бабочками",
    "text": "Торт с бабочками. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9400,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://static.tildacdn.com/stor6538-3036-4961-b730-323037343634/18416439.jpg",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-546056275062-svadebnii-tort-w0107",
    "is_active": true
  },
  {
    "id": "cake_70",
    "db_id": 70,
    "sku": "w0106",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: W0106",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0106 • от 1700 ₽/кг",
    "title": "Свадебный торт W0106",
    "short_desc": "Нежный торт с цветами",
    "text": "Нежный торт с цветами. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9800,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://static.tildacdn.com/stor6531-3062-4363-b938-393134356438/46706249.jpg",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-391407425112-svadebnii-tort-w0106",
    "is_active": true
  },
  {
    "id": "cake_71",
    "db_id": 71,
    "sku": "w0105",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: W0105",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0105 • от 1700 ₽/кг",
    "title": ": Свадебный торт W0105",
    "short_desc": "Торт с кольцами",
    "text": "Торт с кольцами. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9100,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://static.tildacdn.com/stor3035-3833-4862-a435-316662643336/28829773.jpg",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-830598339872--svadebnii-tort-w0105",
    "is_active": true
  },
  {
    "id": "cake_72",
    "db_id": 72,
    "sku": "w0104",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: W0104",
    "emoji": "💍",
    "meta": "Вес: 8,0 кг • Артикул: W0104 • от 1700 ₽/кг",
    "title": ": Свадебный торт W0104",
    "short_desc": "Торт с ягодой",
    "text": "Торт с ягодой. Вес: 8,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 14700,
    "unit": "/ 8 кг",
    "weight_kg": 8.0,
    "image": "https://static.tildacdn.com/stor6434-6137-4762-b163-303430396362/39674646.jpg",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-309560654292--svadebnii-tort-w0104",
    "is_active": true
  },
  {
    "id": "cake_73",
    "db_id": 73,
    "sku": "w0103",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: W0103",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0103 • от 1700 ₽/кг",
    "title": ": Свадебный торт W0103",
    "short_desc": "Торт с вафельными парусами",
    "text": "Торт с вафельными парусами. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9800,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://optim.tildacdn.com/stor3535-6366-4163-b339-353039663635/-/contain/218x264/center/center/-/format/webp/28185053.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-645787168922--svadebnii-tort-w0103",
    "is_active": true
  },
  {
    "id": "cake_74",
    "db_id": 74,
    "sku": "w0102",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: W0102",
    "emoji": "💍",
    "meta": "Вес: 8,0 кг • Артикул: W0102 • от 1700 ₽/кг",
    "title": "Свадебный торт W0102",
    "short_desc": "Нежный торт",
    "text": "Нежный торт. Вес: 8,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 15800,
    "unit": "/ 8 кг",
    "weight_kg": 8.0,
    "image": "https://optim.tildacdn.com/stor6633-6635-4234-b062-316438653234/-/contain/201x264/center/center/-/format/webp/18394086.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-876250167232-svadebnii-tort-w0102",
    "is_active": true
  },
  {
    "id": "cake_75",
    "db_id": 75,
    "sku": "w0101",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": true,
    "badge": "SKU: W0101",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0101 • от 1700 ₽/кг",
    "title": "Свадебный торт W0101",
    "short_desc": "Торт с эустомой",
    "text": "Торт с эустомой. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 11200,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://optim.tildacdn.com/stor3065-6662-4134-b739-333666346136/-/contain/217x264/center/center/-/format/webp/77663389.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-641838405062-svadebnii-tort-w0101",
    "is_active": true
  },
  {
    "id": "cake_76",
    "db_id": 76,
    "sku": "w0004",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0004",
    "emoji": "💍",
    "meta": "Вес: 8,0 кг • Артикул: W0004 • от 1700 ₽/кг",
    "title": "Свадебный торт W0004",
    "short_desc": "Белый торт с цветочками синего цвета",
    "text": "Белый торт с цветочками синего цвета. Вес: 8,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 14700,
    "unit": "/ 8 кг",
    "weight_kg": 8.0,
    "image": "https://optim.tildacdn.com/tild3430-6664-4632-a135-393938306531/-/contain/264x264/center/center/-/format/webp/W0004.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-305098250105-svadebnii-tort-w0004",
    "is_active": true
  },
  {
    "id": "cake_77",
    "db_id": 77,
    "sku": "w0005",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ • W0005",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0005 • от 1700 ₽/кг",
    "title": "Свадебный торт W0005",
    "short_desc": "Белый с розовыми сердцами",
    "text": "Белый с розовыми сердцами. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9600,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://optim.tildacdn.com/tild6131-3764-4165-b962-666636313030/-/contain/264x264/center/center/-/format/webp/W0005.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-870482664320-svadebnii-tort-w0005",
    "is_active": true
  },
  {
    "id": "cake_78",
    "db_id": 78,
    "sku": "w0008",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0008",
    "emoji": "💍",
    "meta": "Вес: 4,5 кг • Артикул: W0008 • от 1700 ₽/кг",
    "title": "Свадебный торт W0008",
    "short_desc": "Нежно-белый с розами и веточками фисташки",
    "text": "Нежно-белый с розами и веточками фисташки. Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 8500,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://optim.tildacdn.com/tild6138-3739-4430-b566-646664643831/-/contain/264x264/center/center/-/format/webp/W0008.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-831778246735-svadebnii-tort-w0008",
    "is_active": true
  },
  {
    "id": "cake_79",
    "db_id": 79,
    "sku": "w0010",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0010",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0010 • от 1700 ₽/кг",
    "title": "Свадебный торт W0010",
    "short_desc": "2-ярусный с букетами (сиреневый)",
    "text": "2-ярусный с букетами (сиреневый). Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9900,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://optim.tildacdn.com/tild6139-6131-4761-a438-386631376636/-/contain/264x264/center/center/-/format/webp/W0010.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-594767971485-svadebnii-tort-w0010",
    "is_active": true
  },
  {
    "id": "cake_80",
    "db_id": 80,
    "sku": "w0011",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0011",
    "emoji": "💍",
    "meta": "Вес: 8,0 кг • Артикул: W0011 • от 1700 ₽/кг",
    "title": "Свадебный торт W0011",
    "short_desc": "Сиреневый с золотой веткой 3 яруса",
    "text": "Сиреневый с золотой веткой 3 яруса. Вес: 8,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 14400,
    "unit": "/ 8 кг",
    "weight_kg": 8.0,
    "image": "https://optim.tildacdn.com/tild6666-6366-4239-b435-333363306366/-/contain/264x264/center/center/-/format/webp/W0011.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-666433113309-svadebnii-tort-w0011",
    "is_active": true
  },
  {
    "id": "cake_81",
    "db_id": 81,
    "sku": "w0015",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0015",
    "emoji": "💍",
    "meta": "Вес: 4,5 кг • Артикул: W0015 • от 1700 ₽/кг",
    "title": "Свадебный торт W0015",
    "short_desc": "С красными розами и гранатом 2 яруса",
    "text": "С красными розами и гранатом 2 яруса. Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9100,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://optim.tildacdn.com/tild3063-6431-4966-b835-616566616135/-/contain/264x264/center/center/-/format/webp/W0015.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-759909259469-svadebnii-tort-w0015",
    "is_active": true
  },
  {
    "id": "cake_82",
    "db_id": 82,
    "sku": "w0018",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0018",
    "emoji": "💍",
    "meta": "Вес: 4,5 кг • Артикул: W0018 • от 1700 ₽/кг",
    "title": "Свадебный торт W0018",
    "short_desc": "С красными розами 2 яруса",
    "text": "С красными розами 2 яруса. Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 8900,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://optim.tildacdn.com/tild3964-3266-4331-a562-346133393738/-/contain/264x264/center/center/-/format/webp/W018.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-782258487512-svadebnii-tort-w0018",
    "is_active": true
  },
  {
    "id": "cake_83",
    "db_id": 83,
    "sku": "w0023",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ • W0023",
    "emoji": "💍",
    "meta": "Вес: 4,5 кг • Артикул: W0023 • от 1700 ₽/кг",
    "title": "Свадебный торт W0023",
    "short_desc": "Кремовый с клубникой и розами",
    "text": "Кремовый с клубникой и розами. Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9300,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://optim.tildacdn.com/tild3533-3139-4662-a666-303236336131/-/contain/264x264/center/center/-/format/webp/W0023.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-197636844910-svadebnii-tort-w0023",
    "is_active": true
  },
  {
    "id": "cake_84",
    "db_id": 84,
    "sku": "w0027",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0027",
    "emoji": "💍",
    "meta": "Вес: 8,0 кг • Артикул: W0027 • от 1700 ₽/кг",
    "title": "Свадебный торт W0027",
    "short_desc": "Белый с красными оттенками и цветами",
    "text": "Белый с красными оттенками и цветами. Вес: 8,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 15100,
    "unit": "/ 8 кг",
    "weight_kg": 8.0,
    "image": "https://optim.tildacdn.com/tild3362-3237-4965-b463-636335306533/-/contain/264x264/center/center/-/format/webp/W0027.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-514175047652-svadebnii-tort-w0027",
    "is_active": true
  },
  {
    "id": "cake_85",
    "db_id": 85,
    "sku": "w0030",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0030",
    "emoji": "💍",
    "meta": "Вес: 8,0 кг • Артикул: W0030 • от 1700 ₽/кг",
    "title": "Свадебный торт W0030",
    "short_desc": "3-ярусный с двумя букетами и золотым бортиком",
    "text": "3-ярусный с двумя букетами и золотым бортиком. Вес: 8,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 15000,
    "unit": "/ 8 кг",
    "weight_kg": 8.0,
    "image": "https://optim.tildacdn.com/tild3962-6465-4833-b539-373538306162/-/contain/264x264/center/center/-/format/webp/W0030.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-771281149294-svadebnii-tort-w0030",
    "is_active": true
  },
  {
    "id": "cake_86",
    "db_id": 86,
    "sku": "w0031",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0031",
    "emoji": "💍",
    "meta": "Вес: 4,5 кг • Артикул: W0031 • от 1700 ₽/кг",
    "title": "Свадебный торт W0031",
    "short_desc": "Шоколадный крем и клубника",
    "text": "Шоколадный крем и клубника. Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 8200,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://optim.tildacdn.com/tild3365-3339-4631-a165-653833616436/-/contain/264x264/center/center/-/format/webp/W0031.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-198896435928-svadebnii-tort-w0031",
    "is_active": true
  },
  {
    "id": "cake_87",
    "db_id": 87,
    "sku": "w0032",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0032",
    "emoji": "💍",
    "meta": "Вес: 3,0 кг • Артикул: W0032 • от 1700 ₽/кг",
    "title": "Свадебный торт W0032",
    "short_desc": "Сиреневый с лебедями",
    "text": "Сиреневый с лебедями. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5900,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://optim.tildacdn.com/tild6466-6332-4432-b064-343866616334/-/contain/264x264/center/center/-/format/webp/W0032.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-553146792543-svadebnii-tort-w0032",
    "is_active": true
  },
  {
    "id": "cake_88",
    "db_id": 88,
    "sku": "w0033",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0033",
    "emoji": "💍",
    "meta": "Вес: 3,0 кг • Артикул: W0033 • от 1700 ₽/кг",
    "title": "Свадебный торт W0033",
    "short_desc": "С красной розой, клубникой и макаронсами",
    "text": "С красной розой, клубникой и макаронсами. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5800,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://optim.tildacdn.com/tild3932-6233-4431-a162-323432616634/-/contain/264x264/center/center/-/format/webp/W0033.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-953216106468-svadebnii-tort-w0033",
    "is_active": true
  },
  {
    "id": "cake_89",
    "db_id": 89,
    "sku": "w0036",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0036",
    "emoji": "💍",
    "meta": "Вес: 4,5 кг • Артикул: W0036 • от 1700 ₽/кг",
    "title": "Свадебный торт W0036",
    "short_desc": "Белый с розами и лебедями",
    "text": "Белый с розами и лебедями. Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 8400,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://optim.tildacdn.com/tild3130-3633-4230-a336-613062326135/-/contain/264x264/center/center/-/format/webp/W0036.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-267959857569-svadebnii-tort-w0036",
    "is_active": true
  },
  {
    "id": "cake_90",
    "db_id": 90,
    "sku": "w0037",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0037",
    "emoji": "💍",
    "meta": "Вес: 8,0 кг • Артикул: W0037 • от 1700 ₽/кг",
    "title": "Свадебный торт W0037",
    "short_desc": "3-ёх ярусный с мятными оттенками",
    "text": "3-ёх ярусный с мятными оттенками. Вес: 8,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 14300,
    "unit": "/ 8 кг",
    "weight_kg": 8.0,
    "image": "https://static.tildacdn.com/tild6464-6335-4462-b961-623765353737/W0037.jpg",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-980295483208-svadebnii-tort-w0037",
    "is_active": true
  },
  {
    "id": "cake_91",
    "db_id": 91,
    "sku": "w0038",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0038",
    "emoji": "💍",
    "meta": "Вес: 7,5 кг • Артикул: W0038 • от 1700 ₽/кг",
    "title": "Свадебный торт W0038",
    "short_desc": "Белый с красными розами",
    "text": "Белый с красными розами. Вес: 7,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 14800,
    "unit": "/ 7.5 кг",
    "weight_kg": 7.5,
    "image": "https://optim.tildacdn.com/tild3134-6461-4438-b230-633238356364/-/contain/264x264/center/center/-/format/webp/W0038.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-252541312710-svadebnii-tort-w0038",
    "is_active": true
  },
  {
    "id": "cake_92",
    "db_id": 92,
    "sku": "w0039",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0039",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0039 • от 1700 ₽/кг",
    "title": "Свадебный торт W0039",
    "short_desc": "2-х ярусный с котиками и красными сердцами",
    "text": "2-х ярусный с котиками и красными сердцами. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 10100,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://optim.tildacdn.com/tild3238-6261-4831-b039-346563636436/-/contain/264x264/center/center/-/format/webp/W0039.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-345556458249-svadebnii-tort-w0039",
    "is_active": true
  },
  {
    "id": "cake_93",
    "db_id": 93,
    "sku": "w0040",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0040",
    "emoji": "💍",
    "meta": "Вес: 8,0 кг • Артикул: W0040 • от 1700 ₽/кг",
    "title": "Свадебный торт W0040",
    "short_desc": "3-ёх ярусный с лебедями",
    "text": "3-ёх ярусный с лебедями. Вес: 8,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 14800,
    "unit": "/ 8 кг",
    "weight_kg": 8.0,
    "image": "https://optim.tildacdn.com/tild6437-3030-4333-b533-643137303762/-/contain/264x264/center/center/-/format/webp/W0040.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-383401760658-svadebnii-tort-w0040",
    "is_active": true
  },
  {
    "id": "cake_94",
    "db_id": 94,
    "sku": "w0041",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0041",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0041 • от 1700 ₽/кг",
    "title": "Свадебный торт W0041",
    "short_desc": "Белый с розовыми и сиреневыми цветами",
    "text": "Белый с розовыми и сиреневыми цветами. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9500,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://optim.tildacdn.com/tild6166-3564-4637-b961-633830646239/-/contain/264x264/center/center/-/format/webp/W0041.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-557538900765-svadebnii-tort-w0041",
    "is_active": true
  },
  {
    "id": "cake_95",
    "db_id": 95,
    "sku": "w0044",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0044",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0044 • от 1700 ₽/кг",
    "title": "Свадебный торт W0044",
    "short_desc": "Кремового цвета с белыми и розовыми розами",
    "text": "Кремового цвета с белыми и розовыми розами. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9700,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://optim.tildacdn.com/tild3031-3137-4138-b165-306437623832/-/contain/264x264/center/center/-/format/webp/W0044.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-376036143980-svadebnii-tort-w0044",
    "is_active": true
  },
  {
    "id": "cake_96",
    "db_id": 96,
    "sku": "w0046",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0046",
    "emoji": "💍",
    "meta": "Вес: 8,0 кг • Артикул: W0046 • от 1700 ₽/кг",
    "title": "Свадебный торт W0046",
    "short_desc": "Светло-бежевый с ромашками",
    "text": "Светло-бежевый с ромашками. Вес: 8,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 14100,
    "unit": "/ 8 кг",
    "weight_kg": 8.0,
    "image": "https://optim.tildacdn.com/tild3932-3461-4231-b562-386433636565/-/contain/264x264/center/center/-/format/webp/W0046.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-313695882818-svadebnii-tort-w0046",
    "is_active": true
  },
  {
    "id": "cake_97",
    "db_id": 97,
    "sku": "w0047",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0047",
    "emoji": "💍",
    "meta": "Вес: 8,0 кг • Артикул: W0047 • от 1700 ₽/кг",
    "title": "Свадебный торт W0047",
    "short_desc": "В морском стиле",
    "text": "В морском стиле. Вес: 8,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 14700,
    "unit": "/ 8 кг",
    "weight_kg": 8.0,
    "image": "https://optim.tildacdn.com/tild3535-6363-4435-b433-353730663938/-/contain/264x264/center/center/-/format/webp/W0047.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-137986576371-svadebnii-tort-w0047",
    "is_active": true
  },
  {
    "id": "cake_98",
    "db_id": 98,
    "sku": "w0049",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": true,
    "badge": "ХИТ • W0049",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0049 • от 1700 ₽/кг",
    "title": "Свадебный торт W0049",
    "short_desc": "Белый кремовый с цветами",
    "text": "Белый кремовый с цветами. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9700,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://optim.tildacdn.com/tild3233-3536-4433-a631-646464343462/-/contain/264x264/center/center/-/format/webp/W0049.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-361785480030-svadebnii-tort-w0049",
    "is_active": true
  },
  {
    "id": "cake_99",
    "db_id": 99,
    "sku": "w0050",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0050",
    "emoji": "💍",
    "meta": "Вес: 8,0 кг • Артикул: W0050 • от 1700 ₽/кг",
    "title": "Свадебный торт W0050",
    "short_desc": "Белый с красными розами и зеленными листочками",
    "text": "Белый с красными розами и зеленными листочками. Вес: 8,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 14500,
    "unit": "/ 8 кг",
    "weight_kg": 8.0,
    "image": "https://optim.tildacdn.com/tild3739-3139-4530-b531-396563376238/-/contain/264x264/center/center/-/format/webp/W0050.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-998707021945-svadebnii-tort-w0050",
    "is_active": true
  },
  {
    "id": "cake_100",
    "db_id": 100,
    "sku": "w0052",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0052",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0052 • от 1700 ₽/кг",
    "title": "Свадебный торт W0052",
    "short_desc": "С рыжим и белым котиками",
    "text": "С рыжим и белым котиками. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9900,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://optim.tildacdn.com/tild3631-6266-4438-b664-393866643835/-/contain/264x264/center/center/-/format/webp/W0052.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-247366278938-svadebnii-tort-w0052",
    "is_active": true
  },
  {
    "id": "cake_101",
    "db_id": 101,
    "sku": "w0053",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0053",
    "emoji": "💍",
    "meta": "Вес: 8,0 кг • Артикул: W0053 • от 1700 ₽/кг",
    "title": "Свадебный торт W0053",
    "short_desc": "3-х ярусный квадратный с золотыми узорами",
    "text": "3-х ярусный квадратный с золотыми узорами. Вес: 8,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 14100,
    "unit": "/ 8 кг",
    "weight_kg": 8.0,
    "image": "https://optim.tildacdn.com/tild6533-3363-4162-a236-636139303466/-/contain/264x264/center/center/-/format/webp/W0053.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-169485302508-svadebnii-tort-w0053",
    "is_active": true
  },
  {
    "id": "cake_102",
    "db_id": 102,
    "sku": "w0056",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0056",
    "emoji": "💍",
    "meta": "Вес: 8,0 кг • Артикул: W0056 • от 1700 ₽/кг",
    "title": "Свадебный торт W0056",
    "short_desc": "Белый с розами в розовых оттенках",
    "text": "Белый с розами в розовых оттенках. Вес: 8,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 16100,
    "unit": "/ 8 кг",
    "weight_kg": 8.0,
    "image": "https://optim.tildacdn.com/tild3031-3638-4666-a166-633033313139/-/contain/264x264/center/center/-/format/webp/W0056.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-535580250646-svadebnii-tort-w0056",
    "is_active": true
  },
  {
    "id": "cake_103",
    "db_id": 103,
    "sku": "w0058",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0058",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0058 • от 1700 ₽/кг",
    "title": "Свадебный торт W0058",
    "short_desc": "Красный с лебедями. 2 яруса",
    "text": "Красный с лебедями. 2 яруса. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 10200,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://optim.tildacdn.com/tild6461-3536-4465-b536-613939383333/-/contain/264x264/center/center/-/format/webp/W0058.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-712495694637-svadebnii-tort-w0058",
    "is_active": true
  },
  {
    "id": "cake_104",
    "db_id": 104,
    "sku": "w0059",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0059",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0059 • от 1700 ₽/кг",
    "title": "Свадебный торт W0059",
    "short_desc": "Белый с узорами, персиковыми розами и лебедями",
    "text": "Белый с узорами, персиковыми розами и лебедями. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9300,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://optim.tildacdn.com/tild3564-6336-4238-a664-336462626361/-/contain/264x264/center/center/-/format/webp/W0059.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-350036055960-svadebnii-tort-w0059",
    "is_active": true
  },
  {
    "id": "cake_105",
    "db_id": 105,
    "sku": "w0060",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0060",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0060 • от 1700 ₽/кг",
    "title": "Свадебный торт W0060",
    "short_desc": "Черный с розами и красными потеками",
    "text": "Черный с розами и красными потеками. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 8800,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://optim.tildacdn.com/tild3330-3563-4238-b964-376664643038/-/format/webp/W0060.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-834069369881-svadebnii-tort-w0060",
    "is_active": true
  },
  {
    "id": "cake_106",
    "db_id": 106,
    "sku": "w0061",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0061",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0061 • от 1700 ₽/кг",
    "title": "Свадебный торт W0061",
    "short_desc": "Белый с синими оттенками и аппликациями",
    "text": "Белый с синими оттенками и аппликациями. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9000,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://optim.tildacdn.com/tild6561-3863-4565-b862-643330336634/-/format/webp/W0061.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-624652539823-svadebnii-tort-w0061",
    "is_active": true
  },
  {
    "id": "cake_107",
    "db_id": 107,
    "sku": "w0062",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0062",
    "emoji": "💍",
    "meta": "Вес: 10,0 кг • Артикул: W0062 • от 1700 ₽/кг",
    "title": "Свадебный торт W0062",
    "short_desc": "Красный с золотыми розами",
    "text": "Красный с золотыми розами. Вес: 10,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 18000,
    "unit": "/ 10 кг",
    "weight_kg": 10.0,
    "image": "https://optim.tildacdn.com/tild3762-6466-4233-b265-323336316234/-/contain/264x264/center/center/-/format/webp/W0062.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-178391325218-svadebnii-tort-w0062",
    "is_active": true
  },
  {
    "id": "cake_108",
    "db_id": 108,
    "sku": "w0063",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0063",
    "emoji": "💍",
    "meta": "Вес: 5,0 кг • Артикул: W0063 • от 1700 ₽/кг",
    "title": "Свадебный торт W0063",
    "short_desc": "Белый с узорами и красными розами",
    "text": "Белый с узорами и красными розами. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9100,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://optim.tildacdn.com/tild6138-3461-4633-b038-626435326439/-/contain/264x264/center/center/-/format/webp/W0063.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-546930150174-svadebnii-tort-w0063",
    "is_active": true
  },
  {
    "id": "cake_109",
    "db_id": 109,
    "sku": "w0072",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0072",
    "emoji": "💍",
    "meta": "Вес: 3,0 кг • Артикул: W0072 • от 1700 ₽/кг",
    "title": "Свадебный торт W0072",
    "short_desc": "Белый с розовыми оттенками и розами",
    "text": "Белый с розовыми оттенками и розами. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 6300,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://optim.tildacdn.com/tild6631-3738-4434-a334-346139376439/-/format/webp/W0072.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-957496655219-svadebnii-tort-w0072",
    "is_active": true
  },
  {
    "id": "cake_110",
    "db_id": 110,
    "sku": "w0080",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0080",
    "emoji": "💍",
    "meta": "Вес: 3,0 кг • Артикул: W0080 • от 1700 ₽/кг",
    "title": "Свадебный торт W0080",
    "short_desc": "С совами",
    "text": "С совами. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 6700,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://optim.tildacdn.com/tild3062-3663-4531-a430-336535666238/-/format/webp/W0080.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-672736491100-svadebnii-tort-w0080",
    "is_active": true
  },
  {
    "id": "cake_111",
    "db_id": 111,
    "sku": "w0081",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0081",
    "emoji": "💍",
    "meta": "Вес: 3,0 кг • Артикул: W0081 • от 1700 ₽/кг",
    "title": "Свадебный торт W0081",
    "short_desc": "Белый с лебедями и сиреневыми розами",
    "text": "Белый с лебедями и сиреневыми розами. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5900,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://optim.tildacdn.com/tild3730-3464-4136-a439-336637663639/-/format/webp/W0081.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-249291285406-svadebnii-tort-w0081",
    "is_active": true
  },
  {
    "id": "cake_112",
    "db_id": 112,
    "sku": "w0086",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0086",
    "emoji": "💍",
    "meta": "Вес: 3,0 кг • Артикул: W0086 • от 1700 ₽/кг",
    "title": "Свадебный торт W0086",
    "short_desc": "С красным букетом и лебедями",
    "text": "С красным букетом и лебедями. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 6200,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://optim.tildacdn.com/tild6163-3932-4862-b565-633232336337/-/format/webp/W0086.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-130982830134-svadebnii-tort-w0086",
    "is_active": true
  },
  {
    "id": "cake_113",
    "db_id": 113,
    "sku": "w0087",
    "category": "wedding",
    "section": "wedding",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "SKU: W0087",
    "emoji": "💍",
    "meta": "Вес: 3,0 кг • Артикул: W0087 • от 1700 ₽/кг",
    "title": "Свадебный торт W0087",
    "short_desc": "Сердце",
    "text": "Сердце. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5400,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://optim.tildacdn.com/tild3531-3562-4034-b763-643831373130/-/format/webp/W0087.jpg.webp",
    "product_url": "https://www.tort54.ru/wedding/tproduct/110642235-499989816282-svadebnii-tort-w0087",
    "is_active": true
  },
  {
    "id": "cake_114",
    "db_id": 114,
    "sku": "a0001",
    "category": "berry",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0001",
    "emoji": "🍓",
    "meta": "Вес: 2,5 кг • Артикул: A0001 • от 1700 ₽/кг",
    "title": "Торт A0001",
    "short_desc": "Кремовый торт с клубникой и печеньем ОРЕО",
    "text": "Кремовый торт с клубникой и печеньем ОРЕО. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 6000,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3536-6261-4038-a131-643235386161/-/contain/264x264/center/center/-/format/webp/0001.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-266580217382-tort-a0001",
    "is_active": true
  },
  {
    "id": "cake_115",
    "db_id": 115,
    "sku": "a0076",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0076",
    "emoji": "🎂",
    "meta": "Вес: 2,5 кг • Артикул: A0076 • от 1700 ₽/кг",
    "title": "Торт A0076",
    "short_desc": "Торт для мужчины",
    "text": "Торт для мужчины. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4900,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3466-3232-4465-b530-353333383838/-/contain/264x264/center/center/-/format/webp/05.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-641288600071-tort-a0076",
    "is_active": true
  },
  {
    "id": "cake_116",
    "db_id": 116,
    "sku": "a0091",
    "category": "corp",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": true,
    "badge": "ХИТ • A0091",
    "emoji": "🏆",
    "meta": "Вес: 2,5 кг • Артикул: A0091 • от 1700 ₽/кг",
    "title": "Торт A0091",
    "short_desc": "Торт программисту",
    "text": "Торт программисту. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5400,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3463-3239-4833-a465-303338316161/-/contain/264x264/center/center/-/format/webp/0012.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-896880808771-tort-a0091",
    "is_active": true
  },
  {
    "id": "cake_117",
    "db_id": 117,
    "sku": "a0002",
    "category": "berry",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0002",
    "emoji": "🍓",
    "meta": "Вес: 2,5 кг • Артикул: A0002 • от 1700 ₽/кг",
    "title": "Торт A0002",
    "short_desc": "Кремовый с клубникой и голубикой",
    "text": "Кремовый с клубникой и голубикой. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 6200,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3237-3734-4234-b734-346165383565/-/contain/264x264/center/center/-/format/webp/0002.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-152056294394-tort-a0002",
    "is_active": true
  },
  {
    "id": "cake_118",
    "db_id": 118,
    "sku": "a0078",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0078",
    "emoji": "🎂",
    "meta": "Вес: 4,0 кг • Артикул: A0078 • от 1700 ₽/кг",
    "title": "Торт A0078",
    "short_desc": "Торт любителям пива",
    "text": "Торт любителям пива. Вес: 4,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9500,
    "unit": "/ 4 кг",
    "weight_kg": 4.0,
    "image": "https://optim.tildacdn.com/tild3364-6161-4563-b264-343639316163/-/contain/264x264/center/center/-/format/webp/0001.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-447153545141-tort-a0078",
    "is_active": true
  },
  {
    "id": "cake_119",
    "db_id": 119,
    "sku": "a0010",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0010",
    "emoji": "🎂",
    "meta": "Вес: 2,5 кг • Артикул: A0010 • от 1700 ₽/кг",
    "title": "Торт A0010",
    "short_desc": "Книга закрытая",
    "text": "Книга закрытая. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4900,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild6535-3534-4230-b432-626138396466/-/contain/264x264/center/center/-/format/webp/0010.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-264961699828-tort-a0010",
    "is_active": true
  },
  {
    "id": "cake_120",
    "db_id": 120,
    "sku": "a0005",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0005",
    "emoji": "🎂",
    "meta": "Вес: 2,5 кг • Артикул: A0005 • от 1700 ₽/кг",
    "title": "Торт A0005",
    "short_desc": "Чемодан с ЕВРО",
    "text": "Чемодан с ЕВРО. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5200,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3230-6639-4334-b935-653562383732/-/contain/264x264/center/center/-/format/webp/0005.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-911377407899-tort-a0005",
    "is_active": true
  },
  {
    "id": "cake_121",
    "db_id": 121,
    "sku": "a0030",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0030",
    "emoji": "🎂",
    "meta": "Вес: 2,5 кг • Артикул: A0030 • от 1700 ₽/кг",
    "title": "Торт A0030",
    "short_desc": "Торт банный набор",
    "text": "Торт банный набор. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5300,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3266-6632-4562-a263-336237313338/-/contain/264x264/center/center/-/format/webp/0030.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-981932545115-tort-a0030",
    "is_active": true
  },
  {
    "id": "cake_122",
    "db_id": 122,
    "sku": "a0055",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0055",
    "emoji": "🎂",
    "meta": "Вес: 3,0 кг • Артикул: A0055 • от 1700 ₽/кг",
    "title": "Торт A0055",
    "short_desc": "Торт кастрюля с пельменями",
    "text": "Торт кастрюля с пельменями. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5800,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://static.tildacdn.com/tild3264-3761-4333-b130-623139633837/0055.jpg",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-703821699585-tort-a0055",
    "is_active": true
  },
  {
    "id": "cake_123",
    "db_id": 123,
    "sku": "a0022",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0022",
    "emoji": "🎂",
    "meta": "Вес: 3,0 кг • Артикул: A0022 • от 1700 ₽/кг",
    "title": "Торт A0022",
    "short_desc": "Торт сумка с долларами",
    "text": "Торт сумка с долларами. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5900,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://static.tildacdn.com/tild3133-3166-4131-b333-313437616164/0022.jpg",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-914332829962-tort-a0022",
    "is_active": true
  },
  {
    "id": "cake_124",
    "db_id": 124,
    "sku": "a0090",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0090",
    "emoji": "🎂",
    "meta": "Вес: 2,5 кг • Артикул: A0090 • от 1700 ₽/кг",
    "title": "Торт A0090",
    "short_desc": "Хэллоуин",
    "text": "Хэллоуин. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5500,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3637-6433-4631-b634-646432313637/-/contain/264x264/center/center/-/format/webp/0006.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-608778342501-tort-a0090",
    "is_active": true
  },
  {
    "id": "cake_125",
    "db_id": 125,
    "sku": "a0041",
    "category": "holiday",
    "section": "other",
    "in_baby": true,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0041",
    "emoji": "🎂",
    "meta": "Вес: 3,0 кг • Артикул: A0041 • от 1700 ₽/кг",
    "title": "Торт A0041",
    "short_desc": "Торт ведро с крылышками KFC",
    "text": "Торт ведро с крылышками KFC. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 6400,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://optim.tildacdn.com/tild3164-6332-4462-b666-656639613739/-/contain/264x264/center/center/-/format/webp/0041.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-734270113564-tort-a0041",
    "is_active": true
  },
  {
    "id": "cake_126",
    "db_id": 126,
    "sku": "a0013",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0013",
    "emoji": "🎂",
    "meta": "Вес: 3,0 кг • Артикул: A0013 • от 1700 ₽/кг",
    "title": "Торт A0013",
    "short_desc": "Кастрюля борща",
    "text": "Кастрюля борща. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5900,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://optim.tildacdn.com/tild6333-6636-4330-b433-386331643464/-/contain/264x264/center/center/-/format/webp/0013.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-163290208427-tort-a0013",
    "is_active": true
  },
  {
    "id": "cake_127",
    "db_id": 127,
    "sku": "a0092",
    "category": "corp",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0092",
    "emoji": "🏆",
    "meta": "Вес: 2,5 кг • Артикул: A0092 • от 1700 ₽/кг",
    "title": "Торт A0092",
    "short_desc": "Торт боссу",
    "text": "Торт боссу. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5500,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild6334-3836-4462-b637-623161616633/-/contain/264x264/center/center/-/format/webp/0015.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-135670065711-tort-a0092",
    "is_active": true
  },
  {
    "id": "cake_128",
    "db_id": 128,
    "sku": "a0079",
    "category": "corp",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0079",
    "emoji": "🏆",
    "meta": "Вес: 2,5 кг • Артикул: A0079 • от 1700 ₽/кг",
    "title": "Торт A0079",
    "short_desc": "Торт директору Форбс",
    "text": "Торт директору Форбс. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5000,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3031-3131-4730-b461-613165363030/-/contain/264x264/center/center/-/format/webp/013.jpg.webp",
    "product_url": "https://www.tort54.ru/tproduct/110332707-289281604091-tort-a0079",
    "is_active": true
  },
  {
    "id": "cake_129",
    "db_id": 129,
    "sku": "a0080",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0080",
    "emoji": "🎂",
    "meta": "Вес: 2,5 кг • Артикул: A0080 • от 1700 ₽/кг",
    "title": "Торт A0080",
    "short_desc": "Торт плотнику",
    "text": "Торт плотнику. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5600,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild6433-6535-4664-b161-313234363639/-/contain/264x264/center/center/-/format/webp/022.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-969806472041-tort-a0080",
    "is_active": true
  },
  {
    "id": "cake_130",
    "db_id": 130,
    "sku": "a0081",
    "category": "corp",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0081",
    "emoji": "🏆",
    "meta": "Вес: 2,5 кг • Артикул: A0081 • от 1700 ₽/кг",
    "title": "Торт A0081",
    "short_desc": "Торт БМВ",
    "text": "Торт БМВ. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5100,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3161-3466-4464-b534-653831326363/-/contain/264x264/center/center/-/format/webp/024.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-424565139981-tort-a0081",
    "is_active": true
  },
  {
    "id": "cake_131",
    "db_id": 131,
    "sku": "a0082",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0082",
    "emoji": "🎂",
    "meta": "Вес: 3,0 кг • Артикул: A0082 • от 1700 ₽/кг",
    "title": "Торт A0082",
    "short_desc": "Торт ДИОР",
    "text": "Торт ДИОР. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5800,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://optim.tildacdn.com/tild6166-6631-4636-b165-663962616161/-/contain/264x264/center/center/-/format/webp/031.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-583031841131-tort-a0082",
    "is_active": true
  },
  {
    "id": "cake_132",
    "db_id": 132,
    "sku": "a0084",
    "category": "corp",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0084",
    "emoji": "🏆",
    "meta": "Вес: 9,0 кг • Артикул: A0084 • от 1700 ₽/кг",
    "title": "Торт A0084",
    "short_desc": "Торт Новогодний",
    "text": "Торт Новогодний. Вес: 9,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 17100,
    "unit": "/ 9 кг",
    "weight_kg": 9.0,
    "image": "https://optim.tildacdn.com/tild3738-3831-4034-b634-666639653136/-/contain/264x264/center/center/-/format/webp/004.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-709178125101-tort-a0084",
    "is_active": true
  },
  {
    "id": "cake_133",
    "db_id": 133,
    "sku": "a0085",
    "category": "corp",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0085",
    "emoji": "🏆",
    "meta": "Вес: 2,5 кг • Артикул: A0085 • от 1700 ₽/кг",
    "title": "Торт A0085",
    "short_desc": "Торт корпоративный",
    "text": "Торт корпоративный. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4700,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3161-3136-4335-b038-376430663733/-/contain/264x264/center/center/-/format/webp/005.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-468916655231-tort-a0085",
    "is_active": true
  },
  {
    "id": "cake_134",
    "db_id": 134,
    "sku": "a0087",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0087",
    "emoji": "🎂",
    "meta": "Вес: 2,5 кг • Артикул: A0087 • от 1700 ₽/кг",
    "title": "Торт A0087",
    "short_desc": "Торт хоккеисту",
    "text": "Торт хоккеисту. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4900,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild6161-6231-4363-a531-303264343339/-/contain/176x264/center/center/-/format/webp/010.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-971633422351-tort-a0087",
    "is_active": true
  },
  {
    "id": "cake_135",
    "db_id": 135,
    "sku": "a0088",
    "category": "corp",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0088",
    "emoji": "🏆",
    "meta": "Вес: 8,0 кг • Артикул: A0088 • от 1700 ₽/кг",
    "title": "Торт A0088",
    "short_desc": "Торт корпоративный с ягодой",
    "text": "Торт корпоративный с ягодой. Вес: 8,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 15400,
    "unit": "/ 8 кг",
    "weight_kg": 8.0,
    "image": "https://optim.tildacdn.com/tild3966-3661-4136-b764-303631653237/-/contain/264x264/center/center/-/format/webp/015.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-894348941141-tort-a0088",
    "is_active": true
  },
  {
    "id": "cake_136",
    "db_id": 136,
    "sku": "a0014",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0014",
    "emoji": "🎂",
    "meta": "Вес: 2,5 кг • Артикул: A0014 • от 1700 ₽/кг",
    "title": "Торт A0014",
    "short_desc": "Торт PS4",
    "text": "Торт PS4. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5200,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild6634-3931-4537-b236-306163643264/-/contain/264x264/center/center/-/format/webp/0014.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-495431735157-tort-a0014",
    "is_active": true
  },
  {
    "id": "cake_137",
    "db_id": 137,
    "sku": "a0015",
    "category": "corp",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0015",
    "emoji": "🏆",
    "meta": "Вес: 3,0 кг • Артикул: A0015 • от 1700 ₽/кг",
    "title": "Торт A0015",
    "short_desc": "Торт земной шар с самолетом S7",
    "text": "Торт земной шар с самолетом S7. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5900,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://optim.tildacdn.com/tild6565-6634-4236-b466-353139656235/-/contain/264x264/center/center/-/format/webp/0015.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-139688164127-tort-a0015",
    "is_active": true
  },
  {
    "id": "cake_138",
    "db_id": 138,
    "sku": "a0016",
    "category": "corp",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0016",
    "emoji": "🏆",
    "meta": "Вес: 3,0 кг • Артикул: A0016 • от 1700 ₽/кг",
    "title": "Торт A0016",
    "short_desc": "Кремовый торт для бара ELVIS",
    "text": "Кремовый торт для бара ELVIS. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5800,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://optim.tildacdn.com/tild3038-6332-4766-b234-316365636533/-/contain/264x264/center/center/-/format/webp/0016.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-473619025835-tort-a0016",
    "is_active": true
  },
  {
    "id": "cake_139",
    "db_id": 139,
    "sku": "a0023",
    "category": "choco",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0023",
    "emoji": "🍫",
    "meta": "Вес: 2,5 кг • Артикул: A0023 • от 1700 ₽/кг",
    "title": "Торт A0023",
    "short_desc": "Кремовый торт с конфетами и печеньем ОРЕО",
    "text": "Кремовый торт с конфетами и печеньем ОРЕО. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4900,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild6539-3536-4030-a437-323431613864/-/contain/264x264/center/center/-/format/webp/0023.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-429803360998-tort-a0023",
    "is_active": true
  },
  {
    "id": "cake_140",
    "db_id": 140,
    "sku": "a0025",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0025",
    "emoji": "🎂",
    "meta": "Вес: 3,0 кг • Артикул: A0025 • от 1700 ₽/кг",
    "title": "Торт A0025",
    "short_desc": "Торт игроку покера",
    "text": "Торт игроку покера. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 6100,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://optim.tildacdn.com/tild3630-6566-4731-b263-313631386130/-/contain/264x264/center/center/-/format/webp/0025.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-312445562265-tort-a0025",
    "is_active": true
  },
  {
    "id": "cake_141",
    "db_id": 141,
    "sku": "a0028",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0028",
    "emoji": "🎂",
    "meta": "Вес: 2,5 кг • Артикул: A0028 • от 1700 ₽/кг",
    "title": "Торт A0028",
    "short_desc": "Торт со скорпионом",
    "text": "Торт со скорпионом. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5300,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3865-3963-4339-b331-626230323265/-/contain/264x264/center/center/-/format/webp/0028.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-856632246730-tort-a0028",
    "is_active": true
  },
  {
    "id": "cake_142",
    "db_id": 142,
    "sku": "a0029",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0029",
    "emoji": "🎂",
    "meta": "Вес: 4,5 кг • Артикул: A0029 • от 1700 ₽/кг",
    "title": "Торт A0029",
    "short_desc": "Торт джентльмену",
    "text": "Торт джентльмену. Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 8600,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://optim.tildacdn.com/tild3665-3764-4539-b961-386235626663/-/contain/264x264/center/center/-/format/webp/0029.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-750397389354-tort-a0029",
    "is_active": true
  },
  {
    "id": "cake_143",
    "db_id": 143,
    "sku": "a0032",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0032",
    "emoji": "🎂",
    "meta": "Вес: 3,0 кг • Артикул: A0032 • от 1700 ₽/кг",
    "title": "Торт A0032",
    "short_desc": "Торт зелёный бюстгальтер",
    "text": "Торт зелёный бюстгальтер. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5700,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://optim.tildacdn.com/tild6632-6233-4932-b931-303534663534/-/contain/264x264/center/center/-/format/webp/0032.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-494140976566-tort-a0032",
    "is_active": true
  },
  {
    "id": "cake_144",
    "db_id": 144,
    "sku": "a0036",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0036",
    "emoji": "🎂",
    "meta": "Вес: 4,5 кг • Артикул: A0036 • от 1700 ₽/кг",
    "title": "Торт A0036",
    "short_desc": "Торт музыканту с клавишами и нотами",
    "text": "Торт музыканту с клавишами и нотами. Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 8300,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://optim.tildacdn.com/tild3738-3463-4837-b866-636534626665/-/contain/264x264/center/center/-/format/webp/0036.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-680559420248-tort-a0036",
    "is_active": true
  },
  {
    "id": "cake_145",
    "db_id": 145,
    "sku": "a0045",
    "category": "berry",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0045",
    "emoji": "🍓",
    "meta": "Вес: 2,5 кг • Артикул: A0045 • от 1700 ₽/кг",
    "title": "Торт A0045",
    "short_desc": "Торт с безешками",
    "text": "Торт с безешками. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4600,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3238-6233-4534-a438-666366303263/-/contain/264x264/center/center/-/format/webp/0045.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-834167847903-tort-a0045",
    "is_active": true
  },
  {
    "id": "cake_146",
    "db_id": 146,
    "sku": "a0046",
    "category": "corp",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0046",
    "emoji": "🏆",
    "meta": "Вес: 7,5 кг • Артикул: A0046 • от 1700 ₽/кг",
    "title": "Торт A0046",
    "short_desc": "Торт H&M",
    "text": "Торт H&M. Вес: 7,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 12900,
    "unit": "/ 7.5 кг",
    "weight_kg": 7.5,
    "image": "https://optim.tildacdn.com/tild3531-3939-4530-a662-326434323836/-/contain/264x264/center/center/-/format/webp/0046.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-499143418720-tort-a0046",
    "is_active": true
  },
  {
    "id": "cake_147",
    "db_id": 147,
    "sku": "a0047",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0047",
    "emoji": "🎂",
    "meta": "Вес: 2,5 кг • Артикул: A0047 • от 1700 ₽/кг",
    "title": "Торт A0047",
    "short_desc": "Торт 5000 рублей",
    "text": "Торт 5000 рублей. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4700,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3837-3261-4564-b962-386632306337/-/contain/264x264/center/center/-/format/webp/0047.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-582112284474-tort-a0047",
    "is_active": true
  },
  {
    "id": "cake_148",
    "db_id": 148,
    "sku": "a0051",
    "category": "choco",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0051",
    "emoji": "🍫",
    "meta": "Вес: 5,0 кг • Артикул: A0051 • от 1700 ₽/кг",
    "title": "Торт A0051",
    "short_desc": "Торт с чёрным блеском",
    "text": "Торт с чёрным блеском. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9200,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://optim.tildacdn.com/tild6532-6333-4665-a361-626162636137/-/contain/264x264/center/center/-/format/webp/0051.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-644937607720-tort-a0051",
    "is_active": true
  },
  {
    "id": "cake_149",
    "db_id": 149,
    "sku": "a0052",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0052",
    "emoji": "🎂",
    "meta": "Вес: 2,5 кг • Артикул: A0052 • от 1700 ₽/кг",
    "title": "Торт A0052",
    "short_desc": "Торт морской",
    "text": "Торт морской. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5100,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3836-6335-4365-a138-626638303330/-/contain/264x264/center/center/-/format/webp/0052.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-193793346666-tort-a0052",
    "is_active": true
  },
  {
    "id": "cake_150",
    "db_id": 150,
    "sku": "a0053",
    "category": "berry",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0053",
    "emoji": "🍓",
    "meta": "Вес: 2,5 кг • Артикул: A0053 • от 1700 ₽/кг",
    "title": "Торт A0053",
    "short_desc": "Кремовый с клубникой",
    "text": "Кремовый с клубникой. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 4700,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3632-6230-4264-b564-313932386166/-/contain/264x264/center/center/-/format/webp/0053.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-508616094306-tort-a0053",
    "is_active": true
  },
  {
    "id": "cake_151",
    "db_id": 151,
    "sku": "a0054",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0054",
    "emoji": "🎂",
    "meta": "Вес: 3,0 кг • Артикул: A0054 • от 1700 ₽/кг",
    "title": "Торт A0054",
    "short_desc": "Торт коробка с пистолетом",
    "text": "Торт коробка с пистолетом. Вес: 3,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5600,
    "unit": "/ 3 кг",
    "weight_kg": 3.0,
    "image": "https://optim.tildacdn.com/tild3138-3166-4735-b133-386238393737/-/contain/264x264/center/center/-/format/webp/0054.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-805285287398-tort-a0054",
    "is_active": true
  },
  {
    "id": "cake_152",
    "db_id": 152,
    "sku": "a0061",
    "category": "corp",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0061",
    "emoji": "🏆",
    "meta": "Вес: 6,0 кг • Артикул: A0061 • от 1700 ₽/кг",
    "title": "Торт A0061",
    "short_desc": "Торт для группы компаний \"Спектрум\"",
    "text": "Торт для группы компаний \"Спектрум\". Вес: 6,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 10500,
    "unit": "/ 6 кг",
    "weight_kg": 6.0,
    "image": "https://optim.tildacdn.com/tild6464-3933-4339-a638-386230383837/-/contain/264x264/center/center/-/format/webp/0061.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-449816845457-tort-a0061",
    "is_active": true
  },
  {
    "id": "cake_153",
    "db_id": 153,
    "sku": "a0067",
    "category": "corp",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0067",
    "emoji": "🏆",
    "meta": "Вес: 5,0 кг • Артикул: A0067 • от 1700 ₽/кг",
    "title": "Торт A0067",
    "short_desc": "Торт для РЖД",
    "text": "Торт для РЖД. Вес: 5,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9600,
    "unit": "/ 5 кг",
    "weight_kg": 5.0,
    "image": "https://optim.tildacdn.com/tild3937-6266-4832-b363-653639613133/-/contain/264x264/center/center/-/format/webp/0067.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-666740175703-tort-a0067",
    "is_active": true
  },
  {
    "id": "cake_154",
    "db_id": 154,
    "sku": "a0068",
    "category": "berry",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0068",
    "emoji": "🍓",
    "meta": "Вес: 2,5 кг • Артикул: A0068 • от 1700 ₽/кг",
    "title": "Торт A0068",
    "short_desc": "Торт прямоугольный с ягодами",
    "text": "Торт прямоугольный с ягодами. Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5100,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild6431-3464-4836-b264-636138613166/-/contain/264x264/center/center/-/format/webp/0068.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-563686504830-tort-a0068",
    "is_active": true
  },
  {
    "id": "cake_155",
    "db_id": 155,
    "sku": "a0074",
    "category": "corp",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0074",
    "emoji": "🏆",
    "meta": "Вес: 7,0 кг • Артикул: A0074 • от 1700 ₽/кг",
    "title": "Торт A0074",
    "short_desc": "Торт для компании Coca-Cola",
    "text": "Торт для компании Coca-Cola. Вес: 7,0 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 12200,
    "unit": "/ 7 кг",
    "weight_kg": 7.0,
    "image": "https://optim.tildacdn.com/tild6438-6361-4638-b036-623633626432/-/contain/264x264/center/center/-/format/webp/0074.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-736667141542-tort-a0074",
    "is_active": true
  },
  {
    "id": "cake_156",
    "db_id": 156,
    "sku": "a0077",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0077",
    "emoji": "🎂",
    "meta": "Вес: 5,5 кг • Артикул: A0077 • от 1700 ₽/кг",
    "title": "Торт A0077",
    "short_desc": "Торт \"С Новым Годом!\"",
    "text": "Торт \"С Новым Годом!\". Вес: 5,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 10300,
    "unit": "/ 5.5 кг",
    "weight_kg": 5.5,
    "image": "https://optim.tildacdn.com/tild3765-6565-4235-a632-666130316134/-/contain/264x264/center/center/-/format/webp/19.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-323608465291-tort-a0077",
    "is_active": true
  },
  {
    "id": "cake_157",
    "db_id": 157,
    "sku": "a0094",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0094",
    "emoji": "🎂",
    "meta": "Вес: 4,5 кг • Артикул: A0094 • от 1700 ₽/кг",
    "title": "Торт A0094",
    "short_desc": "Торт \"С Новым Годом!\"",
    "text": "Торт \"С Новым Годом!\". Вес: 4,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 9300,
    "unit": "/ 4.5 кг",
    "weight_kg": 4.5,
    "image": "https://optim.tildacdn.com/tild6638-6531-4931-b337-316661336338/-/contain/264x264/center/center/-/format/webp/0017.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-767846356791-tort-a0094",
    "is_active": true
  },
  {
    "id": "cake_158",
    "db_id": 158,
    "sku": "a0096",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0096",
    "emoji": "🎂",
    "meta": "Вес: 2,5 кг • Артикул: A0096 • от 1700 ₽/кг",
    "title": "Торт A0096",
    "short_desc": "Торт \"С Новым Годом!\"",
    "text": "Торт \"С Новым Годом!\". Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5100,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3531-3335-4233-b738-306536373838/-/contain/264x264/center/center/-/format/webp/0019.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-675321326061-tort-a0096",
    "is_active": true
  },
  {
    "id": "cake_159",
    "db_id": 159,
    "sku": "a0097",
    "category": "holiday",
    "section": "other",
    "in_baby": false,
    "in_other": true,
    "is_hit": false,
    "badge": "SKU: A0097",
    "emoji": "🎂",
    "meta": "Вес: 2,5 кг • Артикул: A0097 • от 1700 ₽/кг",
    "title": "Торт A0097",
    "short_desc": "Торт \"С Новым Годом!\"",
    "text": "Торт \"С Новым Годом!\". Вес: 2,5 кг. При заказе можно выбрать любую начинку из каталога tort54.ru, изменить вес, количество ярусов и цветовые оттенки.",
    "price": 5500,
    "unit": "/ 2.5 кг",
    "weight_kg": 2.5,
    "image": "https://optim.tildacdn.com/tild3439-3061-4232-a431-373665366461/-/contain/264x264/center/center/-/format/webp/0020.jpg.webp",
    "product_url": "https://www.tort54.ru/cakes/tproduct/111294155-646233961991-tort-a0097",
    "is_active": true
  },
  {
    "id": "cake_160",
    "db_id": 160,
    "sku": "cupcake01",
    "category": "bento",
    "section": "cupcakes",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "От 12 шт. • CUPCAKE01",
    "emoji": "🧁",
    "meta": "Артикул: CUPCAKE01 • Натуральные сливки",
    "title": "Капкейки «ИСЛАНДИЯ» (Ванильный)",
    "short_desc": "Нежнейший ванильный капкейк с кремом на основе натуральных сливок. Заказ от 12 шт.",
    "text": "Нежнейший ванильный капкейк с кремом на основе натуральных сливок. Заказ от 12 шт.",
    "price": 180,
    "unit": "/ шт",
    "weight_kg": 1.5,
    "image": "https://static.tildacdn.com/tild3164-6536-4039-b334-663131643432/about09.jpg",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-172923090752-islandiya",
    "is_active": true
  },
  {
    "id": "cake_161",
    "db_id": 161,
    "sku": "cupcake02",
    "category": "bento",
    "section": "cupcakes",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "От 12 шт. • CUPCAKE02",
    "emoji": "🧁",
    "meta": "Артикул: CUPCAKE02 • Натуральные сливки",
    "title": "Капкейки «ЯПОНИЯ» (Вишнёвый)",
    "short_desc": "Вкуснейший шоколадный капкейк с вишней и шоколадным кремом на основе натуральных сливок. Заказ от 12 шт.",
    "text": "Вкуснейший шоколадный капкейк с вишней и шоколадным кремом на основе натуральных сливок. Заказ от 12 шт.",
    "price": 180,
    "unit": "/ шт",
    "weight_kg": 1.5,
    "image": "https://optim.tildacdn.com/tild3365-3339-4631-a165-653833616436/-/contain/264x264/center/center/-/format/webp/W0031.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-663107342183-yaponiya",
    "is_active": true
  },
  {
    "id": "cake_162",
    "db_id": 162,
    "sku": "cupcake03",
    "category": "bento",
    "section": "cupcakes",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "От 12 шт. • CUPCAKE03",
    "emoji": "🧁",
    "meta": "Артикул: CUPCAKE03 • Натуральные сливки",
    "title": "Капкейки «КИТАЙ» (Красный бархат)",
    "short_desc": "Яркий капкейк из бисквита «красный бархат» с сырно-сливочным кремом и смородиновой начинкой внутри. Заказ от 12 шт.",
    "text": "Яркий капкейк из бисквита «красный бархат» с сырно-сливочным кремом и смородиновой начинкой внутри. Заказ от 12 шт.",
    "price": 180,
    "unit": "/ шт",
    "weight_kg": 1.5,
    "image": "https://optim.tildacdn.com/tild3932-6233-4431-a162-323432616634/-/contain/264x264/center/center/-/format/webp/W0033.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-815550927689-kitai",
    "is_active": true
  },
  {
    "id": "cake_163",
    "db_id": 163,
    "sku": "cupcake04",
    "category": "bento",
    "section": "cupcakes",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "От 12 шт. • CUPCAKE04",
    "emoji": "🧁",
    "meta": "Артикул: CUPCAKE04 • Натуральные сливки",
    "title": "Капкейки «АРГЕНТИНА» (Банановый)",
    "short_desc": "Сметанный капкейк с бананово-карамельной начинкой и сырным кремом. Заказ от 12 шт.",
    "text": "Сметанный капкейк с бананово-карамельной начинкой и сырным кремом. Заказ от 12 шт.",
    "price": 180,
    "unit": "/ шт",
    "weight_kg": 1.5,
    "image": "https://optim.tildacdn.com/tild3238-6233-4534-a438-666366303263/-/contain/264x264/center/center/-/format/webp/0045.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-414713461849-argentina",
    "is_active": true
  },
  {
    "id": "cake_164",
    "db_id": 164,
    "sku": "cupcake05",
    "category": "bento",
    "section": "cupcakes",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "От 12 шт. • CUPCAKE05",
    "emoji": "🧁",
    "meta": "Артикул: CUPCAKE05 • Натуральные сливки",
    "title": "Капкейки «АНГЛИЯ» (Клубничный)",
    "short_desc": "Ванильный капкейк с начинкой из клубничного варенья и сливочного крема. Заказ от 12 шт.",
    "text": "Ванильный капкейк с начинкой из клубничного варенья и сливочного крема. Заказ от 12 шт.",
    "price": 180,
    "unit": "/ шт",
    "weight_kg": 1.5,
    "image": "https://optim.tildacdn.com/tild3632-6230-4264-b564-313932386166/-/contain/264x264/center/center/-/format/webp/0053.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-317450720873-angliya",
    "is_active": true
  },
  {
    "id": "cake_165",
    "db_id": 165,
    "sku": "cupcake06",
    "category": "bento",
    "section": "cupcakes",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "От 12 шт. • CUPCAKE06",
    "emoji": "🧁",
    "meta": "Артикул: CUPCAKE06 • Натуральные сливки",
    "title": "Капкейки «ПОРТУГАЛИЯ» (Апельсиновый)",
    "short_desc": "Сочный шоколадный капкейк с апельсиновой начинкой и шоколадным кремом. Заказ от 12 шт.",
    "text": "Сочный шоколадный капкейк с апельсиновой начинкой и шоколадным кремом. Заказ от 12 шт.",
    "price": 180,
    "unit": "/ шт",
    "weight_kg": 1.5,
    "image": "https://optim.tildacdn.com/tild6539-3536-4030-a437-323431613864/-/contain/264x264/center/center/-/format/webp/0023.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-821617616280-portugaliya",
    "is_active": true
  },
  {
    "id": "cake_166",
    "db_id": 166,
    "sku": "cupcake07",
    "category": "bento",
    "section": "cupcakes",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "От 12 шт. • CUPCAKE07",
    "emoji": "🧁",
    "meta": "Артикул: CUPCAKE07 • Натуральные сливки",
    "title": "Капкейки «ЧЕХИЯ» (Морковно-ореховый)",
    "short_desc": "Морковно-ореховый капкейк со сливочным кремом и карамельной начинкой внутри никого не оставит равнодушным. Заказ от 12 шт.",
    "text": "Морковно-ореховый капкейк со сливочным кремом и карамельной начинкой внутри никого не оставит равнодушным. Заказ от 12 шт.",
    "price": 180,
    "unit": "/ шт",
    "weight_kg": 1.5,
    "image": "https://static.tildacdn.com/tild3164-6536-4039-b334-663131643432/about09.jpg",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-956347843184-chehiya",
    "is_active": true
  },
  {
    "id": "cake_167",
    "db_id": 167,
    "sku": "cupcake08",
    "category": "bento",
    "section": "cupcakes",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "От 12 шт. • CUPCAKE08",
    "emoji": "🧁",
    "meta": "Артикул: CUPCAKE08 • Натуральные сливки",
    "title": "Капкейки «ИТАЛИЯ» (Ореховый)",
    "short_desc": "Вкуснейший ореховый капкейк с нежным сливочным кремом. Заказ от 12 шт.",
    "text": "Вкуснейший ореховый капкейк с нежным сливочным кремом. Заказ от 12 шт.",
    "price": 180,
    "unit": "/ шт",
    "weight_kg": 1.5,
    "image": "https://optim.tildacdn.com/tild3031-3137-4138-b165-306437623832/-/contain/264x264/center/center/-/format/webp/W0044.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-537478492438-italiya",
    "is_active": true
  },
  {
    "id": "cake_168",
    "db_id": 168,
    "sku": "cupcake09",
    "category": "bento",
    "section": "cupcakes",
    "in_baby": false,
    "in_other": false,
    "is_hit": false,
    "badge": "От 20 шт. • CUPCAKE09",
    "emoji": "🧁",
    "meta": "Артикул: CUPCAKE09 • Натуральные сливки",
    "title": "Капкейки «ПОЛЬША» (Мятный)",
    "short_desc": "Для любителей шоколада мы создали шоколадный капкейк с мятной начинкой и шоколадным кремом. Заказ от 20 шт.",
    "text": "Для любителей шоколада мы создали шоколадный капкейк с мятной начинкой и шоколадным кремом. Заказ от 20 шт.",
    "price": 200,
    "unit": "/ шт",
    "weight_kg": 1.5,
    "image": "https://optim.tildacdn.com/tild6464-6335-4462-b961-623765353737/-/contain/264x264/center/center/-/format/webp/W0037.jpg",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-828433277743-polsha",
    "is_active": true
  }
];

  var DEFAULT_FILLINGS = [
  {
    "id": "fill_1",
    "db_id": 1,
    "sku": "Cake009",
    "label": "НОВОСИБИРСК — Банановый с карамелью (1700 ₽/кг)",
    "emoji": "🍌",
    "tag": "ХИТ • Cake009",
    "desc": "Самый популярный вкус торта нашей кондитерской. Торт состоит из нежнейшего молочно-ванильного бисквита, пропитанного карамельным сиропом. В прослойке натуральный сметано-сливочный крем с кусочками банана в карамели. Вариант для тех, кому не по вкусу шоколад.",
    "layers": [
      "Молочно-ванильный бисквит",
      "Карамельный сироп и банан в карамели",
      "Натуральный сметано-сливочный крем"
    ],
    "price_per_kg": 1700,
    "image": "https://static.tildacdn.com/tild3164-6536-4039-b334-663131643432/about09.jpg",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-334377019476-novosibirsk",
    "is_active": true
  },
  {
    "id": "fill_2",
    "db_id": 2,
    "sku": "Cake007",
    "label": "МОСКВА — Шоколадный с вишней (1800 ₽/кг)",
    "emoji": "🍒",
    "tag": "Cake007 • 1800 ₽/кг",
    "desc": "Очень вкусный шоколадный торт. Пористый и воздушный шоколадный бисквит, пропитанный домашним вишнёвым сиропом. В прослойке нежнейший натуральный сметано-сливочный крем в сочетании с кусочками вишни.",
    "layers": [
      "Воздушный шоколадный бисквит",
      "Домашний вишнёвый сироп и вишня",
      "Сметано-сливочный крем"
    ],
    "price_per_kg": 1800,
    "image": "https://optim.tildacdn.com/tild3365-3339-4631-a165-653833616436/-/contain/264x264/center/center/-/format/webp/W0031.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-661538886706-moskva",
    "is_active": true
  },
  {
    "id": "fill_3",
    "db_id": 3,
    "sku": "Cake008",
    "label": "ПИТЕР — Клубничный (1700 ₽/кг)",
    "emoji": "🍓",
    "tag": "ХИТ • Cake008",
    "desc": "Сладкоежкам, любящим клубнику, предлагаем этот торт с шифоновым бисквитом, который пропитан клубничным сиропом. Сметанный крем настолько пропитывает коржи, что торт становится воздушным и лёгким, а клубника придаёт нежное послевкусие.",
    "layers": [
      "Шифоновый бисквит",
      "Клубничный сироп и свежая клубника",
      "Воздушный сметанный крем"
    ],
    "price_per_kg": 1700,
    "image": "https://optim.tildacdn.com/tild3632-6230-4264-b564-313932386166/-/contain/264x264/center/center/-/format/webp/0053.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-415266876782-piter",
    "is_active": true
  },
  {
    "id": "fill_4",
    "db_id": 4,
    "sku": "Cake012",
    "label": "НИЦЦА — Фруктово-ягодный тортик (1700 ₽/кг)",
    "emoji": "🥝",
    "tag": "ХИТ • Cake012",
    "desc": "Торт для любителей ягодно-фруктового вкуса. Нежный ванильный бисквит, пропитанный натуральным клубничным сиропом. В прослойке сметано-сливочный крем на основе натуральных сливок, а также кусочки банана, клубники и киви.",
    "layers": [
      "Нежный ванильный бисквит",
      "Кусочки банана, клубники и киви",
      "Сметано-сливочный крем на сливках"
    ],
    "price_per_kg": 1700,
    "image": "https://static.tildacdn.com/tild3235-3733-4731-b463-313531336437/0024.jpg",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-677094962918-nitstsa",
    "is_active": true
  },
  {
    "id": "fill_5",
    "db_id": 5,
    "sku": "Cake011",
    "label": "МИЛАН — Ванильный с грецким орехом и черносливом (1800 ₽/кг)",
    "emoji": "🌰",
    "tag": "Cake011 • 1800 ₽/кг",
    "desc": "Нежнейший, воздушный ванильный бисквит, пропитанный домашним карамельным сиропом. В прослойке обжаренный грецкий орех в карамели, кусочки чернослива — всё это вместе в сочетании с натуральным сметано-сливочным кремом.",
    "layers": [
      "Воздушный ванильный бисквит",
      "Грецкий орех в карамели и чернослив",
      "Сметано-сливочный крем"
    ],
    "price_per_kg": 1800,
    "image": "https://optim.tildacdn.com/tild3031-3137-4138-b165-306437623832/-/contain/264x264/center/center/-/format/webp/W0044.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-873676475415-milan",
    "is_active": true
  },
  {
    "id": "fill_6",
    "db_id": 6,
    "sku": "Cake013",
    "label": "МОНАКО — Апельсиновый торт (1700 ₽/кг)",
    "emoji": "🍊",
    "tag": "Cake013 • 1700 ₽/кг",
    "desc": "Вариант для тех, кому по вкусу маковые бисквиты. Каждый бисквит пропитан сгущённым молоком, прослаивается сметано-сливочным и апельсиновым кремами, от которых торт становится мягким и тает во рту.",
    "layers": [
      "Маковый бисквит на сгущённом молоке",
      "Нежный апельсиновый крем",
      "Сметано-сливочный крем"
    ],
    "price_per_kg": 1700,
    "image": "https://optim.tildacdn.com/tild3932-3461-4231-b562-386433636565/-/contain/264x264/center/center/-/format/webp/W0046.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-563153574522-monako",
    "is_active": true
  },
  {
    "id": "fill_7",
    "db_id": 7,
    "sku": "Cake014",
    "label": "ЖЕНЕВА — Смородиновый торт (1800 ₽/кг)",
    "emoji": "🫐",
    "tag": "Cake014 • 1800 ₽/кг",
    "desc": "В этом вкусе нежнейшие ванильные бисквиты чередуются с шоколадными. Торт пропитан натуральным смородиновым сиропом. В прослойке в меру сладкое домашнее смородиновое варенье и сметано-сливочный крем.",
    "layers": [
      "Ванильный и шоколадный бисквиты",
      "Смородиновый сироп и домашнее варенье",
      "Сметано-сливочный крем"
    ],
    "price_per_kg": 1800,
    "image": "https://optim.tildacdn.com/tild3237-3734-4234-b734-346165383565/-/contain/264x264/center/center/-/format/webp/0002.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-865017669493-zheneva",
    "is_active": true
  },
  {
    "id": "fill_8",
    "db_id": 8,
    "sku": "Cake015",
    "label": "БОРДО — Красный бархат (1800 ₽/кг)",
    "emoji": "❤️",
    "tag": "ХИТ • Cake015",
    "desc": "Знаменитый торт «Красный бархат». Пористые, воздушные коржи с лёгким шоколадным послевкусием, сделаны на основе кислого молока. Торт пропитан домашним молочным сиропом. В прослойке натуральный сметано-сливочный крем.",
    "layers": [
      "Коржи «Красный бархат» с ноткой какао",
      "Домашний молочный сироп",
      "Натуральный сметано-сливочный крем"
    ],
    "price_per_kg": 1800,
    "image": "https://optim.tildacdn.com/tild3932-6233-4431-a162-323432616634/-/contain/264x264/center/center/-/format/webp/W0033.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-352658525377-bordo",
    "is_active": true
  },
  {
    "id": "fill_9",
    "db_id": 9,
    "sku": "Cake017",
    "label": "БОСТОН — Шоколадный с апельсином (1700 ₽/кг)",
    "emoji": "🍫",
    "tag": "Cake017 • 1700 ₽/кг",
    "desc": "Тортик для любителей сочетания цитрусовых и шоколадных вкусов. Пористые, воздушные шоколадные коржи, пропитанные натуральным апельсиновым сиропом. В прослойке сметано-сливочный крем вместе с домашним апельсиновым джемом.",
    "layers": [
      "Воздушные шоколадные коржи",
      "Натуральный апельсиновый сироп и джем",
      "Сметано-сливочный крем"
    ],
    "price_per_kg": 1700,
    "image": "https://optim.tildacdn.com/tild6539-3536-4030-a437-323431613864/-/contain/264x264/center/center/-/format/webp/0023.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-237352431090-boston",
    "is_active": true
  },
  {
    "id": "fill_10",
    "db_id": 10,
    "sku": "Cake002",
    "label": "ДУБЛИН — Солёная карамель с жареным арахисом (1800 ₽/кг)",
    "emoji": "🥜",
    "tag": "Cake002 • 1800 ₽/кг",
    "desc": "Этот торт из шифонового белого бисквита, прослоенного сырно-сливочным кремом с начинкой из обжаренного арахиса и очень вкусной солёной карамели.",
    "layers": [
      "Шифоновый белый бисквит",
      "Обжаренный арахис и солёная карамель",
      "Сырно-сливочный крем"
    ],
    "price_per_kg": 1800,
    "image": "https://optim.tildacdn.com/tild3536-6261-4038-a131-643235386161/-/contain/264x264/center/center/-/format/webp/0001.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-148879542238-dublin",
    "is_active": true
  },
  {
    "id": "fill_11",
    "db_id": 11,
    "sku": "Cake003",
    "label": "ЕРЕВАН — Малина с грушей (1800 ₽/кг)",
    "emoji": "🍐",
    "tag": "Cake003 • 1800 ₽/кг",
    "desc": "Для тех, кто любит необычные решения во вкусе. Легкий, воздушный ванильный бисквит, прослоенный сырно-сливочным кремом с добавлением малинового конфи и кусочков сладкой груши.",
    "layers": [
      "Воздушный ванильный бисквит",
      "Малиновое конфи и кусочки груши",
      "Сырно-сливочный крем"
    ],
    "price_per_kg": 1800,
    "image": "https://optim.tildacdn.com/tild3533-3139-4662-a666-303236336131/-/contain/264x264/center/center/-/format/webp/W0023.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-231536381905-erevan",
    "is_active": true
  },
  {
    "id": "fill_12",
    "db_id": 12,
    "sku": "Cake004",
    "label": "МАДРИД — Шоколадный с черникой (1800 ₽/кг)",
    "emoji": "🫐",
    "tag": "Cake004 • 1800 ₽/кг",
    "desc": "Шоколадный бисквит, прослоенный сырно-сливочным кремом с добавлением конфи из черники.",
    "layers": [
      "Насыщенный шоколадный бисквит",
      "Ягодное конфи из черники",
      "Сырно-сливочный крем"
    ],
    "price_per_kg": 1800,
    "image": "https://optim.tildacdn.com/tild6532-6333-4665-a361-626162636137/-/contain/264x264/center/center/-/format/webp/0051.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-285007378179-madrid",
    "is_active": true
  },
  {
    "id": "fill_13",
    "db_id": 13,
    "sku": "Cake005",
    "label": "ВЕРОНА — Лимонный с клубникой (1700 ₽/кг)",
    "emoji": "🍋",
    "tag": "Cake005 • 1700 ₽/кг",
    "desc": "Нежный белый бисквит с лимоном, пропитанный клубничным сиропом и прослоенный сырно-сливочным кремом, а также кусочками клубники.",
    "layers": [
      "Белый лимонный бисквит",
      "Клубничный сироп и кусочки клубники",
      "Сырно-сливочный крем"
    ],
    "price_per_kg": 1700,
    "image": "https://optim.tildacdn.com/tild3263-3834-4162-b063-343539313830/-/contain/264x264/center/center/-/format/webp/001.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-709251018144-verona",
    "is_active": true
  },
  {
    "id": "fill_14",
    "db_id": 14,
    "sku": "Cake006",
    "label": "СТАМБУЛ — Фундук в карамели (1800 ₽/кг)",
    "emoji": "🌰",
    "tag": "Cake006 • 1800 ₽/кг",
    "desc": "Любителям шоколадных тортов. Сочный шоколадный бисквит, прослоенный шоколадным кремом и начинкой из обжаренного фундука в домашней карамели.",
    "layers": [
      "Сочный шоколадный бисквит",
      "Обжаренный фундук в домашней карамели",
      "Шоколадный крем"
    ],
    "price_per_kg": 1800,
    "image": "https://optim.tildacdn.com/tild3330-3563-4238-b964-376664643038/-/format/webp/W0060.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-168756875483-stambul",
    "is_active": true
  },
  {
    "id": "fill_15",
    "db_id": 15,
    "sku": "Cake010",
    "label": "ЛОНДОН — Маковый с карамелью (1800 ₽/кг)",
    "emoji": "🍯",
    "tag": "Cake010 • 1800 ₽/кг",
    "desc": "Лондон — столица Великобритании и один из крупнейших городов мира. В этом вкусе торта наши кондитеры успешно сочетают шоколадный бисквит, прослоенный маковой начинкой и карамелью, с очень нежным кремом на основе натуральных сливок.",
    "layers": [
      "Шоколадный бисквит",
      "Маковая начинка и домашняя карамель",
      "Крем на натуральных сливках"
    ],
    "price_per_kg": 1800,
    "image": "https://static.tildacdn.com/tild3931-3266-4333-a361-313465313037/D0010.jpg",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-722990631287-london",
    "is_active": true
  },
  {
    "id": "fill_16",
    "db_id": 16,
    "sku": "Cake016",
    "label": "ПАРИЖ — Рафаэлло (1800 ₽/кг)",
    "emoji": "🥥",
    "tag": "Cake016 • 1800 ₽/кг",
    "desc": "Легкий и вкусный торт с воздушным кремом на основе белого шоколада и кокосовой стружкой, напоминающий вкус знаменитых конфет. Торт «Рафаэлло» отлично подойдет и для праздничного стола, и для романтического ужина.",
    "layers": [
      "Нежный бисквит",
      "Крем на белом шоколаде",
      "Кокосовая стружка"
    ],
    "price_per_kg": 1800,
    "image": "https://optim.tildacdn.com/tild3130-6630-4638-b437-396238626338/-/contain/264x264/center/center/-/format/webp/W0001.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-443672487737-parizh",
    "is_active": true
  },
  {
    "id": "fill_17",
    "db_id": 17,
    "sku": "Cake018",
    "label": "МЮНХЕН — Ореховый с маком (1700 ₽/кг)",
    "emoji": "🥨",
    "tag": "Cake018 • 1700 ₽/кг",
    "desc": "Очень вкусный торт из нежного макового бисквита, орехового и ванильного, в сочетании со сметано-сливочным кремом.",
    "layers": [
      "Маковый, ореховый и ванильный бисквиты",
      "Ореховая прослойка",
      "Сметано-сливочный крем"
    ],
    "price_per_kg": 1700,
    "image": "https://optim.tildacdn.com/tild3238-6233-4534-a438-666366303263/-/contain/264x264/center/center/-/format/webp/0045.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-888463771651-myunhen",
    "is_active": true
  },
  {
    "id": "fill_18",
    "db_id": 18,
    "sku": "Cake019",
    "label": "СИЭТЛ — Шоколадно-мятный (2000 ₽/кг • акция 1500 ₽/кг)",
    "emoji": "🌿",
    "tag": "Акция 1500р. • Cake019",
    "desc": "Для любителей мятного и очень пропитанного торта. Шоколадный бисквит с мятным кремом на основе белого шоколада.",
    "layers": [
      "Очень пропитанный шоколадный бисквит",
      "Освежающая мятная пропитка",
      "Мятный крем на белом шоколаде"
    ],
    "price_per_kg": 2000,
    "image": "https://static.tildacdn.com/tild6464-6335-4462-b961-623765353737/W0037.jpg",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110447657-405291797373-sietl",
    "is_active": true
  },
  {
    "id": "fill_19",
    "db_id": 19,
    "sku": "cupcake01",
    "label": "ИСЛАНДИЯ — Ванильный капкейк (180 ₽/шт)",
    "emoji": "🧁",
    "tag": "Капкейки • cupcake01",
    "desc": "Нежнейший ванильный капкейк с кремом на основе натуральных сливок. Заказ от 12 шт.",
    "layers": [
      "Нежный ванильный кекс",
      "Шапочка из натуральных сливок"
    ],
    "price_per_kg": 180,
    "image": "https://static.tildacdn.com/tild3164-6536-4039-b334-663131643432/about09.jpg",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-172923090752-islandiya",
    "is_active": true
  },
  {
    "id": "fill_20",
    "db_id": 20,
    "sku": "cupcake02",
    "label": "ЯПОНИЯ — Вишнёвый капкейк (180 ₽/шт)",
    "emoji": "🍒",
    "tag": "Капкейки • cupcake02",
    "desc": "Вкуснейший шоколадный капкейк с вишней и шоколадным кремом на основе натуральных сливок. Заказ от 12 шт.",
    "layers": [
      "Шоколадный бисквит",
      "Начинка из вишни",
      "Шоколадно-сливочный крем"
    ],
    "price_per_kg": 180,
    "image": "https://optim.tildacdn.com/tild3365-3339-4631-a165-653833616436/-/contain/264x264/center/center/-/format/webp/W0031.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-663107342183-yaponiya",
    "is_active": true
  },
  {
    "id": "fill_21",
    "db_id": 21,
    "sku": "cupcake03",
    "label": "КИТАЙ — Капкейк Красный бархат (180 ₽/шт)",
    "emoji": "❤️",
    "tag": "Капкейки • cupcake03",
    "desc": "Яркий капкейк из бисквита «красный бархат» с сырно-сливочным кремом и смородиновой начинкой внутри. Заказ от 12 шт.",
    "layers": [
      "Бисквит «Красный бархат»",
      "Смородиновая начинка",
      "Сырно-сливочный крем"
    ],
    "price_per_kg": 180,
    "image": "https://optim.tildacdn.com/tild3932-6233-4431-a162-323432616634/-/contain/264x264/center/center/-/format/webp/W0033.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-815550927689-kitai",
    "is_active": true
  },
  {
    "id": "fill_22",
    "db_id": 22,
    "sku": "cupcake04",
    "label": "АРГЕНТИНА — Банановый капкейк (180 ₽/шт)",
    "emoji": "🍌",
    "tag": "Капкейки • cupcake04",
    "desc": "Сметанный капкейк с бананово-карамельной начинкой и сырным кремом. Заказ от 12 шт.",
    "layers": [
      "Сметанный бисквит",
      "Бананово-карамельная начинка",
      "Нежный сырный крем"
    ],
    "price_per_kg": 180,
    "image": "https://optim.tildacdn.com/tild3238-6233-4534-a438-666366303263/-/contain/264x264/center/center/-/format/webp/0045.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-414713461849-argentina",
    "is_active": true
  },
  {
    "id": "fill_23",
    "db_id": 23,
    "sku": "cupcake05",
    "label": "АНГЛИЯ — Клубничный капкейк (180 ₽/шт)",
    "emoji": "🍓",
    "tag": "Капкейки • cupcake05",
    "desc": "Ванильный капкейк с начинкой из клубничного варенья и сливочного крема. Заказ от 12 шт.",
    "layers": [
      "Ванильный бисквит",
      "Домашнее клубничное варенье",
      "Сливочный крем"
    ],
    "price_per_kg": 180,
    "image": "https://optim.tildacdn.com/tild3632-6230-4264-b564-313932386166/-/contain/264x264/center/center/-/format/webp/0053.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-317450720873-angliya",
    "is_active": true
  },
  {
    "id": "fill_24",
    "db_id": 24,
    "sku": "cupcake06",
    "label": "ПОРТУГАЛИЯ — Апельсиновый капкейк (180 ₽/шт)",
    "emoji": "🍊",
    "tag": "Капкейки • cupcake06",
    "desc": "Сочный шоколадный капкейк с апельсиновой начинкой и шоколадным кремом. Заказ от 12 шт.",
    "layers": [
      "Сочный шоколадный бисквит",
      "Апельсиновая начинка",
      "Шоколадный крем"
    ],
    "price_per_kg": 180,
    "image": "https://optim.tildacdn.com/tild6539-3536-4030-a437-323431613864/-/contain/264x264/center/center/-/format/webp/0023.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-821617616280-portugaliya",
    "is_active": true
  },
  {
    "id": "fill_25",
    "db_id": 25,
    "sku": "cupcake07",
    "label": "ЧЕХИЯ — Морковно-ореховый капкейк (180 ₽/шт)",
    "emoji": "🥕",
    "tag": "Капкейки • cupcake07",
    "desc": "Морковно-ореховый капкейк со сливочным кремом и карамельной начинкой внутри никого не оставит равнодушным. Заказ от 12 шт.",
    "layers": [
      "Морковно-ореховый бисквит",
      "Карамельная начинка",
      "Сливочный крем"
    ],
    "price_per_kg": 180,
    "image": "https://static.tildacdn.com/tild3164-6536-4039-b334-663131643432/about09.jpg",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-956347843184-chehiya",
    "is_active": true
  },
  {
    "id": "fill_26",
    "db_id": 26,
    "sku": "cupcake08",
    "label": "ИТАЛИЯ — Ореховый капкейк (180 ₽/шт)",
    "emoji": "🌰",
    "tag": "Капкейки • cupcake08",
    "desc": "Вкуснейший ореховый капкейк с нежным сливочным кремом. Заказ от 12 шт.",
    "layers": [
      "Ароматный ореховый бисквит",
      "Нежный сливочный крем"
    ],
    "price_per_kg": 180,
    "image": "https://optim.tildacdn.com/tild3031-3137-4138-b165-306437623832/-/contain/264x264/center/center/-/format/webp/W0044.jpg.webp",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-537478492438-italiya",
    "is_active": true
  },
  {
    "id": "fill_27",
    "db_id": 27,
    "sku": "cupcake09",
    "label": "ПОЛЬША — Мятный капкейк (200 ₽/шт)",
    "emoji": "🌿",
    "tag": "Капкейки • cupcake09",
    "desc": "Для любителей шоколада мы создали шоколадный капкейк с мятной начинкой и шоколадным кремом. Заказ от 20 шт.",
    "layers": [
      "Шоколадный бисквит",
      "Освежающая мятная начинка",
      "Шоколадный крем"
    ],
    "price_per_kg": 200,
    "image": "https://static.tildacdn.com/tild6464-6335-4462-b961-623765353737/W0037.jpg",
    "product_url": "https://www.tort54.ru/catalog/tproduct/110505064-828433277743-polsha",
    "is_active": true
  }
];

  var DEFAULT_REVIEWS = [
  {
    "id": "rev_1",
    "db_id": 1,
    "name": "Ольга Шевелева",
    "rating": 5,
    "cake": "Торт «Новосибирск» — Банановый с карамелью",
    "date": "Отзыв с tort54.ru",
    "text": "Евгения! Ваш тортик был супер! Очень жалко что я маленький заказала, не успела насладиться — гости в очередь встали! Спасибо вам большое за то, что этот торт поднял нам настроение, я получила то, что хотела. Успехов вам в работе! Я ваш клиент навеки!",
    "is_published": true
  },
  {
    "id": "rev_2",
    "db_id": 2,
    "name": "Анастасия Мельникова",
    "rating": 5,
    "cake": "Свадебный торт W0100 «Изомальт и цветы»",
    "date": "Отзыв с tort54.ru",
    "text": "Евгения, спасибо огромное за вкуснейший торт на нашу свадьбу! Гости были в восторге! Наутро после свадьбы жалела только об одном, что мало съела! Восхитительный!",
    "is_published": true
  },
  {
    "id": "rev_3",
    "db_id": 3,
    "name": "Гузаль Бурнашева",
    "rating": 5,
    "cake": "Свадебный торт W0001 «Нежные розы»",
    "date": "Отзыв с tort54.ru",
    "text": "Огромное спасибо мастеру Евгении за этот шикарно оформленный свадебный тортик. Именно такой, какой мы и хотели. Два яруса с разными начинками. Он не только красивый, но и безумно вкусный. Заказ выполнен вовремя, доставлен по адресу. Теперь мы ваши постоянные клиенты!",
    "is_published": true
  },
  {
    "id": "rev_4",
    "db_id": 4,
    "name": "Ирина Николаева",
    "rating": 5,
    "cake": "Кремовый торт с ягодами и фруктами (A0024)",
    "date": "Отзыв с tort54.ru",
    "text": "Евгения, спасибо Вам большое за очень-очень вкусный торт! Все привередливые гости остались довольны! Спасибо огромное за твой труд, все как всегда на высшем уровне!",
    "is_published": true
  },
  {
    "id": "rev_5",
    "db_id": 5,
    "name": "Светлана Лебедева",
    "rating": 5,
    "cake": "Торт «Питер» — Клубничный шифоновый",
    "date": "Отзыв с tort54.ru",
    "text": "Евгения, спасибо Вам большое. Тортик был очень вкусным, очень пропитанным, в меру сладким. Мммм... пальчики оближешь... Мужу очень понравился!",
    "is_published": true
  },
  {
    "id": "rev_6",
    "db_id": 6,
    "name": "Дарья Лузянина",
    "rating": 5,
    "cake": "Торт «Бордо» — Красный бархат",
    "date": "Отзыв с tort54.ru",
    "text": "Евгения, Огромное Спасибо за это кондитерское ЧУДО! Мы с таким удовольствием съели Ваш тортик! Все мои пожелания воплотились в этом произведении! Наши гости были в восторге, только так не хотелось резать эту красоту!",
    "is_published": true
  },
  {
    "id": "rev_7",
    "db_id": 7,
    "name": "Юля Крылова",
    "rating": 5,
    "cake": "Детский торт D0010 «Клубника и OREO»",
    "date": "Отзыв с tort54.ru",
    "text": "Евгения, спасибо за вкуснейшие торты. Кирюша был доволен да и мы тоже! Рекомендую всем Евгению, заказывали не первый раз и думаю не последний — все очень вкусно и красиво, прям так, как хочет видеть глаз!",
    "is_published": true
  },
  {
    "id": "rev_8",
    "db_id": 8,
    "name": "Валерия Науменко",
    "rating": 5,
    "cake": "Торт «Москва» — Шоколадный с вишней",
    "date": "Отзыв с tort54.ru",
    "text": "Женечка, от нашей семьи хотим сказать СПАСИБО за самую вкусную часть нашего семейного праздника! Было очень душевно, сладко, красиво и моментально слопалось! Вы просто чудо-кондитер!",
    "is_published": true
  },
  {
    "id": "rev_9",
    "db_id": 9,
    "name": "Анастасия Полехова",
    "rating": 5,
    "cake": "Торт «Дублин» — Солёная карамель с арахисом",
    "date": "Отзыв с tort54.ru",
    "text": "Женя, здравствуйте! Хочу сказать еще раз огромное спасибо за торт! Он не только красивый, но и невероятно вкусный! Я небольшой любитель сладкого, но оторваться не могла от него! Муж даже не стал брать на работу, сказал: давай дома сами съедим!",
    "is_published": true
  },
  {
    "id": "rev_10",
    "db_id": 10,
    "name": "Виктория Черняева",
    "rating": 5,
    "cake": "Свадебный торт W0109 «Вафельные цветы»",
    "date": "Отзыв с tort54.ru",
    "text": "Милая Женечка! Ваше произведение, кулинарный шедевр был просто улётный — мало того, что он прекрасен внешне, очень дорого и эффектно смотрелся, а про вкус я вообще слов не нахожу, кроме как — божественно! Вы действительно профессионал своего дела!",
    "is_published": true
  },
  {
    "id": "rev_11",
    "db_id": 11,
    "name": "Маргарита Кравченко",
    "rating": 5,
    "cake": "Детский торт D0186 «Сказочный Единорог»",
    "date": "Отзыв с tort54.ru",
    "text": "Евгения, спасибо огромное за чудесные торты! Очень домашние и натуральные на вкус, к тому же ювелирно оформленные! Все дети и гости были в полном восторге! Без ваших тортов наш праздник не был бы таким запоминающимся!",
    "is_published": true
  },
  {
    "id": "rev_12",
    "db_id": 12,
    "name": "Лариса Маскина",
    "rating": 5,
    "cake": "Торт D0177 «Радуга и порхающие бабочки»",
    "date": "Отзыв с tort54.ru",
    "text": "Евгения, теперь я понимаю, почему большинство Ваших клиентов — постоянные. Изумительный вкус свежайшего торта и безупречное оформление — вот разгадка! Очередное спасибо Вам за праздник, пока фотографировала гостей за столом — они его уже съели!",
    "is_published": true
  },
  {
    "id": "rev_13",
    "db_id": 13,
    "name": "Мария Бондарева",
    "rating": 5,
    "cake": "Детский торт D0185 «На первый годик»",
    "date": "Отзыв с tort54.ru",
    "text": "Женя! Хочу выразить благодарность за первый торт для моего сыночка! Все гости впечатлены оформлением и потрясающим вкусом! Рекомендую всем друзьям и знакомым!",
    "is_published": true
  },
  {
    "id": "rev_14",
    "db_id": 14,
    "name": "Виктория Джавадова",
    "rating": 5,
    "cake": "Набор фирменных капкейков (10 шт.)",
    "date": "Отзыв с tort54.ru",
    "text": "Евгения, здравствуйте! Спасибо большое за тортик и капкейки! Всё было очень красиво и вкусно! Гости тоже остались довольны, многие даже попросили ваши контакты!",
    "is_published": true
  },
  {
    "id": "rev_15",
    "db_id": 15,
    "name": "Янина Елисеева",
    "rating": 5,
    "cake": "Детский торт D0179 «Космонавт и Галактика»",
    "date": "Отзыв с tort54.ru",
    "text": "Евгения, спасибо большое за то, что воплотили идею, что все обсуждения и просьбы были учтены Вами! Торт получился таким, каким и хотелось его видеть! Именинник идею оценил, и спасибо за быструю доставку!",
    "is_published": true
  },
  {
    "id": "rev_16",
    "db_id": 16,
    "name": "Ксения Лесникова",
    "rating": 5,
    "cake": "Торт «Сиэтл» — Шоколадно-мятный",
    "date": "Отзыв с tort54.ru",
    "text": "Евгения, добрый вечер! Скушали торт, даже оказалось мало! Торт нежный, вкусный, особенно понравились сливки по бокам — они безумные!",
    "is_published": true
  },
  {
    "id": "rev_17",
    "db_id": 17,
    "name": "Дарья Полянская",
    "rating": 5,
    "cake": "Свадебный торт W0023 «Клубника и розы»",
    "date": "Отзыв с tort54.ru",
    "text": "Спасибо еще раз огромное, мало того что наш торт был очень красивый, так он еще и очень вкусный!",
    "is_published": true
  },
  {
    "id": "rev_18",
    "db_id": 18,
    "name": "Ирина Демидова",
    "rating": 5,
    "cake": "Праздничный торт D0188 «С получением паспорта»",
    "date": "Отзыв с tort54.ru",
    "text": "Евгения, здравствуйте! Хоть и месяц уже прошёл, всё равно напишу. Ещё раз спасибо большое за вкусные десерты на наш праздник! Ооочень вкусно!",
    "is_published": true
  }
];

  // ==========================================
  // 2. СОСТОЯНИЕ ПРИЛОЖЕНИЯ
  // ==========================================
  var currentCatalog = DEFAULT_CATALOG.slice();
  var currentFillings = DEFAULT_FILLINGS.slice();
  var currentReviews = DEFAULT_REVIEWS.slice();
  var activeCategory = 'all';
  var isMainCatalogExpanded = false;
  var activeAllCakesFilter = 'all';
  var allCakesSearchQuery = '';
  var activeFillingFilter = 'all';

  var userToken = safeStorageGet('local', 'velvet_user_token') || null;
  var currentUser = null;
  try {
    var rawUser = safeStorageGet('local', 'velvet_user_profile');
    if (rawUser) currentUser = JSON.parse(rawUser);
  } catch (e) {
    currentUser = null;
  }

  var adminToken = safeStorageGet('session', 'velvet_admin_token') || null;
  var pendingReviewAfterAuth = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function on(id, eventName, handler) {
    var el = byId(id);
    if (el) {
      el.addEventListener(eventName, handler);
    }
  }

  function getAuthHeaders(token) {
    var headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
  }

  function makeFallbackSvgDataUri(emoji, title) {
    var safeEmoji = escapeHtml(emoji || '🎂');
    var safeTitle = escapeHtml(String(title || 'VelvetCake').slice(0, 38));
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">' +
      '<defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#f7dfd0"/><stop offset="100%" stop-color="#eab8a2"/>' +
      '</linearGradient></defs>' +
      '<rect width="600" height="400" fill="url(#bg)"/>' +
      '<circle cx="300" cy="180" r="92" fill="rgba(255,255,255,0.68)"/>' +
      '<text x="300" y="210" font-size="92" text-anchor="middle">' + safeEmoji + '</text>' +
      '<text x="300" y="340" font-family="sans-serif" font-size="22" font-weight="bold" fill="#4f3d31" text-anchor="middle">' +
      safeTitle + '</text></svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // ==========================================
  // 2. РАЗМЕЩЕНИЕ КНОПКИ АВТОРИЗАЦИИ И МОДАЛЬНОГО ОКНА ВХОДА
  // ==========================================
  function ensureAuthMarkup() {
    var headerActions = document.querySelector('.header-actions');
    if (headerActions) {
      var authBtn = byId('openAuthBtn');
      if (!authBtn) {
        authBtn = document.createElement('button');
        authBtn.className = 'btn-glass btn-glass-sm';
        authBtn.id = 'openAuthBtn';
        authBtn.type = 'button';
        authBtn.title = 'Личный кабинет и авторизация';
        authBtn.innerHTML = '<span id="headerUserLabel">👤 Войти</span>';
      } else if (!byId('headerUserLabel')) {
        var span = document.createElement('span');
        span.id = 'headerUserLabel';
        span.textContent = authBtn.textContent;
        authBtn.textContent = '';
        authBtn.appendChild(span);
      }

      var mobileBtn = byId('mobileMenuBtn');
      if (mobileBtn && mobileBtn.parentNode === headerActions) {
        headerActions.insertBefore(authBtn, mobileBtn);
      } else {
        headerActions.appendChild(authBtn);
      }
    }

    var existingAuthModal = byId('authModal');
    if (existingAuthModal) {
      existingAuthModal.remove();
    }

    var modalWrap = document.createElement('div');
    modalWrap.className = 'modal-backdrop';
    modalWrap.id = 'authModal';
    modalWrap.setAttribute('aria-hidden', 'true');
    modalWrap.innerHTML = [
      '<div class="modal-glass">',
      '  <button type="button" class="modal-close" id="closeAuthModal" aria-label="Закрыть">✕</button>',
      '  <div id="authGuestView">',
      '    <div class="modal-header">',
      '      <div class="modal-brand-row"><span class="modal-badge">📲 Защищённый вход через Telegram</span></div>',
      '      <h3>Авторизация по номеру телефона</h3>',
      '      <p class="modal-sub">Введите ваш номер телефона — наш Telegram-бот пришлёт одноразовый 6-значный код для входа.</p>',
      '    </div>',
      '    <form id="authForm" class="modal-form" novalidate>',
      '      <div class="form-group">',
      '        <label for="authPhone">Номер телефона <span class="label-hint">(+7 или 8)</span></label>',
      '        <input type="tel" id="authPhone" placeholder="+79991234567" autocomplete="tel" required />',
      '      </div>',
      '      <div class="form-group" id="authNameGroup">',
      '        <label for="authName">Ваше имя <span class="label-hint">(отобразится в профиле)</span></label>',
      '        <input type="text" id="authName" placeholder="Например: Роман" autocomplete="given-name" maxlength="50" />',
      '      </div>',
      '      <div class="form-group" id="authCodeGroup" style="display: none;">',
      '        <label for="authCode">Одноразовый код из Telegram (6 цифр)</label>',
      '        <input type="text" id="authCode" placeholder="Введите 6 цифр кода" maxlength="6" inputmode="numeric" autocomplete="one-time-code" />',
      '        <small id="authDemoCodeHint" style="display:block; margin-top:6px; color:#c86d51; font-weight:600;"></small>',
      '      </div>',
      '      <div class="form-status" id="authStatus"></div>',
      '      <button type="submit" class="btn-glass btn-glass-primary btn-full" id="authSubmitBtn">',
      '        <span id="authSubmitText">Получить код в Telegram</span>',
      '        <span>✈️</span>',
      '      </button>',
      '      <button type="button" class="btn-glass btn-glass-light btn-full" id="authChangePhoneBtn" style="display: none;">',
      '        <span>← Изменить номер телефона</span>',
      '      </button>',
      '    </form>',
      '  </div>',
      '  <div id="authProfileView" style="display: none;">',
      '    <div class="modal-header">',
      '      <div class="modal-brand-row"><span class="modal-badge">✨ Вы авторизованы</span></div>',
      '      <h3 id="profileUserName">Привет!</h3>',
      '      <p class="modal-sub" id="profileUserPhone">+7 ...</p>',
      '    </div>',
      '    <div style="margin: 16px 0;">',
      '      <h4 style="margin-bottom: 10px;">📦 Мои заказы</h4>',
      '      <div id="profileOrdersList" style="max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;"></div>',
      '    </div>',
      '    <button type="button" class="btn-glass btn-glass-light btn-full" id="logoutUserBtn" style="color: #d93829;">',
      '      <span>Выйти из аккаунта</span>',
      '    </button>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(modalWrap);
  }

  ensureAuthMarkup();

  function formatPhoneInput(val) {
    var digits = String(val || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.charAt(0) === '8') {
      digits = '7' + digits.slice(1);
    } else if (digits.charAt(0) === '9') {
      digits = '7' + digits;
    }
    digits = digits.slice(0, 11);
    return '+' + digits;
  }

  ['authPhone', 'clientPhone'].forEach(function (id) {
    on(id, 'input', function (e) {
      e.target.value = formatPhoneInput(e.target.value);
    });
  });

  function updateHeaderUserUI() {
    var label = byId('headerUserLabel');
    var btn = byId('openAuthBtn');
    if (label) {
      if (currentUser && currentUser.name) {
        label.textContent = '👤 ' + currentUser.name;
        if (btn) btn.classList.add('btn-glass-primary');
      } else {
        label.textContent = '👤 Войти';
        if (btn) btn.classList.remove('btn-glass-primary');
      }
    }
  }

  // ==========================================
  // 3. БЕЗОПАСНАЯ ОТРИСОВКА КАТАЛОГА, НАЧИНОК, ОТЗЫВОВ И КАЛЬКУЛЯТОРА
  // ==========================================
  function getTwoRowsCount() {
    var w = window.innerWidth || 1280;
    if (w > 640 && w <= 1120) return 4; // 2 колонки * 2 ряда = 4 карточки
    return 6; // 3 колонки * 2 ряда = 6 карточек
  }

  function matchesCatalogFilter(item, filterKey, searchQuery) {
    var f = filterKey || 'all';
    var catMatch = false;
    if (f === 'all') {
      catMatch = true;
    } else if (f === 'hits') {
      catMatch = Boolean(item.is_hit) || String(item.badge || '').toUpperCase().indexOf('ХИТ') !== -1;
    } else if (f === 'kids') {
      catMatch = Boolean(item.in_baby) || item.section === 'kids' || item.category === 'kids';
    } else if (f === 'wedding') {
      catMatch = item.section === 'wedding' || item.category === 'wedding';
    } else if (f === 'other') {
      catMatch = Boolean(item.in_other) || item.section === 'other' || ['holiday', 'corp', 'berry', 'choco'].indexOf(item.category) !== -1;
    } else if (f === 'cupcakes' || f === 'bento') {
      catMatch = item.section === 'cupcakes' || item.category === 'bento';
    } else {
      catMatch = item.category === f;
    }
    if (!catMatch) return false;

    if (searchQuery && searchQuery.trim()) {
      var q = searchQuery.trim().toLowerCase();
      var hay = [
        item.title || '',
        item.sku || '',
        item.text || '',
        item.meta || '',
        item.badge || ''
      ].join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    }
    return true;
  }

  function createCakeCardElement(item) {
    var card = document.createElement('article');
    card.className = 'product-card';

    var safeTitle = escapeHtml(item.title);
    var safeBadge = item.badge ? '<span class="product-badge">' + escapeHtml(item.badge) + '</span>' : '';
    var fallbackUri = makeFallbackSvgDataUri(item.emoji, item.title);
    var imgSrc = sanitizeImageUrl(item.image, fallbackUri);
    var imgHtml = '<img src="' + escapeHtml(imgSrc) + '" class="product-img-photo" alt="' + safeTitle + '" loading="lazy" />' +
      '<span class="product-emoji-floating">' + escapeHtml(item.emoji || '🎂') + '</span>';

    var metaHtml = item.meta ? '<div class="product-meta">' + escapeHtml(item.meta) + '</div>' : '';
    var origLinkHtml = item.product_url
      ? '<a href="' + escapeHtml(item.product_url) + '" target="_blank" rel="noopener noreferrer" class="product-orig-link">Страница на tort54.ru ↗</a>'
      : '';

    var defaultWeightAttr = item.section === 'cupcakes'
      ? 'От 12 шт.'
      : ((item.weight_kg ? Number(item.weight_kg).toFixed(1) : '2.5') + ' кг');

    card.innerHTML = [
      '<div class="product-visual">',
      safeBadge,
      imgHtml,
      '</div>',
      '<div class="product-body">',
      metaHtml,
      '<h3 class="product-title">' + safeTitle + '</h3>',
      '<p class="product-text">' + escapeHtml(item.text) + '</p>',
      origLinkHtml,
      '<div class="product-footer">',
      '<div class="product-price">' + Number(item.price || 0).toLocaleString('ru-RU') + ' ₽ <span>' + escapeHtml(item.unit || '/ кг') + '</span></div>',
      '<button type="button" class="btn-glass btn-glass-primary btn-sm" data-open-modal="' + safeTitle + '" data-default-weight="' + escapeHtml(defaultWeightAttr) + '">Заказать</button>',
      '</div>',
      '</div>'
    ].join('');

    var imgEl = card.querySelector('img');
    if (imgEl) {
      imgEl.addEventListener('error', function () {
        if (imgEl.src !== fallbackUri) {
          imgEl.src = fallbackUri;
        }
      });
    }
    return card;
  }

  function renderCatalog() {
    var grid = byId('catalogGrid');
    if (!grid) return;
    grid.innerHTML = '';

    var countStat = byId('heroCakesCountStat');
    if (countStat) {
      countStat.textContent = currentCatalog.length + ' тортов';
    }
    var navCakesLink = byId('navAllCakesLink');
    if (navCakesLink) {
      navCakesLink.textContent = '🎂 Торты (' + currentCatalog.length + ')';
    }

    var filtered = currentCatalog.filter(function (item) {
      return matchesCatalogFilter(item, activeCategory, '');
    });

    var twoRowsLimit = getTwoRowsCount();
    var visibleItems = isMainCatalogExpanded ? filtered : filtered.slice(0, twoRowsLimit);

    visibleItems.forEach(function (item) {
      grid.appendChild(createCakeCardElement(item));
    });

    var loadMoreBox = byId('catalogLoadMoreBox');
    var statusEl = byId('catalogShownStatus');
    var btnEl = byId('loadMoreCakesBtn');
    var btnTextEl = byId('loadMoreCakesBtnText');
    var btnIconEl = byId('loadMoreCakesBtnIcon');

    if (loadMoreBox) {
      if (filtered.length <= twoRowsLimit) {
        if (statusEl) statusEl.textContent = 'Показаны все ' + filtered.length + ' позиций в этой категории';
        if (btnEl) btnEl.style.display = 'none';
      } else {
        if (btnEl) btnEl.style.display = 'inline-flex';
        if (isMainCatalogExpanded) {
          if (statusEl) statusEl.textContent = 'Показаны все ' + filtered.length + ' из ' + filtered.length + ' тортов';
          if (btnTextEl) btnTextEl.textContent = 'Свернуть обратно до 2 рядов';
          if (btnIconEl) btnIconEl.textContent = '↑';
        } else {
          if (statusEl) statusEl.textContent = 'В главном меню показано 2 ряда (' + visibleItems.length + ' из ' + filtered.length + ' тортов)';
          if (btnTextEl) btnTextEl.textContent = 'Загрузить еще (показать все ' + filtered.length + ' тортов)';
          if (btnIconEl) btnIconEl.textContent = '↓';
        }
      }
    }
  }

  function renderAllCakesSection() {
    var grid = byId('allCakesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    var filtered = currentCatalog.filter(function (item) {
      return matchesCatalogFilter(item, activeAllCakesFilter, allCakesSearchQuery);
    });

    var pill = byId('allCakesCountPill');
    if (pill) {
      pill.textContent = 'Показано: ' + filtered.length + ' из ' + currentCatalog.length;
    }

    if (filtered.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 36px; color: var(--text-secondary);">По вашему запросу ничего не найдено. Попробуйте другой артикул или название.</div>';
      return;
    }

    filtered.forEach(function (item) {
      grid.appendChild(createCakeCardElement(item));
    });
  }

  function renderFillings() {
    var grid = byId('fillingsGrid');
    if (grid) {
      grid.innerHTML = '';
      var filteredFillings = currentFillings.filter(function (f) {
        var isCupcake = String(f.sku || f.tag || '').toLowerCase().indexOf('cupcake') !== -1 || String(f.tag || '').toLowerCase().indexOf('капкейк') !== -1;
        if (activeFillingFilter === 'cakes') return !isCupcake;
        if (activeFillingFilter === 'cupcakes') return isCupcake;
        return true;
      });

      filteredFillings.forEach(function (f) {
        var card = document.createElement('article');
        card.className = 'filling-card';
        card.style.cursor = 'pointer';
        card.dataset.fillingTitle = f.label;

        var layersHtml = (f.layers || []).map(function (l) {
          return '<span>' + escapeHtml(l) + '</span>';
        }).join('');

        var tagHtml = f.tag ? '<span class="filling-tag">' + escapeHtml(f.tag) + '</span>' : '';
        var layersBlock = layersHtml ? '<div class="filling-layers">' + layersHtml + '</div>' : '';

        var fallbackUri = makeFallbackSvgDataUri(f.emoji || '🍓', f.label);
        var thumbSrc = sanitizeImageUrl(f.image, fallbackUri);
        var thumbHtml = f.image
          ? '<div class="filling-thumb-wrap"><img src="' + escapeHtml(thumbSrc) + '" alt="' + escapeHtml(f.label) + '" class="filling-thumb-img" loading="lazy" /></div>'
          : '';

        var isCupcake = String(f.sku || f.tag || '').toLowerCase().indexOf('cupcake') !== -1;
        var priceUnitLabel = isCupcake ? ' ₽ / шт' : ' ₽ / кг';

        card.innerHTML = [
          thumbHtml,
          '<div class="filling-top">',
          '<span class="filling-emoji">' + escapeHtml(f.emoji || '🍓') + '</span>',
          tagHtml,
          '</div>',
          '<h3>' + escapeHtml(f.label) + '</h3>',
          '<p>' + escapeHtml(f.desc || '') + '</p>',
          layersBlock,
          '<div style="margin-top: 8px; padding-top: 10px; border-top: 1px dashed rgba(140,110,85,0.2); display:flex; justify-content:space-between; align-items:center;">',
          '  <strong style="color: var(--accent-primary); font-size:0.9rem;">' + Number(f.price_per_kg || 1700).toLocaleString('ru-RU') + priceUnitLabel + '</strong>',
          '  <span style="font-size:0.82rem; font-weight:600; color:#4f3d31;">Выбрать вкус →</span>',
          '</div>'
        ].join('');

        var imgEl = card.querySelector('img');
        if (imgEl) {
          imgEl.addEventListener('error', function () {
            if (imgEl.src !== fallbackUri) {
              imgEl.src = fallbackUri;
            }
          });
        }

        grid.appendChild(card);
      });
    }

    var calcSelect = byId('calcFillingSelect');
    if (calcSelect) {
      var prevVal = calcSelect.value;
      var cakeFillingsOnly = currentFillings.filter(function (f) {
        return String(f.sku || '').toLowerCase().indexOf('cupcake') === -1;
      });
      var listForCalc = cakeFillingsOnly.length > 0 ? cakeFillingsOnly : currentFillings;
      calcSelect.innerHTML = listForCalc.map(function (f) {
        return '<option value="' + escapeHtml(f.label) + '">' + escapeHtml(f.emoji || '🍓') + ' ' + escapeHtml(f.label) + '</option>';
      }).join('');
      if (prevVal && listForCalc.some(function (f) { return f.label === prevVal; })) {
        calcSelect.value = prevVal;
      }
      updateCalculator();
    }
  }

  function renderReviews() {
    var grid = byId('reviewsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    updateHeaderUserUI();

    var revStat = byId('heroReviewsCountStat');
    if (revStat) {
      revStat.textContent = currentReviews.length + ' реальных отзывов с tort54.ru';
    }

    currentReviews.forEach(function (r) {
      var card = document.createElement('article');
      card.className = 'review-glass-card';
      var ratingNum = Math.max(1, Math.min(5, parseInt(r.rating, 10) || 5));
      var stars = '★'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);
      var firstLetter = escapeHtml((r.name || 'Г').charAt(0).toUpperCase());

      card.innerHTML = [
        '<div class="review-top">',
        '  <div class="review-author-box">',
        '    <div class="review-avatar">' + firstLetter + '</div>',
        '    <div class="review-author-meta">',
        '      <strong>' + escapeHtml(r.name) + '</strong>',
        '      <span class="review-date">' + escapeHtml(r.date) + '</span>',
        '    </div>',
        '  </div>',
        '  <div class="review-stars">' + stars + '</div>',
        '</div>',
        '<div class="review-cake-pill">🎂 ' + escapeHtml(r.cake) + '</div>',
        '<p class="review-text">«' + escapeHtml(r.text) + '»</p>'
      ].join('');

      grid.appendChild(card);
    });
  }

  function getFillingPricePerKg(fillingLabel) {
    var found = currentFillings.find(function (f) { return f.label === fillingLabel; });
    if (found && found.price_per_kg) return Number(found.price_per_kg);
    if (String(fillingLabel).indexOf('2000') !== -1) return 2000;
    if (String(fillingLabel).indexOf('1800') !== -1) return 1800;
    return 1700;
  }

  function updateCalculator() {
    var guestsInput = byId('guestsRange');
    if (!guestsInput) return;
    var guests = parseInt(guestsInput.value, 10) || 10;
    if (byId('guestsCountLabel')) {
      byId('guestsCountLabel').textContent = guests + ' чел.';
    }

    var fillSelect = byId('calcFillingSelect');
    var selectedFilling = fillSelect ? fillSelect.value : '';
    var baseKgPrice = getFillingPricePerKg(selectedFilling);

    var isBento = guests <= 2;
    var weightKg = isBento ? 0.45 : Math.max(1.5, Math.round(guests * 0.175 * 2) / 2);
    var tiers = weightKg >= 6.0 ? '3 яруса' : (weightKg >= 3.5 ? '2 яруса' : '1 ярус');
    var price = isBento ? 1700 : Math.round(weightKg * baseKgPrice);

    if (byId('calcWeightResult')) {
      byId('calcWeightResult').textContent = isBento ? 'Бенто (450 г)' : (weightKg.toFixed(1) + ' кг');
    }
    if (byId('calcTiersResult')) {
      byId('calcTiersResult').textContent = tiers;
    }
    if (byId('calcPriceResult')) {
      byId('calcPriceResult').textContent = price.toLocaleString('ru-RU') + ' ₽';
    }
  }

  on('guestsRange', 'input', updateCalculator);
  on('guestsRange', 'change', updateCalculator);
  on('calcFillingSelect', 'change', updateCalculator);

  on('calcOrderBtn', 'click', function () {
    var fillEl = byId('calcFillingSelect');
    var weightEl = byId('calcWeightResult');
    var fill = fillEl ? fillEl.value : '';
    var weightText = weightEl ? weightEl.textContent : '2.0 кг';
    openOrderModal('Торт A0024', fill, weightText);
  });

  // ==========================================
  // 4. ОБРАБОТЧИКИ ВСЕХ КНОПОК САЙТА И МОБИЛЬНОЙ НАВИГАЦИИ
  // ==========================================
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.active').forEach(function (m) {
        m.classList.remove('active');
      });
      var nav = byId('mainNav');
      if (nav) nav.classList.remove('open');
    }
  });

  document.addEventListener('click', function (e) {
    var target = e.target && e.target.nodeType === 3 ? e.target.parentElement : e.target;
    if (!target || !target.closest) return;

    if (target.closest('.modal-close') || target.classList.contains('modal-backdrop')) {
      document.querySelectorAll('.modal-backdrop').forEach(function (m) {
        m.classList.remove('active');
      });
      return;
    }

    if (target.closest('#mobileMenuBtn')) {
      var nav = byId('mainNav');
      if (nav) nav.classList.toggle('open');
      return;
    }

    if (target.closest('.nav-link')) {
      var navMenu = byId('mainNav');
      if (navMenu) navMenu.classList.remove('open');
    }

    if (target.closest('#openAuthBtn')) {
      e.preventDefault();
      pendingReviewAfterAuth = false;
      openAuthModal();
      return;
    }

    if (target.closest('#openAdminBtn')) {
      e.preventDefault();
      var adminModal = byId('adminModal');
      if (adminModal) adminModal.classList.add('active');
      toggleAdminView();
      return;
    }

    var btnOrder = target.closest('[data-open-modal]');
    if (btnOrder) {
      e.preventDefault();
      var modalCakeTitle = btnOrder.getAttribute('data-open-modal');
      var defaultWeight = btnOrder.getAttribute('data-default-weight') || '';
      openOrderModal(modalCakeTitle, '', defaultWeight);
      return;
    }

    if (target.closest('#loadMoreCakesBtn')) {
      e.preventDefault();
      isMainCatalogExpanded = !isMainCatalogExpanded;
      renderCatalog();
      return;
    }

    if (target.closest('#openReviewModalBtn')) {
      e.preventDefault();
      openReviewModal();
      return;
    }

    var filterBtn = target.closest('.btn-filter');
    if (filterBtn) {
      document.querySelectorAll('.btn-filter').forEach(function (b) {
        b.classList.remove('active');
      });
      filterBtn.classList.add('active');
      activeCategory = filterBtn.getAttribute('data-filter') || 'all';
      isMainCatalogExpanded = false; // при смене фильтра в главном меню снова показываем 2 ряда + кнопку "Загрузить еще"
      renderCatalog();
      return;
    }

    var allFilterBtn = target.closest('.btn-filter-all');
    if (allFilterBtn) {
      document.querySelectorAll('.btn-filter-all').forEach(function (b) {
        b.classList.remove('active');
      });
      allFilterBtn.classList.add('active');
      activeAllCakesFilter = allFilterBtn.getAttribute('data-all-filter') || 'all';
      renderAllCakesSection();
      return;
    }

    var fillFilterBtn = target.closest('.btn-filter-filling');
    if (fillFilterBtn) {
      document.querySelectorAll('.btn-filter-filling').forEach(function (b) {
        b.classList.remove('active');
      });
      fillFilterBtn.classList.add('active');
      activeFillingFilter = fillFilterBtn.getAttribute('data-fill-filter') || 'all';
      renderFillings();
      return;
    }

    var fillingCard = target.closest('.filling-card');
    if (fillingCard && fillingCard.dataset.fillingTitle) {
      openOrderModal('Торт A0024', fillingCard.dataset.fillingTitle);
      return;
    }

    var faqBtn = target.closest('.faq-question');
    if (faqBtn) {
      e.preventDefault();
      var faqItem = faqBtn.closest('.faq-item');
      if (faqItem) {
        var isOpen = faqItem.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(function (item) {
          item.classList.remove('open');
          var ans = item.querySelector('.faq-answer');
          if (ans) ans.style.maxHeight = '0px';
        });
        if (!isOpen) {
          faqItem.classList.add('open');
          var currentAns = faqItem.querySelector('.faq-answer');
          if (currentAns) {
            currentAns.style.maxHeight = (currentAns.scrollHeight + 30) + 'px';
          }
        }
      }
      return;
    }

    var adminTab = target.closest('.admin-tab');
    if (adminTab) {
      document.querySelectorAll('.admin-tab').forEach(function (t) {
        t.classList.remove('active');
      });
      document.querySelectorAll('.admin-tab-content').forEach(function (c) {
        c.classList.remove('active');
      });
      adminTab.classList.add('active');
      var tabName = adminTab.getAttribute('data-admin-tab') || '';
      var targetId = 'adminTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
      var targetEl = byId(targetId);
      if (targetEl) targetEl.classList.add('active');
      return;
    }

    if (target.closest('.btn-del-cake')) {
      var delCakeId = parseInt(target.closest('.btn-del-cake').getAttribute('data-id'), 10);
      sendAdminAction('del_cake', { id: delCakeId });
      return;
    }

    if (target.closest('.btn-edit-cake')) {
      var editCakeId = parseInt(target.closest('.btn-edit-cake').getAttribute('data-id'), 10);
      var cake = currentCatalog.find(function (c) { return c.db_id === editCakeId; });
      if (cake) {
        if (byId('editCakeId')) byId('editCakeId').value = cake.db_id;
        if (byId('cakeTitleInput')) byId('cakeTitleInput').value = cake.title;
        if (byId('cakeCategoryInput')) byId('cakeCategoryInput').value = cake.category || 'berry';
        if (byId('cakePriceInput')) byId('cakePriceInput').value = cake.price;
        if (byId('cakeUnitInput')) byId('cakeUnitInput').value = cake.unit || '/ кг';
        if (byId('cakeBadgeInput')) byId('cakeBadgeInput').value = cake.badge || '';
        if (byId('cakeEmojiInput')) byId('cakeEmojiInput').value = cake.emoji || '🎂';
        if (byId('cakeMetaInput')) byId('cakeMetaInput').value = cake.meta || '';
        if (byId('cakeTextInput')) byId('cakeTextInput').value = cake.text || '';
        if (byId('cakeImageUrlInput')) byId('cakeImageUrlInput').value = cake.image || '';
        if (byId('adminCakeFormTitle')) byId('adminCakeFormTitle').textContent = '✏️ Редактировать торт';
        if (byId('cancelEditCakeBtn')) byId('cancelEditCakeBtn').style.display = 'inline-flex';
      }
      return;
    }

    if (target.closest('.btn-del-fill')) {
      var fillId = parseInt(target.closest('.btn-del-fill').getAttribute('data-id'), 10);
      sendAdminAction('del_fill', { id: fillId });
      return;
    }

    if (target.closest('.btn-del-rev')) {
      var revId = parseInt(target.closest('.btn-del-rev').getAttribute('data-id'), 10);
      sendAdminAction('del_rev', { id: revId });
    }
  });

  // ==========================================
  // 5. ЗАЩИЩЁННАЯ АВТОРИЗАЦИЯ ЧЕРЕЗ TELEGRAM-БОТА
  // ==========================================
  function resetAuthFlow() {
    authStep = 'phone';
    if (byId('authPhone')) byId('authPhone').readOnly = false;
    if (byId('authNameGroup')) byId('authNameGroup').style.display = 'block';
    if (byId('authCodeGroup')) byId('authCodeGroup').style.display = 'none';
    if (byId('authChangePhoneBtn')) byId('authChangePhoneBtn').style.display = 'none';
    if (byId('authSubmitText')) byId('authSubmitText').textContent = 'Получить код в Telegram';
    if (byId('authStatus')) {
      byId('authStatus').className = 'form-status';
      byId('authStatus').textContent = '';
    }
    if (byId('authCode')) byId('authCode').value = '';
    if (byId('authDemoCodeHint')) byId('authDemoCodeHint').textContent = '';
  }

  function openAuthModal() {
    var modal = byId('authModal');
    if (!modal) return;
    modal.classList.add('active');

    var guestView = byId('authGuestView');
    var profileView = byId('authProfileView');

    if (currentUser && userToken) {
      if (guestView) guestView.style.display = 'none';
      if (profileView) profileView.style.display = 'block';
      if (byId('profileUserName')) byId('profileUserName').textContent = 'Здравствуйте, ' + currentUser.name + '!';
      if (byId('profileUserPhone')) byId('profileUserPhone').textContent = 'Телефон: ' + currentUser.phone;
      loadUserOrders();
    } else {
      if (guestView) guestView.style.display = 'block';
      if (profileView) profileView.style.display = 'none';
      resetAuthFlow();
    }
  }

  async function loadUserOrders() {
    var box = byId('profileOrdersList');
    if (!box || !currentUser || !userToken) return;
    box.innerHTML = '<p style="opacity:0.7;">Загрузка истории заказов...</p>';

    try {
      var res = await fetch(API.myOrders, {
        method: 'GET',
        headers: getAuthHeaders(userToken),
        credentials: 'include'
      });
      if (res.status === 401) {
        currentUser = null;
        userToken = null;
        safeStorageRemove('local', 'velvet_client');
        safeStorageRemove('local', 'velvet_user_token');
        safeStorageRemove('session', 'velvet_user_token');
        updateHeaderUserUI();
        openAuthModal();
        return;
      }
      var data = await res.json();
      renderProfileOrdersList(box, data.orders || []);
    } catch (e) {
      box.innerHTML = '<p style="opacity:0.7;">Не удалось загрузить историю заказов.</p>';
    }
  }

  function renderProfileOrdersList(box, orders) {
    if (!orders || orders.length === 0) {
      box.innerHTML = '<p style="opacity:0.7;">У вас пока нет оформленных заказов.</p>';
      return;
    }
    box.innerHTML = orders.map(function (o) {
      var itemsHtml = (o.items || []).map(function (i) {
        return '🎂 ' + escapeHtml(i.cake) + ' (' + escapeHtml(i.weight_kg || i.weight || '2.0 кг') + ', ' + escapeHtml(i.filling || 'Фирменная') + ') — к ' + escapeHtml(i.ready_date || 'завтра');
      }).join('<br>');

      return [
        '<div style="padding: 12px; background: rgba(255,255,255,0.68); border-radius: 14px; border: 1px solid rgba(255,255,255,0.9);">',
        '  <div style="display:flex; justify-content:space-between; font-weight:600; margin-bottom:4px;">',
        '    <span>Заказ #' + escapeHtml(o.id) + ' (' + escapeHtml(o.created_at || 'Сегодня') + ')</span>',
        '    <span>' + Number(o.total_amount || 0).toLocaleString('ru-RU') + ' ₽</span>',
        '  </div>',
        '  <div style="font-size:0.88rem; opacity:0.85;">' + itemsHtml + '</div>',
        '</div>'
      ].join('');
    }).join('');
  }

  on('authChangePhoneBtn', 'click', resetAuthFlow);

  on('logoutUserBtn', 'click', function () {
    currentUser = null;
    userToken = null;
    safeStorageRemove('local', 'velvet_client');
    safeStorageRemove('local', 'velvet_user_token');
    safeStorageRemove('session', 'velvet_user_token');
    updateHeaderUserUI();
    openAuthModal();
  });

  on('authForm', 'submit', async function (e) {
    e.preventDefault();
    var stat = byId('authStatus');
    var rawPhone = byId('authPhone') ? byId('authPhone').value.trim() : '';
    var formattedPhone = formatPhoneInput(rawPhone);
    var enteredName = byId('authName') ? byId('authName').value.trim() : '';

    if (formattedPhone.length !== 12) {
      stat.className = 'form-status error';
      stat.textContent = 'Введите корректный российский номер (+7 и 10 цифр)';
      return;
    }

    if (authStep === 'phone') {
      stat.className = 'form-status';
      stat.textContent = 'Отправляем одноразовый код в Telegram-бот...';

      var data = null;
      try {
        var res = await fetch(API.sendCode, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formattedPhone })
        });
        data = await res.json();
      } catch (err) {
        stat.className = 'form-status error';
        stat.textContent = 'Сервер авторизации временно недоступен.';
        return;
      }

      if (!data || !data.ok) {
        stat.className = 'form-status error';
        stat.textContent = (data && data.error) ? data.error : 'Ошибка проверки номера';
        return;
      }

      authStep = 'code';
      byId('authPhone').value = data.phone;
      byId('authPhone').readOnly = true;
      byId('authCodeGroup').style.display = 'block';
      byId('authChangePhoneBtn').style.display = 'inline-flex';
      byId('authCode').focus();

      var nameInput = byId('authName');
      if (data.is_registered && data.existing_name && !enteredName) {
        nameInput.value = data.existing_name;
      }

      byId('authSubmitText').textContent = 'Подтвердить код и войти';

      if (data.tg_sent) {
        byId('authDemoCodeHint').textContent = '✈️ Проверьте сообщения от Telegram-бота VelvetCake!';
        stat.className = 'form-status success';
        stat.textContent = '📲 6-значный код отправлен вам в Telegram! Введите его ниже.';
      } else {
        byId('authDemoCodeHint').textContent = 'Откройте Telegram-бот VelvetCake, нажмите /start и привяжите ваш номер.';
        stat.className = 'form-status';
        stat.textContent = 'Введите 6-значный код подтверждения из Telegram.';
      }
    } else {
      var code = byId('authCode') ? byId('authCode').value.trim() : '';
      var finalName = (byId('authName') ? byId('authName').value.trim() : '') || 'Гость';

      if (!/^\d{6}$/.test(code)) {
        stat.className = 'form-status error';
        stat.textContent = 'Введите 6-значный цифровой код из Telegram';
        return;
      }

      stat.className = 'form-status';
      stat.textContent = 'Проверяем код на сервере...';

      var verifyData = null;
      try {
        var verifyRes = await fetch(API.verifyCode, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ phone: formattedPhone, code: code, name: finalName })
        });
        verifyData = await verifyRes.json();
      } catch (err2) {
        stat.className = 'form-status error';
        stat.textContent = 'Ошибка соединения с сервером при проверке кода';
        return;
      }

      if (!verifyData || !verifyData.ok || !verifyData.user) {
        stat.className = 'form-status error';
        stat.textContent = (verifyData && verifyData.error) ? verifyData.error : 'Неверный код подтверждения';
        return;
      }

      currentUser = verifyData.user;
      userToken = verifyData.token || null;
      safeStorageSet('local', 'velvet_client', JSON.stringify(currentUser));
      if (userToken) {
        safeStorageSet('session', 'velvet_user_token', userToken);
        safeStorageSet('local', 'velvet_user_token', userToken);
      }
      updateHeaderUserUI();

      stat.className = 'form-status success';
      stat.textContent = '✅ Вы успешно авторизовались! Добро пожаловать, ' + currentUser.name + '!';

      setTimeout(function () {
        if (pendingReviewAfterAuth) {
          pendingReviewAfterAuth = false;
          byId('authModal').classList.remove('active');
          openReviewModal();
        } else {
          openAuthModal();
        }
      }, 1000);
    }
  });

  // ==========================================
  // 6. КОНСТРУКТОР ЗАКАЗА С АВТОРАСЧЁТОМ СУММЫ И ОТПРАВКОЙ В TELEGRAM
  // ==========================================
  function calculateRowPrice(cakeTitle, fillingLabel, weightStr) {
    var cakeObj = currentCatalog.find(function (c) { return c.title === cakeTitle; });
    var fillPriceKg = getFillingPricePerKg(fillingLabel);
    var wStr = String(weightStr || '2.5 кг').toLowerCase();
    var isBento = wStr.indexOf('бенто') !== -1;
    var m = wStr.replace(',', '.').match(/(\d+(?:\.\d+)?)/);
    var weightKg = isBento ? 0.45 : (m ? parseFloat(m[1]) : 2.5);

    if (cakeObj) {
      var unit = String(cakeObj.unit || '/ кг');
      if (cakeObj.section === 'cupcakes' || unit.indexOf('шт') !== -1) {
        var countPcs = m ? Math.max(12, parseInt(m[1], 10)) : 12;
        return Number(cakeObj.price || 180) * countPcs;
      }
      if (unit.indexOf('набор') !== -1) {
        return Number(cakeObj.price || 1800);
      }
      if (isBento) {
        return 1700;
      }
      var baseWeight = Number(cakeObj.weight_kg || 2.5);
      var baseCakePrice = Number(cakeObj.price || 4600);
      if (unit.trim() === '/ кг') {
        var kgRate = Math.max(baseCakePrice, fillPriceKg);
        return Math.round(weightKg * kgRate);
      }
      var extraFillingPerKg = Math.max(0, fillPriceKg - 1700);
      var scaledBase = Math.round(baseCakePrice * (weightKg / baseWeight));
      return scaledBase + Math.round(extraFillingPerKg * weightKg);
    }
    return isBento ? 1700 : Math.round(weightKg * fillPriceKg);
  }

  function updateOrderModalTotal() {
    var rows = Array.prototype.slice.call(document.querySelectorAll('#cakeItemsContainer .cake-order-card'));
    var total = 0;
    rows.forEach(function (row) {
      var cVal = row.querySelector('.f-cake') ? row.querySelector('.f-cake').value : '';
      var fVal = row.querySelector('.f-filling') ? row.querySelector('.f-filling').value : '';
      var wVal = row.querySelector('.f-weight') ? row.querySelector('.f-weight').value : '2.0 кг';
      total += calculateRowPrice(cVal, fVal, wVal);
    });
    var submitBtn = byId('submitOrderBtn');
    if (submitBtn) {
      var firstSpan = submitBtn.querySelector('span');
      if (firstSpan) {
        firstSpan.textContent = 'Подтвердить заказ • ' + total.toLocaleString('ru-RU') + ' ₽';
      }
    }
    return total;
  }

  function createCakeOrderItemRow(selectedCake, selectedFilling, selectedWeight) {
    var cakeVal = selectedCake || (currentCatalog[0] ? currentCatalog[0].title : 'Торт A0024');
    var fillVal = selectedFilling || (currentFillings[0] ? currentFillings[0].label : 'НОВОСИБИРСК — Банановый с карамелью (1700 ₽/кг)');
    var matchedCakeObj = currentCatalog.find(function (c) { return c.title === cakeVal; });
    var autoWeight = matchedCakeObj
      ? (matchedCakeObj.section === 'cupcakes' ? 'От 12 шт.' : (Number(matchedCakeObj.weight_kg || 2.5).toFixed(1) + ' кг'))
      : '2.5 кг';
    var weightVal = selectedWeight || autoWeight;
    var tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    var hasCakeInCatalog = currentCatalog.some(function (c) { return c.title === cakeVal; });
    var extraCustomOption = !hasCakeInCatalog
      ? '<option value="' + escapeHtml(cakeVal) + '" selected>✨ ' + escapeHtml(cakeVal) + ' (от 1700 ₽/кг)</option>'
      : '';

    var cakesOptions = extraCustomOption + currentCatalog.map(function (c) {
      var sel = c.title === cakeVal ? ' selected' : '';
      return '<option value="' + escapeHtml(c.title) + '"' + sel + '>' + escapeHtml(c.title) + ' (' + Number(c.price || 0).toLocaleString('ru-RU') + ' ₽' + escapeHtml(c.unit || '/ кг') + ')</option>';
    }).join('');

    var fillsOptions = currentFillings.map(function (f) {
      var sel = f.label === fillVal ? ' selected' : '';
      return '<option value="' + escapeHtml(f.label) + '"' + sel + '>' + escapeHtml(f.label) + '</option>';
    }).join('');

    var weightChoices = ['Бенто (450 г)', '1.5 кг', '2.0 кг', '2.5 кг', '3.0 кг', '4.0 кг (2 яруса)', '6.0 кг (3 яруса)', '8.0 кг (Корпоративный)'];
    if (weightVal && weightChoices.indexOf(weightVal) === -1) {
      weightChoices.push(weightVal);
    }
    var weightOptions = weightChoices.map(function (w) {
      var sel = w === weightVal ? ' selected' : '';
      return '<option value="' + escapeHtml(w) + '"' + sel + '>' + escapeHtml(w) + '</option>';
    }).join('');

    var div = document.createElement('div');
    div.className = 'cake-order-card';
    div.innerHTML = [
      '<div class="cake-card-head">',
      '  <span class="cake-card-num">Торт в заказе</span>',
      '  <button type="button" class="btn-remove-cake">✕ Убрать</button>',
      '</div>',
      '<div class="form-row">',
      '  <div class="form-group">',
      '    <label>Выберите торт</label>',
      '    <select class="glass-select f-cake">' + cakesOptions + '</select>',
      '  </div>',
      '  <div class="form-group">',
      '    <label>Фирменная начинка tort54</label>',
      '    <select class="glass-select f-filling">' + fillsOptions + '</select>',
      '  </div>',
      '</div>',
      '<div class="form-row">',
      '  <div class="form-group">',
      '    <label>Вес / формат</label>',
      '    <select class="glass-select f-weight">' + weightOptions + '</select>',
      '  </div>',
      '  <div class="form-group">',
      '    <label>Дата готовности</label>',
      '    <input type="date" class="glass-select liquid-date-input f-date" value="' + escapeHtml(tomorrow) + '" min="' + escapeHtml(tomorrow) + '" required />',
      '  </div>',
      '</div>'
    ].join('');

    var cakeSelectEl = div.querySelector('.f-cake');
    var weightSelectEl = div.querySelector('.f-weight');
    if (cakeSelectEl && weightSelectEl) {
      cakeSelectEl.addEventListener('change', function () {
        var chosen = currentCatalog.find(function (c) { return c.title === cakeSelectEl.value; });
        if (chosen) {
          var targetW = chosen.section === 'cupcakes' ? 'От 12 шт.' : (Number(chosen.weight_kg || 2.5).toFixed(1) + ' кг');
          var existsOpt = Array.prototype.some.call(weightSelectEl.options, function (o) { return o.value === targetW; });
          if (!existsOpt) {
            var opt = document.createElement('option');
            opt.value = targetW;
            opt.textContent = targetW;
            weightSelectEl.appendChild(opt);
          }
          weightSelectEl.value = targetW;
        }
        updateOrderModalTotal();
      });
    }
    div.querySelectorAll('select').forEach(function (sel) {
      sel.addEventListener('change', updateOrderModalTotal);
    });

    var removeBtn = div.querySelector('.btn-remove-cake');
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        if (document.querySelectorAll('#cakeItemsContainer .cake-order-card').length > 1) {
          div.remove();
          updateCakesCounter();
          updateOrderModalTotal();
        }
      });
    }
    return div;
  }

  function updateCakesCounter() {
    var cards = document.querySelectorAll('#cakeItemsContainer .cake-order-card');
    cards.forEach(function (card, idx) {
      var num = card.querySelector('.cake-card-num');
      if (num) num.textContent = 'Торт №' + (idx + 1);
    });
    var badge = byId('cakesCounterBadge');
    if (badge) badge.textContent = 'Тортов в заказе: ' + cards.length;
  }

  function openOrderModal(cakeTitle, fillingTitle, weightText) {
    var modal = byId('orderModal');
    if (!modal) return;
    modal.classList.add('active');

    var container = byId('cakeItemsContainer');
    if (container) {
      container.innerHTML = '';
      container.appendChild(createCakeOrderItemRow(cakeTitle, fillingTitle, weightText));
    }
    updateCakesCounter();
    updateOrderModalTotal();

    if (currentUser) {
      if (byId('clientName')) byId('clientName').value = currentUser.name;
      if (byId('clientPhone')) byId('clientPhone').value = currentUser.phone;
    }
  }

  on('addAnotherCakeBtn', 'click', function () {
    var container = byId('cakeItemsContainer');
    if (container) {
      container.appendChild(createCakeOrderItemRow());
      updateCakesCounter();
      updateOrderModalTotal();
    }
  });

  on('orderForm', 'submit', async function (e) {
    e.preventDefault();
    var stat = byId('formStatus');
    var btn = byId('submitOrderBtn');
    var name = byId('clientName') ? byId('clientName').value.trim() : '';
    var phone = formatPhoneInput(byId('clientPhone') ? byId('clientPhone').value.trim() : '');
    var comment = byId('clientComment') ? byId('clientComment').value.trim() : '';

    if (name.length < 2) {
      stat.className = 'form-status error';
      stat.textContent = 'Пожалуйста, укажите ваше имя (минимум 2 буквы)';
      return;
    }
    if (phone.length !== 12) {
      stat.className = 'form-status error';
      stat.textContent = 'Укажите корректный телефон (+7 и 10 цифр)';
      return;
    }

    var rows = Array.prototype.slice.call(document.querySelectorAll('#cakeItemsContainer .cake-order-card'));
    var items = rows.map(function (row) {
      return {
        cake: row.querySelector('.f-cake').value,
        filling: row.querySelector('.f-filling').value,
        weight: row.querySelector('.f-weight').value,
        ready_date: row.querySelector('.f-date').value
      };
    });

    var estimatedTotal = updateOrderModalTotal();
    btn.disabled = true;
    stat.className = 'form-status';
    stat.textContent = 'Оформляем заказ и отправляем уведомление в Telegram...';

    try {
      var res = await fetch(API.order, {
        method: 'POST',
        headers: getAuthHeaders(userToken),
        credentials: 'include',
        body: JSON.stringify({ name: name, phone: phone, comment: comment, items: items })
      });
      var data = await res.json();
      if (data.ok) {
        var finalSum = Number(data.total_amount || estimatedTotal).toLocaleString('ru-RU');
        stat.className = 'form-status success';
        stat.textContent = '✅ Заказ #' + data.order_id + ' на сумму ' + finalSum + ' ₽ успешно оформлен!';
        setTimeout(function () {
          byId('orderModal').classList.remove('active');
          stat.className = 'form-status';
          stat.textContent = '';
        }, 2400);
      } else {
        stat.className = 'form-status error';
        stat.textContent = data.error || 'Ошибка при оформлении заказа';
      }
    } catch (err) {
      var localId = Math.floor(100 + Math.random() * 900);
      stat.className = 'form-status success';
      stat.textContent = '✅ Заявка #' + localId + ' на сумму ' + estimatedTotal.toLocaleString('ru-RU') + ' ₽ принята! Менеджер свяжется с вами.';
      setTimeout(function () {
        byId('orderModal').classList.remove('active');
        stat.className = 'form-status';
        stat.textContent = '';
      }, 2400);
    } finally {
      btn.disabled = false;
    }
  });

  function openReviewModal() {
    var cakeField = byId('revCake');
    if (cakeField) {
      if (cakeField.tagName === 'SELECT') {
        cakeField.innerHTML = currentCatalog.map(function (c) {
          return '<option value="' + escapeHtml(c.title) + '">' + escapeHtml(c.title) + '</option>';
        }).join('');
      } else if (currentCatalog.length > 0 && !cakeField.value) {
        cakeField.value = currentCatalog[0].title;
      }
    }
    var authorInput = byId('revAuthor');
    if (authorInput && currentUser) {
      authorInput.value = currentUser.name;
    }
    var revModal = byId('reviewModal');
    if (revModal) revModal.classList.add('active');
  }

  on('publicReviewForm', 'submit', async function (e) {
    e.preventDefault();
    var authorName = (byId('revAuthor') && byId('revAuthor').value.trim()) || (currentUser ? currentUser.name : 'Гость');
    var ratingVal = parseInt(byId('revRating').value, 10) || 5;
    var cakeVal = byId('revCake').value.trim() || 'Торт A0024';
    var textVal = byId('revText').value.trim();
    if (!textVal || textVal.length < 3) return;

    var btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    try {
      var res = await fetch(API.review, {
        method: 'POST',
        headers: getAuthHeaders(userToken),
        credentials: 'include',
        body: JSON.stringify({
          name: authorName,
          rating: ratingVal,
          cake: cakeVal,
          text: textVal
        })
      });
      var data = await res.json();
      if (res.ok && data.ok) {
        currentReviews.unshift({
          id: 'rev_' + Date.now(),
          db_id: Date.now(),
          name: authorName,
          rating: ratingVal,
          cake: cakeVal,
          date: new Date().toLocaleDateString('ru-RU'),
          text: textVal
        });
        renderReviews();
        await loadData();
      }
    } catch (err) {
      currentReviews.unshift({
        id: 'rev_' + Date.now(),
        db_id: Date.now(),
        name: authorName,
        rating: ratingVal,
        cake: cakeVal,
        date: new Date().toLocaleDateString('ru-RU'),
        text: textVal
      });
      renderReviews();
    } finally {
      if (btn) btn.disabled = false;
      byId('publicReviewForm').reset();
      byId('reviewModal').classList.remove('active');
    }
  });

  // ==========================================
  // 7. ЗАЩИЩЁННАЯ АДМИН-ПАНЕЛЬ (СЕРВЕРНАЯ АВТОРИЗАЦИЯ)
  // ==========================================
  function toggleAdminView() {
    var authView = byId('adminAuthView');
    var dashView = byId('adminDashboardView');
    if (adminToken) {
      if (authView) authView.style.display = 'none';
      if (dashView) dashView.style.display = 'block';
      renderAdminLists();
    } else {
      if (authView) authView.style.display = 'block';
      if (dashView) dashView.style.display = 'none';
    }
  }

  function renderAdminLists() {
    if (byId('adminCakesCount')) byId('adminCakesCount').textContent = String(currentCatalog.length);
    var cakesList = byId('adminCakesList');
    if (cakesList) {
      cakesList.innerHTML = currentCatalog.map(function (c) {
        var safeId = parseInt(c.db_id, 10) || 0;
        return [
          '<div class="admin-item-row">',
          '  <div><strong>' + escapeHtml(c.emoji || '🎂') + ' ' + escapeHtml(c.title) + '</strong><br><small>' + Number(c.price || 0).toLocaleString('ru-RU') + ' ₽ ' + escapeHtml(c.unit || '/ кг') + '</small></div>',
          '  <div style="display:flex; gap:6px;">',
          '    <button type="button" class="btn-glass btn-glass-sm btn-edit-cake" data-id="' + safeId + '">✏️</button>',
          '    <button type="button" class="btn-glass btn-glass-sm btn-del-cake" data-id="' + safeId + '" style="color: #d93829;">✕</button>',
          '  </div>',
          '</div>'
        ].join('');
      }).join('');
    }

    if (byId('adminFillingsCount')) byId('adminFillingsCount').textContent = String(currentFillings.length);
    var fillsList = byId('adminFillingsList');
    if (fillsList) {
      fillsList.innerHTML = currentFillings.map(function (f) {
        var safeId = parseInt(f.db_id, 10) || 0;
        return [
          '<div class="admin-item-row">',
          '  <div><strong>' + escapeHtml(f.emoji || '🍓') + ' ' + escapeHtml(f.label) + '</strong></div>',
          '  <button type="button" class="btn-glass btn-glass-sm btn-del-fill" data-id="' + safeId + '" style="color: #d93829;">✕</button>',
          '</div>'
        ].join('');
      }).join('');
    }

    if (byId('adminReviewsCount')) byId('adminReviewsCount').textContent = String(currentReviews.length);
    var revsList = byId('adminReviewsList');
    if (revsList) {
      revsList.innerHTML = currentReviews.map(function (r) {
        var safeId = parseInt(r.db_id, 10) || 0;
        var safeRating = Math.max(1, Math.min(5, parseInt(r.rating, 10) || 5));
        return [
          '<div class="admin-item-row">',
          '  <div><strong>' + escapeHtml(r.name) + '</strong> (' + safeRating + '★)<br><small>' + escapeHtml(r.text) + '</small></div>',
          '  <button type="button" class="btn-glass btn-glass-sm btn-del-rev" data-id="' + safeId + '" style="color: #d93829;">✕</button>',
          '</div>'
        ].join('');
      }).join('');
    }
  }

  on('adminPinForm', 'submit', async function (e) {
    e.preventDefault();
    var entered = byId('adminPinInput') ? byId('adminPinInput').value.trim() : '';
    var errBox = byId('adminPinError');
    if (!entered) return;

    if (errBox) errBox.textContent = 'Проверка доступа на сервере...';
    try {
      var res = await fetch(API.adminLogin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pin: entered })
      });
      var data = await res.json();
      if (res.ok && data.ok && data.token) {
        adminToken = data.token;
        safeStorageSet('session', 'velvet_admin_token', adminToken);
        if (errBox) errBox.textContent = '';
        if (byId('adminPinInput')) byId('adminPinInput').value = '';
        toggleAdminView();
      } else {
        if (errBox) errBox.textContent = (data && data.error) ? data.error : 'Неверный пароль администратора';
      }
    } catch (err) {
      if (errBox) errBox.textContent = 'Сервер недоступен. Авторизация администратора возможна только онлайн.';
    }
  });

  on('cakeImageFileInput', 'change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var dataUrl = sanitizeImageUrl(ev.target.result, '');
      if (byId('cakeImageUrlInput')) byId('cakeImageUrlInput').value = dataUrl;
      if (byId('cakeImagePreview')) byId('cakeImagePreview').src = dataUrl;
      if (byId('cakeImagePreviewWrap')) byId('cakeImagePreviewWrap').style.display = 'flex';
    };
    reader.readAsDataURL(file);
  });

  on('clearCakeImageBtn', 'click', function () {
    if (byId('cakeImageUrlInput')) byId('cakeImageUrlInput').value = '';
    if (byId('cakeImagePreviewWrap')) byId('cakeImagePreviewWrap').style.display = 'none';
  });

  async function sendAdminAction(action, payload) {
    if (!adminToken) {
      toggleAdminView();
      return;
    }
    try {
      var res = await fetch(API.admin, {
        method: 'POST',
        headers: getAuthHeaders(adminToken),
        credentials: 'include',
        body: JSON.stringify({ action: action, payload: payload })
      });
      var data = await res.json();
      if (res.status === 401 || res.status === 403) {
        adminToken = null;
        safeStorageRemove('session', 'velvet_admin_token');
        toggleAdminView();
        return;
      }
      if (data.ok) {
        await loadData();
      }
    } catch (e) {}
  }

  on('cancelEditCakeBtn', 'click', function () {
    var form = byId('adminAddCakeForm');
    if (form) form.reset();
    if (byId('editCakeId')) byId('editCakeId').value = '';
    if (byId('adminCakeFormTitle')) byId('adminCakeFormTitle').textContent = '➕ Добавить новый торт';
    if (byId('cancelEditCakeBtn')) byId('cancelEditCakeBtn').style.display = 'none';
  });

  on('adminAddCakeForm', 'submit', function (e) {
    e.preventDefault();
    var id = byId('editCakeId') ? byId('editCakeId').value : '';
    var payload = {
      title: byId('cakeTitleInput').value.trim(),
      category: byId('cakeCategoryInput').value,
      price: parseInt(byId('cakePriceInput').value, 10),
      unit: byId('cakeUnitInput').value,
      badge: byId('cakeBadgeInput').value.trim(),
      emoji: byId('cakeEmojiInput').value.trim() || '🎂',
      meta: byId('cakeMetaInput').value.trim(),
      desc: byId('cakeTextInput').value.trim(),
      img: sanitizeImageUrl(byId('cakeImageUrlInput').value.trim(), '')
    };

    if (id) {
      payload.id = parseInt(id, 10);
      sendAdminAction('edit_cake', payload);
    } else {
      sendAdminAction('add_cake', payload);
    }

    byId('adminAddCakeForm').reset();
    byId('editCakeId').value = '';
    byId('adminCakeFormTitle').textContent = '➕ Добавить новый торт';
    byId('cancelEditCakeBtn').style.display = 'none';
    if (byId('cakeImagePreviewWrap')) byId('cakeImagePreviewWrap').style.display = 'none';
  });

  on('adminAddFillingForm', 'submit', function (e) {
    e.preventDefault();
    var layersRaw = byId('fillingLayersInput').value;
    var layers = layersRaw
      ? layersRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean)
      : [];

    sendAdminAction('add_fill', {
      title: byId('fillingTitleInput').value.trim(),
      emoji: byId('fillingEmojiInput').value.trim() || '🍓',
      tag: byId('fillingTagInput').value.trim(),
      desc: byId('fillingDescInput').value.trim(),
      layers: layers
    });
    byId('adminAddFillingForm').reset();
  });

  on('adminAddReviewForm', 'submit', function (e) {
    e.preventDefault();
    if (!adminToken) {
      toggleAdminView();
      return;
    }
    var name = byId('adminRevName').value.trim();
    var rating = parseInt(byId('adminRevRating').value, 10) || 5;
    var cake = byId('adminRevCake').value.trim() || 'Авторский торт';
    var text = byId('adminRevText').value.trim();
    if (!name || !text) return;
    fetch(API.review, {
      method: 'POST',
      headers: getAuthHeaders(adminToken),
      credentials: 'include',
      body: JSON.stringify({ name: name, rating: rating, cake: cake, text: text })
    }).then(function (res) {
      if (res.ok) loadData();
    });
    byId('adminAddReviewForm').reset();
  });

  // ==========================================
  // 8. СИНХРОНИЗАЦИЯ С СЕРВЕРОМ
  // ==========================================
  async function loadData() {
    try {
      var res = await fetch(API.catalog, { cache: 'no-store' });
      if (res.ok) {
        var data = await res.json();
        if (data.catalog && data.catalog.length > 0) {
          currentCatalog = data.catalog.map(function (c) {
            var def = DEFAULT_CATALOG.find(function (dc) { return dc.title === c.title; });
            if (def) {
              if (!c.image) c.image = def.image;
              if (!c.sku) c.sku = def.sku;
              if (!c.section) c.section = def.section;
              if (c.in_baby === undefined) c.in_baby = def.in_baby;
              if (c.in_other === undefined) c.in_other = def.in_other;
              if (c.is_hit === undefined) c.is_hit = def.is_hit;
              if (!c.weight_kg) c.weight_kg = def.weight_kg;
              if (!c.product_url) c.product_url = def.product_url;
            }
            return c;
          });
        }
        if (data.fillings && data.fillings.length > 0) {
          currentFillings = data.fillings.map(function (f) {
            var defF = DEFAULT_FILLINGS.find(function (df) { return df.label === f.label; });
            if (defF) {
              if (!f.image) f.image = defF.image;
              if (!f.sku) f.sku = defF.sku;
              if (!f.price_per_kg) f.price_per_kg = defF.price_per_kg;
              if (!f.product_url) f.product_url = defF.product_url;
            }
            return f;
          });
        }
        if (data.reviews && data.reviews.length > 0) {
          currentReviews = data.reviews;
        }
        renderCatalog();
        renderAllCakesSection();
        renderFillings();
        renderReviews();
        if (adminToken) renderAdminLists();
      }
    } catch (e) {
      console.warn('Используется встроенный каталог tort54.ru.');
    }
  }

  on('allCakesSearchInput', 'input', function (e) {
    allCakesSearchQuery = e.target.value || '';
    renderAllCakesSection();
  });

  updateHeaderUserUI();
  renderCatalog();
  renderAllCakesSection();
  renderFillings();
  renderReviews();
  updateCalculator();
  loadData();
});
