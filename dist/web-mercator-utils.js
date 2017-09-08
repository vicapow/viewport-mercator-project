'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }(); // TODO - THE UTILITIES IN THIS FILE SHOULD BE IMPORTED FROM WEB-MERCATOR-VIEWPORT MODULE

exports.projectFlat = projectFlat;
exports.unprojectFlat = unprojectFlat;
exports.getMercatorMeterZoom = getMercatorMeterZoom;
exports.getMercatorDistanceScales = getMercatorDistanceScales;
exports.getMercatorWorldPosition = getMercatorWorldPosition;
exports.getFov = getFov;
exports.getClippingPlanes = getClippingPlanes;
exports.makeUncenteredViewMatrixFromMercatorParams = makeUncenteredViewMatrixFromMercatorParams;
exports.makeViewMatricesFromMercatorParams = makeViewMatricesFromMercatorParams;
exports.makeProjectionMatrixFromMercatorParams = makeProjectionMatrixFromMercatorParams;

var _math = require('math.gl');

var _perspective = require('gl-mat4/perspective');

var _perspective2 = _interopRequireDefault(_perspective);

var _scale = require('gl-mat4/scale');

var _scale2 = _interopRequireDefault(_scale);

var _translate = require('gl-mat4/translate');

var _translate2 = _interopRequireDefault(_translate);

var _rotateX = require('gl-mat4/rotateX');

var _rotateX2 = _interopRequireDefault(_rotateX);

var _rotateZ = require('gl-mat4/rotateZ');

var _rotateZ2 = _interopRequireDefault(_rotateZ);

var _distance = require('gl-vec2/distance');

var _distance2 = _interopRequireDefault(_distance);

var _assert = require('./assert');

var _assert2 = _interopRequireDefault(_assert);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// CONSTANTS
var PI = Math.PI;
var PI_4 = PI / 4;
var DEGREES_TO_RADIANS = PI / 180;
var RADIANS_TO_DEGREES = 180 / PI;
var TILE_SIZE = 512;
var WORLD_SCALE = TILE_SIZE;

// const METERS_PER_DEGREE_AT_EQUATOR = 111000; // Approximately 111km per degree at equator

// Helper, avoids low-precision 32 bit matrices from gl-matrix mat4.create()
function createMat4() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

/**
 * Project [lng,lat] on sphere onto [x,y] on 512*512 Mercator Zoom 0 tile.
 * Performs the nonlinear part of the web mercator projection.
 * Remaining projection is done with 4x4 matrices which also handles
 * perspective.
 *
 * @param {Array} lngLat - [lng, lat] coordinates
 *   Specifies a point on the sphere to project onto the map.
 * @return {Array} [x,y] coordinates.
 */
function projectFlat(_ref, scale) {
  var _ref2 = _slicedToArray(_ref, 2),
      lng = _ref2[0],
      lat = _ref2[1];

  scale = scale * WORLD_SCALE;
  var lambda2 = lng * DEGREES_TO_RADIANS;
  var phi2 = lat * DEGREES_TO_RADIANS;
  var x = scale * (lambda2 + PI) / (2 * PI);
  var y = scale * (PI - Math.log(Math.tan(PI_4 + phi2 * 0.5))) / (2 * PI);
  return [x, y];
}

/**
 * Unproject world point [x,y] on map onto {lat, lon} on sphere
 *
 * @param {object|Vector} xy - object with {x,y} members
 *  representing point on projected map plane
 * @return {GeoCoordinates} - object with {lat,lon} of point on sphere.
 *   Has toArray method if you need a GeoJSON Array.
 *   Per cartographic tradition, lat and lon are specified as degrees.
 */
function unprojectFlat(_ref3, scale) {
  var _ref4 = _slicedToArray(_ref3, 2),
      x = _ref4[0],
      y = _ref4[1];

  scale = scale * WORLD_SCALE;
  var lambda2 = x / scale * (2 * PI) - PI;
  var phi2 = 2 * (Math.atan(Math.exp(PI - y / scale * (2 * PI))) - PI_4);
  return [lambda2 * RADIANS_TO_DEGREES, phi2 * RADIANS_TO_DEGREES];
}

// Returns the zoom level that gives a 1 meter pixel at a certain latitude
// S=C*cos(y)/2^(z+8)
function getMercatorMeterZoom(_ref5) {
  var latitude = _ref5.latitude;

  (0, _assert2.default)(latitude);
  var EARTH_CIRCUMFERENCE = 40.075e6;
  var radians = function radians(degrees) {
    return degrees / 180 * Math.PI;
  };
  return Math.log2(EARTH_CIRCUMFERENCE * Math.cos(radians(latitude))) - 8;
}

/**
 * Calculate distance scales in meters around current lat/lon, both for
 * degrees and pixels.
 * In mercator projection mode, the distance scales vary significantly
 * with latitude.
 */
function getMercatorDistanceScales(_ref6) {
  var latitude = _ref6.latitude,
      longitude = _ref6.longitude,
      zoom = _ref6.zoom,
      scale = _ref6.scale;

  // Calculate scale from zoom if not provided
  scale = scale !== undefined ? scale : Math.pow(2, zoom);

  (0, _assert2.default)(!isNaN(latitude) && !isNaN(longitude) && !isNaN(scale));

  var latCosine = Math.cos(latitude * Math.PI / 180);

  // const metersPerDegreeX = METERS_PER_DEGREE_AT_EQUATOR * latCosine;
  // const metersPerDegreeY = METERS_PER_DEGREE_AT_EQUATOR;

  // Calculate number of pixels occupied by one degree longitude
  // around current lat/lon
  var pixelsPerDegreeX = (0, _distance2.default)(projectFlat([longitude + 0.5, latitude], scale), projectFlat([longitude - 0.5, latitude], scale));
  // Calculate number of pixels occupied by one degree latitude
  // around current lat/lon
  var pixelsPerDegreeY = (0, _distance2.default)(projectFlat([longitude, latitude + 0.5], scale), projectFlat([longitude, latitude - 0.5], scale));

  var worldSize = TILE_SIZE * scale;
  var altPixelsPerMeter = worldSize / (4e7 * latCosine);
  var pixelsPerMeter = [altPixelsPerMeter, altPixelsPerMeter, altPixelsPerMeter];
  var metersPerPixel = [1 / altPixelsPerMeter, 1 / altPixelsPerMeter, 1 / altPixelsPerMeter];

  var pixelsPerDegree = [pixelsPerDegreeX, pixelsPerDegreeY, altPixelsPerMeter];
  var degreesPerPixel = [1 / pixelsPerDegreeX, 1 / pixelsPerDegreeY, 1 / altPixelsPerMeter];

  // Main results, used for converting meters to latlng deltas and scaling offsets
  return {
    pixelsPerMeter: pixelsPerMeter,
    metersPerPixel: metersPerPixel,
    pixelsPerDegree: pixelsPerDegree,
    degreesPerPixel: degreesPerPixel
  };
}

