"use client";

import { useId, useState, type RefObject } from "react";
import { Checkbox } from "@base-ui/react/checkbox";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Check, SlidersHorizontal } from "lucide-react";
import type { TravelPlace } from "@/lib/places";
import type {
  MapFilters as FilterState,
  PhotoOrientation,
} from "@/lib/map-filters";
import { Button } from "./ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "./ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const orientations: { value: PhotoOrientation; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
];

export default function MapFilters({
  places,
  value,
  onChange,
  onClear,
  activeCount,
  photoCount,
  locationCount,
  open,
  onOpenChange,
  triggerRef,
}: {
  places: TravelPlace[];
  value: FilterState;
  onChange: (value: FilterState) => void;
  onClear: () => void;
  activeCount: number;
  photoCount: number;
  locationCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const id = useId();
  const [keyboardInteraction, setKeyboardInteraction] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={(next, details) => {
        setKeyboardInteraction(
          "key" in details.event ||
            (details.event.type === "click" &&
              "detail" in details.event &&
              details.event.detail === 0),
        );
        onOpenChange(next);
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              ref={triggerRef}
              render={<Button variant="quiet" />}
              className="map-filter-trigger"
              data-active={activeCount > 0}
              aria-label={`Filter photographs${activeCount ? `, ${activeCount} active ${activeCount === 1 ? "group" : "groups"}` : ""}`}
              aria-controls={open ? id : undefined}
            />
          }
        >
          <SlidersHorizontal size={18} />
          {activeCount > 0 && (
            <span className="map-filter-badge" aria-hidden="true">
              {activeCount}
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent className="explorer-overlay">
          Filter photographs
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        id={id}
        side="top"
        sideOffset={12}
        anchor={() =>
          triggerRef.current?.closest(".explorer-command-bar") ??
          triggerRef.current
        }
        data-keyboard={keyboardInteraction}
        className="map-filter-popover explorer-overlay transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] data-open:animate-none data-closed:animate-none data-[keyboard=true]:transition-none motion-reduce:transition-none"
      >
        <div className="map-filter-heading">
          <PopoverTitle>Filter photographs</PopoverTitle>
          <Button variant="quiet" onClick={onClear} disabled={!activeCount}>
            Clear all
          </Button>
        </div>
        <div className="map-filter-options">
          <fieldset>
            <legend>Locations</legend>
            {places.map((place) => (
              <label className="map-filter-location" key={place.id}>
                <Checkbox.Root
                  className="map-filter-checkbox"
                  checked={value.locationIds.includes(place.id)}
                  onCheckedChange={(checked) =>
                    onChange({
                      ...value,
                      locationIds: checked
                        ? [...value.locationIds, place.id]
                        : value.locationIds.filter(
                            (location) => location !== place.id,
                          ),
                    })
                  }
                >
                  <Checkbox.Indicator>
                    <Check size={14} />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <span>{place.name}</span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend id={`${id}-orientation`}>Orientation</legend>
            <RadioGroup<PhotoOrientation>
              className="map-filter-orientation"
              aria-labelledby={`${id}-orientation`}
              value={value.orientation}
              onValueChange={(orientation) =>
                onChange({ ...value, orientation })
              }
            >
              {orientations.map((orientation) => (
                <Radio.Root
                  key={orientation.value}
                  className="map-filter-radio"
                  value={orientation.value}
                  aria-label={orientation.label}
                >
                  {orientation.label}
                </Radio.Root>
              ))}
            </RadioGroup>
          </fieldset>
        </div>
        <div className="map-filter-footer">
          <p>
            {photoCount === 0
              ? "No photographs match these filters"
              : `${photoCount} ${photoCount === 1 ? "photograph" : "photographs"} · ${locationCount} ${locationCount === 1 ? "location" : "locations"}`}
          </p>
          <Button variant="control" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
