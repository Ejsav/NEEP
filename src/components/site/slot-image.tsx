import Image from "next/image";
import { imageSlot, type ImageSlotName } from "@/lib/images";

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
