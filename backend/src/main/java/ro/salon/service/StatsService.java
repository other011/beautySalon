package ro.salon.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import ro.salon.dto.StatsDto;
import ro.salon.entity.Reservation;
import ro.salon.entity.ReservationStatus;
import ro.salon.entity.Role;
import ro.salon.entity.User;
import ro.salon.exception.ApiException;
import ro.salon.repository.ReservationRepository;

@ApplicationScoped
public class StatsService {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd.MM");

    @Inject
    EntityManager em;

    @Inject
    SettingsService settings;

    @Inject
    ReservationRepository repo;

    @Transactional
    public StatsDto.Dashboard dashboard() {
        LocalDateTime now = settings.now();
        LocalDate today = now.toLocalDate();

        List<Reservation> todays = fetch(today.atStartOfDay(), today.plusDays(1).atStartOfDay());
        List<Reservation> live = todays.stream().filter(r -> r.status != ReservationStatus.CANCELLED).toList();
        Reservation next = Reservation.<Reservation>find(
                        "status in ?1 and startDatetime > ?2 order by startDatetime",
                        List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED), now)
                .firstResult();
        StatsDto.NextReservation nextDto = next == null ? null
                : new StatsDto.NextReservation(next.id, next.user.fullName(), next.service.name, next.startDatetime);
        StatsDto.TodayStats ts = new StatsDto.TodayStats(
                live.size(),
                live.stream().map(StatsService::clientKey).distinct().count(),
                count(todays, ReservationStatus.COMPLETED),
                count(todays, ReservationStatus.CANCELLED),
                count(todays, ReservationStatus.NO_SHOW),
                nextDto);

        // windows around today so that upcoming load is visible too
        LocalDate dayFrom = today.minusDays(6);
        LocalDate weekFrom = today.with(DayOfWeek.MONDAY).minusWeeks(3);
        YearMonth monthFrom = YearMonth.from(today).minusMonths(6);
        LocalDateTime from = monthFrom.atDay(1).atStartOfDay();
        LocalDateTime to = YearMonth.from(today).plusMonths(7).atDay(1).atStartOfDay();
        List<Reservation> window = fetch(from, to).stream().filter(r -> r.status != ReservationStatus.CANCELLED).toList();

