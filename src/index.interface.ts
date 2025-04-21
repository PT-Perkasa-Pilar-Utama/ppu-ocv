export interface Points {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
}

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
