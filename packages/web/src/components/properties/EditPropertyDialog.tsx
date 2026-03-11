import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PropertyForm } from "./PropertyForm";
import type { DbProperty, CreatePropertyDto } from "@str-renovator/shared";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: DbProperty;
  onSubmit: (data: CreatePropertyDto) => void;
  isLoading?: boolean;
}

export function EditPropertyDialog({
  open,
  onOpenChange,
  property,
  onSubmit,
  isLoading,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Property</DialogTitle>
          <DialogDescription>
            Update the details for {property.name}.
          </DialogDescription>
        </DialogHeader>
        <PropertyForm
          initialValues={{
            name: property.name,
            description: property.description ?? undefined,
            listing_url: property.listing_url ?? undefined,
            context: property.context ?? undefined,
            address_line1: property.address_line1 ?? undefined,
            address_line2: property.address_line2 ?? undefined,
            city: property.city ?? undefined,
            state: property.state ?? undefined,
            zip_code: property.zip_code ?? undefined,
            country: property.country ?? undefined,
          }}
          onSubmit={(data) => {
            onSubmit(data);
            onOpenChange(false);
          }}
          isLoading={isLoading}
          submitLabel="Update Property"
        />
      </DialogContent>
    </Dialog>
  );
}
