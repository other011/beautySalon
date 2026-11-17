package ro.salon;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static ro.salon.TestSupport.as;
import static ro.salon.TestSupport.bookingBody;
import static ro.salon.TestSupport.serviceId;
import static ro.salon.TestSupport.weekday;

import io.quarkus.test.junit.QuarkusTest;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/** The complete booking journey and the rules around it. */
@QuarkusTest
class ReservationFlowTest {

    /** FREE, or the reason (BOOKED / BLOCKED / PAST). Availability is public, so no token is needed. */
    private static String slotStatus(String ignoredToken, long serviceId, LocalDate date, String time) {
        Object reason = given().queryParam("serviceId", serviceId).queryParam("date", date.toString())
                .get("/api/availability")
                .then().statusCode(200)
                .extract().path("slots.find { it.start == '" + time + ":00' }.reason");
        return reason == null ? "FREE" : reason.toString();
    }

    @Test
    void fullJourney_register_book_seeInClientAndAdminViews_thenDuplicateIsRejected() {
        var a = TestSupport.registerClient();
        var b = TestSupport.registerClient();
        String tokenA = (String) a.get("token");
        String tokenB = (String) b.get("token");
        String admin = TestSupport.adminToken();

        long solar = serviceId("Solar");
        LocalDate date = weekday(30);

        // slot is free
        Assertions.assertEquals("FREE", slotStatus(tokenA, solar, date, "15:00"));

        // client A books Solar 15:00 – 15:30
        int id = as(tokenA).body(bookingBody(solar, date, "15:00")).post("/api/reservations")
                .then().statusCode(201)
                .body("status", equalTo("PENDING"))
                .body("serviceName", equalTo("Solar"))
                .body("endDateTime", equalTo(date + "T15:30:00"))
                .body("price", notNullValue())
                .extract().path("id");

        // it appears in "My reservations" and in the admin list / calendar
        as(tokenA).get("/api/reservations").then().statusCode(200).body("items.id", hasItem(id));
        as(admin).queryParam("q", (String) a.get("email")).get("/api/reservations").then().statusCode(200)
                .body("items.id", hasItem(id));
        as(admin).queryParam("from", date.toString()).queryParam("to", date.toString()).get("/api/reservations/calendar")
                .then().statusCode(200).body("id", hasItem(id));

        // the slot is now BOOKED for everybody
        Assertions.assertEquals("BOOKED", slotStatus(tokenB, solar, date, "15:00"));

        // client B cannot take the same slot (nor an overlapping one)
        as(tokenB).body(bookingBody(solar, date, "15:00")).post("/api/reservations")
                .then().statusCode(409)
                .body("code", equalTo("SLOT_TAKEN"))
                .body("message", equalTo("The selected time slot is already booked."));

        // …but a different service at the same time is fine
        as(tokenB).body(bookingBody(serviceId("Depilare"), date, "15:00")).post("/api/reservations").then().statusCode(201);

        // client B cannot see or touch A's reservation
        as(tokenB).get("/api/reservations/" + id).then().statusCode(404);
        as(tokenB).post("/api/reservations/" + id + "/cancel").then().statusCode(404);

        // the owner cancels (more than 2h ahead) and the slot is released
        as(tokenA).post("/api/reservations/" + id + "/cancel").then().statusCode(200).body("status", equalTo("CANCELLED"));
        Assertions.assertEquals("FREE", slotStatus(tokenB, solar, date, "15:00"));
        as(tokenB).body(bookingBody(solar, date, "15:00")).post("/api/reservations").then().statusCode(201);

        // notifications were produced for client A
        as(tokenA).get("/api/notifications").then().statusCode(200)
                .body("items.message", hasItem("Rezervarea ta a fost creată cu succes."))
                .body("items.message", hasItem("Rezervarea ta a fost anulată."));
    }

