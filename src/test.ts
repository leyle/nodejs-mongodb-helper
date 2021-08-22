import { ConnOption, getObjectID, CurT } from './index';
import { DeleteResult } from 'mongodb';

class SomeJson {
  _id: string;
  dataId: string;
  data: any;
  createT: CurT;
  updateT: CurT;
}

function generateData(dataId: string) {
  const fruit = {
    "id": dataId,
    "type": "apple",
    "color": "red",
    "origin": "YanTai",
    "brand": "HongFuShi",
    "stock": {
      "red": 100,
      "green": 222,
    }
  }

  return fruit;
}

function generateSJ(): SomeJson {
  const sj = new SomeJson();
  sj._id = getObjectID();
  sj.dataId = "dataid-" + sj._id;
  sj.data = generateData(sj.dataId); 
  sj.createT = new CurT();
  sj.updateT = sj.createT;
  return sj;
}

async function debug() {
  // prepare data
  const sj = generateSJ();
  console.log(JSON.stringify(sj));

  // prepase db connection
  const mgouri = "192.168.2.41:27017";
  const username = "dbuser";
  const password = "dbpasswd";
  const database = "dev";
  const collection = "fruit";

  const conn = new ConnOption();
  conn.hostport = mgouri;
  conn.username = username;
  conn.password = password;
  conn.database = database;

  await conn.initDs();

  const query = {
    "data.color": "red",
  };

  const query2 = {
    "createT.t": {"$gte": 1629635883},
    "data.stock.red": {"$lte": 101}
  }

  // value can be 'asc'/1, 'desc'/-1
  const sort = {
    "createT.t": 'asc',
  };

  const page = 1
  const size = 5;

  let result: any;

  // insert one document
  await conn.insertOne<SomeJson>(collection, sj);
  console.debug('insert one done.');

  // insert many documents
  const sj2 = generateSJ();
  const sj3 = generateSJ();
  result = await conn.insertMany<SomeJson>(collection, [sj2, sj3]);
  console.debug('insert many done.');

  // query one document
  const data = await conn.findOne<SomeJson>(collection, query, sort);
  console.log(JSON.stringify(data));

  // query many documents
  const datas = await conn.findMany<SomeJson>(collection, query2, page, size, sort);
  console.debug(JSON.stringify(datas));

  // update one document
  const updFilter = {
    "dataId": "dataid-6122449fd8af29f1cff7c9ae",
  };

  const updTarget = {
    "data.color": "black",
    "data.origin": "BeiJing",
    "status": "deleted",
    "updateT": new CurT(),
  }
  result = await conn.updateOne<SomeJson>(collection, updFilter, updTarget, true);
  console.log(JSON.stringify(result));

  // update many documents
  const updFilter2 = {
    "data.color": "red",
  };
  const updTarget2 = {
    "data.color": "orange",
    "data.origin": "HK",
    "updateT": new CurT(),
  };
  result = await conn.updateMany<SomeJson>(collection, updFilter2, updTarget2);
  console.log(JSON.stringify(result));

  // detele one document
  const delQuery = {
    "dataId": "dataid-61224538c261dfc607a21439",
  };
  result = await conn.deleteOne<SomeJson>(collection, delQuery);
  console.log(JSON.stringify(result));

  // delete many documents
  // here, delete all documents
  // const delQuery2 = {};
  // result = await conn.deleteMany<SomeJson>(collection, delQuery2, true);
  // console.log(JSON.stringify(result));

  conn.close();
}

debug();