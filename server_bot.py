import asyncio
import base64
import hashlib
import hmac
import html
import http.client
import json
import os
import re
import secrets
import socket
import ssl
import struct
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, Optional, Tuple, cast

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from aiogram import Bot, Dispatcher, F, types
from aiogram.client.session.base import BaseSession
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.methods import TelegramMethod
from aiogram.methods.base import TelegramType
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup

import db_postgres

BASE_DIR = Path(__file__).resolve().parent
CHATS_FILE = BASE_DIR / "tg_chats.json"
_chats_lock = asyncio.Lock()

# =====================================================================
# БЕЗОПАСНАЯ КОНФИГУРАЦИЯ ЧЕРЕЗ ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ (.env)
# =====================================================================
BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "").strip()
ADMIN_PIN_ENV = os.getenv("ADMIN_PIN", "").strip()
BOT_USERNAME = ""

# Список разрешённых Telegram ID администраторов (через запятую в ADMIN_CHAT_IDS или ADMIN_CHAT_ID)
_raw_admin_ids = os.getenv("ADMIN_CHAT_IDS", os.getenv("ADMIN_CHAT_ID", "1334919358"))
ADMIN_CHAT_IDS = {int(x.strip()) for x in _raw_admin_ids.split(",") if x.strip().isdigit()}

# Разрешённые домены для CORS
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://127.0.0.1:7860,http://localhost:7860")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]


# =====================================================================
# ЗАЩИТА ОТ ПЕРЕБОРА (RATE LIMITER) И КРИПТОГРАФИЧЕСКИЕ СЕССИИ (HMAC)
# =====================================================================
_rate_buckets: Dict[str, list[float]] = defaultdict(list)


def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> bool:
    """Возвращает True, если лимит запросов не превышен; иначе False."""
    now = time.time()
    bucket = _rate_buckets[key]
    cutoff = now - window_seconds
    while bucket and bucket[0] < cutoff:
        bucket.pop(0)
    if len(bucket) >= max_requests:
        return False
    bucket.append(now)
    return True


