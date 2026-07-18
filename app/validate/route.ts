import { methodNotAllowed, relayError, validate } from "../licenseRelay";

export async function POST(request: Request) {
  try {
    return await validate(request);
  } catch (error) {
    return relayError(error);
  }
}

export function GET() {
  return methodNotAllowed();
}
