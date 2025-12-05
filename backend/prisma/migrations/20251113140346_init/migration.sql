-- CreateTable
CREATE TABLE `estoque_registro` (
    `codigoItem` INTEGER NOT NULL AUTO_INCREMENT,
    `descricao` VARCHAR(255) NOT NULL,
    `mes_entrada` VARCHAR(20) NULL,
    `dia_entrada` INTEGER NULL,
    `quant_entrada` INTEGER NULL,
    `unidade_entrada` VARCHAR(10) NULL,
    `nota_fiscal` VARCHAR(50) NULL,
    `fornecedor` VARCHAR(100) NULL,
    `valor_total_entrada` DECIMAL(10, 2) NULL,
    `data_vencimento` VARCHAR(20) NULL,
    `estoque_quantidade` INTEGER NULL,
    `estoque_unidade` VARCHAR(10) NULL,
    `estoque_valor_unitario` DECIMAL(10, 2) NULL,
    `valor_venda` DECIMAL(10, 2) NULL,

    PRIMARY KEY (`codigoItem`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidos_registro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estoqueId` INTEGER NULL,
    `descricao` VARCHAR(255) NOT NULL,
    `mes_saida` VARCHAR(20) NULL,
    `dia_saida` INTEGER NULL,
    `quant_saida` INTEGER NULL,
    `responsavel` VARCHAR(50) NULL,
    `saida_loja` VARCHAR(100) NULL,
    `localidade` VARCHAR(100) NULL,
    `valor_unitario_venda` DECIMAL(10, 2) NULL,
    `valor_total_saida` DECIMAL(10, 2) NULL,
    `margem_aplicada` VARCHAR(10) NULL,
    `lucratividade_unitario` DECIMAL(10, 2) NULL,
    `lucratividade_total` DECIMAL(10, 2) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pedidos_registro` ADD CONSTRAINT `pedidos_registro_estoqueId_fkey` FOREIGN KEY (`estoqueId`) REFERENCES `estoque_registro`(`codigoItem`) ON DELETE SET NULL ON UPDATE CASCADE;
