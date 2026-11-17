package ro.salon.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public String firstName;
    public String lastName;
    public String email;
    public String phone;
    /** Normalised phone number (digits, country code): the key that links a person's visits. */
    public String phoneNorm;
    public String passwordHash;

    @Enumerated(EnumType.STRING)
    public Role role = Role.CLIENT;

    public boolean active = true;
    public LocalDateTime consentAt;
    public String resetTokenHash;
    public LocalDateTime resetExpires;
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

    public String fullName() {
        return (firstName + " " + lastName).trim();
    }

    public void applyPhone(String raw) {
        this.phone = raw == null ? null : raw.trim();
        this.phoneNorm = ro.salon.security.Phones.normalize(raw);
    }

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }

    public static User findByEmail(String email) {
        return find("lower(email) = ?1", email.trim().toLowerCase()).firstResult();
    }
}
