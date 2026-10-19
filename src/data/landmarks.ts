import { shift } from "../lib/area";
import type { Place, PlaceCategory } from "../types";

// Popular pickup and drop-off points in Sokoto city. Coordinates from Google Maps (Oct 2026).
// In production these come from the backend (GET /places/popular) so admins can add and edit them;
// this list is the built-in fallback and the seed data for that collection.
type Row = [id: string, name: string, subtitle: string, category: PlaceCategory, lat: number, lng: number, popular?: boolean];

const ROWS: Row[] = [
  ["babbar-kasuwa", "Babbar Kasuwa", "Sokoto Central Market", "market", 13.06157, 5.22601, true],
  ["tsohuwar-kasuwa", "Tsohuwar Kasuwa", "Old Market", "market", 13.06287, 5.23405],
  ["marna-market", "Marna Market", "Market", "market", 13.05718, 5.24661],
  ["albarka-market", "Albarka Modern Market", "Market", "market", 13.05914, 5.22196],
  ["sultan-bello-mosque", "Sultan Bello Mosque", "Mosque", "mosque", 13.06746, 5.24663, true],
  ["sultans-palace", "Sultan's Palace", "Fadar Sarkin Musulmi", "landmark", 13.06736, 5.2482],
  ["sultan-saad-mosque", "Sultan Muhammadu Sa'ad Abubakar III Mosque", "Mosque", "mosque", 12.94197, 5.19455],
  ["udus-city-campus", "UDUS City Campus", "Usmanu Danfodiyo University", "school", 13.04036, 5.24538, true],
  ["northwest-university", "Northwest University", "University", "school", 13.04531, 5.19306],
  ["saisa-university", "Saisa University of Medical Sciences", "University", "school", 13.00659, 5.25093],
  ["noun-sokoto", "National Open University", "Sokoto study centre", "school", 13.02971, 5.21986],
  ["karaye-hospital", "Karaye Specialist Hospital", "Emir Yahaya Road", "health", 13.05094, 5.2338],
  ["caliphate-hospital", "Caliphate Multi-Specialty Hospital", "Ibrahim Dasuki Road", "health", 13.04278, 5.23581],
  ["sahel-hospital", "Sahel Specialist Hospital", "Hospital", "health", 13.00858, 5.25458],
  ["shepherd-hospital", "Shepherd Specialist Hospital", "Shuni Road", "health", 13.03603, 5.25034],
  ["government-house", "Government House", "Sokoto State", "gov", 13.0319, 5.23132],
  ["federal-secretariat", "Federal Secretariat", "Government offices", "gov", 13.01751, 5.23938],
  ["nysc-secretariat", "NYSC State Secretariat", "Government offices", "gov", 13.03476, 5.19942],
  ["giginya-stadium", "Giginya Memorial Stadium", "Stadium", "landmark", 13.05007, 5.23881],
  ["central-motor-park", "Central Motor Park", "Intercity buses", "transport", 13.00587, 5.24755, true],
  ["kwannawa-motor-park", "Kwannawa Motor Park", "Intercity buses", "transport", 12.9946, 5.25865],
  ["main-motor-park", "Main Motor Park", "By Babbar Kasuwa", "transport", 13.06001, 5.22509],
  ["alu-motor-park", "Alu Motor Park", "Motor park", "transport", 13.05525, 5.21884],
  ["zabira-mall", "Zabira Mall", "Shopping", "shopping", 13.02537, 5.22178, true],
  ["jidda-plaza", "Jidda Plaza", "Shopping", "shopping", 13.04593, 5.24599],
  ["centre-point-plaza", "Centre Point Business Plaza", "Shopping", "shopping", 13.02617, 5.23949],
  ["alkanchi-plaza", "Alkanchi Plaza", "Shopping", "shopping", 13.01696, 5.21482],
  ["soulcare-hotel", "SoulCare Gardens Hotel", "Hotel", "hotel", 13.02603, 5.2316],
  ["pinnacle-guest-inn", "Pinnacle Guest Inn", "Hotel", "hotel", 13.05417, 5.20837],
  ["sokoto-airport", "Sultan Abubakar III International Airport", "Sokoto airport", "airport", 12.91771, 5.2084, true],
];

type Landmark = Place & { popular: boolean };

const BASE: Landmark[] = ROWS.map(([id, name, subtitle, category, latitude, longitude, popular]) => ({
  id, name, subtitle, category, location: { latitude, longitude }, popular: !!popular,
}));

/** Landmarks as shown on the map (moved to your location in sample mode outside Sokoto). */
export function landmarks(): Landmark[] {
  return BASE.map((l) => ({ ...l, location: shift(l.location) }));
}

export function popular(): Landmark[] {
  return landmarks().filter((l) => l.popular);
}

/** Short labels for chips. */
export const SHORT_NAMES: Record<string, string> = {
  "sokoto-airport": "Airport",
  "central-motor-park": "Central Motor Park",
};
