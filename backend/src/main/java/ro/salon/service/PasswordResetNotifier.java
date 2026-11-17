package ro.salon.service;

import ro.salon.entity.User;

/** Delivers the password reset link. Replace the logging implementation with an e-mail/SMS sender in production. */
public interface PasswordResetNotifier {

    void send(User user, String resetToken);
}
