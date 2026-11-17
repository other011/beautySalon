package ro.salon;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static ro.salon.TestSupport.as;
import static ro.salon.TestSupport.bookingBody;
import static ro.salon.TestSupport.serviceId;
import static ro.salon.TestSupport.weekday;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.persistence.PersistenceException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import ro.salon.entity.Reservation;
import ro.salon.entity.ReservationStatus;
import ro.salon.entity.SalonService;
import ro.salon.entity.User;

@QuarkusTest
class AdminAndSecurityTest {

    private static Map<String, Object> serviceBody(String name) {
        return Map.of("name", name, "description", "Descriere", "durationMinutes", 40, "price", 99.5,
                "benefits", List.of("A", "B"), "equipment", List.of("Aparat"), "active", true);
    }

    // ---------------------------------------------------------------- authorization

    @Test
    void clientsCannotUseAdminEndpoints() {
        String client = TestSupport.clientToken();
        as(client).get("/api/users").then().statusCode(403);
        as(client).get("/api/stats/dashboard").then().statusCode(403);
        as(client).get("/api/audit").then().statusCode(403);
        as(client).get("/api/schedule/blocked").then().statusCode(403);
        as(client).body(serviceBody("Hack")).post("/api/services").then().statusCode(403);
        as(client).put("/api/schedule").then().statusCode(403);
        as(client).put("/api/settings").then().statusCode(403);
        as(client).post("/api/reservations/1/confirm").then().statusCode(403);
        as(client).delete("/api/reservations/1").then().statusCode(403);
    }

    @Test
    void anonymousUsersCanOnlyUsePublicEndpoints() {
        given().get("/api/services").then().statusCode(200).body("$", hasSize(4));
        given().get("/api/settings").then().statusCode(200).body("salonName", notNullValue());
        given().get("/api/schedule").then().statusCode(200).body("hours", hasSize(7)).body("blockedSlots", hasSize(0));
        given().get("/api/users").then().statusCode(401);
        given().get("/api/stats/dashboard").then().statusCode(401);
    }

    @Test
    void clientsCannotReadOtherClientsData() {
        var other = TestSupport.registerClient();
        String client = TestSupport.clientToken();
        as(client).get("/api/users/" + other.get("id")).then().statusCode(404);
        as(client).body(Map.of("firstName", "X", "lastName", "Y", "email", "x@example.com", "phone", "+40722333444"))
                .put("/api/users/" + other.get("id")).then().statusCode(404);
    }

    @Test
    void clientsCannotPromoteThemselves() {
        var me = TestSupport.registerClient();
        String token = (String) me.get("token");
        as(token).body(Map.of("firstName", "A", "lastName", "B", "email", me.get("email"), "phone", "+40722333444", "active", false))
                .put("/api/users/" + me.get("id")).then().statusCode(200).body("role", equalTo("CLIENT")).body("active", equalTo(true));
    }

    // ---------------------------------------------------------------- service management

    @Test
    void adminManagesServices() {
        String admin = TestSupport.adminToken();
        int id = as(admin).body(serviceBody("Manichiură")).post("/api/services").then().statusCode(201)
                .body("name", equalTo("Manichiură")).body("benefits", hasSize(2)).extract().path("id");

        as(admin).body(serviceBody("Manichiură gel")).put("/api/services/" + id).then().statusCode(200).body("name", equalTo("Manichiură gel"));

        // deactivate -> hidden from the public catalogue, still visible to admin
        as(admin).post("/api/services/" + id + "/deactivate").then().statusCode(200).body("active", equalTo(false));
        given().get("/api/services").then().body("name", not(hasItem("Manichiură gel")));
        as(admin).queryParam("all", true).get("/api/services").then().body("name", hasItem("Manichiură gel"));
        given().get("/api/services/" + id).then().statusCode(404);
        as(admin).post("/api/services/" + id + "/activate").then().statusCode(200).body("active", equalTo(true));

        // never booked -> hard delete
        as(admin).delete("/api/services/" + id).then().statusCode(200).body("deleted", equalTo(true));
        as(admin).get("/api/services/" + id).then().statusCode(404);
    }

