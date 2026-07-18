import { deactivate, methodNotAllowed, relayError } from "../licenseRelay";

export async function POST(request: Request) {
  try {
    return await deactivate(request);
  } catch (error) {
    return relayError(error);
  }
}

export function GET() {
  return methodNotAllowed();
}
