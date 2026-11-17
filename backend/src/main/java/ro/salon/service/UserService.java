package ro.salon.service;

import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import ro.salon.dto.CommonDto;
import ro.salon.dto.UserDto;
import ro.salon.entity.Notification;
import ro.salon.entity.Reservation;
import ro.salon.entity.ReservationStatus;
import ro.salon.entity.Role;
import ro.salon.entity.User;
import ro.salon.exception.ApiException;
import ro.salon.security.CurrentUser;
import ro.salon.security.Phones;
import ro.salon.security.Sanitizer;

@ApplicationScoped
public class UserService {

    private static final SecureRandom RANDOM = new SecureRandom();

    @Inject
    CurrentUser current;

    @Inject
    EntityManager em;

    @Inject
    AuditService audit;

    @Inject
    ro.salon.repository.ReservationRepository reservations;

    /** Admin: paged client list with booking counters. */
    @Transactional
    public CommonDto.Page<UserDto.Detail> list(String q, int page, int size) {
        String where = " where u.role = :role";
        boolean hasQ = q != null && !q.isBlank();
        if (hasQ) {
            where += " and (lower(u.firstName) like :q or lower(u.lastName) like :q or lower(u.email) like :q"
                    + " or u.phone like :q or lower(concat(u.firstName, ' ', u.lastName)) like :q)";
        }
        // visits = COMPLETED reservations of the same phone number (names are not unique, numbers are)
        var query = em.createQuery("select u, count(r), max(r.startDatetime) from User u left join Reservation r on r.phoneNorm = u.phoneNorm"
                + " and r.status = :done" + where + " group by u order by u.lastName, u.firstName", Object[].class)
                .setParameter("role", Role.CLIENT)
                .setParameter("done", ReservationStatus.COMPLETED);
        var count = em.createQuery("select count(u) from User u" + where, Long.class).setParameter("role", Role.CLIENT);
        if (hasQ) {
            String like = "%" + q.trim().toLowerCase().replace("%", "") + "%";
            query.setParameter("q", like);
            count.setParameter("q", like);
        }
        List<UserDto.Detail> items = query.setFirstResult(page * size).setMaxResults(size).getResultList().stream()
                .map(row -> UserDto.Detail.of((User) row[0], (Long) row[1], (LocalDateTime) row[2]))
                .toList();
        return new CommonDto.Page<>(items, page, size, count.getSingleResult());
    }

    /** Admin: clients who booked without an account, aggregated by phone number. */
    @Transactional
    public List<UserDto.GuestSummary> guests(String q) {
        boolean hasQ = q != null && !q.isBlank();
        String term = hasQ ? q.trim().toLowerCase().replace("%", "") : "";
        String digits = Phones.normalize(term);
        var query = em.createQuery("select r.phoneNorm, max(r.guestPhone), max(r.guestFirstName), max(r.guestLastName), count(r), max(r.startDatetime)"
                + " from Reservation r where r.user is null"
                + (hasQ ? " and (lower(r.guestFirstName) like :q or lower(r.guestLastName) like :q or r.phoneNorm like :qd)" : "")
                + " group by r.phoneNorm order by max(r.startDatetime) desc", Object[].class)
                .setMaxResults(200);
        if (hasQ) {
            query.setParameter("q", "%" + term + "%").setParameter("qd", digits == null || digits.length() < 3 ? "x" : "%" + digits + "%");
        }
        List<Object[]> rows = query.getResultList();
        var norms = rows.stream().map(r -> (String) r[0]).collect(java.util.stream.Collectors.toSet());
        var visits = reservations.completedVisits(norms);
        var withAccount = norms.isEmpty() ? java.util.Set.<String>of() : new java.util.HashSet<>(
                em.createQuery("select u.phoneNorm from User u where u.phoneNorm in :p", String.class).setParameter("p", norms).getResultList());
        return rows.stream().map(r -> new UserDto.GuestSummary(
                (r[2] + " " + r[3]).trim(), (String) r[1], visits.getOrDefault((String) r[0], 0L), (Long) r[4],
                (LocalDateTime) r[5], withAccount.contains((String) r[0]))).toList();
    }

    @Transactional
    public UserDto.Detail get(Long id) {
        return UserDto.Detail.of(accessible(id));
    }

    @Transactional
    public UserDto.Detail create(UserDto.CreateRequest req) {
        if (User.findByEmail(req.email()) != null) {
            throw ApiException.conflict("EMAIL_TAKEN", "An account with this email already exists.");
        }
        byte[] raw = new byte[18];
        RANDOM.nextBytes(raw);
        User u = new User();
        u.firstName = Sanitizer.clean(req.firstName());
        u.lastName = Sanitizer.clean(req.lastName());
        u.email = req.email().trim().toLowerCase();
        u.applyPhone(req.phone());
        // unusable random password: the client claims the account through "forgot password"
        u.passwordHash = BcryptUtil.bcryptHash(Base64.getUrlEncoder().withoutPadding().encodeToString(raw) + "aA1");
        u.persist();
        audit.log("CLIENT_CREATED", "User", u.id, "Clientul " + u.fullName() + " creat");
        return UserDto.Detail.of(u);
    }

