import { seedDemoData } from '../../../database/seed/seedDemoData.js';

seedDemoData()
  .then(() => {
    console.log('Seeding completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  });
