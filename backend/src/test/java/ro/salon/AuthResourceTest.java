package ro.salon;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static ro.salon.TestSupport.as;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

@QuarkusTest
class AuthResourceTest {

    private static Map<String, Object> registration(String email, String password) {
        return Map.of("firstName", "Maria", "lastName", "Popescu", "email", email, "phone", "+40721123456",
                "password", password, "acceptTerms", true);
    }

    private static String freshEmail() {
        return "u" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
    }

    @Test
    void registerCreatesClientAndReturnsToken() {
        String email = freshEmail();
        given().contentType(ContentType.JSON).body(registration(email, "Parola123!"))
                .post("/api/auth/register")
                .then().statusCode(201)
                .body("token", notNullValue())
                .body("user.email", equalTo(email))
                .body("user.role", equalTo("CLIENT"))
                .body("user", not(hasKey("passwordHash")));
    }

    @Test
    void registerRejectsDuplicateEmailWith409() {
        String email = freshEmail();
        given().contentType(ContentType.JSON).body(registration(email, "Parola123!")).post("/api/auth/register").then().statusCode(201);
        given().contentType(ContentType.JSON).body(registration(email.toUpperCase(), "Parola123!"))
                .post("/api/auth/register")
                .then().statusCode(409)
                .body("code", equalTo("EMAIL_TAKEN"))
                .body("status", equalTo(409))
                .body("timestamp", notNullValue());
    }

    @Test
    void registerValidatesInput() {
        given().contentType(ContentType.JSON)
                .body(Map.of("firstName", "", "lastName", "X", "email", "not-an-email", "phone", "abc",
                        "password", "weak", "acceptTerms", false))
                .post("/api/auth/register")
                .then().statusCode(400)
                .body("code", equalTo("VALIDATION_ERROR"))
                .body("errors", hasKey("email"))
                .body("errors", hasKey("phone"))
                .body("errors", hasKey("password"))
                .body("errors", hasKey("firstName"));
    }

    @Test
    void passwordIsNotStoredInPlainText() {
        String email = freshEmail();
        given().contentType(ContentType.JSON).body(registration(email, "Parola123!")).post("/api/auth/register").then().statusCode(201);
        String hash = io.quarkus.narayana.jta.QuarkusTransaction.requiringNew()
                .call(() -> ro.salon.entity.User.findByEmail(email).passwordHash);
        org.junit.jupiter.api.Assertions.assertTrue(hash.startsWith("$2"), "BCrypt hash expected");
        org.junit.jupiter.api.Assertions.assertFalse(hash.contains("Parola123!"));
    }

    @Test
    void loginSucceedsAndMeReturnsProfile() {
        String token = TestSupport.clientToken();
        as(token).get("/api/auth/me").then().statusCode(200).body("email", equalTo(TestSupport.CLIENT));
    }

    @Test
    void loginWithWrongPasswordIs401() {
        given().contentType(ContentType.JSON).body(Map.of("email", TestSupport.CLIENT, "password", "Wrong123!"))
                .post("/api/auth/login")
                .then().statusCode(401).body("message", equalTo("Invalid email or password."));
    }

    @Test
    void loginIsRateLimitedPerEmail() {
        String email = freshEmail();
        for (int i = 0; i < 5; i++) {
            given().contentType(ContentType.JSON).body(Map.of("email", email, "password", "Wrong123!"))
                    .post("/api/auth/login").then().statusCode(401);
        }
        given().contentType(ContentType.JSON).body(Map.of("email", email, "password", "Wrong123!"))
                .post("/api/auth/login").then().statusCode(429).header("Retry-After", notNullValue());
    }

    @Test
    void protectedEndpointsNeedAValidToken() {
        given().get("/api/auth/me").then().statusCode(401);
        given().auth().oauth2("garbage.token.value").get("/api/auth/me").then().statusCode(401).body("code", equalTo("INVALID_TOKEN"));
        given().get("/api/reservations").then().statusCode(401);
    }

    @Test
    void forgotPasswordNeverRevealsWhetherAccountExists() {
        given().contentType(ContentType.JSON).body(Map.of("email", freshEmail())).post("/api/auth/forgot-password").then().statusCode(202);
        given().contentType(ContentType.JSON).body(Map.of("email", TestSupport.CLIENT)).post("/api/auth/forgot-password").then().statusCode(202);
    }

    @Test
    void passwordResetFlowWorksOnce() {
        String email = freshEmail();
        given().contentType(ContentType.JSON).body(registration(email, "Parola123!")).post("/api/auth/register").then().statusCode(201);
        given().contentType(ContentType.JSON).body(Map.of("email", email)).post("/api/auth/forgot-password").then().statusCode(202);
        String token = CapturingResetNotifier.lastToken;
        org.junit.jupiter.api.Assertions.assertNotNull(token);

        given().contentType(ContentType.JSON).body(Map.of("token", token, "password", "NouaParola1"))
                .post("/api/auth/reset-password").then().statusCode(204);
        given().contentType(ContentType.JSON).body(Map.of("email", email, "password", "NouaParola1"))
                .post("/api/auth/login").then().statusCode(200);
        // token cannot be reused
        given().contentType(ContentType.JSON).body(Map.of("token", token, "password", "AltaParola1"))
                .post("/api/auth/reset-password").then().statusCode(400).body("message", containsString("invalid or has expired"));
    }
}
