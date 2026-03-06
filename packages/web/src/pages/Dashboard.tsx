import { useState } from "react";
import { useProperties, useCreateProperty } from "../api/properties";
import { PropertyCard } from "../components/properties/PropertyCard";
import { PropertyForm } from "../components/properties/PropertyForm";
import type { CreatePropertyDto } from "@str-renovator/shared";

export function Dashboard() {
  const { data: properties, isLoading } = useProperties();
  const createProperty = useCreateProperty();
  const [showModal, setShowModal] = useState(false);

  const handleCreate = (data: CreatePropertyDto) => {
    createProperty.mutate(data, {
      onSuccess: () => setShowModal(false),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Properties</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-150"
        >
          Add Property
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : properties && properties.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((prop) => (
            <PropertyCard key={prop.id} property={prop} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No properties yet.</p>
          <p className="text-gray-400 text-sm mt-1">
            Add your first property to get started with photo analysis.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-150"
          >
            Add Your First Property
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                New Property
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                &times;
              </button>
            </div>
            <PropertyForm
              onSubmit={handleCreate}
              isLoading={createProperty.isPending}
              submitLabel="Create Property"
            />
          </div>
        </div>
      )}
    </div>
  );
}
