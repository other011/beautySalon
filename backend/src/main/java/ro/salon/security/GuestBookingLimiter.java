package ro.salon.security;

import jakarta.enterprise.context.ApplicationScoped;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import ro.salon.exception.ApiException;

/** Abuse protection for the public (no account) booking endpoint: bookings per client address per hour. */
@ApplicationScoped
public class GuestBookingLimiter {

    @ConfigProperty(name = "salon.guest.max-per-ip-hour", defaultValue = "10")
    int maxPerIpPerHour;

    @ConfigProperty(name = "salon.guest.max-per-phone-day", defaultValue = "5")
    int maxPerPhonePerDay;

    private final ConcurrentHashMap<String, Deque<Instant>> hits = new ConcurrentHashMap<>();

    public int maxPerPhonePerDay() {
        return maxPerPhonePerDay;
    }

    public void checkAllowed(String ip) {
        Deque<Instant> q = hits.get(ip);
        if (q == null) {
            return;
        }
        synchronized (q) {
            prune(q);
            if (q.size() >= maxPerIpPerHour) {
                throw ApiException.tooManyRequests("Too many bookings from this address. Please try again later.");
            }
        }
    }

    public void record(String ip) {
        Deque<Instant> q = hits.computeIfAbsent(ip, k -> new ArrayDeque<>());
        synchronized (q) {
            prune(q);
            q.addLast(Instant.now());
        }
    }

    private void prune(Deque<Instant> q) {
        Instant limit = Instant.now().minus(Duration.ofHours(1));
        while (!q.isEmpty() && q.peekFirst().isBefore(limit)) {
            q.pollFirst();
        }
    }
}
