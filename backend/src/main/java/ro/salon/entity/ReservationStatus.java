package ro.salon.entity;

import java.util.List;

public enum ReservationStatus {
    PENDING,
    CONFIRMED,
    COMPLETED,
    CANCELLED,
    NO_SHOW;

    /** Statuses that occupy the slot. Must match the WHERE clause of the exclusion constraint. */
    public static final List<ReservationStatus> SLOT_BLOCKING = List.of(PENDING, CONFIRMED, COMPLETED);

    public boolean blocksSlot() {
        return SLOT_BLOCKING.contains(this);
    }

    /** Whether a client is still allowed to cancel / modify a reservation in this status. */
    public boolean isOpen() {
        return this == PENDING || this == CONFIRMED;
    }
}
