package ro.salon.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.util.List;
import ro.salon.dto.CommonDto;
import ro.salon.entity.Notification;
import ro.salon.entity.Reservation;
import ro.salon.entity.Role;
import ro.salon.entity.User;
import ro.salon.exception.ApiException;
import ro.salon.security.CurrentUser;

@ApplicationScoped
public class NotificationService {

    @Inject
    Instance<NotificationChannel> channels;

    @Inject
    CurrentUser current;

    @Inject
    EntityManager em;

    public void notify(User recipient, String title, String message, String type, Long reservationId) {
        for (NotificationChannel channel : channels) {
            channel.send(recipient, title, message, type, reservationId);
        }
    }

    public void reservationCreated(Reservation r) {
        if (r.user != null) {
            notify(r.user, "Rezervare creată", "Rezervarea ta a fost creată cu succes.", "RESERVATION_CREATED", r.id);
        }
        // let the team know about new bookings
        for (User admin : User.<User>list("role = ?1 and active = true", Role.ADMIN)) {
            if (r.user == null || !admin.id.equals(r.user.id)) {
                notify(admin, "Rezervare nouă",
                        "Rezervare nouă" + (r.isGuest() ? " (fără cont)" : "") + ": " + r.clientName() + " – " + r.service.name + ".",
                        "RESERVATION_CREATED", r.id);
            }
        }
    }

    // Guest bookings have no account, hence no in-app notification; they are told on screen and by phone.

    public void reservationConfirmed(Reservation r) {
        if (r.user != null) {
            notify(r.user, "Rezervare confirmată", "Rezervarea ta a fost confirmată.", "RESERVATION_CONFIRMED", r.id);
        }
    }

    public void reservationCancelled(Reservation r) {
        if (r.user != null) {
            notify(r.user, "Rezervare anulată", "Rezervarea ta a fost anulată.", "RESERVATION_CANCELLED", r.id);
        }
    }

    public void reservationUpdated(Reservation r) {
        if (r.user != null) {
            notify(r.user, "Rezervare modificată", "Rezervarea ta a fost modificată.", "RESERVATION_UPDATED", r.id);
        }
    }

    @Transactional
    public CommonDto.NotificationList mine() {
        List<CommonDto.NotificationView> items = em
                .createQuery("select n from Notification n where n.userId = :u order by n.createdAt desc, n.id desc",
                        Notification.class)
                .setParameter("u", current.id())
                .setMaxResults(50)
                .getResultList().stream().map(CommonDto.NotificationView::of).toList();
        long unread = Notification.count("userId = ?1 and seen = false", current.id());
        return new CommonDto.NotificationList(items, unread);
    }

    @Transactional
    public void markRead(Long id) {
        Notification n = Notification.findById(id);
        if (n == null || !n.userId.equals(current.id())) {
            throw ApiException.notFound("Notification not found.");
        }
        n.seen = true;
    }

    @Transactional
    public void markAllRead() {
        Notification.update("seen = true where userId = ?1 and seen = false", current.id());
    }
}
