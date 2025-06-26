import { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import { unByKey } from "ol/Observable";
import Overlay from "ol/Overlay";
import { getArea, getLength } from "ol/sphere";
import LineString from "ol/geom/LineString";
import Polygon from "ol/geom/Polygon";
import ImageLayer from "ol/layer/Image";
import ImageStatic from "ol/source/ImageStatic";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Draw from "ol/interaction/Draw";
import Snap from "ol/interaction/Snap";

const geometryTypes = ["Point", "LineString", "Polygon", "Circle"] as const;

const OpenLayersMap = () => {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const drawRef = useRef<Draw | null>(null);
  const snapRef = useRef<Snap | null>(null);
  const [drawType, setDrawType] =
    useState<(typeof geometryTypes)[number]>("Point");

  useEffect(() => {
    const imageExtent = [0, 0, 3000, 2142];

    vectorSourceRef.current = new VectorSource();

    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
    });

    const imageLayer = new ImageLayer({
      source: new ImageStatic({
        url: "/FinlayPark.jpg",
        imageExtent: imageExtent,
      }),
    });

    mapRef.current = new Map({
      target: mapDivRef.current as HTMLDivElement,
      layers: [imageLayer, vectorLayer],
      view: new View({
        center: [1500, 1071],
        zoom: 1,
        extent: imageExtent,
      }),
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(undefined);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !vectorSourceRef.current) return;

    if (drawRef.current) {
      mapRef.current.removeInteraction(drawRef.current);
      drawRef.current = null;
    }
    if (snapRef.current) {
      mapRef.current.removeInteraction(snapRef.current);
      snapRef.current = null;
    }

    let sketch: any;
    let measureTooltipElement: HTMLDivElement | null;
    let measureTooltip: Overlay | null;

    const formatLength = (line: LineString) => {
      const length = getLength(line);
      return Math.round(length) + " px";
    };

    const formatArea = (polygon: Polygon) => {
      const area = getArea(polygon);
      return Math.round(area) + " px²";
    };

    const createMeasureTooltip = () => {
      if (measureTooltipElement) {
        measureTooltipElement.remove();
      }
      measureTooltipElement = document.createElement("div");
      measureTooltipElement.className = "ol-tooltip ol-tooltip-measure";
      measureTooltip = new Overlay({
        element: measureTooltipElement,
        offset: [0, -15],
        positioning: "bottom-center",
        stopEvent: false,
        insertFirst: false,
      });
      mapRef.current?.addOverlay(measureTooltip);
    };

    if (drawType === "LineString" || drawType === "Polygon") {
      drawRef.current = new Draw({
        source: vectorSourceRef.current,
        type: drawType,
      });

      mapRef.current.addInteraction(drawRef.current);
      createMeasureTooltip();

      let listener: any;
      drawRef.current.on("drawstart", (evt) => {
        sketch = evt.feature;
        let tooltipCoord: any;

        listener = sketch.getGeometry().on("change", (evt: any) => {
          const geom = evt.target;
          let output;
          if (geom instanceof Polygon) {
            output = formatArea(geom);
            tooltipCoord = geom.getInteriorPoint().getCoordinates();
          } else if (geom instanceof LineString) {
            output = formatLength(geom);
            tooltipCoord = geom.getLastCoordinate();
          }
          if (measureTooltipElement) {
            measureTooltipElement.innerHTML = output as string;
          }
          measureTooltip?.setPosition(tooltipCoord);
        });
      });

      drawRef.current.on("drawend", () => {
        if (measureTooltipElement) {
          measureTooltipElement.className = "ol-tooltip ol-tooltip-static";
        }
        measureTooltip?.setOffset([0, -7]);
        sketch = null;
        measureTooltipElement = null;
        createMeasureTooltip();
        unByKey(listener);
      });
    } else {
      drawRef.current = new Draw({
        source: vectorSourceRef.current,
        type: drawType,
      });
      mapRef.current.addInteraction(drawRef.current);
    }

    snapRef.current = new Snap({ source: vectorSourceRef.current });
    mapRef.current.addInteraction(snapRef.current);
  }, [drawType]);

  return (
    <div>
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
      <div ref={mapDivRef} className="map"></div>
    </div>
  );
};

export default OpenLayersMap;
