package ro.salon.security;

/** Strips markup from free text before it is stored (defence in depth; the UI also escapes on output). */
public final class Sanitizer {

    private Sanitizer() {
    }

    public static String clean(String input) {
        if (input == null) {
            return null;
        }
        return input.replaceAll("<[^>]*>", "").replace("<", "").replace(">", "").trim();
    }
}
