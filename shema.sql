-- =====================================================================
-- ЗАЩИЩЁННАЯ СХЕМА БАЗЫ ДАННЫХ VELVETCAKE (PostgreSQL)
-- Защита от физического удаления (Hard Delete), подделки логов (Append-Only),
-- XSS-пейлоадов в URL, перебора OTP-кодов и потери истории изменений.
-- =====================================================================

-- Схемы типов (создаются безопасно)
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('client', 'manager', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE order_status_enum AS ENUM ('new', 'confirmed', 'in_production', 'delivering', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE catalog_entity_enum AS ENUM ('cake', 'filling');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE audit_action_enum AS ENUM ('CREATE', 'UPDATE_PRICE', 'UPDATE_CONTENT', 'SOFT_DELETE', 'RESTORE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. Пользователи (единый формат номера +7XXXXXXXXXX)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE CONSTRAINT chk_users_phone_format CHECK (phone ~ '^\+7\d{10}$'),
    full_name VARCHAR(100) NOT NULL CONSTRAINT chk_users_name_len CHECK (char_length(trim(full_name)) >= 2),
    role user_role_enum NOT NULL DEFAULT 'client',
    password_hash TEXT CONSTRAINT chk_users_pwd_hash_format CHECK (
        password_hash IS NULL OR password_hash ~ '^(pbkdf2_sha256\$|\$2[aby]\$|\$argon2id\$).+'
    ),
    telegram_chat_id BIGINT UNIQUE,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Одноразовые коды подтверждения телефона (OTP) — хранится только криптографический хеш!
CREATE TABLE IF NOT EXISTS phone_otp_codes (
    id BIGSERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL CONSTRAINT chk_otp_phone_format CHECK (phone ~ '^\+7\d{10}$'),
    code_hash VARCHAR(128) NOT NULL,
    attempts SMALLINT NOT NULL DEFAULT 0 CONSTRAINT chk_otp_attempts CHECK (attempts >= 0 AND attempts <= 5),
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Миграция для существующей таблицы phone_otp_codes (если была создана со старой колонкой code)
ALTER TABLE phone_otp_codes ADD COLUMN IF NOT EXISTS code_hash VARCHAR(128);
ALTER TABLE phone_otp_codes ADD COLUMN IF NOT EXISTS attempts SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

-- 3. Логи активности пользователей (Append-Only, запрещено каскадное удаление)
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Категории тортов
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO categories (slug, title, sort_order) VALUES
    ('berry', 'Ягодные и Муссовые', 1),
    ('choco', 'Шоколадные', 2),
    ('wedding', 'Свадебные', 3),
    ('kids', 'Детские', 4),
    ('holiday', 'Праздничные', 5),
    ('corp', 'Корпоративные', 6),
    ('bento', 'Бенто и Капкейки', 7),
  ('other', 'Другие торты', 8)
ON CONFLICT (slug) DO NOTHING;

-- 5. Каталог тортов
CREATE TABLE IF NOT EXISTS cakes (
    id BIGSERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL CONSTRAINT chk_cakes_title_len CHECK (char_length(trim(title)) >= 2),
    description TEXT NOT NULL,
    badge VARCHAR(50),
    emoji VARCHAR(16) DEFAULT '🎂',
    image_url TEXT CONSTRAINT chk_cakes_image_url_safe CHECK (
        image_url IS NULL OR image_url = '' OR image_url ~* '^(https?://|data:image/(png|jpeg|jpg|webp);base64,)'
    ),
    meta_info VARCHAR(150),
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 100 AND base_price <= 500000),
    price_unit VARCHAR(20) NOT NULL DEFAULT '/ кг',
    min_weight_kg NUMERIC(4, 2) NOT NULL DEFAULT 1.50 CHECK (min_weight_kg > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Начинки
CREATE TABLE IF NOT EXISTS fillings (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL CONSTRAINT chk_fillings_title_len CHECK (char_length(trim(title)) >= 2),
    description TEXT NOT NULL,
    emoji VARCHAR(16) DEFAULT '🍓',
    tag VARCHAR(50),
    layers TEXT[] NOT NULL DEFAULT '{}',
    extra_price_per_kg NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (extra_price_per_kg >= 0 AND extra_price_per_kg <= 50000),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. История изменения цен (Запрещено каскадное удаление: ON DELETE RESTRICT)
CREATE TABLE IF NOT EXISTS price_history (
    id BIGSERIAL PRIMARY KEY,
    entity_type catalog_entity_enum NOT NULL,
    cake_id BIGINT REFERENCES cakes(id) ON DELETE RESTRICT,
    filling_id BIGINT REFERENCES fillings(id) ON DELETE RESTRICT,
    old_price NUMERIC(10, 2) NOT NULL,
    new_price NUMERIC(10, 2) NOT NULL,
    changed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_price_history_target CHECK (
        (entity_type = 'cake' AND cake_id IS NOT NULL AND filling_id IS NULL) OR
        (entity_type = 'filling' AND filling_id IS NOT NULL AND cake_id IS NULL)
    )
);

-- 8. Аудит действий администратора (Append-Only)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action_type audit_action_enum NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Заказы (Запрещено удаление пользователя с заказами: ON DELETE RESTRICT)
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status order_status_enum NOT NULL DEFAULT 'new',
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    delivery_address TEXT,
    client_comment TEXT,
    managed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Позиции заказа (ON DELETE RESTRICT для сохранения целостности заказа)
CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    cake_id BIGINT REFERENCES cakes(id) ON DELETE SET NULL,
    filling_id BIGINT REFERENCES fillings(id) ON DELETE SET NULL,
    cake_title_snapshot VARCHAR(150) NOT NULL,
    filling_title_snapshot VARCHAR(150),
    weight_kg NUMERIC(5, 2) NOT NULL DEFAULT 1.50 CHECK (weight_kg > 0 AND weight_kg <= 100),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 50),
    ready_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 day'),
    custom_inscription VARCHAR(200),
    unit_price_at_purchase NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price_at_purchase >= 0),
    filling_price_at_purchase NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (filling_price_at_purchase >= 0),
    options_price_at_purchase NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (options_price_at_purchase >= 0),
    item_total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (item_total_price >= 0)
);

-- 11. Отзывы (Запрещено каскадное удаление: ON DELETE RESTRICT)
CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    cake_id BIGINT REFERENCES cakes(id) ON DELETE SET NULL,
    order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
    cake_title_fallback VARCHAR(150) DEFAULT 'Авторский торт',
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL CHECK (char_length(trim(comment)) >= 3 AND char_length(comment) <= 2000),
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- ТРИГГЕРЫ ЗАЩИТЫ ОТ УДАЛЕНИЯ И ФАЛЬСИФИКАЦИИ ДАННЫХ
-- =====================================================================

-- А. Запрет изменения или удаления записей в таблицах аудита и истории цен (Append-Only)
CREATE OR REPLACE FUNCTION fn_prevent_audit_tampering() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SECURITY VIOLATION: Изменение или удаление журналов аудита (%) строго запрещено!', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_admin_audit ON admin_audit_logs;
CREATE TRIGGER trg_protect_admin_audit
BEFORE UPDATE OR DELETE ON admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION fn_prevent_audit_tampering();

DROP TRIGGER IF EXISTS trg_protect_user_activity ON user_activity_logs;
CREATE TRIGGER trg_protect_user_activity
BEFORE UPDATE OR DELETE ON user_activity_logs
FOR EACH ROW EXECUTE FUNCTION fn_prevent_audit_tampering();

DROP TRIGGER IF EXISTS trg_protect_price_history ON price_history;
CREATE TRIGGER trg_protect_price_history
BEFORE UPDATE OR DELETE ON price_history
FOR EACH ROW EXECUTE FUNCTION fn_prevent_audit_tampering();

-- Б. Запрет физического удаления (DELETE) бизнес-данных (разрешён только Soft Delete через флаг is_active / is_published)
CREATE OR REPLACE FUNCTION fn_prevent_hard_delete() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SECURITY VIOLATION: Физическое удаление записей из таблицы "%" запрещено политикой безопасности. Используйте мягкое скрытие (Soft Delete).', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_delete_users ON users;
CREATE TRIGGER trg_no_delete_users
BEFORE DELETE ON users
FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_no_delete_cakes ON cakes;
CREATE TRIGGER trg_no_delete_cakes
BEFORE DELETE ON cakes
FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_no_delete_fillings ON fillings;
CREATE TRIGGER trg_no_delete_fillings
BEFORE DELETE ON fillings
FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_no_delete_orders ON orders;
CREATE TRIGGER trg_no_delete_orders
BEFORE DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_no_delete_order_items ON order_items;
CREATE TRIGGER trg_no_delete_order_items
BEFORE DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

DROP TRIGGER IF EXISTS trg_no_delete_reviews ON reviews;
CREATE TRIGGER trg_no_delete_reviews
BEFORE DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION fn_prevent_hard_delete();

-- В. Автоматическое логирование изменения цен и аудит изменений каталога
CREATE OR REPLACE FUNCTION fn_log_cake_price_change() RETURNS TRIGGER AS $$
DECLARE
    v_action audit_action_enum;
BEGIN
    IF OLD.base_price IS DISTINCT FROM NEW.base_price THEN
        INSERT INTO price_history (entity_type, cake_id, old_price, new_price, changed_by, changed_at)
        VALUES ('cake', NEW.id, OLD.base_price, NEW.base_price, NEW.updated_by, NOW());
        v_action := 'UPDATE_PRICE';
    ELSIF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
        v_action := 'SOFT_DELETE';
    ELSIF OLD.is_active = FALSE AND NEW.is_active = TRUE THEN
        v_action := 'RESTORE';
    ELSE
        v_action := 'UPDATE_CONTENT';
    END IF;

    INSERT INTO admin_audit_logs (admin_id, action_type, entity_type, entity_id, old_values, new_values, created_at)
    VALUES (NEW.updated_by, v_action, 'cake', NEW.id, to_jsonb(OLD), to_jsonb(NEW), NOW());

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cakes_price_history ON cakes;
CREATE TRIGGER trg_cakes_price_history
BEFORE UPDATE ON cakes
FOR EACH ROW EXECUTE FUNCTION fn_log_cake_price_change();

CREATE OR REPLACE FUNCTION fn_log_filling_price_change() RETURNS TRIGGER AS $$
DECLARE
    v_action audit_action_enum;
BEGIN
    IF OLD.extra_price_per_kg IS DISTINCT FROM NEW.extra_price_per_kg THEN
        INSERT INTO price_history (entity_type, filling_id, old_price, new_price, changed_by, changed_at)
        VALUES ('filling', NEW.id, OLD.extra_price_per_kg, NEW.extra_price_per_kg, NEW.updated_by, NOW());
        v_action := 'UPDATE_PRICE';
    ELSIF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
        v_action := 'SOFT_DELETE';
    ELSIF OLD.is_active = FALSE AND NEW.is_active = TRUE THEN
        v_action := 'RESTORE';
    ELSE
        v_action := 'UPDATE_CONTENT';
    END IF;

    INSERT INTO admin_audit_logs (admin_id, action_type, entity_type, entity_id, old_values, new_values, created_at)
    VALUES (NEW.updated_by, v_action, 'filling', NEW.id, to_jsonb(OLD), to_jsonb(NEW), NOW());

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fillings_price_history ON fillings;
CREATE TRIGGER trg_fillings_price_history
BEFORE UPDATE ON fillings
FOR EACH ROW EXECUTE FUNCTION fn_log_filling_price_change();

-- Индексы
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);
CREATE INDEX IF NOT EXISTS idx_otp_phone_active ON phone_otp_codes (phone, created_at DESC) WHERE is_used = FALSE;
CREATE INDEX IF NOT EXISTS idx_orders_user_history ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_ready_date ON order_items (ready_date);
CREATE INDEX IF NOT EXISTS idx_cakes_active_category ON cakes (category_id, id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_fillings_active ON fillings (id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_published ON reviews (created_at DESC) WHERE is_published = TRUE;
