export const isPointInPolygon = (point, polygon) => {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }

  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const currentPoint = polygon[current];
    const previousPoint = polygon[previous];
    const crossesPoint = (currentPoint.y > point.y) !== (previousPoint.y > point.y);
    const intersectionX = (previousPoint.x - currentPoint.x) *
      (point.y - currentPoint.y) /
      (previousPoint.y - currentPoint.y) +
      currentPoint.x;

    if (crossesPoint && point.x < intersectionX) {
      inside = !inside;
    }
  }

  return inside;
};
