import { feature, mesh, transform } from "topojson-client";

const round = (value) => Number(value.toFixed(4));

function segmentDistanceSquared(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = dx * dx + dy * dy;
  const t = length
    ? Math.max(
        0,
        Math.min(
          1,
          ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / length,
        ),
      )
    : 0;
  return (
    (point[0] - start[0] - t * dx) ** 2 + (point[1] - start[1] - t * dy) ** 2
  );
}

function simplifyArc(points, tolerance) {
  const keep = new Set([0, points.length - 1]);
  const pending = [[0, points.length - 1]];
  while (pending.length) {
    const [first, last] = pending.pop();
    let farthest = -1;
    let distance = tolerance ** 2;
    for (let i = first + 1; i < last; i++) {
      const candidate = segmentDistanceSquared(
        points[i],
        points[first],
        points[last],
      );
      if (candidate > distance) {
        distance = candidate;
        farthest = i;
      }
    }
    if (farthest !== -1) {
      keep.add(farthest);
      pending.push([first, farthest], [farthest, last]);
    }
  }
  const result = points.filter((_, index) => keep.has(index));
  const closed =
    points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1];
  return (closed && result.length < 4 ? points : result).map((point) =>
    point.map(round),
  );
}

export function simplifyCountryTopology(source, tolerance = 0.04) {
  const decode = transform(source.transform);
  const topology = { ...source };
  delete topology.transform;
  return {
    ...topology,
    arcs: source.arcs.map((arc) => simplifyArc(arc.map(decode), tolerance)),
  };
}

export function splitDatelineLines(lines) {
  const result = [];
  for (const line of lines) {
    let current = [line[0]];
    for (const point of line.slice(1)) {
      const previous = current.at(-1);
      if (Math.abs(point[0] - previous[0]) > 180) {
        const adjusted = point[0] + (point[0] > previous[0] ? -360 : 360);
        const edge = adjusted > previous[0] ? 180 : -180;
        const latitude = round(
          previous[1] +
            ((edge - previous[0]) * (point[1] - previous[1])) /
              (adjusted - previous[0]),
        );
        current.push([edge, latitude]);
        result.push(current);
        current = [[-edge, latitude]];
      }
      current.push(point);
    }
    if (current.length > 1) result.push(current);
  }
  return result;
}

export function prepareCountryContext(source) {
  const topology = simplifyCountryTopology(source);
  const borders = mesh(topology, topology.objects.countries, (a, b) => a !== b);
  return {
    land: feature(topology, topology.objects.land),
    boundaries: {
      type: "Feature",
      properties: {},
      geometry: {
        ...borders,
        coordinates: splitDatelineLines(borders.coordinates),
      },
    },
  };
}

export function prepareMapLabels(countrySource, citySource) {
  const countries = countrySource.features.map(({ properties: p }) => ({
    type: "Feature",
    properties: {
      id: p.ADM0_A3,
      name: p.NAME_EN || p.NAME,
      rank: p.LABELRANK,
      minZoom: round(Math.min(3.7, 1.4 + Math.max(0, p.LABELRANK - 1) * 0.4)),
    },
    geometry: {
      type: "Point",
      coordinates: [round(p.LABEL_X), round(p.LABEL_Y)],
    },
  }));
  const cities = citySource.features
    .filter(({ properties: p }) => p.pop_max >= 500000)
    .map(({ properties: p, geometry }) => ({
      type: "Feature",
      properties: {
        id: String(p.ne_id),
        name: p.name,
        rank: p.scalerank,
        capital: p.adm0cap === 1,
        minZoom:
          p.pop_max >= 10000000
            ? 3
            : p.pop_max >= 5000000
              ? 3.2
              : p.pop_max >= 2000000
                ? 3.4
                : 3.65,
      },
      geometry: { type: "Point", coordinates: geometry.coordinates.map(round) },
    }));
  const collection = (features) => ({
    type: "FeatureCollection",
    features: features.sort(
      (a, b) =>
        a.properties.rank - b.properties.rank ||
        a.properties.name.localeCompare(b.properties.name, "en"),
    ),
  });
  return { countries: collection(countries), cities: collection(cities) };
}
