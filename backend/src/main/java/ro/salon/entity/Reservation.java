package ro.salon.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "reservations")
public class Reservation extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    /** The account holder; null for a guest booking (made without an account). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    public User user;

    public String guestFirstName;
    public String guestLastName;
    public String guestPhone;
    /** Normalised phone of the client (account or guest); visits are counted per phone number. */
    public String phoneNorm;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id")
    public SalonService service;

    public LocalDateTime startDatetime;
    public LocalDateTime endDatetime;

    @Enumerated(EnumType.STRING)
    public ReservationStatus status = ReservationStatus.PENDING;

    public String notes;
    /** Price snapshot taken when the reservation was made. */
    public BigDecimal price = BigDecimal.ZERO;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;

    public boolean isGuest() {
        return user == null;
    }

    public String clientName() {
        return user != null ? user.fullName() : (guestFirstName + " " + guestLastName).trim();
    }

    public String clientPhone() {
        return user != null ? user.phone : guestPhone;
    }

    public void assignTo(User u) {
        this.user = u;
        this.phoneNorm = u.phoneNorm;
        this.guestFirstName = null;
        this.guestLastName = null;
        this.guestPhone = null;
    }

    @PrePersist
    void onCreate() {
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