def create_session_token(payload: dict, ttl_seconds: int = 86400) -> str:
    """Создаёт криптографически подписанный токен сессии (HMAC-SHA256)."""
    data = dict(payload)
    data["exp"] = int(time.time()) + ttl_seconds
    data["jti"] = secrets.token_hex(8)
    raw_json = json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    b64_body = base64.urlsafe_b64encode(raw_json).decode("ascii").rstrip("=")
    sig = hmac.new(db_postgres.SECRET_KEY, b64_body.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{b64_body}.{sig}"


def verify_session_token(token: str) -> Optional[dict]:
    """Проверяет подпись и срок действия токена сессии."""
    if not token or "." not in token:
        return None
    try:
        b64_body, sig = token.rsplit(".", 1)
        expected_sig = hmac.new(db_postgres.SECRET_KEY, b64_body.encode("ascii"), hashlib.sha256).hexdigest()
        if not secrets.compare_digest(sig, expected_sig):
            return None
        padding = "=" * (-len(b64_body) % 4)
        data = json.loads(base64.urlsafe_b64decode(b64_body + padding).decode("utf-8"))
        if int(data.get("exp", 0)) < int(time.time()):
            return None
        return data
    except Exception:
        return None


def extract_token_from_request(request: Request, cookie_name: str = "velvet_session") -> Optional[dict]:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        tok = auth_header[7:].strip()
        verified = verify_session_token(tok)
        if verified:
            return verified
    cookie_tok = request.cookies.get(cookie_name)
    if cookie_tok:
        return verify_session_token(cookie_tok)
    return None


def verify_admin_credentials(entered_secret: str) -> bool:
    """Проверяет пароль/PIN администратора с защитой от атак по времени."""
    if not entered_secret:
        return False
    if ADMIN_PASSWORD_HASH:
        return db_postgres.verify_password(entered_secret, ADMIN_PASSWORD_HASH)
    if ADMIN_PIN_ENV:
        return secrets.compare_digest(entered_secret, ADMIN_PIN_ENV)
    return False


def is_admin_tg_user(user_id: Optional[int]) -> bool:
    return bool(user_id and int(user_id) in ADMIN_CHAT_IDS)


# =====================================================================
# БЕЗОПАСНЫЙ ТУННЕЛЬ TELEGRAM ЧЕРЕЗ ЯВНО ЗАДАННЫЙ ПРОКСИ (БЕЗ СКАНИРОВАНИЯ ПОРТОВ)
# =====================================================================
_WORKING_TUNNEL: Optional[Tuple[str, str, int]] = None


def _extract_host_port_candidates() -> list[Tuple[str, int]]:
    candidates: list[Tuple[str, int]] = []

    def add_candidate(host: str, port: int):
        if port in (7860, 5432) or not (1 <= port <= 65535):
            return
        item = (host, port)
        if item not in candidates:
            candidates.append(item)

    def parse_proxy_str(val: str):
        if not val:
            return
        for m in re.finditer(r"(?:([\w.-]+):(\d{2,5}))", str(val)):
            h, p = m.group(1), int(m.group(2))
            if h in ("http", "https", "socks", "socks5", "socks5h", "socks4"):
                continue
            add_candidate(h, p)

    if os.name == "nt":
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Internet Settings") as k:
                val, _ = winreg.QueryValueEx(k, "ProxyServer")
                parse_proxy_str(val)
        except Exception:
            pass

    for env_name in ("ALL_PROXY", "HTTPS_PROXY", "HTTP_PROXY", "SOCKS_PROXY", "all_proxy", "https_proxy", "http_proxy"):
        parse_proxy_str(os.environ.get(env_name, ""))

    # Стандартные локальные порты VPN-клиентов (v2rayN, Nekoray, Hiddify, Clash, Amnezia)
    for p in (10808, 10809, 2080, 2081, 12334, 7890, 7891, 7897, 1080, 1081, 8080):
        add_candidate("127.0.0.1", p)

    return candidates


def _open_socks5_socket(proxy_host: str, proxy_port: int, target_host: str, target_port: int, timeout: float) -> socket.socket:
    sock = socket.create_connection((proxy_host, proxy_port), timeout=timeout)
    sock.settimeout(timeout)
    sock.sendall(b"\x05\x01\x00")
    auth = sock.recv(2)
    if len(auth) < 2 or auth[0] != 0x05 or auth[1] != 0x00:
        sock.close()
        raise OSError("SOCKS5 handshake rejected")

    host_bytes = target_host.encode("idna")
    req = b"\x05\x01\x00\x03" + bytes([len(host_bytes)]) + host_bytes + struct.pack(">H", target_port)
    sock.sendall(req)

    resp = sock.recv(4)
    if len(resp) < 4 or resp[1] != 0x00:
        sock.close()
        raise OSError("SOCKS5 connect failed")

    atyp = resp[3]
    if atyp == 1:
        sock.recv(4 + 2)
    elif atyp == 3:
        ln = sock.recv(1)[0]
        sock.recv(ln + 2)
    elif atyp == 4:
        sock.recv(16 + 2)
    return sock


def _open_http_connect_socket(proxy_host: str, proxy_port: int, target_host: str, target_port: int, timeout: float) -> socket.socket:
    sock = socket.create_connection((proxy_host, proxy_port), timeout=timeout)
    sock.settimeout(timeout)
    req = (
        f"CONNECT {target_host}:{target_port} HTTP/1.1\r\n"
        f"Host: {target_host}:{target_port}\r\n"
        f"Proxy-Connection: Keep-Alive\r\n\r\n"
    ).encode("ascii")
    sock.sendall(req)

    buf = b""
    while b"\r\n\r\n" not in buf and len(buf) < 8192:
        chunk = sock.recv(1024)
        if not chunk:
            break
        buf += chunk
    first_line = buf.split(b"\r\n", 1)[0].decode("latin1", errors="ignore")
    if "200" not in first_line:
        sock.close()
        raise OSError(f"HTTP CONNECT rejected: {first_line}")
    return sock


def _create_telegram_ssl_socket(timeout: float = 15.0) -> ssl.SSLSocket:
    global _WORKING_TUNNEL
    ssl_ctx = ssl.create_default_context()
    target_host = "api.telegram.org"
    target_port = 443

    def try_tunnel(kind: str, h: str, p: int, t_out: float) -> ssl.SSLSocket:
        if kind == "socks5":
            raw = _open_socks5_socket(h, p, target_host, target_port, t_out)
        elif kind == "http":
            raw = _open_http_connect_socket(h, p, target_host, target_port, t_out)
        else:
            raw = socket.create_connection((target_host, target_port), timeout=t_out)
            raw.settimeout(t_out)
        return ssl_ctx.wrap_socket(raw, server_hostname=target_host)

    if _WORKING_TUNNEL is not None:
        kind, h, p = _WORKING_TUNNEL
        try:
            return try_tunnel(kind, h, p, timeout)
        except Exception:
            _WORKING_TUNNEL = None

    for h, p in _extract_host_port_candidates():
        for kind in ("socks5", "http"):
            try:
                ssl_sock = try_tunnel(kind, h, p, 3.5)
                _WORKING_TUNNEL = (kind, h, p)
                ssl_sock.settimeout(timeout)
                return ssl_sock
            except Exception:
                continue

    ssl_sock = try_tunnel("direct", "", 0, 4.0)
    _WORKING_TUNNEL = ("direct", "", 0)
    ssl_sock.settimeout(timeout)
    return ssl_sock


class ProxySmartSession(BaseSession):
    async def close(self) -> None:
        pass

    async def stream_content(
        self, url: str, headers: Optional[Dict[str, Any]] = None,
        timeout: int = 30, chunk_size: int = 65536, raise_for_status: bool = True
    ) -> AsyncGenerator[bytes, None]:
        yield b""

    def _serialize_method(self, bot: Bot, method: TelegramMethod[Any]) -> bytes:
        files: Dict[str, Any] = {}
        payload: Dict[str, Any] = {}
        for k, v in method.model_dump(warnings=False).items():
            if v is None or type(v).__name__ == "Sentinel" or str(v) == "UNSET":
                continue
            try:
                prep = self.prepare_value(v, bot=bot, files=files, _dumps_json=False)
            except Exception:
                prep = v
            if prep is not None and type(prep).__name__ != "Sentinel" and str(prep) != "UNSET":
                payload[k] = prep
        return json.dumps(payload, ensure_ascii=False).encode("utf-8")

    def _sync_request(self, bot_token: str, api_method: str, body: bytes, req_timeout: float) -> Tuple[int, str]:
        ssl_sock = _create_telegram_ssl_socket(timeout=req_timeout)
        conn = http.client.HTTPSConnection("api.telegram.org", 443, timeout=req_timeout)
        conn.sock = ssl_sock
        headers = {
            "Host": "api.telegram.org",
            "Content-Type": "application/json",
            "Content-Length": str(len(body)),
            "Connection": "close",
        }
        try:
            conn.request("POST", f"/bot{bot_token}/{api_method}", body=body, headers=headers)
            resp = conn.getresponse()
            status = resp.status
            data = resp.read().decode("utf-8", errors="replace")
            return status, data
        finally:
            try:
                conn.close()
            except Exception:
                pass

    async def make_request(
        self, bot: Bot, method: TelegramMethod[TelegramType], timeout: Optional[int] = None
    ) -> TelegramType:
        body = self._serialize_method(bot, method)
        is_poll = method.__api_method__ == "getUpdates"
        req_timeout = 35.0 if is_poll else 15.0
        status_code, raw_text = await asyncio.to_thread(
            self._sync_request, bot.token, method.__api_method__, body, req_timeout
        )
        response = self.check_response(
            bot=bot, method=method, status_code=status_code, content=raw_text
        )
        return cast(TelegramType, response.result)


bot: Optional[Bot] = Bot(token=BOT_TOKEN, session=ProxySmartSession()) if BOT_TOKEN else None
dp = Dispatcher()


def _load_chats_store() -> dict:
    """Хранит привязку phone -> chat_id для адресной доставки OTP-кодов."""
    store = {"admin_chats": list(ADMIN_CHAT_IDS), "phone_chats": {}}
    if CHATS_FILE.exists():
        try:
            raw = json.loads(CHATS_FILE.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                store["admin_chats"] = list(set(ADMIN_CHAT_IDS).union(int(x) for x in raw.get("admin_chats", [])))
                store["phone_chats"] = {str(k): int(v) for k, v in raw.get("phone_chats", {}).items()}
        except Exception:
            pass
    return store


async def bind_phone_to_chat(phone: str, chat_id: int):
    norm = db_postgres.normalize_phone(phone)
    if not norm:
        return
    async with _chats_lock:
        store = _load_chats_store()
        store["phone_chats"][norm] = int(chat_id)
        tmp = CHATS_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(tmp, CHATS_FILE)


async def send_to_admins(text: str) -> bool:
    """Отправляет уведомления о заказах ТОЛЬКО верифицированным администраторам."""
    if not bot:
        return False
    sent_any = False
    for chat_id in ADMIN_CHAT_IDS:
        try:
            await bot.send_message(chat_id=chat_id, text=text, parse_mode="HTML")
            sent_any = True
        except Exception as e:
            print(f"⚠️ Не удалось отправить сообщение администратору (chat_id={chat_id}): {e}")
    return sent_any


async def send_otp_to_user_or_admin(phone: str, code: str) -> bool:
    """Отправляет одноразовый код входа строго владельцу привязанного номера (или администратору)."""
    if not bot:
        return False
    norm = db_postgres.normalize_phone(phone)
    store = _load_chats_store()
    target_chat_id = store.get("phone_chats", {}).get(norm)
    recipients = {target_chat_id} if target_chat_id else set(ADMIN_CHAT_IDS)

    safe_phone = html.escape(norm or phone)
    safe_code = html.escape(code)
    tg_msg = (
        f"🔐 <b>Код подтверждения VelvetCake</b>\n\n"
        f"📱 Номер телефона: <code>{safe_phone}</code>\n"
        f"🔑 Ваш 6-значный код: <code>{safe_code}</code>\n\n"
        f"<i>Никому не сообщайте этот код. Срок действия — 5 минут.</i>"
    )
    sent = False
    for cid in recipients:
        if not cid:
            continue
        try:
            await bot.send_message(chat_id=int(cid), text=tg_msg, parse_mode="HTML")
            sent = True
        except Exception:
            pass
    return sent


class AdminState(StatesGroup):
    waiting_for_price = State()
    waiting_for_desc = State()
    waiting_for_image = State()
    cake_id = State()


def admin_kb():
    return ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="🎂 Торты"), KeyboardButton(text="🍓 Начинки")],
        [KeyboardButton(text="💬 Отзывы"), KeyboardButton(text="📦 Заказы")]
    ], resize_keyboard=True)


