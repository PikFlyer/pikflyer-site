import { activate, methodNotAllowed, relayError } from "../licenseRelay";

export async function POST(request: Request) {
  try {
    return await activate(request);
  } catch (error) {
    return relayError(error);
  }
}

export function GET() {
  return methodNotAllowed();
}
