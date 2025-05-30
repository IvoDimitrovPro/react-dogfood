import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { FeatureCollection } from 'geojson';

export type Props = {
  sourceData?: FeatureCollection;
  zoomLevel?: number;
};

export const LatencyMap = ({ sourceData, zoomLevel = 2 }: Props) => {
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(sourceData);

  const popUpRef = useRef(
    new mapboxgl.Popup({ offset: 15, closeButton: false, closeOnClick: false }),
  );

  const mapContainer = useRef<any>(undefined);
  const map = useRef<mapboxgl.Map | null>(null);

  const [lng] = useState(-38.632571);
  const [lat] = useState(25);
  const [zoom] = useState(zoomLevel);

  const [hoverId, setHoverId] = useState(undefined);

  useEffect(() => {
    setSource(sourceData);
  }, [sourceData]);

  useEffect(() => {
    if (map.current && !loading) {
      map.current.on('mouseenter', 'servers-visualise', (e: any) => {
        if (map.current) {
          if (e.features?.length > 0) {
            const [point] = e.features;

            map.current.getCanvas().style.cursor = 'pointer';

            if (hoverId === undefined) {
              map.current.setFeatureState(
                {
                  source: 'servers',
                  id: point.id,
                },
                { hover: true },
              );

              setHoverId(point.id);
            }
          }
        }
      });
    }
  }, [loading, map, popUpRef, hoverId]);

  useEffect(() => {
    if (map.current && !loading) {
      map.current.on('mouseleave', 'servers-visualise', () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';

          if (hoverId) {
            map.current.setFeatureState(
              {
                source: 'servers',
                id: hoverId,
              },
              { hover: false },
            );
            setHoverId(undefined);
          }
        }
      });
    }
  }, [loading, map, hoverId, popUpRef]);

  useEffect(() => {
    let appendMarkerTimer: ReturnType<typeof setTimeout>;

    if (map.current && !loading) {
      const serverSource = map.current.getSource('servers');

      if (serverSource) {
        return;
      }

      if (source) {
        map.current.addSource('servers', {
          type: 'geojson',
          data: {
            ...source,
            features: [],
          },
        });

        let lazyloadFeatures = source.features.sort(() => Math.random() - 0.5);

        if (map.current.getSource('servers')) {
          const mapSource: any = map.current.getSource('servers');

          function appendMarker() {
            if (lazyloadFeatures.length > 0) {
              const [feature, ...rest] = lazyloadFeatures;
              lazyloadFeatures = rest;
              mapSource.setData({
                type: 'FeatureCollection',
                features: [...mapSource._data.features, feature],
              });
              appendMarkerTimer = setTimeout(appendMarker, Math.random() * 150);
            }
          }

          appendMarker();
        }
      }

      return () => {
        clearTimeout(appendMarkerTimer);
      };
    }
  }, [map, loading, source]);

  useEffect(() => {
    if (map.current && !loading) {
      const serverSource = map.current.getSource('servers');
      const layerSource = map.current.getLayer('servers-visualise');

      if (layerSource) {
        return;
      }

      if (source && serverSource) {
        map.current.addLayer({
          id: 'servers-visualise',
          type: 'circle',
          source: 'servers',
          paint: {
            'circle-color': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              '#20E070',
              '#2F7DEB',
            ],
            'circle-radius': 4,
            'circle-stroke-width': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              8,
              0,
            ],
            'circle-stroke-color': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              'rgba(30, 177, 20, 0.2)',
              'transparent',
            ],
          },
        });
      }
    }
  }, [map, loading, source]);

  useEffect(() => {
    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_GL_TOKEN || '';
    if (map.current || !accessToken || !isWebGLSupported()) return;

    setLoading(true);

    mapboxgl.accessToken = accessToken;
    map.current = new mapboxgl.Map({
      projection: {
        name: 'mercator',
      },
      dragPan: false,
      dragRotate: false,
      container: mapContainer.current,
      // TODO read it from an ENV variable
      style: 'mapbox://styles/zwaardje/clhf9caar013j01qt07ib4bea',
      center: [lng, lat],
      zoom: zoom,
    });

    map.current.on('load', () => {
      setLoading(false);
    });
  }, [lat, lng, zoom]);

  return (
    <div className="rd__latencymap">
      <div ref={mapContainer} className="rd__latencymap-container" />
    </div>
  );
};

// https://stackoverflow.com/a/22953053/1270325
const isWebGLSupported = () => {
  try {
    const canvas = document.createElement('canvas');
    return (
      !!window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
};
