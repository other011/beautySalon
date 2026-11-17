package ro.salon.service;

import jakarta.enterprise.context.ApplicationScoped;
import ro.salon.entity.Notification;
import ro.salon.entity.User;

/** Persists the notification so it shows up in the user's notification centre. */
@ApplicationScoped
public class InAppNotificationChannel implements NotificationChannel {

    @Override
    public String name() {
        return "in-app";
    }

    @Override
    public void send(User recipient, String title, String message, String type, Long reservationId) {
        Notification n = new Notification();
        n.userId = recipient.id;
        n.title = title;
        n.message = message;
        n.type = type;
        n.reservationId = reservationId;
        n.persist();
    }
}
