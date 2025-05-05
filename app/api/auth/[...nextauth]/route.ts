// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials"; // We'll start with simple credentials

// Define the authentication options
const authOptions = {
    providers: [
        // --- Credentials Provider (Example for Email/Password) ---
        // For a simple journaling app, you might just have one 'user'.
        // Replace with your actual validation logic later if needed.
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                // Define the fields your login form will have
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                _req
            ) {
                // --- !!! IMPORTANT SECURITY WARNING !!! ---
                // This is a VERY basic example for a SINGLE USER personal app.
                // It checks against a hardcoded password stored in environment variables.
                // DO NOT use this approach for multi-user apps or production without
                // proper password hashing and database lookups.

                // Get the expected password from environment variables
                const expectedPassword = process.env.SECRET_PASSWORD;

                if (!expectedPassword) {
                    console.error("SECRET_PASSWORD environment variable is not set!");
                    return null; // Return null if config is missing
                }

                // Check if the provided password matches the expected one
                if (credentials?.password === expectedPassword) {
                    // If match, return a user object.
                    // The 'id' and 'name'/'email' are used by NextAuth.
                    // For a single-user app, these can be static.
                    return { id: "1", name: "User", email: "user@example.com" };
                } else {
                    // If passwords don't match, return null.
                    // NextAuth will handle this as a failed login attempt.
                    console.log("Incorrect password attempt");
                    return null;
                }
            },
        }),
        // --- Add other providers here if needed (e.g., Google, GitHub) ---
        // GoogleProvider({
        //   clientId: process.env.GOOGLE_CLIENT_ID!,
        //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        // }),
    ],
    // --- Session Strategy ---
    // Using JWT for session management is common with credentials provider
    session: {
        strategy: "jwt" as const, // Explicitly type the strategy
    },
    // --- Secret ---
    // Uses the NEXTAUTH_SECRET environment variable you set up earlier.
    secret: process.env.NEXTAUTH_SECRET,

    // --- Custom Pages (Optional) ---
    // You can specify custom pages for sign-in, sign-out, error, etc.
    pages: {
      signIn: '/login', // We will create this page later
    //   // error: '/auth/error', // Optional error page
    },
};

// Initialize NextAuth with the options
const handler = NextAuth(authOptions);

// Export the handler for GET and POST requests as required by Next.js App Router
export { handler as GET, handler as POST };
