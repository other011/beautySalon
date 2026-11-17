package ro.salon.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

/** A period in which no reservation can be created: break, holiday, closed day, maintenance... */
@Entity
@Table(name = "blocked_slots")
public class BlockedSlot extends PanacheEntityBase {

    public enum Type { BREAK, VACATION, DAY_OFF, CLOSED, MAINTENANCE, OTHER }

    public enum Recurrence { NONE, DAILY, WEEKLY }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Enumerated(EnumType.STRING)
    public Type type = Type.OTHER;

    public LocalDateTime startDatetime;
    public LocalDateTime endDatetime;
    public String reason;

    /** DAILY / WEEKLY repeat the time window of start..end (same day) until {@code recurrenceUntil}. */
    @Enumerated(EnumType.STRING)
    public Recurrence recurrence = Recurrence.NONE;

    public LocalDate recurrenceUntil;
    public LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /** The concrete blocked interval this slot produces on {@code day}, if any, clipped to that day. */
    public Optional<LocalDateTime[]> intervalOn(LocalDate day) {
        LocalDateTime dayStart = day.atStartOfDay();
        LocalDateTime dayEnd = day.plusDays(1).atStartOfDay();
        LocalDateTime from;
        LocalDateTime to;
        if (recurrence == Recurrence.NONE) {
            from = startDatetime;
            to = endDatetime;
        } else {
            LocalDate first = startDatetime.toLocalDate();
            if (day.isBefore(first) || (recurrenceUntil != null && day.isAfter(recurrenceUntil))) {
                return Optional.empty();
            }
            if (recurrence == Recurrence.WEEKLY && day.getDayOfWeek() != first.getDayOfWeek()) {
                return Optional.empty();
            }
            from = day.atTime(startDatetime.toLocalTime());
            to = day.atTime(endDatetime.toLocalTime());
            if (!to.isAfter(from)) {
                to = dayEnd;
            }
        }
        if (!from.isBefore(dayEnd) || !to.isAfter(dayStart)) {
            return Optional.empty();
        }
        return Optional.of(new LocalDateTime[] {
            from.isBefore(dayStart) ? dayStart : from,
            to.isAfter(dayEnd) ? dayEnd : to });
    }
}
