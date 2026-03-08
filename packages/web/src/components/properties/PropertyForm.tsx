import { useState } from "react";
import type { CreatePropertyDto, UpdatePropertyDto } from "@str-renovator/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  initialValues?: Partial<CreatePropertyDto & UpdatePropertyDto>;
  onSubmit: (data: CreatePropertyDto) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function PropertyForm({
  initialValues,
  onSubmit,
  isLoading,
  submitLabel = "Save",
}: Props) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [listingUrl, setListingUrl] = useState(
    initialValues?.listing_url ?? "",
  );
  const [context, setContext] = useState(initialValues?.context ?? "");
  const [addressLine1, setAddressLine1] = useState(initialValues?.address_line1 ?? "");
  const [addressLine2, setAddressLine2] = useState(initialValues?.address_line2 ?? "");
  const [city, setCity] = useState(initialValues?.city ?? "");
  const [state, setState] = useState(initialValues?.state ?? "");
  const [zipCode, setZipCode] = useState(initialValues?.zip_code ?? "");
  const [country, setCountry] = useState(initialValues?.country ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description: description || undefined,
      listing_url: listingUrl || undefined,
      context: context || undefined,
      address_line1: addressLine1 || undefined,
      address_line2: addressLine2 || undefined,
      city: city || undefined,
      state: state || undefined,
      zip_code: zipCode || undefined,
      country: country || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Property Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Mountain View Cabin"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Brief description of the property..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="listingUrl">Listing URL</Label>
        <Input
          id="listingUrl"
          type="url"
          value={listingUrl}
          onChange={(e) => setListingUrl(e.target.value)}
          placeholder="https://airbnb.com/rooms/..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="addressLine1">Address Line 1</Label>
        <Input
          id="addressLine1"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          placeholder="123 Main Street"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="addressLine2">Address Line 2</Label>
        <Input
          id="addressLine2"
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
          placeholder="Apt, suite, unit, etc."
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="State"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zipCode">ZIP Code</Label>
          <Input
            id="zipCode"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            placeholder="ZIP"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Input
          id="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="US"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="context">Additional Context</Label>
        <Textarea
          id="context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
          placeholder="Any specific goals, style preferences, budget constraints..."
        />
      </div>

      <Button
        type="submit"
        disabled={isLoading || !name.trim()}
        className="w-full"
      >
        {isLoading ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
