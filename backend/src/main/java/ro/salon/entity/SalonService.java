package ro.salon.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** A bookable treatment (table "services"). Named SalonService to avoid clashing with the service layer. */
@Entity
@Table(name = "services")
public class SalonService extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public String name;
    public String description = "";
    public int durationMinutes = 30;
    public BigDecimal price = BigDecimal.ZERO;
    /** One item per line. */
    public String benefits = "";
    /** One item per line. */
    public String equipment = "";
    /** JSON array of {title, items[]} blocks (recommendations, contraindications, zones, ...). */
    public String sections = "[]";
    public String imageUrl;
    public String icon;
    public int displayOrder;
    public boolean active = true;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
