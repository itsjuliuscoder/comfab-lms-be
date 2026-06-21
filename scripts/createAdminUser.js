/**
 * One-off bootstrap: create or update a user (default role PARTICIPANT).
 * Password must come from ADMIN_CREATE_PASSWORD (set in .env — never commit).
 * Optional: ADMIN_CREATE_EMAIL (default julius@promptpal.app), ADMIN_CREATE_NAME,
 * ADMIN_CREATE_ROLE (ADMIN | INSTRUCTOR | PARTICIPANT, default PARTICIPANT).
 */
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/users/models/User.js';

const DEFAULT_EMAIL = 'julius@promptpal.app';
const ALLOWED_ROLES = ['ADMIN', 'INSTRUCTOR', 'PARTICIPANT'];
const DEFAULT_ROLE = 'PARTICIPANT';

function resolveOptions() {
  const email = (process.env.ADMIN_CREATE_EMAIL || DEFAULT_EMAIL).toLowerCase().trim();
  const password = process.env.ADMIN_CREATE_PASSWORD;
  const name =
    (process.env.ADMIN_CREATE_NAME && process.env.ADMIN_CREATE_NAME.trim()) ||
    email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ||
    'User';

  const roleRaw = (process.env.ADMIN_CREATE_ROLE || DEFAULT_ROLE).toUpperCase().trim();
  const role = ALLOWED_ROLES.includes(roleRaw) ? roleRaw : null;

  if (!password || password.length < 8) {
    console.error(
      'Set ADMIN_CREATE_PASSWORD in your environment (min 8 characters, matches User schema).',
    );
    process.exit(1);
  }

  if (!role) {
    console.error(
      `ADMIN_CREATE_ROLE must be one of: ${ALLOWED_ROLES.join(', ')}. Got: "${process.env.ADMIN_CREATE_ROLE || ''}"`,
    );
    process.exit(1);
  }

  return { email, password, name, role };
}

async function main() {
  const { email, password, name, role } = resolveOptions();

  try {
    await connectDatabase();

    let user = await User.findOne({ email });

    if (user) {
      user.role = role;
      user.status = 'ACTIVE';
      user.emailVerified = true;
      user.inviteToken = null;
      user.inviteTokenExpires = null;
      user.invitedBy = null;
      user.password = password;
      await user.save();
      console.log(`Updated existing user to ${role}: ${email}`);
    } else {
      user = new User({
        name,
        email,
        password,
        role,
        status: 'ACTIVE',
        emailVerified: true,
      });
      await user.save();
      console.log(`Created user with role ${role}: ${email}`);
    }
  } catch (err) {
    console.error('createAdminUser failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

await main();
