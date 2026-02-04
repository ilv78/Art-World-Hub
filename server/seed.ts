import { db } from "./db";
import { artists, artworks, auctions, exhibitions, exhibitionArtworks } from "@shared/schema";
import { sql } from "drizzle-orm";
import type { MazeLayout } from "@shared/schema";

const artistsData = [
  {
    name: "Elena Vasquez",
    bio: "Elena Vasquez is a contemporary abstract expressionist known for her bold use of color and emotional depth. Born in Barcelona, she has exhibited in galleries across Europe and North America, earning recognition for her unique approach to capturing human emotions through abstract forms.",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    country: "Spain",
    specialization: "Abstract Expressionism",
  },
  {
    name: "Marcus Chen",
    bio: "Marcus Chen combines traditional Chinese ink painting techniques with modern digital elements. His work explores the intersection of technology and nature, creating pieces that feel both ancient and futuristic. He has been featured in Art Basel and the Venice Biennale.",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    country: "Taiwan",
    specialization: "Digital Mixed Media",
  },
  {
    name: "Sophia Laurent",
    bio: "French sculptor and installation artist Sophia Laurent creates immersive experiences that challenge viewers' perceptions of space and material. Her bronze and glass sculptures have been acquired by major museums worldwide including the Louvre and MoMA.",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    country: "France",
    specialization: "Sculpture",
  },
  {
    name: "James Okonkwo",
    bio: "James Okonkwo is a Nigerian-British photographer whose work documents urban landscapes and the human experience within them. His black-and-white photography has won numerous awards and been featured in National Geographic and Time magazine.",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    country: "United Kingdom",
    specialization: "Photography",
  },
  {
    name: "Yuki Tanaka",
    bio: "Yuki Tanaka creates minimalist oil paintings that explore themes of solitude and contemplation. Inspired by Japanese Zen philosophy, her work invites viewers to slow down and reflect. She has received the prestigious Turner Prize nomination.",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
    country: "Japan",
    specialization: "Minimalist Painting",
  },
];

const artworksData = [
  {
    title: "Crimson Horizon",
    description: "A striking abstract piece featuring bold reds and golds that seem to dance across the canvas. This work captures the essence of a Mediterranean sunset, evoking feelings of warmth and passion.",
    imageUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80",
    price: "8500.00",
    medium: "Oil on Canvas",
    dimensions: "120 x 90 cm",
    year: 2023,
    isForSale: true,
    isInGallery: true,
    category: "Painting",
  },
  {
    title: "Digital Dreams",
    description: "A mesmerizing blend of traditional ink techniques and digital manipulation. The piece explores the boundary between the physical and virtual worlds, featuring flowing lines that transform into pixelated fragments.",
    imageUrl: "https://images.unsplash.com/photo-1549887534-1541e9326642?w=800&q=80",
    price: "12000.00",
    medium: "Digital Mixed Media",
    dimensions: "100 x 150 cm",
    year: 2024,
    isForSale: true,
    isInGallery: true,
    category: "Digital Art",
  },
  {
    title: "Eternal Flow",
    description: "A stunning bronze sculpture that captures the fluidity of water in solid form. The piece plays with light and shadow, creating ever-changing visual effects throughout the day.",
    imageUrl: "https://images.unsplash.com/photo-1544413660-299165566b1d?w=800&q=80",
    price: "25000.00",
    medium: "Bronze",
    dimensions: "45 x 30 x 60 cm",
    year: 2022,
    isForSale: true,
    isInGallery: true,
    category: "Sculpture",
  },
  {
    title: "Urban Solitude",
    description: "A powerful black-and-white photograph capturing a lone figure in the midst of a bustling city. The contrast between isolation and crowded spaces speaks to the modern human condition.",
    imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80",
    price: "3500.00",
    medium: "Photography",
    dimensions: "60 x 80 cm",
    year: 2023,
    isForSale: true,
    isInGallery: true,
    category: "Photography",
  },
  {
    title: "Silence",
    description: "A minimalist oil painting featuring subtle gradients of white and grey. The seemingly empty canvas reveals intricate textures and hidden depths upon closer inspection, inviting prolonged contemplation.",
    imageUrl: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&q=80",
    price: "15000.00",
    medium: "Oil on Canvas",
    dimensions: "150 x 150 cm",
    year: 2024,
    isForSale: true,
    isInGallery: true,
    category: "Painting",
  },
  {
    title: "Fragments of Memory",
    description: "An evocative abstract work that layers translucent colors to create a sense of depth and nostalgia. Each viewing reveals new details and emotional resonances.",
    imageUrl: "https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=800&q=80",
    price: "7200.00",
    medium: "Acrylic on Canvas",
    dimensions: "100 x 80 cm",
    year: 2023,
    isForSale: true,
    isInGallery: true,
    category: "Painting",
  },
  {
    title: "Neon Nights",
    description: "A vibrant digital artwork that captures the electric energy of Tokyo's nightlife. The piece blends traditional photography with digital painting techniques.",
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80",
    price: "5800.00",
    medium: "Digital Art",
    dimensions: "80 x 120 cm",
    year: 2024,
    isForSale: true,
    isInGallery: true,
    category: "Digital Art",
  },
  {
    title: "Whispers of Stone",
    description: "A delicate marble sculpture that captures the ephemeral quality of fabric frozen in time. The mastery of technique transforms cold stone into flowing silk.",
    imageUrl: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80",
    price: "32000.00",
    medium: "Marble",
    dimensions: "60 x 40 x 40 cm",
    year: 2021,
    isForSale: false,
    isInGallery: true,
    category: "Sculpture",
  },
  {
    title: "Golden Hour",
    description: "A breathtaking landscape photograph capturing the magical moment when sunlight bathes the countryside in warm, golden hues. A celebration of nature's daily spectacle.",
    imageUrl: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=800&q=80",
    price: "2800.00",
    medium: "Photography",
    dimensions: "90 x 60 cm",
    year: 2023,
    isForSale: true,
    isInGallery: true,
    category: "Photography",
  },
  {
    title: "Inner Cosmos",
    description: "An immersive abstract piece that invites viewers into a universe of swirling colors and organic forms. The painting suggests both cellular structures and galactic formations.",
    imageUrl: "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800&q=80",
    price: "9500.00",
    medium: "Mixed Media",
    dimensions: "130 x 100 cm",
    year: 2024,
    isForSale: true,
    isInGallery: true,
    category: "Mixed Media",
  },
];

