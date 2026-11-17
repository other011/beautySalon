package ro.salon.exception;

import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.LinkedHashMap;
import java.util.Map;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.server.ServerExceptionMapper;

/** Maps every exception to the uniform {@link ErrorResponse} JSON body. */
public class ExceptionMappers {

    private static final Logger LOG = Logger.getLogger(ExceptionMappers.class);

    @ServerExceptionMapper
    public Response api(ApiException e) {
        Response.ResponseBuilder rb = Response.status(e.getStatus())
                .type(MediaType.APPLICATION_JSON)
                .entity(ErrorResponse.of(e.getStatus(), e.getCode(), e.getMessage()));
        if (e.getStatus() == 429) {
            rb.header("Retry-After", "60");
        }
        return rb.build();
    }

    @ServerExceptionMapper
    public Response validation(ConstraintViolationException e) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (ConstraintViolation<?> v : e.getConstraintViolations()) {
            String path = v.getPropertyPath().toString();
            String field = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1) : path;
            errors.putIfAbsent(field, v.getMessage());
        }
        return Response.status(400)
                .type(MediaType.APPLICATION_JSON)
                .entity(ErrorResponse.of(400, "VALIDATION_ERROR", "Validation failed.", errors))
                .build();
    }

    @ServerExceptionMapper
    public Response unreadable(JsonProcessingException e) {
        return Response.status(400)
                .type(MediaType.APPLICATION_JSON)
                .entity(ErrorResponse.of(400, "BAD_REQUEST", "Malformed request body."))
                .build();
    }

    @ServerExceptionMapper
    public Response web(WebApplicationException e) {
        int status = e.getResponse().getStatus();
        String message = switch (status) {
            case 404 -> "Resource not found.";
            case 405 -> "Method not allowed.";
            case 415 -> "Unsupported media type.";
            default -> e.getMessage() == null ? "Request failed." : e.getMessage();
        };
        return Response.status(status)
                .type(MediaType.APPLICATION_JSON)
                .entity(ErrorResponse.of(status, "HTTP_" + status, message))
                .build();
    }

    @ServerExceptionMapper
    public Response unexpected(Throwable e) {
        LOG.error("Unhandled error", e);
        return Response.status(500)
                .type(MediaType.APPLICATION_JSON)
                .entity(ErrorResponse.of(500, "INTERNAL_ERROR", "Unexpected server error."))
                .build();
    }
}
