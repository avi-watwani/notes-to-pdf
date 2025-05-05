// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions"; // Import from the new file

// Initialize NextAuth with the options
const handler = NextAuth(authOptions);

// Export the handler for GET and POST requests as required by Next.js App Router
export { handler as GET, handler as POST };
