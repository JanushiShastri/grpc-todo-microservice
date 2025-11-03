// gRPC client in Node.js.
// Demonstrates all four call types against the server:
// 1) Unary createTodo
// 2) Client-streaming createTodosStream
// 3) Unary readTodos
// 4) Server-streaming readTodosStream

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// Load the same .proto (client & server share the contract)
const packageDef = protoLoader.loadSync("todo.proto", {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const grpcObject = grpc.loadPackageDefinition(packageDef);
const todoPackage = grpcObject.todoPackage;

// Create a client "stub" for the Todo service
const client = new todoPackage.Todo(
  "localhost:40000",                      // server address:port
  grpc.credentials.createInsecure()       // no TLS for local demo
);

// 1) Unary: create a single todo
client.createTodo({ text: "Learn gRPC basics" }, (err, created) => {
  if (err) {
    console.error("createTodo error:", err);
    return;
  }
  console.log("createTodo ✔", created);

  // 2) Client-streaming: send multiple todos, then get a summary
  const writeStream = client.createTodosStream((err2, summary) => {
    if (err2) {
      console.error("createTodosStream error:", err2);
      return;
    }
    console.log("createTodosStream ✔ summary:", summary);

    // 3) Unary: fetch all todos in one response
    client.readTodos({}, (err3, res) => {
      if (err3) {
        console.error("readTodos error:", err3);
        return;
      }
      console.log("readTodos ✔ total:", res.items.length);
      for (const t of res.items) console.log(" -", t);

      // 4) Server-streaming: receive todos one-by-one
      console.log("readTodosStream ▶");
      const readStream = client.readTodosStream({});

      // Each "data" event is one TodoItem
      readStream.on("data", (item) => {
        console.log("  stream item:", item);
      });

      // Stream finished
      readStream.on("end", () => {
        console.log("readTodosStream ■ done");
      });

      // Stream error (optional)
      readStream.on("error", (e) => {
        console.error("readTodosStream error:", e);
      });
    });
  });

  // Write several CreateTodoRequest messages to the client-stream
  ["Write .proto", "Implement server", "Implement client", "wash hair"].forEach((text) => {
    writeStream.write({ text });
  });

  // Signal end of client-stream
  writeStream.end();
});