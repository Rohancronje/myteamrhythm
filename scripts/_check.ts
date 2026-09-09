import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDb } from "../src/db";
for (const line of readFileSync(".env.local","utf8").split(/\r?\n/)){const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!line.trim().startsWith("#"))process.env[m[1]]??=m[2];}
(async()=>{const db=getDb();const r:any=await db.execute(sql`SELECT email, name, role FROM users ORDER BY role, email`);const rows=r.rows??r;console.log("Total users:",rows.length);for(const u of rows)console.log(` - ${u.email}  [${u.role}]  ${u.name}`);const hit=rows.find((u:any)=>String(u.email).toLowerCase()==="rohan87cronje@gmail.com");console.log("\nrohan87cronje@gmail.com account:", hit?`YES (${hit.role})`:"NOT FOUND — no reset email would have sent");process.exit(0);})();
