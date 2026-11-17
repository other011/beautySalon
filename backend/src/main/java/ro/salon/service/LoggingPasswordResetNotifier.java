package ro.salon.service;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import ro.salon.entity.User;

/** Default implementation: no mail server yet, so the link is written to the application log. */
@ApplicationScoped
public class LoggingPasswordResetNotifier implements PasswordResetNotifier {

    private static final Logger LOG = Logger.getLogger(LoggingPasswordResetNotifier.class);

    @ConfigProperty(name = "salon.frontend-url", defaultValue = "http://localhost:5173")
    String frontendUrl;

    @Override
    public void send(User user, String resetToken) {
        LOG.infof("Password reset requested for user #%d. Link: %s/reset-password?token=%s",
                user.id, frontendUrl, resetToken);
    }
}
