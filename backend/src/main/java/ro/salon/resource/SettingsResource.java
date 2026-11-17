package ro.salon.resource;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import ro.salon.dto.SettingsDto;
import ro.salon.entity.Role;
import ro.salon.security.Secured;
import ro.salon.service.AuditService;
import ro.salon.service.SettingsService;

@Path("/api/settings")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Settings")
public class SettingsResource {

    @Inject
    SettingsService settings;

    @Inject
    AuditService audit;

    @GET
    @Operation(summary = "Salon information and booking rules (public)")
    public SettingsDto get() {
        return settings.get();
    }

    @PUT
    @Secured(Role.ADMIN)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Update salon settings (admin)")
    public SettingsDto update(@Valid SettingsDto req) {
        SettingsDto saved = settings.update(req);
        audit.log("SETTINGS_UPDATED", "Settings", null, "Setările salonului modificate");
        return saved;
    }
}
