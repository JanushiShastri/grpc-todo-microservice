# gRPC To-Do Microservice
	•	Unary (create a todo, read all todos)
	•	Server-streaming (stream all todos one by one)
	•	Client-streaming (send multiple todos, get a summary back)


# todo.proto (the contract)

This file defines the API (service + messages) that both server and client agree on.
	•	syntax = "proto3"; → using Protocol Buffers v3.
	•	package todoPackage; → namespace for generated types.

Service methods
	•	Unary
	•	createTodo(CreateTodoRequest) returns (TodoItem);
	•	Client sends one request (with text), server returns one TodoItem.
	•	readTodos(Empty) returns (TodoItems);
	•	Client asks for all todos; server returns them in a single list.
	•	Server streaming
	•	readTodosStream(Empty) returns (stream TodoItem);
	•	Client asks once; server streams todos one-by-one (multiple messages).
	•	Client streaming
	•	createTodosStream(stream CreateTodoRequest) returns (CreateTodosSummary);
	•	Client sends many CreateTodoRequest messages; server replies once with a summary (how many created).

Messages
	•	CreateTodoRequest { string text = 1; } → what the client sends when creating.
	•	TodoItem { int32 id; string text; bool done; int64 created_at; } → a stored todo.
	•	TodoItems { repeated TodoItem items = 1; } → list wrapper for unary read.
	•	CreateTodosSummary { int32 created = 1; } → count of items created in a client stream.
	•	Empty {} → placeholder when no fields are needed.

Why this matters: This file is the single source of truth. Server implements these methods; client calls them. Any language can generate code from this and interoperate.


# servere.js - the service implemenation
This is your gRPC server. It loads the .proto, implements the handlers, and listens on a port.

Loading the contract
	•	Uses @grpc/grpc-js + @grpc/proto-loader to:
	•	parse todo.proto
	•	load it into a JS object (todoPackage)
	•	expose Todo.service for the server to implement.


In-memory “database”
const todos = [];
let nextId = 1;
	•	All todos live in this array in memory (for learning).
	•	Restarting the server clears it.

Handlers (your business logic)
	•	createTodo(call, callback) (unary)
	•	Reads call.request.text
	•	Builds a new TodoItem with id, text, done=false, created_at=Date.now()
	•	Pushes to todos
	•	callback(null, item) returns it to the client
	•	Logs to console so you see what happened
	•	readTodos(_call, callback) (unary)
	•	Returns { items: todos } in one shot
	•	Logs “returning X items”
	•	readTodosStream(call) (server streaming)
	•	Loops over todos and calls call.write(item) for each
	•	Ends the stream with call.end()
	•	Logs count streamed
	•	createTodosStream(call, callback) (client streaming)
	•	Listens for multiple data events from client (each has req.text)
	•	For each, creates a TodoItem, saves it, increments a counter
	•	On end, replies once with { created }
	•	Logs each created item and the summary

Starting the server
	•	new grpc.Server() → create server
	•	addService(Todo.service, { …handlers }) → attach your handlers
	•	bindAsync("0.0.0.0:40000", grpc.ServerCredentials.createInsecure(), cb) → listen on port 40000
	•	server.start() inside the callback → server is live
	•	Logs the listening port

Why you see logs: Every handler logs actions so you can watch requests flow through.

# client.js (the caller)
This is your gRPC client. It loads the same .proto, creates a stub, and invokes RPCs.
Setup
	•	Loads todo.proto with the same loader settings.
	•	Creates a client:
new todoPackage.Todo("localhost:40000", grpc.credentials.createInsecure())
	•	Connects to your local server.

Call sequence (what you saw in the output)
	1.	Unary → createTodo
	•	Sends { text: "Learn gRPC basics" }
	•	Logs the created item returned by server (id, text, done, created_at)
	2.	Client streaming → createTodosStream
	•	Opens a write stream
	•	stream.write({ text: "Write .proto" }), stream.write({ text: "Implement server" }), …
	•	stream.end() to signal you’re done sending
	•	Server responds once with { created: N }
	•	Client logs the summary
	3.	Unary → readTodos
	•	Requests all todos at once
	•	Receives { items: [...] }
	•	Logs count and each item
	4.	Server streaming → readTodosStream
	•	Subscribes to data events
	•	Logs each streamed item as it arrives
	•	On end, logs “done”

Why it’s both Node.js:
	•	For learning, you wrote both sides in JavaScript.
	•	In real-world projects, teams often mix languages: e.g., a Go/Java server and a Node/Python client. gRPC + protobuf make that easy because both sides share the same .proto.
