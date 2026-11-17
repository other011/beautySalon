package ro.salon;

import io.quarkus.test.Mock;
import jakarta.enterprise.context.ApplicationScoped;
import ro.salon.entity.User;
import ro.salon.service.PasswordResetNotifier;

/** Test double that keeps the last reset token so the flow can be exercised end to end. */
@Mock
@ApplicationScoped
public class CapturingResetNotifier implements PasswordResetNotifier {

    public static volatile String lastToken;

    @Override
    public void send(User user, String resetToken) {
        lastToken = resetToken;
    }
}
