package ro.salon.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import ro.salon.entity.SalonService;

public final class ServiceDto {

    private ServiceDto() {
    }

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public record Section(@NotBlank @Size(max = 150) String title, @NotNull List<@Size(max = 300) String> items) {
    }

    public record Detail(
            Long id,
            String name,
            String description,
            int durationMinutes,
            BigDecimal price,
            List<String> benefits,
            List<String> equipment,
            List<Section> sections,
            String imageUrl,
            String icon,
            int displayOrder,
            boolean active) {

        public static Detail of(SalonService s) {
            return new Detail(s.id, s.name, s.description, s.durationMinutes, s.price,
                    lines(s.benefits), lines(s.equipment), parseSections(s.sections),
                    s.imageUrl, s.icon, s.displayOrder, s.active);
        }
    }

    public record Request(
            @NotBlank @Size(max = 150) String name,
            @Size(max = 4000) String description,
            @Min(5) @Max(480) int durationMinutes,
            @NotNull @DecimalMin("0.00") BigDecimal price,
            List<@Size(max = 300) String> benefits,
            List<@Size(max = 300) String> equipment,
            List<@jakarta.validation.Valid Section> sections,
            @Size(max = 500) String imageUrl,
            @Size(max = 40) String icon,
            Integer displayOrder,
            Boolean active) {
    }

    public static List<String> lines(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        return Arrays.stream(text.split("\\r?\\n")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    public static String join(List<String> items) {
        return items == null ? "" : String.join("\n", items.stream().map(String::trim).filter(s -> !s.isEmpty()).toList());
    }

    public static List<Section> parseSections(String json) {
        try {
            return json == null || json.isBlank() ? List.of() : MAPPER.readValue(json, new TypeReference<List<Section>>() { });
        } catch (Exception e) {
            return List.of();
        }
    }

    public static String writeSections(List<Section> sections) {
        try {
            return MAPPER.writeValueAsString(sections == null ? List.of() : sections);
        } catch (Exception e) {
            return "[]";
        }
    }
}
