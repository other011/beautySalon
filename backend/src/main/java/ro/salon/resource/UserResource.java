package ro.salon.resource;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import ro.salon.dto.CommonDto;
import ro.salon.dto.UserDto;
import ro.salon.entity.Role;
import ro.salon.security.Secured;
import ro.salon.service.UserService;

@Path("/api/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Secured
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Users")
public class UserResource {

    @Inject
    UserService users;

    @GET
    @Secured(Role.ADMIN)
    @Operation(summary = "Search clients (admin)", description = "Searches name, email and phone; includes booking counters.")
    public CommonDto.Page<UserDto.Detail> list(@QueryParam("q") String q,
                                               @QueryParam("page") @DefaultValue("0") int page,
                                               @QueryParam("size") @DefaultValue("20") int size) {
        return users.list(q, Math.max(0, page), Math.min(Math.max(1, size), 200));
    }

    @GET
    @Path("/guests")
    @Secured(Role.ADMIN)
    @Operation(summary = "Clients without an account (admin)",
            description = "Bookings made without an account, aggregated by phone number, with completed-visit counters.")
    public java.util.List<UserDto.GuestSummary> guests(@QueryParam("q") String q) {
        return users.guests(q);
    }

    @POST
    @Secured(Role.ADMIN)
    @Operation(summary = "Create a client (admin)", description = "For walk-in customers; the client can claim the account with 'forgot password'.")
    public Response create(@Valid UserDto.CreateRequest req) {
        return Response.status(Response.Status.CREATED).entity(users.create(req)).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "A user (self or admin)")
    public UserDto.Detail get(@PathParam("id") Long id) {
        return users.get(id);
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Update profile (self or admin)")
    public UserDto.Detail update(@PathParam("id") Long id, @Valid UserDto.UpdateRequest req) {
        return users.update(id, req);
    }

    @POST
    @Path("/{id}/password")
    @Operation(summary = "Change own password")
    public Response changePassword(@PathParam("id") Long id, @Valid UserDto.ChangePasswordRequest req) {
        users.changePassword(id, req);
        return Response.noContent().build();
    }

    @POST
    @Path("/{id}/deactivate")
    @Operation(summary = "Deactivate an account (self or admin); data is kept")
    public Response deactivate(@PathParam("id") Long id) {
        users.deactivate(id);
        return Response.noContent().build();
    }

    @GET
    @Path("/{id}/export")
    @Operation(summary = "GDPR: export all personal data of a user (self or admin)")
    public Map<String, Object> export(@PathParam("id") Long id) {
        return users.export(id);
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "GDPR: erase personal data and close the account (self or admin)",
            description = "Personal data is anonymised, future bookings are cancelled, history is kept anonymously.")
    public Response erase(@PathParam("id") Long id) {
        users.erase(id);
        return Response.noContent().build();
    }
}
