package ro.salon.resource;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import ro.salon.dto.ScheduleDto;
import ro.salon.entity.Role;
import ro.salon.security.CurrentUser;
import ro.salon.security.Secured;
import ro.salon.service.ScheduleService;

@Path("/api/schedule")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Schedule")
public class ScheduleResource {

    @Inject
    ScheduleService schedule;

    @Inject
    CurrentUser current;

    @GET
    @Operation(summary = "Opening hours (public) plus blocked intervals (admins only)")
    public ScheduleDto.Schedule get() {
        return new ScheduleDto.Schedule(schedule.hours(), current.isAdmin() ? schedule.blocked(true) : List.of());
    }

    @PUT
    @Secured(Role.ADMIN)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Replace the weekly opening hours (admin)")
    public List<ScheduleDto.Hours> update(@Valid ScheduleDto.UpdateHours req) {
        return schedule.updateHours(req);
    }

    @GET
    @Path("/blocked")
    @Secured(Role.ADMIN)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Blocked intervals: breaks, holidays, closed days, maintenance (admin)")
    public List<ScheduleDto.Blocked> blocked() {
        return schedule.blocked(false);
    }

    @POST
    @Path("/blocked")
    @Secured(Role.ADMIN)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Block an interval (admin)")
    public Response addBlocked(@Valid ScheduleDto.BlockedRequest req) {
        return Response.status(Response.Status.CREATED).entity(schedule.addBlocked(req)).build();
    }

    @DELETE
    @Path("/blocked/{id}")
    @Secured(Role.ADMIN)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Remove a blocked interval (admin)")
    public Response deleteBlocked(@PathParam("id") Long id) {
        schedule.deleteBlocked(id);
        return Response.noContent().build();
    }
}
