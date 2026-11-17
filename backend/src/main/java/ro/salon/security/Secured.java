package ro.salon.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import ro.salon.entity.Role;

/**
 * Marks an endpoint (or a whole resource class) as requiring authentication.
 * With no roles any authenticated user is accepted; otherwise the user must hold one of the listed roles.
 * Endpoints without this annotation are public. A method level annotation overrides the class level one.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
public @interface Secured {
    Role[] value() default {};
}
