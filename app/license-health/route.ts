import { health } from "../licenseRelay";

export async function GET(request: Request) {
  return health(request);
}
