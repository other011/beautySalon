package ro.salon.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;

/** Uniform error body returned by every failing endpoint. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        int status,
        String message,
        LocalDateTime timestamp,
        String code,
        Map<String, String> errors) {

    public static ErrorResponse of(int status, String code, String message) {
        return new ErrorResponse(status, message, LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS), code, null);
    }

    public static ErrorResponse of(int status, String code, String message, Map<String, String> errors) {
        return new ErrorResponse(status, message, LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS), code, errors);
    }
}
