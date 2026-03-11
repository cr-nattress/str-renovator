import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProperty } from "../../api/properties";
import { useCreatePropertyFromUrl } from "../../api/properties";
import { Link2, FileText, Type } from "lucide-react";

const LISTING_URL_PATTERNS = [
  /airbnb\.(com|co\.\w+)\/rooms\//,
  /vrbo\.com\/\d+/,
  /booking\.com\/hotel\//,
  /https?:\/\/.+/,
];

type InputMode = "url" | "description" | "name";

function detectInputMode(text: string): InputMode {
  const trimmed = text.trim();
  if (!trimmed) return "name";
  if (LISTING_URL_PATTERNS.some((p) => p.test(trimmed))) return "url";
  if (trimmed.length > 50 || trimmed.includes(",")) return "description";
  return "name";
}

const STATE_ABBREVIATIONS =
  /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/;

const PROPERTY_TYPES =
  /\b(cabin|condo|house|apartment|cottage|villa|townhouse|bungalow|loft|studio)\b/i;

function extractFieldsFromDescription(text: string) {
  let city: string | undefined;
  let state: string | undefined;
  let propertyType: string | undefined;

  const cityStateMatch = text.match(/in\s+([A-Za-z\s]+),\s*([A-Z]{2})\b/);
  if (cityStateMatch) {
    city = cityStateMatch[1].trim();
    state = cityStateMatch[2];
  } else {
    const stateMatch = text.match(STATE_ABBREVIATIONS);
    if (stateMatch) state = stateMatch[1];
  }

  const typeMatch = text.match(PROPERTY_TYPES);
  if (typeMatch) propertyType = typeMatch[1].toLowerCase();

  return { city, state, propertyType };
}

interface PropertyIntentBoxProps {
  onCreated: (propertyId: string, scrapeJobId?: string) => void;
  onShowDetailedForm: () => void;
}

export function PropertyIntentBox({
  onCreated,
  onShowDetailedForm,
}: PropertyIntentBoxProps) {
  const [input, setInput] = useState("");
  const navigate = useNavigate();
  const createProperty = useCreateProperty();
  const createFromUrl = useCreatePropertyFromUrl();

  const mode = useMemo(() => detectInputMode(input), [input]);
  const extracted = useMemo(
    () => (mode === "description" ? extractFieldsFromDescription(input) : null),
    [input, mode],
  );

  const isSubmitting = createProperty.isPending || createFromUrl.isPending;

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (mode === "url") {
      createFromUrl.mutate(
        { listingUrl: trimmed },
        {
          onSuccess: (result) => {
            onCreated(result.data.property.id, result.data.scrape_job_id);
            navigate(`/properties/${result.data.property.id}`);
          },
        },
      );
    } else {
      const name =
        mode === "description"
          ? (extracted?.propertyType
              ? `${extracted.propertyType.charAt(0).toUpperCase() + extracted.propertyType.slice(1)}`
              : "New Property") +
            (extracted?.city ? ` in ${extracted.city}` : "") +
            (extracted?.state && !extracted?.city
              ? ` in ${extracted.state}`
              : "")
          : trimmed;

      createProperty.mutate(
        {
          name,
          description: mode === "description" ? trimmed : undefined,
          city: extracted?.city,
          state: extracted?.state,
          context:
            mode === "description" && extracted?.propertyType
              ? `Property type: ${extracted.propertyType}`
              : undefined,
        },
        {
          onSuccess: (property) => {
            onCreated(property.id);
            navigate(`/properties/${property.id}`);
          },
        },
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && mode !== "description") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {mode === "description" ? (
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your property... e.g. '3BR cabin in Gatlinburg, TN with mountain views, targeting family vacationers'"
            rows={3}
            autoFocus
          />
        ) : (
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste a listing URL or type a property name..."
            autoFocus
          />
        )}
      </div>

      {/* Mode indicator + action */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {mode === "url" && (
          <>
            <Link2 className="w-4 h-4" />
            <span>
              We'll import property details from this listing automatically.
            </span>
          </>
        )}
        {mode === "description" && extracted && (
          <>
            <FileText className="w-4 h-4" />
            <span>
              {[extracted.propertyType, extracted.city, extracted.state]
                .filter(Boolean)
                .length > 0
                ? `Detected: ${[extracted.propertyType, extracted.city, extracted.state].filter(Boolean).join(", ")}`
                : "Describe your property and we'll extract the details."}
            </span>
          </>
        )}
        {mode === "name" && input.trim() && (
          <>
            <Type className="w-4 h-4" />
            <span>Quick create with just a name.</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || isSubmitting}
          className="flex-1"
        >
          {isSubmitting
            ? "Creating..."
            : mode === "url"
              ? "Import from Listing"
              : "Create Property"}
        </Button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onShowDetailedForm}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          Use detailed form instead
        </button>
      </div>
    </div>
  );
}
