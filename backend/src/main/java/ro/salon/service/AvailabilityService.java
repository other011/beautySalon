package ro.salon.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import ro.salon.dto.AvailabilityDto;
import ro.salon.dto.AvailabilityDto.Reason;
import ro.salon.dto.SettingsDto;
import ro.salon.entity.BlockedSlot;
import ro.salon.entity.BusinessHours;
import ro.salon.entity.Reservation;
import ro.salon.entity.SalonService;
import ro.salon.exception.ApiException;
import ro.salon.repository.ReservationRepository;

/**
 * Single source of truth for "can this service be booked at this time?".
 * Availability = business hours − blocked slots − live reservations of the same service − the past,
 * evaluated on the slot grid {opening, opening+step, ...} for the duration of the service.
 */
@ApplicationScoped
public class AvailabilityService {

    @Inject
    SettingsService settings;

    @Inject
    ReservationRepository reservations;

    @Transactional
    public AvailabilityDto.Day day(SalonService service, LocalDate date) {
        SettingsDto s = settings.get();
        LocalDateTime now = settings.now();
        Map<Integer, BusinessHours> hours = hoursByDay();
        List<BlockedSlot> blocks = BlockedSlot.listAll();
        List<Reservation> booked = reservations.findBlocking(service.id, date.atStartOfDay(), date.plusDays(1).atStartOfDay(), null);
        return compute(service, date, s, now, hours, blocks, booked, false);
    }

    /** Same as {@link #day} but optionally ignoring a reservation (when it is being moved) and the "past" rule. */
    @Transactional
    public AvailabilityDto.Day day(SalonService service, LocalDate date, Long excludeReservationId, boolean ignorePast) {
        SettingsDto s = settings.get();
        LocalDateTime now = settings.now();
        List<Reservation> booked = reservations.findBlocking(service.id, date.atStartOfDay(),
                date.plusDays(1).atStartOfDay(), excludeReservationId);
        return compute(service, date, s, now, hoursByDay(), BlockedSlot.listAll(), booked, ignorePast);
    }

    @Transactional
    public List<AvailabilityDto.DaySummary> month(SalonService service, YearMonth month) {
        SettingsDto s = settings.get();
        LocalDateTime now = settings.now();
        Map<Integer, BusinessHours> hours = hoursByDay();
        List<BlockedSlot> blocks = BlockedSlot.listAll();
        LocalDate first = month.atDay(1);
        List<Reservation> booked = reservations.findBlocking(service.id, first.atStartOfDay(),
                month.plusMonths(1).atDay(1).atStartOfDay(), null);
        List<AvailabilityDto.DaySummary> out = new ArrayList<>();
        for (int d = 1; d <= month.lengthOfMonth(); d++) {
            LocalDate date = month.atDay(d);
            List<Reservation> forDay = booked.stream()
                    .filter(r -> r.startDatetime.toLocalDate().equals(date) || r.endDatetime.toLocalDate().equals(date))
                    .toList();
            AvailabilityDto.Day day = compute(service, date, s, now, hours, blocks, forDay, false);
            int free = (int) day.slots().stream().filter(AvailabilityDto.Slot::available).count();
            out.add(new AvailabilityDto.DaySummary(date, free > 0, free));
        }
        return out;
    }

    /**
     * Authoritative check used when creating or moving a reservation.
     *
     * @throws ApiException 400 if the time is not a valid slot, 409 if taken or blocked
     */
    public void assertBookable(SalonService service, LocalDateTime start, Long excludeReservationId, boolean ignorePast) {
        AvailabilityDto.Day day = day(service, start.toLocalDate(), excludeReservationId, ignorePast);
        Optional<AvailabilityDto.Slot> slot = day.slots().stream()
                .filter(sl -> sl.start().equals(start.toLocalTime()))
                .findFirst();
        if (slot.isEmpty()) {
            throw ApiException.badRequest("INVALID_SLOT", "The selected time is outside the opening hours or not on the booking grid.");
        }
        if (!slot.get().available()) {
            Reason reason = slot.get().reason();
            if (reason == Reason.BOOKED) {
                throw ApiException.conflict("SLOT_TAKEN", "The selected time slot is already booked.");
            }
            if (reason == Reason.PAST) {
                throw ApiException.badRequest("SLOT_IN_PAST", "The selected time is in the past.");
            }
            throw ApiException.conflict("SLOT_BLOCKED", "The salon is not available at the selected time.");
        }
    }

    private Map<Integer, BusinessHours> hoursByDay() {
        Map<Integer, BusinessHours> map = new HashMap<>();
        for (BusinessHours h : BusinessHours.<BusinessHours>listAll()) {
            map.put(h.dayOfWeek, h);
        }
        return map;
    }

    AvailabilityDto.Day compute(SalonService service, LocalDate date, SettingsDto settings, LocalDateTime now,
                                Map<Integer, BusinessHours> hours, List<BlockedSlot> blocks,
                                List<Reservation> booked, boolean ignorePast) {
        BusinessHours bh = hours.get(date.getDayOfWeek().getValue());
        boolean beyondHorizon = date.isAfter(now.toLocalDate().plusDays(settings.bookingHorizonDays()));
        if (bh == null || !bh.active || beyondHorizon) {
            return new AvailabilityDto.Day(date, service.id, service.durationMinutes, false, null, null, List.of());
        }
        List<LocalDateTime[]> blocked = new ArrayList<>();
        for (BlockedSlot b : blocks) {
            b.intervalOn(date).ifPresent(blocked::add);
        }
        int step = Math.max(5, settings.slotStepMinutes());
        List<AvailabilityDto.Slot> slots = new ArrayList<>();
        LocalTime t = bh.openingTime;
        while (!t.plusMinutes(service.durationMinutes).isAfter(bh.closingTime)
                && t.plusMinutes(service.durationMinutes).isAfter(t)) {
            LocalDateTime start = date.atTime(t);
            LocalDateTime end = start.plusMinutes(service.durationMinutes);
            Reason reason = null;
            if (!ignorePast && !start.isAfter(now)) {
                reason = Reason.PAST;
            } else if (blocked.stream().anyMatch(b -> overlaps(start, end, b[0], b[1]))) {
                reason = Reason.BLOCKED;
            } else if (booked.stream().anyMatch(r -> overlaps(start, end, r.startDatetime, r.endDatetime))) {
                reason = Reason.BOOKED;
            }
            slots.add(new AvailabilityDto.Slot(t, end.toLocalTime(), reason == null, reason));
            if (t.plusMinutes(step).isBefore(t)) {
                break; // wrapped past midnight
            }
            t = t.plusMinutes(step);
        }
        return new AvailabilityDto.Day(date, service.id, service.durationMinutes, true, bh.openingTime, bh.closingTime, slots);
    }

    private static boolean overlaps(LocalDateTime aStart, LocalDateTime aEnd, LocalDateTime bStart, LocalDateTime bEnd) {
        return aStart.isBefore(bEnd) && bStart.isBefore(aEnd);
    }
}
