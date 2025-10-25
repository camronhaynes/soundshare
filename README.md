# soundshare

> Your audio, your vibe. A retro-aesthetic audio streaming platform.

## 🎵 What is soundshare?

soundshare is an audio sharing platform focused on doing one thing well: allowing users to upload and stream their sound clips, loops, and recordings with a nostalgic Windows XP-inspired aesthetic.

## ✨ Current Features

- **Skeumorphic Design** - Deep shadows, glass-morphism, and retro vibes
- **Custom Color Palette** - Dark plum purple, forest green, with neon pink/blue/seafoam accents
- **Homepage** - Beautiful landing page with animated waveform visualization
- **User Collection Pages** - Dynamic routes for each user at `/[username]`
- **Database Schema** - Ready for NextAuth + audio track storage (Prisma)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📁 Project Structure

```
soundshare/
├── app/                    # Next.js App Router
│   ├── [username]/        # Dynamic user collection pages
│   ├── globals.css        # Tailwind + custom skeumorphic styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # Reusable React components (coming soon)
├── lib/                   # Utilities and helpers (coming soon)
├── prisma/
│   └── schema.prisma      # Database schema
├── public/                # Static assets
├── BACKEND_SPEC.md        # Detailed backend architecture
├── PROJECT_SPEC.md        # Project overview and roadmap
└── tailwind.config.ts     # Custom color palette + utilities
```

## 🎨 Design System

### Colors

- **Primary**: Dark plum purple (`plum-*`)
- **Secondary**: Forest green (`forest-*`)
- **Accents**:
  - Neon pink: `#ff6ec7`
  - Neon blue: `#4dd9ff`
  - Seafoam: `#7fffd4`

### Components

Custom Tailwind classes available:

- `.glass-card` - Skeumorphic glass card with backdrop blur
- `.skeu-button` - Primary button with plum gradient
- `.skeu-button-secondary` - Secondary button with forest gradient
- `.neon-text-pink/blue/seafoam` - Text with neon glow effect
- `.waveform-container` - Container for waveform visualizations
- `.text-gradient-plum/forest/neon` - Gradient text effects

## 📋 Next Steps

See [PROJECT_SPEC.md](./PROJECT_SPEC.md) for the full roadmap.

### Immediate TODO:
1. Set up NextAuth with OAuth providers (Google, GitHub)
2. Set up Cloudflare R2 for audio storage
3. Build upload functionality
4. Implement waveform generation
5. Create audio player component

## 📚 Documentation

- [PROJECT_SPEC.md](./PROJECT_SPEC.md) - Full project specification
- [BACKEND_SPEC.md](./BACKEND_SPEC.md) - Backend architecture deep dive

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Prisma + PostgreSQL (to be connected)
- **Auth**: NextAuth.js (to be set up)
- **Storage**: Cloudflare R2 (to be set up)
- **Deployment**: Vercel (ready)

## 📝 Environment Variables

Copy `.env.example` to `.env.local` and fill in the values when setting up auth and storage.

---

Built with Next.js + nostalgia 💜
