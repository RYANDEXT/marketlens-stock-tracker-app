#!/usr/bin/env node
const mongoose = require("mongoose");

const fs = require("fs");
const path = require("path");
let dotenv;
try {
  dotenv = require("dotenv");
} catch (e) {
  dotenv = null;
}

// Try loading common env files used by Next.js and local development
const envFiles = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
];

let loadedFiles = [];
for (const f of envFiles) {
  const p = path.resolve(process.cwd(), f);
  if (fs.existsSync(p)) {
    if (dotenv) {
      const res = dotenv.config({ path: p });
      if (!res.error) loadedFiles.push(f);
    } else {
      // Simple parser if dotenv isn't installed
      try {
        const content = fs.readFileSync(p, "utf8");
        content.split(/\r?\n/).forEach((line) => {
          const m = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*(.*)?\s*$/);
          if (!m) return;
          let key = m[1];
          let val = m[2] || "";
          // remove surrounding quotes
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) process.env[key] = val;
        });
        loadedFiles.push(f);
      } catch (err) {
        // ignore parse errors for now
      }
    }
  }
}

const uri =
  process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL;

if (!uri) {
  console.error("Error: MONGODB_URI is not set.");
  if (loadedFiles.length > 0) {
    console.error("Loaded env files:", loadedFiles.join(", "));
    console.error("But none of them contained MONGODB_URI.");
  } else {
    console.error(
      "No env files found. Create a `.env.local` or export `MONGODB_URI`."
    );
  }
  console.error("Examples:");
  console.error(
    '  MONGODB_URI="mongodb+srv://user:pass@.../dbname" npm run test-db'
  );
  console.error("  OR add to .env.local: MONGODB_URI=your_uri");
  process.exit(1);
}

const maskUri = (u) => {
  try {
    return u.replace(
      /(mongodb(?:\+srv)?:\/\/)(.*@)(.*)/,
      (m, p1, p2, p3) => p1 + "****@" + p3
    );
  } catch (e) {
    return u;
  }
};

console.log("Testing MongoDB connection to:", maskUri(uri));

mongoose
  .connect(uri, { bufferCommands: false })
  .then(() => {
    console.log("✅ MongoDB connection successful");
    return mongoose.connection.close();
  })
  .then(() => {
    console.log("Connection closed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:");
    console.error(err);
    process.exit(1);
  });
