import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // ================= API ROUTES FOR ORDERS =================
  // GET all orders (shared across both admins and buyers)
  app.get('/api/orders', (_req: Request, res: Response) => {
    const orders = readJsonFile<any[]>(ORDERS_FILE, []);
    res.json(orders);
  });

  // GET search order by query (Invoice ID AST-..., WhatsApp, Player ID)
  app.get('/api/orders/search', (req: Request, res: Response) => {
    const q = ((req.query.q as string) || '').trim().toLowerCase().replace(/^#/, '');
    const cleanDigits = q.replace(/[^0-9]/g, '');
    const orders = readJsonFile<any[]>(ORDERS_FILE, []);

    if (!q) {
      return res.json(orders);
    }

    const matches = orders.filter((o) => {
      const matchId = o.id && o.id.toLowerCase().includes(q);
      const matchWa = cleanDigits.length >= 4 && o.whatsapp && o.whatsapp.replace(/[^0-9]/g, '').includes(cleanDigits);
      const matchUser = o.userId && o.userId.toLowerCase().includes(q);
      const matchNick = o.userNickname && o.userNickname.toLowerCase().includes(q);
      const matchEmail = o.accountDelivered?.email && o.accountDelivered.email.toLowerCase().includes(q);
      const matchItem = o.itemName && o.itemName.toLowerCase().includes(q);
      return matchId || matchWa || matchUser || matchNick || matchEmail || matchItem;
    });

    res.json(matches);
  });

  // GET single order by exact ID
  app.get('/api/orders/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const orders = readJsonFile<any[]>(ORDERS_FILE, []);
    const match = orders.find((o) => o.id.toLowerCase() === id.toLowerCase());
    if (match) {
      return res.json(match);
    }
    res.status(404).json({ error: 'Order not found' });
  });

  // POST create new order (buyer checkout)
  app.post('/api/orders', (req: Request, res: Response) => {
    const newOrder = req.body;
    if (!newOrder || !newOrder.id) {
      return res.status(400).json({ error: 'Invalid order payload' });
    }

    const orders = readJsonFile<any[]>(ORDERS_FILE, []);
    const existingIndex = orders.findIndex((o) => o.id === newOrder.id);
    if (existingIndex >= 0) {
      orders[existingIndex] = { ...orders[existingIndex], ...newOrder };
    } else {
      orders.unshift(newOrder);
    }

    writeJsonFile(ORDERS_FILE, orders);
    res.status(201).json(newOrder);
  });

  // PATCH verify and fulfill order (Admin 1 or Admin 2)
  app.patch('/api/orders/:id/verify', (req: Request, res: Response) => {
    const { id } = req.params;
    const { verifiedBy = 'Admin ASTERA STORE' } = req.body || {};
    const orders = readJsonFile<any[]>(ORDERS_FILE, []);
    const index = orders.findIndex((o) => o.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[index];
    const nowIso = new Date().toISOString();
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    order.status = 'SUCCESS';
    order.paidAt = order.paidAt || nowIso;
    order.completedAt = nowIso;
    order.verifiedBy = verifiedBy;
    order.verifiedAt = nowIso;

    if (!order.logs) order.logs = [];
    order.logs.push({
      timestamp: nowTime,
      message: `Pembayaran riil diverifikasi sah oleh ${verifiedBy}. Status diubah menjadi LUNAS.`,
    });

    // If order was advance account and hasn't delivered yet, assign from products pool
    if (order.productType === 'advance_account' && !order.accountDelivered) {
      const products = readJsonFile<any[]>(PRODUCTS_FILE, []);
      const accProd = products.find((p) => p.type === 'advance_account');
      if (accProd) {
        const denom = accProd.denominations?.find((d: any) => d.id === order.itemId);
        if (denom && denom.accountPool && denom.accountPool.length > 0) {
          const readyAccIndex = denom.accountPool.findIndex((a: any) => !a.isSold);
          if (readyAccIndex !== -1) {
            const readyAcc = denom.accountPool[readyAccIndex];
            order.accountDelivered = {
              email: readyAcc.email,
              password: readyAcc.password,
              serverInfo: readyAcc.serverInfo,
              bindType: readyAcc.bindType,
              notes: readyAcc.notes,
            };
            order.serialNumberDelivery = `AST-ACC-${Date.now().toString().slice(-8)}`;
            // Otomatis hapus akun dari brankas stok admin karena sudah diserahkan ke pembeli
            denom.accountPool.splice(readyAccIndex, 1);
            denom.stockCount = denom.accountPool.filter((a: any) => !a.isSold).length;
            writeJsonFile(PRODUCTS_FILE, products);
            order.logs.push({
              timestamp: nowTime,
              message: `Akun Advance Server (${readyAcc.email}) berhasil diserahkan kepada pembeli dan dihapus dari brankas stok admin.`,
            });
          }
        }
      }
    } else if (order.productType === 'bbcoin_diamond' && !order.serialNumberDelivery) {
      order.serialNumberDelivery = `SN-BBCOIN-${Date.now().toString().slice(-9)}`;
      order.logs.push({
        timestamp: nowTime,
        message: `BB Coin dikonversi dan Diamond berhasil diinjeksikan ke User ID ${order.userId} (${order.zoneId}). SN: ${order.serialNumberDelivery}`,
      });
    }

    orders[index] = order;
    writeJsonFile(ORDERS_FILE, orders);
    res.json(order);
  });

  // PATCH buyer confirm payment (WAITING_VERIFICATION) or update status
  app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, actionBy } = req.body || {};
    const orders = readJsonFile<any[]>(ORDERS_FILE, []);
    const index = orders.findIndex((o) => o.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[index];
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (status) {
      order.status = status;
    }
    if (!order.logs) order.logs = [];

    if (status === 'WAITING_VERIFICATION') {
      order.logs.push({
        timestamp: nowTime,
        message: 'Pembeli menekan tombol konfirmasi bayar. Menunggu verifikasi mutasi oleh Admin.',
      });
    } else if (status === 'EXPIRED') {
      order.logs.push({
        timestamp: nowTime,
        message: 'Pesanan kedaluwarsa karena batas waktu pembayaran habis.',
      });
    } else if (status === 'CANCELLED') {
      order.logs.push({
        timestamp: nowTime,
        message: `Pesanan dibatalkan oleh ${actionBy || 'Admin'}.`,
      });
    }

    orders[index] = order;
    writeJsonFile(ORDERS_FILE, orders);
    res.json(order);
  });

  // ================= API ROUTES FOR PRODUCTS =================
  app.get('/api/products', (_req: Request, res: Response) => {
    const products = readJsonFile<any[]>(PRODUCTS_FILE, []);
    res.json(products);
  });

  app.post('/api/products', (req: Request, res: Response) => {
    const products = req.body;
    if (Array.isArray(products)) {
      writeJsonFile(PRODUCTS_FILE, products);
      return res.json({ success: true, count: products.length });
    }
    res.status(400).json({ error: 'Expected products array' });
  });

  // ================= API ROUTES FOR PAYMENT CONFIG =================
  app.get('/api/config', (_req: Request, res: Response) => {
    const config = readJsonFile<any>(CONFIG_FILE, {});
    res.json(config);
  });

  app.post('/api/config', (req: Request, res: Response) => {
    const config = req.body;
    writeJsonFile(CONFIG_FILE, config);
    res.json({ success: true });
  });

  // ================= VITE DEV MIDDLEWARE =================
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ASTERA STORE Full-Stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
