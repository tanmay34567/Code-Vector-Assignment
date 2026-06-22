const { connectDB, getDB, client } = require('./db');

const PRODUCT_NAMES_BY_CATEGORY = {
  Electronics: ['Quantum Wireless Headphones', 'Spectra Pro Charger', 'Omni Smart Watch', 'Aero 4K Monitor', 'Vortex Bluetooth Speaker', 'Apex Mechanical Keyboard', 'Nova Gaming Mouse', 'Horizon VR Headset', 'Zenith Earbuds', 'Fusion Powerbank'],
  Clothing: ['Summit Cotton Tee', 'Vanguard Slim Denim', 'Apex Windbreaker Jacket', 'Velocity Running Sneakers', 'Merino Wool Scarf', 'Classic Leather Belt', 'Aura Performance Hoodie', 'Solstice Linen Shirt', 'Terra Leather Jacket', 'Alpine Crew Socks'],
  Home: ['Stellar Ergonomic Chair', 'Lunar LED Floor Lamp', 'Terra Ceramic Mug', 'Nebula Memory Foam Pillow', 'Aura Oil Diffuser', 'Eclipse Blackout Curtains', 'Zen Bamboo Organizer', 'Solar Garden Lights', 'Echo Smart Thermostat'],
  Books: ['The Algorithmic Mind', 'Echoes of the Cosmos', 'Designing for Scale', 'The Creative Spark', 'Chronicles of Innovation', 'Modern Machine Learning', 'Secrets of Web Performance', 'The Quiet Path', 'Legacy of Code'],
  Beauty: ['HydraGlow Face Serum', 'Botanical Cleanser', 'Radiant Velvet Lip Stain', 'Pure Coconut Oil Therapy', 'Soothing Aloe Cream', 'Mineral Sunscreen SPF 50', 'Active Charcoal Mask', 'Rosewater Facial Mist'],
  Sports: ['FlexFlow Yoga Mat', 'IronGrip Dumbbell', 'HydroFlask Water Bottle', 'Apex Trail Backpack', 'SpinMaster Tennis Racket', 'Aerofit Resistance Bands', 'Veloce Cycling Helmet', 'Pro Soccer Ball']
};

const CATEGORIES = Object.keys(PRODUCT_NAMES_BY_CATEGORY);

async function seed() {
  console.log('Starting seed process...');
  const startTime = Date.now();

  try {
    const db = await connectDB();
    const collection = db.collection('products');

    // 1. Drop existing collection to start clean
    console.log('Dropping existing products collection if any...');
    try {
      await collection.drop();
      console.log('Collection dropped.');
    } catch (e) {
      if (e.codeName === 'NamespaceNotFound') {
        console.log('Collection did not exist, skipping drop.');
      } else {
        throw e;
      }
    }

    // 2. Prepare data insertion
    const totalRecords = 200000;
    const batchSize = 10000;
    const now = Date.now();

    console.log(`Generating and inserting ${totalRecords} products in batches of ${batchSize}...`);

    for (let i = 0; i < totalRecords; i += batchSize) {
      const productsBatch = [];
      const currentBatchSize = Math.min(batchSize, totalRecords - i);

      for (let j = 0; j < currentBatchSize; j++) {
        const index = i + j;
        // Category selection
        const category = CATEGORIES[index % CATEGORIES.length];
        // Retrieve a realistic product name based on the category
        const namesList = PRODUCT_NAMES_BY_CATEGORY[category];
        const baseName = namesList[index % namesList.length];
        const productName = `${baseName} (Series ${index + 1})`;

        // Distribute created_at timestamps backwards from now by 15 seconds per index
        // This gives us a structured descending timeline of creation times
        const createdAt = new Date(now - index * 15000);

        productsBatch.push({
          name: productName,
          category: category,
          price: parseFloat((Math.random() * 990 + 10).toFixed(2)), // Price between 10.00 and 1000.00
          created_at: createdAt,
          updated_at: createdAt
        });
      }

      await collection.insertMany(productsBatch);
      const percentage = Math.min(100, Math.round(((i + currentBatchSize) / totalRecords) * 100));
      console.log(`Inserted batch ${i / batchSize + 1}: ${i + currentBatchSize}/${totalRecords} (${percentage}%)`);
    }

    // 3. Create Indexes after inserting data for maximum insert performance
    console.log('Creating indexes for pagination and filtering...');
    
    // Index for general newest-first pagination
    console.log('Creating index on { created_at: -1, _id: -1 }...');
    await collection.createIndex({ created_at: -1, _id: -1 });

    // Index for category-filtered newest-first pagination
    console.log('Creating index on { category: 1, created_at: -1, _id: -1 }...');
    await collection.createIndex({ category: 1, created_at: -1, _id: -1 });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Seeding completed successfully in ${duration}s!`);
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB client connection closed.');
    }
  }
}

seed();