/**
 * Calculates a mercator world position ("pixels" in given zoom level)
 * from a lng/lat and meterOffset
 */
function getMercatorWorldPosition(_ref7) {
  var longitude = _ref7.longitude,
      latitude = _ref7.latitude,
      zoom = _ref7.zoom,
      meterOffset = _ref7.meterOffset,
      _ref7$distanceScales = _ref7.distanceScales,
      distanceScales = _ref7$distanceScales === undefined ? null : _ref7$distanceScales;

  var scale = Math.pow(2, zoom);

  // Calculate distance scales if lng/lat/zoom are provided
  distanceScales = distanceScales || getMercatorDistanceScales({ latitude: latitude, longitude: longitude, scale: scale });

  // Make a centered version of the matrix for projection modes without an offset
  var center2d = projectFlat([longitude, latitude], scale);
  var center = new _math.Vector3(center2d[0], center2d[1], 0);

  if (meterOffset) {
    var pixelPosition = new _math.Vector3(meterOffset)
    // Convert to pixels in current zoom
    .scale(distanceScales.pixelsPerMeter)
    // We want positive Y to represent an offset towards north,
    // but web mercator world coordinates is top-left
    .scale([1, -1, 1]);
    center.add(pixelPosition);
  }

  return center;
}

// ATTRIBUTION:
// view and projection matrix creation is intentionally kept compatible with
// mapbox-gl's implementation to ensure that seamless interoperation
// with mapbox and react-map-gl. See: https://github.com/mapbox/mapbox-gl-js

// Variable fov (in radians)
function getFov(_ref8) {
  var height = _ref8.height,
      altitude = _ref8.altitude;

  return 2 * Math.atan(height / 2 / altitude);
}

function getClippingPlanes(_ref9) {
  var altitude = _ref9.altitude,
      pitch = _ref9.pitch;

  // Find the distance from the center point to the center top
  // in altitude units using law of sines.
  var pitchRadians = pitch * DEGREES_TO_RADIANS;
  var halfFov = Math.atan(0.5 / altitude);
  var topHalfSurfaceDistance = Math.sin(halfFov) * altitude / Math.sin(Math.PI / 2 - pitchRadians - halfFov);

  // Calculate z value of the farthest fragment that should be rendered.
  var farZ = Math.cos(Math.PI / 2 - pitchRadians) * topHalfSurfaceDistance + altitude;

  return { farZ: farZ, nearZ: 0.1 };
}

// TODO - rename this matrix
function makeUncenteredViewMatrixFromMercatorParams(_ref10) {
  var width = _ref10.width,
      height = _ref10.height,
      longitude = _ref10.longitude,
      latitude = _ref10.latitude,
      zoom = _ref10.zoom,
      pitch = _ref10.pitch,
      bearing = _ref10.bearing,
      altitude = _ref10.altitude,
      center = _ref10.center;

  // VIEW MATRIX: PROJECTS MERCATOR WORLD COORDINATES
  // Note that mercator world coordinates typically need to be flipped
  //
  // Note: As usual, matrix operation orders should be read in reverse
  // since vectors will be multiplied from the right during transformation
  var vm = createMat4();

  // Move camera to altitude (along the pitch & bearing direction)
  (0, _translate2.default)(vm, vm, [0, 0, -altitude]);

  // After the rotateX, z values are in pixel units. Convert them to
  // altitude units. 1 altitude unit = the screen height.
  (0, _scale2.default)(vm, vm, [1, 1, 1 / height]);

  // Rotate by bearing, and then by pitch (which tilts the view)
  (0, _rotateX2.default)(vm, vm, -pitch * DEGREES_TO_RADIANS);
  (0, _rotateZ2.default)(vm, vm, bearing * DEGREES_TO_RADIANS);

  return vm;
}

function makeViewMatricesFromMercatorParams(_ref11) {
  var width = _ref11.width,
      height = _ref11.height,
      longitude = _ref11.longitude,
      latitude = _ref11.latitude,
      zoom = _ref11.zoom,
      pitch = _ref11.pitch,
      bearing = _ref11.bearing,
      altitude = _ref11.altitude,
      centerLngLat = _ref11.centerLngLat,
      _ref11$meterOffset = _ref11.meterOffset,
      meterOffset = _ref11$meterOffset === undefined ? null : _ref11$meterOffset;

  var center = getMercatorWorldPosition({ longitude: longitude, latitude: latitude, zoom: zoom, meterOffset: meterOffset });

  // VIEW MATRIX: PROJECTS FROM VIRTUAL PIXELS TO CAMERA SPACE
  // Note: As usual, matrix operation orders should be read in reverse
  // since vectors will be multiplied from the right during transformation
  var viewMatrixUncentered = makeUncenteredViewMatrixFromMercatorParams({
    width: width,
    height: height,
    longitude: longitude,
    latitude: latitude,
    zoom: zoom,
    pitch: pitch,
    bearing: bearing,
    altitude: altitude
  });

  var vm = createMat4();
  (0, _scale2.default)(vm, viewMatrixUncentered, [1, -1, 1]);
  var viewMatrixCentered = (0, _translate2.default)(vm, vm, new _math.Vector3(center).negate());

  return {
    viewMatrixCentered: viewMatrixCentered,
    viewMatrixUncentered: viewMatrixUncentered,
    center: center
  };
}

