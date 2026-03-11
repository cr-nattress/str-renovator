/**
 * @module domain-events
 * @capability Typed domain event definitions for the event bus
 * @layer Contract (shared package)
 *
 * Defines strongly-typed domain event interfaces extending BaseDomainEvent.
 * Each event carries a typed `data` payload specific to what happened.
 * The `DomainEvent` union replaces the untyped version from command-response.ts.
 *
 * @see packages/shared/src/manifests/events.ts — declarative event registry
 * @see packages/api/src/events/event-bus.ts — in-process pub/sub consumer
 */

export interface BaseDomainEvent {
  type: string;
  entityType: string;
  entityId: string;
  userId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// --- Property events ---

export interface PropertyCreatedEvent extends BaseDomainEvent {
  type: "PropertyCreated";
  entityType: "Property";
  data: { propertyId: string; userId: string; name: string };
}

export interface PropertyUpdatedEvent extends BaseDomainEvent {
  type: "PropertyUpdated";
  entityType: "Property";
  data: { propertyId: string; userId: string; updatedFields: string[] };
}

export interface PropertyDeletedEvent extends BaseDomainEvent {
  type: "PropertyDeleted";
  entityType: "Property";
  data: { propertyId: string; userId: string };
}

// --- Photo events ---

export interface PhotoUploadedEvent extends BaseDomainEvent {
  type: "PhotoUploaded";
  entityType: "Photo";
  data: { propertyId: string; userId: string; photoIds: string[]; count: number };
}

export interface PhotoUpdatedEvent extends BaseDomainEvent {
  type: "PhotoUpdated";
  entityType: "Photo";
  data: { photoId: string; userId: string; updatedFields: string[] };
}

export interface PhotoDeletedEvent extends BaseDomainEvent {
  type: "PhotoDeleted";
  entityType: "Photo";
  data: { photoId: string; userId: string; propertyId: string };
}

// --- Analysis events ---

export interface AnalysisSubmittedEvent extends BaseDomainEvent {
  type: "AnalysisSubmitted";
  entityType: "Analysis";
  data: { analysisId: string; propertyId: string; userId: string; photoCount: number };
}

export interface AnalysisCompletedEvent extends BaseDomainEvent {
  type: "AnalysisCompleted";
  entityType: "Analysis";
  data: { analysisId: string; propertyId: string; userId: string; promptVersion: string };
}

export interface AnalysisFailedEvent extends BaseDomainEvent {
  type: "AnalysisFailed";
  entityType: "Analysis";
  data: { analysisId: string; propertyId: string; userId: string; error: string };
}

export interface AnalysisUpdatedEvent extends BaseDomainEvent {
  type: "AnalysisUpdated";
  entityType: "Analysis";
  data: { analysisId: string; userId: string; updatedFields: string[] };
}

export interface AnalysisArchivedEvent extends BaseDomainEvent {
  type: "AnalysisArchived";
  entityType: "Analysis";
  data: { analysisId: string; userId: string };
}

// --- Renovation events ---

export interface RenovationSubmittedEvent extends BaseDomainEvent {
  type: "RenovationSubmitted";
  entityType: "Renovation";
  data: { renovationId: string; analysisPhotoId: string; userId: string; iteration: number };
}

export interface RenovationCompletedEvent extends BaseDomainEvent {
  type: "RenovationCompleted";
  entityType: "Renovation";
  data: { renovationId: string; analysisPhotoId: string; userId: string; iteration: number; promptVersion: string };
}

export interface RenovationFailedEvent extends BaseDomainEvent {
  type: "RenovationFailed";
  entityType: "Renovation";
  data: { renovationId: string; analysisPhotoId: string; userId: string; error: string };
}

// --- Feedback events ---

export interface FeedbackSubmittedEvent extends BaseDomainEvent {
  type: "FeedbackSubmitted";
  entityType: "Feedback";
  data: { feedbackId: string; renovationId: string; userId: string; rating: "like" | "dislike" };
}

// --- Scrape events ---

export interface ScrapeSubmittedEvent extends BaseDomainEvent {
  type: "ScrapeSubmitted";
  entityType: "ScrapeJob";
  data: { scrapeJobId: string; propertyId: string; userId: string; listingUrl: string };
}

export interface ScrapeCompletedEvent extends BaseDomainEvent {
  type: "ScrapeCompleted";
  entityType: "ScrapeJob";
  data: { scrapeJobId: string; propertyId: string; userId: string };
}

// --- Location research events ---

export interface LocationResearchSubmittedEvent extends BaseDomainEvent {
  type: "LocationResearchSubmitted";
  entityType: "Property";
  data: { propertyId: string; userId: string };
}

export interface LocationResearchCompletedEvent extends BaseDomainEvent {
  type: "LocationResearchCompleted";
  entityType: "Property";
  data: { propertyId: string; userId: string; promptVersion: string };
}

// --- Profile events ---

export interface ProfileSynthesizedEvent extends BaseDomainEvent {
  type: "ProfileSynthesized";
  entityType: "Property";
  data: { propertyId: string; userId: string; promptVersion: string };
}

// --- Journey events ---

export interface JourneyItemCreatedEvent extends BaseDomainEvent {
  type: "JourneyItemCreated";
  entityType: "JourneyItem";
  data: { journeyItemId: string; propertyId: string; userId: string; priority: number };
}

export interface JourneyItemUpdatedEvent extends BaseDomainEvent {
  type: "JourneyItemUpdated";
  entityType: "JourneyItem";
  data: { journeyItemId: string; userId: string; updatedFields: string[] };
}

/** Union of all typed domain events the platform can emit. */
export type DomainEvent =
  | PropertyCreatedEvent
  | PropertyUpdatedEvent
  | PropertyDeletedEvent
  | PhotoUploadedEvent
  | PhotoUpdatedEvent
  | PhotoDeletedEvent
  | AnalysisSubmittedEvent
  | AnalysisCompletedEvent
  | AnalysisFailedEvent
  | AnalysisUpdatedEvent
  | AnalysisArchivedEvent
  | RenovationSubmittedEvent
  | RenovationCompletedEvent
  | RenovationFailedEvent
  | FeedbackSubmittedEvent
  | ScrapeSubmittedEvent
  | ScrapeCompletedEvent
  | LocationResearchSubmittedEvent
  | LocationResearchCompletedEvent
  | ProfileSynthesizedEvent
  | JourneyItemCreatedEvent
  | JourneyItemUpdatedEvent;

/** Extracts the event type string union from DomainEvent. */
export type DomainEventType = DomainEvent["type"];
