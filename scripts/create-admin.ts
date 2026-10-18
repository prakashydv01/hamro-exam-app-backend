/**
 * Creates (or promotes) an admin user directly in the database.
 * The public /api/auth/register endpoint never creates admin accounts -
 * this script is the only way to get the first admin in.
 *
 * Usage: npm run create-admin -- "Admin Name" admin@hamroexam.com 9800000000 "StrongPassword123"
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User';
import { hashPassword } from '../src/lib/password';

async function main() {
  const [name, email, phone, password] = process.argv.slice(2);

  if (!name || !email || !phone || !password) {
    console.error('Usage: npm run create-admin -- "Name" email phone password');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI as string);

  const passwordHash = await hashPassword(password);
  const existing = await User.findOne({ email });

  if (existing) {
    existing.role = 'admin';
    existing.emailVerified = true;
    await existing.save();
    console.log(`Promoted existing user ${email} to admin.`);
  } else {
    await User.create({ name, email, phone, passwordHash, role: 'admin', emailVerified: true });
    console.log(`Created admin user ${email}.`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
