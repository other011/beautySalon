package ro.salon.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import ro.salon.dto.CommonDto;
import ro.salon.dto.StatsDto;
import ro.salon.entity.Role;
import ro.salon.security.Secured;
import ro.salon.service.AuditService;
import ro.salon.service.StatsService;

@Path("/api")
@Produces(MediaType.APPLICATION_JSON)
@Secured(Role.ADMIN)
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Statistics")
public class StatsResource {

    @Inject
    StatsService stats;

    @Inject
    AuditService audit;

    @GET
    @Path("/stats/dashboard")
    @Operation(summary = "Today's numbers, time series and popular services (admin)")
    public StatsDto.Dashboard dashboard() {
        return stats.dashboard();
    }

    @GET
    @Path("/stats/report")
    @Operation(summary = "Report for a period (admin)")
    public StatsDto.Report report(@Parameter(description = "today | week | month | year")
                                  @QueryParam("period") @DefaultValue("month") String period) {
        return stats.report(period);
    }

    @GET
    @Path("/stats/export")
    @Produces("text/csv")
    @Operation(summary = "CSV export of the reservations of a period (admin)")
    public Response export(@QueryParam("period") @DefaultValue("month") String period) {
        return Response.ok(stats.exportCsv(period))
                .header("Content-Disposition", "attachment; filename=\"reservations-" + period + ".csv\"")
                .build();
    }

    @GET
    @Path("/audit")
    @Operation(summary = "Audit log of administrative actions (admin)")
    public CommonDto.Page<CommonDto.AuditView> audit(@QueryParam("page") @DefaultValue("0") int page,
                                                     @QueryParam("size") @DefaultValue("30") int size) {
        return audit.list(Math.max(0, page), Math.min(Math.max(1, size), 200));
    }
}
