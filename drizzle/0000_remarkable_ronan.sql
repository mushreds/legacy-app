CREATE TABLE `categorias` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`ticket_medio_unitario` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categorias_nome_unique` ON `categorias` (`nome`);--> statement-breakpoint
CREATE TABLE `marcos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data` text NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text,
	`gatilho_de_realinhamento` text,
	`status` text DEFAULT 'pendente' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `metas_mensais` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ano` integer NOT NULL,
	`mes` integer NOT NULL,
	`valor_meta` real NOT NULL,
	`unidades_meta` integer,
	`cenario` text DEFAULT 'meta' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `metas_mensais_ano_mes_cenario_unq` ON `metas_mensais` (`ano`,`mes`,`cenario`);--> statement-breakpoint
CREATE TABLE `metas_por_categoria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ano` integer NOT NULL,
	`mes` integer NOT NULL,
	`categoria_id` integer NOT NULL,
	`unidades_dia_meta` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `metas_por_categoria_ano_mes_cat_unq` ON `metas_por_categoria` (`ano`,`mes`,`categoria_id`);--> statement-breakpoint
CREATE TABLE `parametros` (
	`chave` text PRIMARY KEY NOT NULL,
	`valor` real NOT NULL,
	`descricao` text
);
--> statement-breakpoint
CREATE TABLE `promocoes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`canal` text NOT NULL,
	`tipo` text NOT NULL,
	`data_inicio` text NOT NULL,
	`data_fim` text NOT NULL,
	`desconto_percentual` real,
	`observacoes` text
);
--> statement-breakpoint
CREATE TABLE `vendas_diarias` (
	`data` text PRIMARY KEY NOT NULL,
	`pedidos_validos` integer DEFAULT 0 NOT NULL,
	`valor_validas` real DEFAULT 0 NOT NULL,
	`pedidos_cancelados` integer DEFAULT 0 NOT NULL,
	`valor_canceladas` real DEFAULT 0 NOT NULL,
	`unidades` integer,
	`fonte` text DEFAULT 'manual' NOT NULL,
	`atualizado_em` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vendas_por_categoria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data` text NOT NULL,
	`categoria_id` integer NOT NULL,
	`unidades` integer DEFAULT 0 NOT NULL,
	`valor` real,
	FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vendas_por_categoria_data_categoria_unq` ON `vendas_por_categoria` (`data`,`categoria_id`);