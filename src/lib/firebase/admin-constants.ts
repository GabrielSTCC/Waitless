export const CREDENTIAL_SETUP_MESSAGE =
  "Configure a conta de serviço: localmente rode npm run setup:service-account; na Vercel defina FIREBASE_SERVICE_ACCOUNT_JSON.";

export function isCredentialSetupError(message: string): boolean {
  return (
    message.includes("FIREBASE_SERVICE_ACCOUNT") ||
    message.includes("credenciais Firebase Admin") ||
    message.includes("Could not load the default credentials") ||
    message.includes(CREDENTIAL_SETUP_MESSAGE)
  );
}
