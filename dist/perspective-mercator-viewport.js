'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fitBounds = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _mercatorViewport = require('./mercator-viewport');

var _mercatorViewport2 = _interopRequireDefault(_mercatorViewport);

var _assert = require('./assert');

var _assert2 = _interopRequireDefault(_assert);

var _webMercatorUtils = require('./web-mercator-utils');

var _add = require('gl-vec2/add');

var _add2 = _interopRequireDefault(_add);

var _negate = require('gl-vec2/negate');

var _negate2 = _interopRequireDefault(_negate);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } // View and Projection Matrix calculations for mapbox-js style map view properties


/* eslint-disable camelcase */


var DEFAULT_MAP_STATE = {
  latitude: 37,
  longitude: -122,
  zoom: 11,
  pitch: 0,
  bearing: 0,
  altitude: 1.5
};

var ERR_ARGUMENT = 'Illegal argument to WebMercatorViewport';

var WebMercatorViewport = function (_MercatorViewport) {
  _inherits(WebMercatorViewport, _MercatorViewport);

  /**
   * @classdesc
   * Creates view/projection matrices from mercator params
   * Note: The Viewport is immutable in the sense that it only has accessors.
   * A new viewport instance should be created if any parameters have changed.
   *
   * @class
   * @param {Object} opt - options
   * @param {Boolean} mercator=true - Whether to use mercator projection
   *
   * @param {Number} opt.width=1 - Width of "viewport" or window
   * @param {Number} opt.height=1 - Height of "viewport" or window
   * @param {Array} opt.center=[0, 0] - Center of viewport
   *   [longitude, latitude] or [x, y]
   * @param {Number} opt.scale=1 - Either use scale or zoom
   * @param {Number} opt.pitch=0 - Camera angle in degrees (0 is straight down)
   * @param {Number} opt.bearing=0 - Map rotation in degrees (0 means north is up)
   * @param {Number} opt.altitude= - Altitude of camera in screen units
   *
   * Web mercator projection short-hand parameters
   * @param {Number} opt.latitude - Center of viewport on map (alternative to opt.center)
   * @param {Number} opt.longitude - Center of viewport on map (alternative to opt.center)
   * @param {Number} opt.zoom - Scale = Math.pow(2,zoom) on map (alternative to opt.scale)
    * Notes:
   *  - Only one of center or [latitude, longitude] can be specified
   *  - [latitude, longitude] can only be specified when "mercator" is true
   *  - Altitude has a default value that matches assumptions in mapbox-gl
   *  - width and height are forced to 1 if supplied as 0, to avoid
   *    division by zero. This is intended to reduce the burden of apps to
   *    to check values before instantiating a Viewport.
   */
  /* eslint-disable complexity */
  function WebMercatorViewport() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        width = _ref.width,
        height = _ref.height,
        latitude = _ref.latitude,
        longitude = _ref.longitude,
        zoom = _ref.zoom,
        pitch = _ref.pitch,
        bearing = _ref.bearing,
        altitude = _ref.altitude,
        _ref$farZMultiplier = _ref.farZMultiplier,
        farZMultiplier = _ref$farZMultiplier === undefined ? 10 : _ref$farZMultiplier;

    _classCallCheck(this, WebMercatorViewport);

    // Viewport - support undefined arguments
    width = width !== undefined ? width : DEFAULT_MAP_STATE.width;
    height = height !== undefined ? height : DEFAULT_MAP_STATE.height;
    zoom = zoom !== undefined ? zoom : DEFAULT_MAP_STATE.zoom;
    latitude = latitude !== undefined ? latitude : DEFAULT_MAP_STATE.latitude;
    longitude = longitude !== undefined ? longitude : DEFAULT_MAP_STATE.longitude;
    bearing = bearing !== undefined ? bearing : DEFAULT_MAP_STATE.bearing;
    pitch = pitch !== undefined ? pitch : DEFAULT_MAP_STATE.pitch;
    altitude = altitude !== undefined ? altitude : DEFAULT_MAP_STATE.altitude;

    // Silently allow apps to send in 0,0 to facilitate isomorphic render etc
    width = width || 1;
    height = height || 1;

    var scale = Math.pow(2, zoom);
    // Altitude - prevent division by 0
    // TODO - just throw an Error instead?
    altitude = Math.max(0.75, altitude);

    var center = (0, _webMercatorUtils.projectFlat)([longitude, latitude], scale);

    var distanceScales = (0, _webMercatorUtils.getMercatorDistanceScales)({ latitude: latitude, longitude: longitude, scale: scale });

    var projectionMatrix = (0, _webMercatorUtils.makeProjectionMatrixFromMercatorParams)({
      width: width,
      height: height,
      pitch: pitch,
      bearing: bearing,
      altitude: altitude,
      farZMultiplier: farZMultiplier
    });

    var _makeViewMatricesFrom = (0, _webMercatorUtils.makeViewMatricesFromMercatorParams)({
      width: width,
      height: height,
      longitude: longitude,
      latitude: latitude,
      zoom: zoom,
      pitch: pitch,
      bearing: bearing,
      altitude: altitude,
      distanceScales: distanceScales,
      center: center
    }),
        viewMatrixCentered = _makeViewMatricesFrom.viewMatrixCentered;

    // Save parameters
    var _this = _possibleConstructorReturn(this, (WebMercatorViewport.__proto__ || Object.getPrototypeOf(WebMercatorViewport)).call(this, { width: width, height: height, viewMatrix: viewMatrixCentered, projectionMatrix: projectionMatrix }));

    _this.latitude = latitude;
    _this.longitude = longitude;
    _this.zoom = zoom;
    _this.pitch = pitch;
    _this.bearing = bearing;
    _this.altitude = altitude;

    _this.scale = scale;
    _this.center = center;

    _this._distanceScales = distanceScales;

    Object.freeze(_this);
    return _this;
  }
  /* eslint-enable complexity */

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


  _createClass(WebMercatorViewport, [{
    key: '_projectFlat',
    value: function _projectFlat(lngLat) {
      var scale = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.scale;

      return (0, _webMercatorUtils.projectFlat)(lngLat, scale);
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

  }, {
    key: '_unprojectFlat',
    value: function _unprojectFlat(xy) {
      var scale = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.scale;

      return (0, _webMercatorUtils.unprojectFlat)(xy, scale);
    }

    /**
     * Get the map center that place a given [lng, lat] coordinate at screen
     * point [x, y]
     *
     * @param {Array} lngLat - [lng,lat] coordinates
     *   Specifies a point on the sphere.
     * @param {Array} pos - [x,y] coordinates
     *   Specifies a point on the screen.
     * @return {Array} [lng,lat] new map center.
     */

  }, {
    key: 'getLocationAtPoint',
    value: function getLocationAtPoint(_ref2) {
      var lngLat = _ref2.lngLat,
          pos = _ref2.pos;

      var fromLocation = this.projectFlat(this.unproject(pos));
      var toLocation = this.projectFlat(lngLat);

      var center = this.projectFlat([this.longitude, this.latitude]);

      var translate = (0, _add2.default)([], toLocation, (0, _negate2.default)([], fromLocation));
      var newCenter = (0, _add2.default)([], center, translate);
      return this.unprojectFlat(newCenter);
    }

    /*
    getLngLatAtViewportPosition(lnglat, xy) {
      const c = this.locationCoordinate(lnglat);
      const coordAtPoint = this.pointCoordinate(xy);
      const coordCenter = this.pointCoordinate(this.centerPoint);
      const translate = coordAtPoint._sub(c);
      this.center = this.coordinateLocation(coordCenter._sub(translate));
    }
    */

  }, {
    key: 'getDistanceScales',
    value: function getDistanceScales() {
      return this._distanceScales;
    }

    /**
     * Converts a meter offset to a lnglat offset
     *
     * Note: Uses simple linear approximation around the viewport center
     * Error increases with size of offset (roughly 1% per 100km)
     *
     * @param {[Number,Number]|[Number,Number,Number]) xyz - array of meter deltas
     * @return {[Number,Number]|[Number,Number,Number]) - array of [lng,lat,z] deltas
     */

  }, {
    key: 'metersToLngLatDelta',
    value: function metersToLngLatDelta(xyz) {
      var _xyz = _slicedToArray(xyz, 3),
          x = _xyz[0],
          y = _xyz[1],
          _xyz$ = _xyz[2],
          z = _xyz$ === undefined ? 0 : _xyz$;

      (0, _assert2.default)(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z), ERR_ARGUMENT);
      var _distanceScales = this._distanceScales,
          pixelsPerMeter = _distanceScales.pixelsPerMeter,
          degreesPerPixel = _distanceScales.degreesPerPixel;

      var deltaLng = x * pixelsPerMeter[0] * degreesPerPixel[0];
      var deltaLat = y * pixelsPerMeter[1] * degreesPerPixel[1];
      return xyz.length === 2 ? [deltaLng, deltaLat] : [deltaLng, deltaLat, z];
    }

    /**
     * Converts a lnglat offset to a meter offset
     *
     * Note: Uses simple linear approximation around the viewport center
     * Error increases with size of offset (roughly 1% per 100km)
     *
     * @param {[Number,Number]|[Number,Number,Number]) deltaLngLatZ - array of [lng,lat,z] deltas
     * @return {[Number,Number]|[Number,Number,Number]) - array of meter deltas
     */

  }, {
    key: 'lngLatDeltaToMeters',
    value: function lngLatDeltaToMeters(deltaLngLatZ) {
      var _deltaLngLatZ = _slicedToArray(deltaLngLatZ, 3),
          deltaLng = _deltaLngLatZ[0],
          deltaLat = _deltaLngLatZ[1],
          _deltaLngLatZ$ = _deltaLngLatZ[2],
          deltaZ = _deltaLngLatZ$ === undefined ? 0 : _deltaLngLatZ$;

      (0, _assert2.default)(Number.isFinite(deltaLng) && Number.isFinite(deltaLat) && Number.isFinite(deltaZ), ERR_ARGUMENT);
      var _distanceScales2 = this._distanceScales,
          pixelsPerDegree = _distanceScales2.pixelsPerDegree,
          metersPerPixel = _distanceScales2.metersPerPixel;

      var deltaX = deltaLng * pixelsPerDegree[0] * metersPerPixel[0];
      var deltaY = deltaLat * pixelsPerDegree[1] * metersPerPixel[1];
      return deltaLngLatZ.length === 2 ? [deltaX, deltaY] : [deltaX, deltaY, deltaZ];
    }

    /**
     * Add a meter delta to a base lnglat coordinate, returning a new lnglat array
     *
     * Note: Uses simple linear approximation around the viewport center
     * Error increases with size of offset (roughly 1% per 100km)
     *
     * @param {[Number,Number]|[Number,Number,Number]) lngLatZ - base coordinate
     * @param {[Number,Number]|[Number,Number,Number]) xyz - array of meter deltas
     * @return {[Number,Number]|[Number,Number,Number]) array of [lng,lat,z] deltas
     */

  }, {
    key: 'addMetersToLngLat',
    value: function addMetersToLngLat(lngLatZ, xyz) {
      var _lngLatZ = _slicedToArray(lngLatZ, 3),
          lng = _lngLatZ[0],
          lat = _lngLatZ[1],
          _lngLatZ$ = _lngLatZ[2],
          Z = _lngLatZ$ === undefined ? 0 : _lngLatZ$;

      var _metersToLngLatDelta = this.metersToLngLatDelta(xyz),
          _metersToLngLatDelta2 = _slicedToArray(_metersToLngLatDelta, 3),
          deltaLng = _metersToLngLatDelta2[0],
          deltaLat = _metersToLngLatDelta2[1],
          _metersToLngLatDelta3 = _metersToLngLatDelta2[2],
          deltaZ = _metersToLngLatDelta3 === undefined ? 0 : _metersToLngLatDelta3;

      return lngLatZ.length === 2 ? [lng + deltaLng, lat + deltaLat] : [lng + deltaLng, lat + deltaLat, Z + deltaZ];
    }

    /**
     * Returns a new viewport that fit around the given rectangle.
     * Only supports non-perspective mode.
     * @param {Array} bounds - [[lon, lat], [lon, lat]]
     * @param {Number} [options.padding] - The amount of padding in pixels to add to the given bounds.
     * @param {Array} [options.offset] - The center of the given bounds relative to the map's center,
     *    [x, y] measured in pixels.
     * @returns {WebMercatorViewport}
     */

  }, {
    key: 'fitBounds',
    value: function fitBounds(bounds) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var width = this.width,
          height = this.height;

      var _fitBounds2 = _fitBounds(Object.assign({ width: width, height: height, bounds: bounds }, options)),
          longitude = _fitBounds2.longitude,
          latitude = _fitBounds2.latitude,
          zoom = _fitBounds2.zoom;

      return new WebMercatorViewport({ width: width, height: height, longitude: longitude, latitude: latitude, zoom: zoom });
    }

    // INTERNAL METHODS

  }, {
    key: '_getParams',
    value: function _getParams() {
      return this._distanceScales;
    }
  }]);

  return WebMercatorViewport;
}(_mercatorViewport2.default);

