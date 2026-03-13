// Creates a silent black canvas stream used as a placeholder screen-share track.
export function createDummyScreenStream() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 640;
  canvas.height = 480;
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.captureStream(0);
}