    @Transactional
    public UserDto.Detail update(Long id, UserDto.UpdateRequest req) {
        User u = accessible(id);
        String email = req.email().trim().toLowerCase();
        User other = User.findByEmail(email);
        if (other != null && !other.id.equals(u.id)) {
            throw ApiException.conflict("EMAIL_TAKEN", "An account with this email already exists.");
        }
        u.firstName = Sanitizer.clean(req.firstName());
        u.lastName = Sanitizer.clean(req.lastName());
        u.email = email;
        String oldNorm = u.phoneNorm;
        u.applyPhone(req.phone());
        if (!java.util.Objects.equals(oldNorm, u.phoneNorm)) {
            // the person's reservations follow the new number
            Reservation.update("phoneNorm = ?1 where user = ?2", u.phoneNorm, u);
        }
        if (current.isAdmin() && req.active() != null && req.active() != u.active) {
            if (u.id.equals(current.id())) {
                throw ApiException.badRequest("SELF_DISABLE", "You cannot disable your own account.");
            }
            u.active = req.active();
            audit.log("CLIENT_UPDATED", "User", u.id, "Contul " + u.fullName() + (u.active ? " reactivat" : " dezactivat"));
        } else if (current.isAdmin() && !u.id.equals(current.id())) {
            audit.log("CLIENT_UPDATED", "User", u.id, "Clientul " + u.fullName() + " modificat");
        }
        return UserDto.Detail.of(u);
    }

    @Transactional
    public void changePassword(Long id, UserDto.ChangePasswordRequest req) {
        if (!current.id().equals(id)) {
            throw ApiException.forbidden("FORBIDDEN", "You can only change your own password.");
        }
        User u = accessible(id);
        if (!BcryptUtil.matches(req.currentPassword(), u.passwordHash)) {
            throw ApiException.badRequest("WRONG_PASSWORD", "The current password is incorrect.");
        }
        u.passwordHash = BcryptUtil.bcryptHash(req.newPassword());
    }

    /** Deactivates the account but keeps the data. */
    @Transactional
    public void deactivate(Long id) {
        User u = accessible(id);
        if (u.role == Role.ADMIN) {
            throw ApiException.badRequest("ADMIN_PROTECTED", "Administrator accounts cannot be disabled this way.");
        }
        u.active = false;
        cancelFutureReservations(u);
    }

    /**
     * GDPR erasure: personal data is wiped, the account is closed and future bookings are cancelled.
     * Past reservations are kept in anonymised form so that statistics and accounting stay consistent.
     */
    @Transactional
    public void erase(Long id) {
        User u = accessible(id);
        if (u.role == Role.ADMIN) {
            throw ApiException.badRequest("ADMIN_PROTECTED", "Administrator accounts cannot be erased this way.");
        }
        cancelFutureReservations(u);
        Notification.delete("userId", u.id);
        byte[] raw = new byte[24];
        RANDOM.nextBytes(raw);
        u.firstName = "Client";
        u.lastName = "Șters";
        u.email = "deleted-" + u.id + "@deleted.invalid";
        u.phone = null;
        u.phoneNorm = null;
        Reservation.update("phoneNorm = null where user = ?1", u); // history stays, but no longer linkable to a person
        u.active = false;
        u.resetTokenHash = null;
        u.resetExpires = null;
        u.passwordHash = BcryptUtil.bcryptHash(Base64.getUrlEncoder().encodeToString(raw));
        if (current.isAdmin()) {
            audit.log("CLIENT_ERASED", "User", u.id, "Datele clientului #" + u.id + " șterse (GDPR)");
        }
    }

    /** GDPR data portability: everything we hold about the user. */
    @Transactional
    public Map<String, Object> export(Long id) {
        User u = accessible(id);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("profile", UserDto.Detail.of(u));
        out.put("consentAt", u.consentAt);
        out.put("reservations", em.createQuery("select r from Reservation r join fetch r.service where r.user.id = :id order by r.startDatetime",
                        Reservation.class).setParameter("id", u.id).getResultList().stream()
                .map(r -> Map.of("id", r.id, "service", r.service.name, "start", r.startDatetime, "end", r.endDatetime,
                        "status", r.status, "price", r.price, "notes", r.notes == null ? "" : r.notes))
                .toList());
        out.put("notifications", Notification.<Notification>list("userId", u.id).stream()
                .map(CommonDto.NotificationView::of).toList());
        return out;
    }

    private void cancelFutureReservations(User u) {
        List<Reservation> future = Reservation.list("user = ?1 and startDatetime > ?2 and status in ?3",
                u, LocalDateTime.now().minusHours(1), List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED));
        future.forEach(r -> r.status = ReservationStatus.CANCELLED);
    }

    /** The user itself or, for admins, anybody. Other clients get a 404 so account ids cannot be probed. */
    private User accessible(Long id) {
        if (!current.isAdmin() && !current.id().equals(id)) {
            throw ApiException.notFound("User not found.");
        }
        User u = User.findById(id);
        if (u == null) {
            throw ApiException.notFound("User not found.");
        }
        return u;
    }
}
