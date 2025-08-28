import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "./services/PrismaService";

export const authOptions: NextAuthOptions = {
  // Note: PrismaAdapter disabled when using CredentialsProvider with JWT
  // adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email.toLowerCase(),
            },
            include: {
              staff: true, // Include staff info if they are staff
            },
          });

          if (!user) {
            return null;
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );

          if (!isPasswordValid) {
            return null;
          }

          // Return user data for session
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.staff?.name || user.email,
            staffId: user.staff?.id || null,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Include user role and staff info in JWT
      if (user) {
        token.role = user.role;
        token.staffId = user.staffId;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      // Include role and staff info in session from JWT token
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as UserRole;
        session.user.staffId = token.staffId as string | null;
        session.user.name = token.name as string;
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      // Redirect based on user role after login
      if (url.startsWith("/api/auth")) {
        return baseUrl;
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`✅ User signed in: ${user.email} (${user.role})`);
    },
    async signOut({ session, token }) {
      console.log(`👋 User signed out: ${session?.user?.email}`);
    },
  },
  debug: process.env.NODE_ENV === "development",
};
