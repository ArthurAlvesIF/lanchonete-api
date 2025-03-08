import Fastify from "fastify";
import { Sequelize, DataTypes, Model, Optional } from "sequelize";

// Configuração do Sequelize para conexão com o MySQL
const sequelize = new Sequelize("lanchonete", "admin", "ic0SUBVU2AqjuQmHgUR6", {
  host: "mlar-db.c4x26mu8gr8l.us-east-1.rds.amazonaws.com",
  port: 3306,
  dialect: "mysql",
});

// Interfaces para os Models
interface OrderAttributes {
  id: number;
  name: string;
  total: number;
  orderDate: Date;
  paymentMethod: "pix" | "credit" | "debit" | "cash";
  status: "pending" | "inProduction" | "finished";
}
interface OrderCreationAttributes extends Optional<OrderAttributes, "id"> {}

interface ProductAttributes {
  id: number;
  name: string;
  stock: number;
  price: number;
}
interface ProductCreationAttributes extends Optional<ProductAttributes, "id"> {}

interface OrderProductAttributes {
  id: number;
  orderId: number;
  productId: number;
  obs: string;
  quantity: number;
}
interface OrderProductCreationAttributes extends Optional<OrderProductAttributes, "id"> {}

// Definição do Model Order
class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  public paymentMethod!: "pix" | "credit" | "debit" | "cash";
  public id!: number;
  public name!: string;
  public total!: number;
  public orderDate!: Date;
  public status!: "pending" | "inProduction" | "finished";

  // timestamps criados automaticamente (se habilitados)
}

Order.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    orderDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "inProduction", "finished"),
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.ENUM("cash", "credit", "debit", "pix"),
      allowNull: false
    }
  },
  {
    tableName: "orders",
    sequelize,
    timestamps: false,
    createdAt: false,
    updatedAt: false
  }
);

// Definição do Model Product
class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  public id!: number;
  public name!: string;
  public stock!: number;
  public price!: number;

}

Product.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: -1,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    tableName: "products",
    sequelize,
    timestamps: false,
    createdAt: false,
    updatedAt: false
  }
);

// Definição do Model OrderProduct (tabela de relacionamento N:N)
class OrderProduct extends Model<OrderProductAttributes, OrderProductCreationAttributes> implements OrderProductAttributes {
  public obs!: string;
  public quantity!: number;
  public id!: number;
  public orderId!: number;
  public productId!: number;

}

OrderProduct.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    productId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    obs: {
      type: DataTypes.STRING,
      allowNull: true
    },
    quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    }
  },
  {
    tableName: "orderProducts",
    sequelize,
    timestamps: false,
    createdAt: false,
    updatedAt: false
  }
);

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

const fastify = Fastify();

// ----------------------- Rotas para Orders -----------------------
// GET ALL Orders
fastify.get("/orders", async (request, reply) => {
  const orders = await Order.findAll({
    include: [{ model: Product, through: { attributes: [] } }],
    order: [['id', 'DESC']]
  });
  return orders;
});

// GET Order by ID
fastify.get("/orders/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const order = await Order.findByPk(Number(id), {
    include: [{ model: Product, through: { attributes: [] } }],
  });
  if (!order) return reply.status(404).send({ error: "Order not found" });
  return order;
});

// POST Create Order
fastify.post("/orders", async (request, reply) => {
  const { name, total, orderDate, status, paymentMethod, products } = request.body as any;
  try {
    const newOrder = await Order.create({
      name,
      total,
      orderDate: new Date(),
      status: 'pending',
      paymentMethod
    });

    const newOrderProduct = await OrderProduct.bulkCreate(products.map((p: any) => ({ productId: p.id, quantity: p.quantity, obs: `${p.obs}`, orderId: newOrder.id })))
    return reply.status(201).send(newOrder);
  } catch (err) {
    return reply.status(400).send(err);
  }
});

// PUT Update Order
fastify.put("/orders/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const { name, total, orderDate, status } = request.body as any;
  try {
    const order = await Order.findByPk(Number(id));
    if (!order) return reply.status(404).send({ error: "Order not found" });
    order.name = name;
    order.total = total;
    order.orderDate = new Date(orderDate);
    order.status = status;
    await order.save();
    return order;
  } catch (err) {
    return reply.status(400).send(err);
  }
});

// DELETE Order
fastify.delete("/orders/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const order = await Order.findByPk(Number(id));
    if (!order) return reply.status(404).send({ error: "Order not found" });
    await order.destroy();
    return reply.status(204).send();
  } catch (err) {
    return reply.status(400).send(err);
  }
});

// ----------------------- Rotas para Products -----------------------
// GET ALL Products
fastify.get("/products", async (request, reply) => {
  const products = await Product.findAll({ order: [['id', 'DESC']]});
  return products;
});

// GET Product by ID
fastify.get("/products/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const product = await Product.findByPk(Number(id));
  if (!product) return reply.status(404).send({ error: "Product not found" });
  return product;
});

// POST Create Product
fastify.post("/products", async (request, reply) => {
  const { name, stock, price } = request.body as any;
  try {
    const newProduct = await Product.create({ name, stock, price });
    return reply.status(201).send(newProduct);
  } catch (err) {
    return reply.status(400).send(err);
  }
});

// PUT Update Product
fastify.put("/products/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const { name, stock, price } = request.body as any;
  try {
    const product = await Product.findByPk(Number(id));
    if (!product) return reply.status(404).send({ error: "Product not found" });
    product.name = name;
    product.stock = stock;
    product.price = price;
    await product.save();
    return product;
  } catch (err) {
    return reply.status(400).send(err);
  }
});

// DELETE Product
fastify.delete("/products/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const product = await Product.findByPk(Number(id));
    if (!product) return reply.status(404).send({ error: "Product not found" });
    await product.destroy();
    return reply.status(204).send();
  } catch (err) {
    return reply.status(400).send(err);
  }
});

// ----------------------- Rotas para OrderProducts -----------------------
// GET ALL OrderProducts
fastify.get("/orderProducts", async (request, reply) => {
  const orderProducts = await OrderProduct.findAll();
  return orderProducts;
});

// POST Create OrderProduct Relationship
fastify.post("/orderProducts", async (request, reply) => {
  const { orderId, productId, obs, quantity } = request.body as any;
  try {
    const newOrderProduct = await OrderProduct.create({ orderId, productId, obs, quantity });
    return reply.status(201).send(newOrderProduct);
  } catch (err) {
    return reply.status(400).send(err);
  }
});

// DELETE OrderProduct Relationship
fastify.delete("/orderProducts/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const orderProduct = await OrderProduct.findByPk(Number(id));
    if (!orderProduct) return reply.status(404).send({ error: "OrderProduct not found" });
    await orderProduct.destroy();
    return reply.status(204).send();
  } catch (err) {
    return reply.status(400).send(err);
  }
});

// Inicia o servidor
fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
  console.log(`🚀 Server running at ${address}`);
});
