package ro.salon.resource;

import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import ro.salon.dto.AvailabilityDto;
import ro.salon.entity.SalonService;
import ro.salon.exception.ApiException;
import ro.salon.service.AvailabilityService;

/** Public: exposes only free/busy information, never who booked a slot. */
@Path("/api/availability")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Availability")
public class AvailabilityResource {

    @Inject
    AvailabilityService availability;

    @GET
    @Transactional
    @Operation(summary = "Time slots of a service on a day",
            description = "Each slot is available or carries the reason it is not: BOOKED, BLOCKED (break/holiday) or PAST.")
    public AvailabilityDto.Day day(@Parameter(example = "1") @QueryParam("serviceId") Long serviceId,
                                   @Parameter(example = "2026-10-10") @QueryParam("date") LocalDate date) {
        if (serviceId == null || date == null) {
            throw ApiException.badRequest("MISSING_PARAMS", "serviceId and date are required.");
        }
        return availability.day(service(serviceId), date);
    }

    @GET
    @Path("/days")
    @Transactional
    @Operation(summary = "Which days of a month still have free slots",
            description = "Used by the booking calendar to disable days that are closed or fully booked.")
    public List<AvailabilityDto.DaySummary> days(@Parameter(example = "1") @QueryParam("serviceId") Long serviceId,
                                                 @Parameter(example = "2026-10") @QueryParam("month") String month) {
        if (serviceId == null || month == null) {
            throw ApiException.badRequest("MISSING_PARAMS", "serviceId and month (yyyy-MM) are required.");
        }
        try {
            return availability.month(service(serviceId), YearMonth.parse(month));
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest("INVALID_MONTH", "month must have the format yyyy-MM.");
        }
    }

    private SalonService service(Long id) {
        SalonService s = SalonService.findById(id);
        if (s == null || !s.active) {
            throw ApiException.notFound("Service not found.");
        }
        return s;
    }
}
