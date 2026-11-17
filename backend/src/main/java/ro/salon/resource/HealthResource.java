package ro.salon.resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.Map;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/api/health")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Health")
public class HealthResource {

    @GET
    @Operation(summary = "Liveness probe")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