    @Test
    void serviceWithHistoryIsSoftDeleted() {
        String admin = TestSupport.adminToken();
        String client = (String) TestSupport.registerClient().get("token");
        int id = as(admin).body(serviceBody("Masaj")).post("/api/services").then().statusCode(201).extract().path("id");
        as(client).body(bookingBody(id, weekday(70), "10:00")).post("/api/reservations").then().statusCode(201);

        as(admin).delete("/api/services/" + id).then().statusCode(200)
                .body("deleted", equalTo(false)).body("deactivated", equalTo(true));
        as(admin).get("/api/services/" + id).then().statusCode(200).body("active", equalTo(false));
        // inactive services cannot be booked
        as(client).body(bookingBody(id, weekday(71), "10:00")).post("/api/reservations").then().statusCode(400).body("code", equalTo("SERVICE_INACTIVE"));
    }

    @Test
    void serviceValidation() {
        String admin = TestSupport.adminToken();
        as(admin).body(Map.of("name", "", "durationMinutes", 0, "price", -1)).post("/api/services")
                .then().statusCode(400).body("code", equalTo("VALIDATION_ERROR"));
    }

    // ---------------------------------------------------------------- schedule

    @Test
    void changingOpeningHoursChangesAvailability() {
        String admin = TestSupport.adminToken();
        long solar = serviceId("Solar");
        LocalDate friday = weekday(80);
        while (friday.getDayOfWeek() != java.time.DayOfWeek.FRIDAY) {
            friday = friday.plusDays(1);
        }
        var original = as(admin).get("/api/schedule").then().statusCode(200).extract().jsonPath().getList("hours", Map.class);

        try {
            as(admin).body(Map.of("hours", List.of(Map.of("dayOfWeek", 5, "openingTime", "09:00", "closingTime", "11:00", "active", true))))
                    .put("/api/schedule").then().statusCode(200);
            given().queryParam("serviceId", solar).queryParam("date", friday.toString()).get("/api/availability")
                    .then().statusCode(200).body("slots", hasSize(4)).body("closingTime", equalTo("11:00:00"));

            as(admin).body(Map.of("hours", List.of(Map.of("dayOfWeek", 5, "openingTime", "09:00", "closingTime", "11:00", "active", false))))
                    .put("/api/schedule").then().statusCode(200);
            given().queryParam("serviceId", solar).queryParam("date", friday.toString()).get("/api/availability")
                    .then().statusCode(200).body("open", equalTo(false)).body("slots", hasSize(0));

            as(admin).body(Map.of("hours", List.of(Map.of("dayOfWeek", 5, "openingTime", "12:00", "closingTime", "11:00", "active", true))))
                    .put("/api/schedule").then().statusCode(400).body("code", equalTo("INVALID_HOURS"));
        } finally {
            Map<?, ?> fri = original.stream().filter(h -> ((Number) h.get("dayOfWeek")).intValue() == 5).findFirst().orElseThrow();
            as(admin).body(Map.of("hours", List.of(fri))).put("/api/schedule").then().statusCode(200);
        }
    }

    // ---------------------------------------------------------------- database level protection

    @Test
    void databaseRejectsOverlappingReservationsEvenWithoutTheApplicationChecks() {
        LocalDateTime start = weekday(90).atTime(9, 0);
        Long[] ids = QuarkusTransaction.requiringNew().call(() -> {
            User u = User.findByEmail(TestSupport.CLIENT);
            SalonService s = SalonService.find("name", "Solar").firstResult();
            persist(u, s, start, start.plusMinutes(30), ReservationStatus.CONFIRMED);
            return new Long[] {u.id, s.id};
        });

        // overlapping live reservation → exclusion constraint
        Assertions.assertThrows(PersistenceException.class, () -> QuarkusTransaction.requiringNew().run(() -> {
            persist(User.findById(ids[0]), SalonService.findById(ids[1]), start.plusMinutes(15), start.plusMinutes(45),
                    ReservationStatus.PENDING);
            Reservation.getEntityManager().flush();
        }));
        // a cancelled reservation does not occupy the slot
        QuarkusTransaction.requiringNew().run(() -> persist(User.findById(ids[0]), SalonService.findById(ids[1]),
                start, start.plusMinutes(30), ReservationStatus.CANCELLED));
        // invalid interval → check constraint
        Assertions.assertThrows(PersistenceException.class, () -> QuarkusTransaction.requiringNew().run(() -> {
            persist(User.findById(ids[0]), SalonService.findById(ids[1]), start.plusHours(3), start.plusHours(2),
                    ReservationStatus.PENDING);
            Reservation.getEntityManager().flush();
        }));
    }

