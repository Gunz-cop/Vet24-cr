import { normalizeSlug } from "./seo";

export const priorityZones = [
  { nombre: "Guápiles", slug: "guapiles" },
  { nombre: "San Pablo de Heredia", slug: "san-pablo-heredia", aliases: ["san-pablo-de-heredia"] },
  { nombre: "Grecia", slug: "grecia", aliases: ["grecia-centro"] },
  { nombre: "Nicoya", slug: "nicoya", aliases: ["nicoya-centro"] },
  { nombre: "San Ramón", slug: "san-ramon", aliases: ["san-ramon-centro"] },
  { nombre: "Curridabat", slug: "curridabat" },
  { nombre: "Siquirres", slug: "siquirres" }
] as const;

export type PriorityZone = (typeof priorityZones)[number];

const aliasToZone = new Map<string, PriorityZone>();

for (const zone of priorityZones) {
  aliasToZone.set(zone.slug, zone);
  aliasToZone.set(normalizeSlug(zone.nombre), zone);
  for (const alias of ('aliases' in zone ? zone.aliases : [])) {
    aliasToZone.set(alias, zone);
  }
}

export function getPriorityZoneBySlug(slug: string): PriorityZone | undefined {
  return aliasToZone.get(normalizeSlug(slug));
}

export function getClinicZoneSlug(zona: string): string {
  const normalized = normalizeSlug(zona);
  return aliasToZone.get(normalized)?.slug || normalized;
}

export function getClinicZoneName(zona: string): string {
  const normalized = normalizeSlug(zona);
  return aliasToZone.get(normalized)?.nombre || zona;
}
