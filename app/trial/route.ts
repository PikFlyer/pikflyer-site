import { checkTrial, methodNotAllowed, relayError } from "../licenseRelay";

export async function POST(request: Request): Promise<Response> {
  try {
    return await checkTrial(request);
  } catch (error) {
    return relayError(error);
  }
}

export const GET = methodNotAllowed;
