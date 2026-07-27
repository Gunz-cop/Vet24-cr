import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const clinicas = defineCollection({
  // Load Markdown files from src/content/clinicas/
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/clinicas" }),
  schema: z.object({
    id: z.union([z.number(), z.string()]),
    nombre: z.string(),
    provincia: z.string(),
    zona: z.string(),
    direccion: z.string(),
    telefono1: z.string().optional().default(""),
    telefono2: z.string().optional().default(""),
    whatsapp: z.string().optional().default(""),
    horarioTexto: z.string(),
    categoriaHorario: z.enum(["24/7 Emergencias", "Cierra después 21h", "Horario normal"]),
    emergencias24h: z.boolean(),
    atiendeExoticos: z.boolean(),
    cirugiaEmergencia: z.boolean(),
    atiendeGranja: z.boolean().optional().default(false),
    atiendePeces: z.boolean().optional().default(false),
    hotelMascotas: z.boolean().optional().default(false),
    hotelVerificacion: z.enum(["confirmado", "reportado", "no-confirmado"]).optional().default("no-confirmado"),
    hotelFuente: z.string().optional().default(""),
    confidence_score: z.enum(["high", "medium", "low"]).optional().default("medium"),
    record_status: z.enum(["VERIFIED", "PARTIAL", "REVIEW_REQUIRED", "CANDIDATE_REMOVAL"]).optional().default("PARTIAL"),
    emergency_tier: z.enum(["Tier A", "Tier B", "Tier C", "Tier D"]).optional().default("Tier C"),
    last_verified: z.string().optional().default(""),
    phone_verified: z.boolean().optional().default(false),
    address_verified: z.boolean().optional().default(false),
    schedule_verified: z.boolean().optional().default(false),
    emergency_verified: z.boolean().optional().default(false),
    has_surgery: z.boolean().optional().default(false),
    has_hospitalization: z.boolean().optional().default(false),
    overnight_doctor_present: z.boolean().optional().default(false),
    accepts_emergency_walkins: z.boolean().optional().default(false),
    verification_notes: z.array(z.string()).optional().default([]),
    verification_source: z.string().optional().default(""),
    latitude: z.number().optional().default(0),
    longitude: z.number().optional().default(0),
    waze_url: z.string().optional().default(""),
    maps_url: z.string().optional().default(""),
    web: z.string().optional().default(""),
    facebook: z.string().optional().default(""),
    instagram: z.string().optional().default(""),
    slug: z.string(),
    estado: z.enum(["pendiente", "publicado", "verificado", "inactivo"]),
    copyDiferenciador: z.string(),
  })
});

export const collections = { clinicas };
