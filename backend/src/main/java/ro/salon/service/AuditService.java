package ro.salon.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.util.List;
import ro.salon.dto.CommonDto;
import ro.salon.entity.AuditLog;
import ro.salon.security.CurrentUser;

@ApplicationScoped
public class AuditService {

    @Inject
    CurrentUser current;

    @Inject
    EntityManager em;

    /** Records an administrative action (joins the caller's transaction). */
    @Transactional
    public void log(String action, String entityType, Long entityId, String message) {
        AuditLog a = new AuditLog();
        a.actorId = current.isAuthenticated() ? current.id() : null;
        a.actorName = current.isAuthenticated() ? current.name() : "System";
        a.action = action;
        a.entityType = entityType;
        a.entityId = entityId;
        a.message = message;
        a.persist();
    }

    @Transactional
    public CommonDto.Page<CommonDto.AuditView> list(int page, int size) {
        long total = AuditLog.count();
        List<CommonDto.AuditView> items = em
                .createQuery("select a from AuditLog a order by a.createdAt desc, a.id desc", AuditLog.class)
                .setFirstResult(page * size)
                .setMaxResults(size)
                .getResultList().stream().map(CommonDto.AuditView::of).toList();
        return new CommonDto.Page<>(items, page, size, total);
    }
}
