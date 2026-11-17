package ro.salon.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import ro.salon.dto.CommonDto;
import ro.salon.security.GuestBookingLimiter;
import ro.salon.security.Phones;
import ro.salon.dto.ReservationDto;
import ro.salon.entity.Reservation;
import ro.salon.entity.ReservationStatus;
import ro.salon.entity.SalonService;
import ro.salon.entity.User;
import ro.salon.exception.ApiException;
import ro.salon.repository.ReservationRepository;
import ro.salon.security.CurrentUser;
import ro.salon.security.Sanitizer;

/**
 * Booking use-cases. The service row is locked (SELECT ... FOR UPDATE) while a slot is checked and written,
 * so concurrent bookings of the same service are serialised; the PostgreSQL exclusion constraint is the safety net.
 */
@ApplicationScoped
public class ReservationService {

    @Inject
    CurrentUser current;

    @Inject
    ReservationRepository repo;

    @Inject
    AvailabilityService availability;

    @Inject
    SettingsService settings;

    @Inject
    NotificationService notifications;

    @Inject
    AuditService audit;

    @Inject
    EntityManager em;

    @Inject
    GuestBookingLimiter guestLimiter;

    // ------------------------------------------------------------------ queries

    @Transactional
    public CommonDto.Page<ReservationDto.Detail> search(ReservationRepository.Filter filter, String sortBy, boolean asc,
                                                        int page, int size) {
        ReservationRepository.Filter f = scoped(filter);
        long total = repo.count(f);
        List<ReservationDto.Detail> items = dtos(repo.search(f, sortBy, asc, page, size));
        return new CommonDto.Page<>(items, page, size, total);
    }

    /** Unpaged list, used by calendars. */
    @Transactional
    public List<ReservationDto.Detail> range(ReservationRepository.Filter filter) {
        return dtos(repo.search(scoped(filter), "date", true, null, null));
    }

    @Transactional
    public ReservationDto.Detail get(Long id) {
        return toDto(load(id));
    }

    /**
     * Booking without an account. The client is identified by phone number; the response only echoes the
     * guest's own booking. The same availability rules and locking as for account bookings apply.
     */
    @Transactional
    public ReservationDto.GuestResult createGuest(ReservationDto.GuestRequest req, String ip) {
        guestLimiter.checkAllowed(ip);
        String phoneNorm = Phones.normalize(req.phone());
        if (phoneNorm == null) {
            throw ApiException.badRequest("INVALID_PHONE", "Invalid phone number.");
        }
        long recent = Reservation.count("phoneNorm = ?1 and user is null and createdAt > ?2", phoneNorm,
                java.time.LocalDateTime.now().minusHours(24));
        if (recent >= guestLimiter.maxPerPhonePerDay()) {
            throw ApiException.tooManyRequests("Too many bookings for this phone number. Please call the salon.");
        }
        SalonService service = lockService(req.serviceId());
        if (!service.active) {
            throw ApiException.badRequest("SERVICE_INACTIVE", "This service is not available for booking.");
        }
        availability.assertBookable(service, req.startDateTime(), null, false);

        Reservation r = new Reservation();
        r.guestFirstName = Sanitizer.clean(req.firstName());
        r.guestLastName = Sanitizer.clean(req.lastName());
        r.guestPhone = req.phone().trim();
        r.phoneNorm = phoneNorm;
        r.service = service;
        r.startDatetime = req.startDateTime();
        r.endDatetime = req.startDateTime().plusMinutes(service.durationMinutes);
        r.price = service.price;
        r.notes = Sanitizer.clean(req.notes());
        r.status = settings.get().autoConfirm() ? ReservationStatus.CONFIRMED : ReservationStatus.PENDING;
        r.persist();
        flushOrConflict();
        guestLimiter.record(ip);

        notifications.reservationCreated(r);
        return new ReservationDto.GuestResult(r.id, service.name, service.durationMinutes, r.price,
                r.startDatetime, r.endDatetime, r.status);
    }

    // ------------------------------------------------------------------ commands

