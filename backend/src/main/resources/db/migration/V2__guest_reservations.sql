-- Reservations without an account ("guest" bookings) and phone-based client identity.
-- Names are not unique, so a client is recognised by the NORMALISED PHONE NUMBER
-- (digits only, Romanian national numbers prefixed with 40): 0722 111 333 == +40 722 111 333.

CREATE FUNCTION norm_phone(p TEXT) RETURNS TEXT AS $$
    SELECT CASE
        WHEN d = '' THEN NULL
        WHEN length(d) = 10 AND d LIKE '0%' THEN '40' || substr(d, 2)
        ELSE d
    END
    FROM (SELECT regexp_replace(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '^00', '') AS d) t
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE users ADD COLUMN phone_norm VARCHAR(20);
UPDATE users SET phone_norm = norm_phone(phone);
CREATE INDEX ix_users_phone_norm ON users (phone_norm);

ALTER TABLE reservations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE reservations ADD COLUMN guest_first_name VARCHAR(100);
ALTER TABLE reservations ADD COLUMN guest_last_name VARCHAR(100);
ALTER TABLE reservations ADD COLUMN guest_phone VARCHAR(30);
ALTER TABLE reservations ADD COLUMN phone_norm VARCHAR(20);
UPDATE reservations r SET phone_norm = u.phone_norm FROM users u WHERE u.id = r.user_id;
CREATE INDEX ix_reservations_phone ON reservations (phone_norm);

ALTER TABLE reservations ADD CONSTRAINT chk_reservation_client CHECK (
    user_id IS NOT NULL
    OR (guest_first_name IS NOT NULL AND guest_last_name IS NOT NULL AND guest_phone IS NOT NULL AND phone_norm IS NOT NULL)
);

DROP FUNCTION norm_phone(TEXT);
