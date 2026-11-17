package ro.salon.dto;

import java.time.LocalDateTime;
import java.util.List;
import ro.salon.entity.AuditLog;
import ro.salon.entity.Notification;

public final class CommonDto {

    private CommonDto() {
    }

    public record Page<T>(List<T> items, int page, int size, long total) {
    }

    public record NotificationView(Long id, String title, String message, String type, Long reservationId,
                                   boolean read, LocalDateTime createdAt) {
        public static NotificationView of(Notification n) {
            return new NotificationView(n.id, n.title, n.message, n.type, n.reservationId, n.seen, n.createdAt);
        }
    }

    public record NotificationList(List<NotificationView> items, long unread) {
    }

    public record AuditView(Long id, String actorName, String action, String entityType, Long entityId,
                            String message, LocalDateTime createdAt) {
        public static AuditView of(AuditLog a) {
            return new AuditView(a.id, a.actorName, a.action, a.entityType, a.entityId, a.message, a.createdAt);
        }
    }
}
