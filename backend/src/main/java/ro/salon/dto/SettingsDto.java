package ro.salon.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Salon-wide configuration (public: it is shown on the website). */
public record SettingsDto(
        @NotBlank @Size(max = 150) String salonName,
        @Size(max = 300) String tagline,
        @Size(max = 500) String logoUrl,
        @Size(max = 4000) String description,
        @Size(max = 255) String address,
        @Size(max = 100) String city,
        @Size(max = 40) String phone,
        @Size(max = 255) String email,
        @Min(0) @Max(720) int cancellationHours,
        @Min(5) @Max(480) int defaultDurationMinutes,
        @Min(5) @Max(240) int slotStepMinutes,
        @Min(1) @Max(365) int bookingHorizonDays,
        boolean autoConfirm,
        @NotBlank @Size(max = 10) String currency,
        @NotBlank @Size(max = 60) String timezone) {
}
