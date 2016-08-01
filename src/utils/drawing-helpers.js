import {List, Record} from 'immutable';
import * as Geometry from './geometry';

class PointHelper extends Record({type: "point", x: -1, y: -1, radius: 1, priority: 1, related: new List()}) {
  nearestPoint(x, y) {
    return {
      x: this.x,
      y: this.y,
      distance: Geometry.distanceFromTwoPoints(this.x, this.y, x, y)
    };
  }
}

class LineHelper extends Record({type: "line", a: -1, b: -1, c: -1, radius: 1, priority: 1, related: new List()}) {
  nearestPoint(x, y) {
    return {
      ...Geometry.closestPointFromLine(this.a, this.b, this.c, x, y),
      distance: Geometry.distancePointFromLine(this.a, this.b, this.c, x, y)
    };
  }
}

export function nearestDrawingHelper(drawingHelpers, x, y) {

  let nearestHelper = drawingHelpers
    .valueSeq()
    .map(helper => {
      return {helper, point: helper.nearestPoint(x, y)}
    })
    .filter(({helper: {radius}, point: {distance}}) => distance < radius)
    .min(({helper: helper1, point: point1}, {helper: helper2, point: point2}) => {
      if (helper1.priority === helper2.priority) {
        if (point1.distance < point2.distance) return -1; else return 1;
      } else {
        if (helper1.priority > helper2.priority) return -1; else return 1;
      }
    });

  return nearestHelper;
}

export function addPointHelper(drawingHelpers, x, y, radius, priority, related) {
  related = new List([related]);
  return drawingHelpers.push(new PointHelper({x, y, radius, priority, related}));
}

export function addLineHelper(drawingHelpers, a, b, c, radius, priority, related) {
  related = new List([related]);

  return drawingHelpers.withMutations(drawingHelpers => {

    let intersections = drawingHelpers
      .valueSeq()
      .filter(helper => helper.type === 'line')
      .map(helper => Geometry.intersectionFromTwoLines(helper.a, helper.b, helper.c, a, b, c))
      .filter(intersection => intersection !== undefined)
      .forEach(({x, y}) => addPointHelper(drawingHelpers, x, y, 20, 40));

    drawingHelpers.push(new LineHelper({a, b, c, radius, priority, related}));
  })
}

export function addLineSegmentHelper(drawingHelpers, x1, y1, x2, y2, radius, priority) {

  return [drawingHelpers, {}];
}