    @Test
    void concurrentRequestsForTheSameSlot_onlyOneWins() throws Exception {
        long facial = serviceId("Tratament facial");
        LocalDate date = weekday(40);
        int threads = 8;
        List<String> tokens = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            tokens.add((String) TestSupport.registerClient().get("token"));
        }
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        for (String t : tokens) {
            results.add(pool.submit(() -> {
                start.await();
                return as(t).body(bookingBody(facial, date, "17:00")).post("/api/reservations").statusCode();
            }));
        }
        start.countDown();
        int created = 0;
        int conflicts = 0;
        for (Future<Integer> f : results) {
            int status = f.get();
            if (status == 201) {
                created++;
            } else if (status == 409) {
                conflicts++;
            }
        }
        pool.shutdown();
        Assertions.assertEquals(1, created, "exactly one booking must win");
        Assertions.assertEquals(threads - 1, conflicts);
    }

    @Test
    void overlappingBookingsOfALongerServiceAreRejected() {
        String token = (String) TestSupport.registerClient().get("token");
        long facial = serviceId("Tratament facial"); // 60 minutes
        LocalDate date = weekday(45);
        as(token).body(bookingBody(facial, date, "10:00")).post("/api/reservations").then().statusCode(201);
        as(token).body(bookingBody(facial, date, "10:30")).post("/api/reservations").then().statusCode(409);
        as(token).body(bookingBody(facial, date, "09:30")).post("/api/reservations").then().statusCode(409);
        as(token).body(bookingBody(facial, date, "11:00")).post("/api/reservations").then().statusCode(201);
    }

    @Test
    void invalidTimesAreRejected() {
        String token = (String) TestSupport.registerClient().get("token");
        long solar = serviceId("Solar");
        LocalDate date = weekday(35);
        as(token).body(bookingBody(solar, date, "07:00")).post("/api/reservations").then().statusCode(400).body("code", equalTo("INVALID_SLOT"));
        as(token).body(bookingBody(solar, date, "17:45")).post("/api/reservations").then().statusCode(400).body("code", equalTo("INVALID_SLOT"));
        as(token).body(bookingBody(solar, date, "18:00")).post("/api/reservations").then().statusCode(400);
        // salon break 12:00-13:00 (seeded daily break)
        as(token).body(bookingBody(solar, date, "12:00")).post("/api/reservations").then().statusCode(409).body("code", equalTo("SLOT_BLOCKED"));
        // in the past
        as(token).body(bookingBody(solar, LocalDate.now().minusDays(3), "10:00")).post("/api/reservations").then().statusCode(400);
        // closed Sunday
        LocalDate sunday = date;
        while (sunday.getDayOfWeek() != java.time.DayOfWeek.SUNDAY) {
            sunday = sunday.plusDays(1);
        }
        as(token).body(bookingBody(solar, sunday, "10:00")).post("/api/reservations").then().statusCode(400).body("code", equalTo("INVALID_SLOT"));
        // unknown service
        as(token).body(bookingBody(999999, date, "10:00")).post("/api/reservations").then().statusCode(404);
    }

    @Test
    void adminBlockedSlotsMakeTimesUnavailable() {
        String admin = TestSupport.adminToken();
        String token = (String) TestSupport.registerClient().get("token");
        long solar = serviceId("Solar");
        LocalDate date = weekday(50);
        int blockId = as(admin).body(Map.of("type", "MAINTENANCE", "startDateTime", date + "T09:00:00",
                        "endDateTime", date + "T10:00:00", "reason", "Mentenanță"))
                .post("/api/schedule/blocked").then().statusCode(201).extract().path("id");

        Assertions.assertEquals("BLOCKED", slotStatus(token, solar, date, "09:30"));
        as(token).body(bookingBody(solar, date, "09:30")).post("/api/reservations").then().statusCode(409).body("code", equalTo("SLOT_BLOCKED"));
        as(token).body(bookingBody(solar, date, "10:00")).post("/api/reservations").then().statusCode(201);

        as(admin).delete("/api/schedule/blocked/" + blockId).then().statusCode(204);
        as(token).body(bookingBody(solar, date, "09:30")).post("/api/reservations").then().statusCode(201);
    }

    @Test
    void clientsCannotCancelInsideTheCancellationWindowButAdminsCan() {
        String admin = TestSupport.adminToken();
        String token = (String) TestSupport.registerClient().get("token");
        long solar = serviceId("Solar");
        LocalDate date = weekday(5);
        int id = as(token).body(bookingBody(solar, date, "17:30")).post("/api/reservations").then().statusCode(201).extract().path("id");

        @SuppressWarnings("unchecked")
        Map<String, Object> settings = as(admin).get("/api/settings").then().statusCode(200).extract().as(Map.class);
        Map<String, Object> strict = new java.util.HashMap<>(settings);
        strict.put("cancellationHours", 720);
        as(admin).body(strict).put("/api/settings").then().statusCode(200);
        try {
            as(token).post("/api/reservations/" + id + "/cancel").then().statusCode(403).body("code", equalTo("CANCELLATION_WINDOW"));
            as(token).body(bookingBody(solar, date, "16:30")).put("/api/reservations/" + id).then().statusCode(403);
            as(admin).post("/api/reservations/" + id + "/cancel").then().statusCode(200).body("status", equalTo("CANCELLED"));
        } finally {
            as(admin).body(settings).put("/api/settings").then().statusCode(200);
        }
    }

    @Test
    void clientCanMoveOwnReservationAndOldSlotIsReleased() {
        String token = (String) TestSupport.registerClient().get("token");
        long solar = serviceId("Solar");
        LocalDate date = weekday(55);
        int id = as(token).body(bookingBody(solar, date, "10:30")).post("/api/reservations").then().statusCode(201).extract().path("id");
        as(token).body(bookingBody(solar, date, "11:00")).put("/api/reservations/" + id).then().statusCode(200)
                .body("startDateTime", equalTo(date + "T11:00:00"));
        Assertions.assertEquals("FREE", slotStatus(token, solar, date, "10:30"));
        Assertions.assertEquals("BOOKED", slotStatus(token, solar, date, "11:00"));
    }

    @Test
    void adminCanManageReservationLifecycle() {
        String admin = TestSupport.adminToken();
        var client = TestSupport.registerClient();
        long solar = serviceId("Solar");
        LocalDate date = weekday(60);

        int id = as(admin).body(Map.of("serviceId", solar, "startDateTime", date + "T10:00:00",
                        "userId", client.get("id"), "notes", "walk-in"))
                .post("/api/reservations").then().statusCode(201)
                .body("status", equalTo("CONFIRMED")).body("userId", equalTo(((Long) client.get("id")).intValue()))
                .extract().path("id");

        as(admin).post("/api/reservations/" + id + "/complete").then().statusCode(200).body("status", equalTo("COMPLETED"));
        as(admin).post("/api/reservations/" + id + "/cancel").then().statusCode(409).body("code", equalTo("INVALID_STATE"));

        int id2 = as(admin).body(Map.of("serviceId", solar, "startDateTime", date + "T11:00:00", "userId", client.get("id")))
                .post("/api/reservations").then().statusCode(201).extract().path("id");
        as(admin).post("/api/reservations/" + id2 + "/no-show").then().statusCode(200).body("status", equalTo("NO_SHOW"));
        as(admin).delete("/api/reservations/" + id2).then().statusCode(204);
        as(admin).get("/api/reservations/" + id2).then().statusCode(404);

        // everything the admin did is in the audit log
        as(admin).get("/api/audit").then().statusCode(200).body("items.message", hasItem("Rezervarea #" + id + " creată"));
    }

    @Test
    void filtersAndSortingWorkForAdmins() {
        String admin = TestSupport.adminToken();
        as(admin).queryParam("status", "CANCELLED").get("/api/reservations").then().statusCode(200)
                .body("items.status", org.hamcrest.Matchers.everyItem(equalTo("CANCELLED")));
        as(admin).queryParam("sort", "client").queryParam("dir", "asc").queryParam("size", 5).get("/api/reservations")
                .then().statusCode(200).body("items", hasSize(5)).body("total", notNullValue());
        as(admin).queryParam("q", "popescu").get("/api/reservations").then().statusCode(200)
                .body("items.clientName", org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.containsStringIgnoringCase("popescu")));
    }

    @Test
    void availabilityDaysSummaryDisablesClosedDays() {
        long solar = serviceId("Solar");
        LocalDate d = weekday(20);
        var days = given().queryParam("serviceId", solar).queryParam("month", d.toString().substring(0, 7))
                .get("/api/availability/days").then().statusCode(200).extract().jsonPath();
        String sunday = days.getList("findAll { it.available == false }.date", String.class).stream()
                .filter(s -> LocalDate.parse(s).getDayOfWeek() == java.time.DayOfWeek.SUNDAY).findFirst().orElse(null);
        Assertions.assertNotNull(sunday, "Sundays are closed");
        Assertions.assertFalse(days.getList("date").isEmpty());
    }
}
