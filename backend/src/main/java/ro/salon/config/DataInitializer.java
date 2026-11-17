package ro.salon.config;

import io.quarkus.elytron.security.common.BcryptUtil;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import ro.salon.dto.ServiceDto;
import ro.salon.entity.BlockedSlot;
import ro.salon.entity.BusinessHours;
import ro.salon.entity.Notification;
import ro.salon.entity.Reservation;
import ro.salon.entity.ReservationStatus;
import ro.salon.entity.Role;
import ro.salon.entity.SalonService;
import ro.salon.entity.User;
import ro.salon.service.SettingsService;

/**
 * Creates the data every installation needs (opening hours, the four initial services) and, when
 * SEED_DEMO_DATA=true (default in dev), demo accounts and reservations.
 */
@ApplicationScoped
public class DataInitializer {

    private static final Logger LOG = Logger.getLogger(DataInitializer.class);

    @ConfigProperty(name = "salon.seed.enabled")
    boolean seedDemo;


    @Inject
    SettingsService settings;

    @Transactional
    void onStart(@Observes StartupEvent ev) {
        if (BusinessHours.count() == 0) {
            seedHours();
        }
        if (SalonService.count() == 0) {
            seedServices();
        }
        if (seedDemo && User.count() == 0) {
            seedDemoData();
            LOG.info("Demo data created: admin@salon.ro / client@example.com");
        }
    }

    private void seedHours() {
        int[][] hours = {{1, 9, 18}, {2, 9, 18}, {3, 9, 18}, {4, 9, 20}, {5, 9, 18}, {6, 10, 15}};
        for (int[] h : hours) {
            hours(h[0], h[1], h[2], true);
        }
        hours(7, 10, 14, false); // Sunday: closed
    }

    private void hours(int day, int open, int close, boolean active) {
        BusinessHours bh = new BusinessHours();
        bh.dayOfWeek = day;
        bh.openingTime = LocalTime.of(open, 0);
        bh.closingTime = LocalTime.of(close, 0);
        bh.active = active;
        bh.persist();
    }

