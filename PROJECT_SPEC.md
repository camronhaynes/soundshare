# soundshare - Project Specification

## Vision

**soundshare** is an audio sharing platform focused on doing one thing exceptionally well: allowing users to upload and stream their sound clips, loops, and recordings with a clean, nostalgic aesthetic.

## Phase 1: Web App MVP

### Core Features

1. **User Authentication**
   - OAuth-based login (Google, GitHub, Discord)
   - User accounts required from day one (spam prevention)
   - User profile with avatar and display name

2. **Audio Upload**
   - Support formats: MP3, WAV, FLAC, OGG
   - File size limit: 50MB per file
   - Automatic waveform generation on upload
   - Metadata extraction (duration, format, file size)

3. **Audio Streaming**
   - Primary focus: web-based streaming (not downloads)
   - Waveform visualization (Windows XP Windows Media Player aesthetic)
   - Clean playback controls
   - Responsive audio player

4. **User Collections**
   - Each user has their own collection page
   - Clean URL structure: `soundshare.com/user/username`
   - List view of all uploaded tracks
   - Individual track pages with sharable links

### Nice-to-Have (Future Iterations)
- BPM detection and display
- Key detection and switching/transposition
- Quick download functionality
- Individual sound event deep-linking
- Social features (likes, comments, follows)

---

## Phase 2: iOS App (Swift)

- Native iOS experience
- Sync with web platform
- Mobile upload and streaming
- Eventually evolve into full social audio platform

---

## Technical Stack

### Frontend
- **Next.js 14+** (App Router)
- **React** with TypeScript
- **TailwindCSS** for styling
- **Wavesurfer.js** or similar for waveform rendering

### Backend
- **Next.js API Routes** + Server Actions
- **NextAuth.js (Auth.js v5)** for OAuth authentication
- **Prisma ORM** for database queries
- **Vercel Postgres** (or Neon/Supabase) for data storage
- **Cloudflare R2** for audio file storage (zero egress fees)

### Deployment
- **Vercel** for hosting and deployment
- **Cloudflare R2** for CDN and storage

**See [BACKEND_SPEC.md](./BACKEND_SPEC.md) for detailed backend architecture.**

---

## Data Model

### Users
- `id` (UUID)
- `email` (string)
- `name` (string)
- `username` (string, unique)
- `avatar` (string, URL)
- `createdAt` (datetime)

### Tracks
- `id` (UUID)
- `userId` (foreign key)
- `title` (string)
- `filename` (string)
- `fileUrl` (string, R2 URL)
- `waveformUrl` (string, R2 URL)
- `duration` (integer, seconds)
- `fileSize` (integer, bytes)
- `format` (enum: mp3, wav, flac, ogg)
- `bpm` (integer, nullable)
- `key` (string, nullable)
- `createdAt` (datetime)

---

## User Flow

1. **New User**
   - Lands on homepage
   - Clicks "Sign In with Google/GitHub"
   - Creates username on first login
   - Redirected to their empty collection page

2. **Upload Flow**
   - User clicks "Upload" button
   - Selects audio file(s) from device
   - Files upload to R2, waveforms generate server-side
   - Track appears in user's collection
   - Shareable link generated automatically

3. **Playback Flow**
   - User or visitor navigates to `soundshare.com/user/username`
   - Sees list of tracks with waveforms
   - Clicks track to play
   - Waveform animates during playback
   - Can share individual track links

---

## Design Aesthetic

**Inspiration:** Windows XP Windows Media Player, early SoundCloud

**Visual Style:**
- Clean, minimal interface
- Nostalgic waveform visualizations
- Soft gradients or glass-morphism effects
- Focus on the audio content, not cluttered UI
- High contrast for readability

**Color Palette:** TBD (suggestions: blues/purples for retro feel)

---

## Success Metrics (MVP)

- Users can sign up and authenticate seamlessly
- Users can upload audio files without friction
- Audio streams smoothly in browser
- Waveforms render accurately and look great
- URLs are clean and shareable
- Platform is fast and responsive

---

## Future Roadmap

### v1.1
- BPM detection
- Key detection
- Download functionality

### v1.2
- User profiles with bio
- Public/private track settings
- Search functionality

### v1.3
- Social features (follows, likes)
- Comments on tracks
- Playlist creation

### v2.0
- iOS app (Swift)
- Mobile upload and streaming
- Push notifications