    @Transactional
    public ReservationDto.Detail create(ReservationDto.Request req) {
        boolean admin = current.isAdmin();
        User client = current.user();
        if (admin && req.userId() != null) {
            client = User.findById(req.userId());
            if (client == null) {
                throw ApiException.notFound("Client not found.");
            }
        }
        if (!client.active) {
            throw ApiException.badRequest("CLIENT_DISABLED", "This client account is disabled.");
        }
        SalonService service = lockService(req.serviceId());
        if (!service.active) {
            throw ApiException.badRequest("SERVICE_INACTIVE", "This service is not available for booking.");
        }
        availability.assertBookable(service, req.startDateTime(), null, admin);

        Reservation r = new Reservation();
        r.assignTo(client);
        r.service = service;
        r.startDatetime = req.startDateTime();
        r.endDatetime = req.startDateTime().plusMinutes(service.durationMinutes);
        r.price = service.price;
        r.notes = Sanitizer.clean(req.notes());
        if (admin) {
            r.status = req.status() != null ? req.status() : ReservationStatus.CONFIRMED;
        } else {
            r.status = settings.get().autoConfirm() ? ReservationStatus.CONFIRMED : ReservationStatus.PENDING;
        }
        r.persist();
        flushOrConflict();

        notifications.reservationCreated(r);
        if (r.status == ReservationStatus.CONFIRMED) {
            notifications.reservationConfirmed(r);
        }
        if (admin) {
            audit.log("RESERVATION_CREATED", "Reservation", r.id, "Rezervarea #" + r.id + " creată");
        }
        return toDto(r);
    }

    @Transactional
    public ReservationDto.Detail update(Long id, ReservationDto.Request req) {
        boolean admin = current.isAdmin();
        Reservation r = load(id);
        assertClientMayModify(r);

        ReservationStatus oldStatus = r.status;
        SalonService newService = r.service;
        if (!r.service.id.equals(req.serviceId())) {
            newService = lockService(req.serviceId());
            if (!newService.active) {
                throw ApiException.badRequest("SERVICE_INACTIVE", "This service is not available for booking.");
            }
        } else {
            lockService(r.service.id);
        }
        ReservationStatus newStatus = oldStatus;
        if (admin && req.status() != null) {
            newStatus = req.status();
        }
        if (admin && req.userId() != null && (r.user == null || !req.userId().equals(r.user.id))) {
            User u = User.findById(req.userId());
            if (u == null) {
                throw ApiException.notFound("Client not found.");
            }
            r.assignTo(u); // also turns a guest booking into an account booking
        }

        boolean moved = !newService.id.equals(r.service.id) || !req.startDateTime().equals(r.startDatetime);
        boolean reactivated = !oldStatus.blocksSlot() && newStatus.blocksSlot();
        if ((moved || reactivated) && newStatus.blocksSlot()) {
            availability.assertBookable(newService, req.startDateTime(), r.id, admin);
        }
        if (!newService.id.equals(r.service.id)) {
            r.price = newService.price;
        }
        r.service = newService;
        r.startDatetime = req.startDateTime();
        r.endDatetime = req.startDateTime().plusMinutes(newService.durationMinutes);
        r.notes = Sanitizer.clean(req.notes());
        r.status = newStatus;
        if (!admin && moved && r.status == ReservationStatus.CONFIRMED && !settings.get().autoConfirm()) {
            r.status = ReservationStatus.PENDING; // a moved booking needs to be confirmed again
        }
        flushOrConflict();

        notifications.reservationUpdated(r);
        if (admin) {
            audit.log("RESERVATION_UPDATED", "Reservation", r.id, "Rezervarea #" + r.id + " modificată");
        }
        return toDto(r);
    }

    @Transactional
    public ReservationDto.Detail cancel(Long id) {
        Reservation r = load(id);
        assertClientMayModify(r);
        if (r.status == ReservationStatus.CANCELLED) {
            return toDto(r);
        }
        requireStatus(r, ReservationStatus.PENDING, ReservationStatus.CONFIRMED);
        r.status = ReservationStatus.CANCELLED;
        notifications.reservationCancelled(r);
        if (current.isAdmin()) {
            audit.log("RESERVATION_CANCELLED", "Reservation", r.id, "Rezervarea #" + r.id + " anulată");
        }
        return toDto(r);
    }

    @Transactional
    public ReservationDto.Detail confirm(Long id) {
        Reservation r = load(id);
        requireStatus(r, ReservationStatus.PENDING);
        r.status = ReservationStatus.CONFIRMED;
        notifications.reservationConfirmed(r);
        audit.log("RESERVATION_CONFIRMED", "Reservation", r.id, "Rezervarea #" + r.id + " confirmată");
        return toDto(r);
    }