// PROJECTION MATRIX: PROJECTS FROM CAMERA (VIEW) SPACE TO CLIPSPACE
// This is a "Mapbox" projection matrix - matches mapbox exactly if farZMultiplier === 1
function makeProjectionMatrixFromMercatorParams(_ref12) {
  var width = _ref12.width,
      height = _ref12.height,
      pitch = _ref12.pitch,
      altitude = _ref12.altitude,
      _ref12$farZMultiplier = _ref12.farZMultiplier,
      farZMultiplier = _ref12$farZMultiplier === undefined ? 10 : _ref12$farZMultiplier;

  var _getClippingPlanes = getClippingPlanes({ altitude: altitude, pitch: pitch }),
      nearZ = _getClippingPlanes.nearZ,
      farZ = _getClippingPlanes.farZ;

  var fov = getFov({ height: height, altitude: altitude });

  var projectionMatrix = (0, _perspective2.default)(createMat4(), fov, // fov in radians
  width / height, // aspect ratio
  nearZ, // near plane
  farZ * farZMultiplier // far plane
  );

  return projectionMatrix;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy93ZWItbWVyY2F0b3ItdXRpbHMuanMiXSwibmFtZXMiOlsicHJvamVjdEZsYXQiLCJ1bnByb2plY3RGbGF0IiwiZ2V0TWVyY2F0b3JNZXRlclpvb20iLCJnZXRNZXJjYXRvckRpc3RhbmNlU2NhbGVzIiwiZ2V0TWVyY2F0b3JXb3JsZFBvc2l0aW9uIiwiZ2V0Rm92IiwiZ2V0Q2xpcHBpbmdQbGFuZXMiLCJtYWtlVW5jZW50ZXJlZFZpZXdNYXRyaXhGcm9tTWVyY2F0b3JQYXJhbXMiLCJtYWtlVmlld01hdHJpY2VzRnJvbU1lcmNhdG9yUGFyYW1zIiwibWFrZVByb2plY3Rpb25NYXRyaXhGcm9tTWVyY2F0b3JQYXJhbXMiLCJQSSIsIk1hdGgiLCJQSV80IiwiREVHUkVFU19UT19SQURJQU5TIiwiUkFESUFOU19UT19ERUdSRUVTIiwiVElMRV9TSVpFIiwiV09STERfU0NBTEUiLCJjcmVhdGVNYXQ0Iiwic2NhbGUiLCJsbmciLCJsYXQiLCJsYW1iZGEyIiwicGhpMiIsIngiLCJ5IiwibG9nIiwidGFuIiwiYXRhbiIsImV4cCIsImxhdGl0dWRlIiwiRUFSVEhfQ0lSQ1VNRkVSRU5DRSIsInJhZGlhbnMiLCJkZWdyZWVzIiwibG9nMiIsImNvcyIsImxvbmdpdHVkZSIsInpvb20iLCJ1bmRlZmluZWQiLCJwb3ciLCJpc05hTiIsImxhdENvc2luZSIsInBpeGVsc1BlckRlZ3JlZVgiLCJwaXhlbHNQZXJEZWdyZWVZIiwid29ybGRTaXplIiwiYWx0UGl4ZWxzUGVyTWV0ZXIiLCJwaXhlbHNQZXJNZXRlciIsIm1ldGVyc1BlclBpeGVsIiwicGl4ZWxzUGVyRGVncmVlIiwiZGVncmVlc1BlclBpeGVsIiwibWV0ZXJPZmZzZXQiLCJkaXN0YW5jZVNjYWxlcyIsImNlbnRlcjJkIiwiY2VudGVyIiwicGl4ZWxQb3NpdGlvbiIsImFkZCIsImhlaWdodCIsImFsdGl0dWRlIiwicGl0Y2giLCJwaXRjaFJhZGlhbnMiLCJoYWxmRm92IiwidG9wSGFsZlN1cmZhY2VEaXN0YW5jZSIsInNpbiIsImZhcloiLCJuZWFyWiIsIndpZHRoIiwiYmVhcmluZyIsInZtIiwiY2VudGVyTG5nTGF0Iiwidmlld01hdHJpeFVuY2VudGVyZWQiLCJ2aWV3TWF0cml4Q2VudGVyZWQiLCJuZWdhdGUiLCJmYXJaTXVsdGlwbGllciIsImZvdiIsInByb2plY3Rpb25NYXRyaXgiXSwibWFwcGluZ3MiOiI7Ozs7Ozt5cEJBQUE7O1FBb0NnQkEsVyxHQUFBQSxXO1FBa0JBQyxhLEdBQUFBLGE7UUFTQUMsb0IsR0FBQUEsb0I7UUFhQUMseUIsR0FBQUEseUI7UUE2Q0FDLHdCLEdBQUFBLHdCO1FBbUNBQyxNLEdBQUFBLE07UUFJQUMsaUIsR0FBQUEsaUI7UUFlQUMsMEMsR0FBQUEsMEM7UUFnQ0FDLGtDLEdBQUFBLGtDO1FBeUNBQyxzQyxHQUFBQSxzQzs7QUF0UGhCOztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7QUFFQTtBQUNBLElBQU1DLEtBQUtDLEtBQUtELEVBQWhCO0FBQ0EsSUFBTUUsT0FBT0YsS0FBSyxDQUFsQjtBQUNBLElBQU1HLHFCQUFxQkgsS0FBSyxHQUFoQztBQUNBLElBQU1JLHFCQUFxQixNQUFNSixFQUFqQztBQUNBLElBQU1LLFlBQVksR0FBbEI7QUFDQSxJQUFNQyxjQUFjRCxTQUFwQjs7QUFFQTs7QUFFQTtBQUNBLFNBQVNFLFVBQVQsR0FBc0I7QUFDcEIsU0FBTyxDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxFQUFVLENBQVYsRUFBYSxDQUFiLEVBQWdCLENBQWhCLEVBQW1CLENBQW5CLEVBQXNCLENBQXRCLEVBQXlCLENBQXpCLEVBQTRCLENBQTVCLEVBQStCLENBQS9CLEVBQWtDLENBQWxDLEVBQXFDLENBQXJDLEVBQXdDLENBQXhDLEVBQTJDLENBQTNDLEVBQThDLENBQTlDLENBQVA7QUFDRDs7QUFFRDs7Ozs7Ozs7OztBQVVPLFNBQVNqQixXQUFULE9BQWlDa0IsS0FBakMsRUFBd0M7QUFBQTtB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QUFDbEJSLFVBQVFULE1BSGUsRUFHTDtBQUNsQlEsT0FKdUIsRUFJTDtBQUNsQkQsU0FBT1MsY0FMZ0IsQ0FLRDtBQUxDLEdBQXpCOztBQVFBLFNBQU9FLGdCQUFQO0FBQ0QiLCJmaWxlIjoid2ViLW1lcmNhdG9yLXV0aWxzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVE9ETyAtIFRIRSBVVElMSVRJRVMgSU4gVEhJUyBGSUxFIFNIT1VMRCBCRSBJTVBPUlRFRCBGUk9NIFdFQi1NRVJDQVRPUi1WSUVXUE9SVCBNT0RVTEVcblxuaW1wb3J0IHtWZWN0b3IzfSBmcm9tICdtYXRoLmdsJztcbmltcG9ydCBtYXQ0X3BlcnNwZWN0aXZlIGZyb20gJ2dsLW1hdDQvcGVyc3BlY3RpdmUnO1xuaW1wb3J0IG1hdDRfc2NhbGUgZnJvbSAnZ2wtbWF0NC9zY2FsZSc7XG5pbXBvcnQgbWF0NF90cmFuc2xhdGUgZnJvbSAnZ2wtbWF0NC90cmFuc2xhdGUnO1xuaW1wb3J0IG1hdDRfcm90YXRlWCBmcm9tICdnbC1tYXQ0L3JvdGF0ZVgnO1xuaW1wb3J0IG1hdDRfcm90YXRlWiBmcm9tICdnbC1tYXQ0L3JvdGF0ZVonO1xuaW1wb3J0IHZlYzJfZGlzdGFuY2UgZnJvbSAnZ2wtdmVjMi9kaXN0YW5jZSc7XG5pbXBvcnQgYXNzZXJ0IGZyb20gJy4vYXNzZXJ0JztcblxuLy8gQ09OU1RBTlRTXG5jb25zdCBQSSA9IE1hdGguUEk7XG5jb25zdCBQSV80ID0gUEkgLyA0O1xuY29uc3QgREVHUkVFU19UT19SQURJQU5TID0gUEkgLyAxODA7XG5jb25zdCBSQURJQU5TX1RPX0RFR1JFRVMgPSAxODAgLyBQSTtcbmNvbnN0IFRJTEVfU0laRSA9IDUxMjtcbmNvbnN0IFdPUkxEX1NDQUxFID0gVElMRV9TSVpFO1xuXG4vLyBjb25zdCBNRVRFUlNfUEVSX0RFR1JFRV9BVF9FUVVBVE9SID0gMTExMDAwOyAvLyBBcHByb3hpbWF0ZWx5IDExMWttIHBlciBkZWdyZWUgYXQgZXF1YXRvclxuXG4vLyBIZWxwZXIsIGF2b2lkcyBsb3ctcHJlY2lzaW9uIDMyIGJpdCBtYXRyaWNlcyBmcm9tIGdsLW1hdHJpeCBtYXQ0LmNyZWF0ZSgpXG5mdW5jdGlvbiBjcmVhdGVNYXQ0KCkge1xuICByZXR1cm4gWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdO1xufVxuXG4vKipcbiAqIFByb2plY3QgW2xuZyxsYXRdIG9uIHNwaGVyZSBvbnRvIFt4LHldIG9uIDUxMio1MTIgTWVyY2F0b3IgWm9vbSAwIHRpbGUuXG4gKiBQZXJmb3JtcyB0aGUgbm9ubGluZWFyIHBhcnQgb2YgdGhlIHdlYiBtZXJjYXRvciBwcm9qZWN0aW9uLlxuICogUmVtYWluaW5nIHByb2plY3Rpb24gaXMgZG9uZSB3aXRoIDR4NCBtYXRyaWNlcyB3aGljaCBhbHNvIGhhbmRsZXNcbiAqIHBlcnNwZWN0aXZlLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGxuZ0xhdCAtIFtsbmcsIGxhdF0gY29vcmRpbmF0ZXNcbiAqICAgU3BlY2lmaWVzIGEgcG9pbnQgb24gdGhlIHNwaGVyZSB0byBwcm9qZWN0IG9udG8gdGhlIG1hcC5cbiAqIEByZXR1cm4ge0FycmF5fSBbeCx5XSBjb29yZGluYXRlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb2plY3RGbGF0KFtsbmcsIGxhdF0sIHNjYWxlKSB7XG4gIHNjYWxlID0gc2NhbGUgKiBXT1JMRF9TQ0FMRTtcbiAgY29uc3QgbGFtYmRhMiA9IGxuZyAqIERFR1JFRVNfVE9fUkFESUFOUztcbiAgY29uc3QgcGhpMiA9IGxhdCAqIERFR1JFRVNfVE9fUkFESUFOUztcbiAgY29uc3QgeCA9IHNjYWxlICogKGxhbWJkYTIgKyBQSSkgLyAoMiAqIFBJKTtcbiAgY29uc3QgeSA9IHNjYWxlICogKFBJIC0gTWF0aC5sb2coTWF0aC50YW4oUElfNCArIHBoaTIgKiAwLjUpKSkgLyAoMiAqIFBJKTtcbiAgcmV0dXJuIFt4LCB5XTtcbn1cblxuLyoqXG4gKiBVbnByb2plY3Qgd29ybGQgcG9pbnQgW3gseV0gb24gbWFwIG9udG8ge2xhdCwgbG9ufSBvbiBzcGhlcmVcbiAqXG4gKiBAcGFyYW0ge29iamVjdHxWZWN0b3J9IHh5IC0gb2JqZWN0IHdpdGgge3gseX0gbWVtYmVyc1xuICogIHJlcHJlc2VudGluZyBwb2ludCBvbiBwcm9qZWN0ZWQgbWFwIHBsYW5lXG4gKiBAcmV0dXJuIHtHZW9Db29yZGluYXRlc30gLSBvYmplY3Qgd2l0aCB7bGF0LGxvbn0gb2YgcG9pbnQgb24gc3BoZXJlLlxuICogICBIYXMgdG9BcnJheSBtZXRob2QgaWYgeW91IG5lZWQgYSBHZW9KU09OIEFycmF5LlxuICogICBQZXIgY2FydG9ncmFwaGljIHRyYWRpdGlvbiwgbGF0IGFuZCBsb24gYXJlIHNwZWNpZmllZCBhcyBkZWdyZWVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdW5wcm9qZWN0RmxhdChbeCwgeV0sIHNjYWxlKSB7XG4gIHNjYWxlID0gc2NhbGUgKiBXT1JMRF9TQ0FMRTtcbiAgY29uc3QgbGFtYmRhMiA9ICh4IC8gc2NhbGUpICogKDIgKiBQSSkgLSBQSTtcbiAgY29uc3QgcGhpMiA9IDIgKiAoTWF0aC5hdGFuKE1hdGguZXhwKFBJIC0gKHkgLyBzY2FsZSkgKiAoMiAqIFBJKSkpIC0gUElfNCk7XG4gIHJldHVybiBbbGFtYmRhMiAqIFJBRElBTlNfVE9fREVHUkVFUywgcGhpMiAqIFJBRElBTlNfVE9fREVHUkVFU107XG59XG5cbi8vIFJldHVybnMgdGhlIHpvb20gbGV2ZWwgdGhhdCBnaXZlcyBhIDEgbWV0ZXIgcGl4ZWwgYXQgYSBjZXJ0YWluIGxhdGl0dWRlXG4vLyBTPUMqY29zKHkpLzJeKHorOClcbmV4cG9ydCBmdW5jdGlvbiBnZXRNZXJjYXRvck1ldGVyWm9vbSh7bGF0aXR1ZGV9KSB7XG4gIGFzc2VydChsYXRpdHVkZSk7XG4gIGNvbnN0IEVBUlRIX0NJUkNVTUZFUkVOQ0UgPSA0MC4wNzVlNjtcbiAgY29uc3QgcmFkaWFucyA9IGRlZ3JlZXMgPT4gZGVncmVlcyAvIDE4MCAqIE1hdGguUEk7XG4gIHJldHVybiBNYXRoLmxvZzIoRUFSVEhfQ0lSQ1VNRkVSRU5DRSAqIE1hdGguY29zKHJhZGlhbnMobGF0aXR1ZGUpKSkgLSA4O1xufVxuXG4vKipcbiAqIENhbGN1bGF0ZSBkaXN0YW5jZSBzY2FsZXMgaW4gbWV0ZXJzIGFyb3VuZCBjdXJyZW50IGxhdC9sb24sIGJvdGggZm9yXG4gKiBkZWdyZWVzIGFuZCBwaXhlbHMuXG4gKiBJbiBtZXJjYXRvciBwcm9qZWN0aW9uIG1vZGUsIHRoZSBkaXN0YW5jZSBzY2FsZXMgdmFyeSBzaWduaWZpY2FudGx5XG4gKiB3aXRoIGxhdGl0dWRlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWVyY2F0b3JEaXN0YW5jZVNjYWxlcyh7bGF0aXR1ZGUsIGxvbmdpdHVkZSwgem9vbSwgc2NhbGV9KSB7XG4gIC8vIENhbGN1bGF0ZSBzY2FsZSBmcm9tIHpvb20gaWYgbm90IHByb3ZpZGVkXG4gIHNjYWxlID0gc2NhbGUgIT09IHVuZGVmaW5lZCA/IHNjYWxlIDogTWF0aC5wb3coMiwgem9vbSk7XG5cbiAgYXNzZXJ0KCFpc05hTihsYXRpdHVkZSkgJiYgIWlzTmFOKGxvbmdpdHVkZSkgJiYgIWlzTmFOKHNjYWxlKSk7XG5cbiAgY29uc3QgbGF0Q29zaW5lID0gTWF0aC5jb3MobGF0aXR1ZGUgKiBNYXRoLlBJIC8gMTgwKTtcblxuICAvLyBjb25zdCBtZXRlcnNQZXJEZWdyZWVYID0gTUVURVJTX1BFUl9ERUdSRUVfQVRfRVFVQVRPUiAqIGxhdENvc2luZTtcbiAgLy8gY29uc3QgbWV0ZXJzUGVyRGVncmVlWSA9IE1FVEVSU19QRVJfREVHUkVFX0FUX0VRVUFUT1I7XG5cbiAgLy8gQ2FsY3VsYXRlIG51bWJlciBvZiBwaXhlbHMgb2NjdXBpZWQgYnkgb25lIGRlZ3JlZSBsb25naXR1ZGVcbiAgLy8gYXJvdW5kIGN1cnJlbnQgbGF0L2xvblxuICBjb25zdCBwaXhlbHNQZXJEZWdyZWVYID0gdmVjMl9kaXN0YW5jZShcbiAgICBwcm9qZWN0RmxhdChbbG9uZ2l0dWRlICsgMC41LCBsYXRpdHVkZV0sIHNjYWxlKSxcbiAgICBwcm9qZWN0RmxhdChbbG9uZ2l0dWRlIC0gMC41LCBsYXRpdHVkZV0sIHNjYWxlKVxuICApO1xuICAvLyBDYWxjdWxhdGUgbnVtYmVyIG9mIHBpeGVscyBvY2N1cGllZCBieSBvbmUgZGVncmVlIGxhdGl0dWRlXG4gIC8vIGFyb3VuZCBjdXJyZW50IGxhdC9sb25cbiAgY29uc3QgcGl4ZWxzUGVyRGVncmVlWSA9IHZlYzJfZGlzdGFuY2UoXG4gICAgcHJvamVjdEZsYXQoW2xvbmdpdHVkZSwgbGF0aXR1ZGUgKyAwLjVdLCBzY2FsZSksXG4gICAgcHJvamVjdEZsYXQoW2xvbmdpdHVkZSwgbGF0aXR1ZGUgLSAwLjVdLCBzY2FsZSlcbiAgKTtcblxuICBjb25zdCB3b3JsZFNpemUgPSBUSUxFX1NJWkUgKiBzY2FsZTtcbiAgY29uc3QgYWx0UGl4ZWxzUGVyTWV0ZXIgPSB3b3JsZFNpemUgLyAoNGU3ICogbGF0Q29zaW5lKTtcbiAgY29uc3QgcGl4ZWxzUGVyTWV0ZXIgPSBbYWx0UGl4ZWxzUGVyTWV0ZXIsIGFsdFBpeGVsc1Blck1ldGVyLCBhbHRQaXhlbHNQZXJNZXRlcl07XG4gIGNvbnN0IG1ldGVyc1BlclBpeGVsID0gWzEgLyBhbHRQaXhlbHNQZXJNZXRlciwgMSAvIGFsdFBpeGVsc1Blck1ldGVyLCAxIC8gYWx0UGl4ZWxzUGVyTWV0ZXJdO1xuXG4gIGNvbnN0IHBpeGVsc1BlckRlZ3JlZSA9IFtwaXhlbHNQZXJEZWdyZWVYLCBwaXhlbHNQZXJEZWdyZWVZLCBhbHRQaXhlbHNQZXJNZXRlcl07XG4gIGNvbnN0IGRlZ3JlZXNQZXJQaXhlbCA9IFsxIC8gcGl4ZWxzUGVyRGVncmVlWCwgMSAvIHBpeGVsc1BlckRlZ3JlZVksIDEgLyBhbHRQaXhlbHNQZXJNZXRlcl07XG5cbiAgLy8gTWFpbiByZXN1bHRzLCB1c2VkIGZvciBjb252ZXJ0aW5nIG1ldGVycyB0byBsYXRsbmcgZGVsdGFzIGFuZCBzY2FsaW5nIG9mZnNldHNcbiAgcmV0dXJuIHtcbiAgICBwaXhlbHNQZXJNZXRlcixcbiAgICBtZXRlcnNQZXJQaXhlbCxcbiAgICBwaXhlbHNQZXJEZWdyZWUsXG4gICAgZGVncmVlc1BlclBpeGVsXG4gIH07XG59XG5cbi8qKlxuICogQ2FsY3VsYXRlcyBhIG1lcmNhdG9yIHdvcmxkIHBvc2l0aW9uIChcInBpeGVsc1wiIGluIGdpdmVuIHpvb20gbGV2ZWwpXG4gKiBmcm9tIGEgbG5nL2xhdCBhbmQgbWV0ZXJPZmZzZXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE1lcmNhdG9yV29ybGRQb3NpdGlvbih7XG4gIGxvbmdpdHVkZSxcbiAgbGF0aXR1ZGUsXG4gIHpvb20sXG4gIG1ldGVyT2Zmc2V0LFxuICBkaXN0YW5jZVNjYWxlcyA9IG51bGxcbn0pIHtcbiAgY29uc3Qgc2NhbGUgPSBNYXRoLnBvdygyLCB6b29tKTtcblxuICAvLyBDYWxjdWxhdGUgZGlzdGFuY2Ugc2NhbGVzIGlmIGxuZy9sYXQvem9vbSBhcmUgcHJvdmlkZWRcbiAgZGlzdGFuY2VTY2FsZXMgPSBkaXN0YW5jZVNjYWxlcyB8fCBnZXRNZXJjYXRvckRpc3RhbmNlU2NhbGVzKHtsYXRpdHVkZSwgbG9uZ2l0dWRlLCBzY2FsZX0pO1xuXG4gIC8vIE1ha2UgYSBjZW50ZXJlZCB2ZXJzaW9uIG9mIHRoZSBtYXRyaXggZm9yIHByb2plY3Rpb24gbW9kZXMgd2l0aG91dCBhbiBvZmZzZXRcbiAgY29uc3QgY2VudGVyMmQgPSBwcm9qZWN0RmxhdChbbG9uZ2l0dWRlLCBsYXRpdHVkZV0sIHNjYWxlKTtcbiAgY29uc3QgY2VudGVyID0gbmV3IFZlY3RvcjMoY2VudGVyMmRbMF0sIGNlbnRlcjJkWzFdLCAwKTtcblxuICBpZiAobWV0ZXJPZmZzZXQpIHtcbiAgICBjb25zdCBwaXhlbFBvc2l0aW9uID0gbmV3IFZlY3RvcjMobWV0ZXJPZmZzZXQpXG4gICAgICAvLyBDb252ZXJ0IHRvIHBpeGVscyBpbiBjdXJyZW50IHpvb21cbiAgICAgIC5zY2FsZShkaXN0YW5jZVNjYWxlcy5waXhlbHNQZXJNZXRlcilcbiAgICAgIC8vIFdlIHdhbnQgcG9zaXRpdmUgWSB0byByZXByZXNlbnQgYW4gb2Zmc2V0IHRvd2FyZHMgbm9ydGgsXG4gICAgICAvLyBidXQgd2ViIG1lcmNhdG9yIHdvcmxkIGNvb3JkaW5hdGVzIGlzIHRvcC1sZWZ0XG4gICAgICAuc2NhbGUoWzEsIC0xLCAxXSk7XG4gICAgY2VudGVyLmFkZChwaXhlbFBvc2l0aW9uKTtcbiAgfVxuXG4gIHJldHVybiBjZW50ZXI7XG59XG5cbi8vIEFUVFJJQlVUSU9OOlxuLy8gdmlldyBhbmQgcHJvamVjdGlvbiBtYXRyaXggY3JlYXRpb24gaXMgaW50ZW50aW9uYWxseSBrZXB0IGNvbXBhdGlibGUgd2l0aFxuLy8gbWFwYm94LWdsJ3MgaW1wbGVtZW50YXRpb24gdG8gZW5zdXJlIHRoYXQgc2VhbWxlc3MgaW50ZXJvcGVyYXRpb25cbi8vIHdpdGggbWFwYm94IGFuZCByZWFjdC1tYXAtZ2wuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL21hcGJveC9tYXBib3gtZ2wtanNcblxuLy8gVmFyaWFibGUgZm92IChpbiByYWRpYW5zKVxuZXhwb3J0IGZ1bmN0aW9uIGdldEZvdih7aGVpZ2h0LCBhbHRpdHVkZX0pIHtcbiAgcmV0dXJuIDIgKiBNYXRoLmF0YW4oKGhlaWdodCAvIDIpIC8gYWx0aXR1ZGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2xpcHBpbmdQbGFuZXMoe2FsdGl0dWRlLCBwaXRjaH0pIHtcbiAgLy8gRmluZCB0aGUgZGlzdGFuY2UgZnJvbSB0aGUgY2VudGVyIHBvaW50IHRvIHRoZSBjZW50ZXIgdG9wXG4gIC8vIGluIGFsdGl0dWRlIHVuaXRzIHVzaW5nIGxhdyBvZiBzaW5lcy5cbiAgY29uc3QgcGl0Y2hSYWRpYW5zID0gcGl0Y2ggKiBERUdSRUVTX1RPX1JBRElBTlM7XG4gIGNvbnN0IGhhbGZGb3YgPSBNYXRoLmF0YW4oMC41IC8gYWx0aXR1ZGUpO1xuICBjb25zdCB0b3BIYWxmU3VyZmFjZURpc3RhbmNlID1cbiAgICBNYXRoLnNpbihoYWxmRm92KSAqIGFsdGl0dWRlIC8gTWF0aC5zaW4oTWF0aC5QSSAvIDIgLSBwaXRjaFJhZGlhbnMgLSBoYWxmRm92KTtcblxuICAvLyBDYWxjdWxhdGUgeiB2YWx1ZSBvZiB0aGUgZmFydGhlc3QgZnJhZ21lbnQgdGhhdCBzaG91bGQgYmUgcmVuZGVyZWQuXG4gIGNvbnN0IGZhclogPSBNYXRoLmNvcyhNYXRoLlBJIC8gMiAtIHBpdGNoUmFkaWFucykgKiB0b3BIYWxmU3VyZmFjZURpc3RhbmNlICsgYWx0aXR1ZGU7XG5cbiAgcmV0dXJuIHtmYXJaLCBuZWFyWjogMC4xfTtcbn1cblxuLy8gVE9ETyAtIHJlbmFtZSB0aGlzIG1hdHJpeFxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VVbmNlbnRlcmVkVmlld01hdHJpeEZyb21NZXJjYXRvclBhcmFtcyh7XG4gIHdpZHRoLFxuICBoZWlnaHQsXG4gIGxvbmdpdHVkZSxcbiAgbGF0aXR1ZGUsXG4gIHpvb20sXG4gIHBpdGNoLFxuICBiZWFyaW5nLFxuICBhbHRpdHVkZSxcbiAgY2VudGVyXG59KSB7XG4gIC8vIFZJRVcgTUFUUklYOiBQUk9KRUNUUyBNRVJDQVRPUiBXT1JMRCBDT09SRElOQVRFU1xuICAvLyBOb3RlIHRoYXQgbWVyY2F0b3Igd29ybGQgY29vcmRpbmF0ZXMgdHlwaWNhbGx5IG5lZWQgdG8gYmUgZmxpcHBlZFxuICAvL1xuICAvLyBOb3RlOiBBcyB1c3VhbCwgbWF0cml4IG9wZXJhdGlvbiBvcmRlcnMgc2hvdWxkIGJlIHJlYWQgaW4gcmV2ZXJzZVxuICAvLyBzaW5jZSB2ZWN0b3JzIHdpbGwgYmUgbXVsdGlwbGllZCBmcm9tIHRoZSByaWdodCBkdXJpbmcgdHJhbnNmb3JtYXRpb25cbiAgY29uc3Qgdm0gPSBjcmVhdGVNYXQ0KCk7XG5cbiAgLy8gTW92ZSBjYW1lcmEgdG8gYWx0aXR1ZGUgKGFsb25nIHRoZSBwaXRjaCAmIGJlYXJpbmcgZGlyZWN0aW9uKVxuICBtYXQ0X3RyYW5zbGF0ZSh2bSwgdm0sIFswLCAwLCAtYWx0aXR1ZGVdKTtcblxuICAvLyBBZnRlciB0aGUgcm90YXRlWCwgeiB2YWx1ZXMgYXJlIGluIHBpeGVsIHVuaXRzLiBDb252ZXJ0IHRoZW0gdG9cbiAgLy8gYWx0aXR1ZGUgdW5pdHMuIDEgYWx0aXR1ZGUgdW5pdCA9IHRoZSBzY3JlZW4gaGVpZ2h0LlxuICBtYXQ0X3NjYWxlKHZtLCB2bSwgWzEsIDEsIDEgLyBoZWlnaHRdKTtcblxuICAvLyBSb3RhdGUgYnkgYmVhcmluZywgYW5kIHRoZW4gYnkgcGl0Y2ggKHdoaWNoIHRpbHRzIHRoZSB2aWV3KVxuICBtYXQ0X3JvdGF0ZVgodm0sIHZtLCAtcGl0Y2ggKiBERUdSRUVTX1RPX1JBRElBTlMpO1xuICBtYXQ0X3JvdGF0ZVoodm0sIHZtLCBiZWFyaW5nICogREVHUkVFU19UT19SQURJQU5TKTtcblxuICByZXR1cm4gdm07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlVmlld01hdHJpY2VzRnJvbU1lcmNhdG9yUGFyYW1zKHtcbiAgd2lkdGgsXG4gIGhlaWdodCxcbiAgbG9uZ2l0dWRlLFxuICBsYXRpdHVkZSxcbiAgem9vbSxcbiAgcGl0Y2gsXG4gIGJlYXJpbmcsXG4gIGFsdGl0dWRlLFxuICBjZW50ZXJMbmdMYXQsXG4gIG1ldGVyT2Zmc2V0ID0gbnVsbFxufSkge1xuICBjb25zdCBjZW50ZXIgPSBnZXRNZXJjYXRvcldvcmxkUG9zaXRpb24oe2xvbmdpdHVkZSwgbGF0aXR1ZGUsIHpvb20sIG1ldGVyT2Zmc2V0fSk7XG5cbiAgLy8gVklFVyBNQVRSSVg6IFBST0pFQ1RTIEZST00gVklSVFVBTCBQSVhFTFMgVE8gQ0FNRVJBIFNQQUNFXG4gIC8vIE5vdGU6IEFzIHVzdWFsLCBtYXRyaXggb3BlcmF0aW9uIG9yZGVycyBzaG91bGQgYmUgcmVhZCBpbiByZXZlcnNlXG4gIC8vIHNpbmNlIHZlY3RvcnMgd2lsbCBiZSBtdWx0aXBsaWVkIGZyb20gdGhlIHJpZ2h0IGR1cmluZyB0cmFuc2Zvcm1hdGlvblxuICBjb25zdCB2aWV3TWF0cml4VW5jZW50ZXJlZCA9IG1ha2VVbmNlbnRlcmVkVmlld01hdHJpeEZyb21NZXJjYXRvclBhcmFtcyh7XG4gICAgd2lkdGgsXG4gICAgaGVpZ2h0LFxuICAgIGxvbmdpdHVkZSxcbiAgICBsYXRpdHVkZSxcbiAgICB6b29tLFxuICAgIHBpdGNoLFxuICAgIGJlYXJpbmcsXG4gICAgYWx0aXR1ZGVcbiAgfSk7XG5cbiAgY29uc3Qgdm0gPSBjcmVhdGVNYXQ0KCk7XG4gIG1hdDRfc2NhbGUodm0sIHZpZXdNYXRyaXhVbmNlbnRlcmVkLCBbMSwgLTEsIDFdKTtcbiAgY29uc3Qgdmlld01hdHJpeENlbnRlcmVkID0gbWF0NF90cmFuc2xhdGUodm0sIHZtLCBuZXcgVmVjdG9yMyhjZW50ZXIpLm5lZ2F0ZSgpKTtcblxuICByZXR1cm4ge1xuICAgIHZpZXdNYXRyaXhDZW50ZXJlZCxcbiAgICB2aWV3TWF0cml4VW5jZW50ZXJlZCxcbiAgICBjZW50ZXJcbiAgfTtcbn1cblxuLy8gUFJPSkVDVElPTiBNQVRSSVg6IFBST0pFQ1RTIEZST00gQ0FNRVJBIChWSUVXKSBTUEFDRSBUTyBDTElQU1BBQ0Vcbi8vIFRoaXMgaXMgYSBcIk1hcGJveFwiIHByb2plY3Rpb24gbWF0cml4IC0gbWF0Y2hlcyBtYXBib3ggZXhhY3RseSBpZiBmYXJaTXVsdGlwbGllciA9PT0gMVxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VQcm9qZWN0aW9uTWF0cml4RnJvbU1lcmNhdG9yUGFyYW1zKHtcbiAgd2lkdGgsXG4gIGhlaWdodCxcbiAgcGl0Y2gsXG4gIGFsdGl0dWRlLFxuICBmYXJaTXVsdGlwbGllciA9IDEwXG59KSB7XG4gIGNvbnN0IHtuZWFyWiwgZmFyWn0gPSBnZXRDbGlwcGluZ1BsYW5lcyh7YWx0aXR1ZGUsIHBpdGNofSk7XG4gIGNvbnN0IGZvdiA9IGdldEZvdih7aGVpZ2h0LCBhbHRpdHVkZX0pO1xuXG4gIGNvbnN0IHByb2plY3Rpb25NYXRyaXggPSBtYXQ0X3BlcnNwZWN0aXZlKFxuICAgIGNyZWF0ZU1hdDQoKSxcbiAgICBmb3YsICAgICAgICAgICAgICAvLyBmb3YgaW4gcmFkaWFuc1xuICAgIHdpZHRoIC8gaGVpZ2h0LCAgIC8vIGFzcGVjdCByYXRpb1xuICAgIG5lYXJaLCAgICAgICAgICAgIC8vIG5lYXIgcGxhbmVcbiAgICBmYXJaICogZmFyWk11bHRpcGxpZXIgLy8gZmFyIHBsYW5lXG4gICk7XG5cbiAgcmV0dXJuIHByb2plY3Rpb25NYXRyaXg7XG59XG4iXX0=