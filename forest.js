/*
                 -- Caminando por un bosque de pinos --

Asignatura: Gráficos y Visualización en 3D
Autor: Álvaro Moles Vinader
*/

var models = []; // Array de árboles
var modelMatrix = new Matrix4(); // Model matrix
var viewMatrix = new Matrix4();  // View matrix
var projMatrix = new Matrix4();  // Projection matrix
var mvpMatrix = new Matrix4();   // Model view projection matrix (multiplica las 3)
var canvas = document.getElementById('webgl');
var gl = getWebGLContext(canvas);

// Coordenadas de posición de la cámara (m)
var camPosX = 0;
var camPosY = 0;
var camPosZ = 1.80; // Distancia al suelo (m)
// Ángulo inicial (rad)
var camAngle = 0.0;

// Tamaño del parque (m)
var parkSizeX = 100;
var parkSizeY = 100;

//////////////////////////////////// Shaders ///////////////////////////////////

// Shader de vértices
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Shader de fragmentos
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

//////////////////////////// Constuctor de árbol ///////////////////////////////
function Tree (posX, posY, posZ, rotX, rotY, rotZ, scalX, scalY, scalZ) {
  this.posX = posX;
  this.posY = posY;
  this.posZ = posZ;

  this.rotX = rotX;
  this.rotY = rotY;
  this.rotZ = rotZ;

  this.scalX = scalX;
  this.scalY = scalY;
  this.scalZ = scalZ;
}

//////////////////////////// Función crear bosque //////////////////////////////
function makeForest() {

  // Distancia entre árboles (m)
  var treeInterval = 10;
  // Número de árboles
  var numTreesX = (parkSizeX / treeInterval) - 1; // por columna (eje x)    (el '-1' es porque
  var numTreesY = (parkSizeY / treeInterval) - 1; // por fila (eje y)       justo en el límite del
  var numTrees = numTreesY * numTreesX; // número total de árboles          parque no hay árboles)
  // Tamaño de árboles (m)
  var treeWidthMin = 2, treeWidthMax = 4; // ancho
  var treeHeightMin = 3, treeHeightMax = 8; // alto
  // Posición del primer árbol
  var treePosX = - (parkSizeX / 2 ) + treeInterval;
  var treePosY = - (parkSizeY / 2 ) + treeInterval;
  var treePosZ;

  // Crear árboles
  for (var i = 0; i < numTreesY; i++) {

    for (var j = 0; j < numTreesX; j++) { // Crear línea de árboles en eje 'x'

      // Crear ángulo de rotación del árbol aleatorio
      treeAngle = Math.round( (Math.random() * 360));
      // Crear anchura y altura del árbol aleatorias
      treeWidth = Math.round( (Math.random() * (treeWidthMax - treeWidthMin) ) + treeWidthMin);
      treeHeight = Math.round( (Math.random() * (treeHeightMax - treeHeightMin) ) + treeHeightMin);
      treePosZ = treeHeight / 2; // Elevar base del árbol hasta el suelo

      // Crear nuevo objeto tipo árbol
      models.push(new Tree(treePosX, treePosY, treePosZ,
                           treeAngle, 0, 0,
                           treeWidth, treeWidth, treeHeight));

      treePosX += treeInterval; // Incrementar distancia en eje 'x'
    }

    treePosX = -(parkSizeX / 2 ) + treeInterval; // Resetear distancia en eje 'x'
    treePosY += treeInterval; // Incrementar distancia en eje 'y'
  }
}

