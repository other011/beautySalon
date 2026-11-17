package ro.salon.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalTime;

@Entity
@Table(name = "business_hours")
public class BusinessHours extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    /** ISO day of week: 1 = Monday ... 7 = Sunday. */
    public int dayOfWeek;
    public LocalTime openingTime;
    public LocalTime closingTime;
    public boolean active = true;

    public static BusinessHours forDay(int dayOfWeek) {
        return find("dayOfWeek", dayOfWeek).firstResult();
    }
}
