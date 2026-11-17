package ro.salon.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import ro.salon.entity.BlockedSlot;
import ro.salon.entity.BusinessHours;

public final class ScheduleDto {

    private ScheduleDto() {
    }

    public record Hours(
            @Min(1) @Max(7) int dayOfWeek,
            @NotNull LocalTime openingTime,
            @NotNull LocalTime closingTime,
            boolean active) {

        public static Hours of(BusinessHours h) {
            return new Hours(h.dayOfWeek, h.openingTime, h.closingTime, h.active);
        }
    }

    public record UpdateHours(@NotEmpty List<@Valid Hours> hours) {
    }

    public record Blocked(
            Long id,
            BlockedSlot.Type type,
            LocalDateTime startDateTime,
            LocalDateTime endDateTime,
            String reason,
            BlockedSlot.Recurrence recurrence,
            LocalDate recurrenceUntil) {

        public static Blocked of(BlockedSlot b) {
            return new Blocked(b.id, b.type, b.startDatetime, b.endDatetime, b.reason, b.recurrence, b.recurrenceUntil);
        }
    }

    public record BlockedRequest(
            @NotNull BlockedSlot.Type type,
            @NotNull LocalDateTime startDateTime,
            @NotNull LocalDateTime endDateTime,
            @Size(max = 255) String reason,
            BlockedSlot.Recurrence recurrence,
            LocalDate recurrenceUntil) {
    }

    public record Schedule(List<Hours> hours, List<Blocked> blockedSlots) {
    }
}
