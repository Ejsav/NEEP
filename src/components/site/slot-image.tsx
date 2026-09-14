import Image from "next/image";
import { IMAGE_SLOTS, imageSlot, type ImageSlotName } from "@/lib/images";

/**
 * Renders a declared image slot, or nothing at all.
 *
 * Nothing is the honest fallback: the pages were designed type-first and read
 * correctly without photography, so a missing file degrades to the original
 * design rather than to a gap or a placeholder.
 *
 * Dimensions come from the manifest so the browser reserves the space before
 * the bytes arrive, which is what keeps CLS at zero.
 */
export function SlotImage({
  name,
  priority = false,
  className,
  sizes = "100vw",
}: {
  name: ImageSlotName;
  /** Set only on an image above the fold. Never on more than one per page. */
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const slot = imageSlot(name);
  if (!slot) return null;

  return (
    <Image
      src={slot.src}
      alt={slot.alt}
      width={slot.width}
      height={slot.height}
      priority={priority}
      sizes={sizes}
      className={className}
    />
  );
}

/** True when a slot has a file, for pages that lay out differently with one. */
export function hasSlotImage(name: ImageSlotName): boolean {
  return imageSlot(name) !== null;
}

/**
 * The aspect ratio a slot should be displayed at.
 *
 * A layout that forces one ratio on every slot crops whatever does not match
 * it, and cropping a 3:2 photograph to 5:6 throws away two thirds of the frame.
 * The manifest already records whether each slot is portrait or landscape, so
 * the layout follows the source rather than the source having to follow the
 * layout.
 */
export function slotAspectClass(name: ImageSlotName): string {
  return IMAGE_SLOTS[name].orientation === "portrait"
    ? "aspect-[4/3] lg:aspect-[4/5]"
    : "aspect-[4/3]";
}
