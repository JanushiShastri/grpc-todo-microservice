// gRPC server implementation in Node.js.
// Implements all RPCs defined in todo.proto.

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// Load the .proto "contract" and convert to a JS object
const packageDef = protoLoader.loadSync("todo.proto", {
  keepCase: true,   // keep field_case as-is
  longs: String,    // represent int64 as String (safe for JS)
  enums: String,
  defaults: true,   // populate default values
  oneofs: true,
});
const grpcObject = grpc.loadPackageDefinition(packageDef);

// Access the package namespace defined in the proto
const todoPackage = grpcObject.todoPackage;

// In-memory "database" for learning purposes
const todos = [];
let nextId = 1;

// ---------- Handlers (Business Logic) ----------

// Unary: create a single todo item
function createTodo(call, callback) {
  // call.request matches CreateTodoRequest from the proto
  const { text = "" } = call.request || {};
  const item = {
    id: nextId++,
    text,
    done: false,
    created_at: Date.now(),
  };
  todos.push(item);

  console.log("createTodo ➜", item);

  // First arg is error (null = no error), second is the response message
  callback(null, item);
}

// Unary: return ALL todos in a single response
function readTodos(_call, callback) {
  console.log("readTodos ➜ returning", todos.length, "items");
  callback(null, { items: todos });
}

// Server-streaming: write each todo item separately
function readTodosStream(call) {
  console.log("readTodosStream ➜ streaming", todos.length, "items");
  for (const item of todos) {
    call.write(item); // push one message to client
  }
  call.end(); // signal end of stream
}

// Client-streaming: accept many CreateTodoRequest messages,
// then return one summary result
function createTodosStream(call, callback) {
  let created = 0;

  // Each "data" event carries one CreateTodoRequest
  call.on("data", (req) => {
    const text = (req && req.text) || "";
    const item = {
      id: nextId++,
      text,
      done: false,
      created_at: Date.now(),
    };
    todos.push(item);
    created += 1;
    console.log("createTodosStream ➜ created:", item);
  });

  // Client completed sending — reply once with a summary
  call.on("end", () => {
    console.log("createTodosStream ➜ summary: created =", created);
    callback(null, { created }); // CreateTodosSummary
  });

  // Optional error logging
  call.on("error", (err) => {
    console.error("createTodosStream error:", err);
  });
}

// ---------- Server Bootstrap ----------

const server = new grpc.Server();

// Wire the service handlers to the service definition
server.addService(todoPackage.Todo.service, {
  createTodo,
  readTodos,
  readTodosStream,
  createTodosStream,
});

// Bind and start the server
server.bindAsync(
  "0.0.0.0:40000",
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error("bind error:", err);
      process.exit(1);
    }
    console.log(`gRPC server running on 0.0.0.0:${port}`);
    server.start();
  }
);