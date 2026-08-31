// Aplica as migrações pendentes (também acontece automaticamente ao subir o app).
import { db } from "./index";

void db; // importar já migra e semeia
console.log("Migrações aplicadas em data/vendas.db");
