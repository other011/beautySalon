package ro.salon.dto;

import java.math.BigDecimal;
import java.util.List;

public final class StatsDto {

    private StatsDto() {
    }

    public record NextReservation(Long id, String clientName, String serviceName, java.time.LocalDateTime start) {
    }

    public record TodayStats(
            long total,
            long scheduledClients,
            long completed,
            long cancelled,
            long noShow,
            NextReservation next) {
    }

    public record NamedCount(String name, long count, BigDecimal revenue) {
    }

    public record SeriesPoint(String label, long count) {
    }

    public record Dashboard(
            TodayStats today,
            long totalClients,
            String topService,
            List<SeriesPoint> perDay,
            List<SeriesPoint> perWeek,
            List<SeriesPoint> perMonth,
            List<NamedCount> popularServices) {
    }

    public record Report(
            String period,
            long total,
            long completed,
            long cancelled,
            long noShow,
            long upcoming,
            BigDecimal revenue,
            BigDecimal estimatedRevenue,
            long newClients,
            long returningClients,
            List<NamedCount> popularServices,
            List<SeriesPoint> series) {
    }
}
