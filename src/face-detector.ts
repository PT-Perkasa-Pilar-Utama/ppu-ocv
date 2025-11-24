export class FaceDetector {
  private static instance: FaceDetector | null = null;

  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {
    const frontalFaceCascade = new cv.CascadeClassifier(
      "haarcascade_frontalcatface_extended.xml",
    );
    const eyeCascade = new cv.CascadeClassifier("haarcascade_eye.xml");
    const eyeGlassCascade = new cv.CascadeClassifier(
      "haarcascade_eye_tree_eyeglasses.xml",
    );
  }

  /**
   * Get the singleton instance of FaceDetector
   * @returns The singleton instance
   * @example
   * const faceDetector = FaceDetector.getInstance();
   */
  public static getInstance(): FaceDetector {
    if (!FaceDetector.instance) {
      FaceDetector.instance = new FaceDetector();
    }
    return FaceDetector.instance;
  }

  async detectFace() {}

  async detectEye() {
    // if cascadeEye not detecting, proceed to detectEyeSunglass except if it specified not to
  }

  private detectEyeSunglass() {}
}
