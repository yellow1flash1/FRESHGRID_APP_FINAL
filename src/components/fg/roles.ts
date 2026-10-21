import { Sprout, Store, Truck, Warehouse } from "lucide-react";
import type { Role } from "@/lib/types";

/** The four kinds of FreshGrid account, in the order the welcome screen shows them. */
export const ROLES: {
  k: Role;
  I: typeof Sprout;
  en: string;
  hi: string;
  descEn: string;
  descHi: string;
}[] = [
  {
    k: "farmer",
    I: Sprout,
    en: "Farmer",
    hi: "किसान",
    descEn: "Grade crops, book cold storage and trucks, sell to buyers",
    descHi: "फसल ग्रेड करें, कोल्ड स्टोर और ट्रक बुक करें, खरीदार को बेचें",
  },
  {
    k: "transporter",
    I: Truck,
    en: "Transporter",
    hi: "ट्रांसपोर्टर",
    descEn: "Find loads near you, deliver produce, get paid",
    descHi: "पास के माल की बुकिंग लें, डिलीवरी करें, भुगतान पाएँ",
  },
  {
    k: "buyer",
    I: Store,
    en: "Buyer",
    hi: "खरीदार",
    descEn: "Buy graded produce straight from farmers",
    descHi: "किसानों से सीधे ग्रेड किया हुआ माल खरीदें",
  },
  {
    k: "owner",
    I: Warehouse,
    en: "Cold room / Warehouse owner",
    hi: "कोल्ड रूम / गोदाम मालिक",
    descEn: "List your storage, manage bookings and earnings",
    descHi: "अपना स्टोरेज जोड़ें, बुकिंग और कमाई संभालें",
  },
];
export const roleInfo = (r: Role) => ROLES.find((x) => x.k === r) ?? ROLES[0]!;

// The role picked on the welcome screen, kept for this browser tab only so it survives the
// sign-up / Google redirect but the welcome screen shows again next time the app is opened.
const KEY = "freshgrid-picked-role";
export function getPickedRole(): Role | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return ROLES.some((x) => x.k === v) ? (v as Role) : null;
  } catch {
    return null;
  }
}
export function setPickedRole(r: Role | null) {
  try {
    if (r) sessionStorage.setItem(KEY, r);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* storage blocked */
  }
}
