declare module 'tflite-react-native' {
  interface LoadModelOptions {
    model: string;
    labels: string;
    numThreads?: number;
    isQuantized?: boolean;
  }

  interface RunModelOnImageOptions {
    path: string;
    imageMean?: number;
    imageStd?: number;
    numResults?: number;
    threshold?: number;
  }

  interface PredictionResult {
    label: string;
    confidence: number;
  }

  class Tflite {
    loadModel(options: LoadModelOptions): Promise<void>;
    runModelOnImage(options: RunModelOnImageOptions): Promise<PredictionResult[]>;
    close(): Promise<void>;
  }

  export default Tflite;
}