def client_contact_kb():
    return ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="📱 Привязать мой номер телефона", request_contact=True)]
    ], resize_keyboard=True, one_time_keyboard=True)


def format_date_ru(date_str: str) -> str:
    if not date_str:
        return "Не указана"
    for fmt in ("%Y-%m-%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime("%d.%m.%Y")
        except ValueError:
            continue
    return html.escape(str(date_str)[:30])


@dp.message(Command("start"))
async def start_cmd(msg: types.Message):
    if is_admin_tg_user(msg.from_user.id if msg.from_user else None):
        await msg.answer(
            f"✅ <b>Панель администратора VelvetCake активна!</b>\n"
            f"Ваш авторизованный Admin ID: <code>{msg.chat.id}</code>.",
            parse_mode="HTML",
            reply_markup=admin_kb()
        )
    else:
        await msg.answer(
            "👋 <b>Добро пожаловать в кондитерскую VelvetCake!</b>\n\n"
            "Чтобы получать личные коды входа с сайта в этот чат, нажмите кнопку ниже "
            "«📱 Привязать мой номер телефона» или отправьте ваш номер в формате <code>+79991234567</code>.",
            parse_mode="HTML",
            reply_markup=client_contact_kb()
        )


@dp.message(F.contact)
async def handle_contact(msg: types.Message):
    if msg.contact and msg.from_user and msg.contact.user_id == msg.from_user.id:
        await bind_phone_to_chat(msg.contact.phone_number, msg.chat.id)
        norm = db_postgres.normalize_phone(msg.contact.phone_number)
        await msg.answer(
            f"✅ Ваш номер <code>{html.escape(norm or '')}</code> успешно привязан к этому чату!\n"
            f"Теперь коды подтверждения с сайта будут приходить лично вам.",
            parse_mode="HTML"
        )
    else:
        await msg.answer("⚠️ Пожалуйста, отправьте собственный контакт через кнопку меню.")


@dp.message(F.text == "🎂 Торты")
async def cmd_cakes(msg: types.Message):
    if not is_admin_tg_user(msg.from_user.id if msg.from_user else None):
        await msg.answer("⛔ Доступ к управлению каталогом разрешён только администратору кондитерской.")
        return
    data = await db_postgres.fetch_full_state()
    kb = InlineKeyboardMarkup(inline_keyboard=[])
    for c in data["catalog"]:
        kb.inline_keyboard.append([
            InlineKeyboardButton(text=f"{c['emoji']} {c['title']} - {c['price']}₽", callback_data=f"c_menu:{c['db_id']}")
        ])
    await msg.answer("Каталог тортов (режим администратора):", reply_markup=kb)


@dp.callback_query(F.data.startswith("c_menu:"))
async def cb_cake_menu(call: types.CallbackQuery, state: FSMContext):
    if not is_admin_tg_user(call.from_user.id if call.from_user else None):
        await call.answer("⛔ Нет прав администратора", show_alert=True)
        return
    c_id = int(call.data.split(":")[1])
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✏️ Изменить цену", callback_data=f"c_price:{c_id}"),
         InlineKeyboardButton(text="📝 Изменить описание", callback_data=f"c_desc:{c_id}")],
        [InlineKeyboardButton(text="🖼 Изменить фото", callback_data=f"c_img:{c_id}"),
         InlineKeyboardButton(text="❌ Скрыть торт", callback_data=f"c_del:{c_id}")]
    ])
    await call.message.answer(f"Выберите действие для торта ID {c_id}:", reply_markup=kb)


