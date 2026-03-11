import type {
  DbUser,
  DbProperty,
  DbPhoto,
  DbAnalysis,
  DbRenovation,
  DbDesignJourneyItem,
} from "@str-renovator/shared";

const MOCK_USER_ID = "user-uuid-1";
const MOCK_CLERK_ID = "clerk_test_123";
const MOCK_PROPERTY_ID = "prop-uuid-1";
const MOCK_PHOTO_ID = "photo-uuid-1";
const MOCK_ANALYSIS_ID = "analysis-uuid-1";
const MOCK_ANALYSIS_PHOTO_ID = "ap-uuid-1";
const MOCK_RENOVATION_ID = "reno-uuid-1";
const MOCK_JOURNEY_ID = "journey-uuid-1";

export function makeUser(overrides?: Partial<DbUser>): DbUser {
  return {
    id: MOCK_USER_ID,
    clerk_id: MOCK_CLERK_ID,
    email: "test@example.com",
    name: "Test User",
    avatar_url: null,
    tier: "pro",
    analyses_this_month: 0,
    current_period_start: "2026-03-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeProperty(
  userId = MOCK_USER_ID,
  overrides?: Partial<DbProperty>
): DbProperty {
  return {
    id: MOCK_PROPERTY_ID,
    user_id: userId,
    name: "Test Property",
    description: null,
    listing_url: null,
    context: null,
    address_line1: null,
    address_line2: null,
    city: null,
    state: null,
    zip_code: null,
    country: null,
    scraped_data: null,
    location_profile: null,
    property_profile: null,
    review_analysis: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makePhoto(
  userId = MOCK_USER_ID,
  propertyId = MOCK_PROPERTY_ID,
  overrides?: Partial<DbPhoto>
): DbPhoto {
  return {
    id: MOCK_PHOTO_ID,
    property_id: propertyId,
    user_id: userId,
    filename: "living-room.jpg",
    storage_path: `${userId}/${propertyId}/living-room.jpg`,
    mime_type: "image/jpeg",
    source: "upload",
    display_name: null,
    description: null,
    tags: [],
    constraints: [],
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeAnalysis(
  userId = MOCK_USER_ID,
  propertyId = MOCK_PROPERTY_ID,
  overrides?: Partial<DbAnalysis>
): DbAnalysis {
  return {
    id: MOCK_ANALYSIS_ID,
    property_id: propertyId,
    user_id: userId,
    status: "completed",
    property_assessment: "Great property",
    style_direction: "Modern farmhouse",
    raw_json: null,
    total_photos: 3,
    completed_photos: 3,
    error: null,
    total_batches: 1,
    completed_batches: 1,
    failed_batches: 0,
    is_active: true,
    prompt_version: null,
    model: null,
    tokens_used: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeRenovation(
  userId = MOCK_USER_ID,
  analysisPhotoId = MOCK_ANALYSIS_PHOTO_ID,
  overrides?: Partial<DbRenovation>
): DbRenovation {
  return {
    id: MOCK_RENOVATION_ID,
    analysis_photo_id: analysisPhotoId,
    user_id: userId,
    storage_path: `${userId}/renovations/reno-1.png`,
    iteration: 1,
    parent_renovation_id: null,
    feedback_context: null,
    status: "completed",
    error: null,
    prompt_version: null,
    model: null,
    tokens_used: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeJourneyItem(
  userId = MOCK_USER_ID,
  propertyId = MOCK_PROPERTY_ID,
  overrides?: Partial<DbDesignJourneyItem>
): DbDesignJourneyItem {
  return {
    id: MOCK_JOURNEY_ID,
    property_id: propertyId,
    analysis_id: MOCK_ANALYSIS_ID,
    user_id: userId,
    priority: 1,
    title: "Replace kitchen countertops",
    description: "Upgrade to quartz countertops",
    estimated_cost: "$2,000-4,000",
    actual_cost: null,
    impact: "high",
    rooms_affected: ["kitchen"],
    status: "not_started",
    notes: null,
    image_storage_path: null,
    image_status: "pending",
    source_photo_id: null,
    prompt_version: null,
    model: null,
    tokens_used: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeScrapeJob(
  propertyId = MOCK_PROPERTY_ID,
  overrides?: Record<string, unknown>
) {
  return {
    id: "scrape-uuid-1",
    property_id: propertyId,
    user_id: MOCK_USER_ID,
    listing_url: "https://www.airbnb.com/rooms/12345",
    status: "pending",
    result: null,
    error: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}