        List<StatsDto.SeriesPoint> perDay = new ArrayList<>();
        for (int i = 0; i < 14; i++) {
            LocalDate d = dayFrom.plusDays(i);
            perDay.add(new StatsDto.SeriesPoint(d.format(DAY), window.stream().filter(r -> r.startDatetime.toLocalDate().equals(d)).count()));
        }
        List<StatsDto.SeriesPoint> perWeek = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            LocalDate w = weekFrom.plusWeeks(i);
            LocalDate wEnd = w.plusWeeks(1);
            perWeek.add(new StatsDto.SeriesPoint(w.format(DAY), window.stream()
                    .filter(r -> !r.startDatetime.toLocalDate().isBefore(w) && r.startDatetime.toLocalDate().isBefore(wEnd)).count()));
        }
        List<StatsDto.SeriesPoint> perMonth = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            YearMonth m = monthFrom.plusMonths(i + 1);
            perMonth.add(new StatsDto.SeriesPoint(m.format(DateTimeFormatter.ofPattern("MM.yyyy")), window.stream()
                    .filter(r -> YearMonth.from(r.startDatetime).equals(m)).count()));
        }

        List<StatsDto.NamedCount> popular = popular(Reservation.<Reservation>list("status <> ?1", ReservationStatus.CANCELLED));
        long clients = User.count("role", Role.CLIENT);
        return new StatsDto.Dashboard(ts, clients, popular.isEmpty() ? null : popular.get(0).name(),
                perDay, perWeek, perMonth, popular);
    }

    @Transactional
    public StatsDto.Report report(String period) {
        LocalDateTime[] range = range(period);
        LocalDateTime now = settings.now();
        List<Reservation> rs = fetch(range[0], range[1]);
        List<Reservation> live = rs.stream().filter(r -> r.status != ReservationStatus.CANCELLED).toList();

        BigDecimal revenue = sum(rs, Set.of(ReservationStatus.COMPLETED));
        BigDecimal estimated = sum(rs, Set.of(ReservationStatus.COMPLETED, ReservationStatus.CONFIRMED, ReservationStatus.PENDING));
        long upcoming = rs.stream().filter(r -> r.status.isOpen() && r.startDatetime.isAfter(now)).count();

        long newClients = User.count("role = ?1 and createdAt >= ?2 and createdAt < ?3", Role.CLIENT, range[0], range[1]);
        // returning = booked in the period and had booked before it, or booked more than once within it
        // clients are identified by phone number (names are not unique); account without phone falls back to the user id
        Map<String, Long> perClient = live.stream().collect(Collectors.groupingBy(StatsService::clientKey, Collectors.counting()));
        long returning = perClient.entrySet().stream().filter(e -> e.getValue() > 1
                || (e.getKey().startsWith("p:")
                        ? Reservation.count("phoneNorm = ?1 and startDatetime < ?2 and status <> ?3",
                                e.getKey().substring(2), range[0], ReservationStatus.CANCELLED)
                        : Reservation.count("user.id = ?1 and startDatetime < ?2 and status <> ?3",
                                Long.parseLong(e.getKey().substring(2)), range[0], ReservationStatus.CANCELLED)) > 0).count();

        boolean byMonth = "year".equals(period);
        Map<String, Long> series = new LinkedHashMap<>();
        if (byMonth) {
            for (int m = 1; m <= 12; m++) {
                series.put(String.format("%02d", m), 0L);
            }
            live.forEach(r -> series.merge(String.format("%02d", r.startDatetime.getMonthValue()), 1L, Long::sum));
        } else {
            for (LocalDate d = range[0].toLocalDate(); d.isBefore(range[1].toLocalDate()); d = d.plusDays(1)) {
                series.put(d.format(DAY), 0L);
            }
            live.forEach(r -> series.merge(r.startDatetime.toLocalDate().format(DAY), 1L, Long::sum));
        }
        return new StatsDto.Report(period, rs.size(), count(rs, ReservationStatus.COMPLETED),
                count(rs, ReservationStatus.CANCELLED), count(rs, ReservationStatus.NO_SHOW), upcoming,
                revenue, estimated, newClients, returning, popular(live),
                series.entrySet().stream().map(e -> new StatsDto.SeriesPoint(e.getKey(), e.getValue())).toList());
    }

    /** CSV export of all reservations in the period. Other formats (XLSX, PDF) can plug in next to this one. */
    @Transactional
    public String exportCsv(String period) {
        LocalDateTime[] range = range(period);
        StringBuilder sb = new StringBuilder("﻿id,data,ora_start,ora_sfarsit,client,email,telefon,serviciu,pret,status\n");
        // (guest bookings have an empty email column)
        for (Reservation r : fetch(range[0], range[1])) {
            sb.append(r.id).append(',')
                    .append(r.startDatetime.toLocalDate()).append(',')
                    .append(r.startDatetime.toLocalTime()).append(',')
                    .append(r.endDatetime.toLocalTime()).append(',')
                    .append(csv(r.clientName())).append(',')
                    .append(csv(r.user == null ? "" : r.user.email)).append(',')
                    .append(csv(r.clientPhone())).append(',')
                    .append(csv(r.service.name)).append(',')
                    .append(r.price.toPlainString()).append(',')
                    .append(r.status).append('\n');
        }
        return sb.toString();
    }

    private static String csv(String v) {
        if (v == null) {
            return "";
        }
        // neutralise spreadsheet formula injection
        String s = v.matches("^[=+\\-@].*") ? "'" + v : v;
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }

    private LocalDateTime[] range(String period) {
        LocalDate today = settings.now().toLocalDate();
        return switch (period == null ? "today" : period) {
            case "today" -> new LocalDateTime[] {today.atStartOfDay(), today.plusDays(1).atStartOfDay()};
            case "week" -> {
                LocalDate monday = today.with(DayOfWeek.MONDAY);
                yield new LocalDateTime[] {monday.atStartOfDay(), monday.plusWeeks(1).atStartOfDay()};
            }
            case "month" -> new LocalDateTime[] {today.withDayOfMonth(1).atStartOfDay(),
                    today.with(TemporalAdjusters.firstDayOfNextMonth()).atStartOfDay()};
            case "year" -> new LocalDateTime[] {today.withDayOfYear(1).atStartOfDay(),
                    today.withDayOfYear(1).plusYears(1).atStartOfDay()};
            default -> throw ApiException.badRequest("INVALID_PERIOD", "Period must be one of: today, week, month, year.");
        };
    }

    private List<Reservation> fetch(LocalDateTime from, LocalDateTime to) {
        return repo.search(new ReservationRepository.Filter(null, null, null, null, from, to, null), "date", true, null, null);
    }

    private static String clientKey(Reservation r) {
        return r.phoneNorm != null ? "p:" + r.phoneNorm : "u:" + r.user.id;
    }

    private static long count(List<Reservation> rs, ReservationStatus status) {
        return rs.stream().filter(r -> r.status == status).count();
    }

    private static BigDecimal sum(List<Reservation> rs, Set<ReservationStatus> statuses) {
        return rs.stream().filter(r -> statuses.contains(r.status)).map(r -> r.price)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static List<StatsDto.NamedCount> popular(List<Reservation> rs) {
        return rs.stream().collect(Collectors.groupingBy(r -> r.service.name)).entrySet().stream()
                .map(e -> new StatsDto.NamedCount(e.getKey(), e.getValue().size(),
                        e.getValue().stream().filter(r -> r.status != ReservationStatus.CANCELLED && r.status != ReservationStatus.NO_SHOW)
                                .map(r -> r.price).reduce(BigDecimal.ZERO, BigDecimal::add)))
                .sorted(Comparator.comparingLong(StatsDto.NamedCount::count).reversed().thenComparing(StatsDto.NamedCount::name))
                .toList();
    }
}