@dp.callback_query(F.data.startswith("c_price:"))
async def cb_edit_price(call: types.CallbackQuery, state: FSMContext):
    if not is_admin_tg_user(call.from_user.id if call.from_user else None):
        await call.answer("⛔ Нет прав администратора", show_alert=True)
        return
    await state.update_data(cake_id=int(call.data.split(":")[1]))
    await state.set_state(AdminState.waiting_for_price)
    await call.message.answer("Отправьте новую цену (только цифры, от 100 до 500000):")


@dp.callback_query(F.data.startswith("c_desc:"))
async def cb_edit_desc(call: types.CallbackQuery, state: FSMContext):
    if not is_admin_tg_user(call.from_user.id if call.from_user else None):
        await call.answer("⛔ Нет прав администратора", show_alert=True)
        return
    await state.update_data(cake_id=int(call.data.split(":")[1]))
    await state.set_state(AdminState.waiting_for_desc)
    await call.message.answer("Отправьте новое описание для торта:")


@dp.callback_query(F.data.startswith("c_img:"))
async def cb_edit_img(call: types.CallbackQuery, state: FSMContext):
    if not is_admin_tg_user(call.from_user.id if call.from_user else None):
        await call.answer("⛔ Нет прав администратора", show_alert=True)
        return
    await state.update_data(cake_id=int(call.data.split(":")[1]))
    await state.set_state(AdminState.waiting_for_image)
    await call.message.answer("Отправьте прямую URL ссылку на картинку (https://...):")


