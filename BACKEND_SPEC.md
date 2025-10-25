# soundshare - Backend Architecture Specification

## Stack Overview

The soundshare backend is built entirely within the **Next.js** ecosystem, leveraging modern TypeScript patterns and serverless architecture.

**Core Technologies:**
- Next.js 14+ (App Router, Server Actions, API Routes)
- NextAuth.js v5 (OAuth Authentication)
- Prisma ORM (Database Layer)
- Vercel Postgres (Database)
- Cloudflare R2 (Object Storage)

---

## 1. Authentication: NextAuth.js (Auth.js v5)

### What It Does
NextAuth handles all user authentication, session management, and OAuth flows.

### Configuration
- **Providers:** Google, GitHub, Discord OAuth
- **Session Strategy:** JWT-based (serverless-friendly)
- **Database:** Stores users in Postgres via Prisma adapter

### File Structure
```
app/
├── api/
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts    # NextAuth configuration
└── lib/
    └── auth.ts             # Auth helper functions
```

### Example Configuration (`app/api/auth/[...nextauth]/route.ts`)
```typescript
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      session.user.id = user.id
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### Environment Variables
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
```

---

## 2. Database: Prisma + Vercel Postgres

### What It Does
- **Prisma:** Type-safe ORM that generates TypeScript types from your schema
- **Vercel Postgres:** Managed PostgreSQL database (serverless-compatible)

### Prisma Schema (`prisma/schema.prisma`)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// NextAuth required tables
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  username      String?   @unique
  createdAt     DateTime  @default(now())

  accounts      Account[]
  sessions      Session[]
  tracks        Track[]
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// soundshare core models
model Track {
  id           String   @id @default(cuid())
  userId       String
  title        String
  filename     String
  fileUrl      String   // R2 URL
  waveformUrl  String?  // R2 URL for waveform JSON
  duration     Int      // seconds
  fileSize     Int      // bytes
  format       Format
  bpm          Int?
  key          String?
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
}

enum Format {
  MP3
  WAV
  FLAC
  OGG
}
```

### Database Setup
```bash
# Initialize Prisma
npx prisma init

# Create migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio (visual database browser)
npx prisma studio
```

### Prisma Client Instance (`lib/prisma.ts`)
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Example Queries
```typescript
// Create a track
const track = await prisma.track.create({
  data: {
    userId: session.user.id,
    title: "My Loop",
    filename: "loop.mp3",
    fileUrl: "https://r2.url/loop.mp3",
    duration: 120,
    fileSize: 5242880,
    format: "MP3"
  }
})

// Get user's tracks
const tracks = await prisma.track.findMany({
  where: { userId: session.user.id },
  orderBy: { createdAt: 'desc' }
})

// Get track with user info
const track = await prisma.track.findUnique({
  where: { id: trackId },
  include: { user: true }
})
```

---

## 3. File Storage: Cloudflare R2

### What It Does
Stores audio files and waveform JSON data with zero egress fees (free streaming).

### Why R2 Over S3
| Feature | Cloudflare R2 | AWS S3 |
|---------|---------------|--------|
| Storage | $0.015/GB/mo | $0.023/GB/mo |
| Egress (Downloads) | **FREE** | $0.09/GB |
| API | S3-compatible | Native |
| Use Case | Perfect for streaming | Better for enterprise |

**For soundshare:** If users stream 1TB of audio/month, R2 costs **$0**, S3 costs **$90**.

### Setup
1. Create R2 bucket in Cloudflare dashboard
2. Generate API token with read/write permissions
3. Install AWS SDK (R2 is S3-compatible)

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### R2 Client Configuration (`lib/r2.ts`)
```typescript
import { S3Client } from "@aws-sdk/client-s3"

export const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!, // e.g., https://accountid.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const R2_BUCKET_NAME = "soundshare-audio"
```

### Environment Variables
```
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

### Upload Function (`lib/upload.ts`)
```typescript
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { r2Client, R2_BUCKET_NAME } from "./r2"

export async function uploadToR2(
  file: File,
  key: string // e.g., "audio/user123/track456.mp3"
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  )

  // Return public URL
  return `${process.env.R2_PUBLIC_URL}/${key}`
}
```

---

## 4. Audio Processing: Waveform Generation

### Server-Side Approach
Generate waveform data when users upload files to avoid client-side processing lag.

### Library: `audiowaveform` (CLI) or `peaks.js` (Node.js)

#### Option A: `audiowaveform` (Recommended for production)
```bash
# Install via Homebrew (macOS) or apt (Linux)
brew install audiowaveform
```

