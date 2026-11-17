package ro.salon.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public final class AvailabilityDto {

    private AvailabilityDto() {
    }

    public enum Reason { BOOKED, BLOCKED, PAST }

    /** reason is null when the slot is available. */
    public record Slot(LocalTime start, LocalTime end, boolean available, Reason reason) {
    }

    public record Day(
            LocalDate date,
            Long serviceId,
            int durationMinutes,
            boolean open,
            LocalTime openingTime,
            LocalTime closingTime,
            List<Slot> slots) {
    }

    /** Lightweight per-day summary used to enable / disable days in the booking calendar. */
    public record DaySummary(LocalDate date, boolean available, int freeSlots) {
    }
}
