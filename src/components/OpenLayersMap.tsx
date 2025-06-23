import { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import ImageLayer from "ol/layer/Image";
import ImageStatic from "ol/source/ImageStatic";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Draw from "ol/interaction/Draw";
import Snap from "ol/interaction/Snap";
import Polygon from "ol/geom/Polygon";

// Define the allowed geometry types as a constant array with TypeScript const assertion
const geometryTypes = ["Point", "LineString", "Polygon", "Circle"] as const;

const OpenLayersMap = () => {
  // Ref for the map container div
  const mapDivRef = useRef<HTMLDivElement>(null);
  // Refs to persist map and vector source instances between renders
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  // Add refs for draw and snap interactions
  const drawRef = useRef<Draw | null>(null);
  const snapRef = useRef<Snap | null>(null);
  // State for the current drawing type
  const [drawType, setDrawType] =
    useState<(typeof geometryTypes)[number]>("Point");

  // Initialize map and persistent layers - runs once on component mount
  useEffect(() => {
    //image extent is the extent of the image in the map
    const imageExtent = [0, 0, 3000, 2142];

    //create a vector source for use in source of vector layer
    vectorSourceRef.current = new VectorSource();

    //create a vector layer for drawing
    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
    });

    //create a image layer for the image
    const imageLayer = new ImageLayer({
      source: new ImageStatic({
        url: "/FinlayPark.jpg",
        imageExtent: imageExtent,
      }),
    });

    //create a map
    mapRef.current = new Map({
      target: mapDivRef.current as HTMLDivElement,
      //pass both old image layer(for the image) and new vector layer (for drawing) to the map
      layers: [imageLayer, vectorLayer],
      view: new View({
        center: [1500, 1071],
        zoom: 1,
        extent: imageExtent,
      }),
    });

    // Cleanup function to prevent memory leaks
    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(undefined);
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount

  // Handle draw interaction changes when geometry type changes
  useEffect(() => {
    // Guard clause: ensure map and vector source exist
    if (!mapRef.current || !vectorSourceRef.current) return;

    // Clean up existing interactions using refs
    if (drawRef.current) {
      mapRef.current.removeInteraction(drawRef.current);
      drawRef.current = null;
    }
    if (snapRef.current) {
      mapRef.current.removeInteraction(snapRef.current);
      snapRef.current = null;
    }

    // Create new draw interaction
    drawRef.current = new Draw({
      source: vectorSourceRef.current,
      type: drawType,
    });

    // Add listener for drawend event
    drawRef.current.on("drawend", (event) => {
      // For polygons, ensure they're closed
      if (drawType === "Polygon") {
        const feature = event.feature;
        const geometry = feature.getGeometry();
        if (geometry && geometry.getType() === "Polygon") {
          const polygonGeometry = geometry as Polygon;
          const coordinates = polygonGeometry.getCoordinates()[0];
          if (coordinates.length >= 3) {
            // Ensure the polygon is closed
            if (
              coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
              coordinates[0][1] !== coordinates[coordinates.length - 1][1]
            ) {
              coordinates.push(coordinates[0]);
              polygonGeometry.setCoordinates([coordinates]);
            }
          }
        }
      }
    });

    // Add new interactions
    mapRef.current.addInteraction(drawRef.current);

    snapRef.current = new Snap({ source: vectorSourceRef.current });
    mapRef.current.addInteraction(snapRef.current);
  }, [drawType]); // Run this effect when drawType changes

  return (
    <div>
      {/* Controls overlay for geometry type selection */}
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          background: "white",
          padding: 8,
        }}
      >
        <label>
          Geometry type:&nbsp;
          <select
            value={drawType}
            onChange={(e) =>
              setDrawType(e.target.value as (typeof geometryTypes)[number])
            }
          >
            {geometryTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>
      {/* Map container */}
      <div ref={mapDivRef} className="map"></div>
    </div>
  );
};

export default OpenLayersMap;
