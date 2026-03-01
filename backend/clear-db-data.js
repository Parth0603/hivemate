const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log('⚠️  WARNING: This will delete ALL data from ALL collections!');
console.log('Collections will remain intact, only data will be cleared.\n');

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to database:', mongoose.connection.name);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\nFound ${collections.length} collections to clear:\n`);
    
    for (const col of collections) {
      if (!col.name.startsWith('system.')) {
        const result = await mongoose.connection.db.collection(col.name).deleteMany({});
        console.log(`  ✓ ${col.name}: Deleted ${result.deletedCount} documents`);
      }
    }
    
    console.log('\n✅ All data cleared successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
