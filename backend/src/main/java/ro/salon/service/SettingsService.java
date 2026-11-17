package ro.salon.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import java.time.DateTimeException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import ro.salon.dto.SettingsDto;
import ro.salon.entity.Setting;
import ro.salon.exception.ApiException;
import ro.salon.security.Sanitizer;

@ApplicationScoped
public class SettingsService {

    static final Map<String, String> DEFAULTS = new LinkedHashMap<>();

    static {
        DEFAULTS.put("salonName", "KLD Beauty Clinic");
        DEFAULTS.put("tagline", "Frumusețea ta, pe mâini de specialiști");
        DEFAULTS.put("logoUrl", "");
        DEFAULTS.put("description", "KLD Beauty Clinic este un salon modern de înfrumusețare, unde îți oferim tratamente "
                + "personalizate cu aparatură de ultimă generație, într-un spațiu elegant și relaxant.");
        DEFAULTS.put("address", "Strada Florilor 12");
        DEFAULTS.put("city", "București");
        DEFAULTS.put("phone", "+40 721 123 456");
        DEFAULTS.put("email", "contact@aurabeauty.ro");
        DEFAULTS.put("cancellationHours", "2");
        DEFAULTS.put("defaultDurationMinutes", "30");
        DEFAULTS.put("slotStepMinutes", "30");
        DEFAULTS.put("bookingHorizonDays", "90");
        DEFAULTS.put("autoConfirm", "false");
        DEFAULTS.put("currency", "RON");
        DEFAULTS.put("timezone", "Europe/Bucharest");
    }

    private Map<String, String> load() {
        Map<String, String> values = new HashMap<>(DEFAULTS);
        for (Setting s : Setting.<Setting>listAll()) {
            values.put(s.key, s.value);
        }
        return values;
    }

    @Transactional
    public SettingsDto get() {
        Map<String, String> v = load();
        return new SettingsDto(
                v.get("salonName"), v.get("tagline"), v.get("logoUrl"), v.get("description"),
                v.get("address"), v.get("city"), v.get("phone"), v.get("email"),
                Integer.parseInt(v.get("cancellationHours")),
                Integer.parseInt(v.get("defaultDurationMinutes")),
                Integer.parseInt(v.get("slotStepMinutes")),
                Integer.parseInt(v.get("bookingHorizonDays")),
                Boolean.parseBoolean(v.get("autoConfirm")),
                v.get("currency"), v.get("timezone"));
    }

    @Transactional
    public SettingsDto update(SettingsDto in) {
        try {
            ZoneId.of(in.timezone());
        } catch (DateTimeException e) {
            throw ApiException.badRequest("INVALID_TIMEZONE", "Unknown timezone: " + in.timezone());
        }
        Map<String, String> values = new LinkedHashMap<>();
        values.put("salonName", Sanitizer.clean(in.salonName()));
        values.put("tagline", nvl(Sanitizer.clean(in.tagline())));
        values.put("logoUrl", nvl(in.logoUrl()));
        values.put("description", nvl(Sanitizer.clean(in.description())));
        values.put("address", nvl(Sanitizer.clean(in.address())));
        values.put("city", nvl(Sanitizer.clean(in.city())));
        values.put("phone", nvl(Sanitizer.clean(in.phone())));
        values.put("email", nvl(Sanitizer.clean(in.email())));
        values.put("cancellationHours", String.valueOf(in.cancellationHours()));
        values.put("defaultDurationMinutes", String.valueOf(in.defaultDurationMinutes()));
        values.put("slotStepMinutes", String.valueOf(in.slotStepMinutes()));
        values.put("bookingHorizonDays", String.valueOf(in.bookingHorizonDays()));
        values.put("autoConfirm", String.valueOf(in.autoConfirm()));
        values.put("currency", Sanitizer.clean(in.currency()));
        values.put("timezone", in.timezone());
        values.forEach((k, val) -> {
            Setting s = Setting.findById(k);
            if (s == null) {
                new Setting(k, val).persist();
            } else {
                s.value = val;
            }
        });
        return get();
    }

    public ZoneId zone() {
        return ZoneId.of(get().timezone());
    }

    /** Current wall-clock time in the salon's timezone. */
    public LocalDateTime now() {
        return LocalDateTime.now(zone());
    }

    private static String nvl(String s) {
        return s == null ? "" : s;
    }
}