export async function seedDatabase() {
  try {
    // Check if data already exists
    const existingArtists = await db.select().from(artists);
    if (existingArtists.length > 0) {
      console.log("Database already seeded, skipping...");
      return;
    }

    console.log("Seeding database...");

    // Insert artists
    const insertedArtists = await db.insert(artists).values(artistsData).returning();
    console.log(`Inserted ${insertedArtists.length} artists`);

    // Insert artworks with artist IDs
    const artworksWithArtists = artworksData.map((artwork, index) => ({
      ...artwork,
      artistId: insertedArtists[index % insertedArtists.length].id,
    }));

    const insertedArtworks = await db.insert(artworks).values(artworksWithArtists).returning();
    console.log(`Inserted ${insertedArtworks.length} artworks`);

    // Create some auctions
    const now = new Date();
    const auctionsData = [
      {
        artworkId: insertedArtworks[0].id,
        startingPrice: "5000.00",
        currentBid: "6500.00",
        minimumIncrement: "250.00",
        startTime: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Started yesterday
        endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // Ends in 3 days
        status: "active",
      },
      {
        artworkId: insertedArtworks[1].id,
        startingPrice: "8000.00",
        currentBid: "12500.00",
        minimumIncrement: "500.00",
        startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // Started 2 days ago
        endTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // Ends in 5 days
        status: "active",
      },
      {
        artworkId: insertedArtworks[2].id,
        startingPrice: "15000.00",
        minimumIncrement: "1000.00",
        startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // Starts in 2 days
        endTime: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000), // Ends in 9 days
        status: "upcoming",
      },
      {
        artworkId: insertedArtworks[5].id,
        startingPrice: "4000.00",
        currentBid: "5200.00",
        minimumIncrement: "200.00",
        startTime: new Date(now.getTime() - 12 * 60 * 60 * 1000), // Started 12 hours ago
        endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // Ends in 2 days
        status: "active",
      },
    ];

    const insertedAuctions = await db.insert(auctions).values(auctionsData).returning();
    console.log(`Inserted ${insertedAuctions.length} auctions`);

    // Create default exhibition with maze layout
    const defaultMazeLayout: MazeLayout = {
      width: 5,
      height: 5,
      spawnPoint: { x: 2, z: 0 },
      cells: [
        { x: 0, z: 0, walls: { north: true, south: true, east: false, west: true }, artworkSlots: [{ wallId: "0-0-north", position: 0 }] },
        { x: 1, z: 0, walls: { north: true, south: true, east: false, west: false }, artworkSlots: [{ wallId: "1-0-north", position: 0 }] },
        { x: 2, z: 0, walls: { north: false, south: false, east: false, west: false }, artworkSlots: [] },
        { x: 3, z: 0, walls: { north: true, south: true, east: false, west: false }, artworkSlots: [{ wallId: "3-0-north", position: 0 }] },
        { x: 4, z: 0, walls: { north: true, south: true, east: true, west: false }, artworkSlots: [{ wallId: "4-0-north", position: 0 }] },
        { x: 0, z: 1, walls: { north: false, south: true, east: false, west: true }, artworkSlots: [{ wallId: "0-1-west", position: 0 }] },
        { x: 1, z: 1, walls: { north: false, south: true, east: false, west: false }, artworkSlots: [] },
        { x: 2, z: 1, walls: { north: false, south: false, east: false, west: false }, artworkSlots: [] },
        { x: 3, z: 1, walls: { north: false, south: true, east: false, west: false }, artworkSlots: [] },
        { x: 4, z: 1, walls: { north: false, south: true, east: true, west: false }, artworkSlots: [{ wallId: "4-1-east", position: 0 }] },
        { x: 0, z: 2, walls: { north: false, south: false, east: true, west: true }, artworkSlots: [{ wallId: "0-2-west", position: 0 }] },
        { x: 1, z: 2, walls: { north: true, south: false, east: false, west: true }, artworkSlots: [{ wallId: "1-2-north", position: 0 }] },
        { x: 2, z: 2, walls: { north: true, south: false, east: false, west: false }, artworkSlots: [{ wallId: "2-2-north", position: 0 }] },
        { x: 3, z: 2, walls: { north: true, south: false, east: true, west: false }, artworkSlots: [{ wallId: "3-2-north", position: 0 }] },
        { x: 4, z: 2, walls: { north: false, south: false, east: true, west: true }, artworkSlots: [{ wallId: "4-2-east", position: 0 }] },
        { x: 0, z: 3, walls: { north: false, south: false, east: false, west: true }, artworkSlots: [] },
        { x: 1, z: 3, walls: { north: false, south: true, east: false, west: false }, artworkSlots: [] },
        { x: 2, z: 3, walls: { north: false, south: true, east: false, west: false }, artworkSlots: [] },
        { x: 3, z: 3, walls: { north: false, south: true, east: false, west: false }, artworkSlots: [] },
        { x: 4, z: 3, walls: { north: false, south: false, east: true, west: false }, artworkSlots: [] },
        { x: 0, z: 4, walls: { north: true, south: false, east: false, west: true }, artworkSlots: [{ wallId: "0-4-south", position: 0 }] },
        { x: 1, z: 4, walls: { north: true, south: false, east: false, west: false }, artworkSlots: [{ wallId: "1-4-south", position: 0 }] },
        { x: 2, z: 4, walls: { north: true, south: false, east: false, west: false }, artworkSlots: [{ wallId: "2-4-south", position: 0 }] },
        { x: 3, z: 4, walls: { north: true, south: false, east: false, west: false }, artworkSlots: [{ wallId: "3-4-south", position: 0 }] },
        { x: 4, z: 4, walls: { north: true, south: false, east: true, west: false }, artworkSlots: [{ wallId: "4-4-south", position: 0 }] },
      ],
    };

    const [exhibition] = await db.insert(exhibitions).values({
      name: "Grand Opening Exhibition",
      description: "Our inaugural exhibition featuring works from renowned contemporary artists. Walk through our immersive 3D gallery space and experience art in a new dimension.",
      layout: JSON.stringify(defaultMazeLayout),
      isActive: true,
    }).returning();

    // Assign artworks to exhibition walls
    const exhibitionArtworksData = insertedArtworks.slice(0, 10).map((artwork, index) => ({
      exhibitionId: exhibition.id,
      artworkId: artwork.id,
      wallId: defaultMazeLayout.cells.filter(c => c.artworkSlots.length > 0)[index]?.artworkSlots[0]?.wallId || `wall-${index}`,
      position: 0,
    }));

    await db.insert(exhibitionArtworks).values(exhibitionArtworksData);
    console.log(`Created exhibition with ${exhibitionArtworksData.length} artworks`);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}
