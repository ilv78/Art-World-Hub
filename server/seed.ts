import { db } from "./db";
import { artists, artworks, auctions, bids, orders, exhibitions, exhibitionArtworks, blogPosts } from "@shared/schema";
import { sql, eq } from "drizzle-orm";
import { seedLogger as logger } from "./logger";

const ARTIST_ID = "4493f600-2619-47f9-979c-abc5b45ba92d";

const artistData = {
  id: ARTIST_ID,
  name: "Alexandra C. ",
  bio: "Discover the beauty and elegance of 'Je suis une femme' – an extraordinary exhibition celebrating the art of reverse painting on glass. Each piece tells a unique story, capturing the essence of femininity through delicate, vibrant strokes. Join us and immerse yourself in the world of reverse painting glass artistry. Feel the passion, see the colors, and let the art inspire your soul. Experience the magic of 'Je suis une femme' – where every painting is a testament to the beauty of womanhood.",
  avatarUrl: "https://lh3.googleusercontent.com/pw/AP1GczOYdR-Ov2dqH--_uLgQStC9Y5HlOgoaw1zfQq6fNpHWMpSyxEi2C4c9IcfrHJGMIBKNk3DP0JQ01Vy1OQ9YHywmiTE4fg-Wr-8APF5MSrOmWithQDSjK1yfmMpnxiCL6brUmGuT15fjlmMmzaQiWjZVlA=w1245-h934-s-no-gm?authuser=0",
  country: "Romania, Netherlands ",
  specialization: "Painting, Reverse Glass Painting, Al fresco ",
  email: "liviu@idata.ro",
  socialLinks: {
    website: "https://www.je-suis-une-femme.art/femme/",
    instagram: "https://www.instagram.com/alexandraconstantin1983/",
  },
  galleryLayout: {"cells": [{"x": 0, "z": 0, "walls": {"east": false, "west": true, "north": false, "south": true}, "artworkSlots": []}, {"x": 1, "z": 0, "walls": {"east": false, "west": false, "north": false, "south": true}, "artworkSlots": [{"wallId": "1-0-south", "position": 10}]}, {"x": 2, "z": 0, "walls": {"east": false, "west": false, "north": false, "south": true}, "artworkSlots": [{"wallId": "2-0-south", "position": 11}]}, {"x": 3, "z": 0, "walls": {"east": false, "west": false, "north": false, "south": true}, "artworkSlots": []}, {"x": 4, "z": 0, "walls": {"east": false, "west": false, "north": false, "south": true}, "artworkSlots": [{"wallId": "4-0-south", "position": 12}]}, {"x": 5, "z": 0, "walls": {"east": false, "west": false, "north": false, "south": true}, "artworkSlots": [{"wallId": "5-0-south", "position": 13}]}, {"x": 6, "z": 0, "walls": {"east": true, "west": false, "north": false, "south": true}, "artworkSlots": []}, {"x": 0, "z": 1, "walls": {"east": false, "west": true, "north": false, "south": false}, "artworkSlots": [{"wallId": "0-1-west", "position": 9}]}, {"x": 1, "z": 1, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 2, "z": 1, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 3, "z": 1, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 4, "z": 1, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 5, "z": 1, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 6, "z": 1, "walls": {"east": true, "west": false, "north": false, "south": false}, "artworkSlots": [{"wallId": "6-1-east", "position": 14}]}, {"x": 0, "z": 2, "walls": {"east": false, "west": true, "north": false, "south": false}, "artworkSlots": [{"wallId": "0-2-west", "position": 8}]}, {"x": 1, "z": 2, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 2, "z": 2, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 3, "z": 2, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 4, "z": 2, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 5, "z": 2, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 6, "z": 2, "walls": {"east": true, "west": false, "north": false, "south": false}, "artworkSlots": [{"wallId": "6-2-east", "position": 15}]}, {"x": 0, "z": 3, "walls": {"east": false, "west": true, "north": false, "south": false}, "artworkSlots": [{"wallId": "0-3-west", "position": 7}]}, {"x": 1, "z": 3, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 2, "z": 3, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 3, "z": 3, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 4, "z": 3, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 5, "z": 3, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 6, "z": 3, "walls": {"east": true, "west": false, "north": false, "south": false}, "artworkSlots": [{"wallId": "6-3-east", "position": 16}]}, {"x": 0, "z": 4, "walls": {"east": false, "west": true, "north": false, "south": false}, "artworkSlots": [{"wallId": "0-4-west", "position": 6}]}, {"x": 1, "z": 4, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 2, "z": 4, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 3, "z": 4, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 4, "z": 4, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 5, "z": 4, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 6, "z": 4, "walls": {"east": true, "west": false, "north": false, "south": false}, "artworkSlots": [{"wallId": "6-4-east", "position": 17}]}, {"x": 0, "z": 5, "walls": {"east": false, "west": true, "north": false, "south": false}, "artworkSlots": [{"wallId": "0-5-west", "position": 5}]}, {"x": 1, "z": 5, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 2, "z": 5, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 3, "z": 5, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 4, "z": 5, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 5, "z": 5, "walls": {"east": false, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 6, "z": 5, "walls": {"east": true, "west": false, "north": false, "south": false}, "artworkSlots": []}, {"x": 0, "z": 6, "walls": {"east": false, "west": true, "north": true, "south": false}, "artworkSlots": []}, {"x": 1, "z": 6, "walls": {"east": false, "west": false, "north": true, "south": false}, "artworkSlots": [{"wallId": "1-6-north", "position": 4}]}, {"x": 2, "z": 6, "walls": {"east": false, "west": false, "north": true, "south": false}, "artworkSlots": [{"wallId": "2-6-north", "position": 3}]}, {"x": 3, "z": 6, "walls": {"east": false, "west": false, "north": true, "south": false}, "artworkSlots": [{"wallId": "3-6-north", "position": 2}]}, {"x": 4, "z": 6, "walls": {"east": false, "west": false, "north": true, "south": false}, "artworkSlots": [{"wallId": "4-6-north", "position": 1}]}, {"x": 5, "z": 6, "walls": {"east": false, "west": false, "north": true, "south": false}, "artworkSlots": [{"wallId": "5-6-north", "position": 0}]}, {"x": 6, "z": 6, "walls": {"east": true, "west": false, "north": true, "south": false}, "artworkSlots": []}], "width": 7, "height": 7, "spawnPoint": {"x": 3, "z": 4}},
};

const artworksData = [
  {
    id: "9c1406cd-b793-4b32-833f-d47f8df131f4",
    title: "Thoughts",
    description: "",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczOsHCTkEGoovmn3ccJVum9pBqmLBk-D4HOlWYyeCiNmLt0XPRVyZPKpcBCJs6goGhkbi4CN_zs2AbpKUnZsf24XaCiFV8DQdor4edERw51oL_Xw6WqzFMta-Yv-qwgHrxkC6NgvE-Yy8HNMbJzBIov9tg=w841-h934-s-no-gm?authuser=0",
    price: "10000.00",
    medium: "Reverse painting on glass",
    dimensions: "29 x 32",
    year: 2024,
    isForSale: false,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 1,
  },
  {
    id: "cfce6d7f-2d76-47b5-a6b2-ce1f5bace037",
    title: "Disssapointment",
    description: "",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczMbVxlHj8CkBVY5nuG4Wzp03o4KIXxeQ2WIkk4hUWz_6R2ilPJ3Tl6htr4kq1krZFIyVjBXQEsfBM_54Vz8Pkg-JvLBBN70334590bcmCtdRv-3K5qtvFZojxIVK7LwSGapZKB5_GvenzcpC0j9Y87FJQ=w876-h934-s-no-gm?authuser=0",
    price: "3000.00",
    medium: "Reverse painting on glass",
    dimensions: "21 x 22",
    year: 2024,
    isForSale: true,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 2,
  },
  {
    id: "bbbad1ec-e043-481f-8e91-fcb961efb39d",
    title: "Universe",
    description: "",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczNDc-zuSl7V4eE4xigNiz_j8lz9juumxIjSRG3bKvNg7V3YBB-ZvR9V5U1Nf_rCSSkgnsVfkOH8gyn6ncaRMfeyoq3-GF-ojWDvF4DZkVC7uXE3lQ1xyFU4nRk4Bxx44xEAGpaRH8de8DdkjAeJHLGwTA=w927-h934-s-no-gm?authuser=0",
    price: "3000.00",
    medium: "Reverse painting on glass",
    dimensions: "31 x 31",
    year: 2024,
    isForSale: false,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 3,
  },
  {
    id: "6d06cb5d-7ac3-41c1-af4a-ec9fbb1ea3b7",
    title: "Hope",
    description: "",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczOZLdamohCzJGEWFGe56akwq4C5gXM4S0ni-QSkDQRWPBjiNDZuHxqyPiKFU60rlIRWakI6-lmy58nCtcqOGqo-2vwpDUHq21lrtNLOANTJpJ9c_DrtjYTesaUyR8dA1bxHTjmuaqNxbBy0RWQaGjbbrg=w921-h934-s-no-gm?authuser=0",
    price: "3000.00",
    medium: "Reverse painting on glass",
    dimensions: "21 x 22",
    year: 2024,
    isForSale: false,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 4,
  },
  {
    id: "dca8b3b0-ff07-4ac4-8df3-5adf4d6c6622",
    title: "The View",
    description: "",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczPgpiYDwHpPM0sUzjdEhfnB5Fms4TNI8FvyHZAeSpFlRXF05RlT3Q6gIBXynt9YGTyBe_53yRDmQp_OyqWZ2bX0LlwdfqY_nu719BaOTEP8fQE0ThX2Zjfv_sFgMCUvrl9cebhzl3cdOpS2SqHNjscwnA=w970-h934-s-no-gm?authuser=0",
    price: "3000.00",
    medium: "Reverse painting on glass",
    dimensions: "41 x 41",
    year: 2024,
    isForSale: true,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 5,
  },
  {
    id: "1442e9a7-6e84-4c83-8aac-b7e074a44b65",
    title: "The Time",
    description: "",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczP0w7OiRB9EBqnaw8lQo2D8hfHvxlnjUpdsnYEbsTm2SjTqpMA87t71aqTPlyI5Ym2qqUaa5WEbn5jQBW6rfHbiRBZojzrbK2uPZLRJy8JW9s-3UPBn-8ze3W5ryII4Hmn6Xfrn67sYF8vdqHN20EPCUw=w893-h934-s-no-gm?authuser=0",
    price: "3000.00",
    medium: "Reverse painting on glass",
    dimensions: "41 x 41",
    year: 2024,
    isForSale: true,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 6,
  },
  {
    id: "27e8346a-b27b-4a4b-b079-418129c97912",
    title: "Wild",
    description: "",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczOm_Vnc3n-MY3l_KGBLbx-8eHeF8iObe1XUD-N2qgzYeicCqsw5Zw9FFPifcfke22V7fCVVyeE4yXpegB6YmKpIevT7FYQLNkHhEgq4fXYGm7I3f81YeQ2-4zC9gsClc5qhFnCVLWrV497fRh1EfKlYuA=w903-h934-s-no-gm?authuser=0",
    price: "3000.00",
    medium: "Reverse painting on glass",
    dimensions: "26 x 27",
    year: 2024,
    isForSale: true,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 7,
  },
  {
    id: "089cbe08-44f8-4434-8ce8-65964fd1ee99",
    title: "Strong",
    description: "",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczO_UGCW-ChY1xdql8N7bZMtB71ZZkhkFO0NAl2uYvwvEkwmjmPHMNFRt6oLxLYzIzXhgzSebdvVSqtRlmX4pEIsD_Q3vq0E4xAxpbSJ98byTBg4hUUG1fJUdG3PbVbjSUI5PlYx_Jrtln4p9eYmp-NPIg=w915-h934-s-no-gm?authuser=0",
    price: "3000.00",
    medium: "Reverse painting on glass",
    dimensions: "15 x 16",
    year: 2024,
    isForSale: true,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 8,
  },
  {
    id: "3eac2572-c8ef-49b0-8059-ff7123d8cb00",
    title: "Dance",
    description: "",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczO-q5mE_2-FbBGJg3n9X81ReWZl1ZtU1GxsjBFvkYjM_DfStNnD-PQwTdNrn_D8rEpzX1eTAgnkSff2pMALyiSmVD01_4bfsZkKwAW-MixOAaWonldnnpEbtis0OCgbhoVMCqZDxQzh8PXn34QV5j3qUw=w963-h934-s-no-gm?authuser=0",
    price: "3000.00",
    medium: "Reverse painting on glass",
    dimensions: "31 x 31",
    year: 2024,
    isForSale: true,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 9,
  },
  {
    id: "9e5c58d5-a190-4cce-8e77-16f4d6570f0a",
    title: "Summer",
    description: "",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczMQ5eBSrDtNeBbPO2_uleZQVhRmq7sjyyVROkphqn1i0-Wo9M4SSxcp_DP1611N53nCyFHFcg-i5EM8bQGy2-EDCP1HHazaO03zd9Yltlc4AiOLjtmX5XeeWMPefKoW6YorVvweg-O02mVXlNqiODiBEA=w975-h934-s-no-gm?authuser=0",
    price: "3000.00",
    medium: "Reverse painting on glass",
    dimensions: "31 x 31",
    year: 2024,
    isForSale: true,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 10,
  },
  {
    id: "3a15da69-2d1f-4cca-a9a5-999bfb009265",
    title: "Harmony",
    description: "",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczNOMnLPEokuE4seyDj4V4r-HJjna6KGoiE6TYWodm48GOxxa7AnYTEqhNLM2kpFPyFB-8EceTyTmL7eyv_3puU7-Vs9o7leoZs0ry46VYD-CVonUV6ygeQ6E1VuHU9gLCTbwgj1m7KuiMH62Dfec-967A=w927-h934-s-no-gm?authuser=0",
    price: "3000.00",
    medium: "Reverse painting on glass",
    dimensions: "26 x 27",
    year: 2024,
    isForSale: true,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 11,
  },
  {
    id: "7b461086-318a-4b98-943a-7a09d92ea2db",
    title: "Life",
    description: "",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczMPPQIbxIw4YpdF00BB_HUkL5lzschhobJ3bt3XRT4dAaPJ81uZ-M5ZAKqOO2DkDdcqC6JC5v2V_sm61K41LVH_DlEerYlorZKKDOgxZsfC1RJMi0jsxOumK1BuPRmGEj7E2WekhJNF0e6XBZeyWqrqfQ=w1035-h934-s-no-gm?authuser=0",
    price: "3000.00",
    medium: "Reverse painting on glass",
    dimensions: "27 x 26",
    year: 2026,
    isForSale: false,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 12,
  },
  {
    id: "886f3123-7493-42ec-bc4e-fd6cc5993397",
    title: "Beginning",
    description: "",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczPe0OC7LO55rdZm410FI299EZyw7DyLYAWKL-Aa29cQdY4YwhlsUWMeurtfGCcgaXAL-YT5w9GbPtc6bt8tQxFMXX0BpPkhc5_9ART20r3UIFar4-iUwx2LG4R8k3ya-PDeRRdWNnR8aUjZFRya7aNGTg=w922-h934-s-no-gm?authuser=0",
    price: "3000.00",
    medium: "Reverse painting on glass",
    dimensions: "26x27",
    year: 2024,
    isForSale: true,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 13,
  },
  {
    id: "54b34331-aff9-4761-b892-b9be5fe88b9f",
    title: "Night",
    description: "",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczMdfMU1PijTn2_KKey_5xra1Vg3HZ_3qgPvllKKXjHz3whSv6vhZdqS7YwasbuxiqoVHK9p3VK7u2bo5IZy33l8B5fOF9EbV5aLtGfN74f6uG216VfVHLZcsCZr15k_vRAFznRvs8H0A1EN9kbYOpbugg=w974-h934-s-no-gm?authuser=0",
    price: "3000.00",
    medium: "Reverse painting on glass",
    dimensions: "41 x 41",
    year: 2024,
    isForSale: true,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 15,
  },
  {
    id: "36cffb0e-2fa2-4af7-8441-1e944728e393",
    title: "Ocean",
    description: "Brazil",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczP1NJdvnQUwH1ajVdElwUPcuX9CbI2WY8KgTC6II7QfqtbfHfQ8mqAe1DCcXmHPnK_6U-cbNN5ROQ3oRRIXmGp1nXW0RsYAEKAhiAa6BRsB1QIfwr4AcePKQr396p_9VwjluuzeNYMgvetRKEbd5w0ZYg=w1810-h911-s-no-gm?authuser=0",
    price: "10000.00",
    medium: "Oil on canvas",
    dimensions: "200 x 100",
    year: 2023,
    isForSale: true,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 20,
  },
  {
    id: "27d303ff-9083-43cf-adae-4ea192980a5d",
    title: "Morning",
    description: "Normandy ",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczNKdSW2G0EdUkOGUTCiGHiQ1YTFyYnWu6xYI1gihe-03e9fsgLL9XETj8BLjrlDqho8nx5wmODA07NGmJmTcZmFaSE16Nup2oEKNZjeXg0NFR0YnFm8UAzUz8OaKmu80WJxCQ-hfNR4AMeQtOKK1DHs-g=w919-h911-s-no-gm?authuser=0",
    price: "100000.00",
    medium: "Oil on canvas",
    dimensions: "100 x 100",
    year: 2024,
    isForSale: false,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 21,
  },
  {
    id: "b263c7bb-b154-4fa2-b236-3fd4bcebd3de",
    title: "The Path ",
    description: "Normandy ",
    imageUrl: "https://lh3.googleusercontent.com/pw/AP1GczMZ5H_kXfQ-98NTUKgXy9bp-zs6UODxRBYZlbVfV_H2qUT2aS9STWuUOJMyIEjzNug-S-HuIvOYyqO7TIFjOLbnJu6-7XmAzms59M8Mo2s-4FkbLh1Dm3LfTdxUz0n6z82tJrQEPXjG9wxLMEXSxnu25Q=w826-h911-s-no-gm?authuser=0",
    price: "100000.00",
    medium: "Oil on canvas",
    dimensions: "90 x 100",
    year: 2024,
    isForSale: false,
    isInGallery: true,
    category: "painting",
    isReadyForExhibition: true,
    exhibitionOrder: 22,
  },
];

const blogPostData = {
  id: "3c65e558-aadd-40aa-8f1c-b2f173dfbaa7",
  artistId: ARTIST_ID,
  title: "Opening the Studio Door",
  content: `Hello and welcome to my personal gallery. This space is my studio in public: a place to share finished paintings, works in progress, and the small decisions that happen between the first sketch and the final varnish.
My work begins with observation—light on skin, reflections on glass, a gesture caught mid-movement—and turns into layered color and texture. Some pieces arrive quickly; others ask for patience. Here you'll find new releases, short notes on technique and materials, and a few stories from exhibitions and commissions.
If you're curious, start with the latest collection and return whenever you need a quiet moment with art. For inquiries, collaborations, or to request a catalogue, use the contact page. I'd love to hear what resonates with you.
Thank you for being here.
Do you like this personality?`,
  excerpt: "A first hello, a glimpse into my process, and an invitation to explore new work—paintings, sketches, and stories from the studio.",
  coverImageUrl: "https://images.unsplash.com/photo-1728512551484-6b4a061da328?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  isPublished: true,
};

export async function seedDatabase() {
  try {
    const existingArtists = await db.select().from(artists);
    const hasCorrectData = existingArtists.some(a => a.id === ARTIST_ID);

    if (existingArtists.length > 0 && hasCorrectData) {
      logger.info("Database already seeded, skipping");
      return;
    }

    if (existingArtists.length > 0 && !hasCorrectData) {
      logger.info("Stale seed data detected, clearing and reseeding");
      await db.delete(exhibitionArtworks);
      await db.delete(bids);
      await db.delete(auctions);
      await db.delete(orders);
      await db.delete(blogPosts);
      await db.delete(artworks);
      await db.delete(exhibitions);
      await db.delete(artists);
      logger.info("Cleared stale data");
    }

    logger.info("Seeding database");

    const [insertedArtist] = await db.insert(artists).values({
      id: artistData.id,
      name: artistData.name,
      bio: artistData.bio,
      avatarUrl: artistData.avatarUrl,
      country: artistData.country,
      specialization: artistData.specialization,
      email: artistData.email,
      socialLinks: artistData.socialLinks,
      galleryLayout: artistData.galleryLayout,
    }).returning();
    logger.info({ artist: insertedArtist.name }, "Inserted artist");

    const artworksWithArtist = artworksData.map((artwork) => ({
      ...artwork,
      artistId: ARTIST_ID,
    }));

    const insertedArtworks = await db.insert(artworks).values(artworksWithArtist).returning();
    logger.info({ count: insertedArtworks.length }, "Inserted artworks");

    const [exhibition] = await db.insert(exhibitions).values({
      name: "Grand Opening Exhibition",
      description: "Our inaugural exhibition featuring works from renowned contemporary artists.",
      layout: JSON.stringify(artistData.galleryLayout),
      isActive: true,
    }).returning();
    logger.info({ exhibition: exhibition.name }, "Created exhibition");

    await db.insert(blogPosts).values(blogPostData);
    logger.info("Inserted blog post");

    logger.info("Database seeded successfully");
  } catch (error) {
    logger.error({ err: error }, "Error seeding database");
    throw error;
  }
}
