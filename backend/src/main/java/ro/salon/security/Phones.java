package ro.salon.security;

/** Phone normalisation: the identity of a client is the number, never the (non-unique) name. */
public final class Phones {

    private Phones() {
    }

    /** Digits only; "00" prefix dropped; Romanian national numbers (07xx…) get the 40 country code. */
    public static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String d = raw.replaceAll("\\D", "");
        if (d.startsWith("00")) {
            d = d.substring(2);
        }
        if (d.length() == 10 && d.startsWith("0")) {
            d = "40" + d.substring(1);
        }
        return d.isEmpty() ? null : d;
    }
}