@dp.callback_query(F.data.startswith("c_del:"))
async def cb_del_cake(call: types.CallbackQuery):
    if not is_admin_tg_user(call.from_user.id if call.from_user else None):
        await call.answer("⛔ Нет прав администратора", show_alert=True)
        return
    c_id = int(call.data.split(":")[1])
    await db_postgres.delete_cake(c_id, actor_role="admin")
    await call.message.answer("🗑 Торт скрыт с витрины (запись сохранена в архиве БД)!")


@dp.message(F.text == "🍓 Начинки")
async def cmd_fills(msg: types.Message):
    if not is_admin_tg_user(msg.from_user.id if msg.from_user else None):
        await msg.answer("⛔ Доступ разрешён только администратору.")
        return
    data = await db_postgres.fetch_full_state()
    kb = InlineKeyboardMarkup(inline_keyboard=[])
    for f in data["fillings"]:
        kb.inline_keyboard.append([
            InlineKeyboardButton(text=f"❌ Скрыть {f['label']}", callback_data=f"f_del:{f['db_id']}")
        ])
    await msg.answer("Начинки (нажмите для скрытия):", reply_markup=kb)


@dp.callback_query(F.data.startswith("f_del:"))
async def cb_del_fill(call: types.CallbackQuery):
    if not is_admin_tg_user(call.from_user.id if call.from_user else None):
        await call.answer("⛔ Нет прав администратора", show_alert=True)
        return
    await db_postgres.delete_filling(int(call.data.split(":")[1]), actor_role="admin")
    await call.message.answer("🗑 Начинка скрыта с витрины!")


@dp.message(F.text == "💬 Отзывы")
async def cmd_revs(msg: types.Message):
    if not is_admin_tg_user(msg.from_user.id if msg.from_user else None):
        await msg.answer("⛔ Доступ разрешён только администратору.")
        return
    data = await db_postgres.fetch_full_state()
    kb = InlineKeyboardMarkup(inline_keyboard=[])
    for r in data["reviews"]:
        kb.inline_keyboard.append([
            InlineKeyboardButton(text=f"❌ Скрыть отзыв от {r['name']}", callback_data=f"r_del:{r['db_id']}")
        ])
    await msg.answer("Отзывы (нажмите для скрытия):", reply_markup=kb)


@dp.callback_query(F.data.startswith("r_del:"))
async def cb_del_rev(call: types.CallbackQuery):
    if not is_admin_tg_user(call.from_user.id if call.from_user else None):
        await call.answer("⛔ Нет прав администратора", show_alert=True)
        return
    await db_postgres.delete_review(int(call.data.split(":")[1]), actor_role="admin")
    await call.message.answer("🗑 Отзыв скрыт с сайта!")


@dp.message(AdminState.waiting_for_price)
async def set_price(msg: types.Message, state: FSMContext):
    if not is_admin_tg_user(msg.from_user.id if msg.from_user else None):
        await state.clear()
        return
    if msg.text and msg.text.strip().isdigit():
        data = await state.get_data()
        await db_postgres.update_cake(data["cake_id"], price=int(msg.text.strip()), actor_role="admin")
        await msg.answer("✅ Цена обновлена и записана в журнал аудита!", reply_markup=admin_kb())
        await state.clear()


