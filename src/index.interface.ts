export interface Coordinate {
  x: number;
  y: number;
}

export interface Points {
  topLeft: Coordinate;
  topRight: Coordinate;
  bottomLeft: Coordinate;
  bottomRight: Coordinate;
}

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface FaceDetectorResult {
  faces: BoundingBox[];
}

export interface EyesDetectorResult {
  eyes: {
    left: BoundingBox;
    right: BoundingBox;
  }[];
}