    @Transactional
    public ReservationDto.Detail complete(Long id) {
        Reservation r = load(id);
        requireStatus(r, ReservationStatus.PENDING, ReservationStatus.CONFIRMED);
        r.status = ReservationStatus.COMPLETED;
        audit.log("RESERVATION_COMPLETED", "Reservation", r.id, "Rezervarea #" + r.id + " finalizată");
        return toDto(r);
    }

    @Transactional
    public ReservationDto.Detail noShow(Long id) {
        Reservation r = load(id);
        requireStatus(r, ReservationStatus.PENDING, ReservationStatus.CONFIRMED);
        r.status = ReservationStatus.NO_SHOW;
        audit.log("RESERVATION_NO_SHOW", "Reservation", r.id, "Rezervarea #" + r.id + " marcată absent");
        return toDto(r);
    }

    @Transactional
    public void delete(Long id) {
        Reservation r = load(id);
        r.delete();
        audit.log("RESERVATION_DELETED", "Reservation", id, "Rezervarea #" + id + " ștearsă");
    }

    // ------------------------------------------------------------------ helpers

    private ReservationRepository.Filter scoped(ReservationRepository.Filter f) {
        if (current.isAdmin()) {
            return f;
        }
        return new ReservationRepository.Filter(current.id(), null, f.serviceId(), f.status(), f.from(), f.to(), null);
    }

    /** Loads a reservation; clients can only see their own (404 otherwise, to avoid leaking existence). */
    private Reservation load(Long id) {
        Reservation r = repo.get(id);
        if (r == null || (!current.isAdmin() && (r.user == null || !r.user.id.equals(current.id())))) {
            throw ApiException.notFound("Reservation not found.");
        }
        return r;
    }

    private SalonService lockService(Long id) {
        SalonService s = SalonService.findById(id, LockModeType.PESSIMISTIC_WRITE);
        if (s == null) {
            throw ApiException.notFound("Service not found.");
        }
        return s;
    }

    private void requireStatus(Reservation r, ReservationStatus... allowed) {
        for (ReservationStatus s : allowed) {
            if (r.status == s) {
                return;
            }
        }
        throw ApiException.conflict("INVALID_STATE", "This action is not allowed for a reservation with status " + r.status + ".");
    }

    /** Clients may only change open reservations, and only until the cancellation deadline. Admins are not restricted. */
    private void assertClientMayModify(Reservation r) {
        if (current.isAdmin()) {
            return;
        }
        if (!r.status.isOpen()) {
            throw ApiException.conflict("INVALID_STATE", "This reservation can no longer be changed.");
        }
        if (!withinPolicy(r)) {
            int hours = settings.get().cancellationHours();
            throw ApiException.forbidden("CANCELLATION_WINDOW",
                    "Reservations can only be cancelled or modified at least " + hours + " hours in advance.");
        }
    }

    private boolean withinPolicy(Reservation r) {
        int hours = settings.get().cancellationHours();
        LocalDateTime deadline = r.startDatetime.minusHours(hours);
        return !settings.now().isAfter(deadline);
    }

    private ReservationDto.Detail toDto(Reservation r) {
        return dtos(List.of(r)).get(0);
    }

    /** Maps reservations; admins also get the visit counter of each phone number (one query for the whole list). */
    private List<ReservationDto.Detail> dtos(List<Reservation> list) {
        boolean admin = current.isAdmin();
        Map<String, Long> visits = admin
                ? repo.completedVisits(list.stream().map(r -> r.phoneNorm).filter(Objects::nonNull).collect(Collectors.toSet()))
                : Map.of();
        return list.stream().map(r -> {
            boolean can = admin ? r.status.isOpen() : (r.status.isOpen() && withinPolicy(r));
            Long count = admin && r.phoneNorm != null ? visits.getOrDefault(r.phoneNorm, 0L) : null;
            return ReservationDto.Detail.of(r, can, count);
        }).toList();
    }

    private void flushOrConflict() {
        try {
            em.flush();
        } catch (PersistenceException e) {
            if (isOverlapViolation(e)) {
                throw ApiException.conflict("SLOT_TAKEN", "The selected time slot is already booked.");
            }
            throw e;
        }
    }

    private static boolean isOverlapViolation(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t instanceof SQLException sql && "23P01".equals(sql.getSQLState())) {
                return true;
            }
            if (t.getMessage() != null && t.getMessage().contains("reservations_no_overlap")) {
                return true;
            }
        }
        return false;
    }
}
