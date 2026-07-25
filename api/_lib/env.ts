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
    lower.includes("your_donation_script_id") ||
    lower.includes("your_lookup_script_id") ||
    lower.includes("your_deployment_id") ||
    lower === "placeholder" ||
    lower === "example"
  );
}

export function getEnv(key: string): string {
  // Donation Summary Apps Script URL
  if (key === "DONATION_APPS_SCRIPT_URL") {
    let rawVal = (process.env.DONATION_APPS_SCRIPT_URL || "").trim();
    if (!rawVal || isDummyValue(rawVal)) {
      const fileEnv = getFileEnv();
      rawVal = (fileEnv.DONATION_APPS_SCRIPT_URL || "").trim();
    }
    if (rawVal && !rawVal.startsWith("http")) {
      return `https://script.google.com/macros/s/${rawVal}/exec`;
    }
    return rawVal;
  }

  // Lookup / Receipt Verification Apps Script URL
  if (key === "LOOKUP_APPS_SCRIPT_URL") {
    let rawVal = (process.env.LOOKUP_APPS_SCRIPT_URL || "").trim();
    if (!rawVal || isDummyValue(rawVal)) {
      const fileEnv = getFileEnv();
      rawVal = (fileEnv.LOOKUP_APPS_SCRIPT_URL || "").trim();
    }
    if (rawVal && !rawVal.startsWith("http")) {
      return `https://script.google.com/macros/s/${rawVal}/exec`;
    }
    return rawVal;
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