@dp.message(AdminState.waiting_for_desc)
async def set_desc(msg: types.Message, state: FSMContext):
    if not is_admin_tg_user(msg.from_user.id if msg.from_user else None):
        await state.clear()
        return
    data = await state.get_data()
    await db_postgres.update_cake(data["cake_id"], desc=msg.text, actor_role="admin")
    await msg.answer("✅ Описание обновлено!", reply_markup=admin_kb())
    await state.clear()


@dp.message(AdminState.waiting_for_image)
async def set_img(msg: types.Message, state: FSMContext):
    if not is_admin_tg_user(msg.from_user.id if msg.from_user else None):
        await state.clear()
        return
    safe_url = db_postgres.sanitize_image_url(msg.text or "")
    if not safe_url:
        await msg.answer("⚠️ Укажите корректную прямую ссылку, начинающуюся с https://")
        return
    data = await state.get_data()
    await db_postgres.update_cake(data["cake_id"], img=safe_url, actor_role="admin")
    await msg.answer("✅ Фотография обновлена!", reply_markup=admin_kb())
    await state.clear()


@dp.message()
async def catch_any_message(msg: types.Message):
    norm_phone = db_postgres.normalize_phone(msg.text or "")
    if norm_phone:
        await bind_phone_to_chat(norm_phone, msg.chat.id)
        await msg.answer(
            f"✅ Номер <code>{html.escape(norm_phone)}</code> привязан к вашему Telegram-аккаунту!\n"
            f"Коды подтверждения с сайта VelvetCake будут приходить в этот чат.",
            parse_mode="HTML"
        )
        return
    await msg.answer(
        "Используйте команду /start для привязки номера телефона или открытия меню.",
        parse_mode="HTML"
    )


async def _safe_bot_polling():
    global BOT_USERNAME
    if not bot:
        print("ℹ️ BOT_TOKEN не задан в .env — Telegram-бот отключён (веб-сервер работает штатно).")
        return
    try:
        await bot.delete_webhook(drop_pending_updates=False)
        me = await bot.get_me()
        BOT_USERNAME = me.username or ""
        print(f"🤖 Telegram-бот @{BOT_USERNAME} (ID: {me.id}) успешно подключён и запущен!")
        await dp.start_polling(bot, handle_signals=False)
    except Exception as e:
        print(f"⚠️ Ошибка подключения к Telegram-боту: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db_postgres.init_db_pool()
    polling_task = asyncio.create_task(_safe_bot_polling())
    yield
    polling_task.cancel()
    if bot:
        try:
            await bot.session.close()
        except Exception:
            pass


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.middleware("http")
async def security_headers_and_body_limit(request: Request, call_next):
    # Ограничение максимального размера тела запроса (2 МБ) для защиты от DoS
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > 2 * 1024 * 1024:
        return JSONResponse({"ok": False, "error": "Размер запроса превышает допустимый лимит (2 МБ)"}, status_code=413)

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' https: http: data:; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "script-src 'self'; "
        "connect-src 'self' http://127.0.0.1:7860 http://localhost:7860;"
    )
    return response


if (BASE_DIR / "logos").exists():
    app.mount("/logos", StaticFiles(directory=str(BASE_DIR / "logos")), name="logos")


@app.get("/api/catalog")
async def get_catalog():
    return {"ok": True, **(await db_postgres.fetch_full_state())}


@app.post("/api/auth/send-code")
async def send_auth_code(request: Request):
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"send_otp_ip:{ip}", max_requests=5, window_seconds=600):
        return JSONResponse(
            {"ok": False, "error": "Слишком много запросов кода. Подождите несколько минут."},
            status_code=429
        )

    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "Некорректный формат JSON"}, status_code=400)

    raw_phone = str(data.get("phone", ""))
    norm_phone = db_postgres.normalize_phone(raw_phone)
    if norm_phone and not check_rate_limit(f"send_otp_phone:{norm_phone}", max_requests=3, window_seconds=600):
        return JSONResponse(
            {"ok": False, "error": "Код уже был отправлен. Повторный запрос возможен через несколько минут."},
            status_code=429
        )

    res = await db_postgres.request_phone_otp(raw_phone)
    if res.get("ok"):
        internal_code = res.pop("_internal_otp", "")
        tg_sent = await send_otp_to_user_or_admin(res["phone"], internal_code)
        res["tg_sent"] = tg_sent
        res["bot_username"] = BOT_USERNAME
    return res


