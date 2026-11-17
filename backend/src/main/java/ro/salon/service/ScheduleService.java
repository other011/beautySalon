package ro.salon.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import ro.salon.dto.ScheduleDto;
import ro.salon.entity.BlockedSlot;
import ro.salon.entity.BusinessHours;
import ro.salon.exception.ApiException;
import ro.salon.security.CurrentUser;
import ro.salon.security.Sanitizer;

/** Opening hours and blocked intervals (breaks, holidays, maintenance). */
@ApplicationScoped
public class ScheduleService {

    @Inject
    AuditService audit;

    @Inject
    CurrentUser current;

    @Inject
    SettingsService settings;

    @Transactional
    public List<ScheduleDto.Hours> hours() {
        return BusinessHours.<BusinessHours>list("order by dayOfWeek").stream().map(ScheduleDto.Hours::of).toList();
    }

    @Transactional
    public List<ScheduleDto.Blocked> blocked(boolean upcomingOnly) {
        LocalDateTime now = settings.now();
        return BlockedSlot.<BlockedSlot>list("order by startDatetime").stream()
                .filter(b -> !upcomingOnly
                        || (b.recurrence == BlockedSlot.Recurrence.NONE
                                ? b.endDatetime.isAfter(now)
                                : b.recurrenceUntil == null || !b.recurrenceUntil.isBefore(now.toLocalDate())))
                .map(ScheduleDto.Blocked::of)
                .toList();
    }

    @Transactional
    public List<ScheduleDto.Hours> updateHours(ScheduleDto.UpdateHours req) {
        Set<Integer> seen = new HashSet<>();
        for (ScheduleDto.Hours h : req.hours()) {
            if (!seen.add(h.dayOfWeek())) {
                throw ApiException.badRequest("DUPLICATE_DAY", "Duplicate day of week: " + h.dayOfWeek());
            }
            if (!h.closingTime().isAfter(h.openingTime())) {
                throw ApiException.badRequest("INVALID_HOURS", "Closing time must be after opening time (day " + h.dayOfWeek() + ").");
            }
        }
        for (ScheduleDto.Hours h : req.hours()) {
            BusinessHours bh = BusinessHours.forDay(h.dayOfWeek());
            if (bh == null) {
                bh = new BusinessHours();
                bh.dayOfWeek = h.dayOfWeek();
            }
            bh.openingTime = h.openingTime();
            bh.closingTime = h.closingTime();
            bh.active = h.active();
            bh.persist();
        }
        audit.log("SCHEDULE_UPDATED", "Schedule", null, "Programul salonului modificat");
        return hours();
    }

    @Transactional
    public ScheduleDto.Blocked addBlocked(ScheduleDto.BlockedRequest req) {
        if (!req.endDateTime().isAfter(req.startDateTime())) {
            throw ApiException.badRequest("INVALID_INTERVAL", "The end must be after the start.");
        }
        BlockedSlot.Recurrence rec = req.recurrence() == null ? BlockedSlot.Recurrence.NONE : req.recurrence();
        if (rec != BlockedSlot.Recurrence.NONE && !req.startDateTime().toLocalDate().equals(req.endDateTime().toLocalDate())) {
            throw ApiException.badRequest("INVALID_INTERVAL", "A recurring interval must start and end on the same day.");
        }
        BlockedSlot b = new BlockedSlot();
        b.type = req.type();
        b.startDatetime = req.startDateTime();
        b.endDatetime = req.endDateTime();
        b.reason = Sanitizer.clean(req.reason());
        b.recurrence = rec;
        b.recurrenceUntil = rec == BlockedSlot.Recurrence.NONE ? null : req.recurrenceUntil();
        b.persist();
        audit.log("SCHEDULE_BLOCKED_ADDED", "BlockedSlot", b.id,
                "Interval indisponibil adăugat" + (b.reason == null || b.reason.isEmpty() ? "" : ": " + b.reason));
        return ScheduleDto.Blocked.of(b);
    }

    @Transactional
    public void deleteBlocked(Long id) {
        BlockedSlot b = BlockedSlot.findById(id);
        if (b == null) {
            throw ApiException.notFound("Blocked slot not found.");
        }
        b.delete();
        audit.log("SCHEDULE_BLOCKED_REMOVED", "BlockedSlot", id, "Interval indisponibil eliminat");
    }
}
