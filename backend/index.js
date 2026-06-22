const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const { connectDB, getDB } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS so the frontend (Next.js) can communicate with this API
app.use(cors({
  origin: '*', // For development, allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Helper to encode a cursor object to base64
function encodeCursor(cursorObj) {
  return Buffer.from(JSON.stringify(cursorObj)).toString('base64');
}

// Helper to decode a base64 string to a cursor object
function decodeCursor(cursorStr) {
  try {
    return JSON.parse(Buffer.from(cursorStr, 'base64').toString('utf-8'));
  } catch (error) {
    return null;
  }
}

// 1. GET /api/products - Paginated products endpoint with keyset pagination
app.get('/api/products', async (req, res) => {
  try {
    const db = getDB();
    const collection = db.collection('products');

    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const category = req.query.category;
    const nextCursorStr = req.query.next;
    const prevCursorStr = req.query.prev;

    // Build the query
    const query = {};
    if (category && category !== 'All') {
      query.category = category;
    }

    let isReversing = false;

    if (nextCursorStr) {
      const cursor = decodeCursor(nextCursorStr);
      if (cursor && cursor.created_at && cursor.id) {
        // Query items that are OLDER than the cursor item
        // i.e., created_at < cursor.created_at OR (created_at == cursor.created_at AND _id < cursor.id)
        query.$or = [
          { created_at: { $lt: new Date(cursor.created_at) } },
          { created_at: new Date(cursor.created_at), _id: { $lt: new ObjectId(cursor.id) } }
        ];
      }
    } else if (prevCursorStr) {
      const cursor = decodeCursor(prevCursorStr);
      if (cursor && cursor.created_at && cursor.id) {
        // Query items that are NEWER than the cursor item
        // i.e., created_at > cursor.created_at OR (created_at == cursor.created_at AND _id > cursor.id)
        query.$or = [
          { created_at: { $gt: new Date(cursor.created_at) } },
          { created_at: new Date(cursor.created_at), _id: { $gt: new ObjectId(cursor.id) } }
        ];
        isReversing = true;
      }
    }

    // Set sorting order based on direction:
    // If next page (or first page): sort descending (newest first: created_at: -1, _id: -1)
    // If previous page: sort ascending (created_at: 1, _id: 1) so we get the records closest to the cursor first.
    const sortOrder = isReversing ? { created_at: 1, _id: 1 } : { created_at: -1, _id: -1 };

    // Fetch limit + 1 records to check if there is another page
    const products = await collection.find(query)
      .sort(sortOrder)
      .limit(limit + 1)
      .toArray();

    let hasMore = false;
    let hasPrevious = false;

    if (isReversing) {
      // If we are paging backwards, we sorted in ascending order.
      // If we received limit + 1 items, it means there are further newer items (hasPrevious = true).
      if (products.length > limit) {
        hasPrevious = true;
        products.pop(); // Remove the extra check item
      }
      // Reverse the array back to descending order (newest first) for UI presentation
      products.reverse();
      // Since we used a prev cursor, we know there are older items behind us (hasMore = true)
      hasMore = true;
    } else {
      // If we are paging forwards (or first page)
      if (products.length > limit) {
        hasMore = true;
        products.pop(); // Remove the extra check item
      }
      // If we used a next cursor, we know there are newer items in front of us (hasPrevious = true)
      if (nextCursorStr) {
        hasPrevious = true;
      }
    }

    // Construct next and prev cursors if products exist
    let nextCursor = null;
    let prevCursor = null;

    if (products.length > 0) {
      // Oldest item on current page (last element in descending list)
      const oldestProduct = products[products.length - 1];
      nextCursor = encodeCursor({
        created_at: oldestProduct.created_at,
        id: oldestProduct._id.toString()
      });

      // Newest item on current page (first element in descending list)
      const newestProduct = products[0];
      prevCursor = encodeCursor({
        created_at: newestProduct.created_at,
        id: newestProduct._id.toString()
      });
    }

    res.json({
      success: true,
      products: products,
      pagination: {
        limit: limit,
        has_more: hasMore,
        has_previous: hasPrevious,
        next_cursor: hasMore ? nextCursor : null,
        prev_cursor: hasPrevious ? prevCursor : null
      }
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 2. GET /api/categories - Fetch unique categories
app.get('/api/categories', async (req, res) => {
  try {
    const db = getDB();
    const collection = db.collection('products');
    const categories = await collection.distinct('category');
    res.json({
      success: true,
      categories: ['All', ...categories]
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 3. POST /api/products/simulate - Simulate inserting 50 new products at the top
app.post('/api/products/simulate', async (req, res) => {
  try {
    const db = getDB();
    const collection = db.collection('products');
    const count = parseInt(req.body.count, 10) || 50;

    const PRODUCT_NAMES_BY_CATEGORY = {
      Electronics: ['Quantum Wireless Headphones', 'Spectra Pro Charger', 'Omni Smart Watch', 'Aero 4K Monitor', 'Vortex Bluetooth Speaker', 'Apex Mechanical Keyboard', 'Nova Gaming Mouse', 'Horizon VR Headset', 'Zenith Earbuds', 'Fusion Powerbank'],
      Clothing: ['Summit Cotton Tee', 'Vanguard Slim Denim', 'Apex Windbreaker Jacket', 'Velocity Running Sneakers', 'Merino Wool Scarf', 'Classic Leather Belt', 'Aura Performance Hoodie', 'Solstice Linen Shirt', 'Terra Leather Jacket', 'Alpine Crew Socks'],
      Home: ['Stellar Ergonomic Chair', 'Lunar LED Floor Lamp', 'Terra Ceramic Mug', 'Nebula Memory Foam Pillow', 'Aura Oil Diffuser', 'Eclipse Blackout Curtains', 'Zen Bamboo Organizer', 'Solar Garden Lights', 'Echo Smart Thermostat'],
      Books: ['The Algorithmic Mind', 'Echoes of the Cosmos', 'Designing for Scale', 'The Creative Spark', 'Chronicles of Innovation', 'Modern Machine Learning', 'Secrets of Web Performance', 'The Quiet Path', 'Legacy of Code'],
      Beauty: ['HydraGlow Face Serum', 'Botanical Cleanser', 'Radiant Velvet Lip Stain', 'Pure Coconut Oil Therapy', 'Soothing Aloe Cream', 'Mineral Sunscreen SPF 50', 'Active Charcoal Mask', 'Rosewater Facial Mist'],
      Sports: ['FlexFlow Yoga Mat', 'IronGrip Dumbbell', 'HydroFlask Water Bottle', 'Apex Trail Backpack', 'SpinMaster Tennis Racket', 'Aerofit Resistance Bands', 'Veloce Cycling Helmet', 'Pro Soccer Ball']
    };
    const CATEGORIES = Object.keys(PRODUCT_NAMES_BY_CATEGORY);
    const newProducts = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const namesList = PRODUCT_NAMES_BY_CATEGORY[category];
      const baseName = namesList[Math.floor(Math.random() * namesList.length)];
      const randomSuffix = Math.floor(Math.random() * 900) + 100;
      const name = `${baseName} (Simulated v${randomSuffix})`;

      newProducts.push({
        name: name,
        category: category,
        price: parseFloat((Math.random() * 490 + 10).toFixed(2)),
        created_at: now, // Same date, ObjectId will break ties
        updated_at: now
      });
    }

    const result = await collection.insertMany(newProducts);
    res.json({
      success: true,
      message: `Successfully simulated ${count} new product insertions.`,
      inserted_count: result.insertedCount
    });
  } catch (error) {
    console.error('Error simulating products:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// 4. GET /api/ping - Simple ping endpoint for keep-alive
app.get('/api/ping', (req, res) => {
  res.json({ success: true, message: 'pong', timestamp: new Date() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Self-ping function to prevent Render free-tier cold starts
function startSelfPing() {
  const selfUrl = process.env.RENDER_EXTERNAL_URL;
  if (!selfUrl) {
    console.log('RENDER_EXTERNAL_URL not set. Self-ping skipped.');
    return;
  }

  const pingUrl = `${selfUrl.replace(/\/$/, '')}/api/ping`;
  const https = require('https');

  // Ping every 14 minutes (840,000 ms) to keep the app active
  const INTERVAL = 14 * 60 * 1000;

  setInterval(() => {
    https.get(pingUrl, (res) => {
      console.log(`[Self-Ping] Ping sent to ${pingUrl}. Status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error(`[Self-Ping] Error pinging ${pingUrl}: ${err.message}`);
    });
  }, INTERVAL);

  console.log(`[Self-Ping] Self-ping loop started for: ${pingUrl}`);
}

// Start server after connecting to database
async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      // Initialize self-ping
      startSelfPing();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

