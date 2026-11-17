package ro.salon;

import static io.restassured.RestAssured.given;

import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

/** Small helpers shared by the integration tests. */
public final class TestSupport {

    private TestSupport() {
    }

    public static final String ADMIN = "admin@salon.ro";
    public static final String ADMIN_PASSWORD = "Admin123!";
    public static final String CLIENT = "client@example.com";
    public static final String CLIENT_PASSWORD = "Client123!";

    public static String login(String email, String password) {
        return given().contentType(ContentType.JSON)
                .body(Map.of("email", email, "password", password))
                .post("/api/auth/login")
                .then().statusCode(200)
                .extract().path("token");
    }

    public static RequestSpecification as(String token) {
        return given().auth().oauth2(token).contentType(ContentType.JSON);
    }

    public static String adminToken() {
        return login(ADMIN, ADMIN_PASSWORD);
    }

    public static String clientToken() {
        return login(CLIENT, CLIENT_PASSWORD);
    }

    /** Registers a brand new client and returns {token, id, email}. */
    public static Map<String, Object> registerClient() {
        String email = "t" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        var res = given().contentType(ContentType.JSON)
                .body(Map.of("firstName", "Test", "lastName", "User", "email", email, "phone", "+40722333444",
                        "password", "Parola123!", "acceptTerms", true))
                .post("/api/auth/register")
                .then().statusCode(201)
                .extract();
        return Map.of("token", res.path("token"), "id", ((Number) res.path("user.id")).longValue(), "email", email);
    }

    /** A bookable weekday (Mon–Fri) at least {@code minDaysAhead} days from now, beyond the demo data window. */
    public static LocalDate weekday(int minDaysAhead) {
        LocalDate d = LocalDate.now().plusDays(minDaysAhead);
        while (d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY) {
            d = d.plusDays(1);
        }
        return d;
    }

    public static long serviceId(String name) {
        return ((Number) given().get("/api/services").then().statusCode(200)
                .extract().path("find { it.name == '" + name + "' }.id")).longValue();
    }

    public static Map<String, Object> bookingBody(long serviceId, LocalDate date, String time) {
        return Map.of("serviceId", serviceId, "startDateTime", date + "T" + time + ":00", "notes", "test");
    }
}
