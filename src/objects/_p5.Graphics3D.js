define(function (require) {

  var p5 = require('core');
  var shaders = require('shaders');
  require('p5.Graphics');
  var gl,
    shaderProgram;
  var vertexPositionAttribute;
  var vertexColorAttribute;
  // var mat4 = require('mat4');
  // var mvMatrix;
  // var pMatrix;

  //@TODO should probably implement an override for these attributes
  var attributes = {
    alpha: false,
    depth: true,
    stencil: true,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false
  };
  /**
   * 3D graphics class.  Can also be used as an off-screen graphics buffer.
   * A p5.Graphics3D object can be constructed
   *
   */
  p5.Graphics3D = function (elt, pInst, isMainCanvas) {
    p5.Graphics.call(this, elt, pInst, isMainCanvas);

    try {
      this.drawingContext = this.canvas.getContext('webgl', attributes) ||
        this.canvas.getContext('experimental-webgl', attributes);
      if (this.drawingContext === null) {
        throw 'Error creating webgl context';
      } else {
        console.log('p5.Graphics3d: enabled webgl context');
      }
    } catch (er) {
      console.error(er);
    }

    this._pInst._setProperty('_graphics', this);
    this.isP3D = true; //lets us know we're in 3d mode
    gl = this.drawingContext;
    gl.clearColor(1.0, 1.0, 1.0, 1.0); //background is initialized white
    gl.clearDepth(1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, this.width, this.height);
    this.initShaders(); //initialize our default shaders
    return this;
  };

  p5.Graphics3D.prototype = Object.create(p5.Graphics.prototype);

  /**
   * [initShaders description]
   * @return {[type]} [description]
   */
  //TODO: how could we switch shader??
  p5.Graphics3D.prototype.initShaders = function () {
    var _vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(_vertShader, shaders.defaultColorVertShader);
    // gl.shaderSource(_vertShader, shaders.testVertShader);
    //gl.shaderSource(_vertShader, shaders.defaultVertShader);
    gl.compileShader(_vertShader);
    // if our vertex shader failed compilation?
    if (!gl.getShaderParameter(_vertShader, gl.COMPILE_STATUS)) {
      alert('Yikes! An error occurred compiling the shaders:' +
        gl.getShaderInfoLog(_vertShader));
      return null;
    }

    var _fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(_fragShader, shaders.defaultFragShader);
    //gl.shaderSource(_fragShader, shaders.materialFragShader);
    gl.compileShader(_fragShader);
    // if our frag shader failed compilation?
    if (!gl.getShaderParameter(_fragShader, gl.COMPILE_STATUS)) {
      alert('Darn! An error occurred compiling the shaders:' +
        gl.getShaderInfoLog(_fragShader));
      return null;
    }

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, _vertShader);
    gl.attachShader(shaderProgram, _fragShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert('Snap! Error linking shader program');
    }
    gl.useProgram(shaderProgram);

    var vertexResolution =
      gl.getUniformLocation(shaderProgram, 'u_resolution');
    // @TODO replace 4th argument with far plane once we implement
    // a view frustrum
    gl.uniform3f(vertexResolution, 300, 300, 1000.0);

    // shaderProgram.uMaterialColorLoc = gl.getUniformLocation(shaderProgram,
    //   'u_MaterialColor');

    // // Set material uniform
    // gl.uniform4f(shaderProgram.uMaterialColorLoc, 1.0, 1.0, 1.0, 1.0);

    vertexPositionAttribute =
      gl.getAttribLocation(shaderProgram, 'a_VertexPosition');
    gl.enableVertexAttribArray(vertexPositionAttribute);

    vertexColorAttribute =
      gl.getAttribLocation(shaderProgram, 'a_VertexColor');
    gl.enableVertexAttribArray(vertexColorAttribute);

  };

  //////////////////////////////////////////////
  // COLOR | Setting
  //////////////////////////////////////////////

  p5.Graphics3D.prototype.background = function () {
    var _col = this._pInst.color.apply(this._pInst, arguments);
    // gl.clearColor(0.0,0.0,0.0,1.0);
    var _r = (_col.color_array[0]) / 255;
    var _g = (_col.color_array[1]) / 255;
    var _b = (_col.color_array[2]) / 255;
    var _a = (_col.color_array[3]) / 255;
    gl.clearColor(_r, _g, _b, _a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  };

  // p5.Graphics3D.prototype.clear = function() {
  //@TODO
  // };

  // p5.Graphics3D.prototype.fill = function() {
  //@TODO
  // };

  p5.Graphics3D.prototype.stroke = function () {
    this._stroke = this._pInst.color.apply(this._pInst, arguments);
  };

  /**
   * Draws a line between two 3D points
   * @param  {Number} x1 starting point x
   * @param  {Number} y1 starting point y
   * @param  {Number} z1 starting point z
   * @param  {Number} x2 end point x
   * @param  {Number} y2 end point y
   * @param  {number} z2 end point z
   * @return {[type]}    [description]
   */
  p5.Graphics3D.prototype.line = function (x1, y1, z1, x2, y2, z2) {
    if (!this._pInst._doStroke) {
      return;
    }
    var lineVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineVertexBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, z1, x2, y2, z2]),
      gl.STATIC_DRAW);
    // gl.enableVertexAttribArray(vertexPositionAttribute);
    gl.vertexAttribPointer(vertexPositionAttribute,
      3, gl.FLOAT, false, 0, 0);

    var lineVertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineVertexColorBuffer);

    // wowza, this really needs to be cleaned up
    // with vector/matrix math
    var colors = [
      this._stroke[0] / 255, // first vertex color
      this._stroke[1] / 255,
      this._stroke[2] / 255,
      this._stroke[3] / 255,
      this._stroke[0] / 255, // second vertex color
      this._stroke[1] / 255,
      this._stroke[2] / 255,
      this._stroke[3] / 255
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    gl.vertexAttribPointer(vertexColorAttribute,
      4, gl.FLOAT, false, 0, 0);

    //_setMVPMatrices();//matrices for our shader uniforms
    gl.drawArrays(gl.LINES, 0, 2);

    return this;
  };

  /**
   * [triangle description]
   * @param  {[type]} x1 [description]
   * @param  {[type]} y1 [description]
   * @param  {[type]} z1 [description]
   * @param  {[type]} x2 [description]
   * @param  {[type]} y2 [description]
   * @param  {[type]} z2 [description]
   * @param  {[type]} x3 [description]
   * @param  {[type]} y3 [description]
   * @param  {[type]} z3 [description]
   * @return {[type]}    [description]
   */
  p5.Graphics3D.prototype.triangle = function (
    x1, y1, z1, x2, y2, z2, x3, y3, z3) {
    if (!this._pInst._doStroke) {
      return;
    }

    var triangleVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);

    var vertices = [
      x1, y1, z1,
      x2, y2, z2,
      x3, y3, z3
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    gl.vertexAttribPointer(
      shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // //colors
    var triangleVertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexColorBuffer);

    var colors = [
      1.0, 0.0, 0.0, 1.0,
      0.0, 1.0, 0.0, 1.0,
      0.0, 0.0, 1.0, 1.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    gl.vertexAttribPointer(vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    return this;
  };

  p5.Graphics3D.prototype.quad = function (
    x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4) {
    if (!this._pInst._doStroke) {
      return;
    }

    var squareVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);

    var vertices = [
      x1, y1, z1,
      x2, y2, z2,
      x3, y3, z3,
      x4, y4, z4
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    gl.vertexAttribPointer(
      shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    var quadVertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexColorBuffer);

    var colors = [];
    for (var i = 0; i < 4; i++) {
      colors = colors.concat([0.5, 0.5, 1.0, 1.0]);
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    gl.vertexAttribPointer(vertexColorAttribute,
      4, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    return this;
  };

  p5.Graphics3D.prototype.scale = function () {
    //@TODO
    // return this;
  };

  p5.Graphics3D.prototype.push = function () {
    //@TODO
  };

  p5.Graphics3D.prototype.pop = function () {
    //@TODO
  };

  /**
   * PRIVATE
   */
  // matrix methods adapted from:
  // https://developer.mozilla.org/en-US/docs/Web/WebGL/
  // gluPerspective
  //
  // function _makePerspective(fovy, aspect, znear, zfar){
  //    var ymax = znear * Math.tan(fovy * Math.PI / 360.0);
  //    var ymin = -ymax;
  //    var xmin = ymin * aspect;
  //    var xmax = ymax * aspect;
  //    return _makeFrustum(xmin, xmax, ymin, ymax, znear, zfar);
  //  }

  ////
  //// glFrustum
  ////
  //function _makeFrustum(left, right, bottom, top, znear, zfar){
  //  var X = 2*znear/(right-left);
  //  var Y = 2*znear/(top-bottom);
  //  var A = (right+left)/(right-left);
  //  var B = (top+bottom)/(top-bottom);
  //  var C = -(zfar+znear)/(zfar-znear);
  //  var D = -2*zfar*znear/(zfar-znear);
  //  var frustrumMatrix =[
  //  X, 0, A, 0,
  //  0, Y, B, 0,
  //  0, 0, C, D,
  //  0, 0, -1, 0
  //];
  //return frustrumMatrix;
  // }

  // function _setMVPMatrices(){
  ////an identity matrix
  ////@TODO use the p5.Matrix class to abstract away our MV matrices and
  ///other math
  //var _mvMatrix =
  //[
  //  1.0,0.0,0.0,0.0,
  //  0.0,1.0,0.0,0.0,
  //  0.0,0.0,1.0,0.0,
  //  0.0,0.0,0.0,1.0
  //];

  //// create a perspective matrix with
  //// fovy, aspect, znear, zfar
  //var _pMatrix = _makePerspective(45,
  //  gl.drawingBufferWidth/gl.drawingBufferHeight,
  //  0.1, 1000.0);

  //var _pMatrixUniform =
  //  gl.getUniformLocation(shaderProgram, 'uPMatrix');

  //var _mvMatrixUniform =
  //  gl.getUniformLocation(shaderProgram, 'uMVMatrix');

  //gl.uniformMatrix4fv(_mvMatrixUniform,
  //  false, new Float32Array(_mvMatrix));
  //gl.uniformMatrix4fv(_pMatrixUniform,
  //  false, new Float32Array(_pMatrix));
  // }

  return p5.Graphics3D;
});