import { useState, useEffect } from "react";
import {
  useProperties,
  useCreateProperty,
  useCreatePropertyFromUrl,
} from "../api/properties";
import { PropertyCard } from "../components/properties/PropertyCard";
import { PropertyForm } from "../components/properties/PropertyForm";
import { PropertyIntentBox } from "../components/properties/PropertyIntentBox";
import { PropertyCardSkeleton } from "../components/skeletons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CreatePropertyDto } from "@str-renovator/shared";
import { Plus, Home, Sparkles } from "lucide-react";
import { PENDING_URL_KEY } from "./Landing";

export function Dashboard() {
  const { data: properties, isLoading } = useProperties();
  const createProperty = useCreateProperty();
  const createFromUrl = useCreatePropertyFromUrl();
  const [showModal, setShowModal] = useState(false);
  const [showDetailedForm, setShowDetailedForm] = useState(false);

  // LP-004: Consume pending listing URL from landing page intent flow
  useEffect(() => {
    const pendingUrl = sessionStorage.getItem(PENDING_URL_KEY);
    if (pendingUrl) {
      sessionStorage.removeItem(PENDING_URL_KEY);
      createFromUrl.mutate({ listingUrl: pendingUrl });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = (data: CreatePropertyDto) => {
    createProperty.mutate(data, {
      onSuccess: () => {
        setShowModal(false);
        setShowDetailedForm(false);
      },
    });
  };

  const handleClose = () => {
    setShowModal(false);
    setShowDetailedForm(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Your Properties</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Property
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : properties && properties.length > 0 ? (
        <div className="space-y-4">
          {properties.map((prop) => (
            <PropertyCard key={prop.id} property={prop} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center animate-pulse-border border-2">
              <Home className="w-10 h-10 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Ready to transform your first property?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm">
            Upload photos and our AI will generate renovation ideas, prioritize
            improvements, and show you the transformation before you spend a
            dollar.
          </p>
          <Button size="lg" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Property
          </Button>
          <p className="text-xs text-muted-foreground/60 mt-3">
            Takes less than 2 minutes
          </p>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {showDetailedForm ? "New Property" : "Add Property"}
            </DialogTitle>
            <DialogDescription>
              {showDetailedForm
                ? "Enter your property details below."
                : "Paste a listing URL or describe your property to get started."}
            </DialogDescription>
          </DialogHeader>
          {showDetailedForm ? (
            <>
              <PropertyForm
                onSubmit={handleCreate}
                isLoading={createProperty.isPending}
                submitLabel="Create Property"
              />
              <div className="text-center mt-1">
                <button
                  type="button"
                  onClick={() => setShowDetailedForm(false)}
                  className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Back to quick add
                </button>
              </div>
            </>
          ) : (
            <PropertyIntentBox
              onCreated={() => {
                setShowModal(false);
                setShowDetailedForm(false);
              }}
              onShowDetailedForm={() => setShowDetailedForm(true)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
