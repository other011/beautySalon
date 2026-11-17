package ro.salon.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public final class AuthDto {

    private AuthDto() {
    }

    public static final String PHONE_REGEX = "^\\+?[0-9][0-9 .\\-()]{6,18}[0-9]$";
    public static final String PASSWORD_REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,100}$";
    public static final String PASSWORD_MESSAGE =
            "Password must have at least 8 characters, with upper case, lower case and a digit.";

    public record RegisterRequest(
            @Schema(example = "Maria") @NotBlank @Size(max = 100) String firstName,
            @Schema(example = "Popescu") @NotBlank @Size(max = 100) String lastName,
            @Schema(example = "maria@example.com") @NotBlank @Email @Size(max = 255) String email,
            @Schema(example = "+40721123456") @NotBlank @Pattern(regexp = PHONE_REGEX, message = "Invalid phone number.") String phone,
            @Schema(example = "Parola123!") @NotBlank @Pattern(regexp = PASSWORD_REGEX, message = PASSWORD_MESSAGE) String password,
            @Schema(example = "true") @AssertTrue(message = "You must accept the terms and the privacy policy.") boolean acceptTerms) {
    }

    public record LoginRequest(
            @Schema(example = "client@example.com") @NotBlank @Email String email,
            @Schema(example = "Client123!") @NotBlank String password,
            boolean rememberMe) {
    }

    public record AuthResponse(String token, Instant expiresAt, UserDto.Detail user) {
    }

    public record ForgotPasswordRequest(@NotBlank @Email String email) {
    }

    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank @Pattern(regexp = PASSWORD_REGEX, message = PASSWORD_MESSAGE) String password) {
    }
}
