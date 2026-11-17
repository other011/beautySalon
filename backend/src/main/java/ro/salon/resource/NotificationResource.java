package ro.salon.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import ro.salon.dto.CommonDto;
import ro.salon.security.Secured;
import ro.salon.service.NotificationService;

@Path("/api/notifications")
@Produces(MediaType.APPLICATION_JSON)
@Secured
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Notifications")
public class NotificationResource {

    @Inject
    NotificationService notifications;

    @GET
    @Operation(summary = "My latest notifications and the unread count")
    public CommonDto.NotificationList mine() {
        return notifications.mine();
    }

    @POST
    @Path("/{id}/read")
    @Operation(summary = "Mark a notification as read")
    public Response read(@PathParam("id") Long id) {
        notifications.markRead(id);
        return Response.noContent().build();
    }

    @POST
    @Path("/read-all")
    @Operation(summary = "Mark all my notifications as read")
    public Response readAll() {
        notifications.markAllRead();
        return Response.noContent().build();
    }
}
