-- Salon booking schema.
-- All date/times are "wall-clock" times in the salon timezone (setting `timezone`), stored as TIMESTAMP.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE users (
    id             BIGSERIAL PRIMARY KEY,
    first_name     VARCHAR(100) NOT NULL,
    last_name      VARCHAR(100) NOT NULL,
    email          VARCHAR(255) NOT NULL,
    phone          VARCHAR(30),
    password_hash  VARCHAR(100) NOT NULL,
    role           VARCHAR(20)  NOT NULL DEFAULT 'CLIENT',
    active         BOOLEAN      NOT NULL DEFAULT TRUE,
    consent_at     TIMESTAMP,
    reset_token_hash VARCHAR(100),
    reset_expires  TIMESTAMP,
    created_at     TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at     TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT chk_users_role CHECK (role IN ('CLIENT', 'ADMIN')),
    CONSTRAINT chk_users_email CHECK (email LIKE '%_@_%')
);
CREATE UNIQUE INDEX ux_users_email ON users (lower(email));

CREATE TABLE services (
    id               BIGSERIAL PRIMARY KEY,
    name             VARCHAR(150)   NOT NULL,
    description      TEXT           NOT NULL DEFAULT '',
    duration_minutes INTEGER        NOT NULL,
    price            NUMERIC(10, 2) NOT NULL,
    benefits         TEXT           NOT NULL DEFAULT '',   -- one item per line
    equipment        TEXT           NOT NULL DEFAULT '',   -- one item per line
    sections         TEXT           NOT NULL DEFAULT '[]', -- JSON: [{title, items[]}]
    image_url        VARCHAR(500),
    icon             VARCHAR(40),
    display_order    INTEGER        NOT NULL DEFAULT 0,
    active           BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP      NOT NULL DEFAULT now(),
    CONSTRAINT chk_services_duration CHECK (duration_minutes > 0 AND duration_minutes <= 480),
    CONSTRAINT chk_services_price CHECK (price >= 0)
);

CREATE TABLE reservations (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT         NOT NULL REFERENCES users (id),
    service_id     BIGINT         NOT NULL REFERENCES services (id),
    start_datetime TIMESTAMP      NOT NULL,
    end_datetime   TIMESTAMP      NOT NULL,
    status         VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    notes          TEXT,
    price          NUMERIC(10, 2) NOT NULL DEFAULT 0, -- snapshot of the price at booking time
    created_at     TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at     TIMESTAMP      NOT NULL DEFAULT now(),
    CONSTRAINT chk_reservations_interval CHECK (end_datetime > start_datetime),
    CONSTRAINT chk_reservations_status CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    -- Final line of defence against double booking: two live reservations of the same
    -- service (= the same resource) can never overlap, whatever the application does.
    CONSTRAINT reservations_no_overlap EXCLUDE USING gist (
        service_id WITH =,
        tsrange(start_datetime, end_datetime) WITH &&
    ) WHERE (status IN ('PENDING', 'CONFIRMED', 'COMPLETED'))
);
CREATE INDEX ix_reservations_user ON reservations (user_id, start_datetime DESC);
CREATE INDEX ix_reservations_start ON reservations (start_datetime);
CREATE INDEX ix_reservations_service_start ON reservations (service_id, start_datetime);

CREATE TABLE business_hours (
    id           BIGSERIAL PRIMARY KEY,
    day_of_week  SMALLINT NOT NULL UNIQUE, -- 1 = Monday ... 7 = Sunday (ISO)
    opening_time TIME     NOT NULL,
    closing_time TIME     NOT NULL,
    active       BOOLEAN  NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_hours_day CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT chk_hours_interval CHECK (closing_time > opening_time)
);

CREATE TABLE blocked_slots (
    id               BIGSERIAL PRIMARY KEY,
    type             VARCHAR(20) NOT NULL DEFAULT 'OTHER',
    start_datetime   TIMESTAMP   NOT NULL,
    end_datetime     TIMESTAMP   NOT NULL,
    reason           VARCHAR(255),
    recurrence       VARCHAR(10) NOT NULL DEFAULT 'NONE',
    recurrence_until DATE,
    created_at       TIMESTAMP   NOT NULL DEFAULT now(),
    CONSTRAINT chk_blocked_interval CHECK (end_datetime > start_datetime),
    CONSTRAINT chk_blocked_type CHECK (type IN ('BREAK', 'VACATION', 'DAY_OFF', 'CLOSED', 'MAINTENANCE', 'OTHER')),
    CONSTRAINT chk_blocked_recurrence CHECK (recurrence IN ('NONE', 'DAILY', 'WEEKLY'))
);
CREATE INDEX ix_blocked_start ON blocked_slots (start_datetime);

CREATE TABLE notifications (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title          VARCHAR(200) NOT NULL,
    message        TEXT         NOT NULL,
    type           VARCHAR(30)  NOT NULL DEFAULT 'INFO',
    reservation_id BIGINT,
    read           BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX ix_notifications_user ON notifications (user_id, read, created_at DESC);

CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    actor_id    BIGINT,
    actor_name  VARCHAR(200) NOT NULL,
    action      VARCHAR(50)  NOT NULL,
    entity_type VARCHAR(50),
    entity_id   BIGINT,
    message     VARCHAR(500) NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_created ON audit_log (created_at DESC);

CREATE TABLE settings (
    key   VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);
