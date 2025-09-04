# BeautiBook 💅

**BeautiBook** is a modern, full-stack beauty salon booking system built with Next.js 15, TypeScript, and Prisma. It provides comprehensive appointment scheduling, staff management, customer CRM, and real-time availability management designed specifically for beauty salons and spas.

## 🚀 Quick Start

### Prerequisites

- Node.js 18.17 or later
- pnpm (recommended package manager)
- PostgreSQL database (we recommend [Neon](https://neon.tech))

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd beautibook
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your configuration:

   ```env
   # Database Configuration
   DATABASE_URL="postgresql://username:password@localhost:5432/beautibook?sslmode=require"

   # NextAuth.js Configuration
   NEXTAUTH_SECRET="your-super-secret-nextauth-key-here"
   NEXTAUTH_URL="http://localhost:3000"

   # EmailJS Configuration (optional - for email notifications)
   EMAILJS_SERVICE_ID="service_xxxxxxx"
   EMAILJS_TEMPLATE_ID="template_xxxxxxx"
   EMAILJS_PUBLIC_KEY="your_emailjs_public_key"

   # Stack Auth Configuration (optional - for advanced auth features)
   NEXT_PUBLIC_STACK_PROJECT_ID="your_stack_project_id"
   NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY="pck_your_publishable_key"
   STACK_SECRET_SERVER_KEY="ssk_your_secret_server_key"
   ```

4. **Set up the database**

   ```bash
   # Generate Prisma client
   pnpm prisma generate

   # Run database migrations
   pnpm prisma migrate dev

   # Seed the database with sample data
   pnpm prisma db seed
   ```

5. **Start the development server**

   ```bash
   pnpm dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
beautibook/
├── app/                    # Next.js 15 App Router
│   ├── admin/             # Admin dashboard pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── booking/           # Customer booking flow
│   └── staff/             # Staff management pages
├── components/            # Reusable React components
│   ├── Admin/            # Admin-specific components
│   ├── Booking/          # Booking flow components
│   ├── Calendar/         # Calendar components
│   └── Staff/            # Staff-specific components
├── lib/                  # Utility libraries and services
│   ├── services/         # Business logic services
│   └── utils/            # Helper utilities
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seeding script
└── types/                # TypeScript type definitions
```

## 🛠️ Available Scripts

| Command                   | Description                    |
| ------------------------- | ------------------------------ |
| `pnpm dev`                | Start development server       |
| `pnpm build`              | Build for production           |
| `pnpm start`              | Start production server        |
| `pnpm lint`               | Run ESLint                     |
| `pnpm prisma generate`    | Generate Prisma client         |
| `pnpm prisma migrate dev` | Run database migrations        |
| `pnpm prisma db seed`     | Seed database with sample data |
| `pnpm prisma studio`      | Open Prisma Studio             |

## 🗄️ Database Setup

BeautiBook uses PostgreSQL with Prisma ORM. Here's how to set it up:

### Option 1: Neon (Recommended)

1. Create a free account at [Neon](https://neon.tech)
2. Create a new project
3. Copy the connection string to your `.env.local` file
4. Run migrations: `pnpm prisma migrate dev`

### Option 2: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database: `createdb beautibook`
3. Update your `DATABASE_URL` in `.env.local`
4. Run migrations: `pnpm prisma migrate dev`

## 🎯 Key Features

- **📅 Smart Scheduling**: Real-time availability with timezone support (PST)
- **👥 Staff Management**: Staff profiles, availability, and custom pricing
- **💼 Customer CRM**: Guest customer tracking and booking history
- **🔒 Secure Authentication**: Role-based access control (Admin/Staff)
- **📱 Mobile-First Design**: Responsive design with touch-friendly interfaces
- **⏰ Booking Holds**: 5-minute hold system to prevent double bookings
- **📧 Email Notifications**: Automated booking confirmations
- **📊 Analytics Dashboard**: Revenue tracking and booking insights

## 🧪 Default Users

After seeding the database, you can use these test accounts:

| Role  | Email                | Password |
| ----- | -------------------- | -------- |
| Admin | admin@beautibook.com | admin123 |
| Staff | staff@beautibook.com | staff123 |

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add your environment variables in Vercel dashboard
4. Deploy!

### Manual Deployment

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (Strict mode)
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **Calendar**: React Big Calendar
- **Date Handling**: date-fns
- **Validation**: Zod
- **Email**: EmailJS

## 📝 Environment Variables Reference

| Variable              | Description                  | Required |
| --------------------- | ---------------------------- | -------- |
| `DATABASE_URL`        | PostgreSQL connection string | ✅       |
| `NEXTAUTH_SECRET`     | NextAuth.js secret key       | ✅       |
| `NEXTAUTH_URL`        | Application URL              | ✅       |
| `EMAILJS_SERVICE_ID`  | EmailJS service ID           | ❌       |
| `EMAILJS_TEMPLATE_ID` | EmailJS template ID          | ❌       |
| `EMAILJS_PUBLIC_KEY`  | EmailJS public key           | ❌       |

## 📄 License

This project is proprietary software. All rights reserved.

<!--
If you want to make this open-source later, replace the above with:

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

And add a LICENSE file to your repository.
-->

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-username/beautibook/issues) page
2. Create a new issue if your problem isn't already reported
3. Provide detailed information about your environment and the issue

---

**Built with ❤️ for beauty professionals**
