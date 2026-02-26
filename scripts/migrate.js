#!/usr/bin/env node
/**
 * Migration handler that resolves P3005 baseline issues
 * Handles cases where database schema exists but migration history doesn't
 */

const { spawn } = require('child_process');
const path = require('path');

const IS_DEV = process.env.NODE_ENV !== 'production';

function runCommand(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      cwd: path.join(__dirname, '..'),
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}: ${cmd} ${args.join(' ')}`));
      }
    });

    proc.on('error', reject);
  });
}

async function main() {
  try {
    console.log('🔄 Starting Prisma migration...\n');

    // First attempt: standard migrate deploy
    try {
      await runCommand('npx', ['prisma', 'migrate', 'deploy']);
      console.log('\n✅ Migration succeeded on first attempt\n');
      process.exit(0);
    } catch (error) {
      // Check if it's the P3005 baseline error
      if (error.message.includes('P3005') || error.message.includes('schema is not empty')) {
        console.log('\n⚠️  P3005 error detected - establishing migration baseline...\n');

        // Try to resolve with baseline
        try {
          // Attempt to mark both migrations as already applied
          console.log('  → Resolving baseline migrations...');

          // Note: These might fail if DATABASE_URL isn't accessible, which is ok
          // We'll handle that in the next step
          try {
            await runCommand('npx', ['prisma', 'migrate', 'resolve', '--applied', '0_init_baseline']);
          } catch (e) {
            console.log('    (baseline resolve skipped)');
          }

          try {
            await runCommand('npx', ['prisma', 'migrate', 'resolve', '--applied', '1772079457_refactor_order_items']);
          } catch (e) {
            console.log('    (refactor resolve skipped)');
          }

          // Try migrate deploy again
          console.log('  → Retrying migrate deploy...');
          await runCommand('npx', ['prisma', 'migrate', 'deploy']);
          console.log('\n✅ Migration succeeded after baseline resolution\n');
          process.exit(0);
        } catch (fallbackError) {
          console.error('\n❌ Migration failed even after baseline attempt');
          console.error(fallbackError.message);
          process.exit(1);
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('\n❌ Migration error:');
    console.error(error.message);
    process.exit(1);
  }
}

main();
