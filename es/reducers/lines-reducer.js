import { List, Map } from 'immutable';

import { SELECT_TOOL_DRAWING_LINE, BEGIN_DRAWING_LINE, UPDATE_DRAWING_LINE, END_DRAWING_LINE, BEGIN_DRAGGING_LINE, UPDATE_DRAGGING_LINE, END_DRAGGING_LINE, SELECT_LINE, MODE_IDLE, MODE_WAITING_DRAWING_LINE, MODE_DRAWING_LINE, MODE_DRAGGING_LINE } from '../constants';

import * as Geometry from '../utils/geometry';
import { addLine, replaceLineVertex, removeLine, select, unselect, addLineAvoidingIntersections, unselectAll, detectAndUpdateAreas } from '../utils/layer-operations';
import { nearestSnap, addPointSnap, addLineSnap, addLineSegmentSnap } from '../utils/snap';
import { sceneSnapElements, vertexSnapElements } from '../utils/snap-scene';

export default function (state, action) {
  switch (action.type) {
    case SELECT_TOOL_DRAWING_LINE:
      return selectToolDrawingLine(state, action.sceneComponentType);

    case BEGIN_DRAWING_LINE:
      return beginDrawingLine(state, action.layerID, action.x, action.y);

    case UPDATE_DRAWING_LINE:
      return updateDrawingLine(state, action.x, action.y);

    case END_DRAWING_LINE:
      return endDrawingLine(state, action.x, action.y);

    case BEGIN_DRAGGING_LINE:
      return beginDraggingLine(state, action.layerID, action.lineID, action.x, action.y);

    case UPDATE_DRAGGING_LINE:
      return updateDraggingLine(state, action.x, action.y);

    case END_DRAGGING_LINE:
      return endDraggingLine(state, action.x, action.y);

    case SELECT_LINE:
      return selectLine(state, action.layerID, action.lineID);

    default:
      return state;
  }
}

function selectToolDrawingLine(state, sceneComponentType) {
  return state.merge({
    mode: MODE_WAITING_DRAWING_LINE,
    drawingSupport: Map({
      type: sceneComponentType
    })
  });
}

/** lines operations **/
function beginDrawingLine(state, layerID, x, y) {
  var catalog = state.catalog;

  //calculate snap and overwrite coords if needed
  var snapElements = sceneSnapElements(state.scene);
  var snap = nearestSnap(snapElements, x, y);
  if (snap) {
    ;

    var _snap$point = snap.point;
    x = _snap$point.x;
    y = _snap$point.y;
  }snapElements = snapElements.withMutations(function (snapElements) {
    var a = void 0,
        b = void 0,
        c = void 0;

    var _Geometry$horizontalL = Geometry.horizontalLine(y);

    a = _Geometry$horizontalL.a;
    b = _Geometry$horizontalL.b;
    c = _Geometry$horizontalL.c;

    addLineSnap(snapElements, a, b, c, 10, 3, null);

    var _Geometry$verticalLin = Geometry.verticalLine(x);

    a = _Geometry$verticalLin.a;
    b = _Geometry$verticalLin.b;
    c = _Geometry$verticalLin.c;

    addLineSnap(snapElements, a, b, c, 10, 3, null);
  });

  var drawingSupport = state.get('drawingSupport').set('layerID', layerID);
  var scene = state.scene.updateIn(['layers', layerID], function (layer) {
    return layer.withMutations(function (layer) {
      unselectAll(layer);

      var _addLine = addLine(layer, drawingSupport.get('type'), x, y, x, y, catalog),
          line = _addLine.line;

      select(layer, 'lines', line.id);
      select(layer, 'vertices', line.vertices.get(0));
      select(layer, 'vertices', line.vertices.get(1));
    });
  });

  return state.merge({
    mode: MODE_DRAWING_LINE,
    scene: scene,
    snapElements: snapElements,
    activeSnapElement: snap ? snap.snap : null,
    drawingSupport: drawingSupport
  });
}

function updateDrawingLine(state, x, y) {

  var catalog = state.catalog;

  //calculate snap and overwrite coords if needed
  var snap = nearestSnap(state.snapElements, x, y);
  if (snap) {
    ;

    var _snap$point2 = snap.point;
    x = _snap$point2.x;
    y = _snap$point2.y;
  }var layerID = state.getIn(['drawingSupport', 'layerID']);
  var scene = state.scene.updateIn(['layers', layerID], function (layer) {
    return layer.withMutations(function (layer) {
      var lineID = layer.getIn(['selected', 'lines']).first();
      var vertex = void 0;

      var _replaceLineVertex = replaceLineVertex(layer, lineID, 1, x, y);

      layer = _replaceLineVertex.layer;
      vertex = _replaceLineVertex.vertex;

      select(layer, 'vertices', vertex.id);
      return layer;
    });
  });

  return state.merge({
    scene: scene,
    activeSnapElement: snap ? snap.snap : null
  });
}

