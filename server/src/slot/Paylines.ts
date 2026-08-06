// Cada línea es un array de 5 índices de fila (0 a 3), uno por rodillo.
// v1: combinación de líneas rectas y zigzags simples sobre 4 filas.

export const PAYLINES: number[][] = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [3, 3, 3, 3, 3],
  [0, 1, 2, 1, 0],
  [3, 2, 1, 2, 3],
  [1, 0, 1, 0, 1],
  [2, 3, 2, 3, 2],
  [0, 1, 1, 1, 0],
  [3, 2, 2, 2, 3],
  [1, 2, 3, 2, 1],
  [2, 1, 0, 1, 2],
];
