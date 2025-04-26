// credit to sigma md 

import pg from 'pg';
const { Pool } = pg;

export class PostgresDB {
  constructor(databaseUrl, options = {}) {
    this.url = databaseUrl;
    this.options = options;
    const sslConfig = {
      rejectUnauthorized: false,
      sslmode: "require"
    };
    this.pool = new Pool({
      connectionString: this.url,
      ssl: sslConfig,
      ...this.options
    });
    this.data = this._data = {};
    this.READ = null;
  }

  async init() {
    try {
      console.log("Initializing PostgreSQL...");
      await this.connectWithRetry();
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS public.data (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log("PostgreSQL table ensured.");
      await this.read();
    } catch (error) {
      console.error("Failed to initialize PostgreSQL:", error.message);
      throw error;
    }
  }

  async connectWithRetry() {
    let retryCount = 5;
    while (retryCount > 0) {
      try {
        const client = await this.pool.connect();
        console.log("PostgreSQL connected✅");
        client.release();
        break;
      } catch (error) {
        console.error("PostgreSQL connection failed. Retries left: " + (retryCount - 1), error.message);
        retryCount -= 1;
        if (retryCount === 0) {
          throw new Error("PostgreSQL connection failed after multiple attempts.");
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  async read() {
    if (this.READ) {
      return new Promise(resolve => setInterval(async () => {
        if (!this.READ) {
          clearInterval(this);
          resolve(this.data || this.read());
        }
      }, 1000));
    }
    this.READ = true;
    try {
      const result = await this.pool.query("SELECT key, value FROM public.data");
      this._data = result.rows.reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
      this.data = {
        users: {},
        chats: {},
        stats: {},
        msgs: {},
        sticker: {},
        settings: {},
        ...(this._data || {})
      };
      console.log("Data loaded from PostgreSQL.");
    } catch (error) {
      console.error("Error reading data from PostgreSQL:", error.message);
      throw error;
    } finally {
      this.READ = null;
    }
    return this.data;
  }

  async writeBatch(batchData) {
    if (!Array.isArray(batchData) || batchData.length === 0) {
      throw new Error("Invalid data. Must be a non-empty array.");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const { key, value } of batchData) {
        await client.query(`
          INSERT INTO public.data (key, value)
          VALUES ($1, $2::jsonb)
          ON CONFLICT (key)
          DO UPDATE SET value = $2::jsonb, created_at = NOW();
        `, [key, JSON.stringify(value)]);
      }
      await client.query("COMMIT");
      console.log("Batch data saved successfully.");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error in batch write:", error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async writeWithRetry(data, maxRetries = 3, retryDelay = 2000) {
    while (maxRetries > 0) {
      try {
        await this.write(data);
        return true;
      } catch (error) {
        if (maxRetries === 1 || error.message.includes('quota')) {
          throw error;
        }
        console.warn("Retrying write operation...");
        maxRetries -= 1;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  async write(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid data. Must be a non-empty object.");
    }
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS public.data (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      const savedKeys = [];
      for (const [key, value] of Object.entries(data)) {
        await this.pool.query(`
          INSERT INTO public.data (key, value)
          VALUES ($1, $2::jsonb)
          ON CONFLICT (key)
          DO UPDATE SET value = $2::jsonb, created_at = NOW();
        `, [key, JSON.stringify(value)]);
        savedKeys.push(key);
      }
      console.log("Data saved to PostgreSQL for keys: " + savedKeys.join(", "));
      this.data = {
        ...this.data,
        ...data
      };
      return true;
    } catch (error) {
      console.error("Error writing to PostgreSQL:", error.message);
      throw error;
    }
  }

  async update(key, value) {
    if (!key) {
      throw new Error("Key is required to update data.");
    }
    this.data[key] = value;
    const updateData = {
      [key]: value
    };
    return this.writeWithRetry(updateData);
  }

  async close() {
    try {
      await this.pool.end();
      console.log("PostgreSQL connection pool closed.");
    } catch (error) {
      console.error("Error closing PostgreSQL connection pool:", error.message);
    }
  }
}