@app.post("/api/auth/verify")
async def verify_auth_code(request: Request, response: Response):
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"verify_otp_ip:{ip}", max_requests=8, window_seconds=600):
        return JSONResponse(
            {"ok": False, "error": "Слишком много попыток ввода кода. Подождите 10 минут."},
            status_code=429
        )

    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "Некорректный запрос"}, status_code=400)

    ua = request.headers.get("user-agent", "")
    res = await db_postgres.verify_phone_otp(
        raw_phone=str(data.get("phone", "")),
        code=str(data.get("code", "")),
        name=str(data.get("name", "")),
        ip=ip,
        ua=ua
    )
    if res.get("ok") and res.get("user"):
        u = res["user"]
        token = create_session_token(
            {"uid": u["id"], "phone": u["phone"], "name": u["name"], "role": u.get("role", "client")},
            ttl_seconds=86400 * 7
        )
        res["token"] = token
        response.set_cookie(
            key="velvet_session",
            value=token,
            httponly=True,
            samesite="lax",
            max_age=86400 * 7
        )
        safe_name = html.escape(str(u["name"]))
        safe_phone = html.escape(str(u["phone"]))
        await send_to_admins(
            f"✅ <b>Авторизация клиента на сайте VelvetCake</b>\n"
            f"👤 Пользователь: <b>{safe_name}</b>\n"
            f"📱 Телефон: <code>{safe_phone}</code>"
        )
    return res


@app.get("/api/my-orders")
async def get_my_orders(request: Request):
    session = extract_token_from_request(request, cookie_name="velvet_session")
    if not session or not session.get("phone"):
        return JSONResponse(
            {"ok": False, "error": "Требуется авторизация для просмотра истории заказов", "orders": []},
            status_code=401
        )
    orders = await db_postgres.fetch_user_orders(session["phone"])
    return {"ok": True, "orders": orders}


@app.post("/api/review")
async def post_review(request: Request):
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"review_ip:{ip}", max_requests=5, window_seconds=600):
        return JSONResponse({"ok": False, "error": "Слишком частая отправка отзывов. Попробуйте позже."}, status_code=429)

    session = extract_token_from_request(request, cookie_name="velvet_session")
    admin_session = extract_token_from_request(request, cookie_name="velvet_admin_session")
    active_session = admin_session or session

    try:
        data = await request.json()
        author_name = str(data.get("name") or (active_session.get("name") if active_session else "Гость")).strip()
        uid = int(active_session.get("uid", 1)) if (active_session and active_session.get("uid")) else 1
        role = str(active_session.get("role", "client")) if active_session else "admin"
        await db_postgres.add_review(
            user_id=uid,
            rating=int(data.get("rating", 5)),
            text=str(data.get("text", "")),
            cake_title=str(data.get("cake", "Авторский торт")),
            author_name=author_name or "Гость",
            actor_role=role
        )
        return {"ok": True}
    except (ValueError, PermissionError) as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)


@app.post("/api/order")
async def post_order(request: Request):
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"order_ip:{ip}", max_requests=10, window_seconds=600):
        return JSONResponse({"ok": False, "error": "Превышен лимит создания заказов. Подождите немного."}, status_code=429)

    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "Некорректный формат данных"}, status_code=400)

    items = data.get("items", []) if data.get("items") else [data]
    client_name = db_postgres.sanitize_plain_text(data.get("name") or "Гость", 80)
    client_phone = str(data.get("phone") or "").strip()
    client_comment = db_postgres.sanitize_plain_text(data.get("comment") or "", 1000)

    try:
        new_order = await db_postgres.create_order(
            client_name, client_phone, client_comment, items
        )
    except ValueError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)

    ready_dates = []
    items_lines = []
    for idx, i in enumerate(items, start=1):
        cake_title = html.escape(db_postgres.sanitize_plain_text(i.get("cake") or "Фисташковый рассвет", 150))
        weight_str = html.escape(db_postgres.sanitize_plain_text(i.get("weight") or "2.0 кг", 40))
        filling_str = html.escape(db_postgres.sanitize_plain_text(i.get("filling") or "Фирменная начинка", 150))
        r_date = format_date_ru(i.get("ready_date", ""))
        if r_date not in ready_dates:
            ready_dates.append(r_date)

        items_lines.append(
            f"<b>{idx}. {cake_title}</b>\n"
            f"   • Вес / формат: {weight_str}\n"
            f"   • Начинка: {filling_str}\n"
            f"   • Дата готовности: <b>{r_date}</b>"
        )

    dates_summary = ", ".join(ready_dates) if ready_dates else "На завтра"
    items_block = "\n\n".join(items_lines)
    comment_block = html.escape(client_comment) if client_comment else "Без дополнительных пожеланий"
    total_formatted = f"{int(new_order['total_amount']):,}".replace(",", " ")

    tg_order_message = (
        f"🎂 <b>НОВЫЙ ЗАКАЗ ТОРТА #{new_order['id']}!</b>\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"👤 <b>Кто заказал:</b> {html.escape(client_name)}\n"
        f"📱 <b>Телефон:</b> <code>{html.escape(new_order['phone'])}</code>\n"
        f"📅 <b>На какую дату:</b> <b>{dates_summary}</b>\n\n"
        f"🛒 <b>Что заказал:</b>\n{items_block}\n\n"
        f"📝 <b>Описание и пожелания:</b>\n{comment_block}\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"💰 <b>Итоговая сумма:</b> <b>{total_formatted} ₽</b>"
    )

    await send_to_admins(tg_order_message)
    return {"ok": True, "order_id": new_order["id"], "total_amount": new_order["total_amount"]}


