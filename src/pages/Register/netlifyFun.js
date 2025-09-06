// ESM function (Netlify runs Node 18+)
import { neon } from "@neondatabase/serverless";

const sql = neon(import.meta.env.DATABASE_URL);

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { name, uniqueNo } = JSON.parse(event.body || "{}");
    if (!name || !uniqueNo) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "name and uniqueNo are required" }),
      };
    }

    // Ensure table exists (you can also run this once as a migration)
    await sql`CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      unique_no TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );`;

    const rows = await sql`
      INSERT INTO registrations (name, unique_no)
      VALUES (${name}, ${uniqueNo})
      ON CONFLICT (unique_no) DO NOTHING
      RETURNING id, name, unique_no, created_at;
    `;
    if (rows.length === 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Unique No already registered" }),
      };
    }

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, registration: rows[0] }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal error", details: err.message }),
    };
  }
}
