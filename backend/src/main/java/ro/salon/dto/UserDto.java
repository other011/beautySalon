package ro.salon.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import ro.salon.entity.Role;
import ro.salon.entity.User;

public final class UserDto {

    private UserDto() {
    }

    public record Detail(
            Long id,
            String firstName,
            String lastName,
            String email,
            String phone,
            Role role,
            boolean active,
            LocalDateTime createdAt,
            /** Completed visits, counted by phone number (null when not computed). */
            Long visits,
            LocalDateTime lastVisit) {

        public static Detail of(User u) {
            return new Detail(u.id, u.firstName, u.lastName, u.email, u.phone, u.role, u.active, u.createdAt, null, null);
        }

        public static Detail of(User u, long visits, LocalDateTime lastVisit) {
            return new Detail(u.id, u.firstName, u.lastName, u.email, u.phone, u.role, u.active, u.createdAt,
                    visits, lastVisit);
        }
    }

    /** A client who booked without an account, aggregated by phone number. */
    public record GuestSummary(String name, String phone, long visits, long bookings, LocalDateTime lastBooking,
                               boolean hasAccount) {
    }

    public record UpdateRequest(
            @NotBlank @Size(max = 100) String firstName,
            @NotBlank @Size(max = 100) String lastName,
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Pattern(regexp = AuthDto.PHONE_REGEX, message = "Invalid phone number.") String phone,
            /** Admin only: enable / disable the account. */
            Boolean active) {
    }

    /** Admin creates a client (walk-in customers). The password is generated and never shown. */
    public record CreateRequest(
            @NotBlank @Size(max = 100) String firstName,
            @NotBlank @Size(max = 100) String lastName,
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Pattern(regexp = AuthDto.PHONE_REGEX, message = "Invalid phone number.") String phone) {
    }

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Pattern(regexp = AuthDto.PASSWORD_REGEX, message = AuthDto.PASSWORD_MESSAGE) String newPassword) {
    }
}
