package ro.salon.security;

import jakarta.enterprise.context.RequestScoped;
import ro.salon.entity.Role;
import ro.salon.entity.User;
import ro.salon.exception.ApiException;

/** The authenticated caller of the current request, populated by {@link AuthFilter}. */
@RequestScoped
public class CurrentUser {

    private Long id;
    private Role role;
    private String name;

    void set(User user) {
        this.id = user.id;
        this.role = user.role;
        this.name = user.fullName();
    }

    public boolean isAuthenticated() {
        return id != null;
    }

    public Long id() {
        if (id == null) {
            throw ApiException.unauthorized("Authentication required.");
        }
        return id;
    }

    public Role role() {
        return role;
    }

    public String name() {
        return name;
    }

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }

    /** Loads the persistent entity of the caller. */
    public User user() {
        User u = User.findById(id());
        if (u == null) {
            throw ApiException.unauthorized("Authentication required.");
        }
        return u;
    }
}
