const {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} = require("node:crypto");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(__dirname, "..", "data");

function loadSecret() {
  mkdirSync(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, "secret.key");
  if (existsSync(file)) {
    return Buffer.from(readFileSync(file, "utf8").trim(), "hex");
  }
  const secret = randomBytes(32);
  writeFileSync(file, secret.toString("hex"));
  return secret;
}

const masterKey = scryptSync(loadSecret(), "apihub", 32);

// Encrypted format: base64(iv).base64(authTag).base64(ciphertext)
function encrypt(text) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

function decrypt(blob) {
  const [ivB64, tagB64, dataB64] = blob.split(".");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    masterKey,
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

module.exports = { encrypt, decrypt, sha256 };
