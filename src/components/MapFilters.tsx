"use client";

import { useId, useRef, useState, type RefObject } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { TravelPlace } from "@/lib/places";
import type {
  MapFilters as FilterState,
  PhotoOrientation,
  PhotoSubject,
} from "@/lib/map-filters";
import { mapFilterFacetCounts } from "@/lib/map-filters";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "./ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const orientations: { value: PhotoOrientation; label: string }[] = [
  { value: "any", label: "All formats" },
  { value: "horizontal", label: "Horizontal" },
  { value: "vertical", label: "Vertical" },
];

const subjects: { value: PhotoSubject; label: string }[] = [
  { value: "all", label: "All photos" },
  { value: "places", label: "Places & landscapes" },
  { value: "people", label: "People" },
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
  const subjectTriggerRef = useRef<HTMLButtonElement>(null);
  const counts = mapFilterFacetCounts(places, value);
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
          <Button
            variant="quiet"
            onClick={() => {
              onClear();
              requestAnimationFrame(() => subjectTriggerRef.current?.focus());
            }}
            disabled={!activeCount}
          >
            Clear all
          </Button>
        </div>
        <div className="map-filter-options">
          <div className="map-filter-field">
            <label id={`${id}-subject`} htmlFor={`${id}-subject-control`}>
              Subject
            </label>
            <Select<PhotoSubject>
              items={subjects}
              value={value.subject ?? "all"}
              modal={false}
              onValueChange={(subject) => {
                if (subject) onChange({ ...value, subject });
              }}
            >
              <SelectTrigger
                ref={subjectTriggerRef}
                id={`${id}-subject-control`}
                aria-labelledby={`${id}-subject`}
                className="map-filter-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                className="map-filter-select-menu explorer-overlay data-open:animate-none data-closed:animate-none"
              >
                {subjects.map((subject) => (
                  <SelectItem key={subject.value} value={subject.value}>
                    <span>{subject.label}</span>
                    <span className="map-filter-option-count">
                      {counts.subject[subject.value]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="map-filter-field">
            <label id={`${id}-orientation`} htmlFor={`${id}-format-control`}>
              Format
            </label>
            <Select<PhotoOrientation>
              items={orientations}
              value={value.orientation}
              modal={false}
              onValueChange={(orientation) => {
                if (orientation) onChange({ ...value, orientation });
              }}
            >
              <SelectTrigger
                id={`${id}-format-control`}
                aria-labelledby={`${id}-orientation`}
                className="map-filter-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                className="map-filter-select-menu explorer-overlay data-open:animate-none data-closed:animate-none"
              >
                {orientations.map((orientation) => (
                  <SelectItem key={orientation.value} value={orientation.value}>
                    <span>{orientation.label}</span>
                    <span className="map-filter-option-count">
                      {counts.orientation[orientation.value]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="map-filter-footer">
          <p>
            {photoCount === 0
              ? "No matching photos"
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
