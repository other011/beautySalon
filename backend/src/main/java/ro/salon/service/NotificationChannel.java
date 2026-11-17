package ro.salon.service;

import ro.salon.entity.User;

/**
 * Delivery channel for notifications. The in-app channel is the only one wired today;
 * to add e-mail / SMS / WhatsApp implement this interface as a CDI bean — it is picked up automatically.
 */
public interface NotificationChannel {

    String name();

    void send(User recipient, String title, String message, String type, Long reservationId);
}
