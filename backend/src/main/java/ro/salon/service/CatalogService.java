package ro.salon.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.List;
import ro.salon.dto.ServiceDto;
import ro.salon.entity.Reservation;
import ro.salon.entity.SalonService;
import ro.salon.exception.ApiException;
import ro.salon.security.CurrentUser;
import ro.salon.security.Sanitizer;

/** Management of the treatment catalogue. */
@ApplicationScoped
public class CatalogService {

    public record DeleteResult(boolean deleted, boolean deactivated) {
    }

    @Inject
    CurrentUser current;

    @Inject
    AuditService audit;

    @Transactional
    public List<ServiceDto.Detail> list(boolean includeInactive) {
        List<SalonService> all = includeInactive && current.isAdmin()
                ? SalonService.list("order by displayOrder, id")
                : SalonService.list("active = true order by displayOrder, id");
        return all.stream().map(ServiceDto.Detail::of).toList();
    }

    @Transactional
    public ServiceDto.Detail get(Long id) {
        SalonService s = SalonService.findById(id);
        if (s == null || (!s.active && !current.isAdmin())) {
            throw ApiException.notFound("Service not found.");
        }
        return ServiceDto.Detail.of(s);
    }

    @Transactional
    public ServiceDto.Detail create(ServiceDto.Request req) {
        SalonService s = new SalonService();
        apply(s, req);
        s.persist();
        audit.log("SERVICE_CREATED", "Service", s.id, "Serviciul „" + s.name + "” creat");
        return ServiceDto.Detail.of(s);
    }

    @Transactional
    public ServiceDto.Detail update(Long id, ServiceDto.Request req) {
        SalonService s = find(id);
        apply(s, req);
        audit.log("SERVICE_UPDATED", "Service", s.id, "Serviciul „" + s.name + "” modificat");
        return ServiceDto.Detail.of(s);
    }

    @Transactional
    public ServiceDto.Detail setActive(Long id, boolean active) {
        SalonService s = find(id);
        s.active = active;
        audit.log("SERVICE_UPDATED", "Service", s.id, "Serviciul „" + s.name + "” " + (active ? "reactivat" : "dezactivat"));
        return ServiceDto.Detail.of(s);
    }

    /** Hard-deletes only services that were never booked; otherwise they are deactivated to keep history intact. */
    @Transactional
    public DeleteResult delete(Long id) {
        SalonService s = find(id);
        if (Reservation.count("service.id", id) > 0) {
            s.active = false;
            audit.log("SERVICE_UPDATED", "Service", s.id, "Serviciul „" + s.name + "” dezactivat (are rezervări)");
            return new DeleteResult(false, true);
        }
        s.delete();
        audit.log("SERVICE_DELETED", "Service", id, "Serviciul „" + s.name + "” șters");
        return new DeleteResult(true, false);
    }

    private SalonService find(Long id) {
        SalonService s = SalonService.findById(id);
        if (s == null) {
            throw ApiException.notFound("Service not found.");
        }
        return s;
    }

    private void apply(SalonService s, ServiceDto.Request req) {
        s.name = Sanitizer.clean(req.name());
        s.description = req.description() == null ? "" : Sanitizer.clean(req.description());
        s.durationMinutes = req.durationMinutes();
        s.price = req.price();
        s.benefits = ServiceDto.join(clean(req.benefits()));
        s.equipment = ServiceDto.join(clean(req.equipment()));
        s.sections = ServiceDto.writeSections(req.sections() == null ? List.of() : req.sections().stream()
                .map(sec -> new ServiceDto.Section(Sanitizer.clean(sec.title()), clean(sec.items()))).toList());
        s.imageUrl = req.imageUrl() == null || req.imageUrl().isBlank() ? null : req.imageUrl().trim();
        s.icon = req.icon();
        if (req.displayOrder() != null) {
            s.displayOrder = req.displayOrder();
        }
        if (req.active() != null) {
            s.active = req.active();
        }
    }

    private static List<String> clean(List<String> items) {
        return items == null ? List.of() : items.stream().map(Sanitizer::clean).filter(i -> i != null && !i.isEmpty()).toList();
    }
}
