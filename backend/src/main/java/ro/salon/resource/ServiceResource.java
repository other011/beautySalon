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
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import ro.salon.dto.ServiceDto;
import ro.salon.entity.Role;
import ro.salon.security.Secured;
import ro.salon.service.CatalogService;

@Path("/api/services")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Services")
public class ServiceResource {

    @Inject
    CatalogService catalog;

    @GET
    @Operation(summary = "List services", description = "Public: active services only. Admins may pass all=true to include inactive ones.")
    public List<ServiceDto.Detail> list(@QueryParam("all") boolean all) {
        return catalog.list(all);
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "A service with its details")
    public ServiceDto.Detail get(@PathParam("id") Long id) {
        return catalog.get(id);
    }

    @POST
    @Secured(Role.ADMIN)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Add a service (admin)")
    public Response create(@Valid ServiceDto.Request req) {
        return Response.status(Response.Status.CREATED).entity(catalog.create(req)).build();
    }

    @PUT
    @Path("/{id}")
    @Secured(Role.ADMIN)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Update a service (admin)")
    public ServiceDto.Detail update(@PathParam("id") Long id, @Valid ServiceDto.Request req) {
        return catalog.update(id, req);
    }

    @POST
    @Path("/{id}/activate")
    @Secured(Role.ADMIN)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Reactivate a service (admin)")
    public ServiceDto.Detail activate(@PathParam("id") Long id) {
        return catalog.setActive(id, true);
    }

    @POST
    @Path("/{id}/deactivate")
    @Secured(Role.ADMIN)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Deactivate a service (admin)", description = "Hidden from booking but history is kept.")
    public ServiceDto.Detail deactivate(@PathParam("id") Long id) {
        return catalog.setActive(id, false);
    }

    @DELETE
    @Path("/{id}")
    @Secured(Role.ADMIN)
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Delete a service (admin)",
            description = "Services that have reservations are only deactivated (soft delete); the response says which happened.")
    public CatalogService.DeleteResult delete(@PathParam("id") Long id) {
        return catalog.delete(id);
    }
}
