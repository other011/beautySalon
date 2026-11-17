package ro.salon.security;

import io.smallrye.jwt.algorithm.SignatureAlgorithm;
import io.smallrye.jwt.build.Jwt;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jose4j.jwt.JwtClaims;
import org.jose4j.jwt.consumer.JwtConsumer;
import org.jose4j.jwt.consumer.JwtConsumerBuilder;
import ro.salon.entity.User;

/** Issues and verifies HS256 signed JWTs. The signing secret comes from configuration (JWT_SECRET). */
@ApplicationScoped
public class TokenService {

    public record Issued(String token, Instant expiresAt) {
    }

    @ConfigProperty(name = "salon.jwt.secret")
    String secret;

    @ConfigProperty(name = "salon.jwt.issuer")
    String issuer;

    @ConfigProperty(name = "salon.jwt.ttl-minutes")
    long ttlMinutes;

    @ConfigProperty(name = "salon.jwt.remember-ttl-minutes")
    long rememberTtlMinutes;

    private SecretKey key;
    private JwtConsumer consumer;

    @PostConstruct
    void init() {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET must be set and at least 32 characters long.");
        }
        key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        consumer = new JwtConsumerBuilder()
                .setRequireExpirationTime()
                .setRequireSubject()
                .setExpectedIssuer(issuer)
                .setVerificationKey(key)
                .setJwsAlgorithmConstraints(
                        new org.jose4j.jwa.AlgorithmConstraints(
                                org.jose4j.jwa.AlgorithmConstraints.ConstraintType.PERMIT,
                                org.jose4j.jws.AlgorithmIdentifiers.HMAC_SHA256))
                .build();
    }

    public Issued issue(User user, boolean rememberMe) {
        Duration ttl = Duration.ofMinutes(rememberMe ? rememberTtlMinutes : ttlMinutes);
        Instant expires = Instant.now().plus(ttl);
        String token = Jwt.issuer(issuer)
                .subject(String.valueOf(user.id))
                .upn(user.email)
                .groups(user.role.name())
                .expiresAt(expires)
                .jws()
                .algorithm(SignatureAlgorithm.HS256)
                .sign(key);
        return new Issued(token, expires);
    }

    /** @return the user id carried by a valid token, or empty if the token is invalid / expired. */
    public Optional<Long> verify(String token) {
        try {
            JwtClaims claims = consumer.processToClaims(token);
            return Optional.of(Long.parseLong(claims.getSubject()));
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
