package ro.salon.resource;

import io.vertx.core.http.HttpServerRequest;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import ro.salon.dto.ReservationDto;
import ro.salon.service.ReservationService;

/** Public endpoint: book without an account (name, surname, phone). */
@Path("/api/guest/reservations")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Reservations")
public class GuestReservationResource {

    @Inject
    ReservationService reservations;

    @Context
    HttpServerRequest request;

    @POST
    @Operation(summary = "Create a reservation without an account",
            description = "Identified by phone number. Same availability rules as account bookings; "
                    + "returns 409 if the slot is taken. Rate limited per address and per phone number.")
    @APIResponse(responseCode = "201", description = "Reservation created")
    @APIResponse(responseCode = "409", description = "The selected time slot is already booked")
    @APIResponse(responseCode = "429", description = "Too many bookings")
    public Response create(@Valid ReservationDto.GuestRequest req) {
        String ip = request != null && request.remoteAddress() != null ? request.remoteAddress().host() : "unknown";
        return Response.status(Response.Status.CREATED).entity(reservations.createGuest(req, ip)).build();
    }
}
