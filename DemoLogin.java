import java.io.Console;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Scanner;

public final class DemoLogin {
    private static final String DEMO_USERNAME = "clear2026";
    private static final char[] DEMO_PASSWORD = "drop123".toCharArray();

    private DemoLogin() {}

    public static boolean authenticate(String username, char[] password) {
        if (username == null || password == null) {
            return false;
        }

        byte[] suppliedPassword = new String(password).getBytes(StandardCharsets.UTF_8);
        byte[] expectedPassword = new String(DEMO_PASSWORD).getBytes(StandardCharsets.UTF_8);
        return DEMO_USERNAME.equals(username)
            && MessageDigest.isEqual(expectedPassword, suppliedPassword);
    }

    public static void main(String[] args) {
        Console console = System.console();
        String username;
        char[] password;

        if (console != null) {
            username = console.readLine("Demo username: ");
            password = console.readPassword("Demo password: ");
        } else {
            Scanner scanner = new Scanner(System.in);
            System.out.print("Demo username: ");
            username = scanner.nextLine();
            System.out.print("Demo password: ");
            password = scanner.nextLine().toCharArray();
        }

        boolean authenticated = authenticate(username, password);
        if (password != null) {
            Arrays.fill(password, '\0');
        }
        System.out.println(authenticated ? "Login successful." : "Invalid demo credentials.");
    }
}
