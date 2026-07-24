import fs from "fs";
import path from "path";

let fileEnvCache: Record<string, string> | null = null;

function parseEnvFile(filename: string): Record<string, string> {
  try {
    const filePath = path.join(process.cwd(), filename);
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, "utf-8");
    const result: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        result[key] = val;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function getFileEnv(): Record<string, string> {
  if (!fileEnvCache) {
    fileEnvCache = {
      ...parseEnvFile(".env"),
      ...parseEnvFile(".env.local")
    };
  }
  return fileEnvCache;
}

function isDummyValue(val: string): boolean {
  if (!val) return true;
  const lower = val.toLowerCase();
  return (
    lower.includes("your-project-ref") ||
    lower.includes("your-public-anon-key") ||
    lower.includes("your-service-role-key") ||
    lower === "placeholder" ||
    lower === "example"
  );
}

const NEW_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYDJdOsftVqTBwkhpp3vhThAKQRKW3b2HmDU11WPAn8k8rtwbVmWae_TZlw-c5P07A/exec";
const OLD_APPS_SCRIPT_ID = "AKfycbxK5DUWnJuynEd4skeYLzHwjbaPdQKuR_aLdNPi6GwpzAWGtcot7raHJX9hDQr9Im8";

export function getEnv(key: string): string {
  if (key === "VITE_APPS_SCRIPT_URL" || key === "APPS_SCRIPT_URL") {
    const osVal = (process.env[key] || "").trim();
    if (!osVal || osVal.includes(OLD_APPS_SCRIPT_ID) || isDummyValue(osVal)) {
      const fileEnv = getFileEnv();
      const fileVal = (fileEnv[key] || "").trim();
      if (!fileVal || fileVal.includes(OLD_APPS_SCRIPT_ID) || isDummyValue(fileVal)) {
        return NEW_APPS_SCRIPT_URL;
      }
      return fileVal;
    }
    return osVal;
  }

  const osVal = process.env[key] || "";
  if (osVal && !isDummyValue(osVal)) {
    return osVal;
  }
  const fileEnv = getFileEnv();
  const fileVal = fileEnv[key] || "";
  if (fileVal && !isDummyValue(fileVal)) {
    return fileVal;
  }
  return osVal || fileVal || "";
}
