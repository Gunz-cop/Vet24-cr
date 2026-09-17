import type { APIRoute } from "astro";
import {
  clinicDetail,
  fail,
  listClinics,
  operation,
  patchReport,
  proposal,
  reports,
  retryOperation,
  saveOverride,
} from "../../../lib/admin/api.ts";

export const prerender = false;

const identity = (locals: App.Locals) =>
  (
    locals as unknown as {
      cfContext?: { props?: { adminIdentity?: { sub: string } } };
    }
  ).cfContext?.props?.adminIdentity?.sub || "unknown";

export const ALL: APIRoute = async ({ request, params, locals }) => {
  const path = (params.path || "").replace(/^\/+|\/+$/g, "");
  const parts = path.split("/").filter(Boolean);
  if (request.method === "GET" && parts[0] === "clinics" && !parts[1])
    return listClinics(new URL(request.url));
  if (request.method === "GET" && parts[0] === "clinics" && parts[1])
    return clinicDetail(parts[1]);
  if (
    (request.method === "PUT" || request.method === "DELETE") &&
    parts[0] === "overrides" &&
    parts[1]
  )
    return saveOverride(
      request,
      parts[1],
      identity(locals),
      request.method === "DELETE",
    );
  if (request.method === "POST" && parts[0] === "clinic-proposals")
    return proposal(request, identity(locals));
  if (request.method === "GET" && parts[0] === "reports")
    return reports(new URL(request.url));
  if (request.method === "GET" && parts[0] === "operations" && parts[1])
    return operation(parts[1], identity(locals));
  if (
    request.method === "POST" &&
    parts[0] === "operations" &&
    parts[1] &&
    parts[2] === "retry"
  )
    return retryOperation(request, parts[1], identity(locals));
  if (request.method === "PATCH" && parts[0] === "reports" && parts[1])
    return patchReport(request, parts[1], identity(locals));
  return fail(405, "METHOD_NOT_ALLOWED", "Método no permitido", {
    allow: "GET, POST, PUT, DELETE, PATCH",
  });
};
