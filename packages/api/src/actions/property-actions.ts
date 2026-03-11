/**
 * @module property-actions
 * @capability Pure function that computes available actions for a property
 * @layer Orchestration
 *
 * Examines property state and context to determine which actions
 * the user can perform. The frontend renders these directly via ActionBar.
 */

import type { DbProperty, AvailableAction } from "@str-renovator/shared";

interface PropertyActionContext {
  photoCount: number;
  hasScrapedData: boolean;
}

export function computePropertyActions(
  property: DbProperty,
  context: PropertyActionContext,
): AvailableAction[] {
  const actions: AvailableAction[] = [];

  actions.push({
    label: "Upload Photos",
    command: "upload-photos",
    params: { propertyId: property.id },
    variant: "secondary",
    icon: "Upload",
  });

  if (context.photoCount > 0) {
    actions.push({
      label: "Run Analysis",
      command: "run-analysis",
      params: { propertyId: property.id },
      variant: "primary",
      icon: "FlaskConical",
    });
  } else {
    actions.push({
      label: "Run Analysis",
      command: "run-analysis",
      params: { propertyId: property.id },
      variant: "primary",
      icon: "FlaskConical",
      disabled: true,
      disabledReason: "Upload at least one photo before running analysis",
    });
  }

  if (property.listing_url) {
    actions.push({
      label: "Import Listing Data",
      command: "import-listing",
      params: { propertyId: property.id, listingUrl: property.listing_url },
      variant: "secondary",
      icon: "Download",
    });
  }

  if (property.city || property.state) {
    actions.push({
      label: "Research Location",
      command: "research-location",
      params: { propertyId: property.id },
      variant: "secondary",
      icon: "Search",
    });
  }

  actions.push({
    label: "Edit Property",
    command: "edit-property",
    params: { propertyId: property.id },
    variant: "secondary",
    icon: "Pencil",
  });

  actions.push({
    label: "View Journey",
    command: "view-journey",
    params: { propertyId: property.id },
    variant: "secondary",
    icon: "Compass",
  });

  actions.push({
    label: "Delete Property",
    command: "delete-property",
    params: { propertyId: property.id },
    variant: "destructive",
    icon: "Trash2",
    confirmation: "Are you sure you want to delete this property? This action cannot be undone.",
  });

  return actions;
}
