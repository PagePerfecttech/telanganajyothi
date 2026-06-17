import { db } from './src/lib/db';

async function check() {
  try {
    const count = await db.withdrawalRequest.count();
    console.log(`Table exists! Current records: ${count}`);
  } catch (err) {
    console.error("Table does NOT exist in DB.", err.message);
  } finally {
    await db.$disconnect();
  }
}
check();
