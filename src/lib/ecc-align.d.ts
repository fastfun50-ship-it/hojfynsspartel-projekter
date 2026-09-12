declare const EccAlign: {
  eccAlign: (
    before: CanvasImageSource,
    after: CanvasImageSource,
    opts?: {
      maxSide?: number;
      levels?: number;
      maxIter?: number;
      minEcc?: number;
    },
  ) => Promise<{
    ok: boolean;
    ecc: number;
    alignedCanvas: HTMLCanvasElement;
    warp: {
      scale: number;
      rotationRad: number;
      rotationDeg: number;
      tx: number;
      ty: number;
    };
    workSize: { w: number; h: number };
  }>;
  warpParams: (p: number[]) => {
    a: number;
    b: number;
    c: number;
    d: number;
    tx: number;
    ty: number;
  };
};

export default EccAlign;