@app.post("/api/admin/login")
async def admin_login(request: Request, response: Response):
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"admin_login_ip:{ip}", max_requests=5, window_seconds=900):
        return JSONResponse(
            {"ok": False, "error": "Превышено число попыток входа. Доступ временно заблокирован на 15 минут."},
            status_code=429
        )

    if not ADMIN_PASSWORD_HASH and not ADMIN_PIN_ENV:
        return JSONResponse(
            {"ok": False, "error": "Пароль администратора не настроен на сервере (задайте ADMIN_PASSWORD_HASH или ADMIN_PIN в .env)."},
            status_code=503
        )

    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "Некорректный запрос"}, status_code=400)

    entered = str(data.get("pin", "")).strip()
    if not verify_admin_credentials(entered):
        return JSONResponse({"ok": False, "error": "Неверный пароль администратора"}, status_code=403)

    token = create_session_token({"uid": None, "role": "admin", "ip": ip}, ttl_seconds=3600 * 4)
    response.set_cookie(
        key="velvet_admin_session",
        value=token,
        httponly=True,
        samesite="strict",
        max_age=3600 * 4
    )
    return {"ok": True, "token": token}


@app.post("/api/admin/action")
async def admin_action(request: Request):
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"admin_action_ip:{ip}", max_requests=30, window_seconds=600):
        return JSONResponse({"ok": False, "error": "Превышен лимит запросов к панели управления"}, status_code=429)

    session = extract_token_from_request(request, cookie_name="velvet_admin_session")
    if not session or session.get("role") != "admin":
        return JSONResponse(
            {"ok": False, "error": "Сессия администратора недействительна или истекла. Войдите заново."},
            status_code=403
        )

    try:
        data = await request.json()
        action = str(data.get("action", ""))
        payload = data.get("payload", {})
        if not isinstance(payload, dict):
            raise ValueError("Некорректный формат payload")

        actor_id = session.get("uid")

        if action == "del_cake":
            await db_postgres.delete_cake(int(payload["id"]), actor_role="admin", actor_id=actor_id)
        elif action == "add_cake":
            await db_postgres.add_cake(
                title=str(payload["title"]), desc=str(payload["desc"]), price=int(payload["price"]),
                img=str(payload.get("img", "")), emoji=str(payload.get("emoji", "🎂")),
                category=str(payload.get("category", "berry")), unit=str(payload.get("unit", "/ кг")),
                badge=str(payload.get("badge", "")), meta=str(payload.get("meta", "")),
                actor_role="admin", actor_id=actor_id
            )
        elif action == "edit_cake":
            await db_postgres.update_cake(
                int(payload["id"]), title=payload.get("title"), desc=payload.get("desc"),
                price=payload.get("price"), img=payload.get("img"),
                category=payload.get("category"), unit=payload.get("unit"),
                badge=payload.get("badge"), emoji=payload.get("emoji"), meta=payload.get("meta"),
                actor_role="admin", actor_id=actor_id
            )
        elif action == "del_fill":
            await db_postgres.delete_filling(int(payload["id"]), actor_role="admin", actor_id=actor_id)
        elif action == "add_fill":
            await db_postgres.add_filling(
                str(payload["title"]), str(payload["desc"]), str(payload.get("emoji", "🍓")),
                list(payload.get("layers", [])), str(payload.get("tag", "")),
                actor_role="admin", actor_id=actor_id
            )
        elif action == "del_rev":
            await db_postgres.delete_review(int(payload["id"]), actor_role="admin", actor_id=actor_id)
        else:
            return JSONResponse({"ok": False, "error": "Неизвестное действие"}, status_code=400)

        return {"ok": True}
    except (KeyError, ValueError, PermissionError) as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)


@app.get("/")
async def serve_index():
    return FileResponse(BASE_DIR / "index.html")


@app.get("/style.css")
async def serve_css():
    return FileResponse(BASE_DIR / "style.css")


@app.get("/script.js")
async def serve_js():
    return FileResponse(BASE_DIR / "script.js")



if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "7860"))
    print(f"🚀 Запуск защищённого сайта VelvetCake и Telegram-бота: http://127.0.0.1:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
