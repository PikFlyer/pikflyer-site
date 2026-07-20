import {
  createInviteCodes,
  listInviteCodes,
  methodNotAllowed,
  relayError,
} from "../licenseRelay";

export async function POST(request: Request) {
  try {
    return await createInviteCodes(request);
  } catch (error) {
    return relayError(error);
  }
}

export async function GET(request: Request) {
  try {
    return await listInviteCodes(request);
  } catch (error) {
    return relayError(error);
  }
}

export function PUT() {
  return methodNotAllowed();
}

export function DELETE() {
  return methodNotAllowed();
}
