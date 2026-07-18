import { health } from "../licenseRelay";

export async function GET() {
  return health();
}