```typescript
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function generateWaveform(inputPath: string, outputPath: string) {
  await execAsync(
    `audiowaveform -i ${inputPath} -o ${outputPath} --pixels-per-second 20 --bits 8`
  )
}
```

#### Option B: `wavesurfer.js` backend decoder (JavaScript-only)
```bash
npm install wavesurfer.js
```

```typescript
// Process on server, return JSON peaks data
// (Implementation varies - simpler for MVP)
```

### Waveform Storage
- Store generated JSON in R2 bucket: `waveforms/user123/track456.json`
- Frontend fetches and renders using Wavesurfer.js

---

## 5. API Architecture

### Next.js App Router Patterns

#### Server Actions (Preferred for MVP)
```typescript
// app/actions/upload.ts
'use server'

import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { uploadToR2 } from "@/lib/upload"

export async function uploadTrack(formData: FormData) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")

  const file = formData.get("file") as File
  const title = formData.get("title") as string

  // Upload to R2
  const fileUrl = await uploadToR2(file, `audio/${session.user.id}/${file.name}`)

  // Save to database
  const track = await prisma.track.create({
    data: {
      userId: session.user.id,
      title,
      filename: file.name,
      fileUrl,
      duration: 0, // TODO: extract from audio metadata
      fileSize: file.size,
      format: file.name.split('.').pop()!.toUpperCase() as any
    }
  })

  return track
}
```

#### API Routes (For REST endpoints)
```typescript
// app/api/tracks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const track = await prisma.track.findUnique({
    where: { id: params.id },
    include: { user: true }
  })

  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 })
  }

  return NextResponse.json(track)
}
```

---

## 6. Deployment: Vercel

### Why Vercel
- **Zero-config** deployment for Next.js
- **Automatic HTTPS** and CDN
- **Serverless functions** for API routes
- **Free tier** generous enough for MVP
- **Vercel Postgres** integration built-in

### Deployment Steps
1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Push to `main` branch → auto-deploys

### Environment Variables (Vercel Dashboard)
```
DATABASE_URL=          # Vercel Postgres connection string
NEXTAUTH_URL=          # Production URL
NEXTAUTH_SECRET=       # Generate with: openssl rand -base64 32
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_URL=
```

---

## 7. File Structure

```
soundshare/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── tracks/
│   │       └── [id]/route.ts
│   ├── actions/
│   │   └── upload.ts               # Server actions
│   ├── (auth)/
│   │   └── signin/page.tsx
│   ├── [username]/
│   │   └── page.tsx                # User collection page
│   ├── layout.tsx
│   └── page.tsx                    # Homepage
├── components/
│   ├── AudioPlayer.tsx
│   ├── UploadButton.tsx
│   └── Waveform.tsx
├── lib/
│   ├── auth.ts
│   ├── prisma.ts
│   ├── r2.ts
│   └── upload.ts
├── prisma/
│   └── schema.prisma
├── public/
├── .env.local
├── next.config.js
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

---

## 8. Security Considerations

### File Upload Validation
- **Max file size:** 50MB (enforced client + server side)
- **Allowed MIME types:** `audio/mpeg`, `audio/wav`, `audio/flac`, `audio/ogg`
- **Filename sanitization:** Strip special characters, prevent path traversal

### Authentication
- **Session expiration:** 30 days (configurable)
- **CSRF protection:** Built into NextAuth
- **Rate limiting:** TODO (use Vercel rate limiting or Upstash)

### R2 Security
- **Bucket policy:** Public read, authenticated write only
- **Presigned URLs:** Use for private tracks (future feature)

---

## 9. Performance Optimization

### Database
- **Indexes:** Added on `userId` and `createdAt` in Track model
- **Connection pooling:** Prisma handles automatically in serverless

### Audio Streaming
- **R2 CDN:** Built-in edge caching
- **Lazy loading:** Only load waveforms when tracks are visible
- **Progressive streaming:** Use HTML5 `<audio>` streaming (no full download)

### Waveform Rendering
- **Pre-generated data:** Avoid client-side FFT processing
- **Canvas rendering:** Wavesurfer.js uses canvas for performance
- **Throttling:** Debounce seek bar interactions

---

## 10. Development Workflow

```bash
# Install dependencies
npm install

# Set up database
npx prisma migrate dev

# Run development server
npm run dev

# Generate Prisma client after schema changes
npx prisma generate

# View database
npx prisma studio

# Build for production
npm run build
```

---

## Next Steps

See [PROJECT_SPEC.md](./PROJECT_SPEC.md) for implementation roadmap.
