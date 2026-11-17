package ro.salon.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import ro.salon.entity.Reservation;
import ro.salon.entity.ReservationStatus;

@ApplicationScoped
public class ReservationRepository {

    /**
     * Search criteria; every field is optional. {@code from} is inclusive, {@code to} exclusive (on start time).
     * {@code guest}: true = only bookings without an account, false = only bookings with an account.
     */
    public record Filter(Long userId, String q, Long serviceId, ReservationStatus status,
                         LocalDateTime from, LocalDateTime to, Boolean guest) {
    }

    @Inject
    EntityManager em;

    // left join: guest bookings have no user
    private static final String BASE = "from Reservation r left join fetch r.user u join fetch r.service s where 1=1";
    private static final String COUNT_BASE = "from Reservation r left join r.user u join r.service s where 1=1";

    /** Live reservations of a service overlapping [from, to). */
    public List<Reservation> findBlocking(Long serviceId, LocalDateTime from, LocalDateTime to, Long excludeId) {
        TypedQuery<Reservation> q = em.createQuery(
                "select r " + BASE + " and s.id = :sid and r.status in :st and r.startDatetime < :to and r.endDatetime > :from"
                        + (excludeId != null ? " and r.id <> :ex" : ""), Reservation.class)
                .setParameter("sid", serviceId)
                .setParameter("st", ReservationStatus.SLOT_BLOCKING)
                .setParameter("from", from)
                .setParameter("to", to);
        if (excludeId != null) {
            q.setParameter("ex", excludeId);
        }
        return q.getResultList();
    }

    public List<Reservation> search(Filter f, String sortBy, boolean asc, Integer page, Integer size) {
        Map<String, Object> params = new HashMap<>();
        String where = where(f, params);
        String order = switch (sortBy == null ? "date" : sortBy) {
            case "client" -> "coalesce(u.lastName, r.guestLastName) " + dir(asc) + ", coalesce(u.firstName, r.guestFirstName) " + dir(asc);
            case "service" -> "s.name " + dir(asc);
            case "status" -> "r.status " + dir(asc);
            default -> "r.startDatetime " + dir(asc);
        };
        TypedQuery<Reservation> q = em.createQuery("select r " + BASE + where + " order by " + order + ", r.id " + dir(asc),
                Reservation.class);
        params.forEach(q::setParameter);
        if (page != null && size != null) {
            q.setFirstResult(page * size).setMaxResults(size);
        }
        return q.getResultList();
    }

    public long count(Filter f) {
        Map<String, Object> params = new HashMap<>();
        String where = where(f, params);
        TypedQuery<Long> q = em.createQuery("select count(r) " + COUNT_BASE + where, Long.class);
        params.forEach(q::setParameter);
        return q.getSingleResult();
    }

    public Reservation get(Long id) {
        List<Reservation> list = em.createQuery("select r " + BASE + " and r.id = :id", Reservation.class)
                .setParameter("id", id).getResultList();
        return list.isEmpty() ? null : list.get(0);
    }

    /** Completed visits per normalised phone number (account and guest bookings alike). */
    public Map<String, Long> completedVisits(Collection<String> phoneNorms) {
        Map<String, Long> out = new HashMap<>();
        if (phoneNorms.isEmpty()) {
            return out;
        }
        em.createQuery("select r.phoneNorm, count(r) from Reservation r where r.status = :done and r.phoneNorm in :p group by r.phoneNorm",
                        Object[].class)
                .setParameter("done", ReservationStatus.COMPLETED)
                .setParameter("p", phoneNorms)
                .getResultList()
                .forEach(row -> out.put((String) row[0], (Long) row[1]));
        return out;
    }

    private static String dir(boolean asc) {
        return asc ? "asc" : "desc";
    }

    private static String where(Filter f, Map<String, Object> p) {
        StringBuilder sb = new StringBuilder();
        if (f.userId() != null) {
            sb.append(" and u.id = :userId");
            p.put("userId", f.userId());
        }
        if (f.serviceId() != null) {
            sb.append(" and s.id = :serviceId");
            p.put("serviceId", f.serviceId());
        }
        if (f.status() != null) {
            sb.append(" and r.status = :status");
            p.put("status", f.status());
        }
        if (f.from() != null) {
            sb.append(" and r.startDatetime >= :from");
            p.put("from", f.from());
        }
        if (f.to() != null) {
            sb.append(" and r.startDatetime < :to");
            p.put("to", f.to());
        }
        if (f.guest() != null) {
            sb.append(f.guest() ? " and r.user is null" : " and r.user is not null");
        }
        if (f.q() != null && !f.q().isBlank()) {
            String term = f.q().trim().toLowerCase().replace("%", "");
            String digits = ro.salon.security.Phones.normalize(term);
            sb.append(" and (lower(u.firstName) like :q or lower(u.lastName) like :q or lower(u.email) like :q"
                    + " or lower(r.guestFirstName) like :q or lower(r.guestLastName) like :q"
                    + " or lower(concat(coalesce(u.firstName, r.guestFirstName), ' ', coalesce(u.lastName, r.guestLastName))) like :q"
                    + " or r.phoneNorm like :qd or u.phone like :q or r.guestPhone like :q)");
            p.put("q", "%" + term + "%");
            // "0722…" must find "+40722…": compare on the normalised number (no match when the term has no digits)
            p.put("qd", digits == null || digits.length() < 3 ? "x" : "%" + digits + "%");
        }
        return sb.toString();
    }
}
