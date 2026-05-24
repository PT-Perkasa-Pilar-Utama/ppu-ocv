// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

/** A 2D point in canvas pixel coordinates. */
export interface Coordinate {
  /** X coordinate in pixels, measured from the left edge. */
  x: number;
  /** Y coordinate in pixels, measured from the top edge. */
  y: number;
}

/** The four corner points of an axis-aligned rectangle, e.g. a contour bounding box. */
export interface Points {
  /** Top-left corner. */
  topLeft: Coordinate;
  /** Top-right corner. */
  topRight: Coordinate;
  /** Bottom-left corner. */
  bottomLeft: Coordinate;
  /** Bottom-right corner. */
  bottomRight: Coordinate;
}

/**
 * An axis-aligned bounding box with exclusive `x1` / `y1`.
 * Width is `x1 - x0`; height is `y1 - y0`.
 */
export interface BoundingBox {
  /** Left edge, inclusive. */
  x0: number;
  /** Top edge, inclusive. */
  y0: number;
  /** Right edge, exclusive. */
  x1: number;
  /** Bottom edge, exclusive. */
  y1: number;
}
