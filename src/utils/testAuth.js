import { User } from '../../../database/models/User.js';

async function test() {
  console.log('Testing User model...');
  const user = await User.findOne({ email: 'demo@decisioai.com' });
  console.log('Found demo user:', user?.email);
  const match = await user.matchPassword('Password123!');
  console.log('Password match verified:', match);

  // Test creating a new user (e.g. Arnab@1234.com)
  const newEmail = 'arnab@1234.com';
  let arnab = await User.findOne({ email: newEmail });
  if (!arnab) {
    arnab = await User.create({
      name: 'Arnab Maji',
      email: newEmail,
      password: 'Password123!',
    });
    console.log('Created user Arnab:', arnab.email);
  }
  const arnabMatch = await arnab.matchPassword('Password123!');
  console.log('Arnab password match verified:', arnabMatch);
}

test().catch(console.error);
