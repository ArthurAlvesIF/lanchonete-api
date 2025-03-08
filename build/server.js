"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const sequelize_1 = require("sequelize");
// Configuração do Sequelize para conexão com o MySQL
const sequelize = new sequelize_1.Sequelize("lanchonete", "admin", "ic0SUBVU2AqjuQmHgUR6", {
    host: "mlar-db.c4x26mu8gr8l.us-east-1.rds.amazonaws.com",
    port: 3306,
    dialect: "mysql",
});
// Definição do Model Order
class Order extends sequelize_1.Model {
}
Order.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    total: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    orderDate: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM("pending", "inProduction", "finished"),
        allowNull: false,
    },
    paymentMethod: {
        type: sequelize_1.DataTypes.ENUM("cash", "credit", "debit", "pix"),
        allowNull: false
    }
}, {
    tableName: "orders",
    sequelize,
    timestamps: false,
    createdAt: false,
    updatedAt: false
});
// Definição do Model Product
class Product extends sequelize_1.Model {
}
Product.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    stock: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: -1,
    },
    price: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
}, {
    tableName: "products",
    sequelize,
    timestamps: false,
    createdAt: false,
    updatedAt: false
});
// Definição do Model OrderProduct (tabela de relacionamento N:N)
class OrderProduct extends sequelize_1.Model {
}
OrderProduct.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    orderId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    productId: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    obs: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    quantity: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    }
}, {
    tableName: "orderProducts",
    sequelize,
    timestamps: false,
    createdAt: false,
    updatedAt: false
});
// Definindo associações
Order.belongsToMany(Product, {
    through: OrderProduct,
    foreignKey: "orderId",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
});
Product.belongsToMany(Order, {
    through: OrderProduct,
    foreignKey: "productId",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
});
// Relacionamentos para facilitar consultas
OrderProduct.belongsTo(Order, { foreignKey: "orderId", onDelete: "CASCADE", onUpdate: "CASCADE" });
OrderProduct.belongsTo(Product, { foreignKey: "productId", onDelete: "CASCADE", onUpdate: "CASCADE" });
// Sincroniza os modelos com o banco de dados
const fastify = (0, fastify_1.default)();
// ----------------------- Rotas para Orders -----------------------
// GET ALL Orders
fastify.get("/orders", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const orders = yield Order.findAll({
        include: [{ model: Product, through: { attributes: [] } }],
        order: [['id', 'DESC']]
    });
    return orders;
}));
// GET Order by ID
fastify.get("/orders/:id", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = request.params;
    const order = yield Order.findByPk(Number(id), {
        include: [{ model: Product, through: { attributes: [] } }],
    });
    if (!order)
        return reply.status(404).send({ error: "Order not found" });
    return order;
}));
// POST Create Order
fastify.post("/orders", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, total, orderDate, status, paymentMethod, products } = request.body;
    try {
        const newOrder = yield Order.create({
            name,
            total,
            orderDate: new Date(),
            status: 'pending',
            paymentMethod
        });
        const newOrderProduct = yield OrderProduct.bulkCreate(products.map((p) => ({ productId: p.id, quantity: p.quantity, obs: `${p.obs}`, orderId: newOrder.id })));
        return reply.status(201).send(newOrder);
    }
    catch (err) {
        return reply.status(400).send(err);
    }
}));
// PUT Update Order
fastify.put("/orders/:id", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = request.params;
    const { name, total, orderDate, status } = request.body;
    try {
        const order = yield Order.findByPk(Number(id));
        if (!order)
            return reply.status(404).send({ error: "Order not found" });
        order.name = name;
        order.total = total;
        order.orderDate = new Date(orderDate);
        order.status = status;
        yield order.save();
        return order;
    }
    catch (err) {
        return reply.status(400).send(err);
    }
}));
// DELETE Order
fastify.delete("/orders/:id", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = request.params;
    try {
        const order = yield Order.findByPk(Number(id));
        if (!order)
            return reply.status(404).send({ error: "Order not found" });
        yield order.destroy();
        return reply.status(204).send();
    }
    catch (err) {
        return reply.status(400).send(err);
    }
}));
// ----------------------- Rotas para Products -----------------------
// GET ALL Products
fastify.get("/products", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const products = yield Product.findAll({ order: [['id', 'DESC']] });
    return products;
}));
// GET Product by ID
fastify.get("/products/:id", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = request.params;
    const product = yield Product.findByPk(Number(id));
    if (!product)
        return reply.status(404).send({ error: "Product not found" });
    return product;
}));
// POST Create Product
fastify.post("/products", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, stock, price } = request.body;
    try {
        const newProduct = yield Product.create({ name, stock, price });
        return reply.status(201).send(newProduct);
    }
    catch (err) {
        return reply.status(400).send(err);
    }
}));
// PUT Update Product
fastify.put("/products/:id", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = request.params;
    const { name, stock, price } = request.body;
    try {
        const product = yield Product.findByPk(Number(id));
        if (!product)
            return reply.status(404).send({ error: "Product not found" });
        product.name = name;
        product.stock = stock;
        product.price = price;
        yield product.save();
        return product;
    }
    catch (err) {
        return reply.status(400).send(err);
    }
}));
// DELETE Product
fastify.delete("/products/:id", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = request.params;
    try {
        const product = yield Product.findByPk(Number(id));
        if (!product)
            return reply.status(404).send({ error: "Product not found" });
        yield product.destroy();
        return reply.status(204).send();
    }
    catch (err) {
        return reply.status(400).send(err);
    }
}));
// ----------------------- Rotas para OrderProducts -----------------------
// GET ALL OrderProducts
fastify.get("/orderProducts", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const orderProducts = yield OrderProduct.findAll();
    return orderProducts;
}));
// POST Create OrderProduct Relationship
fastify.post("/orderProducts", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const { orderId, productId, obs, quantity } = request.body;
    try {
        const newOrderProduct = yield OrderProduct.create({ orderId, productId, obs, quantity });
        return reply.status(201).send(newOrderProduct);
    }
    catch (err) {
        return reply.status(400).send(err);
    }
}));
// DELETE OrderProduct Relationship
fastify.delete("/orderProducts/:id", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = request.params;
    try {
        const orderProduct = yield OrderProduct.findByPk(Number(id));
        if (!orderProduct)
            return reply.status(404).send({ error: "OrderProduct not found" });
        yield orderProduct.destroy();
        return reply.status(204).send();
    }
    catch (err) {
        return reply.status(400).send(err);
    }
}));
// Inicia o servidor
fastify.listen({ port: 3000 }, (err, address) => {
    if (err) {
        console.error("Error starting server:", err);
        process.exit(1);
    }
    console.log(`🚀 Server running at ${address}`);
});
