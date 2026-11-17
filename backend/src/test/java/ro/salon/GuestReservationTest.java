package ro.salon;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static ro.salon.TestSupport.as;
import static ro.salon.TestSupport.bookingBody;
import static ro.salon.TestSupport.serviceId;
import static ro.salon.TestSupport.weekday;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;

/** Booking without an account, and client recognition by phone number. */
@QuarkusTest
class GuestReservationTest {

    /** A fresh, valid Romanian mobile number: [national format, international format]. */
    private static String[] phone() {
        String tail = String.format("%07d", ThreadLocalRandom.current().nextInt(10_000_000));
        return new String[] {"073" + tail.substring(0, 1) + " " + tail.substring(1, 4) + " " + tail.substring(4), "+4073" + tail};
    }

    private static Map<String, Object> guest(long service, LocalDate date, String time, String first, String last, String phone) {
        Map<String, Object> body = new HashMap<>();
        body.put("serviceId", service);
        body.put("startDateTime", date + "T" + time + ":00");
        body.put("firstName", first);
        body.put("lastName", last);
        body.put("phone", phone);
        body.put("acceptTerms", true);
        return body;
    }

    private static ValidatableResponse book(Map<String, Object> body) {
        return given().contentType(ContentType.JSON).body(body).post("/api/guest/reservations").then();
    }

    @Test
    void guestCanBookWithoutAccount_andAdminSeesItAsGuest() {
        long solar = serviceId("Solar");
        LocalDate date = weekday(31);
        String[] p = phone();
        int id = book(guest(solar, date, "11:00", "Cristina", "Radu", p[0]))
                .statusCode(201)
                .body("status", equalTo("PENDING"))
                .body("serviceName", equalTo("Solar"))
                .body("endDateTime", equalTo(date + "T11:30:00"))
                .body("$", not(hasKey("clientEmail")))
                .extract().path("id");

        String admin = TestSupport.adminToken();
        as(admin).get("/api/reservations/" + id).then().statusCode(200)
                .body("guest", equalTo(true))
                .body("userId", nullValue())
                .body("clientName", equalTo("Cristina Radu"))
                .body("clientPhone", equalTo(p[0]))
                .body("visitCount", equalTo(0));

        // admin filter: only bookings without account
        as(admin).queryParam("guest", true).queryParam("size", 200).get("/api/reservations").then().statusCode(200)
                .body("items.id", hasItem(id)).body("items.guest", everyItem(equalTo(true)));
        as(admin).queryParam("guest", false).queryParam("size", 200).get("/api/reservations").then().statusCode(200)
                .body("items.id", not(hasItem(id)));
        // searchable by phone in another format
        as(admin).queryParam("q", p[1]).get("/api/reservations").then().statusCode(200).body("items.id", hasItem(id));
        as(admin).queryParam("q", p[0].replace(" ", "")).get("/api/reservations").then().statusCode(200).body("items.id", hasItem(id));
        // appears in the admin calendar
        as(admin).queryParam("from", date.toString()).queryParam("to", date.toString()).get("/api/reservations/calendar")
                .then().statusCode(200).body("id", hasItem(id));

        // the slot is taken for everybody, accounts included
        as(TestSupport.clientToken()).body(bookingBody(solar, date, "11:00")).post("/api/reservations").then().statusCode(409);
        book(guest(solar, date, "11:00", "Alt", "Om", phone()[0])).statusCode(409).body("code", equalTo("SLOT_TAKEN"));

        // clients never see guest bookings; anonymous users cannot list anything
        as(TestSupport.clientToken()).get("/api/reservations/" + id).then().statusCode(404);
        given().get("/api/reservations").then().statusCode(401);
    }

    @Test
    void accountBookingBlocksTheSlotForGuests() {
        long solar = serviceId("Solar");
        LocalDate date = weekday(33);
        String token = (String) TestSupport.registerClient().get("token");
        as(token).body(bookingBody(solar, date, "11:30")).post("/api/reservations").then().statusCode(201);
        book(guest(solar, date, "11:30", "Guest", "One", phone()[0])).statusCode(409).body("code", equalTo("SLOT_TAKEN"));
    }