    private static void persist(User u, SalonService s, LocalDateTime start, LocalDateTime end, ReservationStatus st) {
        Reservation r = new Reservation();
        r.user = u;
        r.service = s;
        r.startDatetime = start;
        r.endDatetime = end;
        r.status = st;
        r.price = BigDecimal.TEN;
        r.persist();
    }

    // ---------------------------------------------------------------- stats, clients, GDPR

    @Test
    void dashboardAndReportExposeStatistics() {
        String admin = TestSupport.adminToken();
        as(admin).get("/api/stats/dashboard").then().statusCode(200)
                .body("today.total", notNullValue())
                .body("totalClients", greaterThanOrEqualTo(1))
                .body("perDay", hasSize(14))
                .body("perWeek", hasSize(8))
                .body("perMonth", hasSize(12))
                .body("popularServices", notNullValue());
        for (String period : List.of("today", "week", "month", "year")) {
            as(admin).queryParam("period", period).get("/api/stats/report").then().statusCode(200)
                    .body("period", equalTo(period)).body("revenue", notNullValue()).body("estimatedRevenue", notNullValue());
        }
        as(admin).queryParam("period", "decade").get("/api/stats/report").then().statusCode(400);
        String csv = as(admin).queryParam("period", "year").get("/api/stats/export").then().statusCode(200)
                .contentType("text/csv").extract().asString();
        Assertions.assertTrue(csv.contains("id,data,ora_start"));
    }

    @Test
    void adminSearchesClients() {
        String admin = TestSupport.adminToken();
        as(admin).queryParam("q", "popescu").get("/api/users").then().statusCode(200)
                .body("items.lastName", hasItem("Popescu")).body("items[0].visits", notNullValue());
        int id = as(admin).body(Map.of("firstName", "Walk", "lastName", "In", "email", "walkin" + System.nanoTime() + "@example.com",
                "phone", "+40722111222")).post("/api/users").then().statusCode(201).extract().path("id");
        as(admin).get("/api/users/" + id).then().statusCode(200).body("role", equalTo("CLIENT"));
    }

    @Test
    void gdprExportAndErasure() {
        var me = TestSupport.registerClient();
        String token = (String) me.get("token");
        String admin = TestSupport.adminToken();
        long solar = serviceId("Solar");
        as(token).body(bookingBody(solar, weekday(75), "13:30")).post("/api/reservations").then().statusCode(201);

        as(token).get("/api/users/" + me.get("id") + "/export").then().statusCode(200)
                .body("profile.email", equalTo(me.get("email"))).body("reservations", hasSize(1));

        as(token).delete("/api/users/" + me.get("id")).then().statusCode(204);
        // the account is closed, the token no longer works and the data is anonymised
        as(token).get("/api/auth/me").then().statusCode(401);
        as(admin).get("/api/users/" + me.get("id")).then().statusCode(200)
                .body("active", equalTo(false)).body("email", equalTo("deleted-" + me.get("id") + "@deleted.invalid")).body("phone", org.hamcrest.Matchers.nullValue());
        // future booking was cancelled and the slot is free again
        given().queryParam("serviceId", solar).queryParam("date", weekday(75).toString()).get("/api/availability")
                .then().body("slots.find { it.start == '13:30:00' }.available", equalTo(true));
    }

    @Test
    void passwordChangeRequiresCurrentPassword() {
        var me = TestSupport.registerClient();
        String token = (String) me.get("token");
        as(token).body(Map.of("currentPassword", "Wrong123!", "newPassword", "NouaParola1")).post("/api/users/" + me.get("id") + "/password")
                .then().statusCode(400).body("code", equalTo("WRONG_PASSWORD"));
        as(token).body(Map.of("currentPassword", "Parola123!", "newPassword", "NouaParola1")).post("/api/users/" + me.get("id") + "/password")
                .then().statusCode(204);
        TestSupport.login((String) me.get("email"), "NouaParola1");
    }

    @Test
    void healthAndOpenApiAreAvailable() {
        given().get("/api/health").then().statusCode(200).body("status", equalTo("UP"));
        given().get("/api/openapi").then().statusCode(200);
    }
}

