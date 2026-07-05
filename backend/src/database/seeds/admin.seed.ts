import bcrypt from 'bcrypt';
import { AppDataSource } from '../../config/typeorm.config';
import { User } from '../entities'; 
import { Role } from '../../common/enums';

export async function seedAdmin(): Promise<void> {
  const userRepo = AppDataSource.getRepository(User);

  const email = process.env.ADMIN_EMAIL || 'admin@taskflow.local';
  const plainPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

  // Check if any admin exists
  const existingAdmin = await userRepo.findOne({
    where: { role: Role.ADMIN }
  });

  if (existingAdmin) {
    console.log(`Admin user seed skipped: admin account already exists (${existingAdmin.email})`);
    return;
  }

  // Create new admin
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  const admin = new User();
  admin.fullName = 'System Administrator';
  admin.email = email;
  admin.passwordHash = passwordHash;
  admin.role = Role.ADMIN;
  admin.isEmailVerified = true;
  admin.mustChangePassword = false;
  admin.isActive = true;
  admin.createdById = null;
  admin.refreshTokenHash = null;
  admin.failedLoginAttempts = 0;
  admin.lockedUntil = null;
  admin.createdAt = new Date().toISOString();

  await userRepo.save(admin);
  console.log(' Idempotent Admin Seeding Successful!');
  console.log(`   Email: ${email}`);
  console.log(`   Password: (from .env or secure default)`);
}