function endDrawingLine(state, x, y) {
  var catalog = state.catalog;

  //calculate snap and overwrite coords if needed
  var snap = nearestSnap(state.snapElements, x, y);
  if (snap) {
    ;

    var _snap$point3 = snap.point;
    x = _snap$point3.x;
    y = _snap$point3.y;
  }var layerID = state.getIn(['drawingSupport', 'layerID']);
  var scene = state.scene.updateIn(['layers', layerID], function (layer) {
    return layer.withMutations(function (layer) {
      var lineID = layer.getIn(['selected', 'lines']).first();
      var line = layer.getIn(['lines', lineID]);
      var v0 = layer.vertices.get(line.vertices.get(0));

      unselect(layer, 'lines', lineID);
      unselect(layer, 'vertices', line.vertices.get(0));
      unselect(layer, 'vertices', line.vertices.get(1));
      removeLine(layer, lineID);
      addLineAvoidingIntersections(layer, line.type, v0.x, v0.y, x, y, catalog);
      detectAndUpdateAreas(layer, catalog);
    });
  });

  return state.merge({
    mode: MODE_WAITING_DRAWING_LINE,
    scene: scene,
    snapElements: new List(),
    activeSnapElement: null,
    sceneHistory: state.sceneHistory.push(scene)
  });
}

function beginDraggingLine(state, layerID, lineID, x, y) {

  var catalog = state.catalog;

  var snapElements = sceneSnapElements(state.scene);

  var layer = state.scene.layers.get(layerID);
  var line = layer.lines.get(lineID);

  var vertex0 = layer.vertices.get(line.vertices.get(0));
  var vertex1 = layer.vertices.get(line.vertices.get(1));

  return state.merge({
    mode: MODE_DRAGGING_LINE,
    snapElements: snapElements,
    draggingSupport: Map({
      layerID: layerID, lineID: lineID,
      startPointX: x,
      startPointY: y,
      startVertex0X: vertex0.x,
      startVertex0Y: vertex0.y,
      startVertex1X: vertex1.x,
      startVertex1Y: vertex1.y
    })
  });
}

function updateDraggingLine(state, x, y) {
  var catalog = state.catalog;

  var draggingSupport = state.draggingSupport;
  var snapElements = state.snapElements;

  var layerID = draggingSupport.get('layerID');
  var lineID = draggingSupport.get('lineID');
  var diffX = x - draggingSupport.get('startPointX');
  var diffY = y - draggingSupport.get('startPointY');
  var newVertex0X = draggingSupport.get('startVertex0X') + diffX;
  var newVertex0Y = draggingSupport.get('startVertex0Y') + diffY;
  var newVertex1X = draggingSupport.get('startVertex1X') + diffX;
  var newVertex1Y = draggingSupport.get('startVertex1Y') + diffY;

  var activeSnapElement = null;
  var curSnap0 = nearestSnap(snapElements, newVertex0X, newVertex0Y);
  var curSnap1 = nearestSnap(snapElements, newVertex1X, newVertex1Y);

  var deltaX = 0,
      deltaY = 0;
  if (curSnap0 && curSnap1) {
    if (curSnap0.point.distance < curSnap1.point.distance) {
      deltaX = curSnap0.point.x - newVertex0X;
      deltaY = curSnap0.point.y - newVertex0Y;
      activeSnapElement = curSnap0.snap;
    } else {
      deltaX = curSnap1.point.x - newVertex1X;
      deltaY = curSnap1.point.y - newVertex1Y;
      activeSnapElement = curSnap1.snap;
    }
  } else {
    if (curSnap0) {
      deltaX = curSnap0.point.x - newVertex0X;
      deltaY = curSnap0.point.y - newVertex0Y;
      activeSnapElement = curSnap0.snap;
    }
    if (curSnap1) {
      deltaX = curSnap1.point.x - newVertex1X;
      deltaY = curSnap1.point.y - newVertex1Y;
      activeSnapElement = curSnap1.snap;
    }
  }

  newVertex0X += deltaX;
  newVertex0Y += deltaY;
  newVertex1X += deltaX;
  newVertex1Y += deltaY;

  return state.merge({
    activeSnapElement: activeSnapElement,
    scene: state.scene.updateIn(['layers', layerID], function (layer) {
      return layer.withMutations(function (layer) {
        var lineVertices = layer.getIn(['lines', lineID, 'vertices']);
        layer.updateIn(['vertices', lineVertices.get(0)], function (vertex) {
          return vertex.merge({ x: newVertex0X, y: newVertex0Y });
        });
        layer.updateIn(['vertices', lineVertices.get(1)], function (vertex) {
          return vertex.merge({ x: newVertex1X, y: newVertex1Y });
        });
        return layer;
      });
    })
  });
}