    private void seedServices() {
        service(1, "Solar", "sun", 30, "50.00",
                "Ședințe de solar vertical, într-un mediu curat și confortabil, pentru un bronz uniform și natural, "
                        + "adaptat tipului tău de piele.",
                List.of("Bronz uniform și natural", "Stimulează producția de vitamina D", "Ședință rapidă, de doar 30 de minute",
                        "Intensitate adaptată fototipului tău"),
                List.of("Solar vertical cu lămpi UV de ultimă generație", "Sistem de ventilație și răcire", "Ochelari de protecție de unică folosință"),
                new ServiceDto.Section("Recomandări", List.of("Începe cu ședințe scurte și păstrează 48 de ore între ele",
                        "Folosește cremă de bronz și protecție pentru buze", "Hidratează-te bine înainte și după ședință")),
                new ServiceDto.Section("Contraindicații", List.of("Sarcină", "Afecțiuni dermatologice active",
                        "Medicamente fotosensibilizante", "Antecedente de cancer cutanat")));
        service(2, "Depilare", "feather", 30, "120.00",
                "Depilare definitivă cu laser sau clasică cu ceară, în funcție de zona dorită și de preferințele tale, "
                        + "cu rezultate fine și durabile.",
                List.of("Piele netedă pentru perioade lungi", "Reducerea firelor încarnate", "Procedură rapidă și confortabilă",
                        "Produse hipoalergenice"),
                List.of("Laser cu diodă 808 nm cu sistem de răcire", "Ceară caldă și film wax hipoalergenic"),
                new ServiceDto.Section("Tipuri de depilare", List.of("Epilare laser cu diodă", "Ceară caldă", "Ceară film (wax)")),
                new ServiceDto.Section("Zone disponibile", List.of("Picioare", "Axile", "Bikini", "Brațe", "Față", "Spate")));
        service(3, "Tratament facial", "sparkles", 60, "150.00",
                "Tratamente faciale personalizate, de la curățare profundă la terapii anti-aging, pentru un ten luminos, "
                        + "hidratat și sănătos.",
                List.of("Ten curat, luminos și uniform", "Hidratare profundă", "Reducerea semnelor de îmbătrânire",
                        "Plan personalizat în funcție de nevoile pielii"),
                List.of("Aparat Hydrafacial", "Radiofrecvență fracționată", "Peeling ultrasonic", "Dermapen pentru microneedling"),
                new ServiceDto.Section("Tipuri de tratamente", List.of("Curățare facială profundă", "Hydrafacial",
                        "Microneedling", "Peeling chimic", "Terapie anti-aging cu radiofrecvență")),
                new ServiceDto.Section("Tipuri de ten", List.of("Ten gras / acneic", "Ten uscat", "Ten mixt", "Ten matur", "Ten sensibil")));
        service(4, "Remodelare corporală", "waves", 45, "200.00",
                "Programe de remodelare corporală non-invazive pentru reducerea celulitei și a țesutului adipos localizat, "
                        + "cu tehnologii moderne și rezultate vizibile.",
                List.of("Reducerea circumferinței zonelor tratate", "Piele mai fermă și mai netedă", "Îmbunătățirea circulației",
                        "Fără timp de recuperare"),
                List.of("Cavitație ultrasonică 40 kHz", "Radiofrecvență multipolară", "Presoterapie", "Vacuum terapie"),
                new ServiceDto.Section("Zone tratate", List.of("Abdomen", "Coapse", "Fese", "Brațe", "Flancuri")),
                new ServiceDto.Section("Contraindicații", List.of("Sarcină și alăptare", "Stimulator cardiac",
                        "Afecțiuni hepatice sau renale", "Tromboză venoasă")));
    }

    private void service(int order, String name, String icon, int minutes, String price, String description,
                         List<String> benefits, List<String> equipment, ServiceDto.Section... sections) {
        SalonService s = new SalonService();
        s.name = name;
        s.icon = icon;
        s.durationMinutes = minutes;
        s.price = new BigDecimal(price);
        s.description = description;
        s.benefits = ServiceDto.join(benefits);
        s.equipment = ServiceDto.join(equipment);
        s.sections = ServiceDto.writeSections(List.of(sections));
        s.displayOrder = order;
        s.persist();
    }

    // ------------------------------------------------------------------ demo data