//////////////////////////// Función dibujar escena ////////////////////////////
function drawScene() {

  // Establecer color del canvas
  gl.clearColor(0.3, 0.7, 1, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Orientación de la cámara en eje horizontal (hacia dónde miramos)
  var camViewVector = [Math.cos(camAngle), Math.sin(camAngle)]
  var camViewX = camViewVector[0] + camPosX;
  var camViewY = camViewVector[1] + camPosY;
  var camViewZ = 1.80; // Altura del punto de vista de la cámara respecto del suelo
  // Orientación de la cámara en eje vertical
  var camUpX = 0;
  var camUpY = 0;
  var camUpZ = 1; // Eje Z fijo

  //-------------------- Definir matriz de vista (V) ---------------------------
  viewMatrix.setLookAt(camPosX,  camPosY,  camPosZ,
                       camViewX, camViewY, camViewZ,
                       camUpX,   camUpY,   camUpZ);
  // ---------------------------------------------------------------------------

  // Dibujar suelo
  drawGround();

  // Dibujar árboles
  drawTrees();

  // Dibujar escena
  requestAnimationFrame(drawScene);

}

//////////////////////////// Función dibujar suelo /////////////////////////////
function drawGround() {

  // Set the vertex coordinates and color (the blue triangle is in the front)
  var n = initVertexBufferGround(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Get the storage location of u_MvpMatrix
  var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  if (!u_MvpMatrix) {
    console.log('Failed to get the storage location of u_MvpMatrix');
    return;
  }

  //-------------------- Definir matriz de modelo (M) ------------------------
  modelMatrix.setTranslate(0, 0, 0).rotate(0,0,0).scale(parkSizeX, parkSizeY, 0);
  // -------------------------------------------------------------------------

  // Calculate the model view projection matrix
  mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
  // Pass the model view projection matrix to u_MvpMatrix
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  // Dibujar suelo
  gl.drawArrays(gl.TRIANGLES, 0, n);

}

//////////////////////////// Función dibujar árboles ///////////////////////////
function drawTrees() {

  // Set the vertex coordinates and color (the blue triangle is in the front)
  var n = initVertexBufferTrees(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Get the storage location of u_MvpMatrix
  var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  if (!u_MvpMatrix) {
    console.log('Failed to get the storage location of u_MvpMatrix');
    return;
  }

  // Dibujar modelos del array
  for (var i in models) {
    //-------------------- Definir matriz de modelo (M) ------------------------
    modelMatrix.setTranslate(models[i].posX, models[i].posY, models[i].posZ).rotate(models[i].rotX,models[i].rotY,models[i].rotZ).scale(models[i].scalX, models[i].scalY, models[i].scalZ);
    // -------------------------------------------------------------------------

    // Calculate the model view projection matrix
    mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
    // Pass the model view projection matrix to u_MvpMatrix
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

    // Dibujar árbol
    gl.drawArrays(gl.TRIANGLES, 0, n);
  }

}

//////////////// Función inicializar buffer de vértices de suelo ///////////////
function initVertexBufferGround() {

  // Asignar vértices del suelo: 2 triángulos formando un cuadrado en plano 'xy'
  var vertexColors = new Float32Array([
  //  x     y     z        r     g     b
     0.5,  0.5,  0.0,     0.6,  0.2,  0.0,
     0.5, -0.5,  0.0,     0.3,  0.1,  0.0,  // Triángulo 1
    -0.5, -0.5,  0.0,     0.2,  0.0,  0.0,

     0.5,  0.5,  0.0,     0.6,  0.2,  0.0,
    -0.5,  0.5,  0.0,     0.3,  0.1,  0.0,  // Triángulo 2
    -0.5, -0.5,  0.0,     0.2,  0.0,  0.0,
  ]);
  var n = 6;

  // Create a buffer object
  var vertexColorBuffer = gl.createBuffer();
  if (!vertexColorBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Write the vertex information and enable it
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexColors, gl.STATIC_DRAW);

  var FSIZE = vertexColors.BYTES_PER_ELEMENT;

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 6, 0);
  gl.enableVertexAttribArray(a_Position);

  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
  gl.enableVertexAttribArray(a_Color);

  return n;
}

//////////////// Función inicializar buffer de vértices de árboles /////////////
function initVertexBufferTrees() {

  // Asignar vértices del árbol (2 triángulos en posiciones ortogonales)
  var vertexColors = new Float32Array([
  // x     y     z        r     g     b
    0.0,  0.0,  0.5,     0.0,  0.9,  0.0,
    0.0,  0.5, -0.5,     0.0,  0.2,  0.0,  // Triángulo 1 en plano 'yz'
    0.0, -0.5, -0.5,     0.0,  0.3,  0.0,

    0.0,  0.0,  0.5,     0.0,  0.9,  0.0,
    0.0,  0.0, -0.5,     0.0,  0.2,  0.0,  // Semitriángulo 2a en plano 'xz'
    0.5,  0.0, -0.5,     0.0,  0.3,  0.0,

    0.0,  0.0,  0.5,     0.0,  0.9,  0.0,
    0.0,  0.0, -0.5,     0.0,  0.2,  0.0,  // Semitriángulo 2b en plano 'xz'
   -0.5,  0.0, -0.5,     0.0,  0.3,  0.0,
  ]);
  var n = 9;

  // Create a buffer object
  var vertexColorBuffer = gl.createBuffer();
  if (!vertexColorBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Write the vertex information and enable it
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexColors, gl.STATIC_DRAW);

  var FSIZE = vertexColors.BYTES_PER_ELEMENT;

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 6, 0);
  gl.enableVertexAttribArray(a_Position);

  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
  gl.enableVertexAttribArray(a_Color);

  return n;
}

////////////////// Función analizar eventos de teclado /////////////////////////
function keyHandler(ev) {
  var camViewVector = [Math.cos(camAngle), Math.sin(camAngle)]
  var camViewX = camViewVector[0] + camPosX;
  var camViewY = camViewVector[1] + camPosY;

  switch(ev.keyCode){

    // Derecha
    case 39:
    camAngle -= 0.02;
    camViewX = Math.cos(camAngle) + camPosX;
    camViewY = Math.sin(camAngle) + camPosY;
    console.log('camAngle: ' + camAngle.toFixed(2) + '  camViewVector: (' + camViewVector + ')  camPosX: ' + camPosX.toFixed(2) + '  camPosY: ' + camPosY.toFixed(2) + '  camViewX: ' + camViewX.toFixed(2) + '  camViewY: ' + camViewY.toFixed(2));
    break;

    // Izquierda
    case 37:
    camAngle += 0.02;
    camViewX = Math.cos(camAngle) + camPosX;
    camViewY = Math.sin(camAngle) + camPosY;
    console.log('camAngle: ' + camAngle.toFixed(2) + '  camViewVector: (' + camViewVector + ')  camPosX: ' + camPosX.toFixed(2) + '  camPosY: ' + camPosY.toFixed(2) + '  camViewX: ' + camViewX.toFixed(2) + '  camViewY: ' + camViewY.toFixed(2));
    break;

    // Avance
    case 38:
    camPosX += (camViewVector[0] * 0.2);
    camPosY += (camViewVector[1] * 0.2);
    console.log('camAngle: ' + camAngle.toFixed(2) + '  camViewVector: (' + camViewVector + ')  camPosX: ' + camPosX.toFixed(2) + '  camPosY: ' + camPosY.toFixed(2) + '  camViewX: ' + camViewX.toFixed(2) + '  camViewY: ' + camViewY.toFixed(2));
    break;

    // Retroceso
    case 40:
    camPosX -= (camViewVector[0] * 0.2);
    camPosY -= (camViewVector[1] * 0.2);
    console.log('camAngle: ' + camAngle.toFixed(2) + '  camViewVector: (' + camViewVector + ')  camPosX: ' + camPosX.toFixed(2) + '  camPosY: ' + camPosY.toFixed(2) + '  camViewX: ' + camViewX.toFixed(2) + '  camViewY: ' + camViewY.toFixed(2));
    break;

    // Tecla por defecto
    default:
    console.log('camAngle: ' + camAngle.toFixed(2) + '  camViewVector: (' + camViewVector + ')  camPosX: ' + camPosX.toFixed(2) + '  camPosY: ' + camPosY.toFixed(2) + '  camViewX: ' + camViewX.toFixed(2) + '  camViewY: ' + camViewY.toFixed(2));
    return;

  }
}

/////////////////////////////// Función principal //////////////////////////////
function main() {

  // Mostrar mensaje de inicio
  alert('  --  Press the arrow keys to walk through the forest  --  ');

  // Get the rendering context for WebGL
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Ángulo de apertura de la cámara (º)
  var camViewAngle = 50;

  //------------------ Definir matriz de perspectiva (P) -----------------------
  projMatrix.setPerspective(camViewAngle, canvas.width/canvas.height, 1, 100);
  // ---------------------------------------------------------------------------

  // Crear bosque
  makeForest()

  // Analizar eventos de teclado
  document.onkeydown = function(ev){ keyHandler(ev) }

  // Dibujar escena
  requestAnimationFrame(drawScene);

}
