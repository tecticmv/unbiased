declare module 'svg-dotted-map' {
  export interface Point {
    x: number;
    y: number;
  }

  export interface Marker {
    lat: number;
    lng: number;
    size?: number;
  }

  export interface ProcessedMarker {
    x: number;
    y: number;
    size?: number;
  }

  export interface MapOptions {
    width: number;
    height: number;
    mapSamples: number;
  }

  export interface MapResult {
    points: Point[];
    addMarkers: (markers: Marker[]) => ProcessedMarker[];
  }

  export function createMap(options: MapOptions): MapResult;
}