    @Test
    void guestBookingIsValidated() {
        long solar = serviceId("Solar");
        LocalDate date = weekday(34);
        book(guest(solar, date, "11:00", "", "Radu", "abc")).statusCode(400)
                .body("errors", hasKey("firstName")).body("errors", hasKey("phone"));
        Map<String, Object> noConsent = guest(solar, date, "11:00", "A", "B", phone()[0]);
        noConsent.put("acceptTerms", false);
        book(noConsent).statusCode(400).body("errors", hasKey("acceptTerms"));
        book(guest(solar, date, "07:00", "A", "B", phone()[0])).statusCode(400).body("code", equalTo("INVALID_SLOT"));
        book(guest(solar, date, "12:00", "A", "B", phone()[0])).statusCode(409).body("code", equalTo("SLOT_BLOCKED"));
        book(guest(solar, LocalDate.now().minusDays(2), "11:00", "A", "B", phone()[0])).statusCode(400);
        book(guest(999999L, date, "11:00", "A", "B", phone()[0])).statusCode(404);
    }

    @Test
    void visitsAreCountedByPhoneNumber_notByName() {
        long solar = serviceId("Solar");
        String admin = TestSupport.adminToken();
        String[] p = phone();

        // same person, number written two ways -> same client; same name but another number -> another client
        int a = book(guest(solar, weekday(35), "11:00", "Maria", "Ionescu", p[0])).statusCode(201).extract().path("id");
        int b = book(guest(solar, weekday(36), "11:00", "Maria", "Ionescu", p[1])).statusCode(201).extract().path("id");
        int other = book(guest(solar, weekday(37), "11:00", "Maria", "Ionescu", phone()[0])).statusCode(201).extract().path("id");
        int c = book(guest(solar, weekday(38), "11:00", "M.", "Ionescu", p[1].replace("+40", "0040"))).statusCode(201).extract().path("id");

        // nothing counted until the client actually came (COMPLETED)
        as(admin).get("/api/reservations/" + c).then().body("visitCount", equalTo(0));
        as(admin).post("/api/reservations/" + a + "/complete").then().statusCode(200).body("visitCount", equalTo(1));
        as(admin).post("/api/reservations/" + b + "/complete").then().statusCode(200).body("visitCount", equalTo(2));
        as(admin).post("/api/reservations/" + other + "/no-show").then().statusCode(200).body("visitCount", equalTo(0));
        as(admin).get("/api/reservations/" + c).then().body("visitCount", equalTo(2));
        as(admin).get("/api/reservations/" + other).then().body("visitCount", equalTo(0));

        // guest list aggregates by phone: one entry for the 3 bookings of the same number
        as(admin).queryParam("q", p[1]).get("/api/users/guests").then().statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].visits", equalTo(2)).body("[0].bookings", equalTo(3)).body("[0].hasAccount", equalTo(false));

        // when the person later registers with that number, the history is theirs
        given().contentType(ContentType.JSON)
                .body(Map.of("firstName", "Maria", "lastName", "Ionescu", "email", "maria" + System.nanoTime() + "@example.com",
                        "phone", p[1], "password", "Parola123!", "acceptTerms", true))
                .post("/api/auth/register").then().statusCode(201);
        as(admin).queryParam("q", p[1].substring(3)).get("/api/users").then().statusCode(200)
                .body("items[0].visits", equalTo(2));
        as(admin).queryParam("q", p[1]).get("/api/users/guests").then().body("[0].hasAccount", equalTo(true));
    }

    @Test
    void guestsAreLimitedPerPhoneNumber() {
        long solar = serviceId("Solar");
        String[] p = phone();
        for (int i = 0; i < 5; i++) {
            book(guest(solar, weekday(47 + 7 * i), "09:00", "Spam", "Bot", p[0])).statusCode(201); // distinct weeks
        }
        book(guest(solar, weekday(82), "09:00", "Spam", "Bot", p[0])).statusCode(429).body("code", equalTo("TOO_MANY_REQUESTS"));
    }

    @Test
    void guestsCannotManageBookingsOrReachAdminData() {
        given().get("/api/guest/reservations").then().statusCode(405);
        given().contentType(ContentType.JSON).get("/api/users/guests").then().statusCode(401);
        as(TestSupport.clientToken()).get("/api/users/guests").then().statusCode(403);
        as(TestSupport.adminToken()).get("/api/users/guests").then().statusCode(200).body("$", notNullValue());
    }
}
