import { MongoClient, Db, Filter, UpdateResult, InsertManyResult, InsertOneResult, DeleteResult } from "mongodb";
import { ObjectID, Document } from "bson";


export class FindManyResult {
  total: number;
  data: any[];
  // start from 0
  page: number;
  // means limit
  size: number;

  constructor() {
    this.total = 0;
    this.page = 1;
    this.size = 20;
    this.data = [];
  }
}

// mongodb connection options
export class ConnOption {
  // host:port, e.g 127.0.0.1:27017
  #client: MongoClient;
  #db: Db;
  hostport: string;
  username: string;
  password: string;
  database: string;

  connURI(): string {
    const uri = `mongodb://${this.username}:${this.password}@${this.hostport}/${this.database}?retryWrites=true&writeConcern=majority`;
    console.debug("warning: password leaks");
    console.debug(uri);
    return uri;
  }

  async initDs(): Promise<Db> {
    return this.#mgoClient();
  }

  async #mgoClient(): Promise<Db> {
    this.#client = new MongoClient(this.connURI());
    try {
      await this.#client.connect();
      const database = this.#client.db(this.database);
      this.#db = database;
      console.debug(`try to connect to ${this.hostport} mongodb...`);
      return database;
    } catch (error) {
      console.error(`try to connect to mongodb failed, ${error}`);
      throw error;
    }
  }

  async close() {
    this.#client.close();
  }

  async findOne<T extends Document = Document>(col: string, query: Filter<T>, sort: any = {"createT.t": -1}) {
    const result = await this.#db.collection<T>(col).findOne(query, {'sort': sort});
    console.debug(`findOne result:${JSON.stringify(result)}`);
    return result;
  }

  async findMany<T extends Document = Document>
                (col: string,
                  query: Filter<T>,
                  page: number = 1,
                  size: number = 20,
                  sort: any = {"createT.t": -1}): Promise<FindManyResult>{
    if (page < 1) {
      page = 1;
    }
    if (size <= 0) {
      size = 1;
    }
    const skip = (page - 1) * size;
    const cursor = this.#db.collection<T>(col).find(query, {'sort': sort});
    const total = await cursor.count();
    const datas = await cursor.skip(skip).limit(size).toArray();

    const result = new FindManyResult();
    result.total = total;
    result.page = page;
    result.size = size;
    result.data = datas;

    console.debug(`findMany, total:${result.total}, page:${result.page}, size:${result.size}`);

    return result;
  }

  async insertOne<T extends Document = Document>(col: string, data: any): Promise<InsertOneResult> {
    const result = await this.#db.collection<T>(col).insertOne(data);
    if (!result.acknowledged) {
      console.error(`insert document failed, ${JSON.stringify(result)}`);
    } else {
      console.debug(`insert document success, result: ${JSON.stringify(result)}`);
    }
    return result;
  }

  async insertMany<T extends Document = Document>(col: string, datas: any[], ordered: boolean = true): Promise<InsertManyResult> {
    const result = await this.#db.collection<T>(col).insertMany(datas, {'ordered': ordered});
    if (!result.acknowledged) {
      console.error(`insert document failed, ${JSON.stringify(result)}`);
    } else {
      console.debug(`insert document success, result: ${JSON.stringify(result)}`);
    }
    return result;
  }

  async updateOne<T extends Document = Document>(col: string, query: any, update: any, upsert: boolean = true): Promise<UpdateResult | Document> {
    const result = await this.#db.collection<T>(col).updateOne(
      query,
      {
        "$set": update,
      },
      {
        "upsert": upsert,
      }
    );

    if (result.matchedCount !== 1) {
      console.error(`updateOne failed, result: ${JSON.stringify(result)}`);
    } else {
      console.debug(`update success, result: ${JSON.stringify(result)}`);
    }

    return result;
  }

  async updateMany<T extends Document = Document>(col: string, query: any, update: any): Promise<UpdateResult | Document> {
    const result = await this.#db.collection<T>(col).updateMany(
      query,
      {
        "$set": update,
      }
    );

    return result;
  }

  async deleteOne<T extends Document = Document>(col: string, query: any, iknowwhatido: boolean = false): Promise<DeleteResult> {
    if(!iknowwhatido) {
      const ret: DeleteResult = {
        acknowledged: false,
        deletedCount: 0,
      };
      return ret;
    }

    const result = await this.#db.collection<T>(col).deleteOne(query)
    if (result.deletedCount !== 1) {
      console.error(`deleteOne failed, result: ${JSON.stringify(result)}`);
    }

    return result;
  }

  async deleteMany<T extends Document = Document>(col: string, query: any, iknowwhatido: boolean = false): Promise<DeleteResult> {
    if(!iknowwhatido) {
      const ret: DeleteResult = {
        acknowledged: false,
        deletedCount: 0,
      };
      return ret;
    }

    const result = await this.#db.collection<T>(col).deleteMany(query);
    console.log(`deleteMany, deleted:[${result.deletedCount}]`);
    return result;
  }
}

export class CurT {
  // timestamp integer, second precision
  t: number;
  humanT: string;

  constructor() {
    const ts = Date.now();
    this.t = Math.round(ts / 1000);
    this.humanT = this.formatTime(ts);
  }

  // yyyy-MM-dd hh:mm:ss .e.g 2021-08-22 18:07:21
  formatTime(ts: number): string {
    let fstr = "";
    const d = new Date(ts);
    console.debug(`formatTime, ts:[${ts}], timezone offset: [${d.getTimezoneOffset()}]`);
    const year = d.getFullYear();
    fstr = `${year}-`;

    const month = d.getMonth() + 1;
    if (month < 10) {
      fstr += `0${month}-`;
    } else {
      fstr += `${month}-`;
    }

    const day = d.getDate();
    if (day < 10) {
      fstr += `0${day}`;
    } else {
      fstr += `${day}`;
    }

    fstr += " ";

    const hour = d.getHours();
    if (hour < 10) {
      fstr += `0${hour}:`;
    } else {
      fstr += `${hour}:`
    }

    const minute = d.getMinutes();
    if (minute < 10) {
      fstr += `0${minute}:`;
    } else {
      fstr += `${minute}:`;
    }

    const second = d.getSeconds();
    if (second < 10) {
      fstr += `0${second}`;
    } else {
      fstr += `${second}`;
    }
    return fstr;
  }
}

export function getObjectID(): string {
  const oid = new ObjectID();
  return oid.toHexString();
}
