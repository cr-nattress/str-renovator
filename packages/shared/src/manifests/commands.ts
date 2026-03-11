/**
 * @module commands
 * @capability Capability Registry — Command Manifests
 * @layer Shared (contract layer)
 *
 * Declarative registry of all state-mutating commands the platform exposes.
 * Each entry maps a named intent to its HTTP surface, access control,
 * async job behavior, and emitted domain events.
 *
 * Consumers: CLI help generation, auto-generated API docs, admin dashboards,
 * agent tool routing, audit trail.
 */

/** Describes a single platform command. */
export interface CommandManifest {
  /** Unique PascalCase command identifier. */
  id: string;
  /** What this command does. */
  description: string;
  /** HTTP method on the REST surface. */
  httpMethod: "POST" | "PATCH" | "DELETE";
  /** REST route pattern (Express-style). */
  route: string;
  /** When true, the endpoint is gated by tier-based limits. */
  tierGated?: boolean;
  /** When true, the command enqueues a BullMQ job rather than completing synchronously. */
  triggersJob?: boolean;
  /** Domain event types emitted on success. */
  emitsEvents: string[];
  /** When true, the handler verifies the caller owns the target entity. */
  requiresOwnership: boolean;
}

/**
 * Central registry of every command the platform supports.
 *
 * @see packages/api/src/routes/ for Express handlers
 * @see packages/api/src/services/queue.service.ts for job dispatch
 */
export const COMMAND_REGISTRY = [
  {
    id: "CreateProperty",
    description: "Create a new STR property for the authenticated user.",
    httpMethod: "POST",
    route: "/api/properties",
    tierGated: true,
    emitsEvents: ["PropertyCreated"],
    requiresOwnership: false,
  },
  {
    id: "UpdateProperty",
    description: "Update an existing property's metadata (name, description, address, listing URL, scraped data, location profile).",
    httpMethod: "PATCH",
    route: "/api/properties/:id",
    emitsEvents: ["PropertyUpdated"],
    requiresOwnership: true,
  },
  {
    id: "DeleteProperty",
    description: "Permanently delete a property and cascade-remove associated photos, analyses, and renovations.",
    httpMethod: "DELETE",
    route: "/api/properties/:id",
    emitsEvents: ["PropertyDeleted"],
    requiresOwnership: true,
  },
  {
    id: "UploadPhotos",
    description: "Upload one or more listing photos for a property (max 10 per request).",
    httpMethod: "POST",
    route: "/api/properties/:propertyId/photos",
    tierGated: true,
    emitsEvents: ["PhotoUploaded"],
    requiresOwnership: true,
  },
  {
    id: "UpdatePhotoMetadata",
    description: "Update a photo's display name, description, tags, or constraints.",
    httpMethod: "PATCH",
    route: "/api/photos/:id",
    emitsEvents: ["PhotoUpdated"],
    requiresOwnership: true,
  },
  {
    id: "DeletePhoto",
    description: "Delete a photo from storage and the database.",
    httpMethod: "DELETE",
    route: "/api/photos/:id",
    emitsEvents: ["PhotoDeleted"],
    requiresOwnership: true,
  },
  {
    id: "SubmitAnalysis",
    description: "Submit a property for AI photo analysis. Enqueues a BullMQ job and returns immediately with 202.",
    httpMethod: "POST",
    route: "/api/properties/:propertyId/analyses",
    tierGated: true,
    triggersJob: true,
    emitsEvents: ["AnalysisSubmitted"],
    requiresOwnership: true,
  },
  {
    id: "EditAnalysisFields",
    description: "Edit AI-generated analysis fields (property_assessment, style_direction) in place.",
    httpMethod: "PATCH",
    route: "/api/analyses/:id",
    emitsEvents: ["AnalysisUpdated"],
    requiresOwnership: true,
  },
  {
    id: "ArchiveAnalysis",
    description: "Soft-delete (archive) a completed analysis.",
    httpMethod: "PATCH",
    route: "/api/analyses/:id/archive",
    emitsEvents: ["AnalysisArchived"],
    requiresOwnership: true,
  },
  {
    id: "SubmitRenovationFeedback",
    description: "Submit a like/dislike rating with optional comment on a renovation image.",
    httpMethod: "POST",
    route: "/api/renovations/:id/feedback",
    emitsEvents: ["FeedbackSubmitted"],
    requiresOwnership: true,
  },
  {
    id: "RerunRenovation",
    description: "Re-run a renovation with accumulated feedback context. Creates a new iteration and enqueues a BullMQ job.",
    httpMethod: "POST",
    route: "/api/renovations/:id/rerun",
    tierGated: true,
    triggersJob: true,
    emitsEvents: ["RenovationSubmitted"],
    requiresOwnership: true,
  },
  {
    id: "ScrapePropertyListing",
    description: "Start a background scrape of a property's listing URL. Enqueues a BullMQ job to extract structured data.",
    httpMethod: "POST",
    route: "/api/properties/:propertyId/scrape",
    tierGated: true,
    triggersJob: true,
    emitsEvents: ["ScrapeSubmitted"],
    requiresOwnership: true,
  },
  {
    id: "ResearchPropertyLocation",
    description: "Start background AI research on a property's location. Requires city or state on the property record.",
    httpMethod: "POST",
    route: "/api/properties/:propertyId/research-location",
    triggersJob: true,
    emitsEvents: ["LocationResearchSubmitted"],
    requiresOwnership: true,
  },
  {
    id: "CreateJourneyItem",
    description: "Add a new item to a property's design renovation journey (action plan).",
    httpMethod: "POST",
    route: "/api/properties/:propertyId/journey",
    emitsEvents: ["JourneyItemCreated"],
    requiresOwnership: true,
  },
  {
    id: "UpdateJourneyItem",
    description: "Update a journey item's status, actual cost, or notes.",
    httpMethod: "PATCH",
    route: "/api/journey/:id",
    emitsEvents: ["JourneyItemUpdated"],
    requiresOwnership: true,
  },
] as const satisfies readonly CommandManifest[];

/** Command ID union type derived from the registry. */
export type CommandId = (typeof COMMAND_REGISTRY)[number]["id"];
