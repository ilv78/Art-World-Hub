# ArtVerse - Virtual Art Gallery & Marketplace

## Overview
ArtVerse is an immersive art platform featuring a virtual 3D-like gallery, art store, auction system, and artist profiles. Built with React, Express, and PostgreSQL.

## Architecture

### Frontend (React + Vite)
- **Pages**: Home, Gallery, Store, Auctions, Artists
- **Components**: Sidebar navigation, Cart system, Artwork cards/dialogs
- **State Management**: Zustand for cart, TanStack Query for server state
- **Styling**: Tailwind CSS with Shadcn UI components

### Backend (Express + PostgreSQL)
- **API Routes**: RESTful endpoints for artworks, artists, auctions, orders
- **Storage**: PostgreSQL with Drizzle ORM
- **Seeding**: Automatic database seeding with sample data

## Key Features

### Virtual Gallery
- 3D-like gallery experience with CSS transforms
- Artwork navigation with thumbnails
- Zoom controls and info panel
- Add to cart directly from gallery

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

## Database Schema

### Tables
- `users` - User accounts
- `artists` - Artist profiles with bio and specialization
- `artworks` - Art pieces with pricing and metadata
- `auctions` - Auction listings with timing and bids
- `bids` - Individual bids on auctions
- `orders` - Purchase orders

## API Endpoints

### Artists
- `GET /api/artists` - List all artists
- `GET /api/artists/:id` - Get artist details
- `GET /api/artists/:id/artworks` - Get artist's artworks

### Artworks
- `GET /api/artworks` - List all artworks with artist info
- `GET /api/artworks/:id` - Get artwork details

### Auctions
- `GET /api/auctions` - List all auctions
- `GET /api/auctions/:id` - Get auction details
- `GET /api/auctions/:id/bids` - Get auction bids
- `POST /api/auctions/:id/bids` - Place a bid

### Orders
- `GET /api/orders` - List all orders
- `POST /api/orders` - Create new order

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
