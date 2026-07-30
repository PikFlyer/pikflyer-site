import {
  methodNotAllowed,
  relayError,
  trialStatus,
} from "../../licenseRelay";

export async function POST(request: Request): Promise<Response> {
  try {
    return await trialStatus(request);
  } catch (error) {
    return relayError(error);
  }
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