// function endDraggingLine(state, x, y) {
//   let catalog = state.catalog;
//   let {draggingSupport} = state;
//   let layerID = draggingSupport.get('layerID');
//   let layer = state.scene.layers.get(layerID);
//   let lineID = draggingSupport.get('lineID');
//   let line = layer.lines.get(lineID);
//
//   let holesWithBeginPosition = [];
//   layer.lines.get(lineID).holes.forEach(holeID => {
//     let hole = layer.holes.get(holeID);
//     let vertex0 = layer.vertices.get(line.vertices.get(0));
//     let vertex1 = layer.vertices.get(line.vertices.get(1));
//
//     // TODO: Order vertices and correct offset (we need this to compute the right sign for begin position)
//     let linelength = Math.sqrt(Math.pow(vertex1.x - vertex0.x, 2) + Math.pow(vertex1.y - vertex0.y, 2));
//     console.log(linelength, hole.toJS());
//     let lineRotation = Math.atan2(vertex1.y - vertex0.y, vertex1.x - vertex0.x);
//     let beginPosition = {
//       x: ((linelength * hole.offset) - hole.properties.get('width').get('length')/2) * Math.cos(lineRotation) + vertex0.x,
//       y: ((linelength * hole.offset) - hole.properties.get('width').get('length')/2) * Math.sin(lineRotation) + vertex0.y
//     };
//
//     console.log(vertex0.toJS(), beginPosition)
//     holesWithBeginPosition.push({hole, beginPosition});
//   });
//
//   console.log(holesWithBeginPosition);
//
//   return state.withMutations(state => {
//     let scene = state.scene.updateIn(['layers', layerID], layer => layer.withMutations(layer => {
//
//       let diffX = x - draggingSupport.get('startPointX');
//       let diffY = y - draggingSupport.get('startPointY');
//       let newVertex0X = draggingSupport.get('startVertex0X') + diffX;
//       let newVertex0Y = draggingSupport.get('startVertex0Y') + diffY;
//       let newVertex1X = draggingSupport.get('startVertex1X') + diffX;
//       let newVertex1Y = draggingSupport.get('startVertex1Y') + diffY;
//
//       removeLine(layer, lineID);
//       addLineAvoidingIntersections(layer, line.type,
//         newVertex0X, newVertex0Y, newVertex1X, newVertex1Y,
//         catalog, line.properties, holesWithBeginPosition);
//       detectAndUpdateAreas(layer, catalog);
//     }));
//
//
//     state.merge({
//       mode: MODE_IDLE,
//       scene,
//       draggingSupport: null,
//       activeSnapElement: null,
//       snapElements: new List(),
//       sceneHistory: state.sceneHistory.push(scene)
//     });
//   });
// }

function endDraggingLine(state, x, y) {
  var catalog = state.catalog;

  return state.withMutations(function (state) {
    updateDraggingLine(state, x, y, catalog);
    state.merge({
      mode: MODE_IDLE,
      draggingSupport: null,
      activeSnapElement: null,
      snapElements: new List(),
      sceneHistory: state.sceneHistory.push(state.scene)
    });
  });
}

function selectLine(state, layerID, lineID) {
  var scene = state.scene;

  scene = scene.merge({
    layers: scene.layers.map(unselectAll),
    selectedLayer: layerID
  });

  scene = scene.updateIn(['layers', layerID], function (layer) {
    return layer.withMutations(function (layer) {
      var line = layer.getIn(['lines', lineID]);
      select(layer, 'lines', lineID);
      select(layer, 'vertices', line.vertices.get(0));
      select(layer, 'vertices', line.vertices.get(1));
    });
  });

  return state.merge({
    scene: scene,
    sceneHistory: state.sceneHistory.push(scene)
  });
}