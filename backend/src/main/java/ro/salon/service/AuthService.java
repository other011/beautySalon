package ro.salon.service;

import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import ro.salon.dto.AuthDto;
import ro.salon.dto.UserDto;
import ro.salon.entity.Role;
import ro.salon.entity.User;
import ro.salon.exception.ApiException;
import ro.salon.security.LoginRateLimiter;
import ro.salon.security.Sanitizer;
import ro.salon.security.TokenService;

@ApplicationScoped
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    @Inject
    TokenService tokens;

    @Inject
    LoginRateLimiter limiter;

    @Inject
    PasswordResetNotifier resetNotifier;

    @Transactional
    public AuthDto.AuthResponse register(AuthDto.RegisterRequest req) {
        if (User.findByEmail(req.email()) != null) {
            throw ApiException.conflict("EMAIL_TAKEN", "An account with this email already exists.");
        }
        User u = new User();
        u.firstName = Sanitizer.clean(req.firstName());
        u.lastName = Sanitizer.clean(req.lastName());
        u.email = req.email().trim().toLowerCase();
        u.applyPhone(req.phone());
        u.passwordHash = BcryptUtil.bcryptHash(req.password());
        u.role = Role.CLIENT;
        u.consentAt = LocalDateTime.now();
        u.persist();
        return response(u, false);
    }

    @Transactional
    public AuthDto.AuthResponse login(AuthDto.LoginRequest req, String ip) {
        limiter.checkAllowed(req.email(), ip);
        User u = User.findByEmail(req.email());
        if (u == null || !BcryptUtil.matches(req.password(), u.passwordHash)) {
            limiter.recordFailure(req.email(), ip);
            throw ApiException.unauthorized("Invalid email or password.");
        }
        if (!u.active) {
            throw ApiException.forbidden("ACCOUNT_DISABLED", "This account has been disabled.");
        }
        limiter.recordSuccess(req.email());
        return response(u, req.rememberMe());
    }

    /** Always succeeds from the caller's point of view, so accounts cannot be enumerated. */
    @Transactional
    public void forgotPassword(String email) {
        User u = User.findByEmail(email);
        if (u == null || !u.active) {
            return;
        }
        byte[] raw = new byte[32];
        RANDOM.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        u.resetTokenHash = sha256(token);
        u.resetExpires = LocalDateTime.now().plusHours(1);
        resetNotifier.send(u, token);
    }

    @Transactional
    public void resetPassword(AuthDto.ResetPasswordRequest req) {
        User u = User.find("resetTokenHash = ?1 and resetExpires > ?2", sha256(req.token()), LocalDateTime.now())
                .firstResult();
        if (u == null) {
            throw ApiException.badRequest("INVALID_RESET_TOKEN", "The reset link is invalid or has expired.");
        }
        u.passwordHash = BcryptUtil.bcryptHash(req.password());
        u.resetTokenHash = null;
        u.resetExpires = null;
    }

    private AuthDto.AuthResponse response(User u, boolean remember) {
        TokenService.Issued issued = tokens.issue(u, remember);
        return new AuthDto.AuthResponse(issued.token(), issued.expiresAt(), UserDto.Detail.of(u));
    }

    public static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