/**
 * Returns map settings {latitude, longitude, zoom}
 * that will contain the provided corners within the provided width.
 * Only supports non-perspective mode.
 * @param {Number} width - viewport width
 * @param {Number} height - viewport height
 * @param {Array} bounds - [[lon, lat], [lon, lat]]
 * @param {Number} [padding] - The amount of padding in pixels to add to the given bounds.
 * @param {Array} [offset] - The center of the given bounds relative to the map's center,
 *    [x, y] measured in pixels.
 * @returns {Object} - latitude, longitude and zoom
 */


exports.default = WebMercatorViewport;
function _fitBounds(_ref3) {
  var width = _ref3.width,
      height = _ref3.height,
      bounds = _ref3.bounds,
      _ref3$padding = _ref3.padding,
      padding = _ref3$padding === undefined ? 0 : _ref3$padding,
      _ref3$offset = _ref3.offset,
      offset = _ref3$offset === undefined ? [0, 0] : _ref3$offset;

  var _bounds = _slicedToArray(bounds, 2),
      _bounds$ = _slicedToArray(_bounds[0], 2),
      west = _bounds$[0],
      south = _bounds$[1],
      _bounds$2 = _slicedToArray(_bounds[1], 2),
      east = _bounds$2[0],
      north = _bounds$2[1];

  var viewport = new WebMercatorViewport({
    width: width,
    height: height,
    longitude: 0,
    latitude: 0,
    zoom: 0
  });

  var nw = viewport.project([west, north]);
  var se = viewport.project([east, south]);
  var size = [Math.abs(se[0] - nw[0]), Math.abs(se[1] - nw[1])];
  var center = [(se[0] + nw[0]) / 2, (se[1] + nw[1]) / 2];

  var scaleX = (width - padding * 2 - Math.abs(offset[0]) * 2) / size[0];
  var scaleY = (height - padding * 2 - Math.abs(offset[1]) * 2) / size[1];

  var centerLngLat = viewport.unproject(center);
  var zoom = viewport.zoom + Math.log2(Math.abs(Math.min(scaleX, scaleY)));

  return {
    longitude: centerLngLat[0],
    latitude: centerLngLat[1],
    zoom: zoom
  };
}
exports.fitBounds = _fitBounds;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9wZXJzcGVjdGl2ZS1tZXJjYXRvci12aWV3cG9ydC5qcyJdLCJuYW1lcyI6WyJERUZBVUxUX01BUF9TVEFURSIsImxhdGl0dWRlIiwibG9uZ2l0dWRlIiwiem9vbSIsInBpdGNoIiwiYmVhcmluZyIsImFsdGl0dWRlIiwiRVJSX0FSR1VNRU5UIiwiV2ViTWVyY2F0b3JWaWV3cG9ydCIsIndpZHRoIiwiaGVpZ2h0IiwiZmFyWk11bHRpcGxpZXIiLCJ1bmRlZmluZWQiLCJzY2FsZSIsIk1hdGgiLCJwb3ciLCJtYXgiLCJjZW50ZXIiLCJkaXN0YW5jZVNjYWxlcyIsInByb2plY3Rpb25NYXRyaXgiLCJ2aWV3TWF0cml4Q2VudGVyZWQiLCJ2aWV3TWF0cml4IiwiX2Rpc3RhbmNlU2NhbGVzIiwiT2JqZWN0IiwiZnJlZXplIiwibG5nTGF0IiwieHkiLCJwb3MiLCJmcm9tTG9jYXRpb24iLCJwcm9qZWN0RmxhdCIsInVucHJvamVjdCIsInRvTG9jYXRpb24iLCJ0cmFuc2xhdGUiLCJuZXdDZW50ZXIiLCJ1bnByb2plY3RGbGF0IiwieHl6IiwieCIsInkiLCJ6IiwiTnVtYmVyIiwiaXNGaW5pdGUiLCJwaXhlbHNQZXJNZXRlciIsImRlZ3JlZXNQZXJQaXhlbCIsImRlbHRhTG5nIiwiZGVsdGFMYXQiLCJsZW5ndGgiLCJkZWx0YUxuZ0xhdFoiLCJkZWx0YVoiLCJwaXhlbHNQZXJEZWdyZWUiLCJtZXRlcnNQZXJQaXhlbCIsImRlbHRhWCIsImRlbHRhWSIsImxuZ0xhdFoiLCJsbmciLCJsYXQiLCJaIiwibWV0ZXJzVG9MbmdMYXREZWx0YSIsImJvdW5kcyIsIm9wdGlvbnMiLCJmaXRCb3VuZHMiLCJhc3NpZ24iLCJwYWRkaW5nIiwib2Zmc2V0Iiwid2VzdCIsInNvdXRoIiwiZWFzdCIsIm5vcnRoIiwidmlld3BvcnQiLCJudyIsInByb2plY3QiLCJzZSIsInNpemUiLCJhYnMiLCJzY2FsZVgiLCJzY2FsZVkiLCJjZW50ZXJMbmdMYXQiLCJsb2cyIiwibWlu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VCxDQUFpQixDQUFDSixJQUFELEVBQU9ELEtBQVAsQ0FBakIsQ0FBWDtBQUNBLE1BQU1PLE9BQU8sQ0FDWHpELEtBQUswRCxHQUFMLENBQVNGLEdBQUcsQ0FBSCxJQUFRRixHQUFHLENBQUgsQ0FBakIsQ0FEVyxFQUVYdEQsS0FBSzBELEdBQUwsQ0FBU0YsR0FBRyxDQUFILElBQVFGLEdBQUcsQ0FBSCxDQUFqQixDQUZXLENBQWI7QUFJQSxNQUFNbkQsU0FBUyxDQUNiLENBQUNxRCxHQUFHLENBQUgsSUFBUUYsR0FBRyxDQUFILENBQVQsSUFBa0IsQ0FETCxFQUViLENBQUNFLEdBQUcsQ0FBSCxJQUFRRixHQUFHLENBQUgsQ0FBVCxJQUFrQixDQUZMLENBQWY7O0FBS0EsTUFBTUssU0FBUyxDQUFDaEUsUUFBUW9ELFVBQVUsQ0FBbEIsR0FBc0IvQyxLQUFLMEQsR0FBTCxDQUFTVixPQUFPLENBQVAsQ0FBVCxJQUFzQixDQUE3QyxJQUFrRFMsS0FBSyxDQUFMLENBQWpFO0FBQ0EsTUFBTUcsU0FBUyxDQUFDaEUsU0FBU21ELFVBQVUsQ0FBbkIsR0FBdUIvQyxLQUFLMEQsR0FBTCxDQUFTVixPQUFPLENBQVAsQ0FBVCxJQUFzQixDQUE5QyxJQUFtRFMsS0FBSyxDQUFMLENBQWxFOztBQUVBLE1BQU1JLGVBQWVSLFNBQVNyQyxTQUFULENBQW1CYixNQUFuQixDQUFyQjtBQUNBLE1BQU1kLE9BQU9nRSxTQUFTaEUsSUFBVCxHQUFnQlcsS0FBSzhELElBQUwsQ0FBVTlELEtBQUswRCxHQUFMLENBQVMxRCxLQUFLK0QsR0FBTCxDQUFTSixNQUFULEVBQWlCQyxNQUFqQixDQUFULENBQVYsQ0FBN0I7O0FBRUEsU0FBTztBQUNMeEUsZUFBV3lFLGFBQWEsQ0FBYixDQUROO0FBRUwxRSxjQUFVMEUsYUFBYSxDQUFiLENBRkw7QUFHTHhFO0FBSEssR0FBUDtBQUtEIiwiZmlsZSI6InBlcnNwZWN0aXZlLW1lcmNhdG9yLXZpZXdwb3J0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVmlldyBhbmQgUHJvamVjdGlvbiBNYXRyaXggY2FsY3VsYXRpb25zIGZvciBtYXBib3gtanMgc3R5bGUgbWFwIHZpZXcgcHJvcGVydGllc1xuaW1wb3J0IE1lcmNhdG9yVmlld3BvcnQgZnJvbSAnLi9tZXJjYXRvci12aWV3cG9ydCc7XG5pbXBvcnQgYXNzZXJ0IGZyb20gJy4vYXNzZXJ0JztcblxuaW1wb3J0IHtcbiAgcHJvamVjdEZsYXQsXG4gIHVucHJvamVjdEZsYXQsXG4gIGdldE1lcmNhdG9yRGlzdGFuY2VTY2FsZXMsXG4gIG1ha2VQcm9qZWN0aW9uTWF0cml4RnJvbU1lcmNhdG9yUGFyYW1zLFxuICBtYWtlVmlld01hdHJpY2VzRnJvbU1lcmNhdG9yUGFyYW1zXG59IGZyb20gJy4vd2ViLW1lcmNhdG9yLXV0aWxzJztcblxuLyogZXNsaW50LWRpc2FibGUgY2FtZWxjYXNlICovXG5pbXBvcnQgdmVjMl9hZGQgZnJvbSAnZ2wtdmVjMi9hZGQnO1xuaW1wb3J0IHZlYzJfbmVnYXRlIGZyb20gJ2dsLXZlYzIvbmVnYXRlJztcblxuY29uc3QgREVGQVVMVF9NQVBfU1RBVEUgPSB7XG4gIGxhdGl0dWRlOiAzNyxcbiAgbG9uZ2l0dWRlOiAtMTIyLFxuICB6b29tOiAxMSxcbiAgcGl0Y2g6IDAsXG4gIGJlYXJpbmc6IDAsXG4gIGFsdGl0dWRlOiAxLjVcbn07XG5cbmNvbnN0IEVSUl9BUkdVTUVOVCA9ICdJbGxlZ2FsIGFyZ3VtZW50IHRvIFdlYk1lcmNhdG9yVmlld3BvcnQnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBXZWJNZXJjYXRvclZpZXdwb3J0IGV4dGVuZHMgTWVyY2F0b3JWaWV3cG9ydCB7XG4gIC8qKlxuICAgKiBAY2xhc3NkZXNjXG4gICAqIENyZWF0ZXMgdmlldy9wcm9qZWN0aW9uIG1hdHJpY2VzIGZyb20gbWVyY2F0b3IgcGFyYW1zXG4gICAqIE5vdGU6IFRoZSBWaWV3cG9ydCBpcyBpbW11dGFibGUgaW4gdGhlIHNlbnNlIHRoYXQgaXQgb25seSBoYXMgYWNjZXNzb3JzLlxuICAgKiBBIG5ldyB2aWV3cG9ydCBpbnN0YW5jZSBzaG91bGQgYmUgY3JlYXRlZCBpZiBhbnkgcGFyYW1ldGVycyBoYXZlIGNoYW5nZWQuXG4gICAqXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0IC0gb3B0aW9uc1xuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG1lcmNhdG9yPXRydWUgLSBXaGV0aGVyIHRvIHVzZSBtZXJjYXRvciBwcm9qZWN0aW9uXG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHQud2lkdGg9MSAtIFdpZHRoIG9mIFwidmlld3BvcnRcIiBvciB3aW5kb3dcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdC5oZWlnaHQ9MSAtIEhlaWdodCBvZiBcInZpZXdwb3J0XCIgb3Igd2luZG93XG4gICAqIEBwYXJhbSB7QXJyYXl9IG9wdC5jZW50ZXI9WzAsIDBdIC0gQ2VudGVyIG9mIHZpZXdwb3J0XG4gICAqICAgW2xvbmdpdHVkZSwgbGF0aXR1ZGVdIG9yIFt4LCB5XVxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0LnNjYWxlPTEgLSBFaXRoZXIgdXNlIHNjYWxlIG9yIHpvb21cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdC5waXRjaD0wIC0gQ2FtZXJhIGFuZ2xlIGluIGRlZ3JlZXMgKDAgaXMgc3RyYWlnaHQgZG93bilcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdC5iZWFyaW5nPTAgLSBNYXAgcm90YXRpb24gaW4gZGVncmVlcyAoMCBtZWFucyBub3J0aCBpcyB1cClcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdC5hbHRpdHVkZT0gLSBBbHRpdHVkZSBvZiBjYW1lcmEgaW4gc2NyZWVuIHVuaXRzXG4gICAqXG4gICAqIFdlYiBtZXJjYXRvciBwcm9qZWN0aW9uIHNob3J0LWhhbmQgcGFyYW1ldGVyc1xuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0LmxhdGl0dWRlIC0gQ2VudGVyIG9mIHZpZXdwb3J0IG9uIG1hcCAoYWx0ZXJuYXRpdmUgdG8gb3B0LmNlbnRlcilcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdC5sb25naXR1ZGUgLSBDZW50ZXIgb2Ygdmlld3BvcnQgb24gbWFwIChhbHRlcm5hdGl2ZSB0byBvcHQuY2VudGVyKVxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0Lnpvb20gLSBTY2FsZSA9IE1hdGgucG93KDIsem9vbSkgb24gbWFwIChhbHRlcm5hdGl2ZSB0byBvcHQuc2NhbGUpXG5cbiAgICogTm90ZXM6XG4gICAqICAtIE9ubHkgb25lIG9mIGNlbnRlciBvciBbbGF0aXR1ZGUsIGxvbmdpdHVkZV0gY2FuIGJlIHNwZWNpZmllZFxuICAgKiAgLSBbbGF0aXR1ZGUsIGxvbmdpdHVkZV0gY2FuIG9ubHkgYmUgc3BlY2lmaWVkIHdoZW4gXCJtZXJjYXRvclwiIGlzIHRydWVcbiAgICogIC0gQWx0aXR1ZGUgaGFzIGEgZGVmYXVsdCB2YWx1ZSB0aGF0IG1hdGNoZXMgYXNzdW1wdGlvbnMgaW4gbWFwYm94LWdsXG4gICAqICAtIHdpZHRoIGFuZCBoZWlnaHQgYXJlIGZvcmNlZCB0byAxIGlmIHN1cHBsaWVkIGFzIDAsIHRvIGF2b2lkXG4gICAqICAgIGRpdmlzaW9uIGJ5IHplcm8uIFRoaXMgaXMgaW50ZW5kZWQgdG8gcmVkdWNlIHRoZSBidXJkZW4gb2YgYXBwcyB0b1xuICAgKiAgICB0byBjaGVjayB2YWx1ZXMgYmVmb3JlIGluc3RhbnRpYXRpbmcgYSBWaWV3cG9ydC5cbiAgICovXG4gIC8qIGVzbGludC1kaXNhYmxlIGNvbXBsZXhpdHkgKi9cbiAgY29uc3RydWN0b3Ioe1xuICAgIC8vIE1hcCBzdGF0ZVxuICAgIHdpZHRoLFxuICAgIGhlaWdodCxcbiAgICBsYXRpdHVkZSxcbiAgICBsb25naXR1ZGUsXG4gICAgem9vbSxcbiAgICBwaXRjaCxcbiAgICBiZWFyaW5nLFxuICAgIGFsdGl0dWRlLFxuICAgIGZhclpNdWx0aXBsaWVyID0gMTBcbiAgfSA9IHt9KSB7XG4gICAgLy8gVmlld3BvcnQgLSBzdXBwb3J0IHVuZGVmaW5lZCBhcmd1bWVudHNcbiAgICB3aWR0aCA9IHdpZHRoICE9PSB1bmRlZmluZWQgPyB3aWR0aCA6IERFRkFVTFRfTUFQX1NUQVRFLndpZHRoO1xuICAgIGhlaWdodCA9IGhlaWdodCAhPT0gdW5kZWZpbmVkID8gaGVpZ2h0IDogREVGQVVMVF9NQVBfU1RBVEUuaGVpZ2h0O1xuICAgIHpvb20gPSB6b29tICE9PSB1bmRlZmluZWQgPyB6b29tIDogREVGQVVMVF9NQVBfU1RBVEUuem9vbTtcbiAgICBsYXRpdHVkZSA9IGxhdGl0dWRlICE9PSB1bmRlZmluZWQgPyBsYXRpdHVkZSA6IERFRkFVTFRfTUFQX1NUQVRFLmxhdGl0dWRlO1xuICAgIGxvbmdpdHVkZSA9IGxvbmdpdHVkZSAhPT0gdW5kZWZpbmVkID8gbG9uZ2l0dWRlIDogREVGQVVMVF9NQVBfU1RBVEUubG9uZ2l0dWRlO1xuICAgIGJlYXJpbmcgPSBiZWFyaW5nICE9PSB1bmRlZmluZWQgPyBiZWFyaW5nIDogREVGQVVMVF9NQVBfU1RBVEUuYmVhcmluZztcbiAgICBwaXRjaCA9IHBpdGNoICE9PSB1bmRlZmluZWQgPyBwaXRjaCA6IERFRkFVTFRfTUFQX1NUQVRFLnBpdGNoO1xuICAgIGFsdGl0dWRlID0gYWx0aXR1ZGUgIT09IHVuZGVmaW5lZCA/IGFsdGl0dWRlIDogREVGQVVMVF9NQVBfU1RBVEUuYWx0aXR1ZGU7XG5cbiAgICAvLyBTaWxlbnRseSBhbGxvdyBhcHBzIHRvIHNlbmQgaW4gMCwwIHRvIGZhY2lsaXRhdGUgaXNvbW9ycGhpYyByZW5kZXIgZXRjXG4gICAgd2lkdGggPSB3aWR0aCB8fCAxO1xuICAgIGhlaWdodCA9IGhlaWdodCB8fCAxO1xuXG4gICAgY29uc3Qgc2NhbGUgPSBNYXRoLnBvdygyLCB6b29tKTtcbiAgICAvLyBBbHRpdHVkZSAtIHByZXZlbnQgZGl2aXNpb24gYnkgMFxuICAgIC8vIFRPRE8gLSBqdXN0IHRocm93IGFuIEVycm9yIGluc3RlYWQ/XG4gICAgYWx0aXR1ZGUgPSBNYXRoLm1heCgwLjc1LCBhbHRpdHVkZSk7XG5cbiAgICBjb25zdCBjZW50ZXIgPSBwcm9qZWN0RmxhdChbbG9uZ2l0dWRlLCBsYXRpdHVkZV0sIHNjYWxlKTtcblxuICAgIGNvbnN0IGRpc3RhbmNlU2NhbGVzID0gZ2V0TWVyY2F0b3JEaXN0YW5jZVNjYWxlcyh7bGF0aXR1ZGUsIGxvbmdpdHVkZSwgc2NhbGV9KTtcblxuICAgIGNvbnN0IHByb2plY3Rpb25NYXRyaXggPSBtYWtlUHJvamVjdGlvbk1hdHJpeEZyb21NZXJjYXRvclBhcmFtcyh7XG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIHBpdGNoLFxuICAgICAgYmVhcmluZyxcbiAgICAgIGFsdGl0dWRlLFxuICAgICAgZmFyWk11bHRpcGxpZXJcbiAgICB9KTtcblxuICAgIGNvbnN0IHt2aWV3TWF0cml4Q2VudGVyZWR9ID0gbWFrZVZpZXdNYXRyaWNlc0Zyb21NZXJjYXRvclBhcmFtcyh7XG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIGxvbmdpdHVkZSxcbiAgICAgIGxhdGl0dWRlLFxuICAgICAgem9vbSxcbiAgICAgIHBpdGNoLFxuICAgICAgYmVhcmluZyxcbiAgICAgIGFsdGl0dWRlLFxuICAgICAgZGlzdGFuY2VTY2FsZXMsXG4gICAgICBjZW50ZXJcbiAgICB9KTtcblxuICAgIHN1cGVyKHt3aWR0aCwgaGVpZ2h0LCB2aWV3TWF0cml4OiB2aWV3TWF0cml4Q2VudGVyZWQsIHByb2plY3Rpb25NYXRyaXh9KTtcblxuICAgIC8vIFNhdmUgcGFyYW1ldGVyc1xuICAgIHRoaXMubGF0aXR1ZGUgPSBsYXRpdHVkZTtcbiAgICB0aGlzLmxvbmdpdHVkZSA9IGxvbmdpdHVkZTtcbiAgICB0aGlzLnpvb20gPSB6b29tO1xuICAgIHRoaXMucGl0Y2ggPSBwaXRjaDtcbiAgICB0aGlzLmJlYXJpbmcgPSBiZWFyaW5nO1xuICAgIHRoaXMuYWx0aXR1ZGUgPSBhbHRpdHVkZTtcblxuICAgIHRoaXMuc2NhbGUgPSBzY2FsZTtcbiAgICB0aGlzLmNlbnRlciA9IGNlbnRlcjtcblxuICAgIHRoaXMuX2Rpc3RhbmNlU2NhbGVzID0gZGlzdGFuY2VTY2FsZXM7XG5cbiAgICBPYmplY3QuZnJlZXplKHRoaXMpO1xuICB9XG4gIC8qIGVzbGludC1lbmFibGUgY29tcGxleGl0eSAqL1xuXG4gIC8qKlxuICAgKiBQcm9qZWN0IFtsbmcsbGF0XSBvbiBzcGhlcmUgb250byBbeCx5XSBvbiA1MTIqNTEyIE1lcmNhdG9yIFpvb20gMCB0aWxlLlxuICAgKiBQZXJmb3JtcyB0aGUgbm9ubGluZWFyIHBhcnQgb2YgdGhlIHdlYiBtZXJjYXRvciBwcm9qZWN0aW9uLlxuICAgKiBSZW1haW5pbmcgcHJvamVjdGlvbiBpcyBkb25lIHdpdGggNHg0IG1hdHJpY2VzIHdoaWNoIGFsc28gaGFuZGxlc1xuICAgKiBwZXJzcGVjdGl2ZS5cbiAgICpcbiAgICogQHBhcmFtIHtBcnJheX0gbG5nTGF0IC0gW2xuZywgbGF0XSBjb29yZGluYXRlc1xuICAgKiAgIFNwZWNpZmllcyBhIHBvaW50IG9uIHRoZSBzcGhlcmUgdG8gcHJvamVjdCBvbnRvIHRoZSBtYXAuXG4gICAqIEByZXR1cm4ge0FycmF5fSBbeCx5XSBjb29yZGluYXRlcy5cbiAgICovXG4gIF9wcm9qZWN0RmxhdChsbmdMYXQsIHNjYWxlID0gdGhpcy5zY2FsZSkge1xuICAgIHJldHVybiBwcm9qZWN0RmxhdChsbmdMYXQsIHNjYWxlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVbnByb2plY3Qgd29ybGQgcG9pbnQgW3gseV0gb24gbWFwIG9udG8ge2xhdCwgbG9ufSBvbiBzcGhlcmVcbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R8VmVjdG9yfSB4eSAtIG9iamVjdCB3aXRoIHt4LHl9IG1lbWJlcnNcbiAgICogIHJlcHJlc2VudGluZyBwb2ludCBvbiBwcm9qZWN0ZWQgbWFwIHBsYW5lXG4gICAqIEByZXR1cm4ge0dlb0Nvb3JkaW5hdGVzfSAtIG9iamVjdCB3aXRoIHtsYXQsbG9ufSBvZiBwb2ludCBvbiBzcGhlcmUuXG4gICAqICAgSGFzIHRvQXJyYXkgbWV0aG9kIGlmIHlvdSBuZWVkIGEgR2VvSlNPTiBBcnJheS5cbiAgICogICBQZXIgY2FydG9ncmFwaGljIHRyYWRpdGlvbiwgbGF0IGFuZCBsb24gYXJlIHNwZWNpZmllZCBhcyBkZWdyZWVzLlxuICAgKi9cbiAgX3VucHJvamVjdEZsYXQoeHksIHNjYWxlID0gdGhpcy5zY2FsZSkge1xuICAgIHJldHVybiB1bnByb2plY3RGbGF0KHh5LCBzY2FsZSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBtYXAgY2VudGVyIHRoYXQgcGxhY2UgYSBnaXZlbiBbbG5nLCBsYXRdIGNvb3JkaW5hdGUgYXQgc2NyZWVuXG4gICAqIHBvaW50IFt4LCB5XVxuICAgKlxuICAgKiBAcGFyYW0ge0FycmF5fSBsbmdMYXQgLSBbbG5nLGxhdF0gY29vcmRpbmF0ZXNcbiAgICogICBTcGVjaWZpZXMgYSBwb2ludCBvbiB0aGUgc3BoZXJlLlxuICAgKiBAcGFyYW0ge0FycmF5fSBwb3MgLSBbeCx5XSBjb29yZGluYXRlc1xuICAgKiAgIFNwZWNpZmllcyBhIHBvaW50IG9uIHRoZSBzY3JlZW4uXG4gICAqIEByZXR1cm4ge0FycmF5fSBbbG5nLGxhdF0gbmV3IG1hcCBjZW50ZXIuXG4gICAqL1xuICBnZXRMb2NhdGlvbkF0UG9pbnQoe2xuZ0xhdCwgcG9zfSkge1xuICAgIGNvbnN0IGZyb21Mb2NhdGlvbiA9IHRoaXMucHJvamVjdEZsYXQodGhpcy51bnByb2plY3QocG9zKSk7XG4gICAgY29uc3QgdG9Mb2NhdGlvbiA9IHRoaXMucHJvamVjdEZsYXQobG5nTGF0KTtcblxuICAgIGNvbnN0IGNlbnRlciA9IHRoaXMucHJvamVjdEZsYXQoW3RoaXMubG9uZ2l0dWRlLCB0aGlzLmxhdGl0dWRlXSk7XG5cbiAgICBjb25zdCB0cmFuc2xhdGUgPSB2ZWMyX2FkZChbXSwgdG9Mb2NhdGlvbiwgdmVjMl9uZWdhdGUoW10sIGZyb21Mb2NhdGlvbikpO1xuICAgIGNvbnN0IG5ld0NlbnRlciA9IHZlYzJfYWRkKFtdLCBjZW50ZXIsIHRyYW5zbGF0ZSk7XG4gICAgcmV0dXJuIHRoaXMudW5wcm9qZWN0RmxhdChuZXdDZW50ZXIpO1xuICB9XG5cbiAgLypcbiAgZ2V0TG5nTGF0QXRWaWV3cG9ydFBvc2l0aW9uKGxuZ2xhdCwgeHkpIHtcbiAgICBjb25zdCBjID0gdGhpcy5sb2NhdGlvbkNvb3JkaW5hdGUobG5nbGF0KTtcbiAgICBjb25zdCBjb29yZEF0UG9pbnQgPSB0aGlzLnBvaW50Q29vcmRpbmF0ZSh4eSk7XG4gICAgY29uc3QgY29vcmRDZW50ZXIgPSB0aGlzLnBvaW50Q29vcmRpbmF0ZSh0aGlzLmNlbnRlclBvaW50KTtcbiAgICBjb25zdCB0cmFuc2xhdGUgPSBjb29yZEF0UG9pbnQuX3N1YihjKTtcbiAgICB0aGlzLmNlbnRlciA9IHRoaXMuY29vcmRpbmF0ZUxvY2F0aW9uKGNvb3JkQ2VudGVyLl9zdWIodHJhbnNsYXRlKSk7XG4gIH1cbiAgKi9cblxuICBnZXREaXN0YW5jZVNjYWxlcygpIHtcbiAgICByZXR1cm4gdGhpcy5fZGlzdGFuY2VTY2FsZXM7XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydHMgYSBtZXRlciBvZmZzZXQgdG8gYSBsbmdsYXQgb2Zmc2V0XG4gICAqXG4gICAqIE5vdGU6IFVzZXMgc2ltcGxlIGxpbmVhciBhcHByb3hpbWF0aW9uIGFyb3VuZCB0aGUgdmlld3BvcnQgY2VudGVyXG4gICAqIEVycm9yIGluY3JlYXNlcyB3aXRoIHNpemUgb2Ygb2Zmc2V0IChyb3VnaGx5IDElIHBlciAxMDBrbSlcbiAgICpcbiAgICogQHBhcmFtIHtbTnVtYmVyLE51bWJlcl18W051bWJlcixOdW1iZXIsTnVtYmVyXSkgeHl6IC0gYXJyYXkgb2YgbWV0ZXIgZGVsdGFzXG4gICAqIEByZXR1cm4ge1tOdW1iZXIsTnVtYmVyXXxbTnVtYmVyLE51bWJlcixOdW1iZXJdKSAtIGFycmF5IG9mIFtsbmcsbGF0LHpdIGRlbHRhc1xuICAgKi9cbiAgbWV0ZXJzVG9MbmdMYXREZWx0YSh4eXopIHtcbiAgICBjb25zdCBbeCwgeSwgeiA9IDBdID0geHl6O1xuICAgIGFzc2VydChOdW1iZXIuaXNGaW5pdGUoeCkgJiYgTnVtYmVyLmlzRmluaXRlKHkpICYmIE51bWJlci5pc0Zpbml0ZSh6KSwgRVJSX0FSR1VNRU5UKTtcbiAgICBjb25zdCB7cGl4ZWxzUGVyTWV0ZXIsIGRlZ3JlZXNQZXJQaXhlbH0gPSB0aGlzLl9kaXN0YW5jZVNjYWxlcztcbiAgICBjb25zdCBkZWx0YUxuZyA9IHggKiBwaXhlbHNQZXJNZXRlclswXSAqIGRlZ3JlZXNQZXJQaXhlbFswXTtcbiAgICBjb25zdCBkZWx0YUxhdCA9IHkgKiBwaXhlbHNQZXJNZXRlclsxXSAqIGRlZ3JlZXNQZXJQaXhlbFsxXTtcbiAgICByZXR1cm4geHl6Lmxlbmd0aCA9PT0gMiA/IFtkZWx0YUxuZywgZGVsdGFMYXRdIDogW2RlbHRhTG5nLCBkZWx0YUxhdCwgel07XG4gIH1cblxuICAvKipcbiAgICogQ29udmVydHMgYSBsbmdsYXQgb2Zmc2V0IHRvIGEgbWV0ZXIgb2Zmc2V0XG4gICAqXG4gICAqIE5vdGU6IFVzZXMgc2ltcGxlIGxpbmVhciBhcHByb3hpbWF0aW9uIGFyb3VuZCB0aGUgdmlld3BvcnQgY2VudGVyXG4gICAqIEVycm9yIGluY3JlYXNlcyB3aXRoIHNpemUgb2Ygb2Zmc2V0IChyb3VnaGx5IDElIHBlciAxMDBrbSlcbiAgICpcbiAgICogQHBhcmFtIHtbTnVtYmVyLE51bWJlcl18W051bWJlcixOdW1iZXIsTnVtYmVyXSkgZGVsdGFMbmdMYXRaIC0gYXJyYXkgb2YgW2xuZyxsYXQsel0gZGVsdGFzXG4gICAqIEByZXR1cm4ge1tOdW1iZXIsTnVtYmVyXXxbTnVtYmVyLE51bWJlcixOdW1iZXJdKSAtIGFycmF5IG9mIG1ldGVyIGRlbHRhc1xuICAgKi9cbiAgbG5nTGF0RGVsdGFUb01ldGVycyhkZWx0YUxuZ0xhdFopIHtcbiAgICBjb25zdCBbZGVsdGFMbmcsIGRlbHRhTGF0LCBkZWx0YVogPSAwXSA9IGRlbHRhTG5nTGF0WjtcbiAgICBhc3NlcnQoTnVtYmVyLmlzRmluaXRlKGRlbHRhTG5nKSAmJiBOdW1iZXIuaXNGaW5pdGUoZGVsdGFMYXQpICYmIE51bWJlci5pc0Zpbml0ZShkZWx0YVopLFxuICAgICAgRVJSX0FSR1VNRU5UKTtcbiAgICBjb25zdCB7cGl4ZWxzUGVyRGVncmVlLCBtZXRlcnNQZXJQaXhlbH0gPSB0aGlzLl9kaXN0YW5jZVNjYWxlcztcbiAgICBjb25zdCBkZWx0YVggPSBkZWx0YUxuZyAqIHBpeGVsc1BlckRlZ3JlZVswXSAqIG1ldGVyc1BlclBpeGVsWzBdO1xuICAgIGNvbnN0IGRlbHRhWSA9IGRlbHRhTGF0ICogcGl4ZWxzUGVyRGVncmVlWzFdICogbWV0ZXJzUGVyUGl4ZWxbMV07XG4gICAgcmV0dXJuIGRlbHRhTG5nTGF0Wi5sZW5ndGggPT09IDIgPyBbZGVsdGFYLCBkZWx0YVldIDogW2RlbHRhWCwgZGVsdGFZLCBkZWx0YVpdO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIG1ldGVyIGRlbHRhIHRvIGEgYmFzZSBsbmdsYXQgY29vcmRpbmF0ZSwgcmV0dXJuaW5nIGEgbmV3IGxuZ2xhdCBhcnJheVxuICAgKlxuICAgKiBOb3RlOiBVc2VzIHNpbXBsZSBsaW5lYXIgYXBwcm94aW1hdGlvbiBhcm91bmQgdGhlIHZpZXdwb3J0IGNlbnRlclxuICAgKiBFcnJvciBpbmNyZWFzZXMgd2l0aCBzaXplIG9mIG9mZnNldCAocm91Z2hseSAxJSBwZXIgMTAwa20pXG4gICAqXG4gICAqIEBwYXJhbSB7W051bWJlcixOdW1iZXJdfFtOdW1iZXIsTnVtYmVyLE51bWJlcl0pIGxuZ0xhdFogLSBiYXNlIGNvb3JkaW5hdGVcbiAgICogQHBhcmFtIHtbTnVtYmVyLE51bWJlcl18W051bWJlcixOdW1iZXIsTnVtYmVyXSkgeHl6IC0gYXJyYXkgb2YgbWV0ZXIgZGVsdGFzXG4gICAqIEByZXR1cm4ge1tOdW1iZXIsTnVtYmVyXXxbTnVtYmVyLE51bWJlcixOdW1iZXJdKSBhcnJheSBvZiBbbG5nLGxhdCx6XSBkZWx0YXNcbiAgICovXG4gIGFkZE1ldGVyc1RvTG5nTGF0KGxuZ0xhdFosIHh5eikge1xuICAgIGNvbnN0IFtsbmcsIGxhdCwgWiA9IDBdID0gbG5nTGF0WjtcbiAgICBjb25zdCBbZGVsdGFMbmcsIGRlbHRhTGF0LCBkZWx0YVogPSAwXSA9IHRoaXMubWV0ZXJzVG9MbmdMYXREZWx0YSh4eXopO1xuICAgIHJldHVybiBsbmdMYXRaLmxlbmd0aCA9PT0gMiA/XG4gICAgICBbbG5nICsgZGVsdGFMbmcsIGxhdCArIGRlbHRhTGF0XSA6XG4gICAgICBbbG5nICsgZGVsdGFMbmcsIGxhdCArIGRlbHRhTGF0LCBaICsgZGVsdGFaXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgbmV3IHZpZXdwb3J0IHRoYXQgZml0IGFyb3VuZCB0aGUgZ2l2ZW4gcmVjdGFuZ2xlLlxuICAgKiBPbmx5IHN1cHBvcnRzIG5vbi1wZXJzcGVjdGl2ZSBtb2RlLlxuICAgKiBAcGFyYW0ge0FycmF5fSBib3VuZHMgLSBbW2xvbiwgbGF0XSwgW2xvbiwgbGF0XV1cbiAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnBhZGRpbmddIC0gVGhlIGFtb3VudCBvZiBwYWRkaW5nIGluIHBpeGVscyB0byBhZGQgdG8gdGhlIGdpdmVuIGJvdW5kcy5cbiAgICogQHBhcmFtIHtBcnJheX0gW29wdGlvbnMub2Zmc2V0XSAtIFRoZSBjZW50ZXIgb2YgdGhlIGdpdmVuIGJvdW5kcyByZWxhdGl2ZSB0byB0aGUgbWFwJ3MgY2VudGVyLFxuICAgKiAgICBbeCwgeV0gbWVhc3VyZWQgaW4gcGl4ZWxzLlxuICAgKiBAcmV0dXJucyB7V2ViTWVyY2F0b3JWaWV3cG9ydH1cbiAgICovXG4gIGZpdEJvdW5kcyhib3VuZHMsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHt3aWR0aCwgaGVpZ2h0fSA9IHRoaXM7XG4gICAgY29uc3Qge2xvbmdpdHVkZSwgbGF0aXR1ZGUsIHpvb219ID0gZml0Qm91bmRzKE9iamVjdC5hc3NpZ24oe3dpZHRoLCBoZWlnaHQsIGJvdW5kc30sIG9wdGlvbnMpKTtcbiAgICByZXR1cm4gbmV3IFdlYk1lcmNhdG9yVmlld3BvcnQoe3dpZHRoLCBoZWlnaHQsIGxvbmdpdHVkZSwgbGF0aXR1ZGUsIHpvb219KTtcbiAgfVxuXG4gIC8vIElOVEVSTkFMIE1FVEhPRFNcblxuICBfZ2V0UGFyYW1zKCkge1xuICAgIHJldHVybiB0aGlzLl9kaXN0YW5jZVNjYWxlcztcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgbWFwIHNldHRpbmdzIHtsYXRpdHVkZSwgbG9uZ2l0dWRlLCB6b29tfVxuICogdGhhdCB3aWxsIGNvbnRhaW4gdGhlIHByb3ZpZGVkIGNvcm5lcnMgd2l0aGluIHRoZSBwcm92aWRlZCB3aWR0aC5cbiAqIE9ubHkgc3VwcG9ydHMgbm9uLXBlcnNwZWN0aXZlIG1vZGUuXG4gKiBAcGFyYW0ge051bWJlcn0gd2lkdGggLSB2aWV3cG9ydCB3aWR0aFxuICogQHBhcmFtIHtOdW1iZXJ9IGhlaWdodCAtIHZpZXdwb3J0IGhlaWdodFxuICogQHBhcmFtIHtBcnJheX0gYm91bmRzIC0gW1tsb24sIGxhdF0sIFtsb24sIGxhdF1dXG4gKiBAcGFyYW0ge051bWJlcn0gW3BhZGRpbmddIC0gVGhlIGFtb3VudCBvZiBwYWRkaW5nIGluIHBpeGVscyB0byBhZGQgdG8gdGhlIGdpdmVuIGJvdW5kcy5cbiAqIEBwYXJhbSB7QXJyYXl9IFtvZmZzZXRdIC0gVGhlIGNlbnRlciBvZiB0aGUgZ2l2ZW4gYm91bmRzIHJlbGF0aXZlIHRvIHRoZSBtYXAncyBjZW50ZXIsXG4gKiAgICBbeCwgeV0gbWVhc3VyZWQgaW4gcGl4ZWxzLlxuICogQHJldHVybnMge09iamVjdH0gLSBsYXRpdHVkZSwgbG9uZ2l0dWRlIGFuZCB6b29tXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaXRCb3VuZHMoe1xuICB3aWR0aCxcbiAgaGVpZ2h0LFxuICBib3VuZHMsXG4gIC8vIG9wdGlvbnNcbiAgcGFkZGluZyA9IDAsXG4gIG9mZnNldCA9IFswLCAwXVxufSkge1xuICBjb25zdCBbW3dlc3QsIHNvdXRoXSwgW2Vhc3QsIG5vcnRoXV0gPSBib3VuZHM7XG5cbiAgY29uc3Qgdmlld3BvcnQgPSBuZXcgV2ViTWVyY2F0b3JWaWV3cG9ydCh7XG4gICAgd2lkdGgsXG4gICAgaGVpZ2h0LFxuICAgIGxvbmdpdHVkZTogMCxcbiAgICBsYXRpdHVkZTogMCxcbiAgICB6b29tOiAwXG4gIH0pO1xuXG4gIGNvbnN0IG53ID0gdmlld3BvcnQucHJvamVjdChbd2VzdCwgbm9ydGhdKTtcbiAgY29uc3Qgc2UgPSB2aWV3cG9ydC5wcm9qZWN0KFtlYXN0LCBzb3V0aF0pO1xuICBjb25zdCBzaXplID0gW1xuICAgIE1hdGguYWJzKHNlWzBdIC0gbndbMF0pLFxuICAgIE1hdGguYWJzKHNlWzFdIC0gbndbMV0pXG4gIF07XG4gIGNvbnN0IGNlbnRlciA9IFtcbiAgICAoc2VbMF0gKyBud1swXSkgLyAyLFxuICAgIChzZVsxXSArIG53WzFdKSAvIDJcbiAgXTtcblxuICBjb25zdCBzY2FsZVggPSAod2lkdGggLSBwYWRkaW5nICogMiAtIE1hdGguYWJzKG9mZnNldFswXSkgKiAyKSAvIHNpemVbMF07XG4gIGNvbnN0IHNjYWxlWSA9IChoZWlnaHQgLSBwYWRkaW5nICogMiAtIE1hdGguYWJzKG9mZnNldFsxXSkgKiAyKSAvIHNpemVbMV07XG5cbiAgY29uc3QgY2VudGVyTG5nTGF0ID0gdmlld3BvcnQudW5wcm9qZWN0KGNlbnRlcik7XG4gIGNvbnN0IHpvb20gPSB2aWV3cG9ydC56b29tICsgTWF0aC5sb2cyKE1hdGguYWJzKE1hdGgubWluKHNjYWxlWCwgc2NhbGVZKSkpO1xuXG4gIHJldHVybiB7XG4gICAgbG9uZ2l0dWRlOiBjZW50ZXJMbmdMYXRbMF0sXG4gICAgbGF0aXR1ZGU6IGNlbnRlckxuZ0xhdFsxXSxcbiAgICB6b29tXG4gIH07XG59XG4iXX0=