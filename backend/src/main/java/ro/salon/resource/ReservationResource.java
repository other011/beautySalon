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
import java.time.LocalDate;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import ro.salon.dto.CommonDto;
import ro.salon.dto.ReservationDto;
import ro.salon.entity.ReservationStatus;
import ro.salon.entity.Role;
import ro.salon.repository.ReservationRepository;
import ro.salon.security.Secured;
import ro.salon.service.ReservationService;

@Path("/api/reservations")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Secured
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Reservations")
public class ReservationResource {

    @Inject
    ReservationService reservations;

    @GET
    @Operation(summary = "List reservations",
            description = "Clients get their own reservations; admins get all and can filter by client (name/email/phone), "
                    + "service, status and date range, and sort by date, client, service or status.")
    public CommonDto.Page<ReservationDto.Detail> list(
            @QueryParam("q") String q,
            @QueryParam("serviceId") Long serviceId,
            @QueryParam("status") ReservationStatus status,
            @Parameter(description = "admin: true = only bookings without an account, false = only with an account")
            @QueryParam("guest") Boolean guest,
            @Parameter(description = "inclusive, yyyy-MM-dd") @QueryParam("dateFrom") LocalDate dateFrom,
            @Parameter(description = "inclusive, yyyy-MM-dd") @QueryParam("dateTo") LocalDate dateTo,
            @Parameter(description = "date | client | service | status") @QueryParam("sort") @DefaultValue("date") String sort,
            @Parameter(description = "asc | desc") @QueryParam("dir") @DefaultValue("desc") String dir,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        return reservations.search(filter(q, serviceId, status, dateFrom, dateTo, guest), sort, "asc".equalsIgnoreCase(dir),
                Math.max(0, page), Math.min(Math.max(1, size), 200));
    }

    @GET
    @Path("/calendar")
    @Operation(summary = "Reservations in a date range, for calendars (unpaged, ordered by start)")
    public List<ReservationDto.Detail> calendar(@QueryParam("from") LocalDate from, @QueryParam("to") LocalDate to,
                                                @QueryParam("serviceId") Long serviceId) {
        LocalDate start = from != null ? from : LocalDate.now().minusMonths(1);
        LocalDate end = to != null ? to : start.plusMonths(2);
        return reservations.range(filter(null, serviceId, null, start, end, null));
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "A reservation (owner or admin)")
    @APIResponse(responseCode = "404", description = "Not found, or belongs to another client")
    public ReservationDto.Detail get(@PathParam("id") Long id) {
        return reservations.get(id);
    }

    @POST
    @Operation(summary = "Create a reservation",
            description = "The slot is re-validated server-side against opening hours, blocked slots and other reservations. "
                    + "Returns 409 if the slot was taken in the meantime.")
    @APIResponse(responseCode = "201", description = "Reservation created")
    @APIResponse(responseCode = "409", description = "The selected time slot is already booked")
    public Response create(@Valid ReservationDto.Request req) {
        return Response.status(Response.Status.CREATED).entity(reservations.create(req)).build();
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Modify / move a reservation",
            description = "Clients: only open reservations, until the cancellation deadline. Admins: any field including client and status.")
    public ReservationDto.Detail update(@PathParam("id") Long id, @Valid ReservationDto.Request req) {
        return reservations.update(id, req);
    }

    @POST
    @Path("/{id}/cancel")
    @Operation(summary = "Cancel a reservation", description = "Clients are bound by the cancellation policy; admins are not.")
    public ReservationDto.Detail cancel(@PathParam("id") Long id) {
        return reservations.cancel(id);
    }

    @POST
    @Path("/{id}/confirm")
    @Secured(Role.ADMIN)
    @Operation(summary = "Confirm a pending reservation (admin)")
    public ReservationDto.Detail confirm(@PathParam("id") Long id) {
        return reservations.confirm(id);
    }

    @POST
    @Path("/{id}/complete")
    @Secured(Role.ADMIN)
    @Operation(summary = "Mark as completed (admin)")
    public ReservationDto.Detail complete(@PathParam("id") Long id) {
        return reservations.complete(id);
    }

    @POST
    @Path("/{id}/no-show")
    @Secured(Role.ADMIN)
    @Operation(summary = "Mark as no-show (admin)")
    public ReservationDto.Detail noShow(@PathParam("id") Long id) {
        return reservations.noShow(id);
    }

    @DELETE
    @Path("/{id}")
    @Secured(Role.ADMIN)
    @Operation(summary = "Permanently delete a reservation (admin)")
    public Response delete(@PathParam("id") Long id) {
        reservations.delete(id);
        return Response.noContent().build();
    }

    private static ReservationRepository.Filter filter(String q, Long serviceId, ReservationStatus status,
                                                       LocalDate from, LocalDate to, Boolean guest) {
        return new ReservationRepository.Filter(null, q, serviceId, status,
                from == null ? null : from.atStartOfDay(),
                to == null ? null : to.plusDays(1).atStartOfDay(), guest);
    }
}
