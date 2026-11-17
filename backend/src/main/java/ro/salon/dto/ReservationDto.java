package ro.salon.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import ro.salon.entity.Reservation;
import ro.salon.entity.ReservationStatus;

public final class ReservationDto {

    private ReservationDto() {
    }

    public record Detail(
            Long id,
            /** null for a guest booking (no account). */
            Long userId,
            /** true when the reservation was made without an account. */
            boolean guest,
            String clientName,
            String clientEmail,
            String clientPhone,
            /** Admin only: completed visits of this phone number (all reservations with the same number). */
            Long visitCount,
            Long serviceId,
            String serviceName,
            int durationMinutes,
            BigDecimal price,
            LocalDateTime startDateTime,
            LocalDateTime endDateTime,
            ReservationStatus status,
            String notes,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            /** Whether the current caller may still cancel / modify (cancellation policy). */
            boolean canModify) {

        public static Detail of(Reservation r, boolean canModify, Long visitCount) {
            return new Detail(r.id, r.user == null ? null : r.user.id, r.isGuest(), r.clientName(),
                    r.user == null ? null : r.user.email, r.clientPhone(), visitCount,
                    r.service.id, r.service.name, r.service.durationMinutes, r.price,
                    r.startDatetime, r.endDatetime, r.status, r.notes, r.createdAt, r.updatedAt, canModify);
        }
    }

    public record Request(
            @Schema(example = "1") @NotNull Long serviceId,
            @Schema(example = "2026-10-10T15:00:00") @NotNull LocalDateTime startDateTime,
            @Size(max = 1000) String notes,
            /** Admin only: book on behalf of this client. */
            Long userId,
            /** Admin only: override the status (defaults to the salon policy). */
            ReservationStatus status) {
    }

    /** Booking without an account: identified by phone number. */
    public record GuestRequest(
            @Schema(example = "1") @NotNull Long serviceId,
            @Schema(example = "2026-10-10T15:00:00") @NotNull LocalDateTime startDateTime,
            @Schema(example = "Maria") @NotBlank @Size(max = 100) String firstName,
            @Schema(example = "Popescu") @NotBlank @Size(max = 100) String lastName,
            @Schema(example = "+40721123456") @NotBlank @Pattern(regexp = AuthDto.PHONE_REGEX, message = "Invalid phone number.") String phone,
            @Size(max = 1000) String notes,
            @AssertTrue(message = "You must accept the terms and the privacy policy.") boolean acceptTerms) {
    }

    /** What a guest gets back: only their own booking, nothing about other clients. */
    public record GuestResult(Long id, String serviceName, int durationMinutes, BigDecimal price,
                              LocalDateTime startDateTime, LocalDateTime endDateTime, ReservationStatus status) {
    }
}
