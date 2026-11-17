package ro.salon.security;

import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ResourceInfo;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Arrays;
import java.util.Optional;
import org.jboss.resteasy.reactive.server.ServerRequestFilter;
import ro.salon.entity.Role;
import ro.salon.entity.User;
import ro.salon.exception.ErrorResponse;

/**
 * Authentication + role based authorization for every REST endpoint.
 * The backend is the single authority: the role is read from the database, not trusted from the token.
 */
public class AuthFilter {

    @Inject
    TokenService tokens;

    @Inject
    CurrentUser current;

    @ServerRequestFilter(priority = Priorities.AUTHENTICATION)
    public Response filter(ContainerRequestContext ctx, ResourceInfo info) {
        if (info == null || info.getResourceMethod() == null) {
            return null; // not matched to a resource (404/405 handled elsewhere); CORS pre-flight handled upstream
        }
        Secured secured = info.getResourceMethod().getAnnotation(Secured.class);
        if (secured == null) {
            secured = info.getResourceClass().getAnnotation(Secured.class);
        }
        String header = ctx.getHeaderString("Authorization");
        boolean hasBearer = header != null && header.regionMatches(true, 0, "Bearer ", 0, 7);
        if (secured == null) {
            // public endpoint: still identify the caller when a valid token is sent (e.g. admins see inactive services)
            if (hasBearer) {
                tokens.verify(header.substring(7).trim()).ifPresent(id -> {
                    User u = QuarkusTransaction.requiringNew().call(() -> User.<User>findById(id));
                    if (u != null && u.active) {
                        current.set(u);
                    }
                });
            }
            return null;
        }

        if (!hasBearer) {
            return error(401, "UNAUTHORIZED", "Authentication required.");
        }
        Optional<Long> userId = tokens.verify(header.substring(7).trim());
        if (userId.isEmpty()) {
            return error(401, "INVALID_TOKEN", "Invalid or expired token.");
        }
        User user = QuarkusTransaction.requiringNew().call(() -> User.<User>findById(userId.get()));
        if (user == null || !user.active) {
            return error(401, "INVALID_TOKEN", "Account not found or disabled.");
        }
        Role[] roles = secured.value();
        if (roles.length > 0 && Arrays.stream(roles).noneMatch(r -> r == user.role)) {
            return error(403, "FORBIDDEN", "You do not have permission to perform this action.");
        }
        current.set(user);
        return null;
    }

    private static Response error(int status, String code, String message) {
        return Response.status(status)
                .type(MediaType.APPLICATION_JSON)
                .entity(ErrorResponse.of(status, code, message))
                .build();
    }
}
