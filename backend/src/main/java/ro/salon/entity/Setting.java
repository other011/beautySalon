package ro.salon.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "settings")
public class Setting extends PanacheEntityBase {

    @Id
    @Column(name = "key")
    public String key;

    @Column(name = "value")
    public String value;

    public Setting() {
    }

    public Setting(String key, String value) {
        this.key = key;
        this.value = value;
    }
}
