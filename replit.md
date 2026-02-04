# ArtVerse - Virtual Art Gallery & Marketplace

## Overview
ArtVerse is an immersive art platform featuring a virtual 3D-like gallery, art store, auction system, and artist profiles. Built with React, Express, and PostgreSQL.

## Architecture

### Frontend (React + Vite)
- **Pages**: Home, Gallery, Store, Auctions, Artists, Artist Profile, Artist Dashboard
- **Components**: Sidebar navigation, Cart system, Artwork cards/dialogs
- **State Management**: Zustand for cart, TanStack Query for server state
- **Styling**: Tailwind CSS with Shadcn UI components

### Backend (Express + PostgreSQL)
- **API Routes**: RESTful endpoints for artworks, artists, auctions, orders
- **Storage**: PostgreSQL with Drizzle ORM
- **Seeding**: Automatic database seeding with sample data

## Key Features

### Virtual Gallery (3D Maze Experience)
- **3D Walkable Maze**: Full Three.js-powered first-person walking experience
- **First-Person Controls**: WASD/Arrow keys for movement, mouse for looking around
- **Customizable Exhibition Layouts**: Maze layouts stored as JSON in database per exhibition
- **Navigation Minimap**: Real-time minimap showing player position and maze layout
- **Artwork Interaction**: Click on artworks to view details and add to cart
- **WebGL Fallback**: Automatic detection with Classic view alternative
- **View Modes**: Toggle between 3D Maze and Classic grid view

### Exhibition System
- **Database Tables**: `exhibitions` and `exhibition_artworks` for managing shows
- **API Endpoints**: `/api/exhibitions`, `/api/exhibitions/active`, `/api/exhibitions/:id`
- **Maze Layout Schema**: `MazeLayout` type with cells, walls, and artwork slots

### Art Store
- Grid/list view toggle
- Category filtering
- Search functionality
- Artwork detail dialogs

### Auction System
- Live, upcoming, and ended auctions
- Real-time bidding with validation
- Bid history tracking
- Status-based auction filtering

### Cart & Checkout
- Persistent cart (localStorage via Zustand)
- Multi-item checkout
- Order creation with shipping details

### Authentication (Replit Auth)
- **OAuth Login**: Google, GitHub, X (Twitter), Apple, email/password via Replit Auth
- **Session Management**: Express-session with PostgreSQL storage
- **API Endpoints**: `/api/login`, `/api/logout`, `/api/auth/user`
- **Protected Routes**: Artist dashboard requires authentication
- **Artist Linking**: Users link their account to an existing artist profile

### Artist Dashboard
- **Requires Login**: Only accessible to authenticated users
- **Single Artist View**: Shows only the logged-in artist's content (no artist selection)
- **Artist Linking**: New users can claim an unlinked artist profile
- Artwork management: create, edit, delete artworks
- Blog post management: create, edit, delete with draft/publish workflow
- Form validation and file upload support

### Artist Profile (Public)
- Full artist bio and avatar display
- Artworks gallery with add-to-cart functionality
- Published blog posts display (no comments - read-only)
- Tabbed navigation between artworks and blog

## Database Schema

### Tables
- `users` - User accounts
- `artists` - Artist profiles with bio and specialization
- `artworks` - Art pieces with pricing and metadata
- `auctions` - Auction listings with timing and bids
- `bids` - Individual bids on auctions
- `orders` - Purchase orders
- `exhibitions` - Gallery exhibitions with maze layouts
- `exhibition_artworks` - Artworks linked to exhibitions with wall placement
- `blog_posts` - Artist blog posts with title, content, excerpt, and publish status

## API Endpoints

### Artists
- `GET /api/artists` - List all artists
- `GET /api/artists/:id` - Get artist details
- `GET /api/artists/:id/artworks` - Get artist's artworks
- `GET /api/artists/:id/blog` - Get artist's blog posts
- `PATCH /api/artists/:id` - Update artist profile

### Artworks
- `GET /api/artworks` - List all artworks with artist info
- `GET /api/artworks/:id` - Get artwork details
- `POST /api/artworks` - Create new artwork
- `PATCH /api/artworks/:id` - Update artwork
- `DELETE /api/artworks/:id` - Delete artwork

### Auctions
- `GET /api/auctions` - List all auctions
- `GET /api/auctions/:id` - Get auction details
- `GET /api/auctions/:id/bids` - Get auction bids
- `POST /api/auctions/:id/bids` - Place a bid

### Orders
- `GET /api/orders` - List all orders
- `POST /api/orders` - Create new order

### Exhibitions
- `GET /api/exhibitions` - List all exhibitions
- `GET /api/exhibitions/active` - Get active exhibition with artworks
- `GET /api/exhibitions/:id` - Get exhibition details with artworks

### Blog Posts
- `GET /api/blog` - List all published blog posts
- `GET /api/blog/:id` - Get blog post details
- `POST /api/blog` - Create new blog post
- `PATCH /api/blog/:id` - Update blog post
- `DELETE /api/blog/:id` - Delete blog post

## Development

### Commands
- `npm run dev` - Start development server
- `npm run db:push` - Push schema to database

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key

## Design Tokens
- Primary color: Warm orange/amber (#F97316)
- Typography: Playfair Display (serif), Inter (sans-serif)
- Border radius: Small (rounded-md)

## User Preferences
- Theme toggle (light/dark mode)
- Grid/list view in store
- Persistent cart across sessions
