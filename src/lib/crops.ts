export interface Crop { key: string; en: string; hi: string; emoji: string; rate: number; temp: string; agmark: string[] }
// `rate` is only a fallback when live mandi prices are unavailable.
export const CROPS: Crop[] = [
  { key: "tomato", en: "Tomato", hi: "टमाटर", emoji: "🍅", rate: 30, temp: "8–10°C", agmark: ["Tomato"] },
  { key: "beans", en: "Green beans", hi: "हरी फलियाँ", emoji: "🫛", rate: 44, temp: "4–7°C", agmark: ["Beans", "French Beans (Frasbean)", "Cluster beans"] },
  { key: "mango", en: "Mango", hi: "आम", emoji: "🥭", rate: 65, temp: "10–13°C", agmark: ["Mango", "Mango (Raw-Ripe)"] },
  { key: "papaya", en: "Papaya", hi: "पपीता", emoji: "🍈", rate: 28, temp: "10–12°C", agmark: ["Papaya", "Papaya (Raw)"] },
  { key: "banana", en: "Banana", hi: "केला", emoji: "🍌", rate: 35, temp: "13–14°C", agmark: ["Banana", "Banana - Green"] },
  { key: "spinach", en: "Spinach", hi: "पालक", emoji: "🥬", rate: 24, temp: "0–2°C", agmark: ["Spinach"] },
  { key: "apple", en: "Apple", hi: "सेब", emoji: "🍎", rate: 120, temp: "0–4°C", agmark: ["Apple"] },
  { key: "potato", en: "Potato", hi: "आलू", emoji: "🥔", rate: 22, temp: "4–8°C", agmark: ["Potato"] },
];
export const cropBy = (k: string): Crop => CROPS.find((c) => c.key === k) ?? CROPS[0]!;

