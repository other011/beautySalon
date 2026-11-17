package ro.salon.security;

import jakarta.enterprise.context.ApplicationScoped;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import ro.salon.exception.ApiException;

/**
 * In-memory sliding window limiter for failed logins, keyed by e-mail and by client address.
 * Good for a single instance; swap for a shared store (Redis, DB) when scaling horizontally.
 */
@ApplicationScoped
public class LoginRateLimiter {

    @ConfigProperty(name = "salon.login.max-attempts")
    int maxPerEmail;

    @ConfigProperty(name = "salon.login.max-attempts-per-ip")
    int maxPerIp;

    @ConfigProperty(name = "salon.login.window-minutes")
    long windowMinutes;

    private final ConcurrentHashMap<String, Deque<Instant>> failures = new ConcurrentHashMap<>();

    public void checkAllowed(String email, String ip) {
        if (count("e:" + normalise(email)) >= maxPerEmail || count("i:" + ip) >= maxPerIp) {
            throw ApiException.tooManyRequests("Too many failed login attempts. Please try again later.");
        }
    }

    public void recordFailure(String email, String ip) {
        record("e:" + normalise(email));
        record("i:" + ip);
    }

    public void recordSuccess(String email) {
        failures.remove("e:" + normalise(email));
    }

    public void reset() {
        failures.clear();
    }

    private int count(String key) {
        Deque<Instant> q = failures.get(key);
        if (q == null) {
            return 0;
        }
        synchronized (q) {
            prune(q);
            return q.size();
        }
    }

    private void record(String key) {
        Deque<Instant> q = failures.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            prune(q);
            q.addLast(Instant.now());
        }
    }

    private void prune(Deque<Instant> q) {
        Instant limit = Instant.now().minus(Duration.ofMinutes(windowMinutes));
        while (!q.isEmpty() && q.peekFirst().isBefore(limit)) {
            q.pollFirst();
        }
    }

    private static String normalise(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
