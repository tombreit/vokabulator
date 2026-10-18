// Types for browser APIs that TypeScript's DOM library does not know yet.

/**
 * Shape Detection API – reads QR codes from camera frames, built into Chrome on Android.
 * https://developer.mozilla.org/docs/Web/API/BarcodeDetector
 */
declare class BarcodeDetector {
	constructor(options?: { formats?: string[] });
	static getSupportedFormats(): Promise<string[]>;
	detect(source: ImageBitmapSource): Promise<{ rawValue: string; format: string }[]>;
}
