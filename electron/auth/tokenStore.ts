import { safeStorage } from "electron";

export const encryptToBase64 = (plaintext: string) => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("safeStorage encryption is not available");
  }
  const encrypted = safeStorage.encryptString(plaintext);
  return encrypted.toString("base64");
};

export const decryptFromBase64 = (ciphertextBase64: string) => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("safeStorage encryption is not available");
  }
  const encrypted = Buffer.from(ciphertextBase64, "base64");
  return safeStorage.decryptString(encrypted);
};
