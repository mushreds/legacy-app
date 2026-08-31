// Reaplica a semente (idempotente): categorias, metas de set/2026, marcos e parâmetros.
import { db } from "./index";
import { runSeed } from "./seed-data";

runSeed(db as never);
console.log("Semente aplicada: categorias, metas set/2026, marcos e parâmetros.");