    private void seedDemoData() {


        user("Admin", "Salon", "admin@salon.ro", "+40700000000", "Admin123!", Role.ADMIN);
        User demo = user("Ana", "Client", "client@example.com", "+40721000001", "Client123!", Role.CLIENT);
        List<User> clients = List.of(
                demo,
                user("Maria", "Popescu", "maria.popescu@example.com", "+40721000002", "Client123!", Role.CLIENT),
                user("Andrei", "Ionescu", "andrei.ionescu@example.com", "+40721000003", "Client123!", Role.CLIENT),
                user("Elena", "Dumitrescu", "elena.dumitrescu@example.com", "+40721000004", "Client123!", Role.CLIENT),
                user("Mihai", "Stan", "mihai.stan@example.com", "+40721000005", "Client123!", Role.CLIENT));

        BlockedSlot lunch = new BlockedSlot();
        lunch.type = BlockedSlot.Type.BREAK;
        lunch.reason = "Pauză de masă";
        lunch.startDatetime = LocalDate.now().minusYears(1).atTime(12, 0);
        lunch.endDatetime = LocalDate.now().minusYears(1).atTime(13, 0);
        lunch.recurrence = BlockedSlot.Recurrence.DAILY;
        lunch.persist();

        List<SalonService> services = SalonService.list("order by displayOrder");
        LocalDateTime now = settings.now();
        LocalTime[] times = {LocalTime.of(10, 0), LocalTime.of(14, 0), LocalTime.of(16, 0)};
        int n = 0;
        for (int offset = -21; offset <= 14; offset++) {
            LocalDate day = now.toLocalDate().plusDays(offset);
            if (day.getDayOfWeek() == DayOfWeek.SUNDAY) {
                continue;
            }
            BusinessHours bh = BusinessHours.forDay(day.getDayOfWeek().getValue());
            for (int i = 0; i < times.length; i++) {
                SalonService svc = services.get(Math.floorMod(offset + i, services.size()));
                LocalDateTime start = day.atTime(times[i]);
                LocalDateTime end = start.plusMinutes(svc.durationMinutes);
                if (end.toLocalTime().isAfter(bh.closingTime) || end.toLocalDate().isAfter(day)) {
                    continue;
                }
                n++;
                if (offset % 3 == 0 && i == 2) {
                    continue; // leave some free days
                }
                Reservation r = new Reservation();
                r.assignTo(clients.get(Math.floorMod(n, clients.size())));
                r.service = svc;
                r.startDatetime = start;
                r.endDatetime = end;
                r.price = svc.price;
                r.status = statusFor(end, now, n);
                r.persist();
            }
        }

        // bookings made without an account: the same person is recognised by phone number, whatever the formatting
        SalonService solar = services.get(0);
        guestBooking(solar, now, -12, "Cristina", "Radu", "0733 444 555", ReservationStatus.COMPLETED);
        guestBooking(solar, now, -5, "Cristina", "Radu", "+40733444555", ReservationStatus.COMPLETED);
        guestBooking(solar, now, 3, "Cristina", "Radu", "+40 733 444 555", ReservationStatus.PENDING);
        guestBooking(solar, now, -2, "Ion", "Radu", "0744 100 200", ReservationStatus.COMPLETED); // same surname, other person

        notification(demo, "Bun venit!", "Contul tău a fost creat. Poți face prima rezervare oricând.", "INFO");
        notification(demo, "Rezervare confirmată", "Rezervarea ta a fost confirmată.", "RESERVATION_CONFIRMED");
    }

    private void guestBooking(SalonService svc, LocalDateTime now, int dayOffset, String first, String last, String phone,
                              ReservationStatus status) {
        LocalDate day = now.toLocalDate().plusDays(dayOffset);
        while (day.getDayOfWeek() == DayOfWeek.SUNDAY) {
            day = day.plusDays(1);
        }
        Reservation r = new Reservation();
        r.guestFirstName = first;
        r.guestLastName = last;
        r.guestPhone = phone;
        r.phoneNorm = ro.salon.security.Phones.normalize(phone);
        r.service = svc;
        r.startDatetime = day.atTime(11, 0);
        r.endDatetime = r.startDatetime.plusMinutes(svc.durationMinutes);
        r.price = svc.price;
        r.status = status;
        r.persist();
    }

    private static ReservationStatus statusFor(LocalDateTime end, LocalDateTime now, int n) {
        if (end.isBefore(now)) {
            if (n % 11 == 0) {
                return ReservationStatus.NO_SHOW;
            }
            return n % 7 == 0 ? ReservationStatus.CANCELLED : ReservationStatus.COMPLETED;
        }
        return n % 4 == 0 ? ReservationStatus.PENDING : ReservationStatus.CONFIRMED;
    }

    private User user(String first, String last, String email, String phone, String password, Role role) {
        User u = new User();
        u.firstName = first;
        u.lastName = last;
        u.email = email;
        u.applyPhone(phone);
        u.passwordHash = BcryptUtil.bcryptHash(password);
        u.role = role;
        u.consentAt = LocalDateTime.now();
        u.persist();
        return u;
    }

    private void notification(User u, String title, String message, String type) {
        Notification n = new Notification();
        n.userId = u.id;
        n.title = title;
        n.message = message;
        n.type = type;
        n.persist();
    }
}
