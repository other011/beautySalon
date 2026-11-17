package ro.salon.security;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerResponseContext;
import org.jboss.resteasy.reactive.server.ServerResponseFilter;

/** Defensive HTTP headers for every API response. */
public class SecurityHeaders {

    @ServerResponseFilter
    public void addHeaders(ContainerRequestContext request, ContainerResponseContext response) {
        var h = response.getHeaders();
        h.putSingle("X-Content-Type-Options", "nosniff");
        h.putSingle("X-Frame-Options", "DENY");
        h.putSingle("Referrer-Policy", "no-referrer");
        h.putSingle("Cache-Control", "no-store");
    }
